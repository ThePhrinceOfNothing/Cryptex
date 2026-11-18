import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Eye,
  EyeOff,
  Video,
  Image as ImageIcon,
  FileText,
  Upload,
  Download,
  Trash2,
  X,
  Play,
  Maximize2,
  HardDrive,
  RefreshCw,
  Plus,
  AlertTriangle,
  FolderLock
} from 'lucide-react';
import {
  checkGhostVaultExists,
  initGhostVault,
  unlockGhostVault,
  saveGhostVaultIndex,
  encryptAndStoreGhostFile,
  loadAndDecryptGhostFile,
  removeGhostFile,
  wipeEntireGhostVault
} from '../../lib/ghostVault';
import type {
  GhostFileMeta,
  GhostVaultIndexData
} from '../../lib/ghostVault';

interface GhostVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GhostVaultModal: React.FC<GhostVaultModalProps> = ({ isOpen, onClose }) => {
  // Vault state
  const [isChecking, setIsChecking] = useState(true);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [vaultIndex, setVaultIndex] = useState<GhostVaultIndexData | null>(null);

  // Form states
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'video' | 'image' | 'doc'>('all');

  // File processing state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Media playback lightbox state
  const [activeMediaFile, setActiveMediaFile] = useState<GhostFileMeta | null>(null);
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);
  const [isMediaLoading, setIsMediaLoading] = useState(false);

  // Wipe confirmation modal state
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Check initialization on open
  useEffect(() => {
    if (isOpen) {
      setIsChecking(true);
      setError(null);
      setPassphrase('');
      setConfirmPassphrase('');
      checkGhostVaultExists()
        .then((exists) => {
          setIsInitialized(exists);
          setIsChecking(false);
          setTimeout(() => passwordInputRef.current?.focus(), 150);
        })
        .catch((err) => {
          console.error('Failed to check ghost vault state:', err);
          setIsChecking(false);
        });
    } else {
      handleLock();
    }
  }, [isOpen]);

  // Global Panic / Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (activeMediaUrl) {
          closeMediaPlayer();
        } else {
          handleLock();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeMediaUrl]);

  // Clean lock and wipe memory
  const handleLock = () => {
    if (activeMediaUrl) {
      URL.revokeObjectURL(activeMediaUrl);
    }
    setActiveMediaUrl(null);
    setActiveMediaFile(null);
    setCryptoKey(null);
    setVaultIndex(null);
    setIsUnlocked(false);
    setPassphrase('');
    setConfirmPassphrase('');
    setError(null);
  };

  const closeMediaPlayer = () => {
    if (activeMediaUrl) {
      URL.revokeObjectURL(activeMediaUrl);
    }
    setActiveMediaUrl(null);
    setActiveMediaFile(null);
  };

  // Handle initialization
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 6) {
      setError('Passphrase must be at least 6 characters long.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { key, index } = await initGhostVault(passphrase, 'bazooka');
      setCryptoKey(key);
      setVaultIndex(index);
      setIsInitialized(true);
      setIsUnlocked(true);
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize covert vault.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passphrase) return;

    setIsLoading(true);
    try {
      const { key, index } = await unlockGhostVault(passphrase);
      setCryptoKey(key);
      setVaultIndex(index);
      setIsUnlocked(true);
      setPassphrase('');
    } catch (err: any) {
      setError('Decryption failed. Incorrect covert passphrase.');
    } finally {
      setIsLoading(false);
    }
  };

  // Import files
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !cryptoKey || !vaultIndex) return;

    setIsUploading(true);
    try {
      const newFilesList = [...vaultIndex.files];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Encrypting ${file.name} (${i + 1}/${files.length})...`);
        const meta = await encryptAndStoreGhostFile(cryptoKey, file, (ratio) => {
          setUploadStatus(`Encrypting ${file.name} (${Math.round(ratio * 100)}%)...`);
        });
        newFilesList.unshift(meta);
      }

      const updatedIndex: GhostVaultIndexData = {
        ...vaultIndex,
        files: newFilesList
      };

      await saveGhostVaultIndex(cryptoKey, updatedIndex);
      setVaultIndex(updatedIndex);
    } catch (err: any) {
      setError(err?.message || 'Failed to encrypt and store file.');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open / Play media file
  const handlePlayMedia = async (fileMeta: GhostFileMeta) => {
    if (!cryptoKey) return;
    setIsMediaLoading(true);
    try {
      closeMediaPlayer();
      const blob = await loadAndDecryptGhostFile(cryptoKey, fileMeta);
      const url = URL.createObjectURL(blob);
      setActiveMediaFile(fileMeta);
      setActiveMediaUrl(url);
    } catch (err: any) {
      setError('Failed to decrypt and stream media file.');
    } finally {
      setIsMediaLoading(false);
    }
  };

  // Download / Export decrypted file
  const handleDownloadFile = async (fileMeta: GhostFileMeta) => {
    if (!cryptoKey) return;
    try {
      const blob = await loadAndDecryptGhostFile(cryptoKey, fileMeta);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMeta.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to export decrypted file.');
    }
  };

  // Delete file
  const handleDeleteFile = async (id: string) => {
    if (!cryptoKey || !vaultIndex) return;
    try {
      await removeGhostFile(id);
      const updatedFiles = vaultIndex.files.filter(f => f.id !== id);
      const updatedIndex: GhostVaultIndexData = {
        ...vaultIndex,
        files: updatedFiles
      };
      await saveGhostVaultIndex(cryptoKey, updatedIndex);
      setVaultIndex(updatedIndex);
      if (activeMediaFile?.id === id) {
        closeMediaPlayer();
      }
    } catch (err: any) {
      setError('Failed to delete file.');
    }
  };

  // Wipe entire compartment
  const handleWipe = async () => {
    try {
      await wipeEntireGhostVault();
      handleLock();
      setIsInitialized(false);
      setIsWipeConfirmOpen(false);
      onClose();
    } catch (err: any) {
      setError('Failed to wipe covert vault.');
    }
  };

  // Auto-capture thumbnail for media that was uploaded before thumbnail support
  const handleAutoCaptureVideoThumbnail = async (videoEl: HTMLVideoElement) => {
    if (!activeMediaFile || activeMediaFile.thumbnail || !cryptoKey || !vaultIndex) return;
    try {
      const maxDim = 320;
      let w = videoEl.videoWidth || 320;
      let h = videoEl.videoHeight || 180;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoEl, 0, 0, w, h);
      const thumb = canvas.toDataURL('image/jpeg', 0.65);
      const duration = videoEl.duration || activeMediaFile.duration;

      const fileId = activeMediaFile.id;
      const updatedFiles = vaultIndex.files.map((f) =>
        f.id === fileId ? { ...f, thumbnail: thumb, duration } : f
      );
      const updatedIndex: GhostVaultIndexData = {
        ...vaultIndex,
        files: updatedFiles
      };
      await saveGhostVaultIndex(cryptoKey, updatedIndex);
      setVaultIndex(updatedIndex);
      setActiveMediaFile({ ...activeMediaFile, thumbnail: thumb, duration });
    } catch (err) {
      console.warn('Auto capture video thumbnail failed:', err);
    }
  };

  const handleAutoCaptureImageThumbnail = async (imgEl: HTMLImageElement) => {
    if (!activeMediaFile || activeMediaFile.thumbnail || !cryptoKey || !vaultIndex) return;
    try {
      const maxDim = 320;
      let w = imgEl.naturalWidth || 320;
      let h = imgEl.naturalHeight || 180;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(imgEl, 0, 0, w, h);
      const thumb = canvas.toDataURL('image/jpeg', 0.65);

      const fileId = activeMediaFile.id;
      const updatedFiles = vaultIndex.files.map((f) =>
        f.id === fileId ? { ...f, thumbnail: thumb } : f
      );
      const updatedIndex: GhostVaultIndexData = {
        ...vaultIndex,
        files: updatedFiles
      };
      await saveGhostVaultIndex(cryptoKey, updatedIndex);
      setVaultIndex(updatedIndex);
      setActiveMediaFile({ ...activeMediaFile, thumbnail: thumb });
    } catch (err) {
      console.warn('Auto capture image thumbnail failed:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filteredFiles = (vaultIndex?.files || []).filter(f => {
    if (activeFilter === 'video') return f.mimeType.startsWith('video/');
    if (activeFilter === 'image') return f.mimeType.startsWith('image/');
    if (activeFilter === 'doc') return !f.mimeType.startsWith('video/') && !f.mimeType.startsWith('image/');
    return true;
  });

  const totalBytes = (vaultIndex?.files || []).reduce((acc, f) => acc + f.size, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] text-zinc-100"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-[#121215] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800/90 text-zinc-300 flex items-center justify-center border border-zinc-700/60 shadow-xs">
                <FolderLock size={16} strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight text-white">Covert File Vault</h2>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Zero-trace AES-256-GCM binary compartment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isUnlocked && (
                <button
                  onClick={handleLock}
                  className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-colors flex items-center gap-1.5"
                  title="Lock Compartment"
                >
                  <Lock size={12} strokeWidth={1.75} />
                  <span>Lock (Esc)</span>
                </button>
              )}
              <button
                onClick={() => {
                  handleLock();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Close"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {isChecking ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                <RefreshCw size={24} className="animate-spin mb-2" />
                <span className="text-xs">Accessing covert storage...</span>
              </div>
            ) : !isUnlocked ? (
              /* UNLOCK / SETUP SCREEN */
              <div className="max-w-md w-full mx-auto py-12 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 shadow-inner">
                  {isInitialized ? <Lock size={22} className="text-zinc-400" /> : <Plus size={22} className="text-zinc-400" />}
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight mb-1">
                  {isInitialized ? 'Unlock Covert Vault' : 'Initialize Covert Vault'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
                  {isInitialized
                    ? 'Enter your secondary secret passphrase to decrypt and view hidden files.'
                    : 'This compartment is cryptographically isolated from your main vault. Create a dedicated passphrase to encrypt your secret media and files.'}
                </p>

                <form onSubmit={isInitialized ? handleUnlock : handleSetup} className="w-full space-y-3">
                  <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-zinc-500 transition-colors">
                    <input
                      ref={passwordInputRef}
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={isInitialized ? 'Enter covert passphrase' : 'Create covert passphrase (min 6 chars)'}
                      className="w-full bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassphrase ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {!isInitialized && (
                    <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-zinc-500 transition-colors">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={confirmPassphrase}
                        onChange={(e) => setConfirmPassphrase(e.target.value)}
                        placeholder="Confirm covert passphrase"
                        className="w-full bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !passphrase}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-40"
                  >
                    {isLoading
                      ? (isInitialized ? 'Decrypting...' : 'Initializing...')
                      : (isInitialized ? 'Unlock Compartment' : 'Create & Encrypt Compartment')}
                  </button>
                </form>
              </div>
            ) : (
              /* UNLOCKED VAULT FILE BROWSER */
              <div className="flex-1 flex flex-col space-y-4">
                {/* Action Bar & Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs w-fit">
                    {(['all', 'video', 'image', 'doc'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                          activeFilter === filter
                            ? 'bg-zinc-800 text-white shadow-2xs'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {filter === 'doc' ? 'Documents' : filter}
                      </button>
                    ))}
                  </div>

                  {/* Upload and Storage summary */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-zinc-500">
                      {vaultIndex?.files.length || 0} items &middot; {formatSize(totalBytes)}
                    </span>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98] disabled:opacity-50"
                    >
                      <Upload size={13} strokeWidth={2} />
                      <span>{isUploading ? 'Encrypting...' : 'Add Videos / Files'}</span>
                    </button>
                  </div>
                </div>

                {isUploading && (
                  <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-xs text-blue-300 flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{uploadStatus || 'Encrypting file with AES-256-GCM...'}</span>
                  </div>
                )}

                {/* Files Grid / Empty State */}
                {filteredFiles.length === 0 ? (
                  <div className="flex-1 py-16 flex flex-col items-center justify-center text-center text-zinc-500">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                      <Video size={20} className="text-zinc-600" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-zinc-300">No secret files added yet</p>
                    <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                      Click "Add Videos / Files" to import confidential media. Files are encrypted with your secret passphrase and streamed directly in memory.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {filteredFiles.map((file) => {
                      const isVideo = file.mimeType.startsWith('video/');
                      const isImage = file.mimeType.startsWith('image/');
                      return (
                        <div
                          key={file.id}
                          className="group relative bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-black/40"
                        >
                          <div>
                            {/* Video / Image Thumbnail Preview */}
                            {(isVideo || isImage) && (
                              <div
                                onClick={() => handlePlayMedia(file)}
                                className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/60 border border-zinc-800/80 mb-2.5 cursor-pointer group/thumb flex items-center justify-center select-none"
                              >
                                {file.thumbnail ? (
                                  <img
                                    src={file.thumbnail}
                                    alt={file.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900/90 to-black text-zinc-600 gap-1.5">
                                    {isVideo ? (
                                      <Video size={24} strokeWidth={1.5} className="text-purple-400/70" />
                                    ) : (
                                      <ImageIcon size={24} strokeWidth={1.5} className="text-blue-400/70" />
                                    )}
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      {isVideo ? 'Click to play' : 'Click to view'}
                                    </span>
                                  </div>
                                )}

                                {/* Hover Play Overlay */}
                                <div className="absolute inset-0 bg-black/30 opacity-70 group-hover/thumb:opacity-100 group-hover/thumb:bg-black/20 flex items-center justify-center transition-all">
                                  <div className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-lg group-hover/thumb:scale-110 group-hover/thumb:bg-blue-600 group-hover/thumb:border-blue-400 transition-all">
                                    <Play size={13} className="fill-current translate-x-0.5" />
                                  </div>
                                </div>

                                {/* Video Duration Badge */}
                                {isVideo && file.duration && (
                                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-black/85 backdrop-blur-xs text-zinc-200 border border-white/10 shadow-xs">
                                    {formatDuration(file.duration)}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* File Name & Metadata */}
                            <div className="flex items-start gap-2.5 min-w-0 mb-2.5">
                              {!isVideo && !isImage && (
                                <div className="w-9 h-9 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0 text-zinc-400 border border-zinc-700/50">
                                  <FileText size={16} strokeWidth={1.75} className="text-emerald-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-zinc-200 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                                  {formatSize(file.size)} &middot; {new Date(file.addedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs mt-1">
                            {(isVideo || isImage) ? (
                              <button
                                onClick={() => handlePlayMedia(file)}
                                disabled={isMediaLoading}
                                className="px-2.5 py-1 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 border border-zinc-700/40"
                              >
                                <Play size={11} className="fill-zinc-300" />
                                <span>{isVideo ? 'Play Video' : 'View Image'}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-mono">Encrypted Doc</span>
                            )}

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
                                title="Export Decrypted File"
                              >
                                <Download size={13} strokeWidth={1.75} />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
                                title="Delete from Compartment"
                              >
                                <Trash2 size={13} strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-[#101013] border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
            <span>Press <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono">Esc</kbd> anywhere to immediately lock and clear memory.</span>
            {isUnlocked && (
              <button
                onClick={() => setIsWipeConfirmOpen(true)}
                className="text-rose-500 hover:text-rose-400 transition-colors"
              >
                Wipe Compartment
              </button>
            )}
          </div>
        </motion.div>

        {/* IN-MEMORY MEDIA PLAYER LIGHTBOX OVERLAY */}
        {activeMediaUrl && activeMediaFile && (
          <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
            <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-zinc-300 border-b border-zinc-800/80 mb-4">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-purple-400" />
                <span className="text-xs font-semibold truncate max-w-md">{activeMediaFile.name}</span>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                  In-Memory Stream
                </span>
              </div>
              <button
                onClick={closeMediaPlayer}
                className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <X size={14} />
                <span>Close (Esc)</span>
              </button>
            </div>

            <div className="w-full max-w-4xl max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-black border border-zinc-800">
              {activeMediaFile.mimeType.startsWith('video/') ? (
                <video
                  src={activeMediaUrl}
                  controls
                  autoPlay
                  onLoadedData={(e) => handleAutoCaptureVideoThumbnail(e.currentTarget)}
                  onSeeked={(e) => handleAutoCaptureVideoThumbnail(e.currentTarget)}
                  className="w-full max-h-[75vh] object-contain rounded-xl focus:outline-none"
                />
              ) : (
                <img
                  src={activeMediaUrl}
                  alt={activeMediaFile.name}
                  onLoad={(e) => handleAutoCaptureImageThumbnail(e.currentTarget)}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl"
                />
              )}
            </div>

            <p className="text-[11px] text-zinc-500 mt-3 font-mono">
              Panic Key Active: Pressing Escape terminates playback and clears RAM immediately.
            </p>
          </div>
        )}

        {/* WIPE COMPARTMENT CONFIRMATION */}
        {isWipeConfirmOpen && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/80">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-2xl text-left">
              <div className="flex items-center gap-3 text-rose-500 mb-3">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold text-white">Permanently Wipe Covert Vault?</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                This will permanently delete all encrypted files, videos, and credentials stored in this covert compartment. This cannot be undone.
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsWipeConfirmOpen(false)}
                  className="px-3.5 py-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWipe}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Wipe Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
