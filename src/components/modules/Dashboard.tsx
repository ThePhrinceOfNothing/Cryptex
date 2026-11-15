import React, { useMemo, useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Clock, 
  FileText, 
  CheckSquare, 
  Wallet, 
  Lock, 
  ChevronRight, 
  Zap, 
  Smile, 
  Award, 
  Sparkles, 
  TrendingUp, 
  Flame, 
  CheckCircle2,
  Key,
  Gamepad2,
  KeyRound,
  EyeOff,
  Hourglass,
  Moon,
  Coins,
  Terminal
} from 'lucide-react';
import { calculatePasswordStrength } from '../../lib/passwordUtils';
import { motion } from 'framer-motion';
import { calculateLevelInfo, BADGE_DEFINITIONS, EVOLUTION_NAMES, addExperience } from '../../lib/gamification';
import type { BadgeIconName } from '../../lib/gamification';
import { playCoinClink, playKeyClick } from '../../lib/soundEngine';
import type { MoodLogEntry } from '../../lib/vault';

const BADGE_ICONS: Record<BadgeIconName, React.ElementType> = {
  key: Key,
  scroll: FileText,
  shield: ShieldCheck,
  timer: Clock,
  gamepad: Gamepad2,
  lock: KeyRound,
  'eye-off': EyeOff,
  hourglass: Hourglass,
  moon: Moon,
  coins: Coins,
  terminal: Terminal,
  sparkles: Sparkles,
};

