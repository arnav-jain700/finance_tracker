import {
  Budget,
  Transaction,
  CATEGORIES,
  CURRENCY_MAP,
  formatCurrency,
  toBaseCurrency,
  fromBaseCurrency,
} from '../store';
import {
  Plus,
  Trash2,
  Target,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  X,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { CategoryBadge, CategoryIcon } from './CategoryIcon';

interface BudgetsViewProps {
  budgets: Budget[];
  transactions: Transaction[];
  currency: string;
  onAdd: (b: Omit<Budget, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate?: (b: Budget) => void;
}

export function BudgetsView({
  budgets,
  transactions,
  currency,
  onAdd,
  onDelete,
  onUpdate,
}: BudgetsViewProps) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!limit) return;

    const baseLimit = toBaseCurrency(Number(limit), currency);

    if (editingBudget && onUpdate) {
      onUpdate({ ...editingBudget, category, limit: baseLimit });
      setEditingBudget(null);
    } else {
      onAdd({ category, limit: baseLimit });
    }

    setLimit('');
  };

const formatNumForInput = (num: number): string => {
  if (isNaN(num)) return '';
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
    return Math.round(rounded).toString();
  }
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

  const handleEdit = (b: Budget) => {
    setEditingBudget(b);
    setCategory(b.category as any);
    setLimit(formatNumForInput(fromBaseCurrency(b.limit, currency)));
  };

  const handleCancel = () => {
    setEditingBudget(null);
    setLimit('');
  };

  // Aggregated budget metrics
  const totalLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgets.reduce((acc, b) => {
    const spent = transactions
      .filter((t) => t.category === b.category && t.type === 'expense')
      .reduce((a, t) => a + t.amount, 0);
    return acc + spent;
  }, 0);

  const overallPercent = totalLimit > 0 ? Math.min(Math.round((totalSpent / totalLimit) * 100), 100) : 0;
  const remainingTotal = Math.max(0, totalLimit - totalSpent);

  return (
    <div className="space-y-8 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Budgets & Limits
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Establish financial guardrails and monitor category thresholds
          </p>
        </div>
      </div>

      {/* Aggregated Overview Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50 shadow-sm">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                Monthly Budget Allocation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {budgets.length} active monitored budget categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Spent</p>
              <p className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                {formatCurrency(totalSpent, currency)}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Budget</p>
              <p className="text-lg font-bold font-heading text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totalLimit, currency)}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Buffer Remaining</p>
              <p className="text-lg font-bold font-heading text-emerald-600 dark:text-emerald-400">
                {formatCurrency(remainingTotal, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallPercent > 90
                  ? 'bg-gradient-to-r from-rose-500 to-red-600'
                  : overallPercent > 70
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
              }`}
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-500 dark:text-slate-400">{overallPercent}% of total ceiling utilized</span>
            <span className={overallPercent > 90 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}>
              {overallPercent > 100 ? 'Ceiling exceeded' : `${100 - overallPercent}% available`}
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Budget Form */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm">
        <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          {editingBudget ? 'Edit Category Budget' : 'Set Category Budget Target'}
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <div className="sm:col-span-5">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 relative flex items-center">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 dark:text-slate-500 pointer-events-none select-none">
              {CURRENCY_MAP[currency]?.symbol || '$'}
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="Monthly limit (e.g. 500)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            />
          </div>

          <div className="sm:col-span-3 flex gap-2">
            {editingBudget && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{editingBudget ? 'Update Budget' : 'Save Budget'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Budget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((b) => {
          const spent = transactions
            .filter((t) => t.category === b.category && t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);
          const percent = Math.min(Math.round((spent / b.limit) * 100), 100);
          const rawPercent = Math.round((spent / b.limit) * 100);
          const isOver = spent > b.limit;
          const isWarning = rawPercent >= 80 && !isOver;
          const remaining = Math.max(0, b.limit - spent);

          return (
            <div
              key={b.id}
              className="glass-panel rounded-3xl p-6 shadow-sm hover-lift space-y-4 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Header with Category Icon */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50">
                    <CategoryIcon category={b.category} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold font-heading text-base text-slate-900 dark:text-white">
                      {b.category}
                    </h4>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${
                      isOver ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isOver ? (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Exceeded limit
                        </>
                      ) : isWarning ? (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Caution zone
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> On Track
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(b)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit budget"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${b.category} budget?`)) onDelete(b.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete budget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress & Numeric Stats */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Spent</span>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatCurrency(spent, currency)}{' '}
                    <span className="text-xs font-normal text-slate-400">/ {formatCurrency(b.limit, currency)}</span>
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] font-medium pt-1">
                  <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                    {rawPercent}% utilized
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {isOver ? `+${formatCurrency(spent - b.limit, currency)} over` : `${formatCurrency(remaining, currency)} remaining`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 space-y-3 glass-panel rounded-3xl">
            <Target className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No budgets created yet.</p>
            <p className="text-xs text-slate-500">Create category targets above to track your monthly spending ceiling.</p>
          </div>
        )}
      </div>
    </div>
  );
}