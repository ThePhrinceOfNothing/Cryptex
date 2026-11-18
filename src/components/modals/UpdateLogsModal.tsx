import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../../context/VaultContext';
import { getVersion } from '@tauri-apps/api/app';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const LOCAL_RELEASE_NOTES: Record<string, string> = {
  '1.6.1': `### What's New in Tectoryx v1.6.1

#### Binary Streaming & Media Pipeline
- **Streaming Binary IPC:** 16 MB chunked streaming pipeline for binary assets, eliminating memory limits on large file uploads (250MB+ / 1GB+).
- **Fast Visual Indexing:** In-memory encrypted preview thumbnails and duration badges for rapid visual identification.
- **MIME Resolution:** Enhanced extension fallback for media containers.`,
  '1.6.0': `### What's New in Tectoryx v1.6.0

#### Performance & Storage Hardening
- **Binary Storage Engine:** Low-level file pipeline optimizations and secure binary chunking.
- **Memory Buffer Lifecycle:** Enhanced in-memory blob lifecycle management and automatic resource disposal.
- **System Stability:** Refined global event dispatching and window focus handling.`,
  '1.5.5': `### What's New in Tectoryx v1.5.5

#### ADHD Focus & Modular Workspace
- **Modular Sidebar Architecture:** Turn off tools you do not use (Tasks, Calendar, Income, Ambience, Steganography) from Settings to eliminate visual noise.
- **Direct Vault Landing:** The app now opens directly into **My Vault** (Passwords) on unlock by default instead of dumping you onto the busy dashboard.
- **Distraction-Free Quiet Defaults:** Virtual pet companion, speech bubbles, and XP trackers are disabled by default for an instantly calm and quiet environment.
- **Simplified Dashboard:** The dashboard now focuses cleanly on security score and quick actions, keeping gamification and mood logs out of the way unless opted into.`,
  '1.5.4': `### What's New in Tectoryx v1.5.4

#### Vault Preservation & Recovery
- **Multi-Tier Vault Preservation:** Complete protection against data loss caused by crashes, power outages, app updates, or accidental corruption.
- **Atomic File Writes & Fsync:** Saves are staged in temporary files with byte-level disk flush (\`sync_all\`) before atomic swap, preventing truncated or corrupted vault files.
- **Automatic Encrypted Rolling Snapshots:** Every time you save, an AES-256-GCM encrypted snapshot is saved to a local rolling backup history (up to 30 snapshots).
- **Pre-Update Snapshots:** The app automatically creates an immutable backup of your vault before applying any new application update.
- **Transparent Self-Healing:** If \`data.vault\` is ever damaged or missing, Tectoryx automatically recovers from \`data.vault.prev\` or the newest valid local snapshot.
- **Local Restore Points UI:** Added a snapshot browser to Settings, Onboarding, and the Lock Screen ("Trouble unlocking?"), enabling 1-click restore to any previous point in time.`,
  '1.5.3': `### What's New in Tectoryx v1.5.3

#### Bug Fixes & Stability
- **Fixed Lock Vault Modal Flash:** Eliminated the split-second flash of the update logs modal when locking the vault.
- **Strict Decoy Vault Isolation:** Enforced hard isolation for the Duress/Decoy vault mode. Decoy mode is strictly prohibited from mutating or saving to the physical \`data.vault\` file or modifying unencrypted profile metadata on disk.
- **Lock Screen Identity:** Restored clear workspace identity labeling on the lock screen under the Tectoryx emblem.`,
  '1.5.2': `### What's New in Tectoryx v1.5.2

#### Custom Native Title Bar
- Integrated frameless window with native borderless drop shadow.
- Custom minimize, maximize/restore, and close buttons matching Windows OS conventions.
- Native window dragging and double-click to maximize/restore.

#### Design Polish & De-Slop
- Cleaned up Lock Screen: removed all pseudo-hacker labels, dividing lines, and technical buzzwords.
- Unconstrained desktop panels across Calendar, Notes, My Vault, and Settings to make full use of widescreen displays.
- Removed redundant digital clock and cleaned up dashboard milestone badges.

#### System & Performance Hygiene
- Fixed Terminal Hacker Mode CRT persistence and race conditions.
- Prevented accidental F5/Ctrl+R browser reloads that dump decrypted vault RAM.
- Suppressed browser context menus and accidental file-drop navigation.
- Global UI text-selection prevention on desktop chrome.

#### Secret Agent & Focus Utilities
- Procedural audio ambience synth (Rain, Campfire, Clock tick, White noise).
- Steganography encoder/decoder for encrypted PNG payloads.
- Quick-Capture Scratchpad with direct note and task conversion.
- Note Constellation knowledge graph view.`,
};

