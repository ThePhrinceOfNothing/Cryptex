import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, DownloadCloud, CheckCircle2, UploadCloud } from 'lucide-react';
import { importVault } from '../../lib/vault';
import type { EncryptedPayload } from '../../lib/crypto';

interface OnboardingStepperProps {
  onComplete: (workspaceName: string, password: string) => void;
  onRestore?: () => void;
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({ onComplete, onRestore }) => {
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoring(true);
    setRestoreError(null);
    try {
      const text = await file.text();
      const payload: EncryptedPayload = JSON.parse(text);
      if (!payload.salt || !payload.iv || !payload.ciphertext) {
        throw new Error("Invalid vault file format. Missing cryptographic fields.");
      }
      await importVault(payload);
      if (onRestore) {
        onRestore();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setRestoreError(err.message || "Failed to restore vault backup.");
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const steps = [
    { id: 1, title: 'Welcome' },
    { id: 2, title: 'Workspace' },
    { id: 3, title: 'Security' },
    { id: 4, title: 'Recovery' },
  ];

  const handleNext = () => {
    setError(null);
    if (step === 1 && !agreed) {
      setError("You need to agree to the terms to continue.");
      return;
    }
    if (step === 2 && !workspaceName.trim()) {
      setError("Please give your workspace a name.");
      return;
    }
    if (step === 3) {
      if (password.length < 8) {
        setError("Your password needs to be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Those passwords don't match.");
        return;
      }
    }
    if (step === 4) {
      setIsFinishing(true);
      setTimeout(() => {
        onComplete(workspaceName, password);
      }, 600);
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* MOBILE / TABLET STEP HEADER (< 1024px) */}
      <div className="flex lg:hidden items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-[#262626] bg-[#fafafa] dark:bg-[#111113] shrink-0">
        <span className="font-semibold text-xs tracking-wider uppercase text-gray-900 dark:text-white">Tectoryx Setup</span>
        <div className="flex items-center gap-1.5">
          {steps.map(s => (
            <div 
              key={s.id} 
              className={`w-2 h-2 rounded-full transition-all ${
                step === s.id 
                  ? 'bg-gray-900 dark:bg-white scale-125' 
                  : step > s.id 
                  ? 'bg-gray-400 dark:bg-zinc-600' 
                  : 'bg-gray-200 dark:bg-zinc-800'
              }`}
              title={s.title}
            />
          ))}
        </div>
        <span className="text-[11px] text-gray-500 dark:text-zinc-400 tabular-nums">Step {step} of 4</span>
      </div>

      {/* DESKTOP SIDEBAR (>= 1024px) */}
      <div className="hidden lg:flex w-72 bg-[#fafafa] dark:bg-[#111113] border-r border-gray-200 dark:border-[#262626] flex-col p-10 shrink-0 select-none">
        <div className="mb-14">
          <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Tectoryx</span>
        </div>
        
        <div className="flex-1 space-y-5">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isPast = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${isActive ? 'bg-gray-900 dark:bg-white' : isPast ? 'bg-gray-300 dark:bg-zinc-600' : 'bg-transparent border border-gray-300 dark:border-zinc-700'}`} />
                <span className={`text-xs font-medium transition-colors duration-200 ${isActive ? 'text-gray-900 dark:text-white' : isPast ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-300 dark:text-zinc-700'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE: Clean Form Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-12 lg:px-20 flex flex-col justify-center max-w-xl w-full mx-auto">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-5">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-balance">Welcome to Tectoryx</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-lg">
                  Tectoryx keeps your passwords, notes, and money safely on your computer. No clouds, no servers, just your stuff.
                </p>
                <div className="border border-gray-200 dark:border-[#262626] p-4 sm:p-5 rounded-lg space-y-2.5 mt-6 max-w-lg bg-gray-50/50 dark:bg-[#141416]/50">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-900 dark:text-zinc-300">Privacy First</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    By continuing, you agree to our terms. Since Tectoryx runs entirely on your device, we can't see your data, track what you do, or collect any info about you.
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer group mt-3 pt-3 border-t border-gray-200 dark:border-[#262626]">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-zinc-500 accent-zinc-900 dark:accent-white cursor-pointer" />
                    <span className="text-xs font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">I've read and agree</span>
                  </label>
                </div>

                <div className="pt-2 max-w-lg">
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-600">or</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileRestore}
                    accept=".vault,.json"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium text-gray-700 dark:text-zinc-300 border border-dashed border-gray-300 dark:border-zinc-700 rounded-md hover:bg-gray-100/60 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer"
                  >
                    <UploadCloud size={15} />
                    <span>{isRestoring ? 'Restoring vault...' : 'Restore from existing vault (.vault file)'}</span>
                  </button>
                  {restoreError && (
                    <p className="text-[11px] text-rose-500 mt-1.5">{restoreError}</p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-5">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-balance">Name your space</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-lg">
                  This is where all your private data will live on this computer.
                </p>
                <div className="space-y-1.5 mt-6 max-w-lg">
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Workspace Name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 dark:border-[#333] rounded-md px-3 py-2 outline-none transition-colors focus:border-zinc-900 dark:focus:border-white text-gray-900 dark:text-white text-xs sm:text-sm font-medium"
                    placeholder="e.g. Personal Stuff"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-5">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-balance">Create your password</h2>
                <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-4 rounded-lg flex gap-3 text-rose-800 dark:text-rose-400 max-w-lg">
                  <AlertTriangle className="shrink-0 w-4 h-4 mt-0.5" strokeWidth={1.75} />
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-xs uppercase tracking-wider">Important Notice</h3>
                    <p className="text-xs leading-relaxed opacity-90">
                      Since we don't store your data on our servers, there's no "Forgot Password" button. If you lose this password, you lose your data forever.
                    </p>
                  </div>
                </div>
                <div className="space-y-3.5 mt-6 max-w-lg">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Master Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border border-gray-300 dark:border-[#333] rounded-md px-3 py-2 outline-none transition-colors focus:border-zinc-900 dark:focus:border-white text-gray-900 dark:text-white text-xs sm:text-sm font-medium"
                      placeholder="At least 8 characters"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border border-gray-300 dark:border-[#333] rounded-md px-3 py-2 outline-none transition-colors focus:border-zinc-900 dark:focus:border-white text-gray-900 dark:text-white text-xs sm:text-sm font-medium"
                      placeholder="Type it again"
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-5">
                <div className="w-10 h-10 bg-gray-100 dark:bg-[#141416] text-gray-900 dark:text-white rounded-lg flex items-center justify-center border border-gray-200 dark:border-[#262626]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-balance">You're all set</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-lg">
                  Your private space is initialized and ready to use.
                </p>
                <div className="border border-gray-200 dark:border-[#262626] p-4 rounded-lg max-w-lg mt-6 bg-gray-50/50 dark:bg-[#141416]/50">
                  <h3 className="font-semibold text-xs text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <DownloadCloud size={14} strokeWidth={1.75} /> 
                    <span>Quick Tip</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    Be sure to visit <strong>Settings &gt; Backup</strong> regularly to save a secure snapshot of your vault.
                  </p>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 sm:px-10 lg:px-20 border-t border-gray-100 dark:border-[#262626] bg-[#fafafa]/50 dark:bg-[#111113]/50 flex items-center justify-between shrink-0">
          <div className="text-rose-500 text-xs font-medium h-4 flex-1">
            {error && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.span>}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => { setError(null); setStep(s => s - 1); }}
                disabled={isFinishing}
                className="px-3.5 py-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white text-xs font-medium transition-colors disabled:opacity-50 active:scale-[0.97]"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isFinishing}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-2xs active:scale-[0.97]"
            >
              {step === 4 ? (isFinishing ? 'Opening...' : 'Done') : 'Continue'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
