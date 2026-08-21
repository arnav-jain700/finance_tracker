import { useState } from 'react';
import {
  Account,
  Transaction,
  CURRENCY_MAP,
  formatCurrency,
  toBaseCurrency,
  fromBaseCurrency,
} from '../store';
import { soundFx } from '../utils/audio';
import {
  Plus,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Wallet,
  Landmark,
  CreditCard,
  TrendingUp,
  Coins,
  ShieldCheck,
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Check,
} from 'lucide-react';

interface AccountsViewProps {
  accounts: Account[];
  currency: string;
  onAddAccount: (acc: Omit<Account, 'id'>) => void;
  onUpdateAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
  onTransfer: (fromId: string, toId: string, amount: number, notes?: string) => void;
}

const ACCOUNT_TYPE_ICONS: Record<Account['type'], typeof Wallet> = {
  checking: Landmark,
  savings: ShieldCheck,
  credit: CreditCard,
  investment: TrendingUp,
  cash: Coins,
};

const COLOR_GRADIENTS = [
  { label: 'Indigo / Blue', value: 'from-blue-600 to-indigo-700' },
  { label: 'Emerald / Teal', value: 'from-emerald-600 to-teal-700' },
  { label: 'Purple / Violet', value: 'from-purple-600 to-indigo-800' },
  { label: 'Amber / Orange', value: 'from-amber-600 to-yellow-700' },
  { label: 'Rose / Pink', value: 'from-rose-600 to-pink-700' },
  { label: 'Slate / Dark', value: 'from-slate-700 to-slate-900' },
];

export function AccountsView({
  accounts,
  currency,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransfer,
}: AccountsViewProps) {
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states for account
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState(COLOR_GRADIENTS[0].value);

  // Transfer form states
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Net worth calculation
  const totalAssets = accounts
    .filter((a) => a.balance > 0)
    .reduce((acc, a) => acc + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.balance < 0)
    .reduce((acc, a) => acc + Math.abs(a.balance), 0);

  const netWorth = totalAssets - totalLiabilities;

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName('');
    setType('checking');
    setInstitution('');
    setBalance('');
    setAccountNumber('•••• ' + Math.floor(1000 + Math.random() * 9000));
    setColor(COLOR_GRADIENTS[0].value);
    setShowAccountModal(true);
  };

const formatNumForInput = (num: number): string => {
  if (isNaN(num)) return '';
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
    return Math.round(rounded).toString();
  }
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setInstitution(acc.institution);
    setBalance(formatNumForInput(fromBaseCurrency(acc.balance, currency)));
    setAccountNumber(acc.accountNumber);
    setColor(acc.color);
    setShowAccountModal(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || balance === '') return;

    const baseBal = toBaseCurrency(Number(balance), currency);

    const accData = {
      name: name.trim(),
      type,
      institution: institution.trim() || name.trim(),
      balance: baseBal,
      currency,
      accountNumber: accountNumber.trim() || '•••• ' + Math.floor(1000 + Math.random() * 9000),
      color,
    };

    if (editingAccount) {
      onUpdateAccount({ ...accData, id: editingAccount.id });
    } else {
      onAddAccount(accData);
    }

    soundFx.playSuccess();
    setShowAccountModal(false);
    setEditingAccount(null);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmt = Number(transferAmount);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId || !rawAmt || rawAmt <= 0) {
      return;
    }

    const amtBase = toBaseCurrency(rawAmt, currency);

    onTransfer(fromAccountId, toAccountId, amtBase, transferNotes.trim() || undefined);
    soundFx.playTransfer();
    setTransferAmount('');
    setTransferNotes('');
    setShowTransferModal(false);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Accounts & Wallets
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your liquid checking, savings vaults, credit cards, and investments
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {accounts.length >= 2 && (
            <button
              onClick={() => {
                setFromAccountId(accounts[0].id);
                setToAccountId(accounts[1].id);
                setShowTransferModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold shadow-sm transition-all"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Transfer Funds</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Net Worth Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Net Worth</p>
          <h3 className={`text-2xl sm:text-3xl font-bold font-heading mt-1 ${netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
            {formatCurrency(netWorth, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Across all {accounts.length} linked accounts</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Liquid Assets & Investments</p>
          <h3 className="text-2xl sm:text-3xl font-bold font-heading text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalAssets, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Cash, Checking, Savings & Brokerage</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Outstanding Liabilities</p>
          <h3 className="text-2xl sm:text-3xl font-bold font-heading text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalLiabilities, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Credit cards & short-term debt</p>
        </div>
      </div>

      {/* Virtual Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const IconComp = ACCOUNT_TYPE_ICONS[acc.type] || Wallet;
          const isNegative = acc.balance < 0;

          return (
            <div
              key={acc.id}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${acc.color} p-6 text-white shadow-xl shadow-slate-900/10 border border-white/15 flex flex-col justify-between min-h-[210px] hover-lift group`}
            >
              {/* Card top row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <IconComp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm font-heading">{acc.name}</h4>
                    <p className="text-xs text-white/70">{acc.institution}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/80 hover:text-white transition-all"
                    title="Edit account"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove account "${acc.name}"?`)) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/40 backdrop-blur-sm text-white/80 hover:text-white transition-all"
                      title="Delete account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Center: Balance */}
              <div className="my-4">
                <p className="text-xs uppercase tracking-wider text-white/70 font-semibold">
                  {acc.type === 'credit' ? 'Current Balance Due' : 'Available Balance'}
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-heading mt-0.5 tracking-tight">
                  {formatCurrency(acc.balance, currency)}
                </h3>
              </div>

              {/* Card bottom: Account number & card type tag */}
              <div className="flex items-center justify-between pt-3 border-t border-white/15 text-xs text-white/80">
                <span className="font-mono">{acc.accountNumber}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] uppercase font-bold tracking-wider">
                  {acc.type}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add Account Placeholder Card */}
        <button
          onClick={handleOpenAdd}
          className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 p-6 flex flex-col items-center justify-center text-center gap-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all min-h-[210px] group"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Connect New Account</p>
            <p className="text-xs text-slate-500 mt-0.5">Checking, Savings, Card, or Crypto</p>
          </div>
        </button>
      </div>

      {/* Account Add / Edit Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Add Financial Account'}
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Account Nickname
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Chase Sapphire Checking"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Account Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="credit">Credit Card</option>
                      <option value="investment">Investment</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Institution / Bank
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. Chase Bank"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Balance ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      placeholder="0 (negative for debt)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Last 4 Digits
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="•••• 4892"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Color Gradient Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Card Theme Skin
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_GRADIENTS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setColor(g.value)}
                        className={`h-10 rounded-xl bg-gradient-to-r ${g.value} flex items-center justify-center text-white text-xs font-semibold border-2 transition-all cursor-pointer ${
                          color === g.value ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                      >
                        {color === g.value && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {editingAccount ? 'Update Account' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Account Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Transfer Between Accounts
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Transfer From
                  </label>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, currency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Transfer To
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                        {a.name} ({formatCurrency(a.balance, currency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Transfer Amount
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                      {CURRENCY_MAP[currency]?.symbol || '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="e.g., Monthly savings deposit"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Transfer Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
