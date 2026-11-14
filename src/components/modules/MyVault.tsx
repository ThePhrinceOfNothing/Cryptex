import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { useToast } from '../../context/ToastContext';
import { 
  Search, 
  Plus, 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Trash2, 
  ShieldCheck, 
  Globe, 
  User as UserIcon, 
  Link2, 
  ShieldAlert, 
  PlusCircle, 
  Upload, 
  Shield, 
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmModal } from '../modals/ConfirmModal';
import { PasswordGeneratorModal } from '../modals/PasswordGeneratorModal';
import { getTOTP } from '../../lib/totp';

// ---- Helpers ----
const getFaviconUrl = (url: string) => {
  if (!url) return null;
  try {
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(validUrl).hostname;
    return `https://s2.googleusercontent.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
};

// Robust CSV Parser respecting quotes
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_"-]+/g, ''));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every(v => !v)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// ---- MyVaultList (Middle Pane) ----

interface MyVaultListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export const MyVaultList: React.FC<MyVaultListProps> = ({ selectedId, onSelect, onCreateNew }) => {
  const { vaultData, updateVaultData } = useVault();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'audit'>('all');
  const [auditFilter, setAuditFilter] = useState<'all' | 'reused' | 'weak' | 'no2fa'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const credentials = vaultData?.credentials || [];

  // Health Audit Analysis
  const audit = useMemo(() => {
    const passwordCounts: Record<string, number> = {};
    credentials.forEach(c => {
      if (c.password) {
        passwordCounts[c.password] = (passwordCounts[c.password] || 0) + 1;
      }
    });

    const reused = credentials.filter(c => c.password && passwordCounts[c.password] > 1);
    const weak = credentials.filter(c => !c.password || c.password.length < 10 || /^[a-zA-Z]+$/.test(c.password));
    const missing2FA = credentials.filter(c => c.url && !c.totpSecret);

    let score = 100;
    if (credentials.length > 0) {
      const reusedPenalty = (reused.length / credentials.length) * 45;
      const weakPenalty = (weak.length / credentials.length) * 35;
      const missing2FAPenalty = (missing2FA.length / credentials.length) * 20;
      score = Math.max(0, Math.round(100 - reusedPenalty - weakPenalty - missing2FAPenalty));
    }

    return { reused, weak, missing2FA, score, passwordCounts };
  }, [credentials]);

  // Handle CSV Import
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        showToast('No valid accounts found in CSV file.', { type: 'error' });
        return;
      }

      const imported: any[] = [];
      for (const row of rows) {
        const title = row['name'] || row['title'] || row['servicename'] || row['service'] || row['domain'] || 'Imported Account';
        const url = row['url'] || row['loginuri'] || row['website'] || '';
        const username = row['username'] || row['loginusername'] || row['user'] || row['email'] || '';
        const password = row['password'] || row['loginpassword'] || row['pass'] || '';
        const totpSecret = row['totp'] || row['logintotp'] || row['otpauth'] || '';

        if (title || username || password) {
          imported.push({
            id: crypto.randomUUID(),
            title,
            url,
            username,
            password,
            totpSecret,
            customFields: []
          });
        }
      }

      if (imported.length > 0) {
        await updateVaultData({ credentials: [...credentials, ...imported] });
        showToast(`Successfully imported ${imported.length} accounts!`, { type: 'success' });
      } else {
        showToast('Could not map any credentials from CSV.', { type: 'warning' });
      }
    } catch (err) {
      console.error('Failed to parse CSV:', err);
      showToast('Failed to parse CSV file. Ensure it is a valid format.', { type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredCredentials = useMemo(() => {
    let list = credentials;

    if (activeTab === 'audit') {
      if (auditFilter === 'reused') list = audit.reused;
      else if (auditFilter === 'weak') list = audit.weak;
      else if (auditFilter === 'no2fa') list = audit.missing2FA;
      else {
        // Union of all issues
        const issueIds = new Set([
          ...audit.reused.map(c => c.id),
          ...audit.weak.map(c => c.id),
          ...audit.missing2FA.map(c => c.id)
        ]);
        list = credentials.filter(c => issueIds.has(c.id));
      }
    }

    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(c => 
      c.title.toLowerCase().includes(query) || 
      c.username.toLowerCase().includes(query)
    );
  }, [credentials, searchQuery, activeTab, auditFilter, audit]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111113]">
      <input 
        type="file" 
        accept=".csv,text/csv" 
        ref={fileInputRef} 
        onChange={handleCsvFileChange} 
        className="hidden" 
      />

      {/* Header with Title and Actions */}
      <div className="h-14 flex items-center justify-between px-4 sm:px-5 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <h2 className="font-semibold text-xs text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
          Passwords
        </h2>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 flex items-center justify-center bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors shadow-2xs active:scale-[0.95]"
            title="Import passwords from CSV (Chrome, Bitwarden, 1Password)"
          >
            <Upload size={13} strokeWidth={1.75} />
          </button>
          <button 
            onClick={onCreateNew}
            className="w-7 h-7 flex items-center justify-center bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md text-gray-700 dark:text-zinc-300 transition-colors shadow-2xs active:scale-[0.95]"
            title="Add new credential"
          >
            <Plus size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Mode Tabs: All Accounts vs Health Audit */}
      <div className="flex items-center border-b border-gray-200 dark:border-[#262626] bg-gray-50/50 dark:bg-[#0e0e10] p-1.5 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 px-2.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-white dark:bg-[#141416] text-gray-900 dark:text-zinc-100 shadow-2xs border border-gray-200 dark:border-[#262626]'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
          }`}
        >
          All ({credentials.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-1 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-[#141416] text-gray-900 dark:text-zinc-100 shadow-2xs border border-gray-200 dark:border-[#262626]'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
          }`}
        >
          <Shield size={12} strokeWidth={2} className={audit.score < 80 ? 'text-amber-500' : 'text-emerald-500'} />
          <span>Health ({audit.score}%)</span>
        </button>
      </div>

      {/* Audit Filter Pills (when audit mode active) */}
      {activeTab === 'audit' && (
        <div className="p-2 border-b border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#121214] flex flex-wrap gap-1 text-[11px] shrink-0">
          <button
            onClick={() => setAuditFilter('all')}
            className={`px-2 py-0.5 rounded border transition-colors ${auditFilter === 'all' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium' : 'border-gray-200 dark:border-[#262626] text-gray-600 dark:text-zinc-400'}`}
          >
            All Issues
          </button>
          <button
            onClick={() => setAuditFilter('reused')}
            className={`px-2 py-0.5 rounded border transition-colors ${auditFilter === 'reused' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium' : 'border-gray-200 dark:border-[#262626] text-gray-600 dark:text-zinc-400'}`}
          >
            Reused ({audit.reused.length})
          </button>
          <button
            onClick={() => setAuditFilter('weak')}
            className={`px-2 py-0.5 rounded border transition-colors ${auditFilter === 'weak' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium' : 'border-gray-200 dark:border-[#262626] text-gray-600 dark:text-zinc-400'}`}
          >
            Weak ({audit.weak.length})
          </button>
          <button
            onClick={() => setAuditFilter('no2fa')}
            className={`px-2 py-0.5 rounded border transition-colors ${auditFilter === 'no2fa' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium' : 'border-gray-200 dark:border-[#262626] text-gray-600 dark:text-zinc-400'}`}
          >
            No 2FA ({audit.missing2FA.length})
          </button>
        </div>
      )}
      
      {/* Search Input */}
      <div className="p-3 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 w-3.5 h-3.5" strokeWidth={1.75} />
          <input 
            type="text" 
            placeholder={activeTab === 'audit' ? "Filter security issues..." : "Search accounts..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Account List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredCredentials.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-gray-400 dark:text-zinc-600 text-xs font-normal">
              {activeTab === 'audit' 
                ? 'No password security vulnerabilities found!' 
                : 'No accounts found.'}
            </p>
          </div>
        ) : (
          filteredCredentials.map(cred => {
            const isReused = cred.password && (audit.passwordCounts[cred.password] || 0) > 1;
            const isWeak = !cred.password || cred.password.length < 10;
            const isNo2fa = cred.url && !cred.totpSecret;

            return (
              <button
                key={cred.id}
                onClick={() => onSelect(cred.id)}
                className={`w-full text-left p-2.5 rounded-lg border flex items-center gap-2.5 transition-colors active:scale-[0.98] ${
                  selectedId === cred.id 
                    ? 'bg-zinc-100 dark:bg-white/10 border-gray-300 dark:border-white/20 shadow-2xs' 
                    : 'bg-white dark:bg-[#111113] border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className={`relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${
                  selectedId === cred.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-[#262626]'
                }`}>
                  {cred.url && getFaviconUrl(cred.url) ? (
                    <>
                      <img 
                        src={getFaviconUrl(cred.url)!} 
                        alt="" 
                        className="w-full h-full object-cover bg-white" 
                        onError={(e) => { 
                          e.currentTarget.style.display = 'none'; 
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block'; 
                        }} 
                      />
                      <Key size={13} strokeWidth={1.75} className="hidden" />
                    </>
                  ) : (
                    <Key size={13} strokeWidth={1.75} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`font-medium text-xs truncate ${selectedId === cred.id ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-zinc-100'}`}>
                      {cred.title}
                    </p>
                    {activeTab === 'audit' && (
                      <span className="flex items-center gap-1 text-[10px] shrink-0">
                        {isReused && <span className="text-amber-500 font-medium">Reused</span>}
                        {isWeak && <span className="text-red-500 font-medium">Weak</span>}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 truncate">{cred.username}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ---- MyVaultDetails (Right Pane / Detail View) ----

interface MyVaultDetailsProps {
  selectedId: string | null;
  isCreating: boolean;
  onSaveComplete: (id: string) => void;
  onDeleteComplete: () => void;
}

export const MyVaultDetails: React.FC<MyVaultDetailsProps> = ({ 
  selectedId, 
  isCreating, 
  onSaveComplete, 
  onDeleteComplete 
}) => {
  const { vaultData, updateVaultData } = useVault();
  const { showToast } = useToast();
  const credentials = vaultData?.credentials || [];
  const selectedCred = credentials.find(c => c.id === selectedId);

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedTotp, setCopiedTotp] = useState(false);
  const [clipboardSecondsRemaining, setClipboardSecondsRemaining] = useState<number | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const clipboardTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isCreating) {
      setTitle('');
      setUsername('');
      setPassword('');
      setUrl('');
      setTotpSecret('');
      setCustomFields([]);
      setFolderId('');
      setShowPassword(false);
    } else if (selectedCred) {
      setTitle(selectedCred.title);
      setUsername(selectedCred.username);
      setPassword(selectedCred.password || '');
      setUrl(selectedCred.url || '');
      setTotpSecret(selectedCred.totpSecret || '');
      setCustomFields(selectedCred.customFields || []);
      setFolderId(selectedCred.folderId || '');
      setShowPassword(false);
    }
  }, [selectedId, isCreating, selectedCred]);

  // Clipboard countdown interval
  useEffect(() => {
    if (clipboardSecondsRemaining === null) return;
    if (clipboardSecondsRemaining <= 0) {
      setClipboardSecondsRemaining(null);
      writeText("").catch(() => {});
      return;
    }
    const timer = setTimeout(() => {
      setClipboardSecondsRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [clipboardSecondsRemaining]);

  const [totpData, setTotpData] = useState<{ token: string, secondsRemaining: number } | null>(null);

  useEffect(() => {
    if (!totpSecret) {
      setTotpData(null);
      return;
    }
    const updateTotp = () => {
      setTotpData(getTOTP(totpSecret));
    };
    updateTotp();
    const interval = setInterval(updateTotp, 1000);
    return () => clearInterval(interval);
  }, [totpSecret]);

  const handleCopyPassword = async () => {
    try {
      await writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setClipboardSecondsRemaining(30);

      showToast('Password copied • Clipboard clearing in 30s', {
        type: 'info',
        duration: 30000,
        countdown: 30,
        action: {
          label: 'Clear Now',
          onClick: async () => {
            await writeText('');
            setClipboardSecondsRemaining(null);
            showToast('Clipboard cleared.', { type: 'success', duration: 2000 });
          }
        }
      });
    } catch (err) {
      console.error("Failed to copy password", err);
      showToast('Failed to copy password to clipboard.', { type: 'error' });
    }
  };

  const handleCopyTotp = async () => {
    if (!totpData) return;
    try {
      await writeText(totpData.token);
      setCopiedTotp(true);
      setTimeout(() => setCopiedTotp(false), 2000);
      setClipboardSecondsRemaining(30);

      showToast(`TOTP code ${totpData.token} copied • Auto-clearing in 30s`, {
        type: 'info',
        duration: 30000,
        countdown: 30,
        action: {
          label: 'Clear Now',
          onClick: async () => {
            await writeText('');
            setClipboardSecondsRemaining(null);
            showToast('Clipboard cleared.', { type: 'success', duration: 2000 });
          }
        }
      });
    } catch (err) {
      console.error("Failed to copy TOTP", err);
    }
  };

  const handleClearClipboardManual = async () => {
    await writeText("");
    setClipboardSecondsRemaining(null);
    showToast('Clipboard cleared from system memory.', { type: 'success', duration: 2000 });
  };

  const handleSave = async () => {
    if (!title || !username) return;

    if (isCreating) {
      const newId = crypto.randomUUID();
      const newCred = { id: newId, title, username, password, url, totpSecret, customFields, folderId };
      await updateVaultData({ credentials: [...credentials, newCred] });
      showToast(`Account "${title}" saved.`, { type: 'success' });
      onSaveComplete(newId);
    } else if (selectedId) {
      const updated = credentials.map(c => 
        c.id === selectedId 
          ? { ...c, title, username, password, url, totpSecret, customFields, folderId } 
          : c
      );
      await updateVaultData({ credentials: updated });
      showToast(`Account "${title}" updated.`, { type: 'success' });
      onSaveComplete(selectedId);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!selectedId) return;
    const updated = credentials.filter(c => c.id !== selectedId);
    await updateVaultData({ credentials: updated });
    showToast(`Account "${selectedCred?.title}" deleted.`, { type: 'info' });
    onDeleteComplete();
  };

  if (!isCreating && !selectedCred) {
    return (
      <EmptyState 
        icon={ShieldCheck}
        title="Passwords"
        subtitle="Select an account from the list to view its credentials, or create a new entry."
      />
    );
  }

  const isSaveDisabled = !title || !username || (!isCreating && 
    title === selectedCred?.title && 
    username === selectedCred?.username && 
    password === (selectedCred?.password || '') &&
    url === (selectedCred?.url || '') &&
    totpSecret === (selectedCred?.totpSecret || '') &&
    folderId === (selectedCred?.folderId || '') &&
    JSON.stringify(customFields) === JSON.stringify(selectedCred?.customFields || [])
  );

  return (
    <>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Account"
        message={`Are you sure you want to permanently delete the credentials for ${selectedCred?.title}?`}
      />
      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onApply={(pwd) => {
          setPassword(pwd);
        }}
      />
      <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full overflow-y-auto">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {isCreating ? 'Add Account' : 'Edit Account'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              {isCreating ? 'Create and encrypt a new login credential.' : 'All data is decrypted locally in memory.'}
            </p>
          </div>
          
          {!isCreating && (
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors active:scale-[0.95]"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Clipboard Active Countdown Notification Banner */}
        {clipboardSecondsRemaining !== null && (
          <div className="mb-4 p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Clipboard contains sensitive password. Auto-wiping in <strong className="tabular-nums font-semibold">{clipboardSecondsRemaining}s</strong></span>
            </span>
            <button
              onClick={handleClearClipboardManual}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px] transition-colors"
            >
              Wipe Now
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-xl p-4 sm:p-6 shadow-2xs space-y-4">
          
          {/* Title & URL Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Service Name</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" strokeWidth={1.75} />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GitHub"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Website URL</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" strokeWidth={1.75} />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Username / Email</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" strokeWidth={1.75} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Password</label>
              <button 
                onClick={() => setIsGeneratorOpen(true)}
                className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Generate Password
              </button>
            </div>
            <div className="relative flex items-center">
              <Key className="absolute left-3 text-gray-400 w-4 h-4" strokeWidth={1.75} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-9 pr-10 py-2 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 font-mono tracking-wider focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {/* 2FA Setup */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#222]">
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.75} /> 
              <span>Two-Factor Secret (TOTP)</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="password"
                value={totpSecret}
                onChange={(e) => setTotpSecret(e.target.value)}
                placeholder="Paste TOTP Setup Key"
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors font-mono"
              />
              {totpData && (
                <div 
                  onClick={handleCopyTotp}
                  className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md px-3 py-1.5 shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Click to copy TOTP token"
                >
                  <span className="font-mono font-bold tracking-wider text-sm tabular-nums text-gray-900 dark:text-white">
                    {totpData.token.slice(0, 3)} {totpData.token.slice(3)}
                  </span>
                  <div className="relative w-4 h-4">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-200 dark:text-zinc-700"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={totpData.secondsRemaining < 5 ? "text-rose-500" : "text-zinc-900 dark:text-white"}
                        strokeDasharray={`${(totpData.secondsRemaining / 30) * 100}, 100`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                  {copiedTotp ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-gray-400" />}
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#222]">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Custom Fields</label>
              <button 
                onClick={() => setCustomFields([...customFields, { id: crypto.randomUUID(), key: '', value: '', isSecret: false }])}
                className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 active:scale-[0.97]"
              >
                <PlusCircle className="w-3 h-3" strokeWidth={1.75} /> 
                <span>Add Field</span>
              </button>
            </div>
            
            {customFields.length > 0 && (
              <div className="space-y-2">
                {customFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => {
                        const newFields = [...customFields];
                        newFields[idx].key = e.target.value;
                        setCustomFields(newFields);
                      }}
                      placeholder="Field name"
                      className="w-1/3 px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                    />
                    <div className="relative flex-1">
                      <input
                        type={field.isSecret ? 'password' : 'text'}
                        value={field.value}
                        onChange={(e) => {
                          const newFields = [...customFields];
                          newFields[idx].value = e.target.value;
                          setCustomFields(newFields);
                        }}
                        placeholder="Value"
                        className="w-full px-2.5 py-1.5 pr-8 text-xs bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-gray-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-zinc-400"
                      />
                      <button
                        onClick={() => {
                          const newFields = [...customFields];
                          newFields[idx].isSecret = !newFields[idx].isSecret;
                          setCustomFields(newFields);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        title="Toggle Secret"
                      >
                        {field.isSecret ? <EyeOff className="w-3 h-3" strokeWidth={1.75} /> : <Eye className="w-3 h-3" strokeWidth={1.75} />}
                      </button>
                    </div>
                    <button
                      onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))}
                      className="p-1.5 text-gray-400 hover:text-rose-500 rounded-md transition-colors"
                      title="Remove field"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
          {!isCreating && (
            <button
              onClick={handleCopyPassword}
              className="px-4 py-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-medium rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} /> : <Copy className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />}
              <span>{copied ? 'Copied' : 'Copy Password'}</span>
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium rounded-md shadow-2xs transition-colors active:scale-[0.97]"
          >
            {isCreating ? 'Save Account' : 'Save Changes'}
          </button>
        </div>

      </div>
    </>
  );
};
