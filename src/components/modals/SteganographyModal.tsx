import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Lock, Unlock, Download, Upload, Copy, Check } from 'lucide-react';
import { embedSecretInImage, extractSecretFromImage } from '../../lib/steganography';
import { useToast } from '../../context/ToastContext';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

interface SteganographyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SteganographyModal: React.FC<SteganographyModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');
  
  // Encode state
  const [encodeFile, setEncodeFile] = useState<File | null>(null);
  const [encodePreview, setEncodePreview] = useState<string | null>(null);
  const [secretText, setSecretText] = useState('');
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodedBlobUrl, setEncodedBlobUrl] = useState<string | null>(null);

  // Decode state
  const [decodeFile, setDecodeFile] = useState<File | null>(null);
  const [decodePreview, setDecodePreview] = useState<string | null>(null);
  const [extractedSecret, setExtractedSecret] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [copied, setCopied] = useState(false);

  const encodeInputRef = useRef<HTMLInputElement>(null);
  const decodeInputRef = useRef<HTMLInputElement>(null);

  const handleSelectEncodeFile = (file: File) => {
    setEncodeFile(file);
    setEncodedBlobUrl(null);
    const url = URL.createObjectURL(file);
    setEncodePreview(url);
  };

  const handleSelectDecodeFile = (file: File) => {
    setDecodeFile(file);
    setExtractedSecret(null);
    const url = URL.createObjectURL(file);
    setDecodePreview(url);
  };

  const handleEmbed = async () => {
    if (!encodeFile || !secretText.trim()) return;
    setIsEncoding(true);
    try {
      const blob = await embedSecretInImage(encodeFile, secretText.trim());
      const url = URL.createObjectURL(blob);
      setEncodedBlobUrl(url);
      showToast('Secret embedded successfully into carrier image!', { type: 'success' });
    } catch (err: any) {
      showToast(err.message || 'Failed to embed secret in image.', { type: 'error' });
    } finally {
      setIsEncoding(false);
    }
  };

  const handleExtract = async () => {
    if (!decodeFile) return;
    setIsDecoding(true);
    try {
      const secret = await extractSecretFromImage(decodeFile);
      setExtractedSecret(secret);
      showToast('Hidden secret extracted successfully!', { type: 'success' });
    } catch (err: any) {
      showToast(err.message || 'No hidden secret found in image.', { type: 'error' });
    } finally {
      setIsDecoding(false);
    }
  };

  const handleCopySecret = async () => {
    if (!extractedSecret) return;
    await writeText(extractedSecret);
    setCopied(true);
    showToast('Secret copied to clipboard!', { type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#18181b]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                <ImageIcon size={16} strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">Steganography Studio</h2>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">Hide & reveal encrypted messages inside standard PNG photos</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex border-b border-gray-100 dark:border-white/5 px-6 pt-2 bg-gray-50/30 dark:bg-[#18181b]/30">
            <button
              onClick={() => setActiveTab('encode')}
              className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'encode'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              <Lock size={13} strokeWidth={1.75} />
              <span>Hide Secret</span>
            </button>
            <button
              onClick={() => setActiveTab('decode')}
              className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'decode'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              <Unlock size={13} strokeWidth={1.75} />
              <span>Reveal Secret</span>
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4">
            {activeTab === 'encode' ? (
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/png"
                  ref={encodeInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectEncodeFile(f);
                  }}
                />

                {!encodeFile ? (
                  <button
                    onClick={() => encodeInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer group"
                  >
                    <Upload size={22} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                    <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">Choose a Carrier PNG Image</p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500">The secret text will be invisibly woven into its pixels</p>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#18181b]/50">
                    {encodePreview && <img src={encodePreview} alt="Carrier" className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-zinc-700 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">{encodeFile.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500">{Math.round(encodeFile.size / 1024)} KB</p>
                    </div>
                    <button onClick={() => setEncodeFile(null)} className="text-xs text-rose-500 hover:text-rose-600 px-2 py-1">Change</button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Secret Note or Password</label>
                  <textarea
                    value={secretText}
                    onChange={(e) => setSecretText(e.target.value)}
                    placeholder="Enter confidential password, recovery phrase, or memo..."
                    className="w-full h-24 bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg p-3 text-xs sm:text-sm text-gray-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors resize-none"
                  />
                </div>

                {encodedBlobUrl ? (
                  <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Image Steganography Ready!</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-500">Download and keep this PNG safely.</p>
                    </div>
                    <a
                      href={encodedBlobUrl}
                      download="tectoryx-stego-payload.png"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download size={13} strokeWidth={2} />
                      <span>Download PNG</span>
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={handleEmbed}
                    disabled={!encodeFile || !secretText.trim() || isEncoding}
                    className="w-full py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-medium rounded-lg transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isEncoding ? 'Embedding secret...' : 'Invisibly Embed into Image'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/png"
                  ref={decodeInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectDecodeFile(f);
                  }}
                />

                {!decodeFile ? (
                  <button
                    onClick={() => decodeInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer group"
                  >
                    <Upload size={22} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                    <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">Select an Encrypted Stego PNG</p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500">Tectoryx will scan the least significant bits for hidden secrets</p>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#18181b]/50">
                    {decodePreview && <img src={decodePreview} alt="Target" className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-zinc-700 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">{decodeFile.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500">{Math.round(decodeFile.size / 1024)} KB</p>
                    </div>
                    <button onClick={() => setDecodeFile(null)} className="text-xs text-rose-500 hover:text-rose-600 px-2 py-1">Change</button>
                  </div>
                )}

                {extractedSecret ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Decrypted Secret Payload</span>
                      <button onClick={handleCopySecret} className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1">
                        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg text-xs font-mono text-gray-900 dark:text-zinc-100 break-all select-all leading-relaxed max-h-36 overflow-y-auto">
                      {extractedSecret}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleExtract}
                    disabled={!decodeFile || isDecoding}
                    className="w-full py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-medium rounded-lg transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isDecoding ? 'Extracting hidden bits...' : 'Extract Hidden Secret'}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
