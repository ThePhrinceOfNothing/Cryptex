import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, CheckSquare, KeyRound, DollarSign, X, Lock, Moon, Sun, Calculator } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

interface GlobalSearchProps {
  onNavigate: (view: string, action?: 'create') => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { vaultData, lockVault, updateVaultData } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p' || e.key === 'P')) {
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
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const evaluateMath = (expr: string) => {
    try {
      // Basic safe math evaluation
      const sanitized = expr.replace(/[^-()\d/*+.]/g, '');
      if (!sanitized) return null;
      if (/^[/*+]/.test(sanitized) || /[-/*+]$/.test(sanitized)) return null;
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${sanitized}`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return result;
      }
    } catch {
      return null;
    }
    return null;
  };

  const getResults = () => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const results: any[] = [];

    // Math Evaluator
    const mathMatch = query.match(/^[\d\s+\-*/().]+$/);
    if (mathMatch && query.trim().length > 1) {
      const res = evaluateMath(query);
      if (res !== null) {
        results.push({
          type: 'calculator',
          label: `Result: ${res}`,
          icon: Calculator,
          match: query,
          action: async () => {
            await writeText(res.toString());
            setIsOpen(false);
          }
        });
      }
    }

    // Command Mode
    if (q.startsWith('>')) {
      const cmdQuery = q.slice(1).trim();
      
      const commands = [
        { type: 'command', label: 'Lock Vault', icon: Lock, match: 'Instantly lock the app', action: () => { setIsOpen(false); lockVault(); } },
        { type: 'command', label: 'Toggle Dark Mode', icon: vaultData?.settings?.theme === 'dark' ? Sun : Moon, match: 'Switch app theme', action: () => {
          updateVaultData({ settings: { ...vaultData?.settings, theme: vaultData?.settings?.theme === 'dark' ? 'light' : 'dark' } as any });
          setIsOpen(false);
        }},
        { type: 'command', label: 'New Password', icon: KeyRound, match: 'Quick add a credential', action: () => { setIsOpen(false); onNavigate('My Vault', 'create'); } },
        { type: 'command', label: 'New Note', icon: FileText, match: 'Quick add a secure note', action: () => { setIsOpen(false); onNavigate('Notes', 'create'); } },
      ];

      commands.forEach(cmd => {
        if (cmd.label.toLowerCase().includes(cmdQuery) || cmd.match.toLowerCase().includes(cmdQuery)) {
          results.push(cmd);
        }
      });
      return results;
    }

    // Search Notes
    vaultData?.notes?.forEach(n => {
      if ((n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)) {
        results.push({ type: 'note', label: n.title || 'Untitled Note', icon: FileText, view: 'Notes', match: (n.content || '').substring(0, 40) });
      }
    });

    // Search Tasks
    vaultData?.todos?.forEach(t => {
      if ((t.text || '').toLowerCase().includes(q)) {
        results.push({ type: 'task', label: t.text, icon: CheckSquare, view: 'Tasks', match: t.completed ? 'Completed' : 'Pending' });
      }
    });

    // Search Credentials
    vaultData?.credentials?.forEach(c => {
      if ((c.service || '').toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q)) {
        results.push({ type: 'credential', label: c.service || 'Unnamed', icon: KeyRound, view: 'My Vault', match: c.username || '', rawPassword: c.password });
      }
    });

    // Search Transactions
    vaultData?.transactions?.forEach(tx => {
      if ((tx.category || '').toLowerCase().includes(q)) {
        results.push({ type: 'transaction', label: tx.category, icon: DollarSign, view: 'Income', match: `${tx.type === 'in' ? '+' : '-'}$${tx.amount}` });
      }
    });

    return results.slice(0, 10);
  };

  const results = getResults();

  // Handle keyboard navigation
  const handleInputKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        executeResult(results[selectedIndex]);
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      if (results[selectedIndex]?.type === 'credential') {
        e.preventDefault();
        await writeText(results[selectedIndex].rawPassword);
        setIsOpen(false);
      } else if (results[selectedIndex]?.type === 'calculator') {
        e.preventDefault();
        executeResult(results[selectedIndex]);
      }
    }
  };

  const executeResult = (r: any) => {
    if (r.action) {
      r.action();
    } else if (r.view) {
      onNavigate(r.view);
      setIsOpen(false);
    }
  };

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
            placeholder="Search notes, passwords, tasks... (Type > for commands)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
          />
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {query.trim() && (
          <div className="max-h-96 overflow-y-auto p-2" ref={listRef}>
            {results.length > 0 ? (
              <ul className="space-y-1">
                {results.map((r, i) => {
                  const Icon = r.icon;
                  const isSelected = i === selectedIndex;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => executeResult(r)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isSelected 
                            ? 'bg-gray-100 dark:bg-zinc-800' 
                            : 'hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white dark:bg-zinc-700 border-gray-300 dark:border-zinc-600'
                            : 'bg-white dark:bg-[#121214] border-gray-200 dark:border-white/10'
                        }`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-gray-500 dark:text-zinc-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-accent' : 'text-gray-900 dark:text-zinc-100'}`}>
                            {r.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{(r.match || '').replace(/<[^>]*>?/gm, '')}</p>
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
            {results[selectedIndex]?.type === 'credential' && (
              <span className="flex items-center gap-1 text-accent"><kbd className="px-1 py-0.5 bg-white dark:bg-[#121214] border border-blue-300 dark:border-blue-900/50 rounded shadow-sm text-[10px] font-sans text-accent">Ctrl+C</kbd> to copy password</span>
            )}
            {results[selectedIndex]?.type === 'calculator' && (
              <span className="flex items-center gap-1 text-accent"><kbd className="px-1 py-0.5 bg-white dark:bg-[#121214] border border-blue-300 dark:border-blue-900/50 rounded shadow-sm text-[10px] font-sans text-accent">Enter</kbd> to copy</span>
            )}
          </div>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-[#121214] border border-gray-300 dark:border-white/20 rounded shadow-sm text-[10px] font-sans">Esc</kbd> to close</span>
        </div>
      </motion.div>
    </div>
  );
};
