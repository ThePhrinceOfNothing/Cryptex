import React, { useState, useEffect } from 'react';
import { vaultExists, loadVault, saveVault } from '../lib/vault';
import type { VaultData } from '../lib/vault';
import { loadAppConfig, saveAppConfig } from '../lib/config';
import type { AppConfig } from '../lib/config';
import { useVault } from '../context/VaultContext';
import { ShieldAlert, Hexagon, Eye, EyeOff, User } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { WebThreads } from './WebThreads';

export const LockScreen: React.FC = () => {
  const { unlockVault } = useVault();
  const [step, setStep] = useState<'loading' | 'welcome' | 'create' | 'greeting' | 'unlock'>('loading');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const controls = useAnimation();

  useEffect(() => {
    Promise.all([vaultExists(), loadAppConfig()]).then(([hasVault, config]) => {
      if (!hasVault) {
        setStep('welcome');
      } else {
        setAppConfig(config);
        setStep('greeting');
      }
    }).catch(console.error);
  }, []);

  const triggerErrorShake = () => {
    controls.start({
      x: [0, -8, 8, -8, 8, 0],
      transition: { duration: 0.4, ease: 'easeInOut' }
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setError("Cryptographic keys must match.");
      triggerErrorShake();
      return;
    }
    if (password.length < 8) {
      setError("Insufficient entropy: Minimum 8 characters required.");
      triggerErrorShake();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const initialData: VaultData = {
        todos: [],
        credentials: [],
        settings: {
          workspaceName,
          subtitle: 'Personal Node',
          fontSize: 'Default',
          uiDensity: 'Comfortable',
          autoLockTimer: '5 min'
        }
      };
      const { key, salt } = await saveVault(password, initialData);
      await saveAppConfig({ workspaceName });
      unlockVault(key, salt, initialData);
    } catch (err: any) {
      setError("Node initialization failed.");
      triggerErrorShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, key, salt } = await loadVault(password);
      unlockVault(key, salt, data);
    } catch (err: any) {
      setError("Decryption failed. Invalid credentials.");
      triggerErrorShake();
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050507]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#008EFF]"></div>
      </div>
    );
  }

  const containerVariants: any = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3, ease: 'easeIn' } }
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-[#050507] text-white font-sans selection:bg-[#008EFF]/30 overflow-hidden">
      
      {/* Dynamic WebGL Background */}
      <div className="absolute inset-0 z-0">
        <WebThreads
          color1="#008EFF"
          color2="#003b73"
          color3="#ffffff"
          backgroundColor="#050507"
          speed={0.2}
          threadCount={6}
          spread={0.2}
          glow={0.03}
          brightness={0.8}
          mouseInteraction={true}
          mouseStrength={0.4}
        />
      </div>

      {/* Glassmorphism Container */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-10 w-full flex flex-col items-center text-center">
          
          <AnimatePresence mode="wait">
            {(step === 'welcome') && (
              <motion.div 
                key="welcome"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <Hexagon className="w-12 h-12 text-[#008EFF]" strokeWidth={1.5} />
                <h1 className="text-white font-semibold text-xl mt-4 tracking-tight">
                  Enclave
                </h1>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  Welcome to your zero-knowledge workspace.
                </p>
                <motion.button
                  onClick={() => setStep('create')}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#008EFF] hover:bg-[#007acc] text-white rounded-lg px-4 py-3 mt-8 font-medium transition-colors"
                >
                  Setup Workspace
                </motion.button>
              </motion.div>
            )}

            {(step === 'create') && (
              <motion.div 
                key="create"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <Hexagon className="w-10 h-10 text-[#008EFF]" strokeWidth={1.5} />
                <h1 className="text-white font-semibold text-xl mt-4 tracking-tight">
                  Configure Node
                </h1>
                <p className="text-xs text-zinc-400 mt-2 mb-2 leading-relaxed">
                  Establish your master key.
                </p>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 mb-2 w-full p-3 bg-red-950/30 border border-red-900/50 flex items-start justify-center gap-2 text-red-400 text-xs font-medium rounded-lg"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <p className="leading-relaxed">{error}</p>
                  </motion.div>
                )}

                <motion.form 
                  onSubmit={handleCreate} 
                  className="w-full"
                  animate={controls}
                >
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-3 mt-4 outline-none transition-all focus:border-[#008EFF] focus:ring-1 focus:ring-[#008EFF]/50 text-sm placeholder-zinc-500 text-center"
                    placeholder="Workspace Name"
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="relative mt-3">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-3 outline-none transition-all focus:border-[#008EFF] focus:ring-1 focus:ring-[#008EFF]/50 text-sm placeholder-zinc-500 text-center"
                      placeholder="Master Password"
                      disabled={isLoading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative mt-3">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-3 outline-none transition-all focus:border-[#008EFF] focus:ring-1 focus:ring-[#008EFF]/50 text-sm placeholder-zinc-500 text-center"
                      placeholder="Confirm Password"
                      disabled={isLoading}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="w-full bg-[#008EFF] hover:bg-[#007acc] text-white rounded-lg px-4 py-3 mt-6 font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-full flex justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white/50 border-r-transparent"></div>
                      </div>
                    ) : (
                      "Initialize Enclave"
                    )}
                  </motion.button>
                </motion.form>
              </motion.div>
            )}

            {(step === 'greeting') && (
              <motion.div 
                key="greeting"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <div className="w-16 h-16 rounded-full bg-[#008EFF]/10 border border-[#008EFF]/20 flex items-center justify-center text-[#008EFF] overflow-hidden shadow-sm">
                  {appConfig?.avatarBase64 ? (
                    <img src={appConfig.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} strokeWidth={1.5} />
                  )}
                </div>
                
                <h1 className="text-white font-semibold text-xl mt-4 tracking-tight">
                  {appConfig?.workspaceName || 'Enclave'}
                </h1>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  {appConfig?.subtitle || 'Welcome back'}
                </p>
                <motion.button
                  onClick={() => setStep('unlock')}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#008EFF] hover:bg-[#007acc] text-white rounded-lg px-4 py-3 mt-8 font-medium transition-colors"
                >
                  Log In
                </motion.button>
              </motion.div>
            )}

            {(step === 'unlock') && (
              <motion.div 
                key="unlock"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <div className="w-12 h-12 rounded-full bg-[#008EFF]/10 border border-[#008EFF]/20 flex items-center justify-center text-[#008EFF] overflow-hidden shadow-sm mb-2">
                  {appConfig?.avatarBase64 ? (
                    <img src={appConfig.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} strokeWidth={1.5} />
                  )}
                </div>
                <h1 className="text-white font-semibold text-xl mt-4 tracking-tight">
                  {appConfig?.workspaceName || 'Enclave'}
                </h1>
                <p className="text-sm text-zinc-400 mt-2 mb-2 leading-relaxed">
                  Enter your master password.
                </p>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 mb-2 w-full p-3 bg-red-950/30 border border-red-900/50 flex items-start justify-center gap-2 text-red-400 text-xs font-medium rounded-lg"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <p className="leading-relaxed">{error}</p>
                  </motion.div>
                )}

                <motion.form 
                  onSubmit={handleUnlock} 
                  className="w-full"
                  animate={controls}
                >
                  <div className="relative mt-4">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-3 outline-none transition-all focus:border-[#008EFF] focus:ring-1 focus:ring-[#008EFF]/50 text-sm placeholder-zinc-500 text-center"
                      placeholder="Master Password"
                      disabled={isLoading}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="w-full bg-[#008EFF] hover:bg-[#007acc] text-white rounded-lg px-4 py-3 mt-6 font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-full flex justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white/50 border-r-transparent"></div>
                      </div>
                    ) : (
                      "Unlock Vault"
                    )}
                  </motion.button>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};