export const UpdateLogsModal: React.FC = () => {
  const { isLocked, vaultData, updateVaultData } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [markdownLogs, setMarkdownLogs] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Do not check or open while vault is locked or data is not loaded
    if (isLocked || !vaultData || !vaultData.settings) {
      setIsOpen(false);
      return;
    }

    const checkVersion = async () => {
      try {
        const version = await getVersion();
        setCurrentVersion(version);
        
        const lastSeen = vaultData?.settings?.lastSeenVersion;
        
        // If they haven't seen this version's logs, show the modal
        if (lastSeen !== version) {
          setIsOpen(true);
          setIsLoadingLogs(true);
          
          try {
            if (LOCAL_RELEASE_NOTES[version]) {
              setMarkdownLogs(LOCAL_RELEASE_NOTES[version]);
            } else {
              // Check GitHub API for release notes
              let res = await fetch(`https://api.github.com/repos/ThePhrinceOfNothing/Cryptex/releases/tags/v${version}`);
              if (!res.ok) {
                res = await fetch(`https://api.github.com/repos/ThePhrinceOfNothing/Cryptex/releases/tags/${version}`);
              }
              if (!res.ok) {
                res = await fetch(`https://api.github.com/repos/ThePhrinceOfNothing/Cryptex/releases/latest`);
              }

              if (res.ok) {
                const data = await res.json();
                setMarkdownLogs(data.body || `### Tectoryx v${version}\n\nThis release includes security enhancements, bug fixes, and design refinements.`);
              } else {
                setMarkdownLogs(`### Tectoryx v${version}\n\nThis release includes security enhancements, bug fixes, and design refinements.`);
              }
            }
          } catch {
            setMarkdownLogs(LOCAL_RELEASE_NOTES[version] || `### Tectoryx v${version}\n\nThis release includes security enhancements, bug fixes, and design refinements.`);
          } finally {
            setIsLoadingLogs(false);
          }
        }
      } catch (error) {
        console.error("Failed to get app version:", error);
      }
    };
    
    checkVersion();
  }, [isLocked, vaultData?.settings?.lastSeenVersion]);

  // Check if content fits without scrolling
  useEffect(() => {
    if (!isOpen || isLoadingLogs) return;
    const checkFit = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollHeight <= clientHeight + 30) {
          setHasScrolledToBottom(true);
        }
      }
    };
    const t = setTimeout(checkFit, 100);
    return () => clearTimeout(t);
  }, [isOpen, isLoadingLogs, markdownLogs]);

  const handleScroll = () => {
    if (!scrollContainerRef.current || hasScrolledToBottom) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleClose = async () => {
    if (!hasScrolledToBottom || !currentVersion) return;
    
    try {
      await updateVaultData({
        settings: {
          ...(vaultData?.settings || {
            workspaceName: 'My Workspace',
            subtitle: 'Personal Vault',
            fontSize: 'Default',
            uiDensity: 'Comfortable',
            autoLockTimer: '5 min'
          }),
          lastSeenVersion: currentVersion
        }
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update last seen version:", error);
    }
  };

  if (isLocked || !vaultData || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#18181b]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">Update Installed</h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Welcome to Tectoryx v{currentVersion}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar"
            >
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-700 border-t-zinc-300" />
                  </div>
                ) : (
                  <ReactMarkdown>{markdownLogs || ''}</ReactMarkdown>
                )}
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="flex-shrink-0 px-6 py-3.5 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#18181b]/50 flex items-center justify-between gap-4">
              <div className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                {!hasScrolledToBottom ? (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <ChevronDown size={13} strokeWidth={1.75} className="animate-bounce" />
                    <span>Scroll to review notes</span>
                  </div>
                ) : (
                  <span className="tabular-nums font-mono text-[10px] uppercase tracking-wider text-zinc-500">v{currentVersion}</span>
                )}
              </div>
              <button
                onClick={handleClose}
                disabled={!hasScrolledToBottom}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-2xs active:scale-[0.98] ${
                  hasScrolledToBottom 
                    ? 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black cursor-pointer' 
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
                }`}
              >
                Continue to Workspace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
