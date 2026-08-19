import { useState, useMemo } from 'react';
import { Transaction, Budget, Account, Goal, BillGroup, formatCurrency } from '../store';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CategoryBadge } from './CategoryIcon';

interface ReportsViewProps {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  goals: Goal[];
  billGroups: BillGroup[];
  currency: string;
}

export function ReportsView({
  transactions,
  budgets,
  accounts,
  goals,
  currency,
}: ReportsViewProps) {
  const [period, setPeriod] = useState<'current-month' | 'last-month' | 'all-time'>('current-month');

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (period === 'current-month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    } else if (period === 'last-month') {
      const lastMonthDate = subMonths(now, 1);
      const start = startOfMonth(lastMonthDate);
      const end = endOfMonth(lastMonthDate);
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }
    return transactions;
  }, [transactions, period]);

  const totalIncome = filteredTransactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = filteredTransactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const totalNetWorth = accounts.reduce((acc, a) => acc + a.balance, 0);

  const categoryBreakdown = useMemo(() => {
    const expenses = filteredTransactions.filter((t) => t.type === 'expense');
    const totals: Record<string, number> = {};
    expenses.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, totalExpenses]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Screen Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Financial Statements & Reports
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate formal monthly statements, balance ledgers, and printable PDF documents
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
          >
            <option value="current-month">Current Month Statement</option>
            <option value="last-month">Previous Month Statement</option>
            <option value="all-time">All-Time Cumulative</option>
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Statement Document */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Statement Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-heading text-slate-900 dark:text-white">
                ApexFinance Statement
              </h1>
              <p className="text-xs text-slate-500">Official Personal Financial Ledger Summary</p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
            <p>
              Generated on: <strong>{format(new Date(), 'MMMM dd, yyyy')}</strong>
            </p>
            <p className="capitalize">
              Reporting Window: <strong>{period.replace('-', ' ')}</strong>
            </p>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Net Worth</p>
            <p className="text-xl font-bold font-heading text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalNetWorth, currency)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Gross Inflow</p>
            <p className="text-xl font-bold font-heading text-emerald-600 dark:text-emerald-400 mt-1">
              +{formatCurrency(totalIncome, currency)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Gross Outflow</p>
            <p className="text-xl font-bold font-heading text-rose-600 dark:text-rose-400 mt-1">
              -{formatCurrency(totalExpenses, currency)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Net Savings Retention</p>
            <p className="text-xl font-bold font-heading text-indigo-600 dark:text-indigo-400 mt-1">
              {savingsRate}%
            </p>
          </div>
        </div>

        {/* Category Expense Allocations */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Expense Allocations by Category
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5 text-right">Amount</th>
                  <th className="py-2.5 text-right">Share of Outflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {categoryBreakdown.map((c) => (
                  <tr key={c.category}>
                    <td className="py-2.5">{c.category}</td>
                    <td className="py-2.5 text-right font-mono font-bold">{formatCurrency(c.amount, currency)}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Linked Accounts Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Account Balances
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span>{acc.name}</span>
                  <span className="font-mono">{formatCurrency(acc.balance, currency)}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{acc.institution} • {acc.accountNumber}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Itemized Activity Ledger ({filteredTransactions.length} items)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Description</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.slice(0, 25).map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 text-slate-500 font-mono">{t.date}</td>
                    <td className="py-2 font-medium">{t.description}</td>
                    <td className="py-2">{t.category}</td>
                    <td className={`py-2 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Document Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
          <p>ApexFinance Pro • Private & Confidential Financial Statement Report</p>
        </div>
      </div>
    </div>
  );
}
