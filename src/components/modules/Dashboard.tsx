import React, { useMemo, useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { Shield, ShieldAlert, ShieldCheck, Activity, Clock, FileText, CheckSquare, Wallet, Lock, ChevronRight } from 'lucide-react';
import { calculatePasswordStrength } from '../../lib/passwordUtils';
import { motion } from 'framer-motion';

export const Dashboard: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { vaultData } = useVault();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [time]);

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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] p-4 sm:p-6 lg:p-8 overflow-y-auto">
      
      {/* Header: Greeting & Calm System Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 6 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight text-balance"
          >
            {greeting}, {vaultData?.settings?.workspaceName || 'User'}
          </motion.h1>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Here is a quick overview of your secure workspace.</p>
        </div>
        
        <div className="self-start sm:self-auto flex items-center gap-2 bg-gray-50 dark:bg-[#141416] border border-gray-200 dark:border-[#262626] px-3.5 py-1.5 rounded-lg shadow-2xs">
          <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" strokeWidth={1.75} />
          <span className="text-xs font-medium tabular-nums text-gray-800 dark:text-zinc-200">
            {time.toLocaleTimeString([], { hour12: true })}
          </span>
        </div>
      </div>

      {/* Quick Action Bar (Tactile active:scale-97) */}
      <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-6 shrink-0">
        <ActionButton icon={Lock} label="New Entry" onClick={() => onNavigate?.('My Vault')} />
        <ActionButton icon={FileText} label="New Note" onClick={() => onNavigate?.('Notes')} />
        <ActionButton icon={CheckSquare} label="New Task" onClick={() => onNavigate?.('Tasks')} />
        <ActionButton icon={Wallet} label="Add Transaction" onClick={() => onNavigate?.('Income')} />
      </div>

      {/* Responsive Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
        
        {/* Anchor Metric: Vault Security Score (Rule 7) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs flex flex-col justify-between group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Vault Security</h3>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-zinc-500 tabular-nums">{securityScore.total} accounts</span>
          </div>

          <div className="flex items-center justify-center py-3">
            <div className="relative w-28 h-28 flex items-center justify-center">
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
                <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{securityScore.score}</span>
                <span className="text-[10px] text-gray-500 dark:text-zinc-500">out of 100</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-gray-100 dark:border-[#222]">
            {securityScore.weak > 0 ? (
              <p className="text-xs text-rose-500 font-medium flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.75} /> 
                <span>{securityScore.weak} weak password{securityScore.weak === 1 ? '' : 's'} to update</span>
              </p>
            ) : (
              <p className="text-xs text-emerald-500 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} /> 
                <span>All stored passwords look strong</span>
              </p>
            )}
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Activity (90 Days)</h3>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-zinc-500">Updates & entries</span>
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
            <p className="text-3xl font-bold tracking-tight tabular-nums text-gray-900 dark:text-white">{formatCurrency(balance)}</p>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-[#222]">
            <p className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1 group-hover:text-gray-800 dark:group-hover:text-zinc-300 transition-colors">
              <span>Open financial ledger</span>
            </p>
          </div>
        </div>

        {/* Pending Tasks */}
        <div 
          className="col-span-1 md:col-span-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs flex flex-col group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors cursor-pointer" 
          onClick={() => onNavigate?.('Tasks')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Pending Tasks</h3>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" strokeWidth={1.75} />
          </div>

          <div className="flex-1 space-y-2">
            {(!vaultData?.todos || vaultData.todos.filter(t => !t.completed).length === 0) ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 py-3">All tasks completed. You're caught up.</p>
            ) : (
              vaultData.todos.filter(t => !t.completed).slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center gap-2.5 text-xs bg-gray-50 dark:bg-zinc-900/60 p-2 rounded-md border border-gray-100 dark:border-zinc-800/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 shrink-0" />
                  <span className="text-gray-800 dark:text-zinc-200 truncate">{t.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notes (Single instance, clean layout) */}
        <div 
          className="col-span-1 md:col-span-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] p-5 rounded-xl shadow-2xs flex flex-col group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors cursor-pointer" 
          onClick={() => onNavigate?.('Notes')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
              <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Recent Notes</h3>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" strokeWidth={1.75} />
          </div>

          <div className="flex-1 space-y-2">
            {(!vaultData?.notes || vaultData.notes.length === 0) ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 py-3">No notes created yet. Click above to create your first note.</p>
            ) : (
              vaultData.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3).map(n => (
                <div key={n.id} className="flex items-center gap-2.5 text-xs bg-gray-50 dark:bg-zinc-900/60 p-2 rounded-md border border-gray-100 dark:border-zinc-800/80">
                  <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" strokeWidth={1.75} />
                  <span className="text-gray-800 dark:text-zinc-200 font-medium truncate">{n.title || 'Untitled Note'}</span>
                </div>
              ))
            )}
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
