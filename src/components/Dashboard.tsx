import { useState } from 'react';
import {
  Transaction,
  Budget,
  BillGroup,
  Account,
  Goal,
  Subscription,
  formatCurrency,
} from '../store';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  Target,
  ArrowRight,
  Receipt,
  CreditCard,
  Repeat,
  ShieldCheck,
  Landmark,
  PieChart,
  Flame,
  Clock,
} from 'lucide-react';
import { CategoryBadge, CategoryIcon } from './CategoryIcon';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';

type NavViewType =
  | 'dashboard'
  | 'transactions'
  | 'analytics'
  | 'budgets'
  | 'bills'
  | 'accounts'
  | 'goals'
  | 'subscriptions'
  | 'insights'
  | 'calculators'
  | 'reports'
  | 'settings';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  billGroups: BillGroup[];
  accounts: Account[];
  goals: Goal[];
  subscriptions: Subscription[];
  currency: string;
  onNavigate: (view: NavViewType) => void;
  onOpenAddModal: (type?: 'income' | 'expense') => void;
}

export function Dashboard({
  transactions,
  budgets,
  billGroups,
  accounts,
  goals,
  subscriptions,
  currency,
  onNavigate,
  onOpenAddModal,
}: DashboardProps) {
  const [hideBalance, setHideBalance] = useState(false);

  // Financial calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // Net worth from linked accounts
  const totalNetWorth = accounts.reduce((acc, a) => acc + a.balance, 0);

  // Bill split calculations (amount you are owed vs owe)
  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  billGroups.forEach((group) => {
    const youName = group.members[0] || 'You';
    group.expenses.forEach((exp) => {
      exp.members.forEach((m) => {
        if (m.name === youName) {
          const net = m.paidAmount - m.shareAmount;
          if (net > 0) totalOwedToYou += net;
          else if (net < 0) totalYouOwe += Math.abs(net);
        }
      });
    });
  });

  // Recent 7 days mini chart data
  const miniChartData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLabel = format(d, 'EEE');
    const dayIncome = transactions
      .filter((t) => t.type === 'income' && t.date === dateStr)
      .reduce((a, b) => a + b.amount, 0);
    const dayExpense = transactions
      .filter((t) => t.type === 'expense' && t.date === dateStr)
      .reduce((a, b) => a + b.amount, 0);

    return { day: dayLabel, income: dayIncome, expense: dayExpense };
  });

  // Budget calculations
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => {
    const spent = transactions
      .filter((t) => t.category === b.category && t.type === 'expense')
      .reduce((a, t) => a + t.amount, 0);
    return acc + spent;
  }, 0);
  const overallBudgetPercent = totalBudgetLimit > 0 ? Math.min(Math.round((totalBudgetSpent / totalBudgetLimit) * 100), 100) : 0;

  // Upcoming subscriptions
  const sortedSubs = [...subscriptions].sort((a, b) => {
    return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
  });

  return (
    <div className="space-y-8 relative pb-8">
      {/* Ambient background glow effect */}
      <div className="ambient-glow" />

      {/* Hero Financial Banner & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Virtual FinTech Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl fintech-card-gradient p-6 sm:p-8 text-white shadow-2xl shadow-indigo-950/30 border border-indigo-400/20 flex flex-col justify-between min-h-[250px]">
          {/* Card subtle pattern elements */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top row */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-indigo-200 font-semibold">Apex Primary Vault</p>
                <p className="text-xs text-indigo-300/80 font-mono">
                  {accounts[0]?.accountNumber || '•••• •••• •••• 8842'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-indigo-200 hover:text-white transition-all"
              title={hideBalance ? 'Show Balance' : 'Hide Balance'}
            >
              {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Center Balance Display */}
          <div className="my-4 relative z-10">
            <p className="text-sm font-medium text-indigo-200 mb-1">Total Available Net Worth</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading">
                {hideBalance ? '••••••••' : formatCurrency(totalNetWorth || balance, currency)}
              </h2>
              {savingsRate > 0 && !hideBalance && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {savingsRate}% Savings Rate
                </span>
              )}
            </div>
          </div>

          {/* Card Bottom Quick Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10 flex-wrap gap-3">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-indigo-300">Monthly Inflow</p>
                <p className="text-sm sm:text-base font-bold text-emerald-300">
                  {hideBalance ? '••••' : `+${formatCurrency(totalIncome, currency)}`}
                </p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <p className="text-xs text-indigo-300">Monthly Outflow</p>
                <p className="text-sm sm:text-base font-bold text-rose-300">
                  {hideBalance ? '••••' : `-${formatCurrency(totalExpenses, currency)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAddModal('income')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Inflow
              </button>
              <button
                onClick={() => onOpenAddModal('expense')}
                className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Expense
              </button>
            </div>
          </div>
        </div>

        {/* Quick Insights & Split Summary Widget */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between shadow-sm hover-lift">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Financial Health
              </h3>
              <button
                onClick={() => onNavigate('insights')}
                className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 hover:underline"
              >
                50/30/20 Insights →
              </button>
            </div>

            {/* Budget Progress Meter */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Overall Budget</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalBudgetSpent, currency)} / {formatCurrency(totalBudgetLimit, currency)}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    overallBudgetPercent > 90
                      ? 'bg-gradient-to-r from-rose-500 to-red-600'
                      : overallBudgetPercent > 70
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                  style={{ width: `${overallBudgetPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>{overallBudgetPercent}% used</span>
                <span>{formatCurrency(Math.max(0, totalBudgetLimit - totalBudgetSpent), currency)} remaining</span>
              </div>
            </div>

            {/* Bill Split Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">You are owed</p>
                <p className="text-lg font-bold font-heading text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {formatCurrency(totalOwedToYou, currency)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">You owe</p>
                <p className="text-lg font-bold font-heading text-amber-800 dark:text-amber-300 mt-0.5">
                  {formatCurrency(totalYouOwe, currency)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('budgets')}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>Manage All Budgets</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Linked Accounts Carousel / Grid Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
              Linked Accounts & Wallets ({accounts.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('accounts')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Manage Accounts →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => onNavigate('accounts')}
              className="glass-panel p-3.5 rounded-2xl cursor-pointer hover-lift flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {acc.type}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{acc.name}</p>
                <p className="text-sm font-bold font-heading text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(acc.balance, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Balance */}
        <div className="glass-panel rounded-2xl p-5 hover-lift relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Net Balance
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Available Capital</p>
          <h4 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
            {formatCurrency(balance, currency)}
          </h4>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Active & Liquid</span>
          </div>
        </div>

        {/* Card 2: Income */}
        <div className="glass-panel rounded-2xl p-5 hover-lift relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              +Inflow
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Income</p>
          <h4 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalIncome, currency)}
          </h4>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>From {transactions.filter((t) => t.type === 'income').length} sources</span>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="glass-panel rounded-2xl p-5 hover-lift relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              -Outflow
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Spent</p>
          <h4 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalExpenses, currency)}
          </h4>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{transactions.filter((t) => t.type === 'expense').length} transactions</span>
          </div>
        </div>

        {/* Card 4: Bill Groups */}
        <div className="glass-panel rounded-2xl p-5 hover-lift relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/50">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Shared
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Split Groups</p>
          <h4 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
            {billGroups.length} <span className="text-sm font-normal text-slate-500">Groups</span>
          </h4>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            <span>{billGroups.reduce((acc, g) => acc + g.members.length, 0)} total members</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Transactions & Subscriptions/Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">Recent Activity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest recorded transactions</p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm">
            {transactions.slice(0, 6).map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                        isIncome
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                          : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50'
                      }`}
                    >
                      <CategoryIcon category={tx.category} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{tx.date}</span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <CategoryBadge category={tx.category} className="text-[10px] py-0 px-2" />
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm sm:text-base font-bold font-heading ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </p>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                      {tx.type}
                    </span>
                  </div>
                </div>
              );
            })}

            {transactions.length === 0 && (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No transactions recorded yet.</p>
                <button
                  onClick={() => onOpenAddModal('expense')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add First Transaction
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Goals & Upcoming Subscriptions */}
        <div className="space-y-6">
          {/* Active Goals Quick Widget */}
          <div className="glass-panel rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold font-heading text-slate-900 dark:text-white">Active Goals</h3>
              </div>
              <button
                onClick={() => onNavigate('goals')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                View all ({goals.length})
              </button>
            </div>

            <div className="space-y-3">
              {goals.slice(0, 3).map((g) => {
                const pct = Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
                return (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{g.name}</span>
                      <span className="font-mono text-[11px] text-slate-500">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Subscriptions Due Widget */}
          <div className="glass-panel rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-bold font-heading text-slate-900 dark:text-white">Upcoming Subscriptions</h3>
              </div>
              <button
                onClick={() => onNavigate('subscriptions')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {sortedSubs.slice(0, 3).map((sub) => {
                const days = differenceInDays(parseISO(sub.nextDueDate), new Date());
                return (
                  <div
                    key={sub.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{sub.name}</p>
                      <p className="text-[11px] text-slate-400">Due {sub.nextDueDate} (in {days}d)</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(sub.amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
