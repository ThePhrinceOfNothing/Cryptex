import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { Search, Plus, Key, Copy, Check, Eye, EyeOff, Trash2, ShieldCheck, Globe, User as UserIcon, Link2, ShieldAlert, Clock, PlusCircle } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from './EmptyState';
import { ConfirmModal } from './ConfirmModal';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import { getTOTP } from '../lib/totp';

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
    <div className="flex flex-col h-full bg-white dark:bg-[#121214]">
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/10 shrink-0">
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">Passwords</h2>
        <motion.button 
          onClick={onCreateNew}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 hover:border-accent hover:text-accent rounded-md text-gray-600 dark:text-zinc-400 transition-colors shadow-sm"
          title="Add new credential"
        >
          <Plus size={16} />
        </motion.button>
      </div>
      
      <div className="p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search accounts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-md text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent focus:bg-white dark:bg-[#121214] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredCredentials.length === 0 ? (
          <p className="text-gray-400 text-xs text-center mt-6">No accounts found.</p>
        ) : (
          filteredCredentials.map(cred => (
            <button
              key={cred.id}
              onClick={() => onSelect(cred.id)}
              className={`w-full text-left p-3 rounded-md border flex items-center gap-3 transition-colors ${
                selectedId === cred.id 
                  ? 'bg-accent/5 border-accent shadow-sm' 
                  : 'bg-white dark:bg-[#121214] border-transparent hover:border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-900 dark:bg-zinc-900/50'
              }`}
            >
              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${
                selectedId === cred.id ? 'bg-accent text-white border-accent' : 'bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-500 border-gray-200 dark:border-white/10'
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
                    <Key size={14} className="hidden" />
                  </>
                ) : (
                  <Key size={14} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium text-sm truncate ${selectedId === cred.id ? 'text-accent' : 'text-gray-900 dark:text-zinc-100'}`}>
                  {cred.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{cred.username}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};


// ---- MyVaultDetails (Main Workspace) ----

interface MyVaultDetailsProps {
  selectedId: string | null;
  isCreating: boolean;
  onSaveComplete: (id: string) => void;
  onDeleteComplete: () => void;
}

export const MyVaultDetails: React.FC<MyVaultDetailsProps> = ({ selectedId, isCreating, onSaveComplete, onDeleteComplete }) => {
  const { vaultData, updateVaultData } = useVault();
  const credentials = vaultData?.credentials || [];
  
  const selectedCred = credentials.find(c => c.id === selectedId);

  // Form State
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('');
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  
  // Sync state when selected credential changes
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
      
      // Auto-clear clipboard after 30 seconds
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
        title="My Vault"
        subtitle="Your credentials are encrypted in memory. Select an account from the sidebar or add a new one."
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
      <div className="h-full flex flex-col max-w-4xl mx-auto">
        <div className="flex justify-between items-start p-8 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isCreating ? 'Add New Account' : 'Edit Account'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 font-medium">
            {isCreating ? 'Securely encrypt a new credential.' : 'Your data is decrypted in memory.'}
          </p>
        </div>
        
        {!isCreating && (
          <motion.button 
            onClick={() => setIsDeleteModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
            title="Delete Account"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
        
        {/* Title & URL Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Service Name</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Google, GitHub"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors font-medium"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Website URL</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Username Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Username / Email</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Password</label>
            <button 
              onClick={() => setIsGeneratorOpen(true)}
              className="text-xs font-medium text-accent hover:text-blue-700 transition-colors"
            >
              Generate Strong Password
            </button>
          </div>
          <div className="relative flex items-center">
            <Key className="absolute left-3 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full pl-10 pr-12 py-2.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-zinc-100 font-mono tracking-wider focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 p-1 text-gray-400 hover:text-gray-900 dark:text-zinc-100 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2FA Setup */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> 2FA (Authenticator)
          </label>
          <div className="relative flex gap-3">
            <input
              type="password"
              value={totpSecret}
              onChange={(e) => setTotpSecret(e.target.value)}
              placeholder="Paste Setup Key (Secret)"
              className="flex-1 px-4 py-2.5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors font-mono text-sm"
            />
            {totpData && (
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-md px-4 py-2 shrink-0 w-40 justify-center">
                <span className="font-mono font-bold tracking-widest text-lg text-gray-900 dark:text-white">
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
                      className={totpData.secondsRemaining < 5 ? "text-red-500" : "text-accent"}
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
        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Custom Fields</label>
            <button 
              onClick={() => setCustomFields([...customFields, { id: crypto.randomUUID(), key: '', value: '', isSecret: false }])}
              className="text-xs font-medium text-accent hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3" /> Add Field
            </button>
          </div>
          
          {customFields.length > 0 && (
            <div className="space-y-3">
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
                    placeholder="e.g. PIN, API Key"
                    className="w-1/3 px-3 py-2 text-sm bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-zinc-100"
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
                      className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-zinc-100 font-mono"
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
                      {field.isSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <button
                    onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="mt-8 flex justify-end gap-3">
        {!isCreating && (
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2.5 bg-accent hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard' : 'Copy Password'}
          </motion.button>
        )}
        
        <motion.button
          onClick={handleSave}
          disabled={isSaveDisabled}
          whileHover={{ scale: isSaveDisabled ? 1 : 1.02 }}
          whileTap={{ scale: isSaveDisabled ? 1 : 0.97 }}
          className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 dark:bg-zinc-800 disabled:text-gray-400 text-white font-medium rounded-md shadow-sm transition-colors"
        >
          {isCreating ? 'Save New Account' : 'Save Changes'}
        </motion.button>
      </div>

    </div>
    </>
  );
};

