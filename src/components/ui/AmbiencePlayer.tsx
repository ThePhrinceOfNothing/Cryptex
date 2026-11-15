import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Flame, Clock, Radio, Sliders, X } from 'lucide-react';
import { playAmbience, stopAmbience, setAmbienceVolume, getCurrentAmbience } from '../../lib/ambienceSynth';
import type { AmbienceTrack } from '../../lib/ambienceSynth';
import { useVault } from '../../context/VaultContext';

export const AmbiencePlayer: React.FC<{ isCollapsed?: boolean }> = ({ isCollapsed = false }) => {
  const { vaultData, updateVaultData } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState<AmbienceTrack>('none');
  const [volume, setVolume] = useState<number>(35);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});

  useEffect(() => {
    const savedTrack = vaultData?.settings?.ambienceTrack || 'none';
    const savedVol = vaultData?.settings?.ambienceVolume ?? 35;
    setVolume(savedVol);
    setAmbienceVolume(savedVol / 100);
    setActiveTrack(savedTrack);
    if (savedTrack !== 'none') {
      playAmbience(savedTrack);
    }
    return () => {
      stopAmbience();
    };
  }, []);

  const handleToggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const isSidebar = rect.left < 280;

      if (isSidebar) {
        // Open to the right of the sidebar, anchored near the bottom
        setMenuPosition({
          left: rect.right + 10,
          bottom: Math.max(16, window.innerHeight - rect.bottom),
        });
      } else {
        // Open below the button in top bar / mobile
        setMenuPosition({
          top: rect.bottom + 8,
          right: Math.max(12, window.innerWidth - rect.right),
        });
      }
    }
    setIsOpen(!isOpen);
  };

  const handleSelectTrack = (track: AmbienceTrack) => {
    setActiveTrack(track);
    if (track === 'none') {
      stopAmbience();
    } else {
      playAmbience(track);
    }

    if (vaultData) {
      updateVaultData({
        settings: {
          ...vaultData.settings,
          workspaceName: vaultData.settings?.workspaceName || 'My Workspace',
          subtitle: vaultData.settings?.subtitle || 'Personal Vault',
          fontSize: vaultData.settings?.fontSize || 'Default',
          uiDensity: vaultData.settings?.uiDensity || 'Comfortable',
          autoLockTimer: vaultData.settings?.autoLockTimer || '5 min',
          ambienceTrack: track,
          ambienceVolume: volume,
        },
      }).catch(() => {});
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setAmbienceVolume(newVol / 100);

    if (vaultData) {
      updateVaultData({
        settings: {
          ...vaultData.settings,
          workspaceName: vaultData.settings?.workspaceName || 'My Workspace',
          subtitle: vaultData.settings?.subtitle || 'Personal Vault',
          fontSize: vaultData.settings?.fontSize || 'Default',
          uiDensity: vaultData.settings?.uiDensity || 'Comfortable',
          autoLockTimer: vaultData.settings?.autoLockTimer || '5 min',
          ambienceVolume: newVol,
        },
      }).catch(() => {});
    }
  };

  const tracks: { id: AmbienceTrack; name: string; icon: React.ElementType }[] = [
    { id: 'none', name: 'Mute', icon: VolumeX },
    { id: 'rain', name: 'Heavy Rain', icon: CloudRain },
    { id: 'campfire', name: 'Campfire', icon: Flame },
    { id: 'clock', name: 'Mechanical Clock', icon: Clock },
    { id: 'whitenoise', name: 'Pink Noise', icon: Radio },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        className={`w-full flex items-center ${
          isCollapsed ? 'justify-center py-2' : 'justify-between px-3 py-1.5'
        } rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
          activeTrack !== 'none'
            ? 'text-accent font-semibold bg-accent/10 dark:bg-accent/15'
            : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100/70 dark:hover:bg-zinc-800/40'
        }`}
        title="Focus Ambience Generator"
        aria-label="Toggle Focus Ambience"
      >
        <div className="flex items-center gap-3 min-w-0">
          {activeTrack !== 'none' ? (
            <Volume2 size={17} strokeWidth={1.75} className="text-accent animate-pulse shrink-0" />
          ) : (
            <VolumeX size={17} strokeWidth={1.75} className="text-gray-500 dark:text-zinc-400 shrink-0" />
          )}
          {!isCollapsed && (
            <span className="truncate">
              {activeTrack !== 'none'
                ? tracks.find((t) => t.id === activeTrack)?.name
                : 'Focus Ambience'}
            </span>
          )}
        </div>
        {!isCollapsed && activeTrack !== 'none' && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0 ml-1" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Global Backdrop */}
          <div
            className="fixed inset-0 z-[120] bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />

          {/* Fixed Non-Clipped Card */}
          <div
            style={{
              position: 'fixed',
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              left: menuPosition.left,
              right: menuPosition.right,
              zIndex: 130,
            }}
            className="w-64 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-accent" />
                Focus Soundscapes
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {tracks.map((t) => {
                const Icon = t.icon;
                const isSelected = activeTrack === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTrack(t.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-accent text-white font-medium shadow-xs'
                        : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.name}</span>
                    </div>
                    {isSelected && activeTrack !== 'none' && (
                      <span className="text-[10px] font-mono opacity-80 uppercase">Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeTrack !== 'none' && (
              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
                  <span>Volume</span>
                  <span className="tabular-nums font-mono">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                  className="w-full accent-accent h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};
