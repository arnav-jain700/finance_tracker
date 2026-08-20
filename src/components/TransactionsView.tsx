import {
  Transaction,
  CATEGORIES,
  CategoryType,
  CURRENCY_MAP,
  formatCurrency,
  toBaseCurrency,
  fromBaseCurrency,
} from '../store';
import {
  Plus,
  Trash2,
  Edit,
  Filter,
  X,
  ChevronDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Download,
  Calendar,
  Receipt,
  FileText,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subDays,
} from 'date-fns';
import { useState, useMemo } from 'react';
import { CategoryBadge, CategoryIcon } from './CategoryIcon';
import { CsvImportModal } from './CsvImportModal';
import { soundFx } from '../utils/audio';

interface TransactionsViewProps {
  transactions: Transaction[];
  currency: string;
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (updated: Transaction) => void;
  initialModalOpen?: boolean;
  initialType?: Transaction['type'];
  onCloseModal?: () => void;
}

export function TransactionsView({
  transactions,
  currency,
  onAdd,
  onDelete,
  onUpdate,
  initialModalOpen = false,
  initialType = 'expense',
  onCloseModal,
}: TransactionsViewProps) {
  const [showForm, setShowForm] = useState(initialModalOpen);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Advanced Date and Amount Filters
  const [datePreset, setDatePreset] = useState<
    'all' | 'today' | 'this-week' | 'this-month' | 'last-month' | 'last-30' | 'this-year' | 'custom'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [formData, setFormData] = useState<{
    date: string;
    description: string;
    amount: string;
    type: Transaction['type'];
    category: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: initialType,
    category: 'Food & Dining',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    const baseAmount = toBaseCurrency(Number(formData.amount), currency);

    const txData: Omit<Transaction, 'id'> = {
      date: formData.date,
      description: formData.description.trim(),
      amount: baseAmount,
      type: formData.type,
      category: formData.category,
      notes: formData.notes.trim() || undefined,
    };

    if (editingTx) {
      onUpdate({ ...txData, id: editingTx.id });
      setEditingTx(null);
    } else {
      onAdd(txData);
    }

    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'expense',
      category: 'Food & Dining',
      notes: '',
    });
    setShowForm(false);
    if (onCloseModal) onCloseModal();
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    const convertedAmount = fromBaseCurrency(tx.amount, currency);
    setFormData({
      date: tx.date,
      description: tx.description,
      amount: String(convertedAmount.toFixed(2)),
      type: tx.type,
      category: tx.category,
      notes: tx.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      onDelete(id);
    }
  };

  const handleCancel = () => {
    setEditingTx(null);
    setShowForm(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'expense',
      category: 'Food & Dining',
      notes: '',
    });
    if (onCloseModal) onCloseModal();
  };

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => {
        // Search description, category, notes
        const matchesSearch =
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesSearch) return false;

        // Type filter
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;

        // Category filter
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

        // Min & Max Amount Filter
        const converted = fromBaseCurrency(t.amount, currency);
        if (minAmount && converted < parseFloat(minAmount)) return false;
        if (maxAmount && converted > parseFloat(maxAmount)) return false;

        // Date Preset and Range Filter
        const txDate = new Date(t.date + 'T00:00:00');
        if (datePreset === 'today') {
          const todayStr = new Date().toISOString().split('T')[0];
          if (t.date !== todayStr) return false;
        } else if (datePreset === 'this-week') {
          const start = startOfWeek(now, { weekStartsOn: 1 });
          const end = endOfWeek(now, { weekStartsOn: 1 });
          if (txDate < start || txDate > end) return false;
        } else if (datePreset === 'this-month') {
          const start = startOfMonth(now);
          const end = endOfMonth(now);
          if (txDate < start || txDate > end) return false;
        } else if (datePreset === 'last-month') {
          const prevMonth = subMonths(now, 1);
          const start = startOfMonth(prevMonth);
          const end = endOfMonth(prevMonth);
          if (txDate < start || txDate > end) return false;
        } else if (datePreset === 'last-30') {
          const start = subDays(now, 30);
          if (txDate < start || txDate > now) return false;
        } else if (datePreset === 'this-year') {
          const start = startOfYear(now);
          const end = endOfYear(now);
          if (txDate < start || txDate > end) return false;
        } else if (datePreset === 'custom') {
          if (startDate) {
            const start = new Date(startDate + 'T00:00:00');
            if (txDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate + 'T23:59:59');
            if (txDate > end) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [
    transactions,
    searchQuery,
    typeFilter,
    categoryFilter,
    sortBy,
    datePreset,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    currency,
  ]);

  const hasActiveFilters =
    searchQuery !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    datePreset !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    minAmount !== '' ||
    maxAmount !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const totalIncome = filteredTransactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = filteredTransactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netFlow = totalIncome - totalExpenses;
  const avgTx = filteredTransactions.length > 0
    ? (filteredTransactions.reduce((acc, t) => acc + t.amount, 0) / filteredTransactions.length)
    : 0;

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Notes'];
    const rows = filteredTransactions.map((t) => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      `"${t.category}"`,
      t.amount,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Transactions
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time ledger of income, expenses, and asset movements
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 text-xs font-semibold shadow-xs transition-all"
            title="Import bank statement CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold shadow-sm transition-all"
            title="Export filtered records to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingTx(null);
              setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                amount: '',
                type: 'expense',
                category: 'Food & Dining',
                notes: '',
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Inflow</p>
          <p className="text-xl font-bold font-heading text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatCurrency(totalIncome, currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filteredTransactions.filter((t) => t.type === 'income').length} deposits
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Outflow</p>
          <p className="text-xl font-bold font-heading text-rose-600 dark:text-rose-400 mt-1">
            -{formatCurrency(totalExpenses, currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filteredTransactions.filter((t) => t.type === 'expense').length} payments
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Net Flow</p>
          <p className={`text-xl font-bold font-heading mt-1 ${netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Filtered period</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Transaction</p>
          <p className="text-xl font-bold font-heading text-slate-900 dark:text-white mt-1">
            {formatCurrency(avgTx, currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{filteredTransactions.length} records</p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search bar */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, category, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type segmented control */}
          <div className="lg:col-span-3 flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            {(['all', 'income', 'expense', 'transfer'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>

          {/* Date Preset Filter */}
          <div className="lg:col-span-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={datePreset}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setDatePreset(val);
                  if (val !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              >
                <option value="all">📅 All Dates</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="last-30">Last 30 Days</option>
                <option value="this-year">This Year (YTD)</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>
          </div>

          {/* Toggle Advanced Filters Button */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                showAdvancedFilters || minAmount || maxAmount || categoryFilter !== 'all' || datePreset === 'custom'
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(minAmount || maxAmount || categoryFilter !== 'all' || datePreset === 'custom') && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filter Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
            {/* Category selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>

            {/* Start Date & End Date (for Custom Range) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Min & Max Amount Range */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Min Amount ({CURRENCY_MAP[currency]?.symbol || '$'})
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Max Amount ({CURRENCY_MAP[currency]?.symbol || '$'})
              </label>
              <input
                type="number"
                step="any"
                placeholder="No limit"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>
        )}

        {/* Active filters badge strip with 1-click Clear All */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium capitalize">
                Type: {typeFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setTypeFilter('all')} />
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                {categoryFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
              </span>
            )}
            {datePreset !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                Date: {datePreset.replace('-', ' ')}
                {startDate && endDate ? ` (${startDate} to ${endDate})` : ''}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => {
                    setDatePreset('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                />
              </span>
            )}
            {(minAmount || maxAmount) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                Amount: {minAmount ? `≥${minAmount}` : ''} {maxAmount ? `≤${maxAmount}` : ''}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => {
                    setMinAmount('');
                    setMaxAmount('');
                  }}
                />
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline ml-auto flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* Transactions List / Table */}
      <div className="glass-panel rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3.5 px-5">Transaction</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Description & Icon */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isIncome
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                              : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50'
                          }`}
                        >
                          <CategoryIcon category={tx.category} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {tx.description}
                          </p>
                          {tx.notes && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs sm:max-w-md">
                              {tx.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <CategoryBadge category={tx.category} />
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {tx.date}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4 whitespace-nowrap text-right font-heading">
                      <span
                        className={`font-bold text-sm sm:text-base ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit transaction"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 space-y-3">
                    <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium">No matching transactions found.</p>
                    <p className="text-xs text-slate-500">Try adjusting your search queries or filter tags.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                  {editingTx ? 'Edit Transaction' : 'Record Transaction'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingTx ? 'Update details of this transaction' : 'Add income or expense to your financial ledger'}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* Type Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    formData.type === 'expense'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Expense
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    formData.type === 'income'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Income
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'transfer', category: 'Transfer' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    formData.type === 'transfer'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4" /> Transfer
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Amount
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold font-mono text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                    {CURRENCY_MAP[currency]?.symbol || '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    autoFocus
                    className="w-full pl-14 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-2xl font-bold font-heading text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Grocery Shopping at Trader Joe's"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Date with quick chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Date
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, date: new Date().toISOString().split('T')[0] })}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date(Date.now() - 86400000);
                        setFormData({ ...formData, date: yesterday.toISOString().split('T')[0] });
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional context, receipt info, tag..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
                >
                  {editingTx ? 'Update Record' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bank Statement Import Modal */}
      <CsvImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        currency={currency}
        onImport={(imported) => {
          imported.forEach((tx) => onAdd({ ...tx, amount: toBaseCurrency(tx.amount, currency) }));
          soundFx.playSuccess();
        }}
      />
    </div>
  );
}