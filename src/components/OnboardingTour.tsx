import React from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { Step, CallBackProps } from 'react-joyride';
import { useVault } from '../context/VaultContext';

export const OnboardingTour: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  
  const hasSeenTour = vaultData?.settings?.hasSeenTour;

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Welcome to Enclave!</h2>
          <p className="text-gray-600 dark:text-zinc-400">Let's take a quick tour of your new zero-knowledge workspace.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-sidebar-dashboard',
      content: 'Your Dashboard gives you a bird\'s-eye view of your secure data and financial ledger.',
      placement: 'right',
    },
    {
      target: '.tour-sidebar-my-vault',
      content: 'My Vault is your core password manager. All credentials are encrypted with AES-GCM.',
      placement: 'right',
    },
    {
      target: '.tour-sidebar-notes',
      content: 'Secure Notes features a rich-text editor for private thoughts and markdown support.',
      placement: 'right',
    },
    {
      target: '.tour-sidebar-secure-docs',
      content: 'Upload and encrypt sensitive files, IDs, or images here without them ever touching the cloud.',
      placement: 'right',
    },
    {
      target: '.tour-sidebar-settings',
      content: 'Customize your workspace, change your master password, or set the auto-lock timer here.',
      placement: 'right',
    },
    {
      target: '.tour-global-search',
      content: 'Press Ctrl+K (or Cmd+K) anywhere to instantly search across all your passwords, notes, and tasks!',
      placement: 'bottom',
    },
    {
      target: '.tour-lock-button',
      content: 'Done working? Click here to instantly wipe your decrypted data from memory and secure the vault.',
      placement: 'top',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      if (vaultData?.settings) {
        updateVaultData({
          settings: {
            ...vaultData.settings,
            hasSeenTour: true
          }
        }).catch(console.error);
      }
    }
  };

  if (!vaultData || hasSeenTour) return null;

  return (
    <Joyride
      steps={steps}
      run={true}
      continuous={true}
      scrollToFirstStep={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#008EFF',
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: 'left'
        },
        buttonNext: {
          backgroundColor: '#008EFF'
        },
        buttonBack: {
          color: '#008EFF'
        }
      }}
    />
  );
};
