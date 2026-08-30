import React, { useState, useEffect } from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import { LockScreen } from './components/LockScreen';
import { Dashboard } from './components/Dashboard';
import { AppLayout } from './components/AppLayout';
import { MyVaultList, MyVaultDetails } from './components/MyVault';
import { NotesList, NotesEditor } from './components/Notes';
import { Tasks } from './components/Tasks';
import { Income } from './components/Income';
import { Calendar } from './components/Calendar';
import { Attachments } from './components/Attachments';
import { Settings } from './components/Settings';
import { OnboardingTour } from './components/OnboardingTour';
import { motion, AnimatePresence } from 'framer-motion';
import { pageFadeIn } from './lib/AnimationUtils';

function AppContent() {
  const { isLocked, vaultData } = useVault();
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (vaultData?.settings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [vaultData?.settings?.theme]);

  // Reset state when switching tabs
  React.useEffect(() => {
    setSelectedCredentialId(null);
    setIsCreating(false);
  }, [activeTab]);

  React.useEffect(() => {
    if (vaultData?.settings) {
      const fs = vaultData.settings.fontSize;
      if (fs === 'Small') document.documentElement.style.fontSize = '14px';
      else if (fs === 'Large') document.documentElement.style.fontSize = '18px';
      else document.documentElement.style.fontSize = '16px';
      
      const density = vaultData.settings.uiDensity;
      if (density === 'Compact') document.documentElement.setAttribute('data-density', 'compact');
      else document.documentElement.removeAttribute('data-density');
    }
  }, [vaultData?.settings?.fontSize, vaultData?.settings?.uiDensity]);

  // Render based on state

  let content = null;
  let middlePane = undefined;

  if (activeTab === 'Dashboard') {
    content = <Dashboard />;
  } else if (activeTab === 'My Vault') {
    middlePane = (
      <MyVaultList 
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
      <MyVaultDetails 
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
      <NotesList 
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
      <NotesEditor 
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
    content = <Tasks />;
  } else if (activeTab === 'Income') {
    content = <Income />;
  } else if (activeTab === 'Calendar') {
    content = <Calendar />;
  } else if (activeTab === 'Secure Docs') {
    content = <Attachments />;
  } else if (activeTab === 'Settings') {
    content = <Settings />;
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
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full w-full"
        >
          <AppLayout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            middlePane={middlePane}
          >
            <OnboardingTour />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={pageFadeIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full w-full"
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </AppLayout>
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
