import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '../../context/VaultContext';
import { calculatePasswordStrength } from '../../lib/passwordUtils';
import { 
  calculateLevelInfo, 
  EVOLUTION_NAMES, 
  getAvailableAccessories, 
  addExperience,
  unlockBadge 
} from '../../lib/gamification';
import { GhostMiniGame } from './GhostMiniGame';
import { playKeyClick, playCoinClink, playLevelUp } from '../../lib/soundEngine';
import type { PetEvolution, PetAccessory } from '../../lib/vault';
import { Sparkles, Gamepad2, X, ChevronRight, Moon, Crown, Headphones, Check } from 'lucide-react';

export const GhostPet: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { vaultData, updateVaultData } = useVault();
  const ghostBehavior = vaultData?.settings?.ghostBehavior || 'random';

  const [isOpen, setIsOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMiniGameOpen, setIsMiniGameOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [isBlinking, setIsBlinking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Track window size
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const gamification = vaultData?.gamification;
  const levelInfo = useMemo(() => calculateLevelInfo(gamification?.xp || 0), [gamification?.xp]);
  const currentEvolution: PetEvolution = levelInfo.evolution;
  const currentAccessory: PetAccessory = gamification?.accessory || 'none';

  // Night Owl mood check (11 PM to 5 AM)
  const isPastMidnight = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 23 || hour < 5;
  }, []);

  useEffect(() => {
    if (isPastMidnight && !gamification?.unlockedBadges?.includes('night_owl')) {
      const badgeRes = unlockBadge(gamification, 'night_owl');
      updateVaultData({ gamification: badgeRes.newState }).catch(() => {});
    }
  }, [isPastMidnight, gamification]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWinSize({ w, h });
      setPosition((prev) => ({
        x: Math.min(prev.x, Math.max(10, w - 80)),
        y: Math.min(prev.y, Math.max(10, h - 80)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Context-aware lines
  const getContextLines = useCallback(() => {
    let lines: string[] = [];

    if (isPastMidnight) {
      lines.push("Working late? The stars are watching with us.");
      lines.push("Past midnight... Night owl badge unlocked!");
      lines.push("Shh... sneaking encrypted bytes through the night.");
    } else if (activeTab.toLowerCase().includes('vault')) {
      lines.push("Oops! I'll close my eyes! Your secrets are safe.");
      lines.push("I love staring at encrypted hashes.");
      lines.push("AES-256-GCM? Pure cryptographic steel.");
      const weakCount = (vaultData?.credentials || []).filter(
        (c) => calculatePasswordStrength(c.password || '') === 'fair'
      ).length;
      if (weakCount > 0) {
        lines.push(`I sense ${weakCount} passwords that could use hardening.`);
      }
    } else if (activeTab.toLowerCase().includes('task')) {
      lines.push("Every completed task feeds my evolution meter!");
      lines.push("Focus mode engaged. Knock those to-dos down.");
      const doneCount = (vaultData?.tasks || []).filter((t) => t.status === 'done').length;
      if (doneCount > 0) {
        lines.push(`${doneCount} tasks cleared! Look at that momentum.`);
      }
    } else if (activeTab.toLowerCase().includes('note')) {
      lines.push("Writing is thinking. Your notes are sealed tight.");
      lines.push("Try linking notes with [[Note Name]] for the constellation view!");
      lines.push("Seal a note in a Time Capsule if you want to unlock it in the future.");
    } else if (activeTab.toLowerCase().includes('income')) {
      lines.push("A tidy ledger makes a sovereign vault happy.");
      lines.push("Tracking every coin like a true cyber banker.");
    } else {
      lines.push(`I'm feeling strong at Level ${levelInfo.level}!`);
      lines.push("Need a break? Open my mini-games for a 2-minute reset.");
      lines.push("All cryptographic shields are operational.");
    }

    return lines;
  }, [activeTab, vaultData, isPastMidnight, levelInfo.level]);

  const speak = useCallback(() => {
    const lines = getContextLines();
    const newQuote = lines[Math.floor(Math.random() * lines.length)];
    setCurrentQuote(newQuote);
    setIsOpen(true);
  }, [getContextLines]);

  useEffect(() => {
    if (ghostBehavior === 'random') {
      const spawnX = Math.max(100, Math.random() * (winSize.w - 200));
      const spawnY = Math.max(150, Math.random() * (winSize.h - 200));
      setPosition({ x: spawnX, y: spawnY });
    }

    const timer = setTimeout(() => {
      speak();
    }, 600);
    return () => clearTimeout(timer);
  }, [activeTab, speak, ghostBehavior]);

  useEffect(() => {
    if (ghostBehavior === 'fixed') {
      setPosition({ x: winSize.w - 100, y: winSize.h - 100 });
    }
  }, [ghostBehavior, winSize.w, winSize.h]);

  const handleClick = () => {
    playKeyClick();
    setIsSheetOpen(true);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsOpen(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, Math.random() * 4000 + 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  const xDiff = mousePos.x - position.x;
  let eyeOffset = 0;
  if (xDiff < -40) eyeOffset = -1;
  else if (xDiff > 40) eyeOffset = 1;

  const bubbleOnRight = position.x < winSize.w / 2;

  const handleEarnXP = async (amount: number, badgeId?: string) => {
    let state = vaultData?.gamification;
    if (badgeId) {
      const badgeRes = unlockBadge(state, badgeId);
      state = badgeRes.newState;
    }
    const result = addExperience(state, amount, vaultData?.settings?.soundEnabled ?? true);
    if (result.leveledUp) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
    await updateVaultData({ gamification: result.newState });
  };

  const handleSelectAccessory = async (acc: PetAccessory) => {
    playKeyClick();
    const updated = { ...(vaultData?.gamification || {}), accessory: acc };
    await updateVaultData({ gamification: updated as any });
  };

  const availableAccessories = getAvailableAccessories(levelInfo.level);

  const driftX = ghostBehavior === 'fixed' ? position.x : position.x + (mousePos.x - position.x) * 0.02;
  const driftY = ghostBehavior === 'fixed' ? position.y : position.y + (mousePos.y - position.y) * 0.02;

  return (
    <>
      {/* Companion Details / Mini-Game Popover Sheet */}
      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    Companion Sanctuary
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsSheetOpen(false);
                    setIsMiniGameOpen(false);
                  }}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mini-Game View */}
              {isMiniGameOpen ? (
                <GhostMiniGame
                  onEarnXP={handleEarnXP}
                  onClose={() => setIsMiniGameOpen(false)}
                  soundEnabled={vaultData?.settings?.soundEnabled ?? true}
                />
              ) : (
                /* Companion Profile */
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                      <PetAvatarRenderer
                        evolution={currentEvolution}
                        accessory={currentAccessory}
                        isBlinking={false}
                        eyeOffset={0}
                        isPastMidnight={isPastMidnight}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                          {EVOLUTION_NAMES[currentEvolution]}
                        </h4>
                        <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                          Lvl {levelInfo.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        {levelInfo.evolution === 'ghost' && 'A friendly spectral wisp haunting your local memory.'}
                        {levelInfo.evolution === 'owl' && 'A mechanical brass owl forged in precision cryptography.'}
                        {levelInfo.evolution === 'fox' && 'A swift cyber-fox navigating encrypted neural paths.'}
                        {levelInfo.evolution === 'gargoyle' && 'A sovereign stone gargoyle guarding your vault.'}
                      </p>
                      <div className="w-full bg-gray-200 dark:bg-zinc-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
                        <div
                          className="bg-accent h-full rounded-full transition-all duration-300"
                          style={{ width: `${levelInfo.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>{levelInfo.xpInCurrentLevel} / {levelInfo.xpForNextLevel} XP</span>
                        <span>{levelInfo.progressPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Accessory Picker */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                      Unlocked Accessories
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['none', 'monocle', 'headphones', 'crown'] as PetAccessory[]).map((acc) => {
                        const isUnlocked = availableAccessories.includes(acc);
                        const isSelected = currentAccessory === acc;
                        return (
                          <button
                            key={acc}
                            disabled={!isUnlocked}
                            onClick={() => handleSelectAccessory(acc)}
                            className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-accent/15 border-accent text-accent font-semibold'
                                : isUnlocked
                                ? 'bg-gray-50 dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-800 hover:bg-gray-100 text-gray-700 dark:text-zinc-300'
                                : 'opacity-40 border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <span className="text-[11px] capitalize">{acc}</span>
                            {!isUnlocked && (
                              <span className="text-[9px] text-gray-400">
                                {acc === 'monocle' && 'Lvl 3'}
                                {acc === 'headphones' && 'Lvl 7'}
                                {acc === 'crown' && 'Lvl 16'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Break Mini-Games Button */}
                  <button
                    onClick={() => {
                      playKeyClick();
                      setIsMiniGameOpen(true);
                    }}
                    className="w-full py-2.5 px-4 bg-accent hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-between transition-transform active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4" />
                      <span>Play 2-Minute Break Mini-Game</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Pet Render */}
      <motion.div
        className="fixed z-50 pointer-events-none flex items-center justify-center"
        animate={{ x: driftX, y: driftY }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
        style={{ top: 0, left: 0, width: 64, height: 64 }}
      >
        <div className="pointer-events-auto relative">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: bubbleOnRight ? -10 : 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={`absolute ${
                  bubbleOnRight ? 'left-[75px]' : 'right-[75px]'
                } top-[-10px] w-max max-w-[190px] sm:max-w-[230px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] shadow-lg rounded-xl p-3.5 pointer-events-none ${
                  bubbleOnRight ? 'origin-left' : 'origin-right'
                }`}
              >
                <p className="text-xs text-gray-700 dark:text-zinc-300 text-center font-medium leading-relaxed">
                  "{currentQuote}"
                </p>
                <div
                  className={`absolute ${
                    bubbleOnRight ? '-left-2 border-b border-l' : '-right-2 border-t border-r'
                  } top-[28px] w-3.5 h-3.5 bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#27272a] transform rotate-45`}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar button */}
          <motion.button
            onClick={handleClick}
            className="outline-none relative cursor-pointer block"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.12, rotate: [0, -4, 4, 0] }}
            whileTap={{ scale: 0.9 }}
          >
            <PetAvatarRenderer
              evolution={currentEvolution}
              accessory={currentAccessory}
              isBlinking={isBlinking}
              eyeOffset={eyeOffset}
              isPastMidnight={isPastMidnight}
            />
          </motion.button>
        </div>
      </motion.div>
    </>
  );
};

// ==========================================
// PET AVATAR RENDERER (Ghost, Owl, Fox, Gargoyle)
// ==========================================
interface PetRendererProps {
  evolution: PetEvolution;
  accessory: PetAccessory;
  isBlinking: boolean;
  eyeOffset: number;
  isPastMidnight: boolean;
}

const PetAvatarRenderer: React.FC<PetRendererProps> = ({
  evolution,
  accessory,
  isBlinking,
  eyeOffset,
  isPastMidnight,
}) => {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="drop-shadow-xl filter"
    >
      {/* 1. GHOST EVOLUTION */}
      {evolution === 'ghost' && (
        <>
          <path
            d="M 5 2 H 11 V 3 H 13 V 4 H 14 V 13 H 12 V 12 H 10 V 13 H 6 V 12 H 4 V 13 H 2 V 4 H 3 V 3 H 5 Z"
            fill="#ffffff"
          />
          <g transform={`translate(${eyeOffset}, 0)`}>
            {!isBlinking ? (
              <>
                <rect x="5" y="6" width="2" height="2" fill="#18181b" />
                <rect x="9" y="6" width="2" height="2" fill="#18181b" />
              </>
            ) : (
              <>
                <rect x="5" y="7" width="2" height="1" fill="#18181b" />
                <rect x="9" y="7" width="2" height="1" fill="#18181b" />
              </>
            )}
            <rect x="3" y="8" width="2" height="1" fill="#f472b6" opacity="0.6" />
            <rect x="11" y="8" width="2" height="1" fill="#f472b6" opacity="0.6" />
          </g>
        </>
      )}

      {/* 2. MECHANICAL OWL EVOLUTION */}
      {evolution === 'owl' && (
        <>
          {/* Owl Body & Horns */}
          <path
            d="M 3 2 H 5 V 3 H 11 V 2 H 13 V 5 H 14 V 12 H 13 V 13 H 3 V 12 H 2 V 5 H 3 Z"
            fill="#d97706"
          />
          {/* Chest belly plate */}
          <path d="M 5 8 H 11 V 12 H 5 Z" fill="#b45309" />
          {/* Eyes (Goggles) */}
          <g transform={`translate(${eyeOffset}, 0)`}>
            <rect x="4" y="5" width="3" height="3" fill="#0284c7" />
            <rect x="9" y="5" width="3" height="3" fill="#0284c7" />
            {!isBlinking ? (
              <>
                <rect x="5" y="6" width="1" height="1" fill="#e0f2fe" />
                <rect x="10" y="6" width="1" height="1" fill="#e0f2fe" />
              </>
            ) : (
              <>
                <rect x="4" y="6" width="3" height="1" fill="#0369a1" />
                <rect x="9" y="6" width="3" height="1" fill="#0369a1" />
              </>
            )}
            {/* Beak */}
            <polygon points="8,7 7,9 9,9" fill="#f59e0b" />
          </g>
        </>
      )}

      {/* 3. CYBER FOX EVOLUTION */}
      {evolution === 'fox' && (
        <>
          {/* Fox Ears */}
          <polygon points="2,1 5,1 4,4 2,4" fill="#ea580c" />
          <polygon points="11,1 14,1 14,4 12,4" fill="#ea580c" />
          {/* Head & Body */}
          <path
            d="M 4 4 H 12 V 5 H 14 V 10 H 13 V 13 H 3 V 10 H 2 V 5 H 4 Z"
            fill="#f97316"
          />
          {/* White muzzle cheeks */}
          <rect x="3" y="9" width="3" height="3" fill="#ffffff" />
          <rect x="10" y="9" width="3" height="3" fill="#ffffff" />
          {/* Cyber Visor Eyes */}
          <g transform={`translate(${eyeOffset}, 0)`}>
            <rect x="4" y="6" width="8" height="2" fill="#06b6d4" />
            {!isBlinking && (
              <>
                <rect x="5" y="6" width="2" height="1" fill="#e0f2fe" />
                <rect x="9" y="6" width="2" height="1" fill="#e0f2fe" />
              </>
            )}
            {/* Black Nose */}
            <rect x="7" y="9" width="2" height="1" fill="#18181b" />
          </g>
        </>
      )}

      {/* 4. STONE GARGOYLE EVOLUTION */}
      {evolution === 'gargoyle' && (
        <>
          {/* Stone Wings */}
          <polygon points="1,3 3,1 4,7 1,8" fill="#475569" />
          <polygon points="15,3 13,1 12,7 15,8" fill="#475569" />
          {/* Gargoyle Horns & Head */}
          <path
            d="M 4 1 H 6 V 3 H 10 V 1 H 12 V 4 H 13 V 12 H 3 V 4 H 4 Z"
            fill="#64748b"
          />
          {/* Chest Runic engraving */}
          <rect x="7" y="8" width="2" height="3" fill="#94a3b8" />
          {/* Glowing Purple Runic Eyes */}
          <g transform={`translate(${eyeOffset}, 0)`}>
            {!isBlinking ? (
              <>
                <rect x="5" y="5" width="2" height="2" fill="#c084fc" />
                <rect x="9" y="5" width="2" height="2" fill="#c084fc" />
                <rect x="5" y="5" width="1" height="1" fill="#ffffff" />
                <rect x="9" y="5" width="1" height="1" fill="#ffffff" />
              </>
            ) : (
              <>
                <rect x="5" y="6" width="2" height="1" fill="#7e22ce" />
                <rect x="9" y="6" width="2" height="1" fill="#7e22ce" />
              </>
            )}
          </g>
        </>
      )}

      {/* ACCESSORIES OVERLAY */}
      {accessory === 'monocle' && (
        <g>
          <circle cx="10" cy="7" r="2.5" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
          <line x1="12" y1="8" x2="13" y2="11" stroke="#f59e0b" strokeWidth="0.6" />
        </g>
      )}

      {accessory === 'crown' && (
        <polygon points="4,1 6,3 8,1 10,3 12,1 12,3 4,3" fill="#fbbf24" stroke="#d97706" strokeWidth="0.4" />
      )}

      {accessory === 'headphones' && (
        <g>
          <path d="M 2 4 Q 8 0 14 4" fill="none" stroke="#0ea5e9" strokeWidth="1.2" />
          <rect x="1" y="4" width="2" height="4" rx="1" fill="#0284c7" />
          <rect x="13" y="4" width="2" height="4" rx="1" fill="#0284c7" />
        </g>
      )}

      {/* Nightcap if past midnight and no crown */}
      {isPastMidnight && accessory !== 'crown' && (
        <g>
          <polygon points="5,2 11,0 12,2" fill="#818cf8" />
          <circle cx="12" cy="2" r="1" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
};
