import { useState } from 'react';
import { CURRENCY_MAP } from '../store';
import { soundFx } from '../utils/audio';
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

export function OnboardingWelcome({ onCreateUser, isServerOnline }: OnboardingWelcomeProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [role, setRole] = useState('Personal');
  const [color, setColor] = useState('#6366f1');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            Create Your Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Your finances remain 100% private. Set up your custom profile and primary wallet to get started.
          </p>
        </div>

        {/* Setup Form */}
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
                  placeholder="e.g., Arnav Jain"
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
                  className={`w-8 h-8 rounded-full transition-transform flex items-center justify-center ${
                    color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
          >
            <span>{isSubmitting ? 'Creating Profile...' : 'Launch ApexFinance Pro'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
