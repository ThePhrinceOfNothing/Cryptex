import React, { useState, useRef, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { File, Upload, Trash2, Download, Search, Image as ImageIcon, FileText, FileArchive, Shield } from 'lucide-react';
import type { Attachment } from '../lib/vault';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from './EmptyState';

export const Attachments: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const attachments = vaultData?.attachments || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAttachments = useMemo(() => {
    let sorted = [...attachments].sort((a, b) => b.addedAt - a.addedAt);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sorted = sorted.filter(a => a.name.toLowerCase().includes(q));
    }
    return sorted;
  }, [attachments, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Warn if file is > 10MB to prevent bloating the vault too much
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. We recommend keeping attachments under 10MB to maintain optimal vault performance.");
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataBase64: reader.result as string,
        addedAt: Date.now()
      };
      await updateVaultData({ attachments: [...attachments, newAttachment] });
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const a = document.createElement('a');
    a.href = attachment.dataBase64;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this secure file?")) {
      const updated = attachments.filter(a => a.id !== id);
      await updateVaultData({ attachments: updated });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="text-blue-500 w-8 h-8" strokeWidth={1.5} />;
    if (type.includes('pdf')) return <FileText className="text-red-500 w-8 h-8" strokeWidth={1.5} />;
    if (type.includes('zip') || type.includes('tar') || type.includes('compressed')) return <FileArchive className="text-amber-500 w-8 h-8" strokeWidth={1.5} />;
    return <File className="text-gray-400 w-8 h-8" strokeWidth={1.5} />;
  };

  return (
    <div className="max-w-4xl mx-auto p-8 h-full bg-white dark:bg-[#121214] flex flex-col relative">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Shield className="text-accent w-6 h-6" />
            Secure Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Files are encrypted within your zero-knowledge vault.</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload} 
        />
        
        <motion.button
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? 'Encrypting...' : 'Upload File'}
        </motion.button>
      </div>

      <div className="mb-6 relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search encrypted files..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-md text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredAttachments.length === 0 ? (
          <div className="mt-20">
            <EmptyState 
              icon={Shield}
              title={searchQuery ? "No matching files" : "No secure documents yet"}
              subtitle="Upload IDs, tax documents, or sensitive images. They will be encrypted alongside your passwords."
              actionLabel="Upload Secure File"
              onAction={() => fileInputRef.current?.click()}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
            <AnimatePresence>
              {filteredAttachments.map(attachment => (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow group relative overflow-hidden"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-gray-100">
                      {getFileIcon(attachment.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate" title={attachment.name}>
                        {attachment.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                        {formatSize(attachment.size)} • {new Date(attachment.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => handleDownload(attachment)}
                      className="flex-1 bg-gray-50 dark:bg-zinc-900/50 hover:bg-accent/10 hover:text-accent border border-gray-200 dark:border-white/10 hover:border-accent/30 text-gray-700 dark:text-zinc-300 text-xs font-medium py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Decrypt & Save
                    </button>
                    <button 
                      onClick={() => handleDelete(attachment.id)}
                      className="w-10 bg-gray-50 dark:bg-zinc-900/50 hover:bg-red-50 text-gray-400 hover:text-red-600 border border-gray-200 dark:border-white/10 hover:border-red-200 rounded flex items-center justify-center transition-colors"
                      title="Delete Permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
