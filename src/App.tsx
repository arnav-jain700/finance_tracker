import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, LockScreen } from './components';
import { OnboardingWelcome } from './components/OnboardingWelcome';
import {
  initStorage,
  Transaction,
  Budget,
  BillGroup,
  BillExpense,
  Account,
  Goal,
  Subscription,
  DEFAULT_EXCHANGE_RATES,
  setExchangeRates,
} from './store';
import { apiClient, UserProfile, UserDataPayload } from './api/client';

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

const DEFAULT_USERS: UserProfile[] = [];

function App() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('users_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_USERS;
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedUserId = localStorage.getItem('active_user_id');
      const savedUsers = localStorage.getItem('users_list');
      const uList: UserProfile[] = savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS;
      const found = uList.find((u) => u.id === savedUserId);
      if (found) return found;
      if (uList.length > 0) return uList[0];
    } catch (e) {
      console.error(e);
    }
    return null;
  });
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [billGroups, setBillGroups] = useState<BillGroup[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [currency, setCurrency] = useState<string>(() => currentUser?.currency || 'USD');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [exchangeRates, setExchangeRatesState] = useState(DEFAULT_EXCHANGE_RATES);
  const [initialized, setInitialized] = useState(false);
  const isSyncingRef = useRef(false);

  // Health check, Exchange Rates & Users initialization
  useEffect(() => {
    async function initApp() {
      // 1. Fetch live Forex exchange rates
      const rates = await apiClient.fetchExchangeRates();
      if (rates) {
        setExchangeRates(rates);
        setExchangeRatesState(rates);
      }

      // 2. Health & Users
      const serverOk = await apiClient.checkHealth();
      setIsServerOnline(serverOk);

      let localUsers: UserProfile[] = [];
      try {
        const saved = localStorage.getItem('users_list');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) localUsers = parsed;
        }
      } catch (e) {
        console.error(e);
      }

      let mergedUsers = [...localUsers];
      if (serverOk) {
        const remoteUsers = await apiClient.getUsers();
        if (remoteUsers.length > 0) {
          const localMap = new Map(localUsers.map((u) => [u.id, u]));
          remoteUsers.forEach((ru) => {
            if (!localMap.has(ru.id)) {
              localMap.set(ru.id, ru);
            } else {
              // Update metadata from remote if available
              localMap.set(ru.id, { ...localMap.get(ru.id)!, ...ru });
            }
          });
          mergedUsers = Array.from(localMap.values());
        }
      }

      setUsers(mergedUsers);
      localStorage.setItem('users_list', JSON.stringify(mergedUsers));

      // Check saved active user
      const savedUserId = localStorage.getItem('active_user_id');
      const active = mergedUsers.find((u) => u.id === savedUserId) || mergedUsers[0] || null;
      setCurrentUser(active);
      if (active) {
        setCurrency(active.currency || 'USD');
        await loadUserData(active.id, serverOk);
      }

      // Load global theme
      const savedSettings = localStorage.getItem('settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.theme) setTheme(parsed.theme);
        } catch (e) {
          console.error(e);
        }
      }

      setInitialized(true);
    }

    initApp();

    // Heartbeat check for server every 15 seconds & fetch rates periodically
    const interval = setInterval(async () => {
      const ok = await apiClient.checkHealth();
      setIsServerOnline(ok);
      const rates = await apiClient.fetchExchangeRates();
      if (rates) {
        setExchangeRates(rates);
        setExchangeRatesState({ ...rates });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Load data for specific user with resilient offline-first merging
  const loadUserData = async (userId: string, online = isServerOnline) => {
    isSyncingRef.current = true;
    let localPayload: UserDataPayload | null = null;

    // 1. Read local storage cache first
    try {
      const raw = localStorage.getItem(`user_data_${userId}`);
      if (raw) {
        localPayload = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed reading user local cache:', e);
    }

    let finalPayload: UserDataPayload | null = localPayload;

    // 2. Fetch from server if online
    if (online) {
      const remotePayload = await apiClient.fetchUserData(userId);
      if (remotePayload) {
        const hasRemoteData =
          (remotePayload.transactions && remotePayload.transactions.length > 0) ||
          (remotePayload.billGroups && remotePayload.billGroups.length > 0) ||
          (remotePayload.budgets && remotePayload.budgets.length > 0) ||
          (remotePayload.accounts && remotePayload.accounts.length > 0);

        const hasLocalData =
          localPayload &&
          ((localPayload.transactions && localPayload.transactions.length > 0) ||
           (localPayload.billGroups && localPayload.billGroups.length > 0) ||
           (localPayload.budgets && localPayload.budgets.length > 0) ||
           (localPayload.accounts && localPayload.accounts.length > 0));

        if (hasRemoteData) {
          finalPayload = remotePayload;
        } else if (hasLocalData && localPayload) {
          // Remote server is fresh/ephemeral, but browser has local data: preserve and sync to server!
          finalPayload = localPayload;
          apiClient.syncUserData(userId, localPayload);
        } else {
          finalPayload = remotePayload || localPayload;
        }
      }
    }

    if (finalPayload) {
      setTransactions(finalPayload.transactions || []);
      setBudgets(finalPayload.budgets || []);
      setBillGroups(finalPayload.billGroups || []);
      setAccounts(finalPayload.accounts || []);
      setGoals(finalPayload.goals || []);
      setSubscriptions(finalPayload.subscriptions || []);
      localStorage.setItem(`user_data_${userId}`, JSON.stringify(finalPayload));
    } else {
      // Default initial data for fresh user
      const data = initStorage();
      setTransactions(data.transactions);
      setBudgets(data.budgets);
      setBillGroups(data.billGroups);
      setAccounts(data.accounts);
      setGoals(data.goals);
      setSubscriptions(data.subscriptions);
      localStorage.setItem(`user_data_${userId}`, JSON.stringify(data));
      if (online) {
        apiClient.syncUserData(userId, data);
      }
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 250);
  };

  // Sync state to local storage and remote backend whenever changed
  useEffect(() => {
    if (!initialized || isSyncingRef.current || !currentUser) return;

    const payload: UserDataPayload = {
      transactions,
      budgets,
      billGroups,
      accounts,
      goals,
      subscriptions,
    };

    // Save to user local cache
    localStorage.setItem(`user_data_${currentUser.id}`, JSON.stringify(payload));
    localStorage.setItem('active_user_id', currentUser.id);

    // Sync to backend if online
    if (isServerOnline) {
      apiClient.syncUserData(currentUser.id, payload);
    }
  }, [
    transactions,
    budgets,
    billGroups,
    accounts,
    goals,
    subscriptions,
    currentUser,
    initialized,
    isServerOnline,
  ]);

  // Keep users list in localStorage
  useEffect(() => {
    if (users && users.length > 0) {
      localStorage.setItem('users_list', JSON.stringify(users));
    }
  }, [users]);

  // Apply and persist theme & currency changes
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (initialized) {
      localStorage.setItem('settings', JSON.stringify({ theme, currency }));
    }
  }, [theme, currency, initialized]);

  // User Switcher Handler
  const handleSelectUser = async (user: UserProfile) => {
    setCurrentUser(user);
    setCurrency(user.currency || 'USD');
    await loadUserData(user.id);
  };

  // User Creation Handler
  const handleCreateUser = async (data: {
    name: string;
    email?: string;
    currency: string;
    initialBalance: number;
    role: string;
    color: string;
  }) => {
    let created: UserProfile | null = null;
    if (isServerOnline) {
      created = await apiClient.createUser(data);
    }

    if (!created) {
      // Local fallback
      created = {
        id: `user-${Date.now()}`,
        name: data.name,
        email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '')}@apexfinance.io`,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name)}`,
        currency: data.currency,
        role: data.role,
        color: data.color,
      };

      const initialPayload: UserDataPayload = {
        transactions: [],
        budgets: [],
        billGroups: [],
        accounts: [
          {
            id: `acc-${Date.now()}-1`,
            name: `${data.name}'s Primary Account`,
            type: 'checking',
            balance: Number(data.initialBalance) || 0,
            currency: data.currency,
            institution: 'Main Wallet',
            accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
            color: 'from-blue-600 to-indigo-700',
            isDefault: true,
          },
        ],
        goals: [],
        subscriptions: [],
      };
      localStorage.setItem(`user_data_${created.id}`, JSON.stringify(initialPayload));
    }

    const updatedUsers = [...users.filter((u) => u.id !== created.id), created];
    setUsers(updatedUsers);
    localStorage.setItem('users_list', JSON.stringify(updatedUsers));
    await handleSelectUser(created);
  };

  const handleGoogleAuth = async (googleUser: {
    googleId: string;
    name: string;
    email: string;
    avatar: string;
  }) => {
    let authUser: UserProfile | null = null;
    if (isServerOnline) {
      authUser = await apiClient.googleAuth(googleUser);
    }

    if (!authUser) {
      // Local fallback for Google user
      authUser = {
        id: `google-${googleUser.googleId}`,
        name: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.avatar,
        currency: 'USD',
        role: 'Google Account',
        color: '#3b82f6',
        authProvider: 'google',
        googleId: googleUser.googleId,
        createdAt: new Date().toISOString().split('T')[0],
      };
    }

    const nextUsers = [...users.filter((u) => u.id !== authUser!.id && u.email !== authUser!.email), authUser];
    setUsers(nextUsers);
    localStorage.setItem('users_list', JSON.stringify(nextUsers));
    await handleSelectUser(authUser);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('active_user_id');
  };

  const handleUpdateUser = async (userId: string, data: Partial<Omit<UserProfile, 'id'>>) => {
    let updated: UserProfile | null = null;
    if (isServerOnline) {
      updated = await apiClient.updateUser(userId, data);
    }
    const nextUsers = users.map((u) => {
      if (u.id === userId) {
        return updated || { ...u, ...data };
      }
      return u;
    });
    setUsers(nextUsers);
    localStorage.setItem('users_list', JSON.stringify(nextUsers));
    if (currentUser?.id === userId) {
      const active = nextUsers.find((u) => u.id === userId) || currentUser;
      setCurrentUser(active);
      if (data.currency) setCurrency(data.currency);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (isServerOnline) {
      await apiClient.deleteUser(userId);
    }
    localStorage.removeItem(`user_data_${userId}`);
    const nextUsers = users.filter((u) => u.id !== userId);
    setUsers(nextUsers);
    localStorage.setItem('users_list', JSON.stringify(nextUsers));
    if (currentUser?.id === userId) {
      if (nextUsers.length > 0) {
        await handleSelectUser(nextUsers[0]);
      } else {
        setCurrentUser(null);
        localStorage.removeItem('active_user_id');
      }
    }
  };

  const handleResetUserData = async (userId: string) => {
    if (isServerOnline) {
      await apiClient.resetUserData(userId);
    }
    if (currentUser?.id === userId) {
      setTransactions([]);
      setBudgets([]);
      setBillGroups([]);
      setAccounts([
        {
          id: `acc-${Date.now()}-1`,
          name: `${currentUser.name}'s Primary Account`,
          type: 'checking',
          balance: 0,
          currency: currentUser.currency || 'USD',
          institution: 'Main Wallet',
          accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
          color: 'from-blue-600 to-indigo-700',
          isDefault: true,
        },
      ]);
      setGoals([]);
      setSubscriptions([]);
    } else {
      localStorage.removeItem(`user_data_${userId}`);
    }
  };

  // Transaction Handlers
  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...t, id: crypto.randomUUID() };
    setTransactions((prev) => [newTx, ...prev]);

    if (t.accountId) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === t.accountId) {
            const delta = t.type === 'income' ? t.amount : -t.amount;
            return { ...acc, balance: acc.balance + delta };
          }
          return acc;
        })
      );
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTransaction = (updated: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // Budget Handlers
  const addBudget = (b: Omit<Budget, 'id'>) => {
    const newB: Budget = { ...b, id: crypto.randomUUID() };
    setBudgets((prev) => [...prev, newB]);
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBudget = (updated: Budget) => {
    setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  // Bill Group Handlers
  const addBillGroup = (g: Omit<BillGroup, 'id' | 'expenses'>) => {
    const newG: BillGroup = { ...g, id: crypto.randomUUID(), expenses: [] };
    setBillGroups((prev) => [...prev, newG]);
  };

  const deleteBillGroup = (id: string) => {
    setBillGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const addBillExpense = (groupId: string, expense: Omit<BillGroup['expenses'][0], 'id'>) => {
    const newExp = { ...expense, id: crypto.randomUUID() };
    setBillGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, expenses: [newExp, ...g.expenses] } : g))
    );
  };

  const updateBillExpense = (groupId: string, updatedExpense: BillExpense) => {
    setBillGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              expenses: g.expenses.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp)),
            }
          : g
      )
    );
  };

  const deleteBillExpense = (groupId: string, expenseId: string) => {
    setBillGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, expenses: g.expenses.filter((exp) => exp.id !== expenseId) }
          : g
      )
    );
  };

  // Account Handlers & Inter-Account Transfers
  const addAccount = (acc: Omit<Account, 'id'>) => {
    const newAcc: Account = { ...acc, id: crypto.randomUUID() };
    setAccounts((prev) => [...prev, newAcc]);
  };

  const updateAccount = (updated: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const transferFunds = (fromId: string, toId: string, amount: number, notes?: string) => {
    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);
    if (!fromAcc || !toAcc) return;

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === fromId) return { ...a, balance: a.balance - amount };
        if (a.id === toId) return { ...a, balance: a.balance + amount };
        return a;
      })
    );

    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      description: `Transfer: ${fromAcc.name} ➔ ${toAcc.name}`,
      amount,
      type: 'transfer',
      category: 'Transfer',
      notes: notes || `Internal account rebalancing`,
      accountId: fromId,
      toAccountId: toId,
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  // Goal Handlers
  const addGoal = (g: Omit<Goal, 'id'>) => {
    const newGoal: Goal = { ...g, id: crypto.randomUUID() };
    setGoals((prev) => [...prev, newGoal]);
  };

  const updateGoal = (updated: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const depositWithdrawGoal = (goalId: string, amount: number, isDeposit: boolean) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updatedAmount = isDeposit
            ? g.currentAmount + amount
            : Math.max(0, g.currentAmount - amount);
          return { ...g, currentAmount: updatedAmount };
        }
        return g;
      })
    );
  };

  // Subscription Handlers
  const addSubscription = (s: Omit<Subscription, 'id'>) => {
    const newSub: Subscription = { ...s, id: crypto.randomUUID() };
    setSubscriptions((prev) => [...prev, newSub]);
  };

  const updateSubscription = (updated: Subscription) => {
    setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };

  const logSubscriptionPayment = (sub: Subscription) => {
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      description: `${sub.name} Subscription`,
      amount: sub.amount,
      type: 'expense',
      category: sub.category,
      notes: `Recurring ${sub.billingCycle} subscription payment`,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const resetData = () => {
    setTransactions([]);
    setBudgets([]);
    setBillGroups([]);
    setAccounts([]);
    setGoals([]);
    setSubscriptions([]);
    if (currentUser) {
      localStorage.removeItem(`user_data_${currentUser.id}`);
      if (isServerOnline) {
        apiClient.syncUserData(currentUser.id, {
          transactions: [],
          budgets: [],
          billGroups: [],
          accounts: [],
          goals: [],
          subscriptions: [],
        });
      }
    }
  };

  const loadDemoData = () => {
    resetData();
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser || users.length === 0) {
    return (
      <OnboardingWelcome
        onCreateUser={handleCreateUser}
        onGoogleAuth={handleGoogleAuth}
        isServerOnline={isServerOnline}
      />
    );
  }

  return (
    <>
      <Layout
        currentView={view}
        onViewChange={setView}
        transactions={transactions}
        budgets={budgets}
        billGroups={billGroups}
        accounts={accounts}
        goals={goals}
        subscriptions={subscriptions}
        currency={currency}
        theme={theme}
        users={users}
        currentUser={currentUser}
        isServerOnline={isServerOnline}
        onSelectUser={handleSelectUser}
        onCreateUser={handleCreateUser}
        onGoogleAuth={handleGoogleAuth}
        onSignOut={handleSignOut}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onResetUserData={handleResetUserData}
        onCurrencyChange={setCurrency}
        onThemeChange={setTheme}
        onAddTransaction={addTransaction}
        onDeleteTransaction={deleteTransaction}
        onUpdateTransaction={updateTransaction}
        onAddBudget={addBudget}
        onDeleteBudget={deleteBudget}
        onUpdateBudget={updateBudget}
        onAddBillGroup={addBillGroup}
        onDeleteBillGroup={deleteBillGroup}
        onAddBillExpense={addBillExpense}
        onUpdateBillExpense={updateBillExpense}
        onDeleteBillExpense={deleteBillExpense}
        onAddAccount={addAccount}
        onUpdateAccount={updateAccount}
        onDeleteAccount={deleteAccount}
        onTransfer={transferFunds}
        onAddGoal={addGoal}
        onUpdateGoal={updateGoal}
        onDeleteGoal={deleteGoal}
        onGoalDepositWithdraw={depositWithdrawGoal}
        onAddSubscription={addSubscription}
        onUpdateSubscription={updateSubscription}
        onDeleteSubscription={deleteSubscription}
        onSubscriptionPayment={logSubscriptionPayment}
        onLockWorkspace={() => setIsLocked(true)}
        onResetData={resetData}
        onLoadDemoData={loadDemoData}
      />
      <LockScreen
        isLocked={isLocked}
        currentUser={currentUser}
        onUnlock={() => setIsLocked(false)}
        onOpenUserSwitcher={() => {
          setIsLocked(false);
        }}
      />
    </>
  );
}

export default App;
