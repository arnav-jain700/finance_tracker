import { useState } from 'react';
import { UserProfile } from '../api/client';
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
  ExternalLink,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  isServerOnline: boolean;
}

export function DeviceSyncModal({
  isOpen,
  onClose,
  currentUser,
  isServerOnline,
}: DeviceSyncModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const pairUrl = `${origin}${pathname}?syncUser=${currentUser.id}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pairUrl);
      setCopiedLink(true);
      soundFx.playSuccess();
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Generate SVG QR Code dynamically for zero external dependencies
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    pairUrl
  )}&bgcolor=ffffff&color=1e1b4b&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Active Status Badge */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: currentUser.color || '#6366f1' }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Account: {currentUser.name}
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  {currentUser.role || 'Primary Profile'} • {currentUser.currency || 'USD'}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Auto-Syncing
            </span>
          </div>

          {/* QR Code Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-3xl p-5 text-center space-y-3.5">
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>Step 1: Scan with Your Phone Camera</span>
            </div>

            {/* QR Code Container */}
            <div className="inline-block p-3.5 rounded-2xl bg-white shadow-md border border-slate-200">
              <img
                src={qrSvgUrl}
                alt="Device Sync QR Code"
                className="w-44 h-44 rounded-lg object-contain mx-auto"
                loading="lazy"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Point your iPhone or Android camera at the QR code to open and pair immediately.
            </p>
          </div>

          {/* Direct Link Option */}
          <div className="space-y-2">
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
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Open and sync my ApexFinance account on phone:\n${pairUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </a>

            <a
              href={`mailto:?subject=ApexFinance Device Sync Link&body=${encodeURIComponent(
                `Open this link on your phone to link your finance dashboard:\n\n${pairUrl}`
              )}`}
              className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Email Link to Phone</span>
            </a>
          </div>

          {/* How Cross-Device Works Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>How Real-Time Sync Works</span>
            </div>
            <ul className="space-y-1 text-slate-500 dark:text-slate-400 list-disc list-inside">
              <li>Any transaction you add on phone appears automatically on laptop within seconds.</li>
              <li>When you switch back to your browser tab or unlock your device, data syncs immediately.</li>
              <li>Data is encrypted and cached locally for full offline support.</li>
            </ul>
          </div>
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
