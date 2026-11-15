import React, { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Shield, Palette, Database, Upload, Download, Trash2, KeyRound, X, CheckCircle2, Info, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../../context/VaultContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../modals/ConfirmModal';
import { deleteVault } from '../../lib/vault';
import type { VaultSettings } from '../../lib/vault';
import { saveAppConfig } from '../../lib/config';
import { getVersion } from '@tauri-apps/api/app';

export const Settings: React.FC = () => {
  const { vaultData, updateVaultData, exportVaultData, changePassword } = useVault();
  const { showToast } = useToast();
  const settings = vaultData?.settings || ({} as Partial<VaultSettings>);

  const [workspaceName, setWorkspaceName] = useState(settings.workspaceName || 'My Workspace');
  const [subtitle, setSubtitle] = useState(settings.subtitle || 'Personal Vault');
  const [fontSize, setFontSize] = useState<VaultSettings['fontSize']>(settings.fontSize || 'Default');
  const [uiDensity, setUiDensity] = useState<VaultSettings['uiDensity']>(settings.uiDensity || 'Comfortable');
  const [autoLockTimer, setAutoLockTimer] = useState<VaultSettings['autoLockTimer']>(settings.autoLockTimer || '5 min');
  const [currency, setCurrency] = useState<VaultSettings['currency']>(settings.currency || 'USD');
  const [terminalHackerTheme, setTerminalHackerTheme] = useState<VaultSettings['terminalHackerTheme']>(settings.terminalHackerTheme || 'none');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('...');

  const [isEraseModalOpen, setIsEraseModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [decoyEnabled, setDecoyEnabled] = useState(settings.decoyEnabled || false);
  const [decoyPasswordInput, setDecoyPasswordInput] = useState('');

  useEffect(() => {
    setWorkspaceName(settings.workspaceName || 'My Workspace');
    setSubtitle(settings.subtitle || 'Personal Vault');
    setFontSize(settings.fontSize || 'Default');
    setUiDensity(settings.uiDensity || 'Comfortable');
    setAutoLockTimer(settings.autoLockTimer || '5 min');
    setCurrency(settings.currency || 'USD');
    setDecoyEnabled(settings.decoyEnabled || false);
    setTerminalHackerTheme(settings.terminalHackerTheme || 'none');
  }, [vaultData?.settings]);

  const handleSaveDecoy = async () => {
    if (!decoyPasswordInput) return;
    try {
      const { deriveKey, encryptData, generateRandomBytes, bufferToBase64 } = await import('../../lib/crypto');
      const dummyVaultData: any = {
        credentials: [
          { id: 'decoy-1', title: 'Local Coffee Shop', username: 'patron', password: 'CoffeeGuest2024' },
          { id: 'decoy-2', title: 'Public WiFi Portal', username: 'guest_user', password: 'GuestPassword123' },
        ],
        notes: [
          { id: 'decoy-n1', title: 'Daily Agenda', content: '<p>Review weekly roadmap and clean local storage.</p>', updatedAt: Date.now() },
          { id: 'decoy-n2', title: 'Groceries & Supplies', content: '<p>Milk, artisan bread, coffee beans, paper towels</p>', updatedAt: Date.now() },
        ],
        tasks: [
          { id: 'decoy-t1', title: 'Complete monthly summary', description: '', status: 'todo', priority: 'medium', subtasks: [], createdAt: Date.now() },
          { id: 'decoy-t2', title: 'Update computer software', description: '', status: 'done', priority: 'low', subtasks: [], createdAt: Date.now() },
        ],
        settings: {
          workspaceName: 'Workstation Safe',
          subtitle: 'Guest Profile',
          fontSize: 'Default',
          uiDensity: 'Comfortable',
          autoLockTimer: '5 min'
        }
      };

      const salt = generateRandomBytes(16);
      const key = await deriveKey(decoyPasswordInput, salt);
      const { iv, ciphertext } = await encryptData(JSON.stringify(dummyVaultData), key);

      const payload = {
        salt: bufferToBase64(salt.buffer as ArrayBuffer),
        iv: bufferToBase64(iv.buffer as ArrayBuffer),
        ciphertext: bufferToBase64(ciphertext as ArrayBuffer),
      };

      localStorage.setItem('tectoryx_decoy_vault', JSON.stringify(payload));
      await handleUpdate({ decoyEnabled: true, decoyPassword: decoyPasswordInput });
      showToast('Decoy vault configured. Secondary password will open a decoy state.', 'success');
      setDecoyPasswordInput('');
    } catch (err: any) {
      showToast('Failed to configure decoy vault: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);
  }, []);

  const handleUpdate = async (updates: Partial<VaultSettings>) => {
    const currentSettings = vaultData?.settings || {};
    const newSettings: VaultSettings = {
      workspaceName,
      subtitle,
      fontSize,
      uiDensity,
      autoLockTimer,
      currency,
      terminalHackerTheme,
      ...currentSettings,
      ...updates
    };

    await updateVaultData({
      settings: newSettings
    });

    try {
      await saveAppConfig({
        workspaceName: newSettings.workspaceName,
        subtitle: newSettings.subtitle,
        avatarBase64: newSettings.avatarBase64,
        accentColor: newSettings.accentColor,
        theme: newSettings.theme
      });
    } catch (error) {
      console.error('Failed to sync app config:', error);
    }
  };

  const handleEraseVault = async () => {
    await deleteVault();
    window.location.reload();
  };

  const handleImportFile = async () => {
    if (!importFile) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.salt && json.iv && json.ciphertext) {
          const { importVault } = await import('../../lib/vault');
          await importVault(json);
          showToast("Backup successfully restored! Reloading workspace...", { type: 'success' });
          setTimeout(() => {
            window.location.reload();
          }, 900);
        } else {
          showToast("Invalid vault backup file. Missing cryptographic fields.", { type: 'error' });
        }
      } catch {
        showToast("Failed to parse backup file. Please check file format.", { type: 'error' });
      }
    };
    reader.readAsText(importFile);
    setImportFile(null);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    try {
      await changePassword(newPassword);
      setPasswordSuccess(true);
      showToast("Master password updated successfully!", { type: 'success' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(false);
      }, 1000);
    } catch {
      setPasswordError('Failed to change password.');
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={isEraseModalOpen}
        onCancel={() => setIsEraseModalOpen(false)}
        onConfirm={handleEraseVault}
        title="Erase Vault"
        message="Are you sure you want to permanently erase this vault? All data on this device will be deleted. This action cannot be undone."
        confirmText="Erase Vault"
      />
      
      <ConfirmModal
        isOpen={isImportModalOpen}
        onCancel={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
        }}
        onConfirm={handleImportFile}
        title="Import Backup"
        message="Importing a backup will overwrite the current vault on this device with the imported data. Are you sure you want to proceed?"
        confirmText="Overwrite Data"
      />

      <div className="w-full max-w-5xl mx-auto p-5 sm:p-8 lg:p-10 h-full bg-white dark:bg-[#0a0a0a] flex flex-col overflow-y-auto">
        <div className="mb-8 shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-zinc-500" strokeWidth={1.75} />
            Settings
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Configure your workspace, security, and preferences.</p>
        </div>

        <div className="space-y-6 pb-12">
          {/* Workspace & Profile */}
          <section>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              <User className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span>Workspace & Profile</span>
            </div>
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xs space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0 overflow-hidden">
                  {settings.avatarBase64 ? (
                    <img src={settings.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} strokeWidth={1.75} />
                  )}
                </div>
                <div>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    className="hidden" 
                    id="avatar-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          handleUpdate({ avatarBase64: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label 
                    htmlFor="avatar-upload"
                    className="cursor-pointer text-xs font-medium text-gray-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-[#27272a] px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-[#18181b] shadow-2xs active:scale-[0.98] w-fit"
                  >
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Upload Picture</span>
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">PNG, JPG up to 2MB. Updates your workspace avatar.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Workspace Name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onBlur={() => handleUpdate({ workspaceName })}
                    className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Subtitle</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    onBlur={() => handleUpdate({ subtitle })}
                    className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Appearance & Preferences */}
          <section>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              <Palette className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span>Appearance & Preferences</span>
            </div>
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Application Theme</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Toggle between light or dark mode.</p>
                </div>
                <select
                  value={vaultData?.settings?.theme || 'light'}
                  onChange={(e) => handleUpdate({ theme: e.target.value as VaultSettings['theme'] })}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors w-36"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Accent Color</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Customize global highlight accents.</p>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { name: 'Tectoryx Blue', hex: '#008EFF' },
                    { name: 'Matrix Green', hex: '#10B981' },
                    { name: 'Synthwave Pink', hex: '#EC4899' },
                    { name: 'Cyberpunk Yellow', hex: '#F59E0B' },
                    { name: 'Amethyst Purple', hex: '#8B5CF6' }
                  ].map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => handleUpdate({ accentColor: color.hex })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        (vaultData?.settings?.accentColor || '#008EFF') === color.hex
                          ? 'border-gray-900 dark:border-white scale-110 shadow-xs'
                          : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Base Font Size</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Scale typography across notes and cards.</p>
                </div>
                <select
                  value={fontSize}
                  onChange={(e) => {
                    const val = e.target.value as VaultSettings['fontSize'];
                    setFontSize(val);
                    handleUpdate({ fontSize: val });
                  }}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors w-36"
                >
                  <option value="Small">Small</option>
                  <option value="Default">Default</option>
                  <option value="Large">Large</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Companion Behavior</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Control how your ghost companion behaves.</p>
                </div>
                <select
                  value={vaultData?.settings?.ghostBehavior || 'random'}
                  onChange={(e) => handleUpdate({ ghostBehavior: e.target.value as VaultSettings['ghostBehavior'] })}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors w-36"
                >
                  <option value="random">Random Spawns</option>
                  <option value="fixed">Fixed Position</option>
                  <option value="draggable">Draggable</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">UI Density</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Toggle spacing density across menus and cards.</p>
                </div>
                <select
                  value={uiDensity}
                  onChange={(e) => {
                    const val = e.target.value as VaultSettings['uiDensity'];
                    setUiDensity(val);
                    handleUpdate({ uiDensity: val });
                  }}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors w-36"
                >
                  <option value="Comfortable">Comfortable</option>
                  <option value="Compact">Compact</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Default Currency</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Currency symbol for income and expense records.</p>
                </div>
                <select
                  value={currency}
                  onChange={(e) => {
                    const val = e.target.value as VaultSettings['currency'];
                    setCurrency(val);
                    handleUpdate({ currency: val });
                  }}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors w-36"
                >
                  <option value="USD">USD ($)</option>
                  <option value="PHP">PHP (₱)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Terminal Hacker Mode</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Retro monochrome CRT theme with simulated phosphor scanlines.</p>
                </div>
                <select
                  value={terminalHackerTheme || 'none'}
                  onChange={async (e) => {
                    const theme = e.target.value as VaultSettings['terminalHackerTheme'];
                    setTerminalHackerTheme(theme);
                    const currentSettings = vaultData?.settings || {};
                    const newSettings: VaultSettings = {
                      workspaceName,
                      subtitle,
                      fontSize,
                      uiDensity,
                      autoLockTimer,
                      currency,
                      ...currentSettings,
                      terminalHackerTheme: theme,
                    };

                    if (theme !== 'none') {
                      const { unlockBadge } = await import('../../lib/gamification');
                      const res = unlockBadge(vaultData?.gamification, 'terminal_junkie');
                      await updateVaultData({
                        settings: newSettings,
                        gamification: res.newState,
                      });
                    } else {
                      await updateVaultData({
                        settings: newSettings,
                      });
                    }
                  }}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors w-36"
                >
                  <option value="none">Standard UI</option>
                  <option value="green">Green Phosphor CRT</option>
                  <option value="amber">Amber CRT</option>
                </select>
              </div>
            </div>
          </section>

          {/* Audio & Sensory Immersion */}
          <section>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              <Volume2 className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span>Audio & Tactile Immersion</span>
            </div>
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Mechanical Audio Engine</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Synthesized tactile typewriter key clicks, vault locks, and coin chimes.</p>
                </div>
                <input
                  type="checkbox"
                  checked={vaultData?.settings?.soundEnabled ?? true}
                  onChange={(e) => handleUpdate({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-accent cursor-pointer"
                />
              </div>

              {(vaultData?.settings?.soundEnabled ?? true) && (
                <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Sound Effects Volume</h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Volume level for procedural audio effects.</p>
                  </div>
                  <div className="flex items-center gap-2 w-36">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={vaultData?.settings?.soundVolume ?? 50}
                      onChange={(e) => handleUpdate({ soundVolume: parseInt(e.target.value, 10) })}
                      className="w-full accent-accent h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono tabular-nums text-gray-500 w-8 text-right">
                      {vaultData?.settings?.soundVolume ?? 50}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Security */}
          <section>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              <Shield className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span>Security</span>
            </div>
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Auto-Lock Timer</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Automatically lock the vault after inactivity.</p>
                </div>
                <select
                  value={autoLockTimer}
                  onChange={(e) => {
                    const val = e.target.value as VaultSettings['autoLockTimer'];
                    setAutoLockTimer(val);
                    handleUpdate({ autoLockTimer: val });
                  }}
                  className="bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors w-36"
                >
                  <option value="1 min">1 min</option>
                  <option value="5 min">5 min</option>
                  <option value="15 min">15 min</option>
                  <option value="Never">Never</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Master Password</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Update the password that derives your encryption key.</p>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-3.5 py-1.5 border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                >
                  <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Change Password</span>
                </button>
              </div>

              {/* Duress / Decoy Vault Option */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Duress / Decoy Vault</h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">
                      Configure a secondary password. If entered under coercion, loads an innocent decoy workspace.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={decoyEnabled}
                    onChange={(e) => {
                      setDecoyEnabled(e.target.checked);
                      handleUpdate({ decoyEnabled: e.target.checked });
                    }}
                    className="w-4 h-4 accent-accent cursor-pointer"
                  />
                </div>

                {decoyEnabled && (
                  <div className="bg-gray-50 dark:bg-zinc-900/60 p-3.5 rounded-lg border border-gray-200 dark:border-zinc-800 space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                      Configure Decoy Password
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="Enter alternate decoy password..."
                        value={decoyPasswordInput}
                        onChange={(e) => setDecoyPasswordInput(e.target.value)}
                        className="flex-1 bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={handleSaveDecoy}
                        disabled={!decoyPasswordInput}
                        className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:opacity-95 disabled:opacity-40 shadow-xs"
                      >
                        Save Decoy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* App Info */}
          <section>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              <Info className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span>App Info</span>
            </div>
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xs">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-zinc-100">Tectoryx</h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Version {appVersion} • Local-First Architecture</p>
            </div>
          </section>

          {/* Data & Backup */}
          <section>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              <Database className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span>Data & Backup</span>
            </div>
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">Vault Snapshots</h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Export an encrypted snapshot or restore from an existing `.vault` file.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportVaultData}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Export Backup</span>
                  </button>
                  
                  <input 
                    type="file" 
                    accept=".vault,application/json" 
                    className="hidden" 
                    id="vault-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        setIsImportModalOpen(true);
                        e.target.value = '';
                      }
                    }}
                  />
                  <label 
                    htmlFor="vault-upload"
                    className="cursor-pointer px-3 py-1.5 bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                  >
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Import Backup</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400">Danger Zone</h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">Permanently delete this vault from your computer.</p>
                  </div>
                  <button
                    onClick={() => setIsEraseModalOpen(true)}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98] w-fit"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Erase Vault & Reset</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Change Master Password Modal */}
        <AnimatePresence>
          {isPasswordModalOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-[#121214] rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-200 dark:border-[#27272a] overflow-hidden"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">Change Master Password</h2>
                  <button onClick={() => setIsPasswordModalOpen(false)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </div>

                {passwordSuccess ? (
                  <div className="py-6 flex flex-col items-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-10 h-10 mb-2" strokeWidth={1.75} />
                    <p className="text-xs font-medium">Password updated successfully!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your new password"
                        className="w-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-gray-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                      />
                    </div>

                    {passwordError && (
                      <p className="text-rose-500 text-xs font-medium">{passwordError}</p>
                    )}

                    <div className="pt-2 flex justify-end gap-2">
                      <button 
                        onClick={() => setIsPasswordModalOpen(false)}
                        className="px-3.5 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleChangePassword}
                        className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-medium rounded-lg transition-colors shadow-2xs active:scale-[0.98]"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
