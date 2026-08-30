import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { Key, Copy, Check, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

export const PasswordManager: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const credentials = vaultData?.credentials || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !username || !password) return;

    const newCred = {
      id: crypto.randomUUID(),
      title,
      username,
      password,
    };

    await updateVaultData({ credentials: [...credentials, newCred] });
    
    setTitle('');
    setUsername('');
    setPassword('');
    setIsAdding(false);
  };

  const deleteCredential = async (id: string) => {
    const updated = credentials.filter(c => c.id !== id);
    await updateVaultData({ credentials: updated });
  };

  const toggleVisibility = (id: string) => {
    const next = new Set(visiblePasswords);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVisiblePasswords(next);
  };

  const handleCopy = async (id: string, pass: string) => {
    try {
      await writeText(pass);
      setCopiedId(id);
      
      // Reset UI state after 2s
      setTimeout(() => setCopiedId(null), 2000);
      
      // Critical Security Requirement: Clear clipboard after 30 seconds to prevent leaks
      setTimeout(async () => {
        try {
          await writeText("");
        } catch (e) {
          console.error("Failed to clear clipboard", e);
        }
      }, 30000);
    } catch (err) {
      console.error("Failed to copy to clipboard", err);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
          <Key className="text-accent w-5 h-5" />
          Credentials
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-accent hover:bg-blue-600 text-white p-2 rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 p-4 rounded-xl mb-6 space-y-3">
          <input
            type="text"
            placeholder="Title (e.g. Google)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
          <input
            type="text"
            placeholder="Username / Email"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-zinc-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || !username || !password}
              className="px-4 py-2 bg-accent hover:bg-blue-600 disabled:bg-gray-200 dark:bg-zinc-800 disabled:text-gray-400 text-white rounded-md text-sm transition-colors shadow-sm"
            >
              Save Securely
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 overflow-y-auto pr-2 flex-1">
        {credentials.length === 0 && !isAdding ? (
          <p className="text-gray-400 text-center py-8 text-sm">No saved passwords.</p>
        ) : (
          credentials.map(cred => (
            <div key={cred.id} className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-4 rounded-xl shadow-sm group relative hover:border-gray-300 dark:border-white/20 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-gray-900 dark:text-zinc-100 font-medium">{cred.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-500">{cred.username}</p>
                </div>
                <button
                  onClick={() => deleteCredential(cred.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all absolute top-3 right-3"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900/50 rounded-md p-2 border border-gray-200 dark:border-white/10 mt-3">
                <span className="text-sm text-gray-600 dark:text-zinc-400 font-mono tracking-widest pl-2">
                  {visiblePasswords.has(cred.id) ? cred.password : '••••••••••••'}
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVisibility(cred.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800/50 rounded-md transition-colors"
                  >
                    {visiblePasswords.has(cred.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleCopy(cred.id, cred.password)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800/50 rounded-md transition-colors flex items-center justify-center w-8"
                  >
                    {copiedId === cred.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
