import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { Search, Plus, Key, Copy, Check, Eye, EyeOff, Trash2, ShieldCheck, Globe, User as UserIcon } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { motion } from 'framer-motion';
import { EmptyState } from './EmptyState';

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
    <div className="flex flex-col h-full bg-white">
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
        <h2 className="font-semibold text-gray-900">Passwords</h2>
        <motion.button 
          onClick={onCreateNew}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 hover:border-accent hover:text-accent rounded-md text-gray-600 transition-colors shadow-sm"
          title="Add new credential"
        >
          <Plus size={16} />
        </motion.button>
      </div>
      
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search accounts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent focus:bg-white transition-colors"
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
                  : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                selectedId === cred.id ? 'bg-accent text-white border-accent' : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                <Key size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium text-sm truncate ${selectedId === cred.id ? 'text-accent' : 'text-gray-900'}`}>
                  {cred.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{cred.username}</p>
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
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Sync state when selected credential changes
  React.useEffect(() => {
    if (isCreating) {
      setTitle('');
      setUsername('');
      setPassword('');
      setShowPassword(false);
    } else if (selectedCred) {
      setTitle(selectedCred.title);
      setUsername(selectedCred.username);
      setPassword(selectedCred.password);
      setShowPassword(false);
    }
  }, [selectedId, isCreating, selectedCred]);

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

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let generated = '';
    const array = new Uint32Array(20);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 20; i++) {
      generated += chars[array[i] % chars.length];
    }
    setPassword(generated);
  };

  const handleSave = async () => {
    if (!title || !username || !password) return;

    if (isCreating) {
      const newId = crypto.randomUUID();
      const newCred = { id: newId, title, username, password };
      await updateVaultData({ credentials: [...credentials, newCred] });
      onSaveComplete(newId);
    } else if (selectedId) {
      const updated = credentials.map(c => 
        c.id === selectedId ? { ...c, title, username, password } : c
      );
      await updateVaultData({ credentials: updated });
      onSaveComplete(selectedId);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (confirm(`Are you sure you want to delete the credentials for ${selectedCred?.title}?`)) {
      const updated = credentials.filter(c => c.id !== selectedId);
      await updateVaultData({ credentials: updated });
      onDeleteComplete();
    }
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

  const isSaveDisabled = !title || !username || !password || (!isCreating && title === selectedCred?.title && username === selectedCred?.username && password === selectedCred?.password);

  return (
    <div className="max-w-2xl mx-auto p-8 h-full">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {isCreating ? 'Add New Account' : 'Account Details'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isCreating ? 'Securely encrypt a new credential.' : 'Your data is decrypted in memory.'}
          </p>
        </div>
        
        {!isCreating && (
          <motion.button 
            onClick={handleDelete}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
            title="Delete Account"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        
        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Service / Website Name</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Google, GitHub, Bank"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors font-medium"
            />
          </div>
        </div>

        {/* Username Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Username / Email</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Password</label>
            {isCreating && (
              <button 
                onClick={handleGeneratePassword}
                className="text-xs font-medium text-accent hover:text-blue-700 transition-colors"
              >
                Generate Strong Password
              </button>
            )}
          </div>
          <div className="relative flex items-center">
            <Key className="absolute left-3 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 p-1 text-gray-400 hover:text-gray-900 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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
          className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-md shadow-sm transition-colors"
        >
          {isCreating ? 'Save New Account' : 'Save Changes'}
        </motion.button>
      </div>

    </div>
  );
};
