import React, { useState, useMemo } from 'react';
import { useVault } from '../../context/VaultContext';
import { Search, Plus, Key, Copy, Check, Eye, EyeOff, Trash2, ShieldCheck, Globe, User as UserIcon, Link2, ShieldAlert, PlusCircle } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { motion } from 'framer-motion';
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

// ---- MyVaultList (Middle Pane) ----

interface MyVaultListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export const MyVaultList: React.FC<MyVaultListProps> = ({ selectedId, onSelect, onCreateNew }) => {
  const { vaultData } = useVault();
  const [searchQuery, setSearchQuery] = useState('');
  
  const credentials = vaultData?.credentials || [];
  
  const filteredCredentials = useMemo(() => {
    if (!searchQuery.trim()) return credentials;
    const query = searchQuery.toLowerCase();
    return credentials.filter(c => 
      c.title.toLowerCase().includes(query) || 
      c.username.toLowerCase().includes(query)
    );
  }, [credentials, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111113]">
      <div className="h-14 flex items-center justify-between px-4 sm:px-5 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <h2 className="font-semibold text-xs text-gray-900 dark:text-zinc-100 uppercase tracking-wider">Passwords</h2>
        <button 
          onClick={onCreateNew}
          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md text-gray-700 dark:text-zinc-300 transition-colors shadow-2xs active:scale-[0.95]"
          title="Add new credential"
        >
          <Plus size={15} strokeWidth={1.75} />
        </button>
      </div>
      
      <div className="p-3 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 w-3.5 h-3.5" strokeWidth={1.75} />
          <input 
            type="text" 
            placeholder="Search accounts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredCredentials.length === 0 ? (
          <p className="text-gray-400 dark:text-zinc-600 text-xs text-center py-8 font-normal">No accounts found.</p>
        ) : (
          filteredCredentials.map(cred => (
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
                <p className={`font-medium text-xs truncate ${selectedId === cred.id ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-zinc-100'}`}>
                  {cred.title}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-500 truncate">{cred.username}</p>
              </div>
            </button>
          ))
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
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  
  React.useEffect(() => {
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

  const [totpData, setTotpData] = useState<{ token: string, secondsRemaining: number } | null>(null);

  React.useEffect(() => {
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

  const handleCopy = async () => {
    try {
      await writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      setTimeout(async () => {
        try {
          await writeText("");
        } catch (e) {
          console.error("Failed to clear clipboard");
        }
      }, 30000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleSave = async () => {
    if (!title || !username) return;

    if (isCreating) {
      const newId = crypto.randomUUID();
      const newCred = { id: newId, title, username, password, url, totpSecret, customFields, folderId };
      await updateVaultData({ credentials: [...credentials, newCred] });
      onSaveComplete(newId);
    } else if (selectedId) {
      const updated = credentials.map(c => 
        c.id === selectedId 
          ? { ...c, title, username, password, url, totpSecret, customFields, folderId } 
          : c
      );
      await updateVaultData({ credentials: updated });
      onSaveComplete(selectedId);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!selectedId) return;
    const updated = credentials.filter(c => c.id !== selectedId);
    await updateVaultData({ credentials: updated });
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

        <div className="bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-xl p-4 sm:p-6 shadow-2xs space-y-4">
          
          {/* Title & URL Row (Responsive Stack on Mobile) */}
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
                <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md px-3 py-1.5 shrink-0">
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
              onClick={handleCopy}
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
