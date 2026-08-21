import { useState } from 'react';
import { CURRENCY_MAP } from '../store';
import { soundFx } from '../utils/audio';
import { UserProfile } from '../api/client';
import {
  Wallet,
  Sparkles,
  Shield,
  Coins,
  ArrowRight,
  User,
  Mail,
  Lock,
  Tag,
  CheckCircle2,
  Globe2,
  Users,
  Smartphone,
  Check,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface OnboardingWelcomeProps {
  onCreateUser: (data: {
    name: string;
    email?: string;
    currency: string;
    initialBalance: number;
    role: string;
    color: string;
    pin?: string;
  }) => Promise<void>;
  existingUsers?: UserProfile[];
  onSelectExistingUser?: (user: UserProfile) => void;
  isServerOnline: boolean;
}

const USER_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#ec4899', // Rose/Pink
  '#f97316', // Orange
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#eab308', // Amber
];

const PRESET_ROLES = ['Personal', 'Family Lead', 'Freelancer', 'Business', 'Student'];

export function OnboardingWelcome({
  onCreateUser,
  existingUsers = [],
  onSelectExistingUser,
  isServerOnline,
}: OnboardingWelcomeProps) {
  const hasExisting = existingUsers.length > 0 && !!onSelectExistingUser;
  const [mode, setMode] = useState<'select' | 'create'>(hasExisting ? 'select' : 'create');

  // Form states for creating a new user
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [role, setRole] = useState('Personal');
  const [color, setColor] = useState('#6366f1');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PIN validation states when selecting existing user
  const [pinPromptUser, setPinPromptUser] = useState<UserProfile | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    soundFx.playSuccess();
    try {
      await onCreateUser({
        name: name.trim(),
        email: email.trim() || undefined,
        currency,
        initialBalance: parseFloat(initialBalance) || 0,
        role,
        color,
        pin: pin.trim() || undefined,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserClick = (u: UserProfile) => {
    if (u.pin) {
      setPinPromptUser(u);
      setEnteredPin('');
      setPinError(false);
    } else {
      soundFx.playSuccess();
      onSelectExistingUser?.(u);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinPromptUser) return;

    if (enteredPin === pinPromptUser.pin) {
      soundFx.playSuccess();
      onSelectExistingUser?.(pinPromptUser);
    } else {
      soundFx.playAlert();
      setPinError(true);
      setEnteredPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to ApexFinance Pro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            {mode === 'select' ? 'Select Your Account' : 'Create Your Profile'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {mode === 'select'
              ? 'Synced accounts found on your cloud server. Tap your profile to continue on this device.'
              : 'Your finances remain 100% private. Set up your custom profile to get started.'}
          </p>
        </div>

        {/* Existing Accounts Mode */}
        {mode === 'select' && hasExisting && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {existingUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleUserClick(u)}
                  className="p-4 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 transition-all text-left flex items-center justify-between group cursor-pointer active:scale-98 shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0 overflow-hidden"
                      style={{ backgroundColor: u.color || '#6366f1' }}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.name)}`}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors truncate">
                        {u.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {u.role || 'Personal'} • {u.currency || 'USD'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0">
                    {u.pin && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMode('create')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Create New Profile</span>
              </button>

              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync Connected
              </span>
            </div>
          </div>
        )}

        {/* Create Profile Mode */}
        {mode === 'create' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Preview & Name */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md border-2 border-white/20 shrink-0 overflow-hidden"
                  style={{ backgroundColor: color }}
                >
                  {name.trim() ? (
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-white/80" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name / Display Name <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address (Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., yourname@domain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Currency & Starting Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Primary Currency</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {Object.entries(CURRENCY_MAP).map(([code, info]) => (
                    <option key={code} value={code} className="bg-slate-900 text-white">
                      {code} ({info.symbol}) — {info.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Starting Account Balance</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {CURRENCY_MAP[currency]?.symbol || '$'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Role & PIN Lock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Profile Role</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r} value={r} className="bg-slate-900 text-white">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Security PIN (Optional)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="4-digit PIN (e.g., 1234)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors tracking-widest"
                />
              </div>
            </div>

            {/* Theme Accent Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Theme Accent Color
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {USER_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                      color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit / Switch Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>{isSubmitting ? 'Creating Profile...' : 'Launch ApexFinance Pro'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {hasExisting && (
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  ← Back to Existing Accounts
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* PIN Verification Modal */}
      {pinPromptUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-panel-glow rounded-3xl p-6 sm:p-7 max-w-sm w-full bg-slate-900 border border-slate-700 text-center space-y-4 shadow-2xl">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white/20"
              style={{ backgroundColor: pinPromptUser.color || '#6366f1' }}
            >
              {pinPromptUser.name.charAt(0)}
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Enter PIN for {pinPromptUser.name}</h3>
              <p className="text-xs text-slate-400 mt-1">This profile is protected with a 4-digit security PIN</p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/\D/g, ''));
                    setPinError(false);
                  }}
                  placeholder="••••"
                  className={`w-36 text-center text-2xl tracking-[0.5em] py-2.5 px-3 rounded-2xl bg-slate-950 border text-white focus:outline-none transition-colors ${
                    pinError ? 'border-rose-500' : 'border-slate-700 focus:border-indigo-500'
                  }`}
                />
                {pinError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Incorrect PIN. Try again.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinPromptUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredPin.length < 4}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
