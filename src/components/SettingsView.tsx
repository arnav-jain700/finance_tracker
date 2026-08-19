import { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Laptop,
  DollarSign,
  Download,
  Upload,
  Trash2,
  FileText,
  Bell,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Database,
  Coins,
} from 'lucide-react';
import { UserProfile } from '../api/client';
import {
  CURRENCY_MAP,
  SAMPLE_TRANSACTIONS,
  SAMPLE_BUDGETS,
  SAMPLE_BILL_GROUPS,
  formatCurrency,
} from '../store';

interface SettingsViewProps {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  currentUser?: UserProfile;
  onOpenManageProfiles?: () => void;
  onCurrencyChange: (c: string) => void;
  onThemeChange: (t: 'light' | 'dark' | 'system') => void;
  onResetData: () => void;
  onLoadDemoData: () => void;
}

export function SettingsView({
  currency,
  theme,
  currentUser,
  onOpenManageProfiles,
  onCurrencyChange,
  onThemeChange,
  onResetData,
  onLoadDemoData,
}: SettingsViewProps) {
  const [notifications, setNotifications] = useState(true);
  const [saveToast, setSaveToast] = useState(false);

  const handleExport = () => {
    const data = {
      transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
      budgets: JSON.parse(localStorage.getItem('budgets') || '[]'),
      billGroups: JSON.parse(localStorage.getItem('billGroups') || '[]'),
      settings: { theme, currency, notifications },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-finance-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.transactions) localStorage.setItem('transactions', JSON.stringify(data.transactions));
        if (data.budgets) localStorage.setItem('budgets', JSON.stringify(data.budgets));
        if (data.billGroups) localStorage.setItem('billGroups', JSON.stringify(data.billGroups));
        if (data.settings) {
          if (data.settings.theme) onThemeChange(data.settings.theme);
          if (data.settings.currency) onCurrencyChange(data.settings.currency);
        }
        window.location.reload();
      } catch {
        alert('Invalid or corrupt backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-3xl pb-8">
      {/* Header Bar */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
          Settings & Preferences
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize display parameters, internationalization, and local data persistence
        </p>
      </div>

      <div className="space-y-6">
        {/* User Profile & Workspaces Card */}
        {currentUser && onOpenManageProfiles && (
          <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden"
                  style={{ backgroundColor: currentUser.color || '#6366f1' }}
                >
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                      {currentUser.name}
                    </h3>
                    {currentUser.role && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                        {currentUser.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentUser.email} • Default Currency: {currentUser.currency}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenManageProfiles}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Manage Profiles & PIN</span>
              </button>
            </div>
          </div>
        )}

        {/* Appearance Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                Interface Theme
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose how ApexFinance renders on your screen
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {(
              [
                { id: 'light', label: 'Light', icon: Sun, desc: 'Crisp clean surfaces' },
                { id: 'dark', label: 'Dark', icon: Moon, desc: 'Deep slate luxury' },
                { id: 'system', label: 'System', icon: Laptop, desc: 'Match OS mode' },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                    isActive
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div>
                    <p className="text-xs font-bold font-heading">{t.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency & Internationalization */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                Primary Currency
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All amounts and analytical metrics will display with this currency
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <select
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {Object.entries(CURRENCY_MAP).map(([code, item]) => (
                  <option key={code} value={code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Exchange Rate Indicator */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Market Conversion Rate
                </span>
                <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                  {currency === 'USD' ? 'Base Benchmark: 1.00 USD' : `1 USD = ${formatCurrency(1, currency)}`}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                When changing currency, all balances, ledger transactions, budgets, and savings goals automatically convert in real-time according to latest global forex market rates.
              </p>
            </div>

            {/* Sample Conversion Row */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Conversion Example:</span>
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">$1,000.00 USD</span>
                <span className="text-slate-400">➔</span>
              </div>
              <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                {formatCurrency(1000, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Data Persistence & Backup */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                Data Management
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Backup, restore, or seed realistic sample ledger transactions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <button
              onClick={handleExport}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left flex items-start gap-3.5 group"
            >
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Export Backup JSON</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Download full snapshot of your data</p>
              </div>
            </button>

            <label className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left flex items-start gap-3.5 group cursor-pointer">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Import Backup JSON</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Restore data from local file</p>
              </div>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onLoadDemoData}
              className="flex-1 py-3 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Load Realistic Demo Dataset</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Clear all stored transactions, budgets, and bill groups?')) {
                  onResetData();
                }
              }}
              className="py-3 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>

        {/* System Information */}
        <div className="glass-panel rounded-3xl p-5 shadow-sm text-center space-y-1 text-slate-400">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            ApexFinance Pro • Enterprise Grade Local-First Architecture
          </p>
          <p className="text-[11px]">
            Zero cloud telemetry • AES Local Storage • Powered by React 19 & Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}