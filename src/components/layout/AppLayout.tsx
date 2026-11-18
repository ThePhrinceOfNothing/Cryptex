import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Lock, 
  StickyNote, 
  CheckSquare, 
  Calendar, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Settings as SettingsIcon, 
  Search,
  Menu,
  X,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../../context/VaultContext';
import { GlobalSearch } from '../ui/GlobalSearch';
import { UpdateLogsModal } from '../modals/UpdateLogsModal';
import { GhostPet } from '../ui/GhostPet';
import { AmbiencePlayer } from '../ui/AmbiencePlayer';
import { QuickScratchpadModal } from '../ui/QuickScratchpadModal';
import { SteganographyModal } from '../modals/SteganographyModal';
import { GhostVaultModal } from '../modals/GhostVaultModal';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string, action?: 'create') => void;
  middlePane?: ReactNode;
  hasDetail?: boolean;
  onBackToList?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  middlePane, 
  activeTab, 
  setActiveTab,
  hasDetail,
  onBackToList 
}) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMiddlePaneOpen, setIsMiddlePaneOpen] = useState(true);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isSteganographyOpen, setIsSteganographyOpen] = useState(false);
  const [isGhostVaultOpen, setIsGhostVaultOpen] = useState(false);
  const keySequenceRef = useRef<string>('');

  const { vaultData, lockVault, lockCountdown } = useVault();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width >= 768 && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileDrawerOpen]);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Global Quick-Lock: Ctrl+Shift+L or Ctrl+Alt+L
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleLockRequest();
        return;
      }
      // Quick Scratchpad: Ctrl+Shift+Space
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setIsScratchpadOpen(prev => !prev);
        return;
      }
      // Covert Ghost Vault Stealth Hotkey: Ctrl+Alt+Shift+B
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsGhostVaultOpen(prev => !prev);
        return;
      }

      // Background Sequence Detection: "bazooka"
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (!isInput && e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        keySequenceRef.current = (keySequenceRef.current + e.key.toLowerCase()).slice(-10);
        if (keySequenceRef.current.endsWith('bazooka')) {
          keySequenceRef.current = '';
          setIsGhostVaultOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Auto-collapse sidebar on tablet view to preserve reading space
  useEffect(() => {
    if (isTablet) {
      setIsSidebarCollapsed(true);
    } else if (windowWidth >= 1024) {
      setIsSidebarCollapsed(false);
    }
  }, [isTablet, windowWidth]);

  const handleLockRequest = () => {
    setIsMobileDrawerOpen(false);
    lockVault();
  };

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
    if (isMobile) {
      setIsMobileDrawerOpen(false);
    }
  };

  const workspaceName = vaultData?.settings?.workspaceName || 'My Workspace';
  const subtitle = vaultData?.settings?.subtitle || 'Personal Vault';

  const enabledModules = vaultData?.settings?.enabledModules;
  const isModuleEnabled = (key: string, defaultVal: boolean = true) => {
    if (!enabledModules) return defaultVal;
    return (enabledModules as any)[key] ?? defaultVal;
  };

  const navItems = [
    ...(isModuleEnabled('dashboard', true) ? [{ name: 'Dashboard', icon: LayoutDashboard }] : []),
    { name: 'My Vault', icon: Lock },
    ...(isModuleEnabled('notes', true) ? [{ name: 'Notes', icon: StickyNote }] : []),
    ...(isModuleEnabled('tasks', true) ? [{ name: 'Tasks', icon: CheckSquare }] : []),
    ...(isModuleEnabled('calendar', true) ? [{ name: 'Calendar', icon: Calendar }] : []),
    ...(isModuleEnabled('income', true) ? [{ name: 'Income', icon: DollarSign }] : []),
  ];

  const hackerTheme = vaultData?.settings?.terminalHackerTheme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-hacker-green', 'theme-hacker-amber', 'crt-scanlines');
    if (hackerTheme === 'green') {
      root.classList.add('theme-hacker-green', 'crt-scanlines');
    } else if (hackerTheme === 'amber') {
      root.classList.add('theme-hacker-amber', 'crt-scanlines');
    }
    return () => {
      root.classList.remove('theme-hacker-green', 'theme-hacker-amber', 'crt-scanlines');
    };
  }, [hackerTheme]);

  return (
    <>
      <UpdateLogsModal />
      <GlobalSearch onNavigate={setActiveTab} />
      <QuickScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        onNavigateToTab={setActiveTab}
      />
      <SteganographyModal
        isOpen={isSteganographyOpen}
        onClose={() => setIsSteganographyOpen(false)}
      />
      <GhostVaultModal
        isOpen={isGhostVaultOpen}
        onClose={() => setIsGhostVaultOpen(false)}
      />

      {/* Auto-Lock Warning Banner */}
      <AnimatePresence>
        {lockCountdown !== null && lockCountdown > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 z-[100] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md text-gray-900 dark:text-zinc-100 px-5 py-3.5 rounded-lg shadow-xl flex flex-col items-center gap-1.5 border border-gray-200 dark:border-[#262626]"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <p className="text-xs font-medium">
                Vault locks in <span className="tabular-nums font-bold text-red-500 ml-1">{lockCountdown}s</span>
              </p>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-zinc-500">Move pointer to cancel</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-full w-full bg-white dark:bg-[#0a0a0a] overflow-hidden text-sm select-none">
        
        {/* MOBILE TOP NAVIGATION BAR (< 768px) */}
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 h-13 bg-[#fafafa] dark:bg-[#111113] border-b border-gray-200 dark:border-[#262626] flex items-center justify-between px-3.5 z-40">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="p-1.5 rounded-md text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                aria-label="Open Navigation Menu"
              >
                <Menu size={18} strokeWidth={1.75} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-[#262626]">
                  {vaultData?.settings?.avatarBase64 ? (
                    <img src={vaultData.settings.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={13} strokeWidth={1.75} className="text-zinc-600 dark:text-zinc-300" />
                  )}
                </div>
                <span className="font-semibold text-xs text-gray-900 dark:text-zinc-100 truncate max-w-[140px]">
                  {workspaceName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <AmbiencePlayer />
              <button
                onClick={() => setIsScratchpadOpen(true)}
                className="p-1.5 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                title="Quick Scratchpad (Ctrl+Shift+Space)"
              >
                <Sparkles size={16} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setIsSteganographyOpen(true)}
                className="p-1.5 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                title="Steganography Studio"
              >
                <EyeOff size={16} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                className="p-2 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                title="Search (Ctrl+K)"
              >
                <Search size={16} strokeWidth={1.75} />
              </button>
              <button
                onClick={handleLockRequest}
                className="p-2 rounded-md text-gray-600 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:scale-[0.97]"
                title="Lock Vault"
              >
                <Lock size={16} strokeWidth={1.75} />
              </button>
            </div>
          </header>
        )}

        {/* MOBILE SLIDE-OVER DRAWER (< 768px) */}
        <AnimatePresence>
          {isMobile && isMobileDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setIsMobileDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-0 w-72 bg-[#fafafa] dark:bg-[#111113] border-r border-gray-200 dark:border-[#262626] z-50 flex flex-col p-4 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-[#262626]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-[#262626]">
                      {vaultData?.settings?.avatarBase64 ? (
                        <img src={vaultData.settings.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={15} strokeWidth={1.75} className="text-zinc-600 dark:text-zinc-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900 dark:text-zinc-100">{workspaceName}</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-500">{subtitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </div>

                <div className="py-3">
                  <button 
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
                    }} 
                    className="w-full bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#262626] text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md py-1.5 px-3 flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2"><Search size={14} strokeWidth={1.75} /> Quick Search</span>
                    <span className="bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] tabular-nums font-medium">Ctrl+K</span>
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto space-y-1 py-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleTabClick(item.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                          isActive 
                            ? 'bg-zinc-200/80 dark:bg-white/10 text-gray-900 dark:text-white' 
                            : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon size={16} strokeWidth={1.75} className={isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400"} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="pt-3 border-t border-gray-200 dark:border-[#262626] space-y-1">
                  <button
                    onClick={() => handleTabClick('Settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                      activeTab === 'Settings' 
                        ? 'bg-zinc-200/80 dark:bg-white/10 text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <SettingsIcon size={16} strokeWidth={1.75} />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleLockRequest}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:scale-[0.97]"
                  >
                    <Lock size={16} strokeWidth={1.75} />
                    <span>Lock Vault</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* DESKTOP & TABLET SIDEBAR (>= 768px) */}
        {!isMobile && (
          <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-60'} bg-[#fafafa] dark:bg-[#111113] border-r border-gray-200 dark:border-[#262626] flex flex-col flex-shrink-0 z-20 transition-all duration-200 ease-out select-none`}>
            {/* Header branding */}
            <div className={`h-14 flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-gray-200 dark:border-[#262626] shrink-0`}>
              {!isSidebarCollapsed ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-gray-200 dark:border-[#262626] flex items-center justify-center overflow-hidden shrink-0">
                      {vaultData?.settings?.avatarBase64 ? (
                        <img src={vaultData.settings.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={14} strokeWidth={1.75} className="text-zinc-600 dark:text-zinc-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-gray-900 dark:text-zinc-100 leading-tight truncate">{workspaceName}</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-500 truncate">{subtitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                    title="Collapse Sidebar"
                  >
                    <PanelLeftClose size={15} strokeWidth={1.75} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                  title="Expand Sidebar"
                >
                  <PanelLeft size={16} strokeWidth={1.75} />
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className={`pt-3 pb-1 ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}>
              <button 
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))} 
                className={`w-full bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#262626] text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md py-1.5 ${isSidebarCollapsed ? 'px-2 justify-center' : 'px-2.5 justify-between'} flex items-center text-xs transition-colors shadow-2xs active:scale-[0.97]`}
                title="Search (Ctrl+K)"
              >
                <span className="flex items-center gap-2">
                  <Search size={14} strokeWidth={1.75} />
                  {!isSidebarCollapsed && <span>Search</span>}
                </span>
                {!isSidebarCollapsed && (
                  <span className="bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 px-1 py-0.2 rounded border border-gray-200 dark:border-[#262626] text-[10px] tabular-nums font-medium">Ctrl+K</span>
                )}
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto py-2 flex flex-col space-y-0.5 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    className={`relative w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-1.5'} rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                      isActive 
                        ? 'text-gray-900 dark:text-white font-medium' 
                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100/70 dark:hover:bg-zinc-800/40'
                    }`}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-sidebar-pill"
                        className="absolute inset-0 bg-gray-200/80 dark:bg-white/10 rounded-lg -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Icon size={17} strokeWidth={1.75} className={isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400'} />
                    {!isSidebarCollapsed && <span>{item.name}</span>}
                  </button>
                );
              })}

              <div className="mt-auto pt-3 border-t border-gray-200 dark:border-[#262626] flex flex-col space-y-0.5">
                {(isModuleEnabled('ambience', false) || isModuleEnabled('scratchpad', true) || isModuleEnabled('steganography', false)) && !isSidebarCollapsed && (
                  <span className="px-3 pb-1 text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                    Tools
                  </span>
                )}

                {/* Focus Ambience Player */}
                {isModuleEnabled('ambience', false) && (
                  <AmbiencePlayer isCollapsed={isSidebarCollapsed} />
                )}

                {/* Quick Scratchpad */}
                {isModuleEnabled('scratchpad', true) && (
                  <button
                    onClick={() => setIsScratchpadOpen(true)}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2' : 'justify-between px-3 py-1.5'} rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100/70 dark:hover:bg-zinc-800/40 transition-colors active:scale-[0.97]`}
                    title="Quick Scratchpad (Ctrl+Shift+Space)"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={17} strokeWidth={1.75} className="text-gray-500 dark:text-zinc-400 shrink-0" />
                      {!isSidebarCollapsed && <span>Scratchpad</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800/80 px-1 py-0.5 rounded border border-gray-200/60 dark:border-zinc-700/60">
                        Ctrl+Shift+Space
                      </span>
                    )}
                  </button>
                )}

                {/* Steganography Studio */}
                {isModuleEnabled('steganography', false) && (
                  <button
                    onClick={() => setIsSteganographyOpen(true)}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-1.5'} rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100/70 dark:hover:bg-zinc-800/40 transition-colors active:scale-[0.97]`}
                    title="PNG Steganography Studio"
                  >
                    <EyeOff size={17} strokeWidth={1.75} className="text-gray-500 dark:text-zinc-400 shrink-0" />
                    {!isSidebarCollapsed && <span>Steganography</span>}
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('Settings')}
                  className={`relative w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-1.5'} rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                    activeTab === 'Settings' 
                      ? 'text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100/70 dark:hover:bg-zinc-800/40'
                  }`}
                  title={isSidebarCollapsed ? "Settings" : undefined}
                >
                  {activeTab === 'Settings' && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      className="absolute inset-0 bg-gray-200/80 dark:bg-white/10 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <SettingsIcon size={17} strokeWidth={1.75} className={activeTab === 'Settings' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400'} />
                  {!isSidebarCollapsed && <span>Settings</span>}
                </button>

                <button
                  onClick={handleLockRequest}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-1.5'} rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors active:scale-[0.97]`}
                  title={isSidebarCollapsed ? "Lock Vault" : undefined}
                >
                  <Lock size={17} strokeWidth={1.75} />
                  {!isSidebarCollapsed && <span>Lock Vault</span>}
                </button>
              </div>
            </nav>
          </aside>
        )}

        {/* MIDDLE PANE: Desktop / Tablet Split View (>= 768px) */}
        {!isMobile && middlePane && (
          <div 
            className={`bg-white dark:bg-[#111113] border-r border-gray-200 dark:border-[#262626] transition-all duration-200 ease-out relative flex flex-col z-10 ${
              isMiddlePaneOpen ? 'w-72 lg:w-80' : 'w-0 border-r-0'
            }`}
          >
            <div className={`flex-1 overflow-hidden min-w-[18rem] lg:min-w-[20rem] transition-opacity duration-150 ${!isMiddlePaneOpen && 'opacity-0 pointer-events-none'}`}>
              {middlePane}
            </div>

            {/* Toggle Button */}
            <button 
              onClick={() => setIsMiddlePaneOpen(!isMiddlePaneOpen)}
              className="absolute -right-3 top-4 w-6 h-6 bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:shadow-xs transition-colors cursor-pointer z-30 active:scale-[0.95]"
              title={isMiddlePaneOpen ? "Collapse List" : "Expand List"}
            >
              {isMiddlePaneOpen ? <ChevronLeft size={13} strokeWidth={1.75} /> : <ChevronRight size={13} strokeWidth={1.75} />}
            </button>
          </div>
        )}

        {/* MAIN WORKSPACE / CONTENT PANE */}
        <main className={`flex-1 bg-white dark:bg-[#0a0a0a] flex flex-col overflow-hidden relative ${isMobile ? 'pt-13' : ''}`}>
          
          {/* Mobile Drilldown Navigation (when inside My Vault or Notes on mobile) */}
          {isMobile && middlePane && hasDetail && (
            <div className="h-11 border-b border-gray-200 dark:border-[#262626] flex items-center px-4 bg-gray-50/80 dark:bg-[#111113]/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
              <button
                onClick={onBackToList}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors active:scale-[0.97]"
              >
                <ArrowLeft size={15} strokeWidth={1.75} />
                <span>Back to {activeTab} list</span>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* On mobile, if middlePane exists and we do NOT have an active detail item, show the middlePane full-width! */}
            {isMobile && middlePane && !hasDetail ? (
              <div className="h-full">
                {middlePane}
              </div>
            ) : (
              children
            )}
          </div>
        </main>

        {vaultData?.settings?.companionEnabled && <GhostPet activeTab={activeTab} />}
      </div>
    </>
  );
};
