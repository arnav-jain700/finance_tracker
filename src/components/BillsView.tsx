import {
  BillGroup,
  BillExpense,
  CURRENCY_MAP,
  formatCurrency,
  formatRawCurrency,
  toBaseCurrency,
  fromBaseCurrency,
} from '../store';
import {
  Plus,
  Users,
  Trash2,
  X,
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
  SlidersHorizontal,
  Percent,
  Equal,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Zap,
  Edit2,
  HandCoins,
  Search,
  Filter,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subDays,
} from 'date-fns';
import { soundFx } from '../utils/audio';

interface BillsViewProps {
  billGroups: BillGroup[];
  currency: string;
  onAddGroup: (g: Omit<BillGroup, 'id' | 'expenses'>) => void;
  onAddExpense: (groupId: string, expense: Omit<BillExpense, 'id'>) => void;
  onUpdateExpense?: (groupId: string, expense: BillExpense) => void;
  onDeleteExpense?: (groupId: string, expenseId: string) => void;
  onDeleteGroup?: (id: string) => void;
}

const MEMBER_COLORS = ['#6366f1', '#06b6d4', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#eab308'];

const formatNumForInput = (num: number): string => {
  if (isNaN(num)) return '';
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
    return Math.round(rounded).toString();
  }
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

export function BillsView({
  billGroups,
  currency,
  onAddGroup,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onDeleteGroup,
}: BillsViewProps) {
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(billGroups[0]?.id || null);

  // Filter States for Bill Splits
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<
    'all' | 'this-month' | 'last-month' | 'last-30' | 'this-year' | 'custom'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>(['You']);

  const [expenseData, setExpenseData] = useState({
    description: '',
    totalAmount: '',
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom' | 'percentages'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({});

  // Multiple Payer & Edit Expense States
  const [payerMode, setPayerMode] = useState<'single' | 'multiple'>('single');
  const [customPayerAmounts, setCustomPayerAmounts] = useState<Record<string, string>>({});
  const [editingExpense, setEditingExpense] = useState<{ groupId: string; expense: BillExpense } | null>(null);

  // Auto-balancer states: track which tabs/payers were manually edited by the user
  const [manuallyEditedMembers, setManuallyEditedMembers] = useState<string[]>([]);
  const [manuallyEditedPayers, setManuallyEditedPayers] = useState<string[]>([]);

  // Interactive Payment / Settlement Modal state
  const [settleModal, setSettleModal] = useState<{
    groupId: string;
    from: string;
    to: string;
    totalOwedBase: number;
    amountGivenInput: string;
  } | null>(null);

  const activeGroupData = billGroups.find((g) => g.id === activeGroup);

  const handleAddMember = () => {
    const trimmed = memberInput.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      setMemberInput('');
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || members.length === 0) return;
    onAddGroup({ name: groupName, members });
    setGroupName('');
    setMembers(['You']);
    setShowGroupForm(false);
  };

  const openExpenseForm = (groupId: string) => {
    const group = billGroups.find((g) => g.id === groupId);
    if (!group) return;
    setActiveGroup(groupId);
    setEditingExpense(null);
    setExpenseData({
      description: '',
      totalAmount: '',
      paidBy: group.members[0] || '',
      date: new Date().toISOString().split('T')[0],
    });
    setSplitAmong([...group.members]);
    setPayerMode('single');
    setCustomPayerAmounts({});
    setSplitMode('equal');
    setCustomAmounts({});
    setCustomPercentages({});
    setManuallyEditedMembers([]);
    setManuallyEditedPayers([]);
    setShowExpenseForm(true);
  };

  const handleOpenEditExpense = (groupId: string, exp: BillExpense) => {
    const group = billGroups.find((g) => g.id === groupId);
    if (!group) return;

    setActiveGroup(groupId);
    setEditingExpense({ groupId, expense: exp });

    const totalRaw = fromBaseCurrency(exp.totalAmount, currency);
    setExpenseData({
      description: exp.description,
      totalAmount: formatNumForInput(totalRaw),
      paidBy: exp.paidBy.replace(' (Multi-payer)', ''),
      date: exp.date,
    });

    // Check payers
    const payersWithAmount = exp.members.filter((m) => m.paidAmount > 0.001);
    if (payersWithAmount.length > 1) {
      setPayerMode('multiple');
      const payerMap: Record<string, string> = {};
      group.members.forEach((m) => {
        const found = exp.members.find((item) => item.name === m);
        payerMap[m] = found ? formatNumForInput(fromBaseCurrency(found.paidAmount, currency)) : '0';
      });
      setCustomPayerAmounts(payerMap);
    } else {
      setPayerMode('single');
      setCustomPayerAmounts({});
    }

    // Check split members & shares
    const membersWithShare = exp.members.filter((m) => m.shareAmount > 0.001);
    const activeMembers = membersWithShare.map((m) => m.name);
    setSplitAmong(activeMembers.length > 0 ? activeMembers : [...group.members]);

    // Check if equal split or custom
    const shares = membersWithShare.map((m) => fromBaseCurrency(m.shareAmount, currency));
    const firstShare = shares[0] || 0;
    const isEquallySplit = shares.length > 0 && shares.every((s) => Math.abs(s - firstShare) < 0.05);

    if (isEquallySplit && shares.length > 0) {
      setSplitMode('equal');
      setCustomAmounts({});
      setCustomPercentages({});
      setManuallyEditedMembers([]);
    } else {
      setSplitMode('custom');
      const amountMap: Record<string, string> = {};
      group.members.forEach((m) => {
        const found = exp.members.find((item) => item.name === m);
        amountMap[m] = found ? formatNumForInput(fromBaseCurrency(found.shareAmount, currency)) : '0';
      });
      setCustomAmounts(amountMap);
      setManuallyEditedMembers(membersWithShare.map((m) => m.name));
    }

    setShowExpenseForm(true);
  };

  const handleDeleteExpense = (groupId: string, expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this bill expense?')) {
      if (onDeleteExpense) {
        onDeleteExpense(groupId, expenseId);
      }
      soundFx.playSuccess();
    }
  };

  const openSettleModal = (groupId: string, fromDebtor: string, toCreditor: string, amountBase: number) => {
    const rawAmt = fromBaseCurrency(amountBase, currency);
    setSettleModal({
      groupId,
      from: fromDebtor,
      to: toCreditor,
      totalOwedBase: amountBase,
      amountGivenInput: formatNumForInput(rawAmt),
    });
  };

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModal) return;

    const rawGiven = Number(settleModal.amountGivenInput);
    if (!rawGiven || rawGiven <= 0) return;

    const group = billGroups.find((g) => g.id === settleModal.groupId);
    if (!group) return;

    const givenBase = toBaseCurrency(rawGiven, currency);

    const allMembers: BillExpense['members'] = group.members.map((name) => {
      if (name === settleModal.from) {
        return { name, paidAmount: givenBase, shareAmount: 0 };
      }
      if (name === settleModal.to) {
        return { name, paidAmount: 0, shareAmount: givenBase };
      }
      return { name, paidAmount: 0, shareAmount: 0 };
    });

    onAddExpense(settleModal.groupId, {
      description: `Payment: ${settleModal.from} paid ${formatRawCurrency(rawGiven, currency)} to ${settleModal.to}`,
      totalAmount: givenBase,
      paidBy: settleModal.from,
      members: allMembers,
      date: new Date().toISOString().split('T')[0],
    });

    soundFx.playCelebration();
    setSettleModal(null);
  };

  const computeMemberStats = (group: BillGroup) => {
    const stats: Record<string, { totalGiven: number; totalShare: number; net: number }> = {};
    group.members.forEach((m) => {
      stats[m] = { totalGiven: 0, totalShare: 0, net: 0 };
    });
    group.expenses.forEach((exp) => {
      exp.members.forEach((m) => {
        if (!stats[m.name]) {
          stats[m.name] = { totalGiven: 0, totalShare: 0, net: 0 };
        }
        stats[m.name].totalGiven += m.paidAmount;
        stats[m.name].totalShare += m.shareAmount;
        stats[m.name].net += (m.paidAmount - m.shareAmount);
      });
    });
    return stats;
  };

  const handlePayerModeChange = (mode: 'single' | 'multiple') => {
    setPayerMode(mode);
    const total = Number(expenseData.totalAmount) || 0;
    if (mode === 'multiple' && activeGroupData) {
      const currentSum = activeGroupData.members.reduce((acc, m) => acc + (Number(customPayerAmounts[m]) || 0), 0);
      if (currentSum === 0 && total > 0) {
        const next: Record<string, string> = {};
        activeGroupData.members.forEach((m) => {
          next[m] = m === expenseData.paidBy ? formatNumForInput(total) : '0';
        });
        setCustomPayerAmounts(next);
        setManuallyEditedPayers([expenseData.paidBy || activeGroupData.members[0] || '']);
      }
    }
  };

  // Smart Auto-Balancer for Multiple Payers
  const handleCustomPayerAmountChange = (member: string, value: string) => {
    const updatedEdited = Array.from(new Set([...manuallyEditedPayers, member]));
    setManuallyEditedPayers(updatedEdited);

    const nextPayers = { ...customPayerAmounts, [member]: value };
    const total = Number(expenseData.totalAmount) || 0;
    const allMembers = activeGroupData?.members || [];

    const editedSum = updatedEdited.reduce((acc, m) => {
      return acc + (Number(nextPayers[m]) || 0);
    }, 0);

    const remaining = Math.max(0, Math.round((total - editedSum) * 100) / 100);
    const unedited = allMembers.filter((m) => !updatedEdited.includes(m));

    if (unedited.length > 0) {
      let assigned = 0;
      unedited.forEach((m, idx) => {
        if (idx === unedited.length - 1) {
          const finalShare = Math.max(0, Math.round((remaining - assigned) * 100) / 100);
          nextPayers[m] = formatNumForInput(finalShare);
        } else {
          const share = Math.max(0, Math.round((remaining / unedited.length) * 100) / 100);
          assigned += share;
          nextPayers[m] = formatNumForInput(share);
        }
      });
    }

    setCustomPayerAmounts(nextPayers);
  };

  const handleDistributeRemainingPayer = () => {
    if (!activeGroupData) return;
    const total = Number(expenseData.totalAmount) || 0;
    const currentSum = activeGroupData.members.reduce((acc, m) => acc + (Number(customPayerAmounts[m]) || 0), 0);
    const remaining = total - currentSum;
    if (remaining === 0) return;

    const unedited = activeGroupData.members.filter((m) => !manuallyEditedPayers.includes(m));
    const target = unedited[0] || expenseData.paidBy || activeGroupData.members[0];
    setCustomPayerAmounts((prev) => ({
      ...prev,
      [target]: formatNumForInput(Math.max(0, (Number(prev[target]) || 0) + remaining)),
    }));
  };

  const handleEqualizePayers = () => {
    if (!activeGroupData) return;
    const total = Number(expenseData.totalAmount) || 0;
    if (total <= 0) return;
    const perPerson = formatNumForInput(total / activeGroupData.members.length);
    const next: Record<string, string> = {};
    activeGroupData.members.forEach((m) => (next[m] = perPerson));
    setCustomPayerAmounts(next);
    setManuallyEditedPayers([]);
  };

  const handleSwitchSplitMode = (mode: 'equal' | 'custom' | 'percentages') => {
    setSplitMode(mode);
    const total = Number(expenseData.totalAmount) || 0;
    if (splitAmong.length === 0) return;

    if (mode === 'custom') {
      const currentSum = splitAmong.reduce((acc, m) => acc + (Number(customAmounts[m]) || 0), 0);
      if (currentSum === 0 && total > 0) {
        const perPerson = formatNumForInput(total / splitAmong.length);
        const next: Record<string, string> = {};
        splitAmong.forEach((m) => (next[m] = perPerson));
        setCustomAmounts(next);
      }
      setManuallyEditedMembers([]);
    } else if (mode === 'percentages') {
      const currentSum = splitAmong.reduce((acc, m) => acc + (Number(customPercentages[m]) || 0), 0);
      if (currentSum === 0) {
        const perPersonPct = (100 / splitAmong.length).toFixed(1).replace(/\.0$/, '');
        const next: Record<string, string> = {};
        splitAmong.forEach((m) => (next[m] = perPersonPct));
        setCustomPercentages(next);
      }
    }
  };

  // Smart Auto-Balancer for Custom Splitting Tabs:
  const handleCustomAmountChange = (member: string, value: string) => {
    const updatedEdited = Array.from(new Set([...manuallyEditedMembers, member]));
    setManuallyEditedMembers(updatedEdited);

    const nextCustom = { ...customAmounts, [member]: value };
    const total = Number(expenseData.totalAmount) || 0;

    // Calculate sum of manually edited members in splitAmong
    const editedSum = updatedEdited.reduce((acc, m) => {
      if (splitAmong.includes(m)) {
        return acc + (Number(nextCustom[m]) || 0);
      }
      return acc;
    }, 0);

    const remaining = Math.max(0, Math.round((total - editedSum) * 100) / 100);
    const unedited = splitAmong.filter((m) => !updatedEdited.includes(m));

    if (unedited.length > 0) {
      let assigned = 0;
      unedited.forEach((m, idx) => {
        if (idx === unedited.length - 1) {
          const finalShare = Math.max(0, Math.round((remaining - assigned) * 100) / 100);
          nextCustom[m] = formatNumForInput(finalShare);
        } else {
          const share = Math.max(0, Math.round((remaining / unedited.length) * 100) / 100);
          assigned += share;
          nextCustom[m] = formatNumForInput(share);
        }
      });
    }

    setCustomAmounts(nextCustom);
  };

  // Smart Total Amount handler: automatically adjusts unedited tabs/payers when total changes
  const handleTotalAmountChange = (val: string) => {
    setExpenseData((prev) => ({ ...prev, totalAmount: val }));
    const total = Number(val) || 0;

    if (splitMode === 'custom' && splitAmong.length > 0) {
      const editedSum = manuallyEditedMembers.reduce((acc, m) => {
        if (splitAmong.includes(m)) {
          return acc + (Number(customAmounts[m]) || 0);
        }
        return acc;
      }, 0);
      const remaining = Math.max(0, Math.round((total - editedSum) * 100) / 100);
      const unedited = splitAmong.filter((m) => !manuallyEditedMembers.includes(m));

      if (unedited.length > 0) {
        const nextCustom = { ...customAmounts };
        let assigned = 0;
        unedited.forEach((m, idx) => {
          if (idx === unedited.length - 1) {
            const finalShare = Math.max(0, Math.round((remaining - assigned) * 100) / 100);
            nextCustom[m] = formatNumForInput(finalShare);
          } else {
            const share = Math.max(0, Math.round((remaining / unedited.length) * 100) / 100);
            assigned += share;
            nextCustom[m] = formatNumForInput(share);
          }
        });
        setCustomAmounts(nextCustom);
      }
    }

    if (payerMode === 'multiple' && activeGroupData) {
      const editedSum = manuallyEditedPayers.reduce((acc, m) => {
        return acc + (Number(customPayerAmounts[m]) || 0);
      }, 0);
      const remaining = Math.max(0, Math.round((total - editedSum) * 100) / 100);
      const unedited = activeGroupData.members.filter((m) => !manuallyEditedPayers.includes(m));

      if (unedited.length > 0) {
        const nextPayers = { ...customPayerAmounts };
        let assigned = 0;
        unedited.forEach((m, idx) => {
          if (idx === unedited.length - 1) {
            const finalShare = Math.max(0, Math.round((remaining - assigned) * 100) / 100);
            nextPayers[m] = formatNumForInput(finalShare);
          } else {
            const share = Math.max(0, Math.round((remaining / unedited.length) * 100) / 100);
            assigned += share;
            nextPayers[m] = formatNumForInput(share);
          }
        });
        setCustomPayerAmounts(nextPayers);
      }
    }
  };

  const handleCustomPercentageChange = (member: string, value: string) => {
    setCustomPercentages((prev) => ({ ...prev, [member]: value }));
  };

  const handleDistributeRemaining = () => {
    const total = Number(expenseData.totalAmount) || 0;
    const currentSum = splitAmong.reduce((acc, m) => acc + (Number(customAmounts[m]) || 0), 0);
    const remaining = total - currentSum;
    if (splitAmong.length === 0 || remaining === 0) return;

    const unedited = splitAmong.filter((m) => !manuallyEditedMembers.includes(m));
    const targetMembers = unedited.length > 0 ? unedited : splitAmong;
    const perMemberAdd = remaining / targetMembers.length;
    const next: Record<string, string> = { ...customAmounts };
    targetMembers.forEach((m) => {
      const current = Number(next[m]) || 0;
      next[m] = formatNumForInput(Math.max(0, current + perMemberAdd));
    });
    setCustomAmounts(next);
  };

  const handleSyncTotalWithCustomSum = () => {
    const currentSum = splitAmong.reduce((acc, m) => acc + (Number(customAmounts[m]) || 0), 0);
    setExpenseData((prev) => ({ ...prev, totalAmount: formatNumForInput(currentSum) }));
  };

  const handleEqualizeCustom = () => {
    const total = Number(expenseData.totalAmount) || 0;
    if (splitAmong.length === 0 || total <= 0) return;
    const perPerson = formatNumForInput(total / splitAmong.length);
    const next: Record<string, string> = {};
    splitAmong.forEach((m) => (next[m] = perPerson));
    setCustomAmounts(next);
    setManuallyEditedMembers([]);
  };

  const toggleSplitMember = (name: string) => {
    setSplitAmong((prev) => {
      const next = prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name];
      if (splitMode === 'custom' && !prev.includes(name) && !customAmounts[name]) {
        setCustomAmounts((ca) => ({ ...ca, [name]: '0.00' }));
      }
      return next;
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const rawTotal = Number(expenseData.totalAmount);
    if (!expenseData.description || !rawTotal || splitAmong.length === 0 || !activeGroupData) return;

    const totalBase = toBaseCurrency(rawTotal, currency);

    // 1. Calculate paid amounts per member in base currency
    const paidByMember: Record<string, number> = {};
    if (payerMode === 'single') {
      activeGroupData.members.forEach((m) => {
        paidByMember[m] = m === expenseData.paidBy ? totalBase : 0;
      });
    } else {
      activeGroupData.members.forEach((m) => {
        const rawPaid = Number(customPayerAmounts[m]) || 0;
        paidByMember[m] = toBaseCurrency(rawPaid, currency);
      });
    }

    // 2. Calculate share amounts per member in base currency
    const shareByMember: Record<string, number> = {};
    if (splitMode === 'equal') {
      const shareBase = totalBase / splitAmong.length;
      activeGroupData.members.forEach((m) => {
        shareByMember[m] = splitAmong.includes(m) ? shareBase : 0;
      });
    } else if (splitMode === 'custom') {
      activeGroupData.members.forEach((m) => {
        if (splitAmong.includes(m)) {
          const rawShare = Number(customAmounts[m]) || 0;
          shareByMember[m] = toBaseCurrency(rawShare, currency);
        } else {
          shareByMember[m] = 0;
        }
      });
    } else if (splitMode === 'percentages') {
      activeGroupData.members.forEach((m) => {
        if (splitAmong.includes(m)) {
          const pct = Number(customPercentages[m]) || 0;
          const rawShare = (rawTotal * pct) / 100;
          shareByMember[m] = toBaseCurrency(rawShare, currency);
        } else {
          shareByMember[m] = 0;
        }
      });
    }

    // Combine into BillMember[]
    const memberRecords: BillExpense['members'] = activeGroupData.members.map((name) => ({
      name,
      paidAmount: paidByMember[name] || 0,
      shareAmount: shareByMember[name] || 0,
    }));

    // Determine primary display paidBy string
    let displayPaidBy = expenseData.paidBy;
    if (payerMode === 'multiple') {
      const activePayers = activeGroupData.members.filter((m) => (paidByMember[m] || 0) > 0.001);
      displayPaidBy = activePayers.length > 1 ? `${activePayers.join(', ')} (Multi-payer)` : (activePayers[0] || expenseData.paidBy);
    }

    if (editingExpense && onUpdateExpense) {
      onUpdateExpense(activeGroup!, {
        id: editingExpense.expense.id,
        description: expenseData.description,
        totalAmount: totalBase,
        paidBy: displayPaidBy,
        members: memberRecords,
        date: expenseData.date,
      });
    } else {
      onAddExpense(activeGroup!, {
        description: expenseData.description,
        totalAmount: totalBase,
        paidBy: displayPaidBy,
        members: memberRecords,
        date: expenseData.date,
      });
    }

    soundFx.playSuccess();
    setExpenseData({ description: '', totalAmount: '', paidBy: '', date: new Date().toISOString().split('T')[0] });
    setSplitAmong([]);
    setCustomAmounts({});
    setCustomPercentages({});
    setCustomPayerAmounts({});
    setSplitMode('equal');
    setPayerMode('single');
    setEditingExpense(null);
    setShowExpenseForm(false);
    setActiveGroup(null);
  };

  const computeBalances = (group: BillGroup) => {
    const balances: Record<string, number> = {};
    group.members.forEach((m) => (balances[m] = 0));
    group.expenses.forEach((exp) => {
      exp.members.forEach((m) => {
        balances[m.name] = (balances[m.name] || 0) + (m.paidAmount - m.shareAmount);
      });
    });
    return balances;
  };

  const settleUp = (balances: Record<string, number>) => {
    const creditors = Object.entries(balances).filter(([, v]) => v > 0.0001).sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(balances).filter(([, v]) => v < -0.0001).sort((a, b) => a[1] - b[1]);

    const settlements: { from: string; to: string; amount: number }[] = [];
    let i = 0;
    let j = 0;
    const debtCopy = debtors.map(([name, amount]) => [name, Math.abs(amount)] as [string, number]);
    const credCopy = creditors.map(([name, amount]) => [name, amount] as [string, number]);

    while (i < debtCopy.length && j < credCopy.length) {
      const [debtor, debtAmt] = debtCopy[i];
      const [creditor, credAmt] = credCopy[j];
      const settled = Math.min(debtAmt, credAmt);
      settlements.push({ from: debtor, to: creditor, amount: settled });
      debtCopy[i][1] -= settled;
      credCopy[j][1] -= settled;
      if (debtCopy[i][1] < 0.0001) i++;
      if (credCopy[j][1] < 0.0001) j++;
    }
    return settlements;
  };

  const allUniqueMembers = useMemo(() => {
    const set = new Set<string>();
    billGroups.forEach((g) => g.members.forEach((m) => set.add(m)));
    return Array.from(set);
  }, [billGroups]);

  const hasActiveFilters =
    searchQuery !== '' ||
    datePreset !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    memberFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setMemberFilter('all');
  };

  const getFilteredExpenses = (expenses: BillExpense[]) => {
    const now = new Date();
    return expenses
      .filter((exp) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const descMatch = exp.description.toLowerCase().includes(q);
          const payerMatch = exp.paidBy.toLowerCase().includes(q);
          const memberMatch = exp.members.some((m) => m.name.toLowerCase().includes(q));
          if (!descMatch && !payerMatch && !memberMatch) return false;
        }

        if (memberFilter !== 'all') {
          const hasMember =
            exp.members.some((m) => m.name === memberFilter) || exp.paidBy === memberFilter;
          if (!hasMember) return false;
        }

        const expDate = new Date(exp.date + 'T00:00:00');
        if (datePreset === 'this-month') {
          const start = startOfMonth(now);
          const end = endOfMonth(now);
          if (expDate < start || expDate > end) return false;
        } else if (datePreset === 'last-month') {
          const prevMonth = subMonths(now, 1);
          const start = startOfMonth(prevMonth);
          const end = endOfMonth(prevMonth);
          if (expDate < start || expDate > end) return false;
        } else if (datePreset === 'last-30') {
          const start = subDays(now, 30);
          if (expDate < start || expDate > now) return false;
        } else if (datePreset === 'this-year') {
          const start = startOfYear(now);
          const end = endOfYear(now);
          if (expDate < start || expDate > end) return false;
        } else if (datePreset === 'custom') {
          if (startDate) {
            const start = new Date(startDate + 'T00:00:00');
            if (expDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate + 'T23:59:59');
            if (expDate > end) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount-desc') return b.totalAmount - a.totalAmount;
        if (sortBy === 'amount-asc') return a.totalAmount - b.totalAmount;
        return 0;
      });
  };

  // Global settlement overview
  let grandTotalSpent = 0;
  billGroups.forEach((g) => {
    grandTotalSpent += g.expenses.reduce((acc, e) => acc + e.totalAmount, 0);
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Split & Share Expenses
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Effortlessly split shared rent, trips, and dinners with roommates & friends
          </p>
        </div>
        <button
          onClick={() => setShowGroupForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Split Group</span>
        </button>
      </div>

      {/* Bill Splits Search & Filter Panel */}
      {billGroups.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search description / members */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search bills, items, or members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Preset Filter */}
            <div className="lg:col-span-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={datePreset}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setDatePreset(val);
                    if (val !== 'custom') {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                >
                  <option value="all">📅 All Dates</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="last-30">Last 30 Days</option>
                  <option value="this-year">This Year (YTD)</option>
                  <option value="custom">Custom Date Range...</option>
                </select>
              </div>
            </div>

            {/* Member Filter */}
            <div className="lg:col-span-3">
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              >
                <option value="all">👥 All Members</option>
                {allUniqueMembers.map((m) => (
                  <option key={m} value={m}>
                    Member: {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Sort & Custom Date Drawer */}
            <div className="lg:col-span-2 flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  showFilters || datePreset === 'custom' || sortBy !== 'date-desc'
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Options</span>
                {(datePreset === 'custom' || sortBy !== 'date-desc') && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable Options Drawer */}
          {showFilters && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
              {/* Sort Order */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Sort Ledger By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex-wrap">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                  "{searchQuery}"
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </span>
              )}
              {memberFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                  Member: {memberFilter}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setMemberFilter('all')} />
                </span>
              )}
              {datePreset !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                  Date: {datePreset.replace('-', ' ')}
                  {startDate && endDate ? ` (${startDate} to ${endDate})` : ''}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => {
                      setDatePreset('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                  />
                </span>
              )}

              <button
                onClick={clearAllFilters}
                className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline ml-auto flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bill Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {billGroups.map((group) => {
          const balances = computeBalances(group);
          const memberStats = computeMemberStats(group);
          const totalSpent = group.expenses.reduce((acc, e) => acc + e.totalAmount, 0);
          const settlements = settleUp(balances);
          const isExpanded = expandedGroup === group.id;

          return (
            <div
              key={group.id}
              className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm hover-lift space-y-6 flex flex-col justify-between"
            >
              {/* Group Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/50 font-bold font-heading text-lg">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold font-heading text-lg text-slate-900 dark:text-white">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {group.members.length} members • {group.expenses.length} expenses
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openExpenseForm(group.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bill</span>
                  </button>
                  {onDeleteGroup && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete split group "${group.name}"?`)) onDeleteGroup(group.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Total Group Spend Banner */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Group Spending</p>
                  <p className="text-xl font-bold font-heading text-slate-900 dark:text-white mt-0.5">
                    {formatCurrency(totalSpent, currency)}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {group.members.slice(0, 4).map((m, idx) => (
                    <div
                      key={m}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-900"
                      style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                      title={m}
                    >
                      {m.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Member Balances & Tabs Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Member Balances & Tabs
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Given vs Share
                  </span>
                </div>
                <div className="space-y-2">
                  {group.members.map((m, idx) => {
                    const stats = memberStats[m] || { totalGiven: 0, totalShare: 0, net: 0 };
                    const bal = stats.net;
                    const gets = bal > 0.001;
                    const owes = bal < -0.001;
                    const memberColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];

                    return (
                      <div
                        key={m}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-2xs"
                            style={{ backgroundColor: memberColor }}
                          >
                            {m.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                              <span>{m}</span>
                              {m === 'You' && (
                                <span className="text-[10px] text-indigo-500 font-normal">(You)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono mt-1">
                              <span>Given: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(stats.totalGiven, currency)}</strong></span>
                              <span>•</span>
                              <span>Share: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(stats.totalShare, currency)}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-xs block ${
                              gets
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : owes
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {gets
                              ? `gets ${formatCurrency(bal, currency)}`
                              : owes
                              ? `pending ${formatCurrency(Math.abs(bal), currency)}`
                              : '✓ Settled'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Smart Debt Settlements */}
              {settlements.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 space-y-2">
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Recommended Simplest Settlement
                  </p>
                  <div className="space-y-2">
                    {settlements.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{s.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{s.to}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            {formatCurrency(s.amount, currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => openSettleModal(group.id, s.from, s.to, s.amount)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                            title={`Record payment from ${s.from} to ${s.to}`}
                          >
                            <HandCoins className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Expense History */}
              {group.expenses.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-1"
                  >
                    <span>View Expense Ledger ({group.expenses.length})</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                      {getFilteredExpenses(group.expenses).length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No bills match active search/filters
                        </div>
                      ) : (
                        getFilteredExpenses(group.expenses).map((exp) => (
                          <div
                            key={exp.id}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs group/item transition-all"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900 dark:text-white">{exp.description}</p>
                                {exp.description.startsWith('Debt Settlement') && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                    Settled
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                                <span>Paid by <strong className="font-medium text-slate-700 dark:text-slate-300">{exp.paidBy}</strong></span>
                                <span>•</span>
                                <span>{exp.date}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                {formatCurrency(exp.totalAmount, currency)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditExpense(group.id, exp)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                  title="Edit Expense, Payer & Split"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteExpense && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpense(group.id, exp.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                    title="Delete Expense"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {billGroups.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 space-y-3 glass-panel rounded-3xl">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No bill splitting groups yet.</p>
            <p className="text-xs text-slate-500">Create a group for roommates, trips, or group dinners to track shared costs effortlessly.</p>
          </div>
        )}
      </div>

      {/* New Group Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Create Bill Split Group
              </h3>
              <button
                onClick={() => setShowGroupForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Lake Tahoe Cabin Trip, Apt 4B"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Add Members
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMember();
                        }
                      }}
                      placeholder="Member name (press Enter)"
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {members.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 rounded-full text-xs font-semibold"
                      >
                        {m}
                        {m !== 'You' && (
                          <button
                            type="button"
                            onClick={() => setMembers(members.filter((x) => x !== m))}
                            className="text-indigo-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGroupForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={members.length === 0}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shared Expense Modal */}
      {showExpenseForm && activeGroupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                  {editingExpense ? 'Edit Bill & Payer Breakdown' : `Add Bill to ${activeGroupData.name}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingExpense
                    ? 'Modify who paid, payment shares, and individual split tabs'
                    : 'Record shared expense and distribute splits'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowExpenseForm(false);
                  setActiveGroup(null);
                  setEditingExpense(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={expenseData.description}
                    onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                    placeholder="e.g., Airbnb Cabin Booking, Dinner & Wine"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Total Amount
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                      {CURRENCY_MAP[currency]?.symbol || '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={expenseData.totalAmount}
                      onChange={(e) => handleTotalAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Paid By Section with Single vs Multi-Payer Strategy */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Who Paid?
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handlePayerModeChange('single')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        payerMode === 'single'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Single Payer
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePayerModeChange('multiple')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        payerMode === 'multiple'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Multiple Payers
                    </button>
                  </div>
                </div>

                {payerMode === 'single' ? (
                  <select
                    value={expenseData.paidBy}
                    onChange={(e) => setExpenseData({ ...expenseData, paidBy: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {activeGroupData.members.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  /* Multiple Payers Configuration */
                  <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    {(() => {
                      const total = Number(expenseData.totalAmount) || 0;
                      const sumPaid = activeGroupData.members.reduce((acc, m) => acc + (Number(customPayerAmounts[m]) || 0), 0);
                      const diff = Math.round((total - sumPaid) * 100) / 100;
                      const isMatch = Math.abs(diff) < 0.01 && total > 0;
                      const isUnder = diff > 0.01;
                      const isOver = diff < -0.01;

                      return (
                        <>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600 dark:text-slate-400">
                              Total Paid: <span className="font-mono text-slate-900 dark:text-white">{formatRawCurrency(sumPaid, currency)}</span> of {formatRawCurrency(total, currency)}
                            </span>
                            {isMatch ? (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Covered
                              </span>
                            ) : isUnder ? (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> {formatRawCurrency(diff, currency)} unpaid
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> Overpaid by {formatRawCurrency(Math.abs(diff), currency)}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
                            {activeGroupData.members.map((m, idx) => (
                              <div
                                key={m}
                                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                    style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                                  >
                                    {m.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-slate-900 dark:text-white">{m}</span>
                                  {manuallyEditedPayers.includes(m) ? (
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                      Manual
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                      Auto
                                    </span>
                                  )}
                                </div>
                                <div className="relative flex items-center w-32">
                                  <span className="absolute left-2.5 text-xs font-bold font-mono text-slate-400 pointer-events-none">
                                    {CURRENCY_MAP[currency]?.symbol || '$'}
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customPayerAmounts[m] ?? ''}
                                    onChange={(e) => handleCustomPayerAmountChange(m, e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {isUnder && (
                              <button
                                type="button"
                                onClick={handleDistributeRemainingPayer}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" /> Auto-Fill Remainder to Payer
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleEqualizePayers}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Equalize Payments
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Split Strategy & Custom Tabs Selector */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Split Strategy
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleSwitchSplitMode('equal')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        splitMode === 'equal'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Equal className="w-3.5 h-3.5" />
                      <span>Equal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchSplitMode('custom')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        splitMode === 'custom'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Custom Tabs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchSplitMode('percentages')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        splitMode === 'percentages'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>% Pct</span>
                    </button>
                  </div>
                </div>

                {/* Allocation Balance Banner (for Custom mode) */}
                {splitMode === 'custom' && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    {(() => {
                      const total = Number(expenseData.totalAmount) || 0;
                      const sumCustom = splitAmong.reduce((acc, m) => acc + (Number(customAmounts[m]) || 0), 0);
                      const diff = Math.round((total - sumCustom) * 100) / 100;
                      const isMatch = Math.abs(diff) < 0.01 && total > 0;
                      const isUnder = diff > 0.01;
                      const isOver = diff < -0.01;

                      return (
                        <>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600 dark:text-slate-400">
                              Allocated: <span className="font-mono text-slate-900 dark:text-white">{formatRawCurrency(sumCustom, currency)}</span> of {formatRawCurrency(total, currency)}
                            </span>
                            {isMatch && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
                              </span>
                            )}
                            {isUnder && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> {formatRawCurrency(diff, currency)} unassigned
                              </span>
                            )}
                            {isOver && (
                              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> Over by {formatRawCurrency(Math.abs(diff), currency)}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {isUnder && (
                              <button
                                type="button"
                                onClick={handleDistributeRemaining}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" /> Auto-Distribute Remainder
                              </button>
                            )}
                            {Math.abs(diff) > 0.01 && sumCustom > 0 && (
                              <button
                                type="button"
                                onClick={handleSyncTotalWithCustomSum}
                                className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 text-[11px] font-bold transition-colors"
                              >
                                Update Total to {formatRawCurrency(sumCustom, currency)}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleEqualizeCustom}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Equalize
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {splitMode === 'percentages' && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    {(() => {
                      const totalPct = splitAmong.reduce((acc, m) => acc + (Number(customPercentages[m]) || 0), 0);
                      const is100 = Math.abs(totalPct - 100) < 0.1;

                      return (
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-400">
                            Total Percentage Assigned: <span className="font-mono text-slate-900 dark:text-white">{totalPct.toFixed(1)}%</span>
                          </span>
                          {is100 ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Assigned
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <AlertCircle className="w-3.5 h-3.5" /> {(100 - totalPct).toFixed(1)}% remaining
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Member Allocation List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeGroupData.members.map((m, idx) => {
                    const isSelected = splitAmong.includes(m);
                    const memberColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];

                    return (
                      <div
                        key={m}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-white/80 dark:bg-slate-800/90 border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSplitMember(m)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                            style={{ backgroundColor: memberColor }}
                          >
                            {m.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
                                {m}
                              </p>
                              {splitMode === 'custom' && isSelected && (
                                manuallyEditedMembers.includes(m) ? (
                                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                    Manual
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                    Auto-Pending
                                  </span>
                                )
                              )}
                            </div>
                            {m === expenseData.paidBy && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Payer
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Equal Mode Amount Preview */}
                        {splitMode === 'equal' && isSelected && expenseData.totalAmount && (
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {formatRawCurrency(Number(expenseData.totalAmount) / splitAmong.length, currency)}
                          </span>
                        )}

                        {/* Custom Mode Exact Amount Input & Live Pending on Tab */}
                        {splitMode === 'custom' && isSelected && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="relative flex items-center w-36">
                              <span className="absolute left-3 text-xs font-bold font-mono text-slate-400 pointer-events-none">
                                {CURRENCY_MAP[currency]?.symbol || '$'}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={customAmounts[m] ?? ''}
                                onChange={(e) => handleCustomAmountChange(m, e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                              />
                            </div>
                            {(() => {
                              const mShare = Number(customAmounts[m]) || 0;
                              const mPaid =
                                payerMode === 'single'
                                  ? m === expenseData.paidBy
                                    ? Number(expenseData.totalAmount) || 0
                                    : 0
                                  : Number(customPayerAmounts[m]) || 0;
                              const mPending = mShare - mPaid;

                              if (mPaid > 0 || mShare > 0) {
                                if (mPending > 0.001) {
                                  return (
                                    <span className="text-[10px] font-mono font-bold text-rose-500">
                                      Pending: {formatRawCurrency(mPending, currency)}
                                    </span>
                                  );
                                }
                                if (mPending < -0.001) {
                                  return (
                                    <span className="text-[10px] font-mono font-bold text-emerald-500">
                                      Advance: +{formatRawCurrency(Math.abs(mPending), currency)}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[10px] font-mono font-bold text-emerald-500">
                                    ✓ Paid in Full
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {/* Percentage Mode Input */}
                        {splitMode === 'percentages' && isSelected && (
                          <div className="flex items-center gap-2">
                            <div className="relative flex items-center w-24">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={customPercentages[m] ?? ''}
                                onChange={(e) => handleCustomPercentageChange(m, e.target.value)}
                                placeholder="0"
                                className="w-full pr-6 pl-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                              />
                              <span className="absolute right-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                                %
                              </span>
                            </div>
                            {expenseData.totalAmount && (
                              <span className="font-mono text-[11px] font-bold text-slate-500 min-w-[50px] text-right">
                                {formatRawCurrency((Number(expenseData.totalAmount) * (Number(customPercentages[m]) || 0)) / 100, currency)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>

              <div className="p-4 sm:p-5 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseForm(false);
                    setActiveGroup(null);
                    setEditingExpense(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={splitAmong.length === 0}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editingExpense ? 'Update Bill & Split' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment / Partial Settlement Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                    Record Payment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Log cash, UPI, or bank transfer between members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettleModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Payer</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{settleModal.from}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                  <div className="text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Receiver</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{settleModal.to}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    How Much Money Was Given?
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-bold font-mono text-slate-400 pointer-events-none select-none">
                      {CURRENCY_MAP[currency]?.symbol || '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={settleModal.amountGivenInput}
                      onChange={(e) =>
                        setSettleModal({ ...settleModal, amountGivenInput: e.target.value })
                      }
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Quick amount shortcuts */}
                  {(() => {
                    const maxRaw = fromBaseCurrency(settleModal.totalOwedBase, currency);
                    return (
                      <div className="flex items-center gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSettleModal({ ...settleModal, amountGivenInput: formatNumForInput(maxRaw) })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Full ({formatRawCurrency(maxRaw, currency)})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSettleModal({
                              ...settleModal,
                              amountGivenInput: formatNumForInput(maxRaw / 2),
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Half ({formatRawCurrency(maxRaw / 2, currency)})
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Dynamic Live Pending Balance Card */}
                {(() => {
                  const maxRaw = fromBaseCurrency(settleModal.totalOwedBase, currency);
                  const givenRaw = Number(settleModal.amountGivenInput) || 0;
                  const pendingRaw = Math.max(0, Math.round((maxRaw - givenRaw) * 100) / 100);
                  const isFullyCleared = givenRaw >= maxRaw;

                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                        <span>Total Amount Owed:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatRawCurrency(maxRaw, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                        <span>Money Given Now:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          - {formatRawCurrency(givenRaw, currency)}
                        </span>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold">
                        <span className="text-slate-700 dark:text-slate-300">Remaining Pending Debt:</span>
                        <span
                          className={`font-mono ${
                            isFullyCleared
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isFullyCleared ? '✓ 100% Cleared' : formatRawCurrency(pendingRaw, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSettleModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!Number(settleModal.amountGivenInput)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
