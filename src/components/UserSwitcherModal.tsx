import { useState } from 'react';
import { UserProfile } from '../api/client';
import { CURRENCY_MAP, toBaseCurrency } from '../store';
import { soundFx } from '../utils/audio';
import { GoogleAuthButton } from './GoogleAuthButton';
import {
  Users,
  UserPlus,
  Check,
  X,
  Sparkles,
  Shield,
  Coins,
  ArrowRight,
  Edit2,
  Trash2,
  KeyRound,
  RotateCcw,
  AlertTriangle,
  Mail,
  UserCheck,
} from 'lucide-react';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser?: UserProfile | null;
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
  onGoogleAuth?: (payload: {
    googleId: string;
    name: string;
    email: string;
    avatar: string;
  }) => Promise<void>;
  onUpdateUser?: (userId: string, data: Partial<Omit<UserProfile, 'id'>>) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  onResetUserData?: (userId: string) => Promise<void>;
  isServerOnline: boolean;
}

const USER_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#e11d48', '#3b82f6'];

export function UserSwitcherModal({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onCreateUser,
  onGoogleAuth,
  onUpdateUser,
  onDeleteUser,
  onResetUserData,
  isServerOnline,
}: UserSwitcherModalProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<UserProfile | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('3500');
  const [role, setRole] = useState('Partner');
  const [color, setColor] = useState(USER_COLORS[0]);
  const [pin, setPin] = useState('1234');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const startCreate = () => {
    setName('');
    setEmail('');
    setCurrency('USD');
    setInitialBalance('3500');
    setRole('Partner');
    setColor(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
    setPin('1234');
    setAvatar('');
    setMode('create');
  };

  const startEdit = (u: UserProfile) => {
    setSelectedUserToEdit(u);
    setName(u.name);
    setEmail(u.email || '');
    setCurrency(u.currency || 'USD');
    setRole(u.role || 'Member');
    setColor(u.color || USER_COLORS[0]);
    setPin(u.pin || '1234');
    setAvatar(u.avatar || '');
    setConfirmDelete(false);
    setConfirmReset(false);
    setMode('edit');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const rawInitial = Number(initialBalance) || 0;
      await onCreateUser({
        name: name.trim(),
        email: email.trim() || undefined,
        currency,
        initialBalance: toBaseCurrency(rawInitial, currency),
        role,
        color,
        pin: pin.trim() || '1234',
      });
      soundFx.playSuccess();
      setMode('list');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit || !name.trim() || !onUpdateUser) return;

    setLoading(true);
    try {
      await onUpdateUser(selectedUserToEdit.id, {
        name: name.trim(),
        email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@apexfinance.io`,
        currency,
        role,
        color,
        pin: pin.trim() || '1234',
        avatar: avatar.trim() || selectedUserToEdit.avatar,
      });
      soundFx.playSuccess();
      setMode('list');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUserToEdit || !onDeleteUser) return;
    if (users.length <= 1) {
      alert('Cannot delete the only active profile.');
      return;
    }

    setLoading(true);
    try {
      await onDeleteUser(selectedUserToEdit.id);
      soundFx.playLock();
      setMode('list');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!selectedUserToEdit || !onResetUserData) return;
    setLoading(true);
    try {
      await onResetUserData(selectedUserToEdit.id);
      soundFx.playSuccess();
      setConfirmReset(false);
      alert(`Financial records for ${selectedUserToEdit.name} have been reset.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                {mode === 'list'
                  ? 'Manage Profiles & Workspaces'
                  : mode === 'create'
                  ? 'Create New User Profile'
                  : `Edit Profile: ${selectedUserToEdit?.name}`}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>Multi-User Isolated Storage</span>
                <span>•</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    isServerOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {isServerOnline ? 'Cloud Synced' : 'Offline Local Mode'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode: List */}
        {mode === 'list' && (
          <div className="space-y-4">
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = currentUser ? u.id === currentUser.id : false;
                return (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                        : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div
                      onClick={() => {
                        onSelectUser(u);
                        onClose();
                      }}
                      className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0 overflow-hidden"
                        style={{ backgroundColor: u.color || '#6366f1' }}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          {u.role && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                              {u.role}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {u.email} • {CURRENCY_MAP[u.currency]?.symbol || '$'} ({u.currency})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Edit profile settings"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {isSelected ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl shadow-xs border border-indigo-200 dark:border-indigo-800">
                          <Check className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectUser(u);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-indigo-600 dark:hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          Switch <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {onGoogleAuth && (
              <div className="pt-1">
                <GoogleAuthButton
                  onSuccess={async (payload) => {
                    await onGoogleAuth(payload);
                    onClose();
                  }}
                  text="Connect with Google"
                />
              </div>
            )}

            <button
              onClick={startCreate}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Custom Offline Profile</span>
            </button>
          </div>
        )}

        {/* Mode: Create */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. emma@apexfinance.io"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Primary Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.keys(CURRENCY_MAP).map((c) => (
                    <option key={c} value={c}>{c} ({CURRENCY_MAP[c].symbol})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Starting Balance ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="3500.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Workspace Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Primary Owner">Primary Owner</option>
                  <option value="Partner">Partner</option>
                  <option value="Collaborator">Collaborator</option>
                  <option value="Roommate">Roommate</option>
                  <option value="Family">Family Member</option>
                  <option value="Accountant">Accountant / CPA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Security PIN (4 digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Avatar Color
                </label>
                <div className="flex gap-1.5 pt-1">
                  {USER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Mode: Edit */}
        {mode === 'edit' && selectedUserToEdit && (
          <form onSubmit={handleUpdate} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Default Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.keys(CURRENCY_MAP).map((c) => (
                    <option key={c} value={c}>{c} ({CURRENCY_MAP[c].symbol})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Workspace Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Primary Owner">Primary Owner</option>
                  <option value="Partner">Partner</option>
                  <option value="Collaborator">Collaborator</option>
                  <option value="Roommate">Roommate</option>
                  <option value="Family">Family Member</option>
                  <option value="Accountant">Accountant / CPA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Security PIN (4 digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Profile Theme Color
              </label>
              <div className="flex gap-2 pt-1">
                {USER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Action Safeguards (Reset & Delete) */}
            <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Reset Financial Records</p>
                  <p className="text-[11px] text-slate-400">Clear transactions and budgets for this user</p>
                </div>
                {confirmReset ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetData}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px]"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="text-slate-400 text-xs hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-semibold"
                  >
                    Reset Data
                  </button>
                )}
              </div>

              {users.length > 1 && (
                <div className="flex items-center justify-between text-xs pt-2">
                  <div>
                    <p className="font-semibold text-rose-600 dark:text-rose-400">Delete Profile</p>
                    <p className="text-[11px] text-slate-400">Permanently remove this user</p>
                  </div>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px]"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-slate-400 text-xs hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-semibold"
                    >
                      Delete User
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
