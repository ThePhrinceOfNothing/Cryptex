import React, { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Shield, Palette, Database, Upload, Download, Trash2, KeyRound, X, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../context/VaultContext';
import { deleteVault } from '../lib/vault';
import type { VaultSettings } from '../lib/vault';
import { saveAppConfig } from '../lib/config';

export const Settings: React.FC = () => {
  const { vaultData, updateVaultData, exportVaultData, changePassword } = useVault();
  const settings = vaultData?.settings || ({} as Partial<VaultSettings>);

  const [workspaceName, setWorkspaceName] = useState(settings.workspaceName || 'My Workspace');
  const [subtitle, setSubtitle] = useState(settings.subtitle || 'Personal Vault');
  const [fontSize, setFontSize] = useState<VaultSettings['fontSize']>(settings.fontSize || 'Default');
  const [uiDensity, setUiDensity] = useState<VaultSettings['uiDensity']>(settings.uiDensity || 'Comfortable');
  const [autoLockTimer, setAutoLockTimer] = useState<VaultSettings['autoLockTimer']>(settings.autoLockTimer || '5 min');
  const [currency, setCurrency] = useState<VaultSettings['currency']>(settings.currency || 'USD');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    setWorkspaceName(settings.workspaceName || 'My Workspace');
    setSubtitle(settings.subtitle || 'Personal Vault');
    setFontSize(settings.fontSize || 'Default');
    setUiDensity(settings.uiDensity || 'Comfortable');
    setAutoLockTimer(settings.autoLockTimer || '5 min');
    setCurrency(settings.currency || 'USD');
  }, [vaultData?.settings]);

  const handleUpdate = async (updates: Partial<VaultSettings>) => {
    const newSettings = {
      workspaceName,
      subtitle,
      fontSize,
      uiDensity,
      autoLockTimer,
      currency,
      ...settings,
      ...updates
    };

    await updateVaultData({
      settings: newSettings
    });

    try {
      // Sync unencrypted config for the lock screen
      await saveAppConfig({
        workspaceName: newSettings.workspaceName,
        subtitle: newSettings.subtitle,
        avatarBase64: newSettings.avatarBase64
      });
    } catch (error) {
      console.error('Failed to sync app config:', error);
    }
  };

  const handleEraseVault = async () => {
    if (confirm('Are you sure you want to permanently erase this vault? This action cannot be undone.')) {
      await deleteVault();
      window.location.reload();
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    try {
      await changePassword(newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(false);
      }, 1500);
    } catch (e) {
      setPasswordError('Failed to change password.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 h-full bg-white dark:bg-[#121214] flex flex-col overflow-y-auto">
      <div className="mb-10 shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
          <SettingsIcon className="text-accent w-6 h-6" strokeWidth={1.5} />
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Configure your workspace, security, and preferences.</p>
      </div>

      <div className="space-y-8 pb-12">
        {/* Workspace & Profile */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            <User className="w-4 h-4 text-gray-400" strokeWidth={2} />
            Workspace & Profile
          </div>
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 overflow-hidden shadow-sm">
                {settings.avatarBase64 ? (
                  <img src={settings.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={28} strokeWidth={1.5} />
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
                  className="cursor-pointer text-sm font-medium text-accent hover:text-blue-700 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Picture
                </label>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">PNG, JPG up to 2MB. Updates your avatar.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  onBlur={() => handleUpdate({ workspaceName })}
                  className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  onBlur={() => handleUpdate({ subtitle })}
                  className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent"
                />
              </div>
            </div>
          </div>
        </section>

        
{/* Appearance & Preferences */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            <Palette className="w-4 h-4 text-gray-400" strokeWidth={2} />
            Appearance & Preferences
          </div>
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Application Theme</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Choose between Light or Dark mode.</p>
              </div>
              <select
                value={vaultData?.settings?.theme || 'light'}
                onChange={(e) => {
                  handleUpdate({ theme: e.target.value as VaultSettings['theme'] });
                }}
                className="bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent w-32"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
            
            <hr className="border-gray-100 dark:border-white/5" />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Base Font Size</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Adjust the global text size for readability.</p>
              </div>
              <select
                value={fontSize}
                onChange={(e) => {
                  setFontSize(e.target.value as VaultSettings['fontSize']);
                  handleUpdate({ fontSize: e.target.value as VaultSettings['fontSize'] });
                }}
                className="bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent w-32"
              >
                <option value="Small">Small</option>
                <option value="Default">Default</option>
                <option value="Large">Large</option>
              </select>
            </div>
            
            <hr className="border-gray-100" />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">UI Density</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Choose between Comfortable or Compact padding.</p>
              </div>
              <select
                value={uiDensity}
                onChange={(e) => {
                  setUiDensity(e.target.value as VaultSettings['uiDensity']);
                  handleUpdate({ uiDensity: e.target.value as VaultSettings['uiDensity'] });
                }}
                className="bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent w-32"
              >
                <option value="Comfortable">Comfortable</option>
                <option value="Compact">Compact</option>
              </select>
            </div>

            <hr className="border-gray-100" />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Default Currency</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Select the currency for the financial ledger.</p>
              </div>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as VaultSettings['currency']);
                  handleUpdate({ currency: e.target.value as VaultSettings['currency'] });
                }}
                className="bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent w-32"
              >
                <option value="USD">USD ($)</option>
                <option value="PHP">PHP (₱)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>


          </div>
        </section>

        
{/* Security */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            <Shield className="w-4 h-4 text-gray-400" strokeWidth={2} />
            Security
          </div>
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Auto-Lock Timer</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Automatically lock the vault after a period of inactivity.</p>
              </div>
              <select
                value={autoLockTimer}
                onChange={(e) => {
                  setAutoLockTimer(e.target.value as VaultSettings['autoLockTimer']);
                  handleUpdate({ autoLockTimer: e.target.value as VaultSettings['autoLockTimer'] });
                }}
                className="bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent w-32"
              >
                <option value="1 min">1 min</option>
                <option value="5 min">5 min</option>
                <option value="15 min">15 min</option>
                <option value="Never">Never</option>
              </select>
            </div>
            
            <hr className="border-gray-100" />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Master Password</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Update the password used to decrypt your vault.</p>
              </div>
              <motion.button
                onClick={() => setIsPasswordModalOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="px-4 py-2 border border-zinc-200 hover:border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-zinc-900/50 hover:bg-white dark:bg-[#121214] text-gray-700 dark:text-zinc-300 text-sm font-medium rounded-md transition-colors flex items-center gap-2 shadow-sm"
              >
                <KeyRound className="w-4 h-4" />
                Change Password
              </motion.button>
            </div>
          </div>
        </section>

        {/* App Info */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            <Info className="w-4 h-4 text-gray-400" strokeWidth={2} />
            App Info
          </div>
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Enclave</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Version 1.1.0 • Local-First Architecture</p>
          </div>
        </section>

        {/* Data & Backup */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            <Database className="w-4 h-4 text-gray-400" strokeWidth={2} />
            Data & Backup
          </div>
          <div className="bg-white dark:bg-[#121214] border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Backup & Restore</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Download a highly encrypted `.vault` archive, or restore an existing backup to replace your current vault.</p>
              <div className="mt-2 flex items-center gap-3">
                <motion.button
                  onClick={exportVaultData}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2.5 bg-gradient-to-b from-[#008EFF] to-[#007acc] text-white text-sm font-medium rounded-md transition-all hover:shadow-md flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Backup
                </motion.button>
                
                <input 
                  type="file" 
                  accept=".vault,application/json" 
                  className="hidden" 
                  id="vault-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (confirm("WARNING: Importing a vault backup will overwrite all current data. Are you sure you want to proceed?")) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const json = JSON.parse(event.target?.result as string);
                            if (json.salt && json.iv && json.ciphertext) {
                              const { importVault } = await import('../lib/vault');
                              await importVault(json);
                              alert("Backup successfully restored! The app will now reload.");
                              window.location.reload();
                            } else {
                              alert("Invalid vault backup file.");
                            }
                          } catch(err) {
                            alert("Failed to parse backup file.");
                          }
                        };
                        reader.readAsText(file);
                      }
                      e.target.value = '';
                    }
                  }}
                />
                <label 
                  htmlFor="vault-upload"
                  className="cursor-pointer px-4 py-2.5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 hover:border-accent hover:text-accent text-gray-700 dark:text-zinc-300 text-sm font-medium rounded-md transition-all flex items-center gap-2 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import Backup
                </label>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                Danger Zone
              </h4>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Permanently erase the vault file from this device. You will lose access to all your data unless you have an exported backup.</p>
              <div className="mt-2">
                <motion.button
                  onClick={handleEraseVault}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2.5 bg-white dark:bg-[#121214] border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 text-sm font-medium rounded-md transition-colors flex items-center gap-2 shadow-sm inline-flex"
                >
                  <Trash2 className="w-4 h-4" />
                  Erase Vault & Reset App
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121214] rounded-2xl shadow-xl p-8 max-w-md w-full border border-zinc-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Change Master Password</h2>
                <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-zinc-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {passwordSuccess ? (
                <div className="py-6 flex flex-col items-center text-green-600">
                  <CheckCircle2 className="w-12 h-12 mb-2" />
                  <p className="font-medium">Password updated successfully!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-zinc-200 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:bg-white dark:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all focus:border-accent"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-red-500 text-sm">{passwordError}</p>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button 
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="px-4 py-2 border border-zinc-200 text-gray-700 dark:text-zinc-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-zinc-900 dark:bg-zinc-900/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleChangePassword}
                      className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
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
  );
};
