import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import logoUrl from '../../assets/logo.svg';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const checkMaximized = async () => {
      try {
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      } catch {
        // Ignored when running outside Tauri
      }
    };

    checkMaximized();

    appWindow.onResized(() => {
      checkMaximized();
    }).then((unsub) => {
      unlisten = unsub;
    }).catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await appWindow.minimize();
    } catch (err) {
      console.error('Failed to minimize window:', err);
    }
  };

  const handleToggleMaximize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await appWindow.toggleMaximize();
      const max = await appWindow.isMaximized();
      setIsMaximized(max);
    } catch (err) {
      console.error('Failed to toggle maximize window:', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await appWindow.close();
    } catch (err) {
      console.error('Failed to close window:', err);
    }
  };

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={() => handleToggleMaximize()}
      className="h-7 w-full bg-[#09090b] text-zinc-400 select-none flex items-center justify-between border-b border-zinc-800/40 z-50 shrink-0 font-sans cursor-default"
    >
      {/* Left: App Identity */}
      <div data-tauri-drag-region className="flex items-center gap-2 pl-3 pointer-events-none">
        <img src={logoUrl} alt="Tectoryx" className="w-3.5 h-3.5 object-contain" />
        <span className="text-[11px] font-medium text-zinc-500 tracking-tight">Tectoryx</span>
      </div>

      {/* Middle: Draggable Region */}
      <div data-tauri-drag-region className="flex-1 h-full" />

      {/* Right: Window Controls */}
      <div className="flex items-center h-full">
        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          title="Minimize"
          aria-label="Minimize Window"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          className="w-11 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
          aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2.5" y="0.5" width="7" height="7" />
              <path d="M0.5 2.5V9.5H7.5V7.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#e81123] active:bg-[#c4101f] transition-colors"
          title="Close"
          aria-label="Close Window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </header>
  );
};
