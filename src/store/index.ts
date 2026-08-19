export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  notes?: string;
  accountId?: string;
  toAccountId?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface BillMember {
  name: string;
  paidAmount: number;
  shareAmount: number;
}

export interface BillExpense {
  id: string;
  description: string;
  totalAmount: number;
  paidBy: string; // Member name
  members: BillMember[];
  date: string;
  category?: string;
}

export interface BillGroup {
  id: string;
  name: string;
  members: string[]; // Names of members
  expenses: BillExpense[];
  createdAt?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  institution: string;
  accountNumber: string;
  color: string;
  isDefault?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  color: string;
  notes?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly' | 'weekly';
  category: string;
  nextDueDate: string;
  autoRenew: boolean;
  providerUrl?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  notifications: boolean;
}

export const CURRENCY_MAP: Record<string, { symbol: string; label: string; code: string }> = {
  USD: { symbol: '$', label: 'USD - US Dollar ($)', code: 'USD' },
  EUR: { symbol: '€', label: 'EUR - Euro (€)', code: 'EUR' },
  GBP: { symbol: '£', label: 'GBP - British Pound (£)', code: 'GBP' },
  INR: { symbol: '₹', label: 'INR - Indian Rupee (₹)', code: 'INR' },
  JPY: { symbol: '¥', label: 'JPY - Japanese Yen (¥)', code: 'JPY' },
  CAD: { symbol: 'CA$', label: 'CAD - Canadian Dollar (CA$)', code: 'CAD' },
  AUD: { symbol: 'AU$', label: 'AUD - Australian Dollar (AU$)', code: 'AUD' },
};

export const CATEGORIES = [
  'Housing',
  'Food & Dining',
  'Transport',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Education',
  'Salary',
  'Freelance',
  'Investments',
  'Transfer',
  'Other',
] as const;

export type CategoryType = typeof CATEGORIES[number];

export interface CategoryInfo {
  name: string;
  color: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
  icon: string;
}

