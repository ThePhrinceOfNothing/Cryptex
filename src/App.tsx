import React, { useState, useEffect } from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import { LockScreen } from './components/LockScreen';
const LazyDashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const LazyAppLayout = React.lazy(() => import('./components/AppLayout').then(m => ({ default: m.AppLayout })));
const LazyMyVaultList = React.lazy(() => import('./components/MyVault').then(m => ({ default: m.MyVaultList })));
const LazyMyVaultDetails = React.lazy(() => import('./components/MyVault').then(m => ({ default: m.MyVaultDetails })));
const LazyNotesList = React.lazy(() => import('./components/Notes').then(m => ({ default: m.NotesList })));
const LazyNotesEditor = React.lazy(() => import('./components/Notes').then(m => ({ default: m.NotesEditor })));
const LazyTasks = React.lazy(() => import('./components/Tasks').then(m => ({ default: m.Tasks })));
const LazyIncome = React.lazy(() => import('./components/Income').then(m => ({ default: m.Income })));
const LazyCalendar = React.lazy(() => import('./components/Calendar').then(m => ({ default: m.Calendar })));
const LazyAttachments = React.lazy(() => import('./components/Attachments').then(m => ({ default: m.Attachments })));
const LazySettings = React.lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const LazyOnboardingTour = React.lazy(() => import('./components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
import { motion, AnimatePresence } from 'framer-motion';
import { pageFadeIn } from './lib/AnimationUtils';
import { getCurrentWindow } from '@tauri-apps/api/window';

function AppContent() {
  const { isLocked, vaultData } = useVault();
  const [activeTab, setActiveTabState] = useState<string>('Dashboard');
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    content = <LazyDashboard />;
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
        }}
        onCreateNew={() => {
          setIsCreating(true);
          setSelectedCredentialId(null);
        }}
      />
    );
    content = (
      <LazyNotesEditor 
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
  } else if (activeTab === 'Tasks') {
    content = <LazyTasks />;
  } else if (activeTab === 'Income') {
    content = <LazyIncome />;
  } else if (activeTab === 'Calendar') {
    content = <LazyCalendar />;
  } else if (activeTab === 'Secure Docs') {
    content = <LazyAttachments />;
  } else if (activeTab === 'Settings') {
    content = <LazySettings />;
  } else {
    content = <div className="p-8 text-gray-500 dark:text-zinc-500">Coming soon...</div>;
  }

  return (
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
            <React.Suspense fallback={<div className="w-full h-screen flex items-center justify-center bg-white dark:bg-[#0c0c0e]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>}>
              <LazyAppLayout 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
                middlePane={middlePane}
              >
                <LazyOnboardingTour />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageFadeIn}
                    className="h-full w-full"
                  >
                    {content}
                  </motion.div>
                </AnimatePresence>
              </LazyAppLayout>
            </React.Suspense>
          </motion.div>
      )}
    </AnimatePresence>
  );
}

function App() {
  return (
    <VaultProvider>
      <AppContent />
    </VaultProvider>
  );
}

export default App;
