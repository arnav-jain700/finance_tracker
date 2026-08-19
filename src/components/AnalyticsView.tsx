import { Transaction, formatCurrency, getCategoryMeta } from '../store';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { CategoryBadge, CategoryIcon } from './CategoryIcon';

interface AnalyticsViewProps {
  transactions: Transaction[];
  currency: string;
}

const PALETTE = ['#6366f1', '#f97316', '#0284c7', '#a855f7', '#06b6d4', '#f43f5e', '#ec4899', '#14b8a6', '#10b981', '#8b5cf6', '#64748b'];

export function AnalyticsView({ transactions, currency }: AnalyticsViewProps) {
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('6m');

  const monthsCount = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;

  const monthlyData = useMemo(() => {
    const endDate = endOfMonth(new Date());
    const startDate = startOfMonth(subMonths(new Date(), monthsCount - 1));
    const monthIntervals = eachMonthOfInterval({ start: startDate, end: endDate });

    return monthIntervals.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const monthStr = format(monthStart, 'MMM yyyy');
      const monthTransactions = transactions.filter((t) => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const income = monthTransactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expenses = monthTransactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      return {
        month: monthStr,
        income,
        expenses,
        net: income - expenses,
      };
    });
  }, [transactions, monthsCount]);

  const categoryData = useMemo(() => {
    const expenseTransactions = transactions.filter((t) => t.type === 'expense');
    const categoryTotals = expenseTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalExp = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return Object.entries(categoryTotals)
      .map(([category, amount], index) => ({
        category,
        amount,
        percent: totalExp > 0 ? (amount / totalExp) * 100 : 0,
        color: getCategoryMeta(category).color || PALETTE[index % PALETTE.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const topCategory = categoryData[0];

  if (transactions.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-16 text-center max-w-md mx-auto space-y-4">
        <PieIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" />
        <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">No Financial Data</h3>
        <p className="text-sm text-slate-500">Record transactions to unlock comprehensive visual analytics and trends.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Visual Analytics
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cash flow breakdowns, spending allocations, and wealth trajectory
          </p>
        </div>

        {/* Time Range Pills */}
        <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 self-start sm:self-auto">
          {(['3m', '6m', '12m'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeRange === range
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {range === '3m' ? '3 Months' : range === '6m' ? '6 Months' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Inflow</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Cumulative earned capital</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Outflow</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-heading text-rose-600 dark:text-rose-400">
            {formatCurrency(totalExpenses, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Cumulative spending</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Wealth Growth</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold font-heading ${netSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
            {formatCurrency(netSavings, currency)}
          </h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {savingsRate}% savings rate
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Primary Expense</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white truncate">
            {topCategory ? topCategory.category : 'N/A'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {topCategory ? `${formatCurrency(topCategory.amount, currency)} (${topCategory.percent.toFixed(0)}%)` : 'No expenses'}
          </p>
        </div>
      </div>

      {/* Main Charts: Monthly Cashflow Area & Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Income vs Expenses Cashflow Area Chart */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                Monthly Inflow vs Outflow
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track revenue momentum against expenditure trends
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  }}
                  formatter={(val: number) => [formatCurrency(val, currency), '']}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#incomeGrad)"
                  name="Income"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#expenseGrad)"
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Donut Chart */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
              Spending Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown across expense categories
            </p>
          </div>

          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="amount"
                  nameKey="category"
                  strokeWidth={0}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(val: number) => [formatCurrency(val, currency), '']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Total Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-lg font-extrabold font-heading text-slate-900 dark:text-white">
                {formatCurrency(totalExpenses, currency)}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {categoryData.slice(0, 5).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{cat.category}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(cat.amount, currency)}
                  </span>
                  <span className="text-slate-400 text-[11px]">({cat.percent.toFixed(0)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Analytics Row: Monthly Net Savings Bar & Category Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Net Savings Bar Chart */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div>
            <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
              Net Monthly Savings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Surplus vs deficit per calendar month
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(val: number) => [formatCurrency(val, currency), 'Net Savings']}
                />
                <Bar
                  dataKey="net"
                  name="Net Savings"
                  radius={[6, 6, 0, 0]}
                  fill="#6366f1"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Spending Categories Hierarchy */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div>
            <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
              Category Rankings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Proportional share of total expenditures
            </p>
          </div>

          <div className="space-y-4">
            {categoryData.slice(0, 5).map((item, index) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {index + 1}
                    </span>
                    <CategoryIcon category={item.category} className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-900 dark:text-white">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <span className="text-slate-400 font-medium">({item.percent.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Smart Financial Health Badge */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-start gap-3 mt-4">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Smart Financial Insight</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300/90 mt-0.5">
                {savingsRate >= 20
                  ? `Exceptional financial health! You are retaining ${savingsRate}% of your gross income, well above the 20% standard recommended benchmark.`
                  : `Your savings rate is currently ${savingsRate}%. Consider reviewing top categories like ${topCategory?.category || 'Housing'} to optimize your monthly margins.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}