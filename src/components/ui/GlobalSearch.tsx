import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  FileText, 
  CheckSquare, 
  KeyRound, 
  DollarSign, 
  X, 
  Lock, 
  Moon, 
  Sun, 
  Calculator,
  LayoutDashboard,
  Calendar,
  Settings,
  Sparkles,
  Command
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { useToast } from '../../context/ToastContext';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

interface GlobalSearchProps {
  onNavigate: (view: string, action?: 'create') => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { vaultData, lockVault, updateVaultData } = useVault();
  const { showToast } = useToast();
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
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const evaluateMath = (expr: string) => {
    try {
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

  const allCommands = [
    { 
      type: 'command', 
      label: 'Lock Vault', 
      icon: Lock, 
      match: 'Instantly encrypt and lock the app (Ctrl+Shift+L)', 
      action: () => { 
        setIsOpen(false); 
        lockVault(); 
        showToast('Vault locked.', { type: 'info' });
      } 
    },
    { 
      type: 'command', 
      label: 'New Password', 
      icon: KeyRound, 
      match: 'Create and encrypt a new login credential', 
      action: () => { 
        setIsOpen(false); 
        onNavigate('My Vault', 'create'); 
      } 
    },
    { 
      type: 'command', 
      label: 'New Note', 
      icon: FileText, 
      match: 'Create a new encrypted document', 
      action: () => { 
        setIsOpen(false); 
        onNavigate('Notes', 'create'); 
      } 
    },
    { 
      type: 'command', 
      label: 'New Task', 
      icon: CheckSquare, 
      match: 'Add a new item to your Kanban board', 
      action: () => { 
        setIsOpen(false); 
        onNavigate('Tasks'); 
      } 
    },
    { 
      type: 'command', 
      label: 'Toggle Theme', 
      icon: vaultData?.settings?.theme === 'dark' ? Sun : Moon, 
      match: `Switch to ${vaultData?.settings?.theme === 'dark' ? 'light' : 'dark'} mode`, 
      action: () => {
        const next = vaultData?.settings?.theme === 'dark' ? 'light' : 'dark';
        updateVaultData({ settings: { ...vaultData?.settings, theme: next } as any });
        setIsOpen(false);
        showToast(`Theme changed to ${next} mode.`, { type: 'success' });
      }
    },
    { type: 'command', label: 'Go to Dashboard', icon: LayoutDashboard, match: 'Open main workspace dashboard', action: () => { setIsOpen(false); onNavigate('Dashboard'); } },
    { type: 'command', label: 'Go to Passwords', icon: KeyRound, match: 'Open encrypted credentials and TOTP', action: () => { setIsOpen(false); onNavigate('My Vault'); } },
    { type: 'command', label: 'Go to Notes', icon: FileText, match: 'Open encrypted documents and notes', action: () => { setIsOpen(false); onNavigate('Notes'); } },
    { type: 'command', label: 'Go to Tasks', icon: CheckSquare, match: 'Open Kanban boards and subtasks', action: () => { setIsOpen(false); onNavigate('Tasks'); } },
    { type: 'command', label: 'Go to Finances', icon: DollarSign, match: 'Open income, expenses, and ledger', action: () => { setIsOpen(false); onNavigate('Income'); } },
    { type: 'command', label: 'Go to Calendar', icon: Calendar, match: 'Open calendar and agenda', action: () => { setIsOpen(false); onNavigate('Calendar'); } },
    { type: 'command', label: 'Go to Settings', icon: Settings, match: 'Vault configuration, backup and security', action: () => { setIsOpen(false); onNavigate('Settings'); } }
  ];

  const getResults = () => {
    const q = query.trim().toLowerCase();
    
    // When query is empty: show quick actions / command palette
    if (!q) {
      return allCommands.slice(0, 6);
    }
    
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
          match: `Press Enter to copy ${res}`,
          action: async () => {
            await writeText(res.toString());
            setIsOpen(false);
            showToast(`Copied ${res} to clipboard!`, { type: 'success' });
          }
        });
      }
    }

    // Match Commands
    allCommands.forEach(cmd => {
      const cleanQ = q.startsWith('>') ? q.slice(1).trim() : q;
      if (cleanQ && (cmd.label.toLowerCase().includes(cleanQ) || cmd.match.toLowerCase().includes(cleanQ))) {
        results.push(cmd);
      }
    });

    // Search Credentials (Fixed to check c.title, c.username, c.url)
    vaultData?.credentials?.forEach(c => {
      const title = c.title || '';
      const username = c.username || '';
      const url = c.url || '';
      if (title.toLowerCase().includes(q) || username.toLowerCase().includes(q) || url.toLowerCase().includes(q)) {
        results.push({ 
          type: 'credential', 
          label: title || 'Unnamed Account', 
          icon: KeyRound, 
          view: 'My Vault', 
          match: username || url, 
          rawPassword: c.password 
        });
      }
    });

    // Search Notes
    vaultData?.notes?.forEach(n => {
      const title = n.title || '';
      const content = n.content || '';
      if (title.toLowerCase().includes(q) || content.toLowerCase().includes(q)) {
        results.push({ 
          type: 'note', 
          label: title || 'Untitled Note', 
          icon: FileText, 
          view: 'Notes', 
          match: content.replace(/<[^>]*>?/gm, '').substring(0, 45) 
        });
      }
    });

    // Search Tasks
    vaultData?.tasks?.forEach((t: any) => {
      const title = t.title || t.text || '';
      const desc = t.description || '';
      if (title.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
        results.push({ 
          type: 'task', 
          label: title, 
          icon: CheckSquare, 
          view: 'Tasks', 
          match: t.status ? `Status: ${t.status}` : 'Task' 
        });
      }
    });

    // Search Transactions
    vaultData?.transactions?.forEach(tx => {
      const cat = tx.category || '';
      const desc = tx.description || '';
      if (cat.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
        results.push({ 
          type: 'transaction', 
          label: cat || 'Transaction', 
          icon: DollarSign, 
          view: 'Income', 
          match: `${tx.type === 'in' ? '+' : '-'}$${tx.amount} • ${desc}` 
        });
      }
    });

    return results.slice(0, 10);
  };

  const results = getResults();

  // Keyboard navigation
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
        await writeText(results[selectedIndex].rawPassword || '');
        setIsOpen(false);
        showToast('Password copied to clipboard • Auto-clearing in 30s', {
          type: 'info',
          duration: 30000,
          countdown: 30,
          action: {
            label: 'Clear Now',
            onClick: async () => {
              await writeText('');
              showToast('Clipboard cleared.', { type: 'success' });
            }
          }
        });
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-950/50 backdrop-blur-xs"
        onClick={() => setIsOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -16 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl bg-white dark:bg-[#141416] rounded-xl shadow-2xl border border-gray-200 dark:border-[#262626] overflow-hidden flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-[#262626]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 w-full bg-transparent border-none py-3.5 px-3 text-xs sm:text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-0 placeholder-gray-400"
            placeholder="Type a command or search passwords, notes, tasks..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
          />
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2" ref={listRef}>
          {!query.trim() && (
            <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Quick Actions
            </div>
          )}

          {results.length > 0 ? (
            <ul className="space-y-0.5">
              {results.map((r, i) => {
                const Icon = r.icon;
                const isSelected = i === selectedIndex;
                return (
                  <li key={i}>
                    <button
                      onClick={() => executeResult(r)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
                        isSelected 
                          ? 'bg-zinc-100 dark:bg-[#1f1f23]' 
                          : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1c]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white'
                          : 'bg-gray-50 dark:bg-[#111113] border-gray-200 dark:border-[#262626] text-gray-500 dark:text-zinc-400'
                      }`}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-zinc-200'}`}>
                          {r.label}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-500 truncate">
                          {r.match || ''}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded font-mono">
                        {r.type}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-zinc-500 text-xs font-normal">
              No results found for "{query}"
            </div>
          )}
        </div>
        
        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-gray-50/70 dark:bg-[#111113] border-t border-gray-200 dark:border-[#262626] text-[11px] text-gray-500 dark:text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-[10px]">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-[10px]">Enter</kbd> run</span>
            {results[selectedIndex]?.type === 'credential' && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><kbd className="px-1 py-0.2 bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-900 rounded text-[10px]">Ctrl+C</kbd> copy password</span>
            )}
          </div>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-[10px]">Esc</kbd> close</span>
        </div>
      </motion.div>
    </div>
  );
};
