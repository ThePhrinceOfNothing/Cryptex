import React, { useState, useEffect, useRef } from 'react';
import { vaultExists, loadVault, saveVault, createPreUpdateSnapshot } from '../../lib/vault';
import { loadAppConfig, saveAppConfig } from '../../lib/config';
import type { AppConfig } from '../../lib/config';
import { useVault } from '../../context/VaultContext';
import { Eye, EyeOff, Lock, ShieldAlert, ArrowRight, DownloadCloud, User, History } from 'lucide-react';
import logoUrl from '../../assets/logo.svg';
import { motion, useAnimation } from 'framer-motion';
import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
import { OnboardingStepper } from './OnboardingStepper';
import { VaultRestoreModal } from '../modals/VaultRestoreModal';
import type { VaultData } from '../../lib/vault';
import { playVaultLock } from '../../lib/soundEngine';

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
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const shakeControls = useAnimation();

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
      // Check for duress / decoy vault
      const decoyRaw = localStorage.getItem('tectoryx_decoy_vault');
      if (decoyRaw) {
        try {
          const decoyPayload = JSON.parse(decoyRaw);
          const { base64ToBuffer, deriveKey, decryptData } = await import('../../lib/crypto');
          const salt = new Uint8Array(base64ToBuffer(decoyPayload.salt));
          const iv = new Uint8Array(base64ToBuffer(decoyPayload.iv));
          const ciphertext = new Uint8Array(base64ToBuffer(decoyPayload.ciphertext));
          const decoyKey = await deriveKey(password, salt);
          const jsonStr = await decryptData(ciphertext, iv, decoyKey);
          const decoyData = JSON.parse(jsonStr);
          unlockVault(decoyKey, salt, decoyData, true);
          return;
        } catch {
          // Decoy password attempt failed as well, continue to error
        }
      }

      console.error("Master vault decryption failed:", err);
      playVaultLock();
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
      // Create an automatic pre-update safety snapshot of the vault
      await createPreUpdateSnapshot(updateAvailable.version).catch((e) => {
        console.warn("Failed to create pre-update snapshot, continuing:", e);
      });
      await updateAvailable.downloadAndInstall();
    } catch (err) {
      console.error("Failed to install update:", err);
      setIsUpdating(false);
    }
  };

  const handleSnapshotRestored = async () => {
    try {
      const exists = await vaultExists();
      setHasVault(exists);
      const config = await loadAppConfig();
      if (config) {
        setAppConfig(config);
      }
      setError(null);
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 150);
    } catch (err) {
      console.error("Failed to refresh vault after restore:", err);
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
    <div className="relative w-full h-full flex flex-col justify-center items-center bg-[#09090b] text-zinc-100 select-none overflow-hidden p-6">
      
      {/* Subtle Ambient Radial Glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(37,99,235,0.07) 0%, rgba(9,9,11,0) 65%)'
        }}
      />

      {/* Top Updater Indicator (only if update available) */}
      {updateAvailable && (
        <div className="absolute top-5 right-5 z-10">
          <button
            onClick={handleUpdateApp}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs transition-colors active:scale-95"
          >
            <DownloadCloud size={13} className={isUpdating ? "animate-bounce" : ""} />
            <span>{isUpdating ? "Updating..." : `v${updateAvailable.version} Available`}</span>
          </button>
        </div>
      )}

      {/* Center Unlock Hub */}
      <main className="relative z-10 w-full max-w-xs sm:max-w-sm flex flex-col items-center">
        
        {/* App Logo */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl flex items-center justify-center p-3.5 transition-transform hover:scale-105 duration-200">
            <img src={logoUrl} alt="Tectoryx" className="w-full h-full object-contain" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-blue-500/10 -z-10 blur-xs" />
        </div>

        {/* Brand Title */}
        <div className="text-center mb-7">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Tectoryx
          </h1>
          <p className="text-xs font-medium text-zinc-400 mt-1">
            {appConfig?.workspaceName || 'Personal Workspace'}
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
              className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
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
            <div className="text-center text-[11px] text-zinc-500">
              Press Enter to unlock
            </div>
          )}

          {/* Recovery Trigger */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <History size={12} strokeWidth={1.75} />
              <span>Restore from backup snapshot</span>
            </button>
          </div>
        </motion.form>

      </main>

      <VaultRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onRestored={handleSnapshotRestored}
      />

      {/* Borderless corner version indicator */}
      <div className="absolute bottom-4 left-6 text-[11px] text-zinc-600 pointer-events-none select-none">
        v{appVersion}
      </div>

    </div>
  );
};
