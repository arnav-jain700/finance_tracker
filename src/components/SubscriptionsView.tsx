import { useState } from 'react';
import {
  Subscription,
  CATEGORIES,
  CURRENCY_MAP,
  formatCurrency,
  toBaseCurrency,
  fromBaseCurrency,
} from '../store';
import {
  Plus,
  Repeat,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  X,
  Tv,
  Music,
  Cloud,
  Dumbbell,
  BookOpen,
  ShoppingBag,
} from 'lucide-react';
import { differenceInDays, parseISO, addMonths, addYears, addWeeks, format } from 'date-fns';
import { CategoryBadge, CategoryIcon } from './CategoryIcon';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  currency: string;
  onAddSubscription: (sub: Omit<Subscription, 'id'>) => void;
  onUpdateSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onLogPayment: (sub: Subscription) => void;
}

export function SubscriptionsView({
  subscriptions,
  currency,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onLogPayment,
}: SubscriptionsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>('monthly');
  const [category, setCategory] = useState<string>('Entertainment');
  const [nextDueDate, setNextDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [autoRenew, setAutoRenew] = useState(true);
  const [providerUrl, setProviderUrl] = useState('');

  // Cost calculations
  const monthlyBurden = subscriptions.reduce((acc, s) => {
    if (s.billingCycle === 'monthly') return acc + s.amount;
    if (s.billingCycle === 'yearly') return acc + s.amount / 12;
    if (s.billingCycle === 'weekly') return acc + (s.amount * 52) / 12;
    return acc;
  }, 0);

  const annualBurden = monthlyBurden * 12;

  // Upcoming sorted
  const sortedSubs = [...subscriptions].sort((a, b) => {
    return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
  });

  const nextUpcoming = sortedSubs[0];

  const handleOpenAdd = () => {
    setEditingSub(null);
    setName('');
    setAmount('');
    setBillingCycle('monthly');
    setCategory('Entertainment');
    setNextDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setAutoRenew(true);
    setProviderUrl('');
    setShowModal(true);
  };

  const handleOpenEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setName(sub.name);
    setAmount(String(fromBaseCurrency(sub.amount, currency).toFixed(2)));
    setBillingCycle(sub.billingCycle);
    setCategory(sub.category);
    setNextDueDate(sub.nextDueDate);
    setAutoRenew(sub.autoRenew);
    setProviderUrl(sub.providerUrl || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const baseAmount = toBaseCurrency(Number(amount), currency);

    const subData = {
      name: name.trim(),
      amount: baseAmount,
      billingCycle,
      category,
      nextDueDate,
      autoRenew,
      providerUrl: providerUrl.trim() || undefined,
    };

    if (editingSub) {
      onUpdateSubscription({ ...subData, id: editingSub.id });
    } else {
      onAddSubscription(subData);
    }

    setShowModal(false);
    setEditingSub(null);
  };

  const handlePayAndAdvance = (sub: Subscription) => {
    onLogPayment(sub);
    // Advance next date
    const current = parseISO(sub.nextDueDate);
    let nextDate = current;
    if (sub.billingCycle === 'monthly') nextDate = addMonths(current, 1);
    else if (sub.billingCycle === 'yearly') nextDate = addYears(current, 1);
    else if (sub.billingCycle === 'weekly') nextDate = addWeeks(current, 1);

    onUpdateSubscription({
      ...sub,
      nextDueDate: format(nextDate, 'yyyy-MM-dd'),
    });
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Subscriptions & Fixed Bills
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor recurring subscriptions, billing cycles, and annual cost impacts
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Monthly Commitment</p>
          <h3 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white mt-1">
            {formatCurrency(monthlyBurden, currency)}
            <span className="text-xs font-normal text-slate-400"> / mo</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">{subscriptions.length} active recurring services</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Annual Projected Burden</p>
          <h3 className="text-2xl sm:text-3xl font-bold font-heading text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(annualBurden, currency)}
            <span className="text-xs font-normal text-slate-400"> / yr</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Total yearly subscription overhead</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Next Scheduled Bill</p>
          <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1 truncate">
            {nextUpcoming ? nextUpcoming.name : 'None'}
          </h3>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            {nextUpcoming ? `Due on ${nextUpcoming.nextDueDate} (${formatCurrency(nextUpcoming.amount, currency)})` : 'All clear'}
          </p>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedSubs.map((sub) => {
          const daysUntil = differenceInDays(parseISO(sub.nextDueDate), new Date());
          const isOverdue = daysUntil < 0;
          const isDueSoon = daysUntil >= 0 && daysUntil <= 3;

          return (
            <div
              key={sub.id}
              className="glass-panel rounded-3xl p-6 shadow-sm hover-lift space-y-4 flex flex-col justify-between"
            >
              {/* Top Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold font-heading text-base text-slate-900 dark:text-white">
                      {sub.name}
                    </h4>
                    <span className="text-xs text-slate-400 capitalize">{sub.billingCycle} plan</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sub)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit subscription"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete subscription "${sub.name}"?`)) onDeleteSubscription(sub.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete subscription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Amount & Due Date */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 font-medium">Cost</span>
                  <span className="text-xl font-extrabold font-heading text-slate-900 dark:text-white">
                    {formatCurrency(sub.amount, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                  <span className="text-slate-500 font-medium">Next Due</span>
                  <span
                    className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                      isOverdue
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        : isDueSoon
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {isOverdue ? 'Overdue' : daysUntil === 0 ? 'Due Today' : `In ${daysUntil} days`}
                  </span>
                </div>
              </div>

              {/* Action Button: Log as Paid */}
              <button
                onClick={() => handlePayAndAdvance(sub)}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Paid & Advance Cycle</span>
              </button>
            </div>
          );
        })}

        {subscriptions.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 space-y-3 glass-panel rounded-3xl">
            <Repeat className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No recurring subscriptions recorded.</p>
            <p className="text-xs text-slate-500">Track recurring software, streaming services, and rent to monitor annual burn rate.</p>
          </div>
        )}
      </div>

      {/* Subscription Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                {editingSub ? 'Edit Subscription' : 'Add Recurring Service'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Service / Provider Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Netflix, AWS, Spotify"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
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
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="14.99"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Provider Website (Optional)
                </label>
                <input
                  type="url"
                  value={providerUrl}
                  onChange={(e) => setProviderUrl(e.target.value)}
                  placeholder="https://netflix.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  {editingSub ? 'Update Subscription' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
