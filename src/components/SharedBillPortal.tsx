import { useState, useEffect, useRef, useMemo } from 'react';
import {
  BillExpense,
  BillMember,
  CURRENCY_MAP,
  formatCurrency,
  fromBaseCurrency,
  toBaseCurrency,
} from '../store';
import { apiClient, SharedBillGroup, SharedSettlement } from '../api/client';
import {
  Users,
  Receipt,
  ArrowRight,
  Check,
  Calendar,
  Sparkles,
  DollarSign,
  UserPlus,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  HandCoins,
  Search,
  Filter,
  Share2,
  RefreshCw,
  Copy,
  ExternalLink,
  QrCode,
  ArrowLeft,
  X,
  Send,
  MessageCircle,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

const MEMBER_COLORS = ['#6366f1', '#06b6d4', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#eab308'];

const formatNumForInput = (num: number): string => {
  if (isNaN(num)) return '';
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
    return Math.round(rounded).toString();
  }
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

interface SharedBillPortalProps {
  groupId: string;
  onExitPortal?: () => void;
}

export function SharedBillPortal({ groupId, onExitPortal }: SharedBillPortalProps) {
  const [group, setGroup] = useState<SharedBillGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  // Selected persona / member perspective
  const [selectedMember, setSelectedMember] = useState<string>('all');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMember, setFilterMember] = useState('all');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState<{
    from: string;
    to: string;
    amount: string;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Add Expense form states
  const [newDesc, setNewDesc] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newPaidBy, setNewPaidBy] = useState('');
  const [newCategory, setNewCategory] = useState('Food & Dining');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSplitMode, setNewSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  // Settle modal states
  const [settleMethod, setSettleMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Other'>('UPI');
  const [settleNotes, setSettleNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const currency = group?.currency || 'USD';
  const groupVersionRef = useRef<number>(0);

  // Fetch group data
  const fetchGroupData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const data = await apiClient.getSharedGroup(groupId);
      if (data) {
        setGroup(data);
        groupVersionRef.current = data.version || 1;
        setLastSyncTime(new Date());
        setError(null);
        if (!newPaidBy && data.members.length > 0) {
          setNewPaidBy(data.members[0]);
        }
      } else {
        if (!group) setError('Bill group not found or link is invalid.');
      }
    } catch (e) {
      console.error(e);
      if (!group) setError('Could not connect to server.');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchGroupData();

    // Fast polling for live real-time sync every 3.5 seconds
    const interval = setInterval(async () => {
      const liveStatus = await apiClient.checkSharedGroupLive(groupId);
      if (liveStatus && liveStatus.version > groupVersionRef.current) {
        groupVersionRef.current = liveStatus.version;
        await fetchGroupData(true);
        soundFx.playPop();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [groupId]);

  // Compute stats and individual balances
  const memberStats = useMemo(() => {
    if (!group) return {};
    const stats: Record<string, { totalGiven: number; totalShare: number; net: number }> = {};
    group.members.forEach((m) => {
      stats[m] = { totalGiven: 0, totalShare: 0, net: 0 };
    });

    group.expenses.forEach((exp) => {
      // Calculate payer amounts
      const membersWithPaid = exp.members?.filter((m: BillMember) => m.paidAmount && m.paidAmount > 0) || [];
      if (membersWithPaid.length > 0) {
        membersWithPaid.forEach((m: BillMember) => {
          if (!stats[m.name]) stats[m.name] = { totalGiven: 0, totalShare: 0, net: 0 };
          stats[m.name].totalGiven += m.paidAmount;
        });
      } else if (exp.paidBy) {
        if (!stats[exp.paidBy]) stats[exp.paidBy] = { totalGiven: 0, totalShare: 0, net: 0 };
        stats[exp.paidBy].totalGiven += exp.totalAmount;
      }

      // Calculate share amounts
      if (exp.members) {
        exp.members.forEach((m: BillMember) => {
          if (!stats[m.name]) stats[m.name] = { totalGiven: 0, totalShare: 0, net: 0 };
          stats[m.name].totalShare += m.shareAmount || 0;
        });
      }
    });

    // Calculate net = totalGiven - totalShare
    Object.keys(stats).forEach((m) => {
      stats[m].net = stats[m].totalGiven - stats[m].totalShare;
    });

    return stats;
  }, [group]);

  // Compute simplified debts (Who Owes Whom)
  const simplifiedDebts = useMemo(() => {
    if (!group || !memberStats) return [];
    const debtors: { name: string; amount: number }[] = [];
    const creditors: { name: string; amount: number }[] = [];

    Object.entries(memberStats).forEach(([name, s]) => {
      const net = Math.round(s.net * 100) / 100;
      if (net < -0.01) {
        debtors.push({ name, amount: -net });
      } else if (net > 0.01) {
        creditors.push({ name, amount: net });
      }
    });

    const debts: { from: string; to: string; amount: number }[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const settledAmount = Math.min(debtor.amount, creditor.amount);

      if (settledAmount > 0.01) {
        debts.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(settledAmount * 100) / 100,
        });
      }

      debtor.amount -= settledAmount;
      creditor.amount -= settledAmount;

      if (debtor.amount <= 0.01) dIdx++;
      if (creditor.amount <= 0.01) cIdx++;
    }

    return debts;
  }, [group, memberStats]);

  // Overall group metrics
  const totalGroupSpend = useMemo(() => {
    if (!group) return 0;
    return group.expenses
      .filter((e) => !e.description.startsWith('🤝 Settlement:'))
      .reduce((sum, e) => sum + e.totalAmount, 0);
  }, [group]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!group) return [];
    return group.expenses.filter((exp) => {
      const matchesSearch =
        exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.paidBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.category && exp.category.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesMember = true;
      if (filterMember !== 'all') {
        matchesMember =
          exp.paidBy === filterMember ||
          (exp.members && exp.members.some((m: BillMember) => m.name === filterMember && (m.shareAmount > 0 || m.paidAmount > 0)));
      }

      let matchesPersona = true;
      if (selectedMember !== 'all') {
        matchesPersona =
          exp.paidBy === selectedMember ||
          (exp.members && exp.members.some((m: BillMember) => m.name === selectedMember && (m.shareAmount > 0 || m.paidAmount > 0)));
      }

      return matchesSearch && matchesMember && matchesPersona;
    });
  }, [group, searchQuery, filterMember, selectedMember]);

  // Handle Add Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !newDesc || !newTotal || Number(newTotal) <= 0) return;

    setSubmittingAction(true);
    const rawTotal = Number(newTotal);
    const baseTotal = toBaseCurrency(rawTotal, currency);

    let membersShareList: { name: string; paidAmount: number; shareAmount: number }[] = [];

    if (newSplitMode === 'equal') {
      const perHead = baseTotal / (group.members.length || 1);
      membersShareList = group.members.map((m) => ({
        name: m,
        paidAmount: m === newPaidBy ? baseTotal : 0,
        shareAmount: perHead,
      }));
    } else {
      membersShareList = group.members.map((m) => {
        const rawShare = Number(customShares[m]) || 0;
        return {
          name: m,
          paidAmount: m === newPaidBy ? baseTotal : 0,
          shareAmount: toBaseCurrency(rawShare, currency),
        };
      });
    }

    const payload: Omit<BillExpense, 'id'> = {
      description: newDesc.trim(),
      totalAmount: baseTotal,
      paidBy: newPaidBy || group.members[0],
      members: membersShareList,
      date: newDate,
      category: newCategory,
    };

    const res = await apiClient.addSharedExpense(group.id, payload);
    if (res && res.group) {
      setGroup(res.group);
      groupVersionRef.current = res.group.version || 1;
      soundFx.playSuccess();
      setShowAddExpense(false);
      setNewDesc('');
      setNewTotal('');
      setCustomShares({});
    }
    setSubmittingAction(false);
  };

  // Handle Settlement / Payment Confirmation
  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !showSettleModal || !showSettleModal.amount || Number(showSettleModal.amount) <= 0) return;

    setSubmittingAction(true);
    const rawAmt = Number(showSettleModal.amount);
    const baseAmt = toBaseCurrency(rawAmt, currency);

    const res = await apiClient.recordSharedSettlement(group.id, {
      from: showSettleModal.from,
      to: showSettleModal.to,
      amount: baseAmt,
      method: settleMethod,
      notes: settleNotes.trim() || undefined,
    });

    if (res && res.group) {
      setGroup(res.group);
      groupVersionRef.current = res.group.version || 1;
      soundFx.playCelebration();
      setShowSettleModal(null);
      setSettleNotes('');
    }
    setSubmittingAction(false);
  };

  const portalShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?splitGroup=${groupId}`
    : '';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(portalShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopySummary = () => {
    if (!group) return;
    let text = `📊 *${group.name} - Bill Split Summary*\n`;
    text += `💰 Total Group Spend: ${formatCurrency(totalGroupSpend, currency)}\n\n`;
    text += `*Member Net Balances:*\n`;
    Object.entries(memberStats).forEach(([name, s]) => {
      const net = s.net;
      if (net > 0.05) {
        text += `• ${name}: +${formatCurrency(net, currency)} (Gets back)\n`;
      } else if (net < -0.05) {
        text += `• ${name}: -${formatCurrency(Math.abs(net), currency)} (Owes)\n`;
      } else {
        text += `• ${name}: Settled up ✨\n`;
      }
    });

    if (simplifiedDebts.length > 0) {
      text += `\n*🤝 Simplified Transfers:*\n`;
      simplifiedDebts.forEach((d) => {
        text += `• ${d.from} → ${d.to}: ${formatCurrency(d.amount, currency)}\n`;
      });
    }

    text += `\n🔗 View & Settle in Real Time:\n${portalShareUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse mb-4">
          <Receipt className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold font-heading">Loading Live Bill Split...</h2>
        <p className="text-sm text-slate-400 mt-1">Connecting to real-time cloud synchronization</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-heading text-white">Bill Split Not Found</h2>
        <p className="text-slate-400 text-sm max-w-md mt-2 mb-6">
          {error || 'This shared bill group link might have expired or been removed.'}
        </p>
        {onExitPortal ? (
          <button
            onClick={onExitPortal}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            Open Main App
          </button>
        ) : (
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
          >
            Go to ApexFinance
          </a>
        )}
      </div>
    );
  }

  const selectedPersonaStats = selectedMember !== 'all' ? memberStats[selectedMember] : null;
  const debtsForSelectedMember = simplifiedDebts.filter(
    (d) => d.from === selectedMember || d.to === selectedMember
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Real-Time Live Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onExitPortal && (
            <button
              onClick={onExitPortal}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Back to Main App"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-heading text-white truncate max-w-[200px] sm:max-w-md">
                {group.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Synced
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Created by <span className="text-slate-300 font-semibold">{group.ownerName}</span> • {group.members.length} participants
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchGroupData()}
            disabled={isSyncing}
            className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer ${
              isSyncing ? 'animate-spin text-indigo-400' : ''
            }`}
            title="Refresh Real-Time Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Share Live Link</span>
          </button>

          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Persona Switcher ("Who are you?") */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Select Who You Are:
            </span>
            <span className="text-[11px] text-slate-400">
              Switches personalized pending balance & dues
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedMember('all')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                selectedMember === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20 scale-105'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              👥 All Members (Overview)
            </button>

            {group.members.map((m, idx) => {
              const isMe = selectedMember === m;
              const stats = memberStats[m];
              const net = stats?.net || 0;
              const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];

              return (
                <button
                  key={m}
                  onClick={() => setSelectedMember(m)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isMe
                      ? 'bg-slate-800 text-white border-indigo-500 shadow-md shadow-indigo-500/20 scale-105 ring-2 ring-indigo-500/40'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {m.charAt(0)}
                  </span>
                  <span>{m}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      net > 0.05
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                        : net < -0.05
                        ? 'bg-rose-500/20 text-rose-400 font-bold'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {net > 0.05
                      ? `+${formatCurrency(net, currency)}`
                      : net < -0.05
                      ? `-${formatCurrency(Math.abs(net), currency)}`
                      : 'Settled'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Personalized Banner / Status Card */}
        {selectedMember !== 'all' && selectedPersonaStats ? (
          <div
            className={`rounded-3xl p-6 sm:p-7 border shadow-xl transition-all ${
              selectedPersonaStats.net > 0.05
                ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-800/50'
                : selectedPersonaStats.net < -0.05
                ? 'bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-800/50'
                : 'bg-gradient-to-br from-indigo-950/30 to-slate-900 border-indigo-800/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                    Personal Settlement Status: <strong className="text-white">{selectedMember}</strong>
                  </span>
                </div>

                <div className="mt-2">
                  {selectedPersonaStats.net > 0.05 ? (
                    <div className="space-y-1">
                      <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-emerald-400 flex items-center gap-2">
                        <span>🎉 You get back</span>
                        <span>{formatCurrency(selectedPersonaStats.net, currency)}</span>
                      </h2>
                      <p className="text-xs text-slate-400">Other members owe you this amount in total</p>
                    </div>
                  ) : selectedPersonaStats.net < -0.05 ? (
                    <div className="space-y-1">
                      <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-rose-400 flex items-center gap-2">
                        <span>⚠️ You owe</span>
                        <span>{formatCurrency(Math.abs(selectedPersonaStats.net), currency)}</span>
                      </h2>
                      <p className="text-xs text-slate-400">Total balance you need to pay back to the group</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-7 h-7" />
                        <span>All Settled Up!</span>
                      </h2>
                      <p className="text-xs text-slate-400">You don't owe anything and nobody owes you</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions for this Persona */}
              <div className="flex flex-wrap gap-2.5">
                {selectedPersonaStats.net < -0.05 && (
                  <button
                    onClick={() => {
                      const firstOwed = debtsForSelectedMember.find((d) => d.from === selectedMember);
                      setShowSettleModal({
                        from: selectedMember,
                        to: firstOwed?.to || group.members.find((m) => m !== selectedMember) || 'You',
                        amount: formatNumForInput(firstOwed ? firstOwed.amount : Math.abs(selectedPersonaStats.net)),
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <HandCoins className="w-4 h-4" />
                    <span>⚡ Pay & Settle Up</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setNewPaidBy(selectedMember);
                    setShowAddExpense(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Receipt className="w-4 h-4" />
                  <span>+ Add Bill as {selectedMember}</span>
                </button>
              </div>
            </div>

            {/* Persona 3 Metrics */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">Total Group Spend</p>
                <p className="text-base sm:text-lg font-bold font-heading text-white">
                  {formatCurrency(totalGroupSpend, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">You Paid (Given)</p>
                <p className="text-base sm:text-lg font-bold font-heading text-emerald-400">
                  {formatCurrency(selectedPersonaStats.totalGiven, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">Your Fair Share</p>
                <p className="text-base sm:text-lg font-bold font-heading text-slate-300">
                  {formatCurrency(selectedPersonaStats.totalShare, currency)}
                </p>
              </div>
            </div>

            {/* Individual breakdown for this member */}
            {debtsForSelectedMember.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Transfers for {selectedMember}:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {debtsForSelectedMember.map((d, idx) => {
                    const isOwing = d.from === selectedMember;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex items-center justify-between ${
                          isOwing
                            ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                            : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold font-mono">
                            {isOwing ? '🔴' : '🟢'}
                          </span>
                          <div>
                            <p className="text-xs font-semibold">
                              {isOwing ? (
                                <>
                                  You owe <strong className="text-white">{d.to}</strong>
                                </>
                              ) : (
                                <>
                                  <strong className="text-white">{d.from}</strong> owes you
                                </>
                              )}
                            </p>
                            <p className="text-sm font-bold font-heading">
                              {formatCurrency(d.amount, currency)}
                            </p>
                          </div>
                        </div>

                        {isOwing ? (
                          <button
                            onClick={() =>
                              setShowSettleModal({
                                from: d.from,
                                to: d.to,
                                amount: formatNumForInput(d.amount),
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            Pay {d.to}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setShowSettleModal({
                                from: d.from,
                                to: d.to,
                                amount: formatNumForInput(d.amount),
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Mark Received
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Overview Banner */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-5 shadow-lg backdrop-blur-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Group Spend</p>
              <p className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                {formatCurrency(totalGroupSpend, currency)}
              </p>
              <p className="text-xs text-slate-400">{group.expenses.length} bills recorded</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-5 shadow-lg backdrop-blur-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Transfers</p>
              <p className="text-2xl sm:text-3xl font-extrabold font-heading text-indigo-400">
                {simplifiedDebts.length}
              </p>
              <p className="text-xs text-slate-400">Simplified debt payments required</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-5 shadow-lg backdrop-blur-sm flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Sync Status</p>
                <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Real-Time Cloud Connected
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                Auto-syncing every 3.5s
              </p>
            </div>
          </div>
        )}

        {/* Simplified Debt Resolution Matrix */}
        {simplifiedDebts.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-indigo-400" />
                  Who Owes Whom (Simplified Transfers)
                </h3>
                <p className="text-xs text-slate-400">
                  Minimum payments needed to settle all accounts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {simplifiedDebts.map((debt, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                      {debt.from.charAt(0)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                      {debt.to.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {debt.from} → {debt.to}
                      </p>
                      <p className="text-xs font-extrabold font-mono text-emerald-400">
                        {formatCurrency(debt.amount, currency)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setShowSettleModal({
                        from: debt.from,
                        to: debt.to,
                        amount: formatNumForInput(debt.amount),
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 ml-2"
                  >
                    Settle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Balances Breakdown Grid */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
          <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Member Balances & Contributions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {group.members.map((m, idx) => {
              const stats = memberStats[m] || { totalGiven: 0, totalShare: 0, net: 0 };
              const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
              const isSelected = selectedMember === m;

              return (
                <div
                  key={m}
                  onClick={() => setSelectedMember(m)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500'
                      : 'bg-slate-900/60 border-slate-700/70 hover:border-slate-600 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {m.charAt(0)}
                      </span>
                      <p className="font-bold text-sm text-white truncate">{m}</p>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                        stats.net > 0.05
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : stats.net < -0.05
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-700/80 text-slate-400'
                      }`}
                    >
                      {stats.net > 0.05
                        ? `+${formatCurrency(stats.net, currency)}`
                        : stats.net < -0.05
                        ? `-${formatCurrency(Math.abs(stats.net), currency)}`
                        : 'Settled'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
                    <div>
                      <p className="text-slate-400 text-[11px]">Paid by {m}</p>
                      <p className="font-bold text-white">{formatCurrency(stats.totalGiven, currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Fair Share</p>
                      <p className="font-bold text-slate-300">{formatCurrency(stats.totalShare, currency)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Transaction Ledger */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
            <div>
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                Live Transactions Ledger ({filteredExpenses.length})
              </h3>
              <p className="text-xs text-slate-400">
                Itemized breakdown of all split expenses and logged settlements
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bills..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
                />
              </div>

              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Members</option>
                {group.members.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-sm">No transactions match your search</p>
              <p className="text-xs text-slate-500 mt-0.5">Add a new bill split to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 space-y-1">
              {filteredExpenses.map((exp) => {
                const isSettlement = exp.description.startsWith('🤝 Settlement:');
                const isExpanded = expandedExpenseId === exp.id;

                return (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-2xl hover:bg-slate-800/60 transition-colors"
                  >
                    <div
                      onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSettlement
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {isSettlement ? <HandCoins className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-sm text-white truncate">{exp.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Paid by <strong className="text-slate-300">{exp.paidBy}</strong> • {exp.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-extrabold font-mono text-sm sm:text-base text-white">
                            {formatCurrency(exp.totalAmount, currency)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {exp.members?.filter((m: BillMember) => m.shareAmount > 0).length || group.members.length} shares
                          </p>
                        </div>
                        <button className="text-slate-500 hover:text-slate-300">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Split Breakdown */}
                    {isExpanded && exp.members && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {exp.members.map((m: BillMember) => (
                          <div
                            key={m.name}
                            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-300 truncate">{m.name}</span>
                            <span className="font-mono font-bold text-white">
                              {formatCurrency(m.shareAmount, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Shared Bill Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-700 bg-slate-900 overflow-hidden text-white">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <h3 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                Add Shared Bill
              </h3>
              <button
                onClick={() => setShowAddExpense(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g., Dinner at Olive Garden, Groceries"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Total Amount ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newTotal}
                      onChange={(e) => setNewTotal(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Paid By
                    </label>
                    <select
                      value={newPaidBy}
                      onChange={(e) => setNewPaidBy(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {group.members.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Transport">Transport</option>
                      <option value="Housing">Housing / Rent</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                {/* Split Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Split Calculation
                    </label>
                    <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setNewSplitMode('equal')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          newSplitMode === 'equal' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Split Equally
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSplitMode('custom')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          newSplitMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Custom Shares
                      </button>
                    </div>
                  </div>

                  {newSplitMode === 'equal' ? (
                    <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-xs text-slate-300">
                      Split equally among all {group.members.length} members (
                      {newTotal && Number(newTotal) > 0
                        ? formatCurrency(toBaseCurrency(Number(newTotal) / group.members.length, currency), currency)
                        : '$0'}
                      /person)
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                      {group.members.map((m) => (
                        <div key={m} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-slate-300 truncate">{m}</span>
                          <div className="w-28 relative">
                            <input
                              type="number"
                              step="0.01"
                              value={customShares[m] || ''}
                              onChange={(e) =>
                                setCustomShares({
                                  ...customShares,
                                  [m]: e.target.value,
                                })
                              }
                              placeholder="0"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-mono font-bold text-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 px-6 border-t border-slate-800 bg-slate-900 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction ? 'Saving...' : 'Add Bill Split'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle / Record Payment Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-700 bg-slate-900 overflow-hidden text-white">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <h3 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-emerald-400" />
                Record Payment / Settlement
              </h3>
              <button
                onClick={() => setShowSettleModal(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-300">
                  <span>Payer: <strong className="text-white">{showSettleModal.from}</strong></span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Receiver: <strong className="text-white">{showSettleModal.to}</strong></span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={showSettleModal.amount}
                    onChange={(e) =>
                      setShowSettleModal({ ...showSettleModal, amount: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-base font-extrabold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Bank Transfer">Direct Bank Transfer / NEFT</option>
                    <option value="Other">Other / Venmo / PayPal</option>
                  </select>
                </div>

                {settleMethod === 'UPI' && (
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs space-y-2">
                    <p className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick UPI Pay Link:
                    </p>
                    <a
                      href={`upi://pay?pn=${encodeURIComponent(showSettleModal.to)}&am=${showSettleModal.amount}&cu=INR`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Open UPI App to Pay {formatCurrency(toBaseCurrency(Number(showSettleModal.amount), currency), currency)}
                    </a>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    placeholder="e.g. Paid via GPay / Ref ID"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 px-6 border-t border-slate-800 bg-slate-900 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction ? 'Recording...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share & Invite Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-700 bg-slate-900 overflow-hidden text-white">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <h3 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                Share Real-Time Bill Split
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-slate-400">
                Share this direct live link with other participants. They can check transactions, view their pending amounts, and record payments in real time on any phone or desktop without needing an account!
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Live Member Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={portalShareUrl}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-mono text-slate-200 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out our bill split for *${group.name}* in real time:\n${portalShareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-600/30 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={handleCopySummary}
                  className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                  <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-slate-800 bg-slate-900 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
