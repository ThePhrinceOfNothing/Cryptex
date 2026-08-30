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
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#121214] rounded-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <div className="mb-4">
          <Icon size={48} strokeWidth={1.2} className="text-gray-300" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-500 max-w-sm mb-8 leading-relaxed">
          {subtitle}
        </p>

        {actionLabel && onAction && (
          <motion.button
            onClick={onAction}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative flex items-center justify-center px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-md shadow-sm transition-colors group"
          >
            {/* Pulsing glow behind the button */}
            <span className="absolute inset-0 rounded-md bg-accent opacity-40 blur-md animate-pulse"></span>
            
            {/* Actual button surface */}
            <span className="relative z-10 flex items-center gap-2">
              {actionLabel}
            </span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};
