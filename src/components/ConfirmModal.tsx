import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2,  } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmTet?: string;
  cancelTet?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

eport const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmTet = 'Confirm',
  cancelTet = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fied inset-0 z-[99999] fle items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          eit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={`w-full ma-w-md bg-white dark:bg-[#121214] border rounded-2l shadow-2l fle fle-col overflow-hidden ${
            isDestructive ? 'border-red-500/30' : 'border-gray-200 dark:border-white/10'
          }`}
        >
          {/* Header */}
          <div className={`fle-shrink-0 p-6 py-5 border-b bg-gray-50/50 dark:bg-black/20 ${
            isDestructive ? 'border-red-500/20' : 'border-gray-100 dark:border-white/10'
          }`}>
            <div className="fle items-center gap-3">
              <div className={`w-10 h-10 rounded-full fle items-center justify-center ${
                isDestructive ? 'bg-red-500/10 tet-red-500' : 'bg-accent/10 tet-accent'
              }`}>
                {isDestructive ? <AlertTriangle className="w-5 h-5" strokeWidth={2} /> : <AlertTriangle className="w-5 h-5" strokeWidth={2} />}
              </div>
              <div>
                <h2 className="tet-l font-bold tet-gray-900 dark:tet-white">{title}</h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="tet-sm tet-gray-600 dark:tet-zinc-300 leading-relaed">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 py-4 bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-white/10 fle items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="p-4 py-2 tet-sm font-medium tet-gray-600 dark:tet-zinc-400 hover:tet-gray-900 dark:hover:tet-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              {cancelTet}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`p-4 py-2 tet-sm font-medium rounded-lg transition-colors fle items-center gap-2 ${
                isDestructive 
                  ? 'bg-red-500/10 tet-red-600 dark:tet-red-400 hover:bg-red-500 hover:tet-white border border-red-500/20 hover:border-red-500' 
                  : 'bg-accent tet-white hover:bg-accent/90 shadow-lg shadow-accent/20'
              }`}
            >
              {isDestructive && <Trash2 size={16} />}
              {confirmTet}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

