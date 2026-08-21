import { useState } from 'react';
import {
  Goal,
  CURRENCY_MAP,
  formatCurrency,
  toBaseCurrency,
  fromBaseCurrency,
} from '../store';
import { soundFx } from '../utils/audio';
import {
  Plus,
  Target,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  TrendingUp,
  X,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Award,
} from 'lucide-react';
import { differenceInDays, differenceInMonths, parseISO, format } from 'date-fns';

interface GoalsViewProps {
  goals: Goal[];
  currency: string;
  onAddGoal: (g: Omit<Goal, 'id'>) => void;
  onUpdateGoal: (g: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onDepositWithdraw: (goalId: string, amount: number, isDeposit: boolean) => void;
}

const GOAL_COLORS = ['#10b981', '#6366f1', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308'];

export function GoalsView({
  goals,
  currency,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onDepositWithdraw,
}: GoalsViewProps) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [activeGoalForDeposit, setActiveGoalForDeposit] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositAction, setIsDepositAction] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
  );
  const [category, setCategory] = useState('Savings');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [notes, setNotes] = useState('');

  // Overall metrics
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const overallPercent = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0;
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate(new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]);
    setCategory('Savings');
    setColor(GOAL_COLORS[0]);
    setNotes('');
    setShowGoalModal(true);
  };

  const handleOpenEdit = (g: Goal) => {
    setEditingGoal(g);
    setName(g.name);
    setTargetAmount(String(Math.round(fromBaseCurrency(g.targetAmount, currency))));
    setCurrentAmount(String(Math.round(fromBaseCurrency(g.currentAmount, currency))));
    setTargetDate(g.targetDate);
    setCategory(g.category);
    setColor(g.color);
    setNotes(g.notes || '');
    setShowGoalModal(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    const baseTarget = toBaseCurrency(Number(targetAmount), currency);
    const baseCurrent = toBaseCurrency(Number(currentAmount) || 0, currency);

    const goalData = {
      name: name.trim(),
      targetAmount: baseTarget,
      currentAmount: baseCurrent,
      targetDate,
      category: category.trim() || 'General',
      color,
      notes: notes.trim() || undefined,
    };

    if (editingGoal) {
      onUpdateGoal({ ...goalData, id: editingGoal.id });
    } else {
      onAddGoal(goalData);
    }

    soundFx.playSuccess();
    setShowGoalModal(false);
    setEditingGoal(null);
  };

  const openDepositWithdraw = (g: Goal, isDeposit = true) => {
    setActiveGoalForDeposit(g);
    setIsDepositAction(isDeposit);
    setDepositAmount('');
    setShowDepositModal(true);
  };

  const handleExecuteDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmt = Number(depositAmount);
    if (!activeGoalForDeposit || !rawAmt || rawAmt <= 0) return;

    const amtBase = toBaseCurrency(rawAmt, currency);

    onDepositWithdraw(activeGoalForDeposit.id, amtBase, isDepositAction);
    if (isDepositAction) soundFx.playCelebration();
    else soundFx.playSuccess();

    setShowDepositModal(false);
    setActiveGoalForDeposit(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Savings Goals & Milestones
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track dedicated funds for dream vacations, emergency runways, and capital purchases
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Aggregate Overview Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/50 shadow-sm">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                Cumulative Savings Progress
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completedGoals} of {goals.length} target milestones fully achieved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Saved</p>
              <p className="text-lg font-bold font-heading text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalSaved, currency)}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Target Goal</p>
              <p className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                {formatCurrency(totalTarget, currency)}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remaining Gap</p>
              <p className="text-lg font-bold font-heading text-indigo-600 dark:text-indigo-400">
                {formatCurrency(Math.max(0, totalTarget - totalSaved), currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 transition-all duration-700"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-500">{overallPercent}% of combined target funded</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {overallPercent >= 100 ? 'All targets reached! 🎉' : `${100 - overallPercent}% to completion`}
            </span>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g) => {
          const percent = Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
          const isDone = g.currentAmount >= g.targetAmount;
          const remaining = Math.max(0, g.targetAmount - g.currentAmount);

          // Calculate pace needed
          const today = new Date();
          const due = parseISO(g.targetDate);
          const daysLeft = Math.max(1, differenceInDays(due, today));
          const monthsLeft = Math.max(0.1, differenceInMonths(due, today) + 1);
          const requiredMonthly = remaining / monthsLeft;
          const requiredWeekly = remaining / (daysLeft / 7);

          return (
            <div
              key={g.id}
              className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm hover-lift space-y-5 flex flex-col justify-between"
            >
              {/* Goal Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ backgroundColor: g.color }}
                  >
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold font-heading text-lg text-slate-900 dark:text-white">
                      {g.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold">
                        {g.category}
                      </span>
                      <span>• Target: {g.targetDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(g)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit goal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete savings goal "${g.name}"?`)) onDeleteGoal(g.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress & Balances */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-500 font-medium">Accumulated Savings</span>
                  <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                    {formatCurrency(g.currentAmount, currency)}{' '}
                    <span className="text-xs font-normal text-slate-400">/ {formatCurrency(g.targetAmount, currency)}</span>
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: g.color,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs font-semibold">
                  <span style={{ color: g.color }}>{percent}% complete</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {isDone ? 'Goal Achieved! 🏆' : `${formatCurrency(remaining, currency)} to go`}
                  </span>
                </div>
              </div>

              {/* Smart Pace Calculator */}
              {!isDone ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>
                      <strong className="text-slate-900 dark:text-white">{daysLeft} days</strong> left
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Save pace: </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(requiredMonthly, currency)}/mo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Target achieved! Ready for withdrawal or redeployment.</span>
                </div>
              )}

              {/* Deposit / Withdraw Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => openDepositWithdraw(g, true)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Deposit Funds</span>
                </button>
                <button
                  onClick={() => openDepositWithdraw(g, false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Withdraw</span>
                </button>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 space-y-3 glass-panel rounded-3xl">
            <Target className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No savings goals created yet.</p>
            <p className="text-xs text-slate-500">Create targets above to establish milestone trackers with automated pace calculators.</p>
          </div>
        )}
      </div>

      {/* Goal Add / Edit Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Savings Target' : 'Create Savings Target'}
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Japan Vacation, Emergency Fund"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Target Goal Amount
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                        {CURRENCY_MAP[currency]?.symbol || '$'}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        placeholder="5000"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Current Saved
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                        {CURRENCY_MAP[currency]?.symbol || '$'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={currentAmount}
                        onChange={(e) => setCurrentAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Category Tag
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Travel, Safety"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    {GOAL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {editingGoal ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit / Withdraw Modal */}
      {showDepositModal && activeGoalForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                {isDepositAction ? 'Deposit to Goal' : 'Withdraw from Goal'}
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteDeposit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <p className="text-xs text-slate-500">
                  Target: <strong className="text-slate-800 dark:text-slate-200">{activeGoalForDeposit.name}</strong> (Currently {formatCurrency(activeGoalForDeposit.currentAmount, currency)})
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Amount
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                      {CURRENCY_MAP[currency]?.symbol || '$'}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="250"
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer ${
                    isDepositAction ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isDepositAction ? 'Confirm Deposit' : 'Confirm Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
