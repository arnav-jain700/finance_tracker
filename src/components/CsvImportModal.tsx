import { useState } from 'react';
import { Transaction, CATEGORIES, formatCurrency } from '../store';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  Sparkles,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { CategoryBadge } from './CategoryIcon';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Omit<Transaction, 'id'>[]) => void;
  currency: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Housing': ['rent', 'lease', 'mortgage', 'landlord', 'hoa', 'property'],
  'Food & Dining': ['grocery', 'market', 'foods', 'restaurant', 'cafe', 'starbucks', 'coffee', 'bistro', 'burger', 'pizza', 'trader', 'uber eats', 'doordash'],
  'Transport': ['uber', 'lyft', 'gas', 'shell', 'chevron', 'tesla', 'supercharger', 'transit', 'metro', 'toll', 'parking', 'flight', 'airline'],
  'Entertainment': ['netflix', 'spotify', 'cinema', 'theatre', 'steam', 'game', 'playstation', 'apple tv', 'disney', 'hulu', 'concert'],
  'Utilities': ['electric', 'power', 'water', 'internet', 'wifi', 'fiber', 'broadband', 'aws', 'cloud', 'hosting', 'verizon', 'att'],
  'Healthcare': ['pharmacy', 'cvs', 'walgreens', 'doctor', 'clinic', 'hospital', 'dental', 'gym', 'fitness', 'equinox', 'health'],
  'Shopping': ['amazon', 'apple store', 'target', 'walmart', 'ebay', 'nike', 'zara', 'clothing'],
  'Salary': ['payroll', 'salary', 'direct dep', 'compensation', 'employer'],
  'Freelance': ['contract', 'client payment', 'upwork', 'fiverr', 'invoice payment'],
  'Investments': ['dividend', 'vanguard', 'fidelity', 'robinhood', 'coinbase', 'interest earned'],
};

const SAMPLE_CSV = `Date,Description,Amount,Type
2026-08-14,Whole Foods Market,112.50,expense
2026-08-13,Uber Trip to Airport,42.00,expense
2026-08-12,Freelance Client Retainer,1200.00,income
2026-08-10,Netflix Subscription,22.99,expense
2026-08-08,Blue Bottle Coffee,8.50,expense`;

export function CsvImportModal({
  isOpen,
  onClose,
  onImport,
  currency,
}: CsvImportModalProps) {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [parsedRows, setParsedRows] = useState<
    Array<{
      date: string;
      description: string;
      amount: number;
      type: 'income' | 'expense';
      category: string;
      selected: boolean;
    }>
  >([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const guessCategory = (description: string, type: string): string => {
    const desc = description.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((k) => desc.includes(k))) {
        return cat;
      }
    }
    return type === 'income' ? 'Salary' : 'Other';
  };

  const handleParse = () => {
    setError('');
    const lines = csvText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setError('Please provide at least one header line and one data row.');
      return;
    }

    try {
      const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/['"]/g, ''));
      const dateIdx = header.findIndex((h) => h.includes('date'));
      const descIdx = header.findIndex((h) => h.includes('desc') || h.includes('name') || h.includes('item'));
      const amountIdx = header.findIndex((h) => h.includes('amount') || h.includes('cost') || h.includes('price'));
      const typeIdx = header.findIndex((h) => h.includes('type'));
      const catIdx = header.findIndex((h) => h.includes('cat'));

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]/g, ''));
        if (cols.length < 2) continue;

        const date = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split('T')[0];
        const description = descIdx !== -1 && cols[descIdx] ? cols[descIdx] : cols[1] || 'Transaction';
        const rawAmt = amountIdx !== -1 ? cols[amountIdx] : cols[2];
        const numAmt = Math.abs(parseFloat(rawAmt.replace(/[^0-9.-]+/g, '')) || 0);

        let type: 'income' | 'expense' = 'expense';
        if (typeIdx !== -1 && cols[typeIdx]) {
          type = cols[typeIdx].toLowerCase().includes('inc') ? 'income' : 'expense';
        } else if (parseFloat(rawAmt) > 0 && descIdx !== -1 && cols[descIdx].toLowerCase().includes('salary')) {
          type = 'income';
        }

        const category = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : guessCategory(description, type);

        if (numAmt > 0) {
          rows.push({
            date,
            description,
            amount: numAmt,
            type,
            category,
            selected: true,
          });
        }
      }

      if (rows.length === 0) {
        setError('Could not extract valid transaction rows. Check format.');
        return;
      }

      setParsedRows(rows);
      setStep('preview');
    } catch (e) {
      setError('Error parsing CSV. Please ensure valid comma-separated rows.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    const toImport = parsedRows
      .filter((r) => r.selected)
      .map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.type,
        category: r.category,
        notes: 'Imported via CSV Bank Statement',
      }));

    onImport(toImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-glow rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                Bank CSV Statement Importer
              </h3>
              <p className="text-xs text-slate-500">
                Bulk upload transaction ledgers with AI rule-based category tagging
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'input' ? (
          /* Step 1: Input / File Upload */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Paste CSV or Drag & Drop File
              </label>
              <label className="cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Upload .csv file
                <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              placeholder="Date,Description,Amount,Type&#10;2026-08-10,Whole Foods,85.20,expense"
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/90 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800/40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParse}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Parse & Auto-Categorize</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Preview & Confirm */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Found <strong>{parsedRows.length}</strong> transactions ready for import:
              </p>
              <button
                onClick={() => setStep('input')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                ← Edit CSV Text
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {parsedRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`p-3 flex items-center justify-between text-xs transition-colors ${
                    row.selected ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/40 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) => {
                        const updated = [...parsedRows];
                        updated[idx].selected = e.target.checked;
                        setParsedRows(updated);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{row.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{row.date}</span>
                        <span>•</span>
                        <CategoryBadge category={row.category} className="text-[9px] py-0 px-1.5" />
                      </div>
                    </div>
                  </div>

                  <span
                    className={`font-mono font-bold shrink-0 ${
                      row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Import ({parsedRows.filter((r) => r.selected).length})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
