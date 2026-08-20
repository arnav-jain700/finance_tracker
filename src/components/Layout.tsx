import {
  Transaction,
  Budget,
  BillGroup,
  Account,
  Goal,
  Subscription,
  CURRENCY_MAP,
  formatCurrency,
} from '../store';
import { UserProfile } from '../api/client';
import { Dashboard } from './Dashboard';
import { TransactionsView } from './TransactionsView';
import { AnalyticsView } from './AnalyticsView';
import { BudgetsView } from './BudgetsView';
import { BillsView } from './BillsView';
import { AccountsView } from './AccountsView';
import { GoalsView } from './GoalsView';
import { SubscriptionsView } from './SubscriptionsView';
import { InsightsView } from './InsightsView';
import { CalculatorsView } from './CalculatorsView';
import { ReportsView } from './ReportsView';
import { SettingsView } from './SettingsView';
import { UserSwitcherModal } from './UserSwitcherModal';
import {
  LayoutDashboard,
  CreditCard,
  PieChart,
  Target,
  Users,
  Settings,
  Menu,
  X,
  Plus,
  Moon,
  Sun,
  Bell,
  Sparkles,
  Repeat,
  Landmark,
  ShieldCheck,
  Calculator,
  FileText,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  Cloud,
  UserCheck,
  Lock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { soundFx } from '../utils/audio';

type ViewMode =
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

interface LayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  transactions: Transaction[];
  budgets: Budget[];
  billGroups: BillGroup[];
  accounts: Account[];
  goals: Goal[];
  subscriptions: Subscription[];
  currency: string;
  theme: 'light' | 'dark' | 'system';
  users: UserProfile[];
  currentUser: UserProfile;
  isServerOnline: boolean;
  onSelectUser: (user: UserProfile) => void;
  onCreateUser: (data: {
    name: string;
    email?: string;
    currency: string;
    initialBalance: number;
    role: string;
    color: string;
    pin?: string;
  }) => Promise<void>;
  onSignOut?: () => void;
  onUpdateUser?: (userId: string, data: Partial<Omit<UserProfile, 'id'>>) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  onResetUserData?: (userId: string) => Promise<void>;
  onCurrencyChange: (c: string) => void;
  onThemeChange: (t: 'light' | 'dark' | 'system') => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (updated: Transaction) => void;
  onAddBudget: (b: Omit<Budget, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
  onUpdateBudget?: (b: Budget) => void;
  onAddBillGroup: (g: Omit<BillGroup, 'id' | 'expenses'>) => void;
  onDeleteBillGroup?: (id: string) => void;
  onAddBillExpense: (groupId: string, expense: Omit<BillGroup['expenses'][0], 'id'>) => void;
  onUpdateBillExpense?: (groupId: string, expense: BillGroup['expenses'][0]) => void;
  onDeleteBillExpense?: (groupId: string, expenseId: string) => void;
  onAddAccount: (acc: Omit<Account, 'id'>) => void;
  onUpdateAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
  onTransfer: (fromId: string, toId: string, amount: number, notes?: string) => void;
  onAddGoal: (g: Omit<Goal, 'id'>) => void;
  onUpdateGoal: (g: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onGoalDepositWithdraw: (goalId: string, amount: number, isDeposit: boolean) => void;
  onAddSubscription: (s: Omit<Subscription, 'id'>) => void;
  onUpdateSubscription: (s: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onSubscriptionPayment: (s: Subscription) => void;
  onLockWorkspace: () => void;
  onResetData: () => void;
  onLoadDemoData: () => void;
}

export function Layout({
  currentView,
  onViewChange,
  transactions,
  budgets,
  billGroups,
  accounts,
  goals,
  subscriptions,
  currency,
  theme,
  users,
  currentUser,
  isServerOnline,
  onSelectUser,
  onCreateUser,
  onSignOut,
  onUpdateUser,
  onDeleteUser,
  onResetUserData,
  onCurrencyChange,
  onThemeChange,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateTransaction,
  onAddBudget,
  onDeleteBudget,
  onUpdateBudget,
  onAddBillGroup,
  onDeleteBillGroup,
  onAddBillExpense,
  onUpdateBillExpense,
  onDeleteBillExpense,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransfer,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onGoalDepositWithdraw,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onSubscriptionPayment,
  onLockWorkspace,
  onResetData,
  onLoadDemoData,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGlobalAddModal, setShowGlobalAddModal] = useState(false);
  const [globalAddType, setGlobalAddType] = useState<'income' | 'expense'>('expense');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(soundFx.getIsMuted());

  const navSections = [
    {
      title: 'CORE FINANCE',
      items: [
        { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, count: null },
        { id: 'transactions' as const, label: 'Transactions', icon: CreditCard, count: transactions.length },
        { id: 'analytics' as const, label: 'Analytics', icon: PieChart, count: null },
        { id: 'accounts' as const, label: 'Accounts & Wallets', icon: Landmark, count: accounts.length },
      ],
    },
    {
      title: 'PLANNING & SAVINGS',
      items: [
        { id: 'budgets' as const, label: 'Budgets & Limits', icon: Target, count: budgets.length },
        { id: 'goals' as const, label: 'Savings Goals', icon: ShieldCheck, count: goals.length },
        { id: 'subscriptions' as const, label: 'Subscriptions', icon: Repeat, count: subscriptions.length },
        { id: 'bills' as const, label: 'Bill Split', icon: Users, count: billGroups.length },
      ],
    },
    {
      title: 'INTELLIGENCE & TOOLS',
      items: [
        { id: 'insights' as const, label: 'Smart Insights', icon: Sparkles, count: null },
        { id: 'calculators' as const, label: 'Simulators', icon: Calculator, count: null },
        { id: 'reports' as const, label: 'Statements', icon: FileText, count: null },
        { id: 'settings' as const, label: 'Settings', icon: Settings, count: null },
      ],
    },
  ];

  // Calculate notifications (budget alerts + subscription due alerts)
  const budgetAlerts = budgets
    .map((b) => {
      const spent = transactions
        .filter((t) => t.category === b.category && t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
      const percent = (spent / b.limit) * 100;
      return { category: b.category, percent: Math.round(percent), spent, limit: b.limit };
    })
    .filter((b) => b.percent >= 80);

  const subscriptionAlerts = subscriptions
    .map((s) => {
      const days = differenceInDays(parseISO(s.nextDueDate), new Date());
      return { ...s, daysUntil: days };
    })
    .filter((s) => s.daysUntil <= 5);

  const totalAlertCount = budgetAlerts.length + subscriptionAlerts.length;

  const openAddModal = (type: 'income' | 'expense' = 'expense') => {
    setGlobalAddType(type);
    setShowGlobalAddModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 glass-panel border-r border-slate-200 dark:border-slate-800/80 transform transition-transform duration-300 lg:translate-x-0 flex flex-col justify-between ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo & Nav List */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 bg-white dark:bg-[#111827] z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold font-heading tracking-tight text-slate-900 dark:text-white">
                  Apex<span className="text-indigo-600 dark:text-indigo-400">Finance</span>
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold">
                  PRO SUITE
                </p>
              </div>
            </div>

            <button
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categorized Nav Sections */}
          <div className="p-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onViewChange(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.count !== null && item.count > 0 && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer with Active Profile Switcher */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3 bg-white dark:bg-[#111827]">
          {/* User Profile Mini Card */}
          <button
            onClick={() => setShowUserModal(true)}
            className="w-full p-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-all border border-slate-200/60 dark:border-slate-700/50 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 overflow-hidden"
                style={{ backgroundColor: currentUser?.color || '#6366f1' }}
              >
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name?.charAt(0) || 'U'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser?.name || 'Alex Morgan'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isServerOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{isServerOnline ? 'Cloud Synced' : 'Local'}</span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>

          <div className="flex items-center justify-between px-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Currency: {CURRENCY_MAP[currency]?.symbol || '$'} ({currency})
            </span>
            <button
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-4 sm:px-8 glass-panel border-b border-slate-200/80 dark:border-slate-800/80 print:hidden">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:block">
              <h2 className="text-base font-bold font-heading capitalize text-slate-900 dark:text-white">
                {currentView.replace('-', ' ')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Active User Switcher Pill */}
            <button
              onClick={() => setShowUserModal(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
            >
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px] font-bold overflow-hidden"
                style={{ backgroundColor: currentUser?.color || '#6366f1' }}
              >
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name?.charAt(0) || 'U'
                )}
              </div>
              <span>{currentUser?.name || 'Alex Morgan'}</span>
              <span className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} title={isServerOnline ? 'Connected to Backend (Port 5000)' : 'Offline Local Mode'} />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Currency Quick Switcher & Live Forex Ticker */}
            <div className="hidden md:flex items-center gap-2">
              <select
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {Object.keys(CURRENCY_MAP).map((c) => (
                  <option key={c} value={c}>{c} ({CURRENCY_MAP[c].symbol})</option>
                ))}
              </select>

              {currency !== 'USD' && (
                <div
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 shadow-xs"
                  title="Live Forex market conversion rate"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>1 USD = {formatCurrency(1, currency)}</span>
                </div>
              )}
            </div>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {totalAlertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 glass-panel-glow rounded-2xl shadow-2xl p-4 border border-slate-200 dark:border-slate-700 z-50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold font-heading text-slate-900 dark:text-white">Active Alerts</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold">
                      {totalAlertCount}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {/* Budget Alerts */}
                    {budgetAlerts.map((alert) => (
                      <div
                        key={alert.category}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>{alert.category} Budget</span>
                          <span className={alert.percent > 100 ? 'text-rose-600' : 'text-amber-600'}>
                            {alert.percent}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {formatCurrency(alert.spent, currency)} spent of {formatCurrency(alert.limit, currency)} limit.
                        </p>
                      </div>
                    ))}

                    {/* Subscription Alerts */}
                    {subscriptionAlerts.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-purple-950 dark:text-purple-200">
                          <span>{sub.name}</span>
                          <span className="text-purple-600 font-mono">
                            {formatCurrency(sub.amount, currency)}
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-700 dark:text-purple-300">
                          Due on {sub.nextDueDate} ({sub.daysUntil <= 0 ? 'Due Today' : `in ${sub.daysUntil} days`})
                        </p>
                      </div>
                    ))}

                    {totalAlertCount === 0 && (
                      <p className="text-center text-xs text-slate-400 py-4">All budgets & bills are clear.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Audio Feedback Toggle */}
            <button
              onClick={() => {
                const muted = soundFx.toggleMute();
                setIsAudioMuted(muted);
              }}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs"
              title={isAudioMuted ? 'Unmute UI audio effects' : 'Mute UI audio effects'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            </button>

            {/* Lock Workspace Button */}
            <button
              onClick={onLockWorkspace}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs"
              title="Lock confidential workspace session"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Quick Add Button */}
            <button
              onClick={() => openAddModal('expense')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Transaction</span>
            </button>
          </div>
        </header>

        {/* View Router */}
        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex-1">
          {currentView === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              budgets={budgets}
              billGroups={billGroups}
              accounts={accounts}
              goals={goals}
              subscriptions={subscriptions}
              currency={currency}
              onNavigate={onViewChange}
              onOpenAddModal={openAddModal}
            />
          )}
          {currentView === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              currency={currency}
              onAdd={onAddTransaction}
              onDelete={onDeleteTransaction}
              onUpdate={onUpdateTransaction}
            />
          )}
          {currentView === 'analytics' && (
            <AnalyticsView
              transactions={transactions}
              currency={currency}
            />
          )}
          {currentView === 'accounts' && (
            <AccountsView
              accounts={accounts}
              currency={currency}
              onAddAccount={onAddAccount}
              onUpdateAccount={onUpdateAccount}
              onDeleteAccount={onDeleteAccount}
              onTransfer={onTransfer}
            />
          )}
          {currentView === 'budgets' && (
            <BudgetsView
              budgets={budgets}
              transactions={transactions}
              currency={currency}
              onAdd={onAddBudget}
              onDelete={onDeleteBudget}
              onUpdate={onUpdateBudget}
            />
          )}
          {currentView === 'goals' && (
            <GoalsView
              goals={goals}
              currency={currency}
              onAddGoal={onAddGoal}
              onUpdateGoal={onUpdateGoal}
              onDeleteGoal={onDeleteGoal}
              onDepositWithdraw={onGoalDepositWithdraw}
            />
          )}
          {currentView === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              currency={currency}
              onAddSubscription={onAddSubscription}
              onUpdateSubscription={onUpdateSubscription}
              onDeleteSubscription={onDeleteSubscription}
              onLogPayment={onSubscriptionPayment}
            />
          )}
          {currentView === 'bills' && (
            <BillsView
              billGroups={billGroups}
              currency={currency}
              onAddGroup={onAddBillGroup}
              onDeleteGroup={onDeleteBillGroup}
              onAddExpense={onAddBillExpense}
              onUpdateExpense={onUpdateBillExpense}
              onDeleteExpense={onDeleteBillExpense}
            />
          )}
          {currentView === 'insights' && (
            <InsightsView
              transactions={transactions}
              accounts={accounts}
              currency={currency}
            />
          )}
          {currentView === 'calculators' && (
            <CalculatorsView
              currency={currency}
            />
          )}
          {currentView === 'reports' && (
            <ReportsView
              transactions={transactions}
              budgets={budgets}
              accounts={accounts}
              goals={goals}
              billGroups={billGroups}
              currency={currency}
            />
          )}
          {currentView === 'settings' && (
            <SettingsView
              currency={currency}
              theme={theme}
              currentUser={currentUser}
              onOpenManageProfiles={() => setShowUserModal(true)}
              onCurrencyChange={onCurrencyChange}
              onThemeChange={onThemeChange}
              onResetData={onResetData}
              onLoadDemoData={onLoadDemoData}
            />
          )}
        </main>
      </div>

      {/* Global Quick Add Modal */}
      {showGlobalAddModal && (
        <TransactionsView
          transactions={transactions}
          currency={currency}
          onAdd={onAddTransaction}
          onDelete={onDeleteTransaction}
          onUpdate={onUpdateTransaction}
          initialModalOpen={true}
          initialType={globalAddType}
          onCloseModal={() => setShowGlobalAddModal(false)}
        />
      )}

      {/* Multi-User & Workspace Switcher Modal */}
      <UserSwitcherModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        users={users}
        currentUser={currentUser}
        onSelectUser={onSelectUser}
        onCreateUser={onCreateUser}
        onUpdateUser={onUpdateUser}
        onDeleteUser={onDeleteUser}
        onResetUserData={onResetUserData}
        isServerOnline={isServerOnline}
      />
    </div>
  );
}
