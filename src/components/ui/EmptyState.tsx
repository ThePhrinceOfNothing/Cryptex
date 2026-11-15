import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, subtitle, actionLabel, onAction }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center max-w-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/60 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-3.5 shadow-2xs">
          <Icon size={22} strokeWidth={1.75} />
        </div>
        
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-zinc-100 mb-1 text-balance tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-5 leading-relaxed">
          {subtitle}
        </p>

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-medium rounded-lg transition-colors shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <span>{actionLabel}</span>
          </button>
        )}
      </motion.div>
    </div>
  );
};