export const Dashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { vaultData, updateVaultData } = useVault();

  // Mood Check-in state
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedEnergy, setSelectedEnergy] = useState<number>(4);
  const [selectedMood, setSelectedMood] = useState<string>('Focused');
  const [moodNote, setMoodNote] = useState<string>('');
  const [isLoggingMood, setIsLoggingMood] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const securityScore = useMemo(() => {
    if (!vaultData?.credentials || vaultData.credentials.length === 0) return { score: 100, weak: 0, total: 0 };
    let score = 0;
    let weakCount = 0;
    vaultData.credentials.forEach(cred => {
      if (!cred.password) {
        score += 100;
        return;
      }
      const strength = calculatePasswordStrength(cred.password);
      if (strength === 'strong') score += 100;
      else if (strength === 'good') score += 75;
      else if (strength === 'fair') { score += 50; weakCount++; }
      else { score += 25; weakCount++; }
    });
    return {
      score: Math.round(score / vaultData.credentials.length),
      weak: weakCount,
      total: vaultData.credentials.length
    };
  }, [vaultData?.credentials]);

  // Heatmap generation (last 90 days)
  const heatmapCells = useMemo(() => {
    const cells = [];
    const today = new Date();
    const log = vaultData?.activityLog || {};
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = log[dateStr] || 0;
      cells.push({ dateStr, count });
    }
    return cells;
  }, [vaultData?.activityLog]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: vaultData?.settings?.currency || 'USD' 
    }).format(amount);
  };

  const balance = useMemo(() => {
    if (!vaultData?.transactions) return 0;
    return vaultData.transactions.reduce((acc, t) => t.type === 'in' ? acc + t.amount : acc - t.amount, 0);
  }, [vaultData?.transactions]);

  // Gamification & Badges
  const gamification = vaultData?.gamification;
  const levelInfo = useMemo(() => calculateLevelInfo(gamification?.xp || 0), [gamification?.xp]);
  const unlockedBadgesSet = useMemo(() => new Set(gamification?.unlockedBadges || ['first_vault']), [gamification?.unlockedBadges]);

  // Mood Logs Check
  const todayMoodLog: MoodLogEntry | undefined = vaultData?.moodLogs?.[todayStr];
  const pastMoodLogs = useMemo(() => {
    const logs = vaultData?.moodLogs || {};
    const entries: { date: string; entry: MoodLogEntry }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      if (logs[dStr]) {
        entries.push({ date: dStr, entry: logs[dStr] });
      } else {
        entries.push({ date: dStr, entry: { rating: 0, mood: 'None', timestamp: d.getTime() } });
      }
    }
    return entries;
  }, [vaultData?.moodLogs]);

  const handleSaveMood = async () => {
    setIsLoggingMood(true);
    playCoinClink();
    const entry: MoodLogEntry = {
      rating: selectedEnergy,
      mood: selectedMood,
      note: moodNote.trim() || undefined,
      timestamp: Date.now(),
    };

    const newMoodLogs = { ...(vaultData?.moodLogs || {}), [todayStr]: entry };
    const xpResult = addExperience(vaultData?.gamification, 15, vaultData?.settings?.soundEnabled ?? true);

    await updateVaultData({
      moodLogs: newMoodLogs,
      gamification: xpResult.newState,
    });
    setIsLoggingMood(false);
  };

  const moodOptions = ['Focused', 'Energetic', 'Calm', 'Tired', 'Stressed'];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] p-4 sm:p-6 lg:p-8 overflow-y-auto">
      
      {/* Header: Greeting */}
      <div className="mb-6 shrink-0">
        <motion.h1 
          initial={{ opacity: 0, y: 6 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight text-balance"
        >
          {greeting}, {vaultData?.settings?.workspaceName || 'User'}
        </motion.h1>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Here is a quick overview of your workspace and companion stats.</p>
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-6 shrink-0">
        <ActionButton icon={Lock} label="New Entry" onClick={() => onNavigate?.('My Vault')} />
        <ActionButton icon={FileText} label="New Note" onClick={() => onNavigate?.('Notes')} />
        <ActionButton icon={CheckSquare} label="New Task" onClick={() => onNavigate?.('Tasks')} />
        <ActionButton icon={Wallet} label="Add Transaction" onClick={() => onNavigate?.('Income')} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
        
        {/* Companion Progression Card */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs flex flex-col justify-between group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Companion Sync</h3>
            </div>
            <span className="text-[11px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
              Level {levelInfo.level}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {EVOLUTION_NAMES[levelInfo.evolution]}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Next evolution unlocks at Level {levelInfo.level < 5 ? 5 : levelInfo.level < 10 ? 10 : levelInfo.level < 20 ? 20 : 50}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100 tabular-nums">
                {levelInfo.xpInCurrentLevel} / {levelInfo.xpForNextLevel} XP
              </span>
              <p className="text-[10px] text-gray-400">Total: {levelInfo.xp} XP</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>XP Progress</span>
              <span>{levelInfo.progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Vault Security Score */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs flex flex-col justify-between group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider truncate">Security</h3>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-zinc-500 tabular-nums shrink-0">{securityScore.total} vault items</span>
          </div>

          <div className="flex items-center justify-center py-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path 
                  className="text-gray-100 dark:text-zinc-800" 
                  strokeWidth="3.2" 
                  stroke="currentColor" 
                  fill="none" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                />
                <path 
                  className={securityScore.score >= 80 ? "text-emerald-500" : securityScore.score >= 50 ? "text-amber-500" : "text-rose-500"} 
                  strokeDasharray={`${securityScore.score}, 100`} 
                  strokeWidth="3.2" 
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="none" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{securityScore.score}</span>
                <span className="text-[10px] text-gray-500 dark:text-zinc-500">out of 100</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-gray-100 dark:border-[#222]">
            {securityScore.weak > 0 ? (
              <p className="text-xs text-rose-500 font-medium flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.75} /> 
                <span>{securityScore.weak} weak password{securityScore.weak === 1 ? '' : 's'}</span>
              </p>
            ) : (
              <p className="text-xs text-emerald-500 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} /> 
                <span>Credentials hardened</span>
              </p>
            )}
          </div>
        </div>

        {/* Total Balance / Finances */}
        <div 
          className="col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs flex flex-col justify-between group cursor-pointer hover:border-gray-300 dark:hover:border-zinc-700 transition-colors" 
          onClick={() => onNavigate?.('Income')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Total Balance</h3>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" strokeWidth={1.75} />
          </div>

          <div className="my-auto py-2">
            <p className="text-2xl font-bold tracking-tight tabular-nums text-gray-900 dark:text-white">{formatCurrency(balance)}</p>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-[#222]">
            <p className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1 group-hover:text-gray-800 dark:group-hover:text-zinc-300 transition-colors">
              <span>Open financial ledger</span>
            </p>
          </div>
        </div>

        {/* Daily Mood & Energy Check-in + Sparkline */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs flex flex-col justify-between group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                Daily Energy & Mood Check-In
              </h3>
            </div>
            {todayMoodLog && (
              <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logged Today
              </span>
            )}
          </div>

          {todayMoodLog ? (
            <div className="py-2 space-y-3">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                    <Zap className="w-5 h-5 fill-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      Energy Level {todayMoodLog.rating}/5 &middot; {todayMoodLog.mood}
                    </p>
                    {todayMoodLog.note && (
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        "{todayMoodLog.note}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 7-day sparkline */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">7-Day Energy Trend</p>
                <div className="flex items-end gap-2 h-10 pt-1">
                  {pastMoodLogs.map((p, idx) => {
                    const heightPercent = p.entry.rating > 0 ? (p.entry.rating / 5) * 100 : 8;
                    const isToday = idx === pastMoodLogs.length - 1;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className={`w-full rounded-xs transition-all ${
                            p.entry.rating > 0
                              ? isToday ? 'bg-accent' : 'bg-amber-400/80 dark:bg-amber-500/80'
                              : 'bg-gray-200 dark:bg-zinc-800'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                          title={`${p.date}: ${p.entry.mood} (${p.entry.rating}/5)`}
                        />
                        <span className="text-[9px] text-gray-400 font-mono">
                          {p.date.split('-').slice(1).join('/')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-3">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                5-second check-in: rate your focus and energy to earn +15 XP.
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 w-16">Energy:</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => {
                          playKeyClick();
                          setSelectedEnergy(lvl);
                        }}
                        className={`w-7 h-7 rounded flex items-center justify-center text-xs font-semibold border transition-all ${
                          selectedEnergy >= lvl
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-500'
                            : 'bg-gray-100 dark:bg-zinc-800 border-transparent text-gray-400'
                        }`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${selectedEnergy >= lvl ? 'fill-amber-500' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 w-16">Mood:</span>
                  <div className="flex flex-wrap gap-1">
                    {moodOptions.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          playKeyClick();
                          setSelectedMood(m);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          selectedMood === m
                            ? 'bg-accent text-white border-accent'
                            : 'bg-gray-50 dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveMood}
                  disabled={isLoggingMood}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:opacity-95 shadow-xs transition-transform active:scale-[0.98]"
                >
                  Log Daily Mood (+15 XP)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Activity Heatmap (90 Days) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Activity Heatmap (90 Days)</h3>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-zinc-500">Total actions</span>
          </div>

          <div className="flex-1 flex items-center">
            <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-1 max-w-full">
              {heatmapCells.map((cell, i) => (
                <div 
                  key={i} 
                  title={`${cell.dateStr}: ${cell.count} actions`}
                  className={`w-2.5 h-2.5 rounded-[2px] transition-colors ${
                    cell.count === 0 ? 'bg-gray-100 dark:bg-zinc-800' :
                    cell.count < 3 ? 'bg-zinc-400 dark:bg-zinc-600' :
                    cell.count < 6 ? 'bg-zinc-600 dark:bg-zinc-400' : 'bg-gray-900 dark:bg-zinc-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-[#222] text-[10px] text-gray-400 dark:text-zinc-600">
            <span>90 days ago</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="w-2 h-2 rounded-[2px] bg-gray-100 dark:bg-zinc-800" />
              <div className="w-2 h-2 rounded-[2px] bg-zinc-400 dark:bg-zinc-600" />
              <div className="w-2 h-2 rounded-[2px] bg-zinc-900 dark:bg-zinc-100" />
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </div>

        {/* Pixel Achievement Badges Showcase */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                Achievements ({unlockedBadgesSet.size} / {BADGE_DEFINITIONS.length})
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">Retro Badges</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {BADGE_DEFINITIONS.map((badge) => {
              const isUnlocked = unlockedBadgesSet.has(badge.id);
              const BadgeIcon = BADGE_ICONS[badge.icon] || Award;
              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    isUnlocked
                      ? 'bg-accent/5 border-accent/30 dark:bg-accent/10 dark:border-accent/30 text-gray-900 dark:text-zinc-100 shadow-2xs'
                      : 'bg-gray-50/60 dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800/80 text-gray-400 dark:text-zinc-600 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] uppercase font-mono font-bold tracking-wider ${isUnlocked ? 'text-accent' : 'text-gray-400 dark:text-zinc-500'}`}>
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </span>
                    <BadgeIcon className={`w-3.5 h-3.5 ${isUnlocked ? 'text-accent' : 'text-gray-400 dark:text-zinc-500'}`} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight text-gray-900 dark:text-zinc-100">{badge.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-zinc-800/60 rounded-md text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors shadow-2xs active:scale-[0.97]"
  >
    <Icon size={14} strokeWidth={1.75} className="text-zinc-500 dark:text-zinc-400" />
    <span>{label}</span>
  </button>
);
