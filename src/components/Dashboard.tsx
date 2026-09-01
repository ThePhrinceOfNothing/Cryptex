import React, { useMemo, useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { Shield, ShieldAlert, ShieldCheck, Activity, Clock, FileText, CheckSquare, Wallet, Lock, ChevronRight } from 'lucide-react';
import { calculatePasswordStrength } from '../lib/passwordUtils';
import { motion } from 'framer-motion';

const quotes = [
  "Stay focused and never give up.",
  "Your digital life, secured.",
  "Productivity is being able to do things that you were never able to do before.",
  "Focus on being productive instead of busy.",
  "Security is a process, not a product."
];

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

  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  const securityScore = useMemo(() => {
    if (!vaultData?.credentials || vaultData.credentials.length === 0) return { score: 100, weak: 0, total: 0 };
    let score = 0;
    let weakCount = 0;
    vaultData.credentials.forEach(cred => {
      if (!cred.password) {
        score += 100; // Custom field only
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
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0c0e] p-6 lg:p-10 overflow-y-auto">
      
      {/* Header: Cyber Clock & Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 shrink-0">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
          >
            {greeting}, {vaultData?.settings?.workspaceName || 'User'}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-sm text-gray-500 dark:text-zinc-400 mt-2 italic"
          >
            "{randomQuote}"
          </motion.p>
        </div>
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 px-6 py-3 rounded-2xl shadow-sm">
          <Clock className="w-5 h-5 text-accent animate-pulse" />
          <span className="text-2xl font-mono font-bold tracking-widest text-gray-900 dark:text-zinc-100">
            {time.toLocaleTimeString([], { hour12: true })}
          </span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap gap-3 mb-10 shrink-0">
        <ActionButton icon={Lock} label="New Entry" onClick={() => onNavigate?.('My Vault')} />
        <ActionButton icon={FileText} label="New Note" onClick={() => onNavigate?.('Notes')} />
        <ActionButton icon={CheckSquare} label="New Task" onClick={() => onNavigate?.('Tasks')} />
        <ActionButton icon={Wallet} label="Add Transaction" onClick={() => onNavigate?.('Income')} />
      </div>

      {/* Masonry Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
        
        {/* Vault Security Gauge */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm flex flex-col justify-between group hover:border-accent/50 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Vault Security</h3>
          </div>
          <div className="flex items-center justify-center flex-1 py-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path className="text-gray-100 dark:text-zinc-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path 
                  className={securityScore.score > 80 ? "text-green-500" : securityScore.score > 50 ? "text-yellow-500" : "text-red-500"} 
                  strokeDasharray={`${securityScore.score}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono text-gray-900 dark:text-white">{securityScore.score}</span>
              </div>
            </div>
          </div>
          <div className="text-center mt-2">
            {securityScore.weak > 0 ? (
              <p className="text-xs text-red-500 font-medium flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3" /> {securityScore.weak} weak password{securityScore.weak === 1 ? '' : 's'}</p>
            ) : (
              <p className="text-xs text-green-500 font-medium flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> All passwords are strong</p>
            )}
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm group hover:border-accent/50 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-zinc-500">{vaultData?.credentials?.length || 0} Total Items</span>
          </div>
          <div className="flex flex-wrap gap-1.5 h-32 content-start">
            {heatmapCells.map((cell, i) => (
              <div 
                key={i} 
                title={`${cell.dateStr}: ${cell.count} actions`}
                className={`w-3 h-3 rounded-sm transition-colors duration-300 ${
                  cell.count === 0 ? 'bg-gray-100 dark:bg-zinc-800' :
                  cell.count < 3 ? 'bg-accent/30' :
                  cell.count < 6 ? 'bg-accent/60' : 'bg-accent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Mini Finances */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-gradient-to-br from-accent to-accent/80 border border-accent p-6 rounded-2xl shadow-lg shadow-accent/20 flex flex-col justify-between text-white group cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => onNavigate?.('Income')}>
          <div className="flex items-center gap-2 mb-4 opacity-90">
            <Wallet className="w-5 h-5" />
            <h3 className="font-semibold">Total Balance</h3>
          </div>
          <div>
            <p className="text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
            <p className="text-sm mt-2 opacity-80 flex items-center gap-1">View ledger <ChevronRight className="w-3 h-3" /></p>
          </div>
        </div>

        {/* Mini Tasks */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm flex flex-col group hover:border-accent/50 transition-colors cursor-pointer" onClick={() => onNavigate?.('Tasks')}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Pending Tasks</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-accent transition-colors" />
          </div>
          <div className="flex-1 space-y-2">
            {(!vaultData?.todos || vaultData.todos.filter(t => !t.completed).length === 0) ? (
              <p className="text-sm text-gray-500 dark:text-zinc-500 italic">No pending tasks. You're all caught up!</p>
            ) : (
              vaultData.todos.filter(t => !t.completed).slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-gray-700 dark:text-zinc-300 truncate">{t.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mini Notes */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm flex flex-col group hover:border-accent/50 transition-colors cursor-pointer" onClick={() => onNavigate?.('Notes')}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Notes</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-accent transition-colors" />
          </div>
          <div className="flex-1 space-y-2">
            {(!vaultData?.notes || vaultData.notes.length === 0) ? (
              <p className="text-sm text-gray-500 dark:text-zinc-500 italic">No notes created yet.</p>
            ) : (
              vaultData.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3).map(n => (
                <div key={n.id} className="flex items-center gap-3 text-sm bg-gray-50 dark:bg-zinc-900 p-2 rounded-md">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-700 dark:text-zinc-300 font-medium truncate">{n.title}</span>
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
  <motion.button 
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 hover:border-accent hover:text-accent rounded-xl text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors shadow-sm"
  >
    <Icon size={16} />
    {label}
  </motion.button>
);