export const CATEGORY_DETAILS: Record<string, CategoryInfo> = {
  'Housing': {
    name: 'Housing',
    color: '#6366f1',
    bgLight: 'bg-indigo-50/90',
    bgDark: 'dark:bg-indigo-950/40',
    textLight: 'text-indigo-700',
    textDark: 'dark:text-indigo-400',
    borderLight: 'border-indigo-200',
    borderDark: 'dark:border-indigo-800/60',
    icon: 'Home',
  },
  'Food & Dining': {
    name: 'Food & Dining',
    color: '#f97316',
    bgLight: 'bg-orange-50/90',
    bgDark: 'dark:bg-orange-950/40',
    textLight: 'text-orange-700',
    textDark: 'dark:text-orange-400',
    borderLight: 'border-orange-200',
    borderDark: 'dark:border-orange-800/60',
    icon: 'Utensils',
  },
  'Food': {
    name: 'Food & Dining',
    color: '#f97316',
    bgLight: 'bg-orange-50/90',
    bgDark: 'dark:bg-orange-950/40',
    textLight: 'text-orange-700',
    textDark: 'dark:text-orange-400',
    borderLight: 'border-orange-200',
    borderDark: 'dark:border-orange-800/60',
    icon: 'Utensils',
  },
  'Transport': {
    name: 'Transport',
    color: '#0284c7',
    bgLight: 'bg-sky-50/90',
    bgDark: 'dark:bg-sky-950/40',
    textLight: 'text-sky-700',
    textDark: 'dark:text-sky-400',
    borderLight: 'border-sky-200',
    borderDark: 'dark:border-sky-800/60',
    icon: 'Car',
  },
  'Entertainment': {
    name: 'Entertainment',
    color: '#a855f7',
    bgLight: 'bg-purple-50/90',
    bgDark: 'dark:bg-purple-950/40',
    textLight: 'text-purple-700',
    textDark: 'dark:text-purple-400',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-800/60',
    icon: 'Film',
  },
  'Utilities': {
    name: 'Utilities',
    color: '#06b6d4',
    bgLight: 'bg-cyan-50/90',
    bgDark: 'dark:bg-cyan-950/40',
    textLight: 'text-cyan-700',
    textDark: 'dark:text-cyan-400',
    borderLight: 'border-cyan-200',
    borderDark: 'dark:border-cyan-800/60',
    icon: 'Zap',
  },
  'Healthcare': {
    name: 'Healthcare',
    color: '#f43f5e',
    bgLight: 'bg-rose-50/90',
    bgDark: 'dark:bg-rose-950/40',
    textLight: 'text-rose-700',
    textDark: 'dark:text-rose-400',
    borderLight: 'border-rose-200',
    borderDark: 'dark:border-rose-800/60',
    icon: 'HeartPulse',
  },
  'Shopping': {
    name: 'Shopping',
    color: '#ec4899',
    bgLight: 'bg-pink-50/90',
    bgDark: 'dark:bg-pink-950/40',
    textLight: 'text-pink-700',
    textDark: 'dark:text-pink-400',
    borderLight: 'border-pink-200',
    borderDark: 'dark:border-pink-800/60',
    icon: 'ShoppingBag',
  },
  'Education': {
    name: 'Education',
    color: '#14b8a6',
    bgLight: 'bg-teal-50/90',
    bgDark: 'dark:bg-teal-950/40',
    textLight: 'text-teal-700',
    textDark: 'dark:text-teal-400',
    borderLight: 'border-teal-200',
    borderDark: 'dark:border-teal-800/60',
    icon: 'GraduationCap',
  },
  'Salary': {
    name: 'Salary',
    color: '#10b981',
    bgLight: 'bg-emerald-50/90',
    bgDark: 'dark:bg-emerald-950/40',
    textLight: 'text-emerald-700',
    textDark: 'dark:text-emerald-400',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-800/60',
    icon: 'Briefcase',
  },
  'Freelance': {
    name: 'Freelance',
    color: '#10b981',
    bgLight: 'bg-emerald-50/90',
    bgDark: 'dark:bg-emerald-950/40',
    textLight: 'text-emerald-700',
    textDark: 'dark:text-emerald-400',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-800/60',
    icon: 'Laptop',
  },
  'Investments': {
    name: 'Investments',
    color: '#8b5cf6',
    bgLight: 'bg-violet-50/90',
    bgDark: 'dark:bg-violet-950/40',
    textLight: 'text-violet-700',
    textDark: 'dark:text-violet-400',
    borderLight: 'border-violet-200',
    borderDark: 'dark:border-violet-800/60',
    icon: 'TrendingUp',
  },
  'Transfer': {
    name: 'Transfer',
    color: '#6366f1',
    bgLight: 'bg-indigo-50/90',
    bgDark: 'dark:bg-indigo-950/40',
    textLight: 'text-indigo-700',
    textDark: 'dark:text-indigo-400',
    borderLight: 'border-indigo-200',
    borderDark: 'dark:border-indigo-800/60',
    icon: 'ArrowRightLeft',
  },
  'Other': {
    name: 'Other',
    color: '#64748b',
    bgLight: 'bg-slate-100',
    bgDark: 'dark:bg-slate-800/60',
    textLight: 'text-slate-700',
    textDark: 'dark:text-slate-400',
    borderLight: 'border-slate-200',
    borderDark: 'dark:border-slate-700',
    icon: 'CircleDot',
  },
};

export const getCategoryMeta = (category: string): CategoryInfo => {
  return CATEGORY_DETAILS[category] || CATEGORY_DETAILS['Other'];
};

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.864,
  GBP: 0.739,
  INR: 95.77,
  JPY: 159.59,
  CAD: 1.389,
  AUD: 1.410,
};

let currentExchangeRates: Record<string, number> = { ...DEFAULT_EXCHANGE_RATES };

export const setExchangeRates = (rates: Record<string, number>) => {
  currentExchangeRates = { ...currentExchangeRates, ...rates };
};

export const getExchangeRates = (): Record<string, number> => {
  return currentExchangeRates;
};

export const getExchangeRate = (currencyCode: string): number => {
  return currentExchangeRates[currencyCode] || DEFAULT_EXCHANGE_RATES[currencyCode] || 1.0;
};

export const convertCurrency = (
  amount: number,
  toCurrency: string,
  fromCurrency = 'USD'
): number => {
  if (!amount || toCurrency === fromCurrency) return amount;
  const fromRate = getExchangeRate(fromCurrency);
  const toRate = getExchangeRate(toCurrency);
  if (fromRate === 0) return amount;
  return (amount / fromRate) * toRate;
};

export const toBaseCurrency = (amount: number, fromCurrency = 'USD'): number => {
  return convertCurrency(amount, 'USD', fromCurrency);
};

export const fromBaseCurrency = (amount: number, toCurrency = 'USD'): number => {
  return convertCurrency(amount, toCurrency, 'USD');
};

export const formatRawCurrency = (amount: number, currencyCode = 'USD'): string => {
  const meta = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.USD;
  const isNegative = amount < 0;
  const decimals = currencyCode === 'JPY' ? 0 : 2;
  const absFormatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${isNegative ? '-' : ''}${meta.symbol}${absFormatted}`;
};

export const formatCurrency = (
  amount: number,
  currencyCode = 'USD',
  fromCurrency = 'USD'
): string => {
  const converted = convertCurrency(amount, currencyCode, fromCurrency);
  const meta = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.USD;
  const isNegative = converted < 0;
  const decimals = currencyCode === 'JPY' ? 0 : 2;
  const absFormatted = Math.abs(converted).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${isNegative ? '-' : ''}${meta.symbol}${absFormatted}`;
};

// Sample multi-accounts
export const SAMPLE_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'Chase Sapphire Premier',
    type: 'checking',
    balance: 4850.0,
    currency: 'USD',
    institution: 'Chase Bank',
    accountNumber: '•••• 4892',
    color: 'from-blue-600 to-indigo-700',
    isDefault: true,
  },
  {
    id: 'acc-2',
    name: 'High-Yield Wealth Vault',
    type: 'savings',
    balance: 18400.0,
    currency: 'USD',
    institution: 'Marcus by Goldman',
    accountNumber: '•••• 7120',
    color: 'from-emerald-600 to-teal-700',
  },
  {
    id: 'acc-3',
    name: 'Amex Gold Preferred',
    type: 'credit',
    balance: -920.0,
    currency: 'USD',
    institution: 'American Express',
    accountNumber: '•••• 3094',
    color: 'from-amber-600 to-yellow-700',
  },
  {
    id: 'acc-4',
    name: 'Vanguard Index Portfolio',
    type: 'investment',
    balance: 34500.0,
    currency: 'USD',
    institution: 'Vanguard',
    accountNumber: '•••• 9941',
    color: 'from-purple-600 to-indigo-800',
  },
  {
    id: 'acc-5',
    name: 'Physical Cash Reserve',
    type: 'cash',
    balance: 240.0,
    currency: 'USD',
    institution: 'Cash Wallet',
    accountNumber: 'Cash',
    color: 'from-slate-600 to-slate-800',
  },
];

// Sample savings goals
export const SAMPLE_GOALS: Goal[] = [
  {
    id: 'goal-1',
    name: '6-Month Emergency Runway',
    targetAmount: 12000,
    currentAmount: 8500,
    targetDate: '2026-12-31',
    category: 'Safety',
    color: '#10b981',
    notes: 'Essential living cushion covering rent, food & utilities',
  },
  {
    id: 'goal-2',
    name: 'Autumn Japan Trip (Tokyo/Kyoto)',
    targetAmount: 4200,
    currentAmount: 3100,
    targetDate: '2026-10-15',
    category: 'Travel',
    color: '#f97316',
    notes: 'Flights, Shinkansen pass, Ryokan booking and dining',
  },
  {
    id: 'goal-3',
    name: 'M4 Max Studio Workstation',
    targetAmount: 2800,
    currentAmount: 2200,
    targetDate: '2026-09-30',
    category: 'Tech',
    color: '#6366f1',
    notes: 'Upgraded workstation for freelance software development',
  },
  {
    id: 'goal-4',
    name: 'Suburban Property Down Payment',
    targetAmount: 60000,
    currentAmount: 22500,
    targetDate: '2028-06-30',
    category: 'Real Estate',
    color: '#8b5cf6',
    notes: 'Long-term goal targeting 20% down payment buffer',
  },
];

// Sample subscriptions
export const SAMPLE_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    name: 'Netflix 4K Ultra HD',
    amount: 22.99,
    billingCycle: 'monthly',
    category: 'Entertainment',
    nextDueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    autoRenew: true,
    providerUrl: 'https://netflix.com',
  },
  {
    id: 'sub-2',
    name: 'Spotify Premium Family',
    amount: 16.99,
    billingCycle: 'monthly',
    category: 'Entertainment',
    nextDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    autoRenew: true,
    providerUrl: 'https://spotify.com',
  },
  {
    id: 'sub-3',
    name: 'AWS Cloud Compute & DB',
    amount: 48.50,
    billingCycle: 'monthly',
    category: 'Utilities',
    nextDueDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    autoRenew: true,
    providerUrl: 'https://aws.amazon.com',
  },
  {
    id: 'sub-4',
    name: 'Equinox Health & Fitness',
    amount: 180.00,
    billingCycle: 'monthly',
    category: 'Healthcare',
    nextDueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    autoRenew: true,
  },
  {
    id: 'sub-5',
    name: 'GitHub Copilot Enterprise',
    amount: 19.00,
    billingCycle: 'monthly',
    category: 'Education',
    nextDueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    autoRenew: true,
    providerUrl: 'https://github.com',
  },
  {
    id: 'sub-6',
    name: 'Amazon Prime Annual',
    amount: 139.00,
    billingCycle: 'yearly',
    category: 'Shopping',
    nextDueDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0],
    autoRenew: true,
    providerUrl: 'https://amazon.com',
  },
];

