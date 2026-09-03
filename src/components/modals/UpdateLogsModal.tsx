import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../../context/VaultContext';
import { getVersion } from '@tauri-apps/api/app';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const UpdateLogsModal: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);
  const [markdownLogs, setMarkdownLogs] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
            // Check GitHub API for release notes. Try with 'v' prefix first (e.g., v1.1.8)
            let res = await fetch(`https://api.github.com/repos/ThePhrinceOfNothing/Cryptex/releases/tags/v${version}`);
            
            // If the specific tag isn't found, try without 'v'
            if (!res.ok) {
              res = await fetch(`https://api.github.com/repos/ThePhrinceOfNothing/Cryptex/releases/tags/${version}`);
            }
            
            // If still not found, try getting the absolute latest release as a fallback
            if (!res.ok) {
              res = await fetch(`https://api.github.com/repos/ThePhrinceOfNothing/Cryptex/releases/latest`);
            }

            if (res.ok) {
              const data = await res.json();
              setMarkdownLogs(data.body);
            } else {
              setMarkdownLogs(`## Welcome to Cryptex v${version}!\n\nRelease notes are not yet available on GitHub for this version. Please check back later or visit the repository directly.`);
            }
          } catch (err) {
            setMarkdownLogs(`## Welcome to Cryptex v${version}!\n\nFailed to fetch release notes from GitHub. Please check your internet connection.`);
          } finally {
            setIsLoadingLogs(false);
          }
        }
      } catch (error) {
        console.error("Failed to get app version:", error);
      }
    };
    
    checkVersion();
  }, [vaultData?.settings?.lastSeenVersion]);

  const handleScroll = () => {
    if (!scrollContainerRef.current || hasScrolledToBottom) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Allow a small 10px threshold to account for rounding errors in scroll calculations
    if (scrollTop + clientHeight >= scrollHeight - 10) {
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-[#262626] bg-gray-50/50 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-accent" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Update Successful!</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Welcome to Cryptex v{currentVersion}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 custom-scrollbar"
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {isLoadingLogs ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
                  </div>
                ) : (
                  <ReactMarkdown>{markdownLogs || ''}</ReactMarkdown>
                )}
                
                {/* Extra spacing to ensure scrolling is required */}
                <div className="h-12 border-t border-dashed border-gray-200 dark:border-[#262626] mt-8 pt-8 flex items-center justify-center text-sm text-gray-400 dark:text-zinc-600 font-medium">
                  End of Release Notes
                </div>
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 dark:border-[#262626] bg-white dark:bg-[#0c0c0e] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1.5">
                {!hasScrolledToBottom && (
                  <motion.div
                    animate={{ y: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ChevronDown size={14} className="text-accent" />
                  </motion.div>
                )}
                'Welcome to the new update.'
              </div>
              <button
                onClick={handleClose}
                disabled={!hasScrolledToBottom}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  hasScrolledToBottom 
                    ? 'bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
                }`}
              >
                Continue to Cryptex
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};



