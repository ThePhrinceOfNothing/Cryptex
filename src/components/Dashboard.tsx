import React, { useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { FileText, CheckCircle, TrendingUp } from 'lucide-react';
import { TodoList } from './TodoList';
import { PasswordManager } from './PasswordManager';

export const Dashboard: React.FC = () => {
  const { vaultData } = useVault();

  const totalBalance = useMemo(() => {
    if (!vaultData?.transactions) return 0;
    return vaultData.transactions.reduce((acc, t) => {
      return t.type === 'in' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [vaultData?.transactions]);

  const currency = vaultData?.settings?.currency || 'USD';
  
  const formattedBalance = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency 
  }).format(totalBalance);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214] p-4 sm:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">Overview</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Here's what's happening in your vault.</p>
        </div>
      </div>
      
      {/* Overview Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 shrink-0">
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Pending Tasks</h3>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            {vaultData?.todos?.filter(t => !t.completed).length || 0}
          </p>
        </div>
        
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Total Notes</h3>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            {vaultData?.notes?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 p-4 rounded-xl shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Financial Summary</h3>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            {formattedBalance}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        <TodoList />
        <PasswordManager />
      </div>
    </div>
  );
};