// Realistic mock transactions
export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    description: 'Tech Corp Monthly Salary',
    amount: 5200.0,
    type: 'income',
    category: 'Salary',
    notes: 'Direct deposit for primary software engineering role',
    accountId: 'acc-1',
  },
  {
    id: 'tx-2',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    description: 'Luxury Apartment Rent',
    amount: 1750.0,
    type: 'expense',
    category: 'Housing',
    notes: 'Monthly apartment lease payment',
    accountId: 'acc-1',
  },
  {
    id: 'tx-3',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    description: 'Whole Foods Market',
    amount: 142.80,
    type: 'expense',
    category: 'Food & Dining',
    notes: 'Weekly organic groceries and supplies',
    accountId: 'acc-3',
  },
  {
    id: 'tx-4',
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    description: 'UI/UX Design Contract',
    amount: 1450.0,
    type: 'income',
    category: 'Freelance',
    notes: 'Payment for client mobile app wireframes',
    accountId: 'acc-1',
  },
  {
    id: 'tx-5',
    date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    description: 'Electric & Fiber Internet Bill',
    amount: 118.50,
    type: 'expense',
    category: 'Utilities',
    notes: 'City power + Gigabit broadband',
    accountId: 'acc-1',
  },
  {
    id: 'tx-6',
    date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
    description: 'Tesla Supercharging & Tolls',
    amount: 48.25,
    type: 'expense',
    category: 'Transport',
    notes: 'Commute and charging fees',
    accountId: 'acc-3',
  },
  {
    id: 'tx-7',
    date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    description: 'Vanguard Index Dividend',
    amount: 285.40,
    type: 'income',
    category: 'Investments',
    notes: 'Quarterly S&P 500 ETF dividend payout',
    accountId: 'acc-4',
  },
  {
    id: 'tx-8',
    date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
    description: 'Apple Store - Studio Headphones',
    amount: 349.00,
    type: 'expense',
    category: 'Shopping',
    notes: 'Noise-cancelling headphones for workspace',
    accountId: 'acc-3',
  },
  {
    id: 'tx-9',
    date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    description: 'Cinema & Italian Bistro Night',
    amount: 96.00,
    type: 'expense',
    category: 'Entertainment',
    notes: 'Dinner with friends and IMAX tickets',
    accountId: 'acc-3',
  },
  {
    id: 'tx-10',
    date: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0],
    description: 'Dentist Checkup & Cleaning',
    amount: 120.00,
    type: 'expense',
    category: 'Healthcare',
    notes: 'Routine dental preventative visit',
    accountId: 'acc-1',
  },
  {
    id: 'tx-11',
    date: new Date(Date.now() - 22 * 86400000).toISOString().split('T')[0],
    description: 'Online Masterclass Subscription',
    amount: 65.00,
    type: 'expense',
    category: 'Education',
    notes: 'Fullstack cloud architecture course',
    accountId: 'acc-1',
  },
  {
    id: 'tx-12',
    date: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    description: 'Artisan Coffee & Bakery',
    amount: 28.50,
    type: 'expense',
    category: 'Food & Dining',
    notes: 'Morning coffee batch with team',
    accountId: 'acc-5',
  },
];

export const SAMPLE_BUDGETS: Budget[] = [
  { id: 'b-1', category: 'Housing', limit: 2000 },
  { id: 'b-2', category: 'Food & Dining', limit: 600 },
  { id: 'b-3', category: 'Transport', limit: 250 },
  { id: 'b-4', category: 'Entertainment', limit: 200 },
  { id: 'b-5', category: 'Shopping', limit: 500 },
  { id: 'b-6', category: 'Utilities', limit: 200 },
];

