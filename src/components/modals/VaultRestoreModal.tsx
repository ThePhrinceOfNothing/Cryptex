import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Clock
} from 'lucide-react';
import {
  listVaultSnapshots,
  restoreVaultSnapshot
} from '../../lib/vault';
import type { VaultSnapshotInfo } from '../../lib/vault';

interface VaultRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export const VaultRestoreModal: React.FC<VaultRestoreModalProps> = ({
  isOpen,
  onClose,
  onRestored,
}) => {
  const [snapshots, setSnapshots] = useState<VaultSnapshotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<VaultSnapshotInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await listVaultSnapshots();
      setSnapshots(list);
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to list local snapshots');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
      setSelectedSnapshot(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleRestore = async (snapshot: VaultSnapshotInfo) => {
    setIsRestoring(true);
    setErrorMessage(null);
    try {
      await restoreVaultSnapshot(snapshot.filename);
      setSuccessMessage(`Vault successfully restored to snapshot from ${formatDate(snapshot.timestamp)}`);
      setTimeout(() => {
        onRestored();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to restore snapshot');
      setIsRestoring(false);
    }
  };

  const formatDate = (timestampSec: number) => {
    if (!timestampSec) return 'Unknown Date';
    const date = new Date(timestampSec * 1000);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'pre-update':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Pre-Update
          </span>
        );
      case 'pre-restore':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Pre-Restore
          </span>
        );
      case 'pre-erase':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Pre-Erase
          </span>
        );
      case 'manual':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Manual
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            Auto Snapshot
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#18181b]/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <History size={18} strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">
                  Local Vault Restore Points
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  Automated encrypted snapshots stored on this computer
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchSnapshots}
                disabled={isLoading}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                title="Refresh list"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} strokeWidth={1.75} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Close"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Content / Snapshots List */}
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
                <RefreshCw size={24} className="animate-spin mb-2" strokeWidth={1.75} />
                <span className="text-xs">Loading local snapshots...</span>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center">
                <HardDrive size={32} className="text-zinc-500 mb-2.5 opacity-60" strokeWidth={1.5} />
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-zinc-300">
                  No local snapshots yet
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                  Snapshots are automatically created each time you save credentials, update the application, or modify your vault.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 px-1 mb-1">
                  <span>SNAPSHOT DATE & TYPE</span>
                  <span>SIZE & ACTION</span>
                </div>
                {snapshots.map((snap) => {
                  const isSelected = selectedSnapshot?.filename === snap.filename;
                  return (
                    <div
                      key={snap.filename}
                      className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500/60 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs'
                          : 'border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#161618] hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                          <Clock size={15} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                              {formatDate(snap.timestamp)}
                            </span>
                            {getReasonBadge(snap.reason)}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                            {snap.filename}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {formatSize(snap.sizeBytes)}
                        </span>
                        <button
                          onClick={() => setSelectedSnapshot(snap)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-medium rounded-md transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <RotateCcw size={12} strokeWidth={2} />
                          <span>Restore</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirmation Box (when a snapshot is selected for restore) */}
          {selectedSnapshot && (
            <div className="px-6 py-4 bg-amber-500/5 dark:bg-amber-500/10 border-t border-amber-500/20 shrink-0">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-gray-900 dark:text-zinc-100">
                    Confirm Vault Restoration
                  </p>
                  <p className="text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    This will roll your vault back to the snapshot from <span className="font-semibold text-gray-800 dark:text-zinc-200">{formatDate(selectedSnapshot.timestamp)}</span>. A safety snapshot of your current vault will be saved before restoring.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(selectedSnapshot)}
                      disabled={isRestoring}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Restoring...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} />
                          <span>Confirm & Restore</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedSnapshot(null)}
                      disabled={isRestoring}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="px-6 py-3 bg-gray-50/50 dark:bg-[#18181b]/50 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>All snapshots are AES-256-GCM zero-knowledge encrypted.</span>
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
