import React, { useState, useEffect } from 'react';
import { vaultExists, loadVault, saveVault } from '../lib/vault';
import type { VaultData } from '../lib/vault';
import { loadAppConfig, saveAppConfig } from '../lib/config';
import type { AppConfig } from '../lib/config';
import { useVault } from '../context/VaultContext';
import { ShieldAlert, Eye, EyeOff, User, Hexagon } from 'lucide-react';
import logoUrl from '../assets/logo.svg';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { WebThreads } from './WebThreads';
import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
import { DownloadCloud } from 'lucide-react';

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

  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('...');

  const controls = useAnimation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setUpdateAvailable(update);
        }
      } catch (err) {
        console.error("Failed to check for updates:", err);
      }
    };
    checkForUpdates();
  }, []);

  useEffect(() => {
    Promise.all([vaultExists(), loadAppConfig()]).then(([hasVault, config]) => {
      if (!hasVault) {
        setStep('welcome');
      } else {
        setAppConfig(config);
        if (config?.accentColor) {
          document.documentElement.style.setProperty('--color-accent', config.accentColor);
        }
        if (config?.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        setStep('greeting');
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);
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

  const handleUpdateApp = async () => {
    if (!updateAvailable) return;
    setIsUpdating(true);
    try {
      await updateAvailable.downloadAndInstall();
    } catch (err) {
      console.error("Failed to install update:", err);
      setIsUpdating(false);
    }
  };

  const containerVariants: any = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3, ease: 'easeIn' } }
  };


  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center bg-[#050507]">
      
      {/* Dynamic WebGL Background */}
      <div className="absolute inset-0 z-0">
        <WebThreads
          color1={appConfig?.accentColor || '#008EFF'}
          color2={appConfig?.accentColor ? `${appConfig.accentColor}80` : '#003b73'}
          color3="#FFFFFF"
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

      {/* Update Pill */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 right-8 z-50"
          >
            <button 
              onClick={handleUpdateApp}
              disabled={isUpdating}
              className="group flex items-center gap-3 bg-[#050507]/40 backdrop-blur-xl border border-accent/30 hover:bg-accent/10 hover:border-accent px-4 py-2.5 rounded-full shadow-2xl transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                {isUpdating ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-[#008EFF] border-r-transparent"></div>
                ) : (
                  <DownloadCloud size={12} strokeWidth={2.5} />
                )}
              </div>
              <div className="text-left">
                <p className="text-[10px] text-accent uppercase tracking-widest font-bold">
                  {isUpdating ? "Installing Update..." : "Update Available"}
                </p>
                {!isUpdating && (
                  <p className="text-xs text-white font-medium">
                    v{updateAvailable.version} Ready to Install
                  </p>
                )}
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassmorphism Container */}
      <div className="relative z-10 w-full max-w-sm px-4">
        {/* OS Clock */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-5xl font-light text-white tracking-wider mb-2">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-[0.2em]">
            {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="bg-[#050507]/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-10 w-full flex flex-col items-center text-center">
          
          {/* Card Header Branding */}
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold tracking-widest uppercase mb-8">
            <Hexagon className="w-3 h-3 text-accent" />
            <span>ENCLAVE</span>
          </div>

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
                <img src={logoUrl} alt="Enclave Logo" className="w-14 h-14 object-contain" />
                <h1 className="text-white font-semibold text-xl mt-4 tracking-tight">
                  Enclave
                </h1>
                <p className="text-xs text-zinc-400 mt-2 mb-8 leading-relaxed">
                  An isolated, zero-knowledge workspace where your data remains fully sovereign.
                </p>

                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={() => setStep('create')}
                    className="w-full bg-accent hover:bg-accent/80 text-white rounded-lg px-4 py-3 font-medium transition-colors"
                  >
                    Initialize Vault
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-[#050507] text-zinc-500 font-medium tracking-wide">OR</span>
                    </div>
                  </div>

                  <input 
                    type="file" 
                    accept=".vault,application/json" 
                    className="hidden" 
                    id="welcome-vault-upload" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const json = JSON.parse(event.target?.result as string);
                            if (json.salt && json.iv && json.ciphertext) {
                              const { importVault } = await import('../lib/vault');
                              await importVault(json);
                              window.location.reload();
                            } else {
                              alert("Invalid vault backup file.");
                            }
                          } catch(err) {
                            alert("Failed to parse backup file.");
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <label 
                    htmlFor="welcome-vault-upload" 
                    className="w-full cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg px-4 py-3 font-medium transition-colors flex items-center justify-center text-sm"
                  >
                    Restore from Backup
                  </label>
                </div>
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
                <img src={logoUrl} alt="Enclave Logo" className="w-12 h-12 object-contain" />
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
                    className="w-full bg-[#050507]/50 border border-white/10 text-white rounded-lg px-4 py-3 mt-4 outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm placeholder-zinc-500 text-center"
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
                      className="w-full bg-[#050507]/50 border border-white/10 text-white rounded-lg px-4 py-3 outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm placeholder-zinc-500 text-center"
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
                      className="w-full bg-[#050507]/50 border border-white/10 text-white rounded-lg px-4 py-3 outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm placeholder-zinc-500 text-center"
                      placeholder="Confirm Master Password"
                      disabled={isLoading}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="w-full bg-accent hover:bg-accent/80 text-white rounded-lg px-4 py-3 mt-6 font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-full flex justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white/50 border-r-transparent"></div>
                      </div>
                    ) : (
                      "Initialize Node"
                    )}
                  </motion.button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setStep('welcome');
                      setError(null);
                    }}
                    className="w-full mt-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Back
                  </button>
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
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-6 overflow-hidden">
                  {appConfig?.avatarBase64 ? (
                    <img src={appConfig.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} strokeWidth={1.5} />
                  )}
                </div>
                <h2 className="text-xl font-medium text-white">Welcome back, {appConfig?.workspaceName}</h2>
                <p className="text-xs text-zinc-400 mt-2">Node connection established.</p>
                <motion.button
                  onClick={() => setStep('unlock')}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-accent hover:bg-accent/80 text-white rounded-lg px-4 py-3 mt-8 font-medium transition-colors"
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
                <div className="w-20 h-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 overflow-hidden">
                  {appConfig?.avatarBase64 ? (
                    <img src={appConfig.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} strokeWidth={1.5} />
                  )}
                </div>
                <h1 className="text-white font-semibold text-xl tracking-tight">
                  Welcome back, {appConfig?.workspaceName || 'My Workspace'}
                </h1>
                <p className="text-xs text-zinc-400 mt-2 mb-2 leading-relaxed">
                  {appConfig?.subtitle || 'Personal Node'}
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
                  className="w-full mt-4"
                  animate={controls}
                >
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full bg-[#050507]/50 border border-white/10 text-white rounded-lg px-4 py-3 outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm placeholder-zinc-500 text-center"
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
                    className="w-full bg-accent hover:bg-accent/80 text-white rounded-lg px-4 py-3 mt-6 font-medium transition-colors disabled:opacity-50"
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
      
      {/* System Status Bar */}
      <div className="absolute bottom-8 w-full flex justify-center pointer-events-none">
        <p className="text-[10px] text-zinc-600 tracking-widest uppercase font-semibold">
          [ NODE: LOCAL ]  &bull;  AES-256  &bull;  v{appVersion}
        </p>
      </div>
    </div>
  );
};
