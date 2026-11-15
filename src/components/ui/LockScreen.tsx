import React, { useState, useEffect, useRef } from 'react';
import { vaultExists, loadVault } from '../../lib/vault';
import { loadAppConfig, saveAppConfig } from '../../lib/config';
import type { AppConfig } from '../../lib/config';
import { useVault } from '../../context/VaultContext';
import { Eye, EyeOff, Lock, ShieldAlert, ArrowRight, DownloadCloud, User } from 'lucide-react';
import logoUrl from '../../assets/logo.svg';
import { motion, useAnimation } from 'framer-motion';
import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
import { OnboardingStepper } from './OnboardingStepper';
import type { VaultData } from '../../lib/vault';
import { saveVault } from '../../lib/vault';

export const LockScreen: React.FC = () => {
  const { unlockVault } = useVault();
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('1.4.0');
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [time, setTime] = useState(new Date());

  const inputRef = useRef<HTMLInputElement>(null);
  const shakeControls = useAnimation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
    
    // Check for updater
    check().then(update => {
      if (update?.available) setUpdateAvailable(update);
    }).catch(() => {});

    // Check vault and config
    Promise.all([vaultExists(), loadAppConfig()])
      .then(([exists, config]) => {
        setHasVault(exists);
        if (config) {
          setAppConfig(config);
          if (config.accentColor) {
            document.documentElement.style.setProperty('--color-accent', config.accentColor);
          }
          if (config.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      })
      .catch(err => {
        console.error("Failed to load initial vault state:", err);
        setHasVault(false);
      });
  }, []);

  // Auto-focus password input as soon as lock screen mounts
  useEffect(() => {
    if (hasVault) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [hasVault]);

  const triggerErrorShake = () => {
    shakeControls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.35, ease: 'easeOut' }
    });
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, key, salt } = await loadVault(password);
      unlockVault(key, salt, data);
    } catch (err: any) {
      setError("Decryption failed. Incorrect master password.");
      triggerErrorShake();
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  const handleStepperComplete = async (newWorkspaceName: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const initialData: VaultData = {
        todos: [],
        credentials: [],
        settings: {
          workspaceName: newWorkspaceName,
          subtitle: 'Personal Vault',
          fontSize: 'Default',
          uiDensity: 'Comfortable',
          autoLockTimer: '5 min'
        }
      };
      const { key, salt } = await saveVault(newPassword, initialData);
      await saveAppConfig({ workspaceName: newWorkspaceName });
      unlockVault(key, salt, initialData);
    } catch (err: any) {
      setError(err.message || "Failed to initialize cryptographic vault.");
      setIsLoading(false);
    }
  };

  const handleUpdateApp = async () => {
    if (!updateAvailable || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateAvailable.downloadAndInstall();
    } catch (err) {
      console.error("Failed to install update:", err);
      setIsUpdating(false);
    }
  };

  // Loading state
  if (hasVault === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Initial setup stepper if no vault exists yet
  if (!hasVault) {
    return (
      <OnboardingStepper
        onComplete={handleStepperComplete}
        onRestore={async () => {
          try {
            const config = await loadAppConfig();
            if (config) {
              setAppConfig(config);
              if (config.accentColor) {
                document.documentElement.style.setProperty('--color-accent', config.accentColor);
              }
              if (config.theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }
          } catch (e) {
            console.error('Failed to load restored config:', e);
          }
          setHasVault(true);
        }}
      />
    );
  }

  return (
    <div className="relative w-screen min-h-screen flex flex-col justify-between items-center bg-[#09090b] text-zinc-100 select-none overflow-hidden p-6 sm:p-10">
      
      {/* Precision Geometric Security Grid Background (No GPU loop) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      {/* Subtle Radial Sovereign Ambient Core */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 42%, rgba(37,99,235,0.12) 0%, rgba(9,9,11,0) 65%)'
        }}
      />

      {/* Top Header: Updater & Clock */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase">
            Encrypted Enclave Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          {updateAvailable && (
            <button
              onClick={handleUpdateApp}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs transition-colors active:scale-95"
            >
              <DownloadCloud size={13} className={isUpdating ? "animate-bounce" : ""} />
              <span>{isUpdating ? "Updating..." : `v${updateAvailable.version} Available`}</span>
            </button>
          )}

          <div className="text-right">
            <span className="text-xs font-mono tabular-nums text-zinc-400">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* Center Sovereign Unlock Hub */}
      <main className="relative z-10 w-full max-w-sm flex flex-col items-center my-auto">
        
        {/* Hardware Prism Shield Bezel */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800/90 shadow-2xl flex items-center justify-center p-3 transition-transform hover:scale-105 duration-200">
            <img src={logoUrl} alt="Tectoryx" className="w-full h-full object-contain drop-shadow" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-blue-500/10 -z-10 blur-xs" />
        </div>

        {/* Brand & Workspace Identity */}
        <div className="text-center mb-8">
          <h1 className="text-xs font-bold tracking-[0.28em] uppercase text-zinc-400 mb-1.5">
            Tectoryx
          </h1>
          <p className="text-base font-semibold text-white tracking-tight">
            {appConfig?.workspaceName || 'Master Vault'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Local AES-256-GCM zero-knowledge partition
          </p>
        </div>

        {/* Unlock Form with Motion Error Shake */}
        <motion.form 
          animate={shakeControls}
          onSubmit={handleUnlock}
          className="w-full space-y-3"
        >
          <div className={`relative flex items-center bg-zinc-900/90 border rounded-xl transition-all shadow-inner ${
            error 
              ? 'border-rose-500/80 ring-1 ring-rose-500/30' 
              : 'border-zinc-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30'
          }`}>
            <div className="pl-3.5 text-zinc-500">
              <Lock size={15} strokeWidth={1.75} />
            </div>

            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter master password"
              disabled={isLoading}
              className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none font-mono tracking-wider"
            />

            <div className="flex items-center pr-2 gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>

              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-sm"
                title="Unlock (Enter)"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={14} strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>

          {/* Feedback & Error Text */}
          {error ? (
            <div className="flex items-center gap-1.5 text-rose-400 text-xs px-1">
              <ShieldAlert size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 font-mono">
              <span>Press Enter ↵ to decrypt</span>
              <span>Offline</span>
            </div>
          )}
        </motion.form>

      </main>

      {/* Bottom Footer Status Bar */}
      <footer className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[11px] text-zinc-500 font-mono border-t border-zinc-900 pt-4">
        <div className="flex items-center gap-2">
          <span>Tectoryx v{appVersion}</span>
          <span>•</span>
          <span>Zero-Knowledge Architecture</span>
        </div>
        <div>
          <span>{time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </footer>

    </div>
  );
};
