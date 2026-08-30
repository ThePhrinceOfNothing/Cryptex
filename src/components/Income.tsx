import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import type { Transaction } from '../lib/vault';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from './EmptyState';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export const Income: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const transactions = vaultData?.transactions || [];

  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');

  const totalIn = transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIn - totalOut;

  const currency = vaultData?.settings?.currency || 'USD';
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
  };

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    const grouped = [...transactions].reduce((acc, tx) => {
      if (!acc[tx.date]) acc[tx.date] = 0;
      acc[tx.date] += (tx.type === 'in' ? tx.amount : -tx.amount);
      return acc;
    }, {} as Record<string, number>);

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    let runningBalance = 0;
    return sortedDates.map(date => {
      runningBalance += grouped[date];
      return {
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        balance: runningBalance
      };
    });
  }, [transactions]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!category.trim() || isNaN(parsedAmount)) return;

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      category: category.trim(),
      amount: parsedAmount,
      type
    };

    await updateVaultData({ transactions: [newTx, ...transactions] });
    setAmount('');
    setCategory('');
    setIsAdding(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 h-full bg-white dark:bg-[#121214] flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <DollarSign className="text-accent w-6 h-6" />
            Financial Ledger
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Track your encrypted income and expenses.</p>
        </div>
        <motion.button
          onClick={() => setIsAdding(!isAdding)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Record
        </motion.button>
      </div>

      {/* Summary Boxes */}
      <div className="grid grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Total In</span>
          </div>
          <p className="text-3xl font-semibold text-emerald-600">{formatCurrency(totalIn)}</p>
        </div>
        
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Total Out</span>
          </div>
          <p className="text-3xl font-semibold text-red-500">{formatCurrency(totalOut)}</p>
        </div>

        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Net Balance</span>
          </div>
          <p className="text-3xl font-semibold text-accent">{formatCurrency(netBalance)}</p>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-sm mb-8 shrink-0 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008EFF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#008EFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => formatCurrency(value).replace(/\.\d+$/, '')}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [formatCurrency(Number(value)), 'Balance']}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#008EFF" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-8 p-5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl flex items-end gap-4 shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Category / Description</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Salary, Groceries"
              className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              autoFocus
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'in' | 'out')}
              className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="in">Income (+)</option>
              <option value="out">Expense (-)</option>
            </select>
          </div>
          <motion.button
            type="submit"
            disabled={!category || !amount}
            whileHover={{ scale: (!category || !amount) ? 1 : 1.02 }}
            whileTap={{ scale: (!category || !amount) ? 1 : 0.97 }}
            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-md transition-colors h-[38px]"
          >
            Save
          </motion.button>
        </form>
      )}

      {/* Transactions Table */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm relative">
        <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-white/10 shrink-0">
          <div className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Date</div>
          <div className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider col-span-2">Category</div>
          <div className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider text-right">Amount</div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="absolute inset-0 top-[45px]">
              <EmptyState 
                icon={DollarSign}
                title="No transactions yet"
                subtitle="Your ledger is currently empty. Start tracking your finances by adding your first record."
                actionLabel="Add Record"
                onAction={() => setIsAdding(true)}
              />
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {transactions.map(tx => (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ opacity: { duration: 0.2 }, height: { duration: 0.2 } }}
                >
                  <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-zinc-900 dark:bg-zinc-900/50 transition-colors items-center text-sm">
                    <div className="text-gray-500 dark:text-zinc-500">{new Date(tx.date).toLocaleDateString()}</div>
                    <div className="col-span-2 text-gray-900 dark:text-zinc-100 font-medium">{tx.category}</div>
                    <div className={`text-right font-medium ${tx.type === 'in' ? 'text-emerald-600' : 'text-gray-900 dark:text-zinc-100'}`}>
                      {tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
