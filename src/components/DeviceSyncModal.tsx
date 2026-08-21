import { useState } from 'react';
import { UserProfile } from '../api/client';
import {
  Transaction,
  Budget,
  BillGroup,
  Account,
  Goal,
  Subscription,
} from '../store';
import {
  Smartphone,
  Laptop,
  QrCode,
  Copy,
  Check,
  X,
  Share2,
  Zap,
  ShieldCheck,
  RefreshCw,
  ArrowRightLeft,
  MessageCircle,
  Sparkles,
  Download,
  Upload,
  AlertTriangle,
  Globe,
  Database,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  isServerOnline: boolean;
  transactions?: Transaction[];
  budgets?: Budget[];
  billGroups?: BillGroup[];
  accounts?: Account[];
  goals?: Goal[];
  subscriptions?: Subscription[];
  onImportData?: (data: any) => boolean;
  onForceSync?: () => Promise<void>;
}

export function DeviceSyncModal({
  isOpen,
  onClose,
  currentUser,
  isServerOnline,
  transactions = [],
  budgets = [],
  billGroups = [],
  accounts = [],
  goals = [],
  subscriptions = [],
  onImportData,
  onForceSync,
}: DeviceSyncModalProps) {
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  const [activeTab, setActiveTab] = useState<'qr' | 'code' | 'cloud'>('qr');
  const [customHost, setCustomHost] = useState(defaultOrigin);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  if (!isOpen) return null;

  const baseOrigin = customHost.trim() || defaultOrigin;
  const pairUrl = `${baseOrigin.replace(/\/+$/, '')}${pathname}?syncUser=${currentUser.id}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pairUrl);
      setCopiedLink(true);
      soundFx.playSuccess();
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const fullBackupPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    userProfile: currentUser,
    transactions,
    budgets,
    billGroups,
    accounts,
    goals,
    subscriptions,
  };

  const handleCopySyncJson = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(fullBackupPayload, null, 2));
      setCopiedJson(true);
      soundFx.playSuccess();
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handlePasteImport = () => {
    if (!pasteInput.trim()) return;
    try {
      const parsed = JSON.parse(pasteInput.trim());
      if (onImportData) {
        const ok = onImportData(parsed);
        if (ok) {
          setPasteFeedback('Data imported & synced successfully!');
          soundFx.playCelebration();
          setTimeout(() => {
            setPasteFeedback(null);
            onClose();
          }, 1500);
          return;
        }
      }
      setPasteFeedback('Invalid backup structure.');
    } catch {
      setPasteFeedback('Failed to parse JSON code. Make sure it is valid JSON.');
    }
  };

  const handleManualForceSync = async () => {
    if (!onForceSync) return;
    setIsSyncingNow(true);
    try {
      await onForceSync();
      setPasteFeedback('Cloud push successful!');
      setTimeout(() => setPasteFeedback(null), 3000);
    } catch {
      setPasteFeedback('Sync failed. Please check network connection.');
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Generate SVG QR Code dynamically
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    pairUrl
  )}&bgcolor=ffffff&color=1e1b4b&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading">
                Sync Mobile & Laptop
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seamless real-time bi-directional data synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>📱 QR Code & Link</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'code'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>📋 Copy / Paste JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Cloud Status</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Active Status Badge */}
          <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: currentUser.color || '#6366f1' }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Profile: {currentUser.name}
                </p>
                <p className="text-[10px] text-indigo-700 dark:text-indigo-400">
                  {transactions.length} Transactions • {budgets.length} Budgets
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isServerOnline ? 'Live Backend Connected' : 'Offline Mode'}
            </span>
          </div>

          {/* TAB 1: QR CODE & URL */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              {/* Localhost helper if active */}
              {isLocalHost && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Using Localhost on Laptop</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Mobile devices cannot reach <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">localhost</code>.
                    If on Wi-Fi, enter your laptop's Local IP (e.g. <code className="font-mono font-bold">http://192.168.1.50:5173</code>) or your deployed Render URL:
                  </p>
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="http://192.168.x.x:5173 or https://myapp.onrender.com"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              )}

              {/* QR Code Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-3xl p-4 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span>Scan with Phone Camera</span>
                </div>

                <div className="inline-block p-3 rounded-2xl bg-white shadow-md border border-slate-200">
                  <img
                    src={qrSvgUrl}
                    alt="Device Sync QR Code"
                    className="w-40 h-40 rounded-lg object-contain mx-auto"
                    loading="lazy"
                  />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Point your iPhone or Android camera at the QR code to open and link your financial dashboard immediately.
                </p>
              </div>

              {/* Direct Link Option */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Or Open Sync Link on Phone
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pairUrl}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Open and sync my ApexFinance account on phone:\n${pairUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Link</span>
                </a>

                <a
                  href={`mailto:?subject=ApexFinance Sync Link&body=${encodeURIComponent(
                    `Open this link on your phone to link your finance dashboard:\n\n${pairUrl}`
                  )}`}
                  className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Email Link</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: COPY / PASTE JSON */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-indigo-500" />
                    Step A: Export / Copy from this Device
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySyncJson}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedJson ? 'Copied to Clipboard!' : 'Copy Full Sync Code'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Copies all {transactions.length} transactions, accounts, budgets, and bill groups as a self-contained backup code.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  Step B: Paste Code on Other Device
                </span>
                <textarea
                  rows={3}
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder="Paste sync JSON code here..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={!pasteInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Import & Synchronize Now</span>
                </button>
              </div>

              {pasteFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pasteFeedback}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLOUD STATUS */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Backend Server:</span>
                  <span className={`font-bold ${isServerOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {isServerOnline ? '● Online & Healthy' : '○ Offline / Localhost'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Current User ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{currentUser.id}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Stored Transactions:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{transactions.length} items</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Stored Budgets & Accounts:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{budgets.length} budgets, {accounts.length} accounts</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualForceSync}
                disabled={isSyncingNow || !isServerOnline}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? 'Pushing Data...' : 'Force Push State to Cloud'}</span>
              </button>

              {pasteFeedback && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pasteFeedback}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

