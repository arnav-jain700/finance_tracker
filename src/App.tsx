import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, LockScreen, SharedBillPortal, DeviceSyncModal } from './components';
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
import { soundFx } from './utils/audio';

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
  const [sharedGroupId, setSharedGroupId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('splitGroup') || params.get('shareGroup') || params.get('group') || null;
    }
    return null;
  });
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

  const [showDeviceSyncModal, setShowDeviceSyncModal] = useState(false);
  const dataVersionRef = useRef<number>(1);
  const currentUserRef = useRef<UserProfile | null>(currentUser);
  currentUserRef.current = currentUser;
  const isServerOnlineRef = useRef<boolean>(isServerOnline);
  isServerOnlineRef.current = isServerOnline;

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

  // Health check, Exchange Rates, Device Sync QR & Users initialization
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

      // If server is online, push all local users to backend so they're registered
      if (serverOk && localUsers.length > 0) {
        try {
          await Promise.all(localUsers.map((u) => apiClient.upsertUser(u)));
        } catch (e) {
          console.warn('Failed syncing local users to backend:', e);
        }
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

      // Check if URL has ?syncUser= query for phone pairing
      const syncUserParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('syncUser')
          : null;

      let active: UserProfile | null = null;
      if (syncUserParam) {
        active = mergedUsers.find((u) => u.id === syncUserParam) || null;
        if (!active && serverOk) {
          try {
            const userWithData = await apiClient.getUserWithData(syncUserParam);
            if (userWithData && userWithData.user) {
              const matchedUser = userWithData.user;
              active = matchedUser;
              mergedUsers = [...mergedUsers.filter((u) => u.id !== matchedUser.id), matchedUser];
            } else {
              const remoteUsers = await apiClient.getUsers();
              const foundRemote = remoteUsers.find((u) => u.id === syncUserParam) || null;
              if (foundRemote) {
                active = foundRemote;
                mergedUsers = [...mergedUsers.filter((u) => u.id !== foundRemote.id), foundRemote];
              }
            }
          } catch (e) {
            console.warn('Error pairing user via syncUserParam:', e);
          }
        }
        if (active && typeof window !== 'undefined') {
          localStorage.setItem('active_user_id', active.id);
          const url = new URL(window.location.href);
          url.searchParams.delete('syncUser');
          window.history.replaceState({}, '', url.pathname);
          soundFx.playCelebration();
        }
      }

      setUsers(mergedUsers);
      localStorage.setItem('users_list', JSON.stringify(mergedUsers));

      if (!active) {
        const savedUserId = localStorage.getItem('active_user_id');
        active = mergedUsers.find((u) => u.id === savedUserId) || mergedUsers[0] || null;
      }

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

    // Heartbeat check for server every 10 seconds & fetch rates periodically
    const interval = setInterval(async () => {
      const ok = await apiClient.checkHealth();
      setIsServerOnline(ok);
      const rates = await apiClient.fetchExchangeRates();
      if (rates) {
        setExchangeRates(rates);
        setExchangeRatesState({ ...rates });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Real-Time Cross-Device Background Polling & Window Focus Sync (Laptop <-> Mobile)
  useEffect(() => {
    if (!initialized) return;

    const checkCrossDeviceSync = async () => {
      const user = currentUserRef.current;
      if (!user || !isServerOnlineRef.current || isSyncingRef.current) return;

      try {
        const meta = await apiClient.getUserDataMeta(user.id);
        if (meta && typeof meta.version === 'number' && meta.version > dataVersionRef.current) {
          dataVersionRef.current = meta.version;
          const latest = await apiClient.fetchUserData(user.id);
          if (latest) {
            isSyncingRef.current = true;
            setTransactions(latest.transactions || []);
            setBudgets(latest.budgets || []);
            setBillGroups(latest.billGroups || []);
            setAccounts(latest.accounts || []);
            setGoals(latest.goals || []);
            setSubscriptions(latest.subscriptions || []);
            localStorage.setItem(`user_data_${user.id}`, JSON.stringify(latest));
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 250);
          }
        }
      } catch (e) {
        console.warn('Cross-device background sync error:', e);
      }
    };

    // Polling every 3.5 seconds for continuous real-time sync
    const pollInterval = setInterval(checkCrossDeviceSync, 3500);

    // Instant sync when switching to tab or unlocking mobile screen
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkCrossDeviceSync();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkCrossDeviceSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkCrossDeviceSync);
    };
  }, [initialized]);

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
      if (typeof finalPayload.version === 'number') {
        dataVersionRef.current = finalPayload.version;
      }
      setTransactions(finalPayload.transactions || []);
      setBudgets(finalPayload.budgets || []);
      setBillGroups(finalPayload.billGroups || []);
      setAccounts(finalPayload.accounts || []);
      setGoals(finalPayload.goals || []);
      setSubscriptions(finalPayload.subscriptions || []);
      localStorage.setItem(`user_data_${userId}`, JSON.stringify(finalPayload));
    } else {
      // Clean initial state for fresh profile without dummy data overwrite
      const emptyPayload: UserDataPayload = {
        transactions: [],
        budgets: [],
        billGroups: [],
        accounts: [
          {
            id: `acc-${Date.now()}-1`,
            name: `Primary Wallet`,
            type: 'checking',
            balance: 0,
            currency: currency || 'USD',
            institution: 'Main Wallet',
            accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
            color: 'from-blue-600 to-indigo-700',
            isDefault: true,
          },
        ],
        goals: [],
        subscriptions: [],
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      setTransactions(emptyPayload.transactions);
      setBudgets(emptyPayload.budgets);
      setBillGroups(emptyPayload.billGroups);
      setAccounts(emptyPayload.accounts);
      setGoals(emptyPayload.goals);
      setSubscriptions(emptyPayload.subscriptions);
      localStorage.setItem(`user_data_${userId}`, JSON.stringify(emptyPayload));
      if (online) {
        apiClient.syncUserData(userId, emptyPayload);
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

  const handleImportData = (importedData: any): boolean => {
    if (!importedData || typeof importedData !== 'object') return false;

    const targetUserId = currentUser?.id || 'user_1';

    let txs: Transaction[] = [];
    let bgts: Budget[] = [];
    let groups: BillGroup[] = [];
    let accs: Account[] = [];
    let gls: Goal[] = [];
    let subs: Subscription[] = [];

    // Support single profile format
    if (Array.isArray(importedData.transactions)) txs = importedData.transactions;
    if (Array.isArray(importedData.budgets)) bgts = importedData.budgets;
    if (Array.isArray(importedData.billGroups)) groups = importedData.billGroups;
    if (Array.isArray(importedData.accounts)) accs = importedData.accounts;
    if (Array.isArray(importedData.goals)) gls = importedData.goals;
    if (Array.isArray(importedData.subscriptions)) subs = importedData.subscriptions;

    // Support nested userData format
    if (importedData.userData && typeof importedData.userData === 'object') {
      if (Array.isArray(importedData.userData.transactions)) txs = importedData.userData.transactions;
      if (Array.isArray(importedData.userData.budgets)) bgts = importedData.userData.budgets;
      if (Array.isArray(importedData.userData.billGroups)) groups = importedData.userData.billGroups;
      if (Array.isArray(importedData.userData.accounts)) accs = importedData.userData.accounts;
      if (Array.isArray(importedData.userData.goals)) gls = importedData.userData.goals;
      if (Array.isArray(importedData.userData.subscriptions)) subs = importedData.userData.subscriptions;
    }

    if (importedData.settings) {
      if (importedData.settings.theme) setTheme(importedData.settings.theme);
      if (importedData.settings.currency) setCurrency(importedData.settings.currency);
    }

    setTransactions(txs);
    setBudgets(bgts);
    setBillGroups(groups);
    setAccounts(accs);
    setGoals(gls);
    setSubscriptions(subs);

    const nextVer = (dataVersionRef.current || 0) + 1;
    dataVersionRef.current = nextVer;

    const payload: UserDataPayload = {
      transactions: txs,
      budgets: bgts,
      billGroups: groups,
      accounts: accs,
      goals: gls,
      subscriptions: subs,
      version: nextVer,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`user_data_${targetUserId}`, JSON.stringify(payload));
    if (isServerOnline) {
      apiClient.syncUserData(targetUserId, payload);
    }

    soundFx.playCelebration();
    return true;
  };

  const handleForceSync = async () => {
    if (!currentUser) return;
    const payload: UserDataPayload = {
      transactions,
      budgets,
      billGroups,
      accounts,
      goals,
      subscriptions,
      version: (dataVersionRef.current || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    dataVersionRef.current = payload.version || 1;
    localStorage.setItem(`user_data_${currentUser.id}`, JSON.stringify(payload));
    if (isServerOnline) {
      await apiClient.syncUserData(currentUser.id, payload);
      soundFx.playSuccess();
    }
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

  if (sharedGroupId) {
    return (
      <SharedBillPortal
        groupId={sharedGroupId}
        onExitPortal={() => {
          setSharedGroupId(null);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('splitGroup');
            url.searchParams.delete('shareGroup');
            url.searchParams.delete('group');
            window.history.replaceState({}, '', url.pathname);
          }
        }}
      />
    );
  }

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
        existingUsers={users}
        onSelectExistingUser={handleSelectUser}
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
        onOpenSharedPortal={(gid) => setSharedGroupId(gid)}
        onOpenDeviceSync={() => setShowDeviceSyncModal(true)}
        onLockWorkspace={() => setIsLocked(true)}
        onResetData={resetData}
        onLoadDemoData={loadDemoData}
        onImportData={handleImportData}
      />
      <LockScreen
        isLocked={isLocked}
        currentUser={currentUser}
        onUnlock={() => setIsLocked(false)}
        onOpenUserSwitcher={() => {
          setIsLocked(false);
        }}
      />
      {currentUser && (
        <DeviceSyncModal
          isOpen={showDeviceSyncModal}
          onClose={() => setShowDeviceSyncModal(false)}
          currentUser={currentUser}
          isServerOnline={isServerOnline}
          transactions={transactions}
          budgets={budgets}
          billGroups={billGroups}
          accounts={accounts}
          goals={goals}
          subscriptions={subscriptions}
          onImportData={handleImportData}
          onForceSync={handleForceSync}
        />
      )}
    </>
  );
}

export default App;
