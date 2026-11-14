import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  progressCountdown?: number; // for countdown bars like clipboard wiping
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, options?: { 
    type?: 'info' | 'success' | 'warning' | 'error'; 
    duration?: number;
    countdown?: number;
    action?: { label: string; onClick: () => void };
  }) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: { 
    type?: 'info' | 'success' | 'warning' | 'error'; 
    duration?: number;
    countdown?: number;
    action?: { label: string; onClick: () => void };
  }) => {
    const id = crypto.randomUUID();
    const duration = options?.duration ?? 4000;
    const newToast: Toast = {
      id,
      message,
      type: options?.type || 'info',
      duration,
      progressCountdown: options?.countdown,
      action: options?.action
    };

    setToasts(prev => [...prev.slice(-3), newToast]); // keep at most 4 active

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success';
            const isWarning = toast.type === 'warning';
            const isError = toast.type === 'error';

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto relative overflow-hidden bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-xl shadow-xl p-3.5 flex items-start gap-3"
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isSuccess ? 'text-emerald-500' :
                  isWarning ? 'text-amber-500' :
                  isError ? 'text-red-500' :
                  'text-blue-500'
                }`}>
                  {isSuccess ? <Check size={14} strokeWidth={2.5} /> :
                   isWarning ? <AlertCircle size={14} strokeWidth={2} /> :
                   isError ? <AlertCircle size={14} strokeWidth={2} /> :
                   <Info size={14} strokeWidth={2} />}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 leading-snug">
                    {toast.message}
                  </p>
                  {toast.action && (
                    <button
                      onClick={() => {
                        toast.action?.onClick();
                        dismissToast(toast.id);
                      }}
                      className="mt-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline active:opacity-80"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-0.5 rounded transition-colors"
                  aria-label="Close notification"
                >
                  <X size={13} />
                </button>

                {/* Optional Countdown Bar for auto-clearing clipboards */}
                {toast.progressCountdown && toast.duration && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                    className="absolute bottom-0 left-0 h-0.5 bg-blue-500"
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
