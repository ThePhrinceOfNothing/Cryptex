import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, DownloadCloud, CheckCircle2 } from 'lucide-react';

interface OnboardingStepperProps {
  onComplete: (workspaceName: string, password: string) => void;
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

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
      }, 800);
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* LEFT PANE: Strict Minimalist Sidebar */}
      <div className="hidden lg:flex w-1/4 bg-[#fafafa] dark:bg-[#0c0c0e] border-r border-gray-200 dark:border-[#262626] flex-col p-10">
        <div className="mb-16">
          <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Cryptex</span>
        </div>
        
        <div className="flex-1 space-y-6">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isPast = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-4">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isActive ? 'bg-gray-900 dark:bg-white' : isPast ? 'bg-gray-300 dark:bg-zinc-600' : 'bg-transparent'}`} />
                <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-gray-900 dark:text-white' : isPast ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-300 dark:text-zinc-700'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE: Clean Form Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-8 py-12 lg:px-24 flex flex-col justify-center max-w-2xl w-full">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Welcome to Cryptex</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed max-w-lg">
                  Cryptex keeps your passwords, notes, and money safely on your computer. No clouds, no servers, just your stuff.
                </p>
                <div className="border border-gray-200 dark:border-[#262626] p-5 rounded-md space-y-3 mt-8 max-w-lg">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-900 dark:text-zinc-300">Privacy First</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    By continuing, you agree to our terms. Since Cryptex runs entirely on your device, we can't see your data, track what you do, or collect any info about you.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer group mt-4 pt-4 border-t border-gray-100 dark:border-[#262626]">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 dark:accent-white cursor-pointer" />
                    <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">I've read and agree</span>
                  </label>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Name your space</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed max-w-lg">
                  This is where all your private data will live on this computer.
                </p>
                <div className="space-y-2 mt-8 max-w-lg">
                  <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Workspace Name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 dark:border-[#333] rounded-md px-3 py-2.5 outline-none transition-all focus:border-gray-900 dark:focus:border-white text-gray-900 dark:text-white text-sm"
                    placeholder="e.g. Personal Stuff"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Create your password</h2>
                <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-5 rounded-md flex gap-4 text-red-800 dark:text-red-400 max-w-lg">
                  <AlertTriangle className="shrink-0 w-5 h-5" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xs uppercase tracking-wider">Heads Up</h3>
                    <p className="text-xs leading-relaxed opacity-90">
                      Since we don't store your data on our servers, there's no "Forgot Password" button. If you lose this password, you lose your data forever.
                    </p>
                  </div>
                </div>
                <div className="space-y-4 mt-8 max-w-lg">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border border-gray-300 dark:border-[#333] rounded-md px-3 py-2.5 outline-none transition-all focus:border-gray-900 dark:focus:border-white text-gray-900 dark:text-white text-sm"
                      placeholder="At least 8 characters"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border border-gray-300 dark:border-[#333] rounded-md px-3 py-2.5 outline-none transition-all focus:border-gray-900 dark:focus:border-white text-gray-900 dark:text-white text-sm"
                      placeholder="Type it again"
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="w-12 h-12 bg-gray-100 dark:bg-[#141414] text-gray-900 dark:text-white rounded-md flex items-center justify-center mb-6 border border-gray-200 dark:border-[#262626]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">You're all set</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed max-w-lg">
                  Your private space is ready to use.
                </p>
                <div className="border border-gray-200 dark:border-[#262626] p-5 rounded-md max-w-lg mt-8">
                  <h3 className="font-semibold text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-2"><DownloadCloud size={14} /> A quick reminder</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    Be sure to go to <strong>Settings &gt; Backup</strong> every so often to save a copy of your vault somewhere safe.
                  </p>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 lg:px-24 border-t border-gray-100 dark:border-[#262626] bg-[#fafafa]/50 dark:bg-[#0c0c0e]/50 flex items-center justify-between shrink-0">
          <div className="text-red-500 text-xs font-medium h-4 flex-1">
            {error && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.span>}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => { setError(null); setStep(s => s - 1); }}
                disabled={isFinishing}
                className="px-5 py-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isFinishing}
              className="flex items-center gap-2 px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
            >
              {step === 4 ? (isFinishing ? 'Opening...' : 'Done') : 'Continue'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
