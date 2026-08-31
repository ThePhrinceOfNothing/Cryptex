import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { Plus, Download, Trash2, Edit3, PieChart, TrendingUp, DollarSign, Wallet, Tag, Repeat, ListPlus, X, Calendar as CalIcon } from 'lucide-react';
import type { Transaction, TransactionSplit } from '../lib/vault';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';

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
  const budgets = vaultData?.budgets || [];
  const curr = CURRENCY_SYMBOLS[vaultData?.settings?.currency || 'USD'] || '$';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  // --- Data Crunching ---
  const { totalBalance, income, expense, chartData, pieData } = useMemo(() => {
    let bal = 0;
    let inc = 0;
    let exp = 0;
    
    // Sort transactions by date ascending for the chart
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
        
        // Add to pie chart
        if (tx.splits && tx.splits.length > 0) {
          tx.splits.forEach(s => {
            expenseCategories.set(s.category, (expenseCategories.get(s.category) || 0) + s.amount);
          });
        } else {
          expenseCategories.set(tx.category || 'Uncategorized', (expenseCategories.get(tx.category || 'Uncategorized') || 0) + tx.amount);
        }
      }
      chartMap.set(month, bal); // snapshot balance over time
    });

    const cData = Array.from(chartMap.entries()).map(([month, balance]) => ({ name: month, balance }));
    const pData = Array.from(expenseCategories.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { totalBalance: bal, income: inc, expense: exp, chartData: cData, pieData: pData };
  }, [transactions]);

  // --- Actions ---
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
    <div className="flex flex-col h-full bg-[#fafafa] dark:bg-[#0c0c0e] overflow-hidden">
      
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to permanently erase this transaction? This will affect your balance charts."
      />

      {/* Header */}
      <div className="h-20 shrink-0 border-b border-gray-200 dark:border-white/10 px-8 flex items-center justify-between bg-white dark:bg-[#121214]">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-3">
          <DollarSign className="text-accent" /> Financial Ledger
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => { setEditingTx(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Top KPI Cards */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-center">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Net Worth</span>
            <span className={`text-4xl font-bold tracking-tight ${totalBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>
              {totalBalance >= 0 ? '' : '-'}{curr}{Math.abs(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-center">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Inflow</span>
            <span className="text-4xl font-bold tracking-tight text-emerald-500">
              +{curr}{income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-center">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Outflow</span>
            <span className="text-4xl font-bold tracking-tight text-red-500">
              -{curr}{expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-6 h-80">
          <div className="col-span-2 bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={16}/> Net Worth Trend</h3>
            <div className="flex-1 min-h-0 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val < 0 ? `-${curr}${Math.abs(val)}` : `${curr}${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }} formatter={(value: any) => value < 0 ? `-${curr}${Math.abs(value).toFixed(2)}` : `${curr}${value.toFixed(2)}`} />
                    <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#18181b' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">Not enough data to plot trend</div>
              )}
            </div>
          </div>
          
          <div className="col-span-1 bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><PieChart size={16}/> Expenses by Category</h3>
            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `${curr}${val.toFixed(2)}`} contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 text-sm">No expenses logged</div>
              )}
            </div>
            {pieData.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {pieData.slice(0,4).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    {d.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Transaction Ledger</h3>
          </div>
          {transactions.length === 0 ? (
             <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
               <DollarSign size={48} className="opacity-20" />
               <p>Your ledger is completely empty.</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-white/10">
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Description</th>
                    <th className="px-6 py-4 font-semibold">Category / Splits</th>
                    <th className="px-6 py-4 font-semibold">Tags</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {transactions.slice().reverse().map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {tx.date.split('T')[0]}
                        {tx.recurring && tx.recurring !== 'none' && <Repeat size={12} className="inline ml-2 text-accent" title={`Recurs ${tx.recurring}`} />}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{tx.description || 'Untitled'}</p>
                        {tx.memo && <p className="text-xs text-gray-500 mt-1">{tx.memo}</p>}
                      </td>
                      <td className="px-6 py-4">
                        {tx.splits && tx.splits.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {tx.splits.map((s, i) => (
                              <span key={i} className="text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2 py-0.5 rounded-full inline-flex w-fit">
                                {s.category}: {curr}{s.amount}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">
                            {tx.category || 'Uncategorized'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {tx.tags?.map(t => (
                            <span key={t} className="text-[10px] uppercase font-bold text-gray-400 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Tag size={8}/> {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${tx.type === 'in' ? 'text-emerald-500' : 'text-gray-900 dark:text-zinc-100'}`}>
                        {tx.type === 'in' ? '+' : '-'}{curr}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingTx(tx); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-md transition-colors">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => { setTxToDelete(tx.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors">
                            <Trash2 size={14} />
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

      {/* Transaction Entry Modal - Needs to be abstracted for size, but keeping inline for now */}
      <AnimatePresence>
        {isModalOpen && (
          <TransactionModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingTx(null); }}
            tx={editingTx}
            curr={curr}
            onSave={async (newTx) => {
              if (editingTx) {
                await updateVaultData({ transactions: transactions.map(t => t.id === newTx.id ? newTx : t) });
              } else {
                await updateVaultData({ transactions: [...transactions, newTx] });
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
const TransactionModal: React.FC<{ isOpen: boolean, onClose: () => void, tx: Transaction | null, curr: string, onSave: (t: Transaction) => void }> = ({ isOpen, onClose, tx, curr, onSave }) => {
  const [type, setType] = useState<'in'|'out'>(tx?.type || 'out');
  const [amount, setAmount] = useState(tx?.amount.toString() || '');
  const [desc, setDesc] = useState(tx?.description || '');
  const [date, setDate] = useState(tx?.date.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(tx?.category || 'Groceries');
  const [recurring, setRecurring] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>(tx?.recurring || 'none');
  const [memo, setMemo] = useState(tx?.memo || '');

  // Split Receipts
  const [isSplit, setIsSplit] = useState(tx && tx.splits && tx.splits.length > 0 ? true : false);
  const [splits, setSplits] = useState<TransactionSplit[]>(tx?.splits || []);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount))) return;
    
    // Auto-calculate split total if split is active
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-lg bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 shrink-0">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-zinc-100">{tx ? 'Edit Transaction' : 'New Transaction'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"><X size={18} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
            <button onClick={() => setType('out')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${type === 'out' ? 'bg-white dark:bg-[#18181b] text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Expense</button>
            <button onClick={() => setType('in')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${type === 'in' ? 'bg-white dark:bg-[#18181b] text-emerald-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Income</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{curr}</span>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSplit} className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50" placeholder="0.00" />
              </div>
              {isSplit && <p className="text-[10px] text-accent mt-1">Calculated from splits below</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase">Date</label>
              <div className="relative">
                <CalIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase">Description / Merchant</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent" placeholder="e.g. Walmart, Spotify, Salary" />
          </div>

          {!isSplit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent">
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
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Recurring</label>
                <select value={recurring} onChange={e => setRecurring(e.target.value as any)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          )}

          {/* Split Receipt Toggle & UI */}
          <div className="pt-4 border-t border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><ListPlus size={16}/> Split Receipt</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Divide this purchase across multiple categories.</p>
              </div>
              <button onClick={() => { setIsSplit(!isSplit); if (!isSplit && splits.length===0) setSplits([{id: crypto.randomUUID(), category: 'Groceries', amount: 0}]); }} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${isSplit ? 'bg-accent' : 'bg-gray-300 dark:bg-zinc-700'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isSplit ? 'translate-x-2' : '-translate-x-2'}`}/>
              </button>
            </div>
            
            {isSplit && (
              <div className="space-y-3 bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                {splits.map((split, i) => (
                  <div key={split.id} className="flex items-center gap-2">
                    <select value={split.category} onChange={e => setSplits(splits.map(s => s.id === split.id ? {...s, category: e.target.value} : s))} className="flex-1 px-3 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent">
                      <option value="Groceries">Groceries</option>
                      <option value="Dining">Dining</option>
                      <option value="Home">Home</option>
                      <option value="Electronics">Electronics</option>
                    </select>
                    <div className="relative w-32 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{curr}</span>
                      <input type="number" step="0.01" value={split.amount || ''} onChange={e => setSplits(splits.map(s => s.id === split.id ? {...s, amount: Number(e.target.value)} : s))} className="w-full pl-6 pr-2 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-accent" placeholder="0.00" />
                    </div>
                    <button onClick={() => setSplits(splits.filter(s => s.id !== split.id))} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                  </div>
                ))}
                <button onClick={() => setSplits([...splits, {id: crypto.randomUUID(), category: 'Other', amount: 0}])} className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"><Plus size={12}/> Add Line Item</button>
              </div>
            )}
          </div>

        </div>

        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors shadow-md">Save Transaction</button>
        </div>

      </motion.div>
    </div>
  );
};



