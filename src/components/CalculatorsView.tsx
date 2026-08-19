import { useState, useMemo } from 'react';
import { formatRawCurrency } from '../store';
import {
  Calculator,
  TrendingUp,
  Landmark,
  Coins,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface CalculatorsViewProps {
  currency: string;
}

export function CalculatorsView({ currency }: CalculatorsViewProps) {
  const [activeTab, setActiveTab] = useState<'compound' | 'loan'>('compound');

  // Compound Interest State
  const [initialPrincipal, setInitialPrincipal] = useState(5000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [annualRate, setAnnualRate] = useState(8);
  const [years, setYears] = useState(15);

  // Loan State
  const [loanPrincipal, setLoanPrincipal] = useState(35000);
  const [loanRate, setLoanRate] = useState(6.5);
  const [loanYears, setLoanYears] = useState(5);
  const [extraMonthly, setExtraMonthly] = useState(100);

  // Compound Interest Calculations
  const compoundData = useMemo(() => {
    const data = [];
    const monthlyRate = annualRate / 100 / 12;
    let balance = initialPrincipal;
    let totalContributed = initialPrincipal;

    for (let yr = 0; yr <= years; yr++) {
      if (yr === 0) {
        data.push({
          year: `Yr 0`,
          contributions: Math.round(totalContributed),
          interest: 0,
          total: Math.round(balance),
        });
        continue;
      }

      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        totalContributed += monthlyContribution;
      }

      const totalInterest = Math.max(0, balance - totalContributed);
      data.push({
        year: `Yr ${yr}`,
        contributions: Math.round(totalContributed),
        interest: Math.round(totalInterest),
        total: Math.round(balance),
      });
    }
    return data;
  }, [initialPrincipal, monthlyContribution, annualRate, years]);

  const finalCompound = compoundData[compoundData.length - 1];

  // Loan Calculations
  const loanSummary = useMemo(() => {
    const p = loanPrincipal;
    const r = loanRate / 100 / 12;
    const n = loanYears * 12;

    if (r === 0 || n === 0) {
      return { monthlyPayment: p / (n || 1), totalInterest: 0, totalPaid: p, interestSaved: 0, monthsSaved: 0 };
    }

    const standardMonthly = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const standardTotalPaid = standardMonthly * n;
    const standardTotalInterest = standardTotalPaid - p;

    // With extra monthly
    let balance = p;
    let monthsWithExtra = 0;
    let totalPaidWithExtra = 0;

    while (balance > 0.01 && monthsWithExtra < n * 2) {
      monthsWithExtra++;
      const interestForMonth = balance * r;
      const payment = Math.min(balance + interestForMonth, standardMonthly + extraMonthly);
      const principalPaid = payment - interestForMonth;
      balance = Math.max(0, balance - principalPaid);
      totalPaidWithExtra += payment;
    }

    const interestWithExtra = Math.max(0, totalPaidWithExtra - p);
    const interestSaved = Math.max(0, standardTotalInterest - interestWithExtra);
    const monthsSaved = Math.max(0, n - monthsWithExtra);

    return {
      monthlyPayment: standardMonthly,
      totalInterest: standardTotalInterest,
      totalPaid: standardTotalPaid,
      interestSaved,
      monthsSaved,
      totalPaidWithExtra,
    };
  }, [loanPrincipal, loanRate, loanYears, extraMonthly]);

  return (
    <div className="space-y-8 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Wealth & Debt Simulators
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Simulate compound interest returns and loan prepayment acceleration
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('compound')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'compound'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Compound Interest</span>
          </button>

          <button
            onClick={() => setActiveTab('loan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'loan'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Loan & Debt Payoff</span>
          </button>
        </div>
      </div>

      {activeTab === 'compound' ? (
        <div className="space-y-8">
          {/* Output KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glass-panel p-6 rounded-3xl">
              <p className="text-xs text-slate-500 font-medium">Projected Future Wealth</p>
              <h3 className="text-3xl font-extrabold font-heading text-indigo-600 dark:text-indigo-400 mt-1">
                {formatRawCurrency(finalCompound?.total || 0, currency)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">After {years} years of continuous compounding</p>
            </div>

            <div className="glass-panel p-6 rounded-3xl">
              <p className="text-xs text-slate-500 font-medium">Total Out-of-Pocket Contributions</p>
              <h3 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
                {formatRawCurrency(finalCompound?.contributions || 0, currency)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Initial deposit + monthly savings</p>
            </div>

            <div className="glass-panel p-6 rounded-3xl">
              <p className="text-xs text-slate-500 font-medium">Total Compound Interest Earned</p>
              <h3 className="text-3xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400 mt-1">
                +{formatRawCurrency(finalCompound?.interest || 0, currency)}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Pure passive capital generation</p>
            </div>
          </div>

          {/* Interactive Sliders & Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sliders Form */}
            <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Parameters
              </h3>

              {/* Initial Investment */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Initial Deposit</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {formatRawCurrency(initialPrincipal, currency)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="500"
                  value={initialPrincipal}
                  onChange={(e) => setInitialPrincipal(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Monthly Contribution */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Monthly Contribution</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {formatRawCurrency(monthlyContribution, currency)} / mo
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Annual Return */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Estimated Annual Return</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{annualRate}% / yr</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Timeframe Years */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Time Horizon</span>
                  <span className="font-mono text-slate-900 dark:text-white">{years} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            {/* Growth Curve Chart */}
            <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                  Wealth Compounding Projection
                </h3>
                <p className="text-xs text-slate-500">Principal Contributions vs Compound Interest</p>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={compoundData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '14px',
                        fontSize: '12px',
                        color: '#ffffff',
                      }}
                      formatter={(val: number) => [formatRawCurrency(val, currency), '']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="contributions"
                      name="Your Contributions"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#contribGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Value (with Interest)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#interestGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Loan Payoff Simulator */
        <div className="space-y-8">
          {/* Loan Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glass-panel p-6 rounded-3xl">
              <p className="text-xs text-slate-500 font-medium">Standard Monthly Payment (EMI)</p>
              <h3 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
                {formatRawCurrency(loanSummary.monthlyPayment, currency)}
                <span className="text-xs font-normal text-slate-400"> / mo</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Standard loan amortization</p>
            </div>

            <div className="glass-panel p-6 rounded-3xl">
              <p className="text-xs text-slate-500 font-medium">Interest Saved with Extra Prepayment</p>
              <h3 className="text-3xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400 mt-1">
                +{formatRawCurrency(loanSummary.interestSaved, currency)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Shaves {loanSummary.monthsSaved} months off term!
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl">
              <p className="text-xs text-slate-500 font-medium">Total Lifetime Interest</p>
              <h3 className="text-3xl font-extrabold font-heading text-rose-600 dark:text-rose-400 mt-1">
                {formatRawCurrency(loanSummary.totalInterest, currency)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Total financing cost without extra payments</p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Loan & Prepayment Parameters
            </h3>

            {/* Loan Principal */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">Loan Principal</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {formatRawCurrency(loanPrincipal, currency)}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="500000"
                step="1000"
                value={loanPrincipal}
                onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">Annual Interest Rate</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">{loanRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.25"
                value={loanRate}
                onChange={(e) => setLoanRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
            </div>

            {/* Loan Term */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">Loan Term</span>
                <span className="font-mono text-slate-900 dark:text-white">{loanYears} Years ({loanYears * 12} Months)</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={loanYears}
                onChange={(e) => setLoanYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Extra Monthly Payment */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  Extra Monthly Prepayment Acceleration
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatRawCurrency(extraMonthly, currency)} / mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="25"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
