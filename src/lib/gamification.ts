import type { PetGamificationState, PetEvolution, PetAccessory } from './vault';
import { playLevelUp } from './soundEngine';

export type BadgeIconName =
  | 'key'
  | 'scroll'
  | 'shield'
  | 'timer'
  | 'gamepad'
  | 'lock'
  | 'eye-off'
  | 'hourglass'
  | 'moon'
  | 'coins'
  | 'terminal'
  | 'sparkles';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'vault' | 'focus' | 'minigame' | 'crypto' | 'secret';
  icon: BadgeIconName;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_vault', name: 'First Key', description: 'Initialized your sovereign vault', category: 'vault', icon: 'key' },
  { id: 'centurion', name: 'Centurion', description: 'Penned 100 encrypted notes', category: 'vault', icon: 'scroll' },
  { id: 'fortress', name: 'Fortress', description: 'Maintained strong credential security', category: 'vault', icon: 'shield' },
  { id: 'pomodoro_master', name: 'Deep Focus', description: 'Completed a full Pomodoro session', category: 'focus', icon: 'timer' },
  { id: 'snake_champ', name: 'Cyber Viper', description: 'Scored 5 or more in Cyber Snake', category: 'minigame', icon: 'gamepad' },
  { id: 'locksmith', name: 'Locksmith', description: 'Picked all lock pins in reflex test', category: 'minigame', icon: 'lock' },
  { id: 'shadow_agent', name: 'Shadow Agent', description: 'Embedded a secret payload in PNG steganography', category: 'secret', icon: 'eye-off' },
  { id: 'time_capsuleer', name: 'Time Capsuleer', description: 'Sealed a note with a future countdown lock', category: 'crypto', icon: 'hourglass' },
  { id: 'night_owl', name: 'Night Owl', description: 'Secured the vault past midnight', category: 'secret', icon: 'moon' },
  { id: 'coin_hoarder', name: 'Ledger Master', description: 'Recorded 25 financial transactions', category: 'vault', icon: 'coins' },
  { id: 'terminal_junkie', name: 'Cyberpunk', description: 'Activated Terminal Hacker CRT mode', category: 'secret', icon: 'terminal' },
  { id: 'evolution_master', name: 'Symbiosis', description: 'Evolved your companion to Level 10+', category: 'focus', icon: 'sparkles' },
];

export const EVOLUTION_NAMES: Record<PetEvolution, string> = {
  ghost: 'Spectral Wisp',
  owl: 'Mechanical Owl',
  fox: 'Cyber Fox',
  gargoyle: 'Stone Gargoyle',
};

export function getEvolutionForLevel(level: number): PetEvolution {
  if (level >= 20) return 'gargoyle';
  if (level >= 10) return 'fox';
  if (level >= 5) return 'owl';
  return 'ghost';
}

export function getAvailableAccessories(level: number): PetAccessory[] {
  const list: PetAccessory[] = ['none'];
  if (level >= 3) list.push('monocle');
  if (level >= 7) list.push('headphones');
  if (level >= 12) list.push('detective');
  if (level >= 16) list.push('crown');
  return list;
}

export function calculateLevelInfo(xp: number) {
  const XP_PER_LEVEL = 100;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelBaseXP = (level - 1) * XP_PER_LEVEL;
  const nextLevelXP = level * XP_PER_LEVEL;
  const xpInCurrentLevel = xp - currentLevelBaseXP;
  const progressPercent = Math.min(100, Math.floor((xpInCurrentLevel / XP_PER_LEVEL) * 100));

  return {
    level,
    xp,
    xpInCurrentLevel,
    xpForNextLevel: XP_PER_LEVEL,
    progressPercent,
    currentLevelBaseXP,
    nextLevelXP,
    evolution: getEvolutionForLevel(level),
  };
}

export function createInitialGamificationState(): PetGamificationState {
  return {
    xp: 0,
    level: 1,
    evolution: 'ghost',
    accessory: 'none',
    unlockedBadges: ['first_vault'],
    streakDays: 1,
    lastDailyStreak: new Date().toISOString().split('T')[0],
  };
}

export function addExperience(
  currentState: PetGamificationState | undefined,
  amount: number,
  soundEnabled = true
): {
  newState: PetGamificationState;
  leveledUp: boolean;
  newLevel: number;
  newEvolution?: PetEvolution;
} {
  const current = currentState || createInitialGamificationState();
  const newXp = (current.xp || 0) + amount;
  const oldLevelInfo = calculateLevelInfo(current.xp || 0);
  const newLevelInfo = calculateLevelInfo(newXp);

  const leveledUp = newLevelInfo.level > oldLevelInfo.level;
  const newEvolution = newLevelInfo.evolution !== current.evolution ? newLevelInfo.evolution : undefined;

  if (leveledUp && soundEnabled) {
    playLevelUp();
  }

  const newState: PetGamificationState = {
    ...current,
    xp: newXp,
    level: newLevelInfo.level,
    evolution: newLevelInfo.evolution,
    unlockedBadges: current.unlockedBadges || ['first_vault'],
  };

  if (newLevelInfo.level >= 10 && !newState.unlockedBadges.includes('evolution_master')) {
    newState.unlockedBadges.push('evolution_master');
  }

  return {
    newState,
    leveledUp,
    newLevel: newLevelInfo.level,
    newEvolution,
  };
}

export function unlockBadge(
  currentState: PetGamificationState | undefined,
  badgeId: string
): { newState: PetGamificationState; newlyUnlocked: boolean } {
  const current = currentState || createInitialGamificationState();
  const unlocked = new Set(current.unlockedBadges || []);

  if (unlocked.has(badgeId)) {
    return { newState: current, newlyUnlocked: false };
  }

  unlocked.add(badgeId);
  return {
    newState: {
      ...current,
      unlockedBadges: Array.from(unlocked),
    },
    newlyUnlocked: true,
  };
}
