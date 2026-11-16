import React, { useState, useEffect } from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import { ToastProvider } from './context/ToastContext';
import { LockScreen } from './components/ui/LockScreen';
import { TitleBar } from './components/layout/TitleBar';
const LazyDashboard = React.lazy(() => import('./components/modules/Dashboard').then(m => ({ default: m.Dashboard })));
const LazyAppLayout = React.lazy(() => import('./components/layout/AppLayout').then(m => ({ default: m.AppLayout })));
const LazyMyVaultList = React.lazy(() => import('./components/modules/MyVault').then(m => ({ default: m.MyVaultList })));
const LazyMyVaultDetails = React.lazy(() => import('./components/modules/MyVault').then(m => ({ default: m.MyVaultDetails })));
const LazyNotesList = React.lazy(() => import('./components/modules/Notes').then(m => ({ default: m.NotesList })));
const LazyNotesEditor = React.lazy(() => import('./components/modules/Notes').then(m => ({ default: m.NotesEditor })));
const LazyTasks = React.lazy(() => import('./components/modules/Tasks').then(m => ({ default: m.Tasks })));
const LazyIncome = React.lazy(() => import('./components/modules/Income').then(m => ({ default: m.Income })));
const LazyCalendar = React.lazy(() => import('./components/modules/Calendar').then(m => ({ default: m.Calendar })));
const LazySettings = React.lazy(() => import('./components/modules/Settings').then(m => ({ default: m.Settings })));
const LazyOnboardingTour = React.lazy(() => import('./components/ui/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
import { motion, AnimatePresence } from 'framer-motion';

import { getCurrentWindow } from '@tauri-apps/api/window';

function AppContent() {
  const { isLocked, vaultData } = useVault();
  const [activeTab, setActiveTabState] = useState<string>('My Vault');
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isNotesGraphOpen, setIsNotesGraphOpen] = useState(false);

  const setActiveTab = (tab: string, action?: 'create') => {
    setActiveTabState(tab);
    if (action === 'create') {
      setIsCreating(true);
      setSelectedCredentialId(null);
    } else {
      setIsCreating(false);
      setSelectedCredentialId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser print dialog
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
      }
      // Prevent accidental browser reload which would flush decrypted vault state from RAM
      if (
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')
      ) {
        e.preventDefault();
      }
    };

    // Suppress Chromium default context menu on non-input chrome
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.ProseMirror')
      );
      if (!isInput) {
        e.preventDefault();
      }
    };

    // Prevent accidental browser file-drop navigation
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-dropzone]')) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    if (vaultData) {
      if (vaultData.settings?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [vaultData?.settings?.theme]);

  // Reset credential state and land on configured default tab on unlock
  useEffect(() => {
    if (isLocked) {
      setSelectedCredentialId(null);
      setIsCreating(false);
    } else if (vaultData) {
      const defaultTab = vaultData.settings?.defaultLandingTab || 'My Vault';
      setActiveTabState(defaultTab);
    }
  }, [isLocked]);

  React.useEffect(() => {
    // Show window once React is ready to avoid white flash
    getCurrentWindow().show();

    if (vaultData?.settings) {
      const fs = vaultData.settings.fontSize;
      if (fs === 'Small') document.documentElement.style.fontSize = '14px';
      else if (fs === 'Large') document.documentElement.style.fontSize = '18px';
      else document.documentElement.style.fontSize = '16px';
      
      const density = vaultData.settings.uiDensity;
      if (density === 'Compact') document.documentElement.setAttribute('data-density', 'compact');
      else document.documentElement.removeAttribute('data-density');
      
      const color = vaultData.settings.accentColor || '#008EFF';
      document.documentElement.style.setProperty('--color-accent', color);
    }
  }, [vaultData?.settings?.fontSize, vaultData?.settings?.uiDensity, vaultData?.settings?.accentColor]);

  // Render based on state

  let content = null;
  let middlePane = undefined;

  if (activeTab === 'Dashboard') {
    content = <LazyDashboard onNavigate={setActiveTab} />;
  } else if (activeTab === 'My Vault') {
    middlePane = (
      <LazyMyVaultList 
        selectedId={selectedCredentialId} 
        onSelect={(id) => {
          setSelectedCredentialId(id);
          setIsCreating(false);
        }}
        onCreateNew={() => {
          setIsCreating(true);
          setSelectedCredentialId(null);
        }}
      />
    );
    content = (
      <LazyMyVaultDetails 
        selectedId={selectedCredentialId} 
        isCreating={isCreating}
        onSaveComplete={(id) => {
          setIsCreating(false);
          setSelectedCredentialId(id);
        }}
        onDeleteComplete={() => {
          setSelectedCredentialId(null);
        }}
      />
    );
  } else if (activeTab === 'Notes') {
    middlePane = (
      <LazyNotesList 
        selectedId={selectedCredentialId} 
        onSelect={(id) => {
          setSelectedCredentialId(id);
          setIsCreating(false);
          setIsNotesGraphOpen(false);
        }}
        onToggleGraph={() => setIsNotesGraphOpen(!isNotesGraphOpen)}
        isGraphOpen={isNotesGraphOpen}
      />
    );
    content = (
      <LazyNotesEditor 
        key={selectedCredentialId || 'empty'}
        selectedId={selectedCredentialId} 
        onSelect={(id) => {
          setSelectedCredentialId(id);
          setIsCreating(false);
        }}
        isGraphOpen={isNotesGraphOpen}
        onCloseGraph={() => setIsNotesGraphOpen(false)}
      />
    );
  } else if (activeTab === 'Tasks') {
    content = <LazyTasks />;
  } else if (activeTab === 'Income') {
    content = <LazyIncome />;
  } else if (activeTab === 'Calendar') {
    content = <LazyCalendar />;
  } else if (activeTab === 'Settings') {
    content = <LazySettings />;
  } else {
    content = <div className="p-8 text-gray-500 dark:text-zinc-500">Coming soon...</div>;
  }

  const hasDetail = (activeTab === 'My Vault' || activeTab === 'Notes') && (selectedCredentialId !== null || isCreating);
  const handleBackToList = () => {
    setSelectedCredentialId(null);
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[#09090b]">
      <TitleBar />
      <div className="flex-1 w-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          {isLocked ? (
            <LockScreen key="lockscreen" />
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full w-full"
            >
              <React.Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-white dark:bg-[#0c0c0e]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>}>
                <LazyAppLayout 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab}
                  middlePane={middlePane}
                  hasDetail={hasDetail}
                  onBackToList={handleBackToList}
                >
                  <LazyOnboardingTour />
                  <React.Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
                    </div>
                  }>
                    {content}
                  </React.Suspense>
                </LazyAppLayout>
              </React.Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function App() {
  return (
    <VaultProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </VaultProvider>
  );
}

export default App;


