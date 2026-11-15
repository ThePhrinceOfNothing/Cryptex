import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Copy, Check, Key, BookOpen } from 'lucide-react';
import { generatePassword, calculatePasswordStrength } from '../../lib/passwordUtils';
import type { PasswordOptions } from '../../lib/passwordUtils';
import { generateThemedPassphrase } from '../../lib/passphraseGenerator';
import type { PassphraseTheme } from '../../lib/passphraseGenerator';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useToast } from '../../context/ToastContext';
import { playKeyClick, playCoinClink } from '../../lib/soundEngine';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({ isOpen, onClose, onApply }) => {
  const { showToast } = useToast();
  const [genMode, setGenMode] = useState<'chars' | 'passphrase'>('chars');

  // Random Chars State
  const [options, setOptions] = useState<PasswordOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  // Passphrase State
  const [theme, setTheme] = useState<PassphraseTheme>('scifi');
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [includeNumber, setIncludeNumber] = useState(true);

  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generateNew = () => {
    if (genMode === 'chars') {
      setPassword(generatePassword(options));
    } else {
      setPassword(generateThemedPassphrase(theme, wordCount, separator, includeNumber));
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateNew();
    }
  }, [isOpen, genMode, theme, wordCount, separator, includeNumber, options.length, options.uppercase, options.lowercase, options.numbers, options.symbols]);

  if (!isOpen) return null;

  const strength = calculatePasswordStrength(password);
  
  let strengthColor = 'bg-rose-500 text-rose-500';
  let strengthLabel = 'Weak';
  let strengthWidth = 'w-1/4';
  
  if (strength === 'fair') {
    strengthColor = 'bg-amber-500 text-amber-500';
    strengthLabel = 'Fair';
    strengthWidth = 'w-2/4';
  } else if (strength === 'good') {
    strengthColor = 'bg-blue-500 text-blue-500';
    strengthLabel = 'Good';
    strengthWidth = 'w-3/4';
  } else if (strength === 'strong') {
    strengthColor = 'bg-emerald-500 text-emerald-500';
    strengthLabel = 'Strong';
    strengthWidth = 'w-full';
  }

  const handleCopy = async () => {
    playKeyClick();
    await writeText(password);
    setCopied(true);
    showToast('Password copied to clipboard', { type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#18181b]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                <Key size={16} strokeWidth={1.75} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                Password Generator
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Close"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex border-b border-gray-100 dark:border-white/5 px-6 pt-2 bg-gray-50/30 dark:bg-[#18181b]/30">
            <button
              onClick={() => setGenMode('chars')}
              className={`pb-2 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                genMode === 'chars'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              <Key size={13} strokeWidth={1.75} />
              <span>Random Characters</span>
            </button>
            <button
              onClick={() => setGenMode('passphrase')}
              className={`pb-2 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                genMode === 'passphrase'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              <BookOpen size={13} strokeWidth={1.75} />
              <span>Themed Passphrase</span>
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Display */}
            <div className="relative">
              <div className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg p-3.5 pr-20 break-all font-mono text-sm sm:text-base text-gray-900 dark:text-white min-h-[3.5rem] flex items-center select-all leading-relaxed">
                {password}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button 
                  onClick={generateNew}
                  className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded-md transition-colors active:scale-[0.95]"
                  title="Generate New"
                >
                  <RefreshCw size={15} strokeWidth={1.75} />
                </button>
                <button 
                  onClick={handleCopy}
                  className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded-md transition-colors active:scale-[0.95]"
                  title="Copy Password"
                >
                  {copied ? <Check size={15} className="text-emerald-500" strokeWidth={2} /> : <Copy size={15} strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            {/* Strength Meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-gray-500 dark:text-zinc-400">Entropy Strength</span>
                <span className={`font-semibold ${strengthColor.split(' ')[1]}`}>{strengthLabel}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strengthColor.split(' ')[0]} ${strengthWidth}`} />
              </div>
            </div>

            {genMode === 'chars' ? (
              <>
                {/* Length Slider */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    <span>Length</span>
                    <span className="tabular-nums font-mono text-gray-900 dark:text-white text-xs">{options.length} characters</span>
                  </div>
                  <input 
                    type="range" 
                    min="8" 
                    max="64" 
                    value={options.length}
                    onChange={(e) => setOptions(p => ({ ...p, length: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>

                {/* Character Types */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <Checkbox label="Uppercase (A-Z)" checked={options.uppercase} onChange={(v) => setOptions(p => ({ ...p, uppercase: v }))} />
                  <Checkbox label="Lowercase (a-z)" checked={options.lowercase} onChange={(v) => setOptions(p => ({ ...p, lowercase: v }))} />
                  <Checkbox label="Numbers (0-9)" checked={options.numbers} onChange={(v) => setOptions(p => ({ ...p, numbers: v }))} />
                  <Checkbox label="Symbols (!@#$)" checked={options.symbols} onChange={(v) => setOptions(p => ({ ...p, symbols: v }))} />
                </div>
              </>
            ) : (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Theme Vocabulary</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as PassphraseTheme)}
                    className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                  >
                    <option value="scifi">Sci-Fi (laser-orbit-quantum-matrix)</option>
                    <option value="fantasy">Fantasy (goblin-dagger-ancient-frost)</option>
                    <option value="cooking">Cooking (basil-simmer-crispy-garlic)</option>
                    <option value="cyberpunk">Cyberpunk (glitch-neon-terminal-phantom)</option>
                    <option value="nature">Nature (summit-river-willow-thunder)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Word Count</label>
                    <select
                      value={wordCount}
                      onChange={(e) => setWordCount(parseInt(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                    >
                      <option value={3}>3 Words</option>
                      <option value={4}>4 Words (Recommended)</option>
                      <option value={5}>5 Words</option>
                      <option value={6}>6 Words</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Separator</label>
                    <select
                      value={separator}
                      onChange={(e) => setSeparator(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                    >
                      <option value="-">Hyphen (-)</option>
                      <option value=".">Period (.)</option>
                      <option value="_">Underscore (_)</option>
                      <option value=" ">Space ( )</option>
                    </select>
                  </div>
                </div>

                <Checkbox label="Append 3-digit pin" checked={includeNumber} onChange={setIncludeNumber} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-gray-50/50 dark:bg-[#18181b]/50 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApply(password);
                onClose();
              }}
              className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-2xs active:scale-[0.98]"
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
  <label className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200 dark:border-[#27272a] bg-gray-50/60 dark:bg-[#18181b]/60 cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800/60 transition-colors select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-zinc-900 dark:text-white accent-zinc-900 dark:accent-white cursor-pointer"
    />
    <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">{label}</span>
  </label>
);
