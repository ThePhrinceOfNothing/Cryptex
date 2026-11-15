import React, { useState, useMemo } from 'react';
import { useVault } from '../../context/VaultContext';
import { Plus, Download, Trash2, Edit3, TrendingUp, DollarSign, Tag, Repeat, ListPlus, X, Calendar as CalIcon } from 'lucide-react';
import type { Transaction, TransactionSplit } from '../../lib/vault';
import { ConfirmModal } from '../modals/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { playCoinClink } from '../../lib/soundEngine';
import { addExperience, unlockBadge } from '../../lib/gamification';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  PHP: '₱',
  EUR: '€',
  GBP: '£',
  JPY: '¥'
};

export const Income: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const transactions = vaultData?.transactions || [];
  const curr = CURRENCY_SYMBOLS[vaultData?.settings?.currency || 'USD'] || '$';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  // --- Data Calculations ---
  const { totalBalance, income, expense, chartData, pieData } = useMemo(() => {
    let bal = 0;
    let inc = 0;
    let exp = 0;
    
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const chartMap = new Map<string, number>();
    const expenseCategories = new Map<string, number>();

    sorted.forEach(tx => {
      const month = new Date(tx.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      
      if (tx.type === 'in') {
        bal += tx.amount;
        inc += tx.amount;
      } else {
        bal -= tx.amount;
        exp += tx.amount;
        
        if (tx.splits && tx.splits.length > 0) {
          tx.splits.forEach(s => {
            expenseCategories.set(s.category, (expenseCategories.get(s.category) || 0) + s.amount);
          });
        } else {
          expenseCategories.set(tx.category || 'Uncategorized', (expenseCategories.get(tx.category || 'Uncategorized') || 0) + tx.amount);
        }
      }
      chartMap.set(month, bal);
    });

    const cData = Array.from(chartMap.entries()).map(([month, balance]) => ({ name: month, balance }));
    const pData = Array.from(expenseCategories.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { totalBalance: bal, income: inc, expense: exp, chartData: cData, pieData: pData };
  }, [transactions]);

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const header = "Date,Type,Category,Description,Amount,Recurring,Tags,Splits\n";
    const rows = transactions.map(t => {
      const splitsStr = t.splits ? t.splits.map(s => `${s.category}(${curr}${s.amount})`).join('; ') : '';
      return `${t.date},${t.type},${t.category},"${t.description || ''}",${t.amount},${t.recurring || 'none'},"${(t.tags || []).join('|')}", "${splitsStr}"`;
    }).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!txToDelete) return;
    const updated = transactions.filter(t => t.id !== txToDelete);
    await updateVaultData({ transactions: updated });
    setIsDeleteModalOpen(false);
    setTxToDelete(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] overflow-hidden">
      
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? This will update your balance charts."
      />

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-[#262626] px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111113] shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
          <DollarSign size={20} strokeWidth={1.75} className="text-zinc-700 dark:text-zinc-300" />
          <span>Ledger & Finances</span>
        </h1>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={handleExportCSV} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] text-gray-700 dark:text-zinc-300 text-xs font-medium rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs active:scale-[0.97]"
          >
            <Download size={13} strokeWidth={1.75} /> 
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => { setEditingTx(null); setIsModalOpen(true); }} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md transition-colors shadow-2xs active:scale-[0.97]"
          >
            <Plus size={14} strokeWidth={1.75} /> 
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* KPI Cards (Rule 18 Tabular Numbers) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#141416] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#262626] shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Net Worth</span>
            <span className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${totalBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-500'}`}>
              {totalBalance >= 0 ? '' : '-'}{curr}{Math.abs(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white dark:bg-[#141416] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#262626] shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total Inflow</span>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-emerald-500">
              +{curr}{income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white dark:bg-[#141416] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#262626] shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total Outflow</span>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-rose-500">
              -{curr}{expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-[#141416] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#262626] shadow-2xs flex flex-col h-72 sm:h-80">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} strokeWidth={1.75} /> 
              <span>Net Worth Trend</span>
            </h3>
            <div className="flex-1 min-h-0 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33333330" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(val) => `${curr}${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`${curr}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Balance']}
                    />
                    <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-zinc-600">
                  Not enough transaction data to chart trend
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-[#141416] p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#262626] shadow-2xs flex flex-col h-72 sm:h-80">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-3">
              Expenses by Category
            </h3>
            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`${curr}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Spent']}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400 dark:text-zinc-600 text-center">
                  No expense records found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Table with Responsive Horizontal Scroll */}
        <div className="bg-white dark:bg-[#141416] rounded-xl border border-gray-200 dark:border-[#262626] shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-[#262626] flex items-center justify-between">
            <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Transaction Records</h3>
            <span className="text-[11px] text-gray-500 dark:text-zinc-500 tabular-nums">{transactions.length} entries</span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-zinc-600 flex flex-col items-center gap-2 text-xs">
              <DollarSign size={32} className="opacity-20" strokeWidth={1.5} />
              <p>Your ledger is completely empty.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#111113] text-[11px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-[#262626]">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                    <th className="px-4 py-2.5 font-semibold">Category</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {transactions.slice().reverse().map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                        {tx.date.split('T')[0]}
                        {tx.recurring && tx.recurring !== 'none' && <Repeat size={11} className="inline ml-1.5 text-zinc-400" title={`Recurs ${tx.recurring}`} />}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-900 dark:text-zinc-100">{tx.description || 'Untitled'}</p>
                        {tx.memo && <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{tx.memo}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {tx.splits && tx.splits.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {tx.splits.map((s, i) => (
                              <span key={i} className="text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-1.5 py-0.2 rounded w-fit tabular-nums">
                                {s.category}: {curr}{s.amount}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                            {tx.category || 'Uncategorized'}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs font-semibold text-right whitespace-nowrap tabular-nums ${tx.type === 'in' ? 'text-emerald-500' : 'text-gray-900 dark:text-zinc-100'}`}>
                        {tx.type === 'in' ? '+' : '-'}{curr}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingTx(tx); setIsModalOpen(true); }} 
                            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 rounded transition-colors active:scale-[0.95]"
                            title="Edit"
                          >
                            <Edit3 size={13} strokeWidth={1.75} />
                          </button>
                          <button 
                            onClick={() => { setTxToDelete(tx.id); setIsDeleteModalOpen(true); }} 
                            className="p-1 text-gray-400 hover:text-rose-500 rounded transition-colors active:scale-[0.95]"
                            title="Delete"
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <TransactionModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingTx(null); }}
            tx={editingTx}
            curr={curr}
            onSave={async (newTx) => {
              playCoinClink();
              if (editingTx) {
                await updateVaultData({ transactions: transactions.map(t => t.id === newTx.id ? newTx : t) });
              } else {
                const updatedTxs = [...transactions, newTx];
                let gamificationState = vaultData?.gamification;
                if (updatedTxs.length >= 25) {
                  const badgeRes = unlockBadge(gamificationState, 'coin_hoarder');
                  gamificationState = badgeRes.newState;
                }
                const xpResult = addExperience(gamificationState, 10, vaultData?.settings?.soundEnabled ?? true);
                await updateVaultData({ 
                  transactions: updatedTxs,
                  gamification: xpResult.newState
                });
              }
              setIsModalOpen(false);
              setEditingTx(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Transaction Modal Subcomponent ---
const TransactionModal: React.FC<{ isOpen: boolean, onClose: () => void, tx: Transaction | null, curr: string, onSave: (t: Transaction) => void }> = ({ onClose, tx, curr, onSave }) => {
  const [type, setType] = useState<'in'|'out'>(tx?.type || 'out');
  const [amount, setAmount] = useState(tx?.amount.toString() || '');
  const [desc, setDesc] = useState(tx?.description || '');
  const [date, setDate] = useState(tx?.date.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(tx?.category || 'Groceries');
  const [recurring, setRecurring] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>(tx?.recurring || 'none');
  const [memo] = useState(tx?.memo || '');

  const [isSplit, setIsSplit] = useState(tx && tx.splits && tx.splits.length > 0 ? true : false);
  const [splits, setSplits] = useState<TransactionSplit[]>(tx?.splits || []);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount))) return;
    
    let finalAmount = Number(amount);
    if (isSplit && splits.length > 0) {
      finalAmount = splits.reduce((sum, s) => sum + s.amount, 0);
    }

    const newTx: Transaction = {
      id: tx?.id || crypto.randomUUID(),
      type,
      amount: finalAmount,
      description: desc,
      date: new Date(date).toISOString(),
      category: isSplit ? 'Split' : category,
      recurring,
      splits: isSplit ? splits : undefined,
      memo
    };
    onSave(newTx);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-2xs" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-md bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-[#222] shrink-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-zinc-100">{tx ? 'Edit Transaction' : 'New Transaction'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors active:scale-[0.95]"><X size={16} strokeWidth={1.75} /></button>
        </div>
        
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
            <button onClick={() => setType('out')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-[0.98] ${type === 'out' ? 'bg-white dark:bg-[#141416] text-rose-500 shadow-2xs' : 'text-gray-500'}`}>Expense</button>
            <button onClick={() => setType('in')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-[0.98] ${type === 'in' ? 'bg-white dark:bg-[#141416] text-emerald-500 shadow-2xs' : 'text-gray-500'}`}>Income</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Amount</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">{curr}</span>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSplit} className="w-full pl-7 pr-3 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-sm font-bold tabular-nums text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400 disabled:opacity-50" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Date</label>
              <div className="relative">
                <CalIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400 [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Description</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400" placeholder="e.g. Grocery store, Rent" />
          </div>

          {!isSplit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400">
                  <option value="Groceries">Groceries</option>
                  <option value="Dining">Dining</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Housing">Housing</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Health</option>
                  <option value="Salary">Salary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Recurring</label>
                <select value={recurring} onChange={e => setRecurring(e.target.value as any)} className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400">
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          )}

          {/* Split Receipt Toggle */}
          <div className="pt-3 border-t border-gray-100 dark:border-[#222]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5"><ListPlus size={14} strokeWidth={1.75} /> Split Receipt</h4>
                <p className="text-[10px] text-gray-500">Divide across multiple categories</p>
              </div>
              <button onClick={() => { setIsSplit(!isSplit); if (!isSplit && splits.length===0) setSplits([{id: crypto.randomUUID(), category: 'Groceries', amount: 0}]); }} className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors ${isSplit ? 'bg-zinc-900 dark:bg-white' : 'bg-gray-200 dark:bg-zinc-700'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full transition-transform ${isSplit ? 'translate-x-4 bg-white dark:bg-zinc-900' : 'translate-x-0.5 bg-white'}`}/>
              </button>
            </div>
            
            {isSplit && (
              <div className="space-y-2 bg-gray-50 dark:bg-[#111113] p-3 rounded-lg border border-gray-200 dark:border-[#262626]">
                {splits.map((split) => (
                  <div key={split.id} className="flex items-center gap-2">
                    <select value={split.category} onChange={e => setSplits(splits.map(s => s.id === split.id ? {...s, category: e.target.value} : s))} className="flex-1 px-2.5 py-1 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded text-xs focus:outline-none focus:border-zinc-400">
                      <option value="Groceries">Groceries</option>
                      <option value="Dining">Dining</option>
                      <option value="Home">Home</option>
                      <option value="Electronics">Electronics</option>
                    </select>
                    <div className="relative w-24 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{curr}</span>
                      <input type="number" step="0.01" value={split.amount || ''} onChange={e => setSplits(splits.map(s => s.id === split.id ? {...s, amount: Number(e.target.value)} : s))} className="w-full pl-5 pr-2 py-1 bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded text-xs font-medium tabular-nums focus:outline-none focus:border-zinc-400" placeholder="0.00" />
                    </div>
                    <button onClick={() => setSplits(splits.filter(s => s.id !== split.id))} className="p-1 text-gray-400 hover:text-rose-500 transition-colors"><X size={13}/></button>
                  </div>
                ))}
                <button onClick={() => setSplits([...splits, {id: crypto.randomUUID(), category: 'Other', amount: 0}])} className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 active:scale-[0.97] pt-1"><Plus size={12}/> Add Line Item</button>
              </div>
            )}
          </div>

        </div>

        <div className="p-4 border-t border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#111113]/50 flex justify-end gap-2.5 shrink-0">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-[0.97]">Cancel</button>
          <button onClick={handleSave} className="px-4 py-1.5 text-xs font-medium bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-md transition-colors shadow-2xs active:scale-[0.97]">Save Transaction</button>
        </div>

      </motion.div>
    </div>
  );
};
