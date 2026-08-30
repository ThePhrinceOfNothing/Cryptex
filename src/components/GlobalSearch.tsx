import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, CheckSquare, KeyRound, DollarSign, X } from 'lucide-react';
import { useVault } from '../context/VaultContext';

interface GlobalSearchProps {
  onNavigate: (view: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { vaultData } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getResults = () => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const results: any[] = [];

    // Search Notes
    vaultData?.notes?.forEach(n => {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        results.push({ type: 'note', label: n.title || 'Untitled Note', icon: FileText, view: 'Notes', match: n.content.substring(0, 40) });
      }
    });

    // Search Tasks
    vaultData?.todos?.forEach(t => {
      if (t.text.toLowerCase().includes(q)) {
        results.push({ type: 'task', label: t.text, icon: CheckSquare, view: 'Tasks', match: t.completed ? 'Completed' : 'Pending' });
      }
    });

    // Search Credentials
    vaultData?.credentials?.forEach(c => {
      if (c.service.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)) {
        results.push({ type: 'credential', label: c.service, icon: KeyRound, view: 'My Vault', match: c.username });
      }
    });

    // Search Transactions
    vaultData?.transactions?.forEach(tx => {
      if (tx.category.toLowerCase().includes(q)) {
        results.push({ type: 'transaction', label: tx.category, icon: DollarSign, view: 'Income', match: `${tx.type === 'in' ? '+' : '-'}$${tx.amount}` });
      }
    });

    return results.slice(0, 10);
  };

  const results = getResults();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-xl bg-white dark:bg-[#121214] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-white/10">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 w-full bg-transparent border-none py-4 px-3 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-0 placeholder-gray-400"
            placeholder="Search notes, passwords, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {query.trim() && (
          <div className="max-h-96 overflow-y-auto p-2">
            {results.length > 0 ? (
              <ul className="space-y-1">
                {results.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => {
                          onNavigate(r.view);
                          setIsOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-900 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-gray-500 dark:text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">{r.label}</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{r.match.replace(/<[^>]*>?/gm, '')}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded">
                          {r.type}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-zinc-500 text-sm">
                No results found for "{query}"
              </div>
            )}
          </div>
        )}
        
        <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-zinc-500 flex items-center justify-between">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-[#121214] border border-gray-300 dark:border-white/20 rounded shadow-sm text-[10px] font-sans">↑↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-[#121214] border border-gray-300 dark:border-white/20 rounded shadow-sm text-[10px] font-sans">Enter</kbd> to select</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-[#121214] border border-gray-300 dark:border-white/20 rounded shadow-sm text-[10px] font-sans">Esc</kbd> to close</span>
        </div>
      </motion.div>
    </div>
  );
};
