import { useMemo } from 'react';
import { Transaction, Account, formatCurrency } from '../store';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  Coins,
  ArrowRight,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface InsightsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  currency: string;
}

const NEEDS_CATEGORIES = ['Housing', 'Food & Dining', 'Utilities', 'Healthcare', 'Transport'];
const WANTS_CATEGORIES = ['Entertainment', 'Shopping', 'Other'];
const SAVINGS_CATEGORIES = ['Investments', 'Savings', 'Freelance'];

export function InsightsView({ transactions, accounts, currency }: InsightsViewProps) {
  // 50/30/20 breakdown
  const { needs, wants, savings, totalSpend, totalIncome } = useMemo(() => {
    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = 0;
    let incomeTotal = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        incomeTotal += tx.amount;
      } else if (tx.type === 'expense') {
        if (NEEDS_CATEGORIES.includes(tx.category)) needsTotal += tx.amount;
        else if (SAVINGS_CATEGORIES.includes(tx.category)) savingsTotal += tx.amount;
        else wantsTotal += tx.amount;
      }
    });

    const spendTotal = needsTotal + wantsTotal + savingsTotal;
    return {
      needs: needsTotal,
      wants: wantsTotal,
      savings: savingsTotal,
      totalSpend: spendTotal,
      totalIncome: incomeTotal,
    };
  }, [transactions]);

  const baseForPercent = totalIncome > 0 ? totalIncome : totalSpend > 0 ? totalSpend : 1;
  const needsPct = Math.round((needs / baseForPercent) * 100);
  const wantsPct = Math.round((wants / baseForPercent) * 100);
  const savingsPct = Math.round(((totalIncome - totalSpend) / baseForPercent) * 100);

  // Spending Velocity calculation
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;

  const currentMonthTransactions = transactions.filter((t) => {
    const txDate = new Date(t.date);
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  });

  const monthExpensesSoFar = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthIncomeSoFar = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const dailyBurnRate = currentDay > 0 ? monthExpensesSoFar / currentDay : 0;
  const projectedMonthExpenses = monthExpensesSoFar + dailyBurnRate * daysRemaining;
  const projectedNet = monthIncomeSoFar - projectedMonthExpenses;

  // Emergency Runway calculation
  const liquidCash = accounts
    .filter((a) => a.type === 'checking' || a.type === 'savings' || a.type === 'cash')
    .reduce((acc, a) => acc + Math.max(0, a.balance), 0);

  const monthlyEssentialBurn = Math.max(1, needs || 2000);
  const runwayMonths = (liquidCash / monthlyEssentialBurn).toFixed(1);

  const pie503020Data = [
    { name: 'Needs (Target 50%)', value: needs, color: '#6366f1' },
    { name: 'Wants (Target 30%)', value: wants, color: '#ec4899' },
    { name: 'Savings / Net (Target 20%)', value: Math.max(0, totalIncome - totalSpend), color: '#10b981' },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header Bar */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
          Smart Financial Insights & Advisory
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Automated 50/30/20 rule diagnostics, spending velocity projections, and wealth optimization
        </p>
      </div>

      {/* 50/30/20 Rule Analyzer Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50 shadow-sm">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                50/30/20 Budget Rule Compliance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gold standard rule: 50% Needs, 30% Wants, 20% Wealth & Savings
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
              needsPct <= 55 && savingsPct >= 15
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
            }`}
          >
            {needsPct <= 55 && savingsPct >= 15 ? '✓ Optimized Portfolio' : '⚠️ Allocation Tuning Needed'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Needs */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Needs (Essential)
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{needsPct}% / 50%</span>
            </div>
            <h4 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
              {formatCurrency(needs, currency)}
            </h4>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${needsPct > 55 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(100, needsPct * 2)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Housing, groceries, utilities, transit</p>
          </div>

          {/* Wants */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                Wants (Lifestyle)
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{wantsPct}% / 30%</span>
            </div>
            <h4 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
              {formatCurrency(wants, currency)}
            </h4>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${wantsPct > 35 ? 'bg-rose-500' : 'bg-pink-500'}`}
                style={{ width: `${Math.min(100, (wantsPct / 30) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Dining, shopping, hobbies, leisure</p>
          </div>

          {/* Savings */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Savings & Growth
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{Math.max(0, savingsPct)}% / 20%</span>
            </div>
            <h4 className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {formatCurrency(Math.max(0, totalIncome - totalSpend), currency)}
            </h4>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, (Math.max(0, savingsPct) / 20) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Emergency fund, investments, debt payoff</p>
          </div>
        </div>
      </div>

      {/* Spending Velocity & Runway Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending Velocity */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/50">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-heading text-base text-slate-900 dark:text-white">
                Monthly Spending Velocity
              </h3>
              <p className="text-xs text-slate-500">Day {currentDay} of {daysInMonth} ({daysRemaining} days remaining)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 font-medium">Daily Burn Rate</p>
              <p className="text-xl font-bold font-heading text-slate-900 dark:text-white mt-1">
                {formatCurrency(dailyBurnRate, currency)} <span className="text-xs font-normal text-slate-400">/ day</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 font-medium">Projected Month-End Spend</p>
              <p className="text-xl font-bold font-heading text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(projectedMonthExpenses, currency)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between text-xs">
            <span className="text-indigo-950 dark:text-indigo-200 font-semibold">Forecasted Net Cash Surplus:</span>
            <span className={`font-mono font-bold text-sm ${projectedNet >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>
              {projectedNet >= 0 ? '+' : ''}{formatCurrency(projectedNet, currency)}
            </span>
          </div>
        </div>

        {/* Emergency Runway Cushion */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-heading text-base text-slate-900 dark:text-white">
                Emergency Runway Cushion
              </h3>
              <p className="text-xs text-slate-500">Survival duration with zero active income</p>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <h4 className="text-4xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400">
              {runwayMonths} <span className="text-xl font-bold text-slate-500">Months</span>
            </h4>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
              {Number(runwayMonths) >= 6 ? 'Ultra Resilient' : Number(runwayMonths) >= 3 ? 'Adequate' : 'Building'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Liquid Cash Reserve:</span>
              <strong className="text-slate-900 dark:text-white">{formatCurrency(liquidCash, currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Essential Monthly Baseline:</span>
              <strong className="text-slate-900 dark:text-white">{formatCurrency(monthlyEssentialBurn, currency)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Automated AI Advisory Recommendations */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Automated Wealth Optimization Advisory
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-panel p-5 rounded-2xl space-y-2 border-l-4 border-l-emerald-500">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              1. Excess Liquid Capital
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              You maintain <strong>{formatCurrency(liquidCash, currency)}</strong> in liquid reserves. Sweeping a surplus into high-yield deposits or index funds could generate compound yields.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl space-y-2 border-l-4 border-l-indigo-500">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              2. Savings Rate Momentum
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Your overall savings retention rate is <strong>{savingsPct}%</strong>. Consistently saving &gt;25% puts you on a rapid track toward financial freedom.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl space-y-2 border-l-4 border-l-amber-500">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              3. Category Monitoring
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ensure discretionary expenses like dining and shopping remain under 30% of total cashflow to avoid creeping lifestyle inflation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