export const SAMPLE_BILL_GROUPS: BillGroup[] = [
  {
    id: 'group-1',
    name: 'Pacific Heights Roommates',
    members: ['Alex (You)', 'Sarah', 'Marcus'],
    expenses: [
      {
        id: 'exp-1',
        description: 'Superfast Mesh Wifi (Quarterly)',
        totalAmount: 180.0,
        paidBy: 'Alex (You)',
        date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        members: [
          { name: 'Alex (You)', paidAmount: 180.0, shareAmount: 60.0 },
          { name: 'Sarah', paidAmount: 0, shareAmount: 60.0 },
          { name: 'Marcus', paidAmount: 0, shareAmount: 60.0 },
        ],
      },
      {
        id: 'exp-2',
        description: 'Apartment Supplies & Cleaning',
        totalAmount: 90.0,
        paidBy: 'Sarah',
        date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
        members: [
          { name: 'Alex (You)', paidAmount: 0, shareAmount: 30.0 },
          { name: 'Sarah', paidAmount: 90.0, shareAmount: 30.0 },
          { name: 'Marcus', paidAmount: 0, shareAmount: 30.0 },
        ],
      },
    ],
  },
  {
    id: 'group-2',
    name: 'Lake Tahoe Ski Trip ⛷️',
    members: ['Alex (You)', 'David', 'Elena', 'Chloe'],
    expenses: [
      {
        id: 'exp-3',
        description: 'Cabin Airbnb Booking',
        totalAmount: 840.0,
        paidBy: 'David',
        date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        members: [
          { name: 'Alex (You)', paidAmount: 0, shareAmount: 210.0 },
          { name: 'David', paidAmount: 840.0, shareAmount: 210.0 },
          { name: 'Elena', paidAmount: 0, shareAmount: 210.0 },
          { name: 'Chloe', paidAmount: 0, shareAmount: 210.0 },
        ],
      },
      {
        id: 'exp-4',
        description: 'Group Grocery & BBQ Feast',
        totalAmount: 260.0,
        paidBy: 'Alex (You)',
        date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
        members: [
          { name: 'Alex (You)', paidAmount: 260.0, shareAmount: 65.0 },
          { name: 'David', paidAmount: 0, shareAmount: 65.0 },
          { name: 'Elena', paidAmount: 0, shareAmount: 65.0 },
          { name: 'Chloe', paidAmount: 0, shareAmount: 65.0 },
        ],
      },
    ],
  },
];

export const initStorage = () => {
  let transactions: Transaction[] = [];
  let budgets: Budget[] = [];
  let billGroups: BillGroup[] = [];
  let accounts: Account[] = [];
  let goals: Goal[] = [];
  let subscriptions: Subscription[] = [];

  try {
    const rawTx = localStorage.getItem('transactions');
    const rawBudgets = localStorage.getItem('budgets');
    const rawGroups = localStorage.getItem('billGroups');
    const rawAccounts = localStorage.getItem('accounts');
    const rawGoals = localStorage.getItem('goals');
    const rawSubs = localStorage.getItem('subscriptions');

    transactions = rawTx ? JSON.parse(rawTx) : SAMPLE_TRANSACTIONS;
    budgets = rawBudgets ? JSON.parse(rawBudgets) : SAMPLE_BUDGETS;
    billGroups = rawGroups ? JSON.parse(rawGroups) : SAMPLE_BILL_GROUPS;
    accounts = rawAccounts ? JSON.parse(rawAccounts) : SAMPLE_ACCOUNTS;
    goals = rawGoals ? JSON.parse(rawGoals) : SAMPLE_GOALS;
    subscriptions = rawSubs ? JSON.parse(rawSubs) : SAMPLE_SUBSCRIPTIONS;

    // Seed defaults if missing
    if (!rawTx) localStorage.setItem('transactions', JSON.stringify(SAMPLE_TRANSACTIONS));
    if (!rawBudgets) localStorage.setItem('budgets', JSON.stringify(SAMPLE_BUDGETS));
    if (!rawGroups) localStorage.setItem('billGroups', JSON.stringify(SAMPLE_BILL_GROUPS));
    if (!rawAccounts) localStorage.setItem('accounts', JSON.stringify(SAMPLE_ACCOUNTS));
    if (!rawGoals) localStorage.setItem('goals', JSON.stringify(SAMPLE_GOALS));
    if (!rawSubs) localStorage.setItem('subscriptions', JSON.stringify(SAMPLE_SUBSCRIPTIONS));
  } catch (e) {
    console.error('Failed to load local storage:', e);
    transactions = SAMPLE_TRANSACTIONS;
    budgets = SAMPLE_BUDGETS;
    billGroups = SAMPLE_BILL_GROUPS;
    accounts = SAMPLE_ACCOUNTS;
    goals = SAMPLE_GOALS;
    subscriptions = SAMPLE_SUBSCRIPTIONS;
  }

  return { transactions, budgets, billGroups, accounts, goals, subscriptions };
};
