import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { saveVaultWithKey } from '../lib/vault';
import type { VaultData } from '../lib/vault';

interface VaultContextState {
  isLocked: boolean;
  vaultData: VaultData | null;
  unlockVault: (key: CryptoKey, salt: Uint8Array, data: VaultData) => Promise<void>;
  lockVault: () => void;
  updateVaultData: (newData: Partial<VaultData>) => Promise<void>;
  exportVaultData: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  lockCountdown: number | null;
}

const VaultContext = createContext<VaultContextState | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [salt, setSalt] = useState<Uint8Array | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);

  // Auto-lock timer logic
  const lockVault = useCallback(() => {
    setIsLocked(true);
    setVaultData(null);
    setCryptoKey(null);
    setSalt(null);
    setLockCountdown(null);
  }, []);

  // Idle detection
  useEffect(() => {
    if (isLocked) return;

    let totalMs = 5 * 60 * 1000;
    const settingTimer = vaultData?.settings?.autoLockTimer;
    if (settingTimer === '1 min') totalMs = 60 * 1000;
    else if (settingTimer === '15 min') totalMs = 15 * 60 * 1000;
    else if (settingTimer === 'Never') totalMs = 0;

    if (totalMs === 0) return;

    const WARNING_MS = 15000; // 15 seconds warning
    const idleMs = totalMs > WARNING_MS ? totalMs - WARNING_MS : totalMs / 2;
    
    let idleTimeout: ReturnType<typeof setTimeout>;
    let warningInterval: ReturnType<typeof setInterval>;
    let lockTimeout: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimeout);
      clearInterval(warningInterval);
      clearTimeout(lockTimeout);
      setLockCountdown(null);

      idleTimeout = setTimeout(() => {
        let remaining = WARNING_MS / 1000;
        setLockCountdown(remaining);
        
        warningInterval = setInterval(() => {
          remaining -= 1;
          setLockCountdown(remaining);
        }, 1000);

        lockTimeout = setTimeout(() => {
          clearInterval(warningInterval);
          lockVault();
        }, WARNING_MS);

      }, idleMs);
    };

    resetTimer();

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    return () => {
      clearTimeout(idleTimeout);
      clearInterval(warningInterval);
      clearTimeout(lockTimeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [isLocked, lockVault, vaultData?.settings?.autoLockTimer]);

  const unlockVault = async (key: CryptoKey, keySalt: Uint8Array, data: VaultData) => {
    setCryptoKey(key);
    setSalt(keySalt);
    setVaultData(data);
    setIsLocked(false);

    // Self-healing: if the vault was just restored from a backup, the unencrypted config might be out of date.
    // Sync it with the decrypted settings now that we have access to them.
    if (data.settings) {
      try {
        const { saveAppConfig } = await import('../lib/config');
        await saveAppConfig({
          workspaceName: data.settings.workspaceName,
          subtitle: data.settings.subtitle,
          avatarBase64: data.settings.avatarBase64,
          accentColor: data.settings.accentColor,
          theme: data.settings.theme
        });
      } catch (err) {
        console.error("Failed to sync config on unlock:", err);
      }
    }
  };

  const updateVaultData = async (newData: Partial<VaultData>) => {
    if (isLocked || !vaultData || !cryptoKey || !salt) {
      throw new Error("Vault is locked or missing keys");
    }
    
    const updatedData = { ...vaultData, ...newData };
    
    // Optimistic update in RAM
    setVaultData(updatedData);

    // Persist to file system natively via Tauri
    try {
      await saveVaultWithKey(cryptoKey, salt, updatedData);
    } catch (err) {
      console.error("Failed to auto-save vault to disk:", err);
      // In a production app, you might want to show a toast notification here
      throw err;
    }
  };

  const exportVaultData = async () => {
    if (isLocked || !vaultData || !cryptoKey || !salt) {
      throw new Error("Vault is locked or missing keys");
    }
    const { exportVault } = await import('../lib/vault');
    await exportVault(cryptoKey, salt, vaultData);
  };

  const changePassword = async (newPassword: string) => {
    if (isLocked || !vaultData) {
      throw new Error("Vault is locked or missing data");
    }
    const { deriveKey, generateRandomBytes } = await import('../lib/crypto');
    const newSalt = generateRandomBytes(16);
    const newKey = await deriveKey(newPassword, newSalt);
    
    await saveVaultWithKey(newKey, newSalt, vaultData);
    setCryptoKey(newKey);
    setSalt(newSalt);
  };

  return (
    <VaultContext.Provider value={{ isLocked, vaultData, unlockVault, lockVault, updateVaultData, exportVaultData, changePassword, lockCountdown }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = (): VaultContextState => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
