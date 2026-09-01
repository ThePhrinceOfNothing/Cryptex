import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutDashboard, Lock, StickyNote, CheckSquare, Calendar, DollarSign, ChevronLeft, ChevronRight, User, Settings as SettingsIcon, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../context/VaultContext';
import { GlobalSearch } from './GlobalSearch';
import ShinyText from './ShinyText';
import { UpdateLogsModal } from './UpdateLogsModal';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string, action?: 'create') => void;
  middlePane?: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, middlePane, activeTab, setActiveTab }) => {
  const [isMiddlePaneOpen, setIsMiddlePaneOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [farewellMessage, setFarewellMessage] = useState('');
  const { vaultData, lockVault, lockCountdown } = useVault();

  const farewellMessages = [
    "Goodbye",
    "See you later",
    "Stay secure",
    "Until next time",
    "Catch you on the flip side",
    "Signing off"
  ];

  const handleLockRequest = () => {
    setFarewellMessage(farewellMessages[Math.floor(Math.random() * farewellMessages.length)]);
    setIsLoggingOut(true);
    setTimeout(() => {
      lockVault();
    }, 2500);
  };

  const workspaceName = vaultData?.settings?.workspaceName || 'My Workspace';
  const subtitle = vaultData?.settings?.subtitle || 'Personal Vault';

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'My Vault', icon: Lock },
    { name: 'Notes', icon: StickyNote },
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Calendar', icon: Calendar },
    { name: 'Income', icon: DollarSign },
  ];

  return (
    <>
      <UpdateLogsModal />
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-white dark:bg-[#050507] flex items-center justify-center"
          >
            <ShinyText 
              text={farewellMessage} 
              speed={2} 
              className="text-4xl font-bold font-sans tracking-tight text-gray-900 dark:text-white" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <GlobalSearch onNavigate={setActiveTab} />
      {/* Auto-Lock Warning Banner */}
      <AnimatePresence>
        {lockCountdown !== null && lockCountdown > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            className="fixed top-1/2 left-1/2 z-[100] bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md text-gray-900 dark:text-zinc-100 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-2 border border-gray-200 dark:border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </div>
              <p className="text-sm font-medium">Vault locking in <span className="font-mono font-bold text-red-500 ml-1">{lockCountdown}s</span></p>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">Move mouse to abort</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-screen w-full bg-white dark:bg-[#0c0c0e] overflow-hidden text-sm">
        {/* LEFT PANE: Sidebar */}
        <aside className="w-64 bg-sidebar dark:bg-[#121214] border-r border-gray-200 dark:border-white/10 flex flex-col flex-shrink-0 z-20 relative">
          {/* Subtle mesh texture at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#008EFF]/10 to-transparent pointer-events-none z-0" />
          
          <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-white/10 shrink-0 relative z-10 bg-sidebar/50 dark:bg-[#121214]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden shrink-0">
                {vaultData?.settings?.avatarBase64 ? (
                  <img src={vaultData.settings.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} strokeWidth={1.5} />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-zinc-100 leading-tight">{workspaceName}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 pb-2 relative z-10">
            <button 
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))} 
              className="tour-global-search w-full bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-zinc-100 hover:border-gray-300 dark:border-white/20 rounded-md py-1.5 px-3 flex items-center justify-between text-xs transition-colors shadow-sm"
            >
              <span className="flex items-center gap-2"><Search size={14} /> Search</span>
              <span className="bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-500 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-[10px] font-mono">Ctrl+K</span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 flex flex-col space-y-1 relative z-10 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <motion.button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  whileHover="hover"
                  style={isActive ? { backgroundColor: `${vaultData?.settings?.accentColor || '#008EFF'}1A` } : {}}
                  className={`tour-sidebar-${item.name.toLowerCase().replace(/\s+/g, '-')} w-full flex items-center gap-3 px-4 py-2 rounded-md transition-all border-l-[3px] ${
                    isActive 
                      ? 'text-accent font-medium border-accent' 
                      : 'border-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-200/50 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <motion.div 
                    variants={{ hover: { x: 4 } }} 
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={isActive ? 'text-accent' : 'text-gray-400'}
                  >
                    <Icon size={18} strokeWidth={1.5} />
                  </motion.div>
                  {item.name}
                </motion.button>
              )
            })}
            
            <div className="mt-auto pt-4 flex flex-col space-y-1">
              <motion.button
                onClick={() => setActiveTab('Settings')}
                whileHover="hover"
                style={activeTab === 'Settings' ? { backgroundColor: `${vaultData?.settings?.accentColor || '#008EFF'}1A` } : {}}
                className={`tour-sidebar-settings w-full flex items-center gap-3 px-4 py-2 rounded-md transition-all border-l-[3px] ${
                  activeTab === 'Settings' 
                    ? 'text-accent font-medium border-accent' 
                    : 'border-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-200/50 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-100'
                }`}
              >
                <motion.div 
                  variants={{ hover: { x: 4 } }} 
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={activeTab === 'Settings' ? 'text-accent' : 'text-gray-400'}
                >
                  <SettingsIcon size={18} strokeWidth={1.5} />
                </motion.div>
                Settings
              </motion.button>
              
              <motion.button
                onClick={handleLockRequest}
                whileHover="hover"
                className="tour-lock-button w-full flex items-center gap-3 px-4 py-2 rounded-md transition-all border-l-[3px] border-transparent text-gray-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 group"
              >
                <motion.div 
                  variants={{ hover: { x: 4 } }} 
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-gray-400 group-hover:text-red-500"
                >
                  <Lock size={18} strokeWidth={1.5} />
                </motion.div>
                Lock Vault
              </motion.button>
            </div>
          </nav>
        </aside>

        {/* MIDDLE PANE: List View (Collapsible) */}
        {middlePane && (
          <div 
            className={`bg-white dark:bg-[#0c0c0e] border-r border-gray-200 dark:border-white/10 transition-all duration-300 ease-in-out relative flex flex-col z-30 ${
              isMiddlePaneOpen ? 'w-80' : 'w-0 border-r-0'
            }`}
          >
            <div className={`flex-1 overflow-hidden min-w-[20rem] transition-opacity duration-200 ${!isMiddlePaneOpen && 'opacity-0'}`}>
              {middlePane}
            </div>

            {/* Toggle Button */}
            <button 
              onClick={() => setIsMiddlePaneOpen(!isMiddlePaneOpen)}
              className="absolute -right-3 top-5 w-6 h-6 bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:text-zinc-100 hover:shadow-sm transition-colors cursor-pointer"
              style={{ zIndex: 100 }}
            >
              {isMiddlePaneOpen ? <ChevronLeft size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
            </button>
          </div>
        )}

        {/* RIGHT PANE: Main Workspace */}
        <main className="flex-1 bg-gray-50 dark:bg-zinc-900/50 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-scroll">
            {children}
          </div>
        </main>
      </div>
    </>
  );
};

