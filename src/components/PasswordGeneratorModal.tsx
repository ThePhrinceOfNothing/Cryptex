import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Copy, Check, Shield } from 'lucide-react';
import { generatePassword, calculatePasswordStrength } from '../lib/passwordUtils';
import type { PasswordOptions } from '../lib/passwordUtils';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({ isOpen, onClose, onApply }) => {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generateNew = () => {
    setPassword(generatePassword(options));
  };

  useEffect(() => {
    if (isOpen) {
      generateNew();
    }
  }, [isOpen]);

  // Re-generate when options change
  useEffect(() => {
    if (isOpen) {
      generateNew();
    }
  }, [options.length, options.uppercase, options.lowercase, options.numbers, options.symbols]);

  if (!isOpen) return null;

  const strength = calculatePasswordStrength(password);
  
  let strengthColor = 'bg-red-500';
  let strengthLabel = 'Weak';
  let strengthWidth = 'w-1/4';
  
  if (strength === 'fair') {
    strengthColor = 'bg-yellow-500';
    strengthLabel = 'Fair';
    strengthWidth = 'w-2/4';
  } else if (strength === 'good') {
    strengthColor = 'bg-blue-500';
    strengthLabel = 'Good';
    strengthWidth = 'w-3/4';
  } else if (strength === 'strong') {
    strengthColor = 'bg-green-500';
    strengthLabel = 'Strong';
    strengthWidth = 'w-full';
  }

  const handleCopy = async () => {
    await writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Password Generator
            </h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Display */}
            <div className="relative">
              <div className="w-full bg-gray-100 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl p-4 pr-24 break-all font-mono text-lg text-gray-900 dark:text-white min-h-[4rem] flex items-center">
                {password}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button 
                  onClick={generateNew}
                  className="p-2 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={handleCopy}
                  className="p-2 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                  title="Copy"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Strength Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-gray-500 dark:text-zinc-400">Password Strength</span>
                <span className={strengthColor.replace('bg-', 'text-')}>{strengthLabel}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strengthColor} ${strengthWidth}`} />
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-zinc-300">
                  <span>Length</span>
                  <span className="text-accent">{options.length}</span>
                </div>
                <input 
                  type="range" 
                  min="8" 
                  max="64" 
                  value={options.length}
                  onChange={(e) => setOptions(p => ({ ...p, length: parseInt(e.target.value) }))}
                  className="w-full accent-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Checkbox label="A-Z" checked={options.uppercase} onChange={(v) => setOptions(p => ({ ...p, uppercase: v }))} />
                <Checkbox label="a-z" checked={options.lowercase} onChange={(v) => setOptions(p => ({ ...p, lowercase: v }))} />
                <Checkbox label="0-9" checked={options.numbers} onChange={(v) => setOptions(p => ({ ...p, numbers: v }))} />
                <Checkbox label="!@#" checked={options.symbols} onChange={(v) => setOptions(p => ({ ...p, symbols: v }))} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-white/10 flex items-center justify-end">
            <button
              onClick={() => {
                onApply(password);
                onClose();
              }}
              className="px-6 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all"
            >
              Use Password
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Checkbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (c: boolean) => void }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
      checked ? 'bg-accent border-accent text-white' : 'bg-white dark:bg-black border-gray-300 dark:border-zinc-700 group-hover:border-accent/50'
    }`}>
      {checked && <Check size={12} strokeWidth={3} />}
    </div>
    <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 select-none">{label}</span>
  </label>
);

