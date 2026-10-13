// src/pages/ExpensesPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchExpensesFirestore,
  addExpenseFirestore,
  deleteExpenseFirestore,
  updateExpenseFirestore,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "../redux/expensesSlice";
import { parseReceipt } from "../services/receiptParserService";
import {
  Receipt,
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Edit2,
  X,
  Upload,
  Wand2,
  Image as ImageIcon,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
} from "lucide-react";

// Simple SVG Weekly Trend Bar Chart Component
function SimpleMoneyTrendChart({ monthTransactions, currentYear, currentMonth }) {
  const weeklyData = useMemo(() => {
    const weeks = [
      { label: "W1", income: 0, expense: 0 },
      { label: "W2", income: 0, expense: 0 },
      { label: "W3", income: 0, expense: 0 },
      { label: "W4", income: 0, expense: 0 },
    ];

    monthTransactions.forEach((t) => {
      if (!t.date) return;
      const day = new Date(t.date).getDate();
      const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
      if (t.type === "income") {
        weeks[weekIndex].income += t.amount || 0;
      } else {
        weeks[weekIndex].expense += t.amount || 0;
      }
    });

    return weeks;
  }, [monthTransactions]);

  const maxVal = useMemo(() => {
    let max = 100;
    weeklyData.forEach((w) => {
      if (w.income > max) max = w.income;
      if (w.expense > max) max = w.expense;
    });
    return max;
  }, [weeklyData]);

  const hasData = monthTransactions.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center text-slate-400">
        <BarChart2 className="h-5 w-5 stroke-1 text-slate-300 dark:text-slate-700 mb-1" />
        <span className="text-[11px] font-semibold">Not enough data yet</span>
        <span className="text-[10px] text-slate-400">Add transactions to see your weekly trend.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-2 h-20 pt-1">
        {weeklyData.map((w, idx) => {
          const incHeight = Math.max(4, Math.round((w.income / maxVal) * 75));
          const expHeight = Math.max(4, Math.round((w.expense / maxVal) * 75));

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1.5 h-16 w-full justify-center">
                {/* Income Bar */}
                <div
                  className="w-2 sm:w-2.5 rounded-t-sm bg-emerald-500 transition-all duration-500"
                  style={{ height: `${incHeight}%` }}
                  title={`Income: AED ${w.income.toLocaleString()}`}
                />
                {/* Expense Bar */}
                <div
                  className="w-2 sm:w-2.5 rounded-t-sm bg-slate-700 dark:bg-slate-400 transition-all duration-500"
                  style={{ height: `${expHeight}%` }}
                  title={`Expense: AED ${w.expense.toLocaleString()}`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 leading-none">{w.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-500 pt-0.5">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-xs bg-emerald-500" /> Income
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-xs bg-slate-700 dark:bg-slate-400" /> Expenses
        </span>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const dispatch = useDispatch();
  const rawTransactions = useSelector((state) => state.expenses || []);

  // Selected Month State
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Filters & Tabs
  const [mobileTab, setMobileTab] = useState("transactions"); // "transactions" | "analytics"
  const [typeFilter, setTypeFilter] = useState("All"); // "All" | "income" | "expense"
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [transactionType, setTransactionType] = useState("expense");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [receiptEnlargedUrl, setReceiptEnlargedUrl] = useState(null);

  // Form inputs
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptName, setReceiptName] = useState("");

  // AI Scanner state
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [aiReviewData, setAiReviewData] = useState(null);

  useEffect(() => {
    dispatch(fetchExpensesFirestore());
  }, [dispatch]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleString("default", {
    month: "short",
    year: "numeric",
  });

  // Filter transactions by selected month
  const monthTransactions = useMemo(() => {
    return rawTransactions.filter((item) => {
      if (!item.date) return false;
      const d = new Date(item.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [rawTransactions, currentYear, currentMonth]);

  // Calculations
  const monthlyIncome = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [monthTransactions]);

  const monthlyExpenses = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type !== "income")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [monthTransactions]);

  const monthlyBalance = useMemo(() => {
    return monthlyIncome - monthlyExpenses;
  }, [monthlyIncome, monthlyExpenses]);

  // Spending breakdown (> 0 AED only)
  const expenseCategoryTotals = useMemo(() => {
    const totals = {};
    monthTransactions
      .filter((t) => t.type !== "income")
      .forEach((item) => {
        const cat = item.category || "Other";
        totals[cat] = (totals[cat] || 0) + (item.amount || 0);
      });

    return Object.keys(totals)
      .filter((catId) => totals[catId] > 0)
      .map((catId) => ({
        id: catId,
        amount: totals[catId],
        percent: monthlyExpenses > 0 ? (totals[catId] / monthlyExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, monthlyExpenses]);

  // Active filtered transactions
  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((item) => {
      const itemType = item.type || "expense";
      const matchesType = typeFilter === "All" || itemType === typeFilter;
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.description || "").toLowerCase().includes(q) ||
        (item.note || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.paymentMethod || "").toLowerCase().includes(q);

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [monthTransactions, typeFilter, selectedCategory, searchQuery]);

  // Group filtered transactions by Date
  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach((item) => {
      const dateStr = item.date || "Unscheduled";
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((dStr) => ({
        dateStr: dStr,
        items: groups[dStr],
      }));
  }, [filteredTransactions]);

  // Modal handlers
  const openAddModal = (initialType = "expense", initialData = null) => {
    if (initialData) {
      setEditingTransaction(initialData);
      setTransactionType(initialData.type || "expense");
      setAmount(initialData.amount ? String(initialData.amount) : "");
      setDescription(initialData.description || "");
      setCategory(initialData.category || (initialData.type === "income" ? "Salary" : "Groceries"));
      setPaymentMethod(initialData.paymentMethod || "Bank Transfer");
      setDate(initialData.date || today.toISOString().slice(0, 10));
      setNote(initialData.note || "");
      setReceiptPreview(initialData.receiptUrl || null);
      setReceiptName(initialData.receiptName || "");
      setReceiptFile(null);
    } else {
      setEditingTransaction(null);
      setTransactionType(initialType);
      setAmount("");
      setDescription("");
      setCategory(initialType === "income" ? "Salary" : "Groceries");
      setPaymentMethod("Bank Transfer");
      setDate(today.toISOString().slice(0, 10));
      setNote("");
      setReceiptPreview(null);
      setReceiptName("");
      setReceiptFile(null);
    }
    setAiReviewData(null);
    setShowFormModal(true);
  };

  const handleTypeToggle = (newType) => {
    setTransactionType(newType);
    if (!editingTransaction) {
      setCategory(newType === "income" ? "Salary" : "Groceries");
    }
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Receipt image size must be under 5MB.");
      return;
    }

    setReceiptFile(file);
    setReceiptName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptName("");
  };

  const handleScanReceiptAI = async () => {
    if (!receiptFile && !receiptPreview) {
      alert("Please select or attach a receipt image first to scan.");
      return;
    }

    setIsScanningReceipt(true);
    const mockFile = receiptFile || { name: receiptName || "receipt.jpg" };
    const res = await parseReceipt(mockFile);
    setIsScanningReceipt(false);

    if (res) {
      setAiReviewData(res);
      setTransactionType("expense");
      if (res.merchant) setDescription(res.merchant);
      if (res.suggestedCategory) setCategory(res.suggestedCategory);
      if (res.amount) setAmount(String(res.amount));
      if (res.date) setDate(res.date);
    }
  };

  const handleSaveTransaction = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a title or source for the transaction.");
      return;
    }

    const payload = {
      id: editingTransaction ? editingTransaction.id : undefined,
      type: transactionType,
      amount: parsedAmount,
      currency: "AED",
      description: description.trim(),
      category: category || (transactionType === "income" ? "Salary" : "Other"),
      paymentMethod: paymentMethod || "Bank Transfer",
      date: date || today.toISOString().slice(0, 10),
      note: note.trim(),
      receiptUrl: receiptPreview || null,
      receiptName: receiptName || null,
      source: aiReviewData ? "receipt" : "manual",
      aiExtracted: Boolean(aiReviewData),
      aiConfidence: aiReviewData?.confidence || null,
    };

    if (editingTransaction) {
      dispatch(updateExpenseFirestore(payload));
    } else {
      dispatch(addExpenseFirestore(payload));
    }

    setShowFormModal(false);
    if (detailTransaction && editingTransaction && detailTransaction.id === editingTransaction.id) {
      setDetailTransaction(payload);
    }
  };

  const handleDeleteConfirmed = (id) => {
    dispatch(deleteExpenseFirestore(id));
    setDeletingId(null);
    if (detailTransaction?.id === id) {
      setDetailTransaction(null);
    }
  };

  const getCategoryMeta = (catId, type = "expense") => {
    const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return (
      list.find((c) => c.id === catId) || {
        id: catId,
        label: catId,
        emoji: type === "income" ? "💰" : "📦",
        color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      }
    );
  };

  const formatCurrency = (val) => {
    return `AED ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDateHeaderLabel = (dateStr) => {
    if (!dateStr || dateStr === "Unscheduled") return "Unscheduled";
    const todayStr = new Date().toISOString().slice(0, 10);
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().slice(0, 10);

    if (dateStr === todayStr) return "Today";
    if (dateStr === yestStr) return "Yesterday";

    const d = new Date(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  const activeCategoriesList = typeFilter === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full gap-2 sm:gap-2.5 overflow-hidden select-none">
      {/* 1. COMPACT CLEAN HEADER */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              Expenses
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate">
              Track income & spending
            </p>
          </div>
        </div>

        {/* Month Selector + Add Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-0.5 rounded-xl bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-slate-800 p-0.5 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => openAddModal("expense")}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-500 active:scale-95 transition cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* 2. THREE COMPACT BALANCED KPI CARDS IN ONE ROW */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 shrink-0">
        {/* Card 1: Balance */}
        <div className="bento-card !p-2 sm:!p-3 rounded-2xl flex flex-col justify-between border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
              Net Balance
            </span>
            <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Wallet className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <div
              className={`text-xs sm:text-base md:text-lg font-black tracking-tight truncate ${
                monthlyBalance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {monthlyBalance >= 0 ? formatCurrency(monthlyBalance) : `- AED ${Math.abs(monthlyBalance).toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Card 2: Income */}
        <div className="bento-card !p-2 sm:!p-3 rounded-2xl flex flex-col justify-between border border-emerald-200/70 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/10 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">
              Income
            </span>
            <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xs sm:text-base md:text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              + {formatCurrency(monthlyIncome)}
            </div>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="bento-card !p-2 sm:!p-3 rounded-2xl flex flex-col justify-between border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Expenses
            </span>
            <div className="w-5 h-5 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xs sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
              − {formatCurrency(monthlyExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MOBILE VIEW SEGMENTED TOGGLE (Hidden on desktop) */}
      <div className="flex md:hidden items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("transactions")}
          className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "transactions"
              ? "bg-white dark:bg-[#121214] text-slate-900 dark:text-white shadow-2xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Transactions ({filteredTransactions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("analytics")}
          className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "analytics"
              ? "bg-white dark:bg-[#121214] text-slate-900 dark:text-white shadow-2xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Insights & Trend</span>
        </button>
      </div>

      {/* 4. MAIN BODY (Side-by-side on desktop, tabbed on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-2.5 flex-1 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: ANALYTICS & BREAKDOWN (Desktop: 5 cols, Mobile: tab 'analytics') */}
        <div
          className={`md:col-span-5 flex-col gap-2 sm:gap-2.5 min-h-0 overflow-hidden ${
            mobileTab === "analytics" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Card: Weekly Trend */}
          <div className="bento-card !p-2.5 sm:!p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs shrink-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Weekly Money Trend
              </span>
              <span className="text-[10px] font-semibold text-slate-400">{monthLabel}</span>
            </div>
            <SimpleMoneyTrendChart
              monthTransactions={monthTransactions}
              currentYear={currentYear}
              currentMonth={currentMonth}
            />
          </div>

          {/* Card: Category Spending Breakdown */}
          <div className="bento-card !p-2.5 sm:!p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Spending Breakdown
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {expenseCategoryTotals.length} categories
              </span>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 space-y-2 pt-2 pr-1 no-scrollbar">
              {expenseCategoryTotals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                  <span className="text-xs font-semibold">No spending this month</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Category spending bars will show up here.
                  </span>
                </div>
              ) : (
                expenseCategoryTotals.map((cat) => {
                  const meta = getCategoryMeta(cat.id, "expense");
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px] sm:text-xs">
                          {meta.emoji} {cat.id}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white ml-2 text-[11px] sm:text-xs shrink-0">
                          AED {cat.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round(cat.percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TRANSACTIONS FEED (Desktop: 7 cols, Mobile: tab 'transactions') */}
        <div
          className={`md:col-span-7 flex-col min-h-0 overflow-hidden bento-card !p-2.5 sm:!p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs ${
            mobileTab === "transactions" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Top Bar: Title & All/Income/Expense Filter */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Transactions</span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
                ({filteredTransactions.length})
              </span>
            </h2>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
              <button
                onClick={() => {
                  setTypeFilter("All");
                  setSelectedCategory("All");
                }}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                  typeFilter === "All"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-[#1a1a1e] dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setTypeFilter("income");
                  setSelectedCategory("All");
                }}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                  typeFilter === "income"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Income
              </button>
              <button
                onClick={() => {
                  setTypeFilter("expense");
                  setSelectedCategory("All");
                }}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                  typeFilter === "expense"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Expenses
              </button>
            </div>
          </div>

          {/* Search Bar & Category Chips */}
          <div className="pt-2 pb-1.5 space-y-1.5 shrink-0">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description, category, or note..."
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 pl-3 pr-8 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : (
                <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              )}
            </div>

            {/* Horizontal Scrolling Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar shrink-0 max-w-full">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  selectedCategory === "All"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                All Categories
              </button>
              {activeCategoriesList.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grouped Transaction List */}
          <div className="overflow-y-auto flex-1 min-h-0 space-y-3 pt-1 pr-0.5 no-scrollbar">
            {groupedTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800 bg-slate-50/40 dark:bg-[#1a1a1e]/40 my-auto">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 mb-1.5">
                  <Wallet className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">No transactions found</h3>
                <p className="mt-0.5 max-w-xs text-[10px] text-slate-500 dark:text-slate-400">
                  {searchQuery || selectedCategory !== "All" || typeFilter !== "All"
                    ? "No records match the active search or filters."
                    : "Add your first income or expense for this month."}
                </p>
                <button
                  onClick={() => openAddModal("expense")}
                  className="mt-2.5 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Add Transaction
                </button>
              </div>
            ) : (
              groupedTransactions.map((group) => {
                const dateLabel = getDateHeaderLabel(group.dateStr);
                const dayIncome = group.items
                  .filter((i) => i.type === "income")
                  .reduce((s, i) => s + (i.amount || 0), 0);
                const dayExpense = group.items
                  .filter((i) => i.type !== "income")
                  .reduce((s, i) => s + (i.amount || 0), 0);
                const dayNet = dayIncome - dayExpense;

                return (
                  <div key={group.dateStr} className="space-y-1">
                    {/* Date Subtotal Header */}
                    <div className="flex items-center justify-between px-1 text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                      <span>{dateLabel}</span>
                      <span
                        className={`font-extrabold ${
                          dayNet > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : dayNet < 0
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-400"
                        }`}
                      >
                        {dayNet > 0
                          ? `+ ${formatCurrency(dayNet)}`
                          : dayNet < 0
                          ? `- AED ${Math.abs(dayNet).toLocaleString()}`
                          : "AED 0.00"}
                      </span>
                    </div>

                    {/* Transaction Items */}
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isIncome = item.type === "income";
                        const meta = getCategoryMeta(item.category, item.type);

                        return (
                          <div
                            key={item.id}
                            onClick={() => setDetailTransaction(item)}
                            className="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-2 sm:p-2.5 transition-all hover:bg-white hover:border-indigo-500/40 hover:shadow-2xs dark:border-slate-800/80 dark:bg-[#16171a] dark:hover:bg-[#1f2025] cursor-pointer"
                          >
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                              {/* Emoji Badge */}
                              <div
                                className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm ${
                                  isIncome
                                    ? "bg-emerald-100/70 text-emerald-600 dark:bg-emerald-500/20"
                                    : "bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
                                }`}
                              >
                                {meta.emoji}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                    {item.description}
                                  </span>
                                  {item.receiptUrl && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-1 py-0.5 text-[8px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 shrink-0">
                                      <ImageIcon className="h-2 w-2" />
                                      Receipt
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                    {item.category} · {item.paymentMethod || "Bank Transfer"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Amount & Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-xs sm:text-sm font-extrabold ${
                                  isIncome
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {isIncome ? `+ ${formatCurrency(item.amount)}` : `− ${formatCurrency(item.amount)}`}
                              </span>

                              <div className="flex items-center gap-0.5 sm:opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddModal(item.type || "expense", item);
                                  }}
                                  className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(item.id);
                                  }}
                                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. ADD / EDIT TRANSACTION MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800 mb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Type selector toggle */}
            <div className="space-y-1 mb-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-2 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleTypeToggle("income")}
                  className={`py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    transactionType === "income"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeToggle("expense")}
                  className={`py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    transactionType === "expense"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  Expense
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              {/* Source/Title & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {transactionType === "income" ? "Source / Title *" : "Title *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={transactionType === "income" ? "e.g., Salary" : "e.g., Carrefour"}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (AED) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1.5 text-xs font-bold text-slate-400">AED</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200/80 bg-white pl-12 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  >
                    {(transactionType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Optional Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note..."
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  />
                </div>
              </div>

              {/* Receipt Image upload for Expenses */}
              {transactionType === "expense" && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      Attach Receipt
                    </label>
                    {receiptPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="text-[11px] font-medium text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {receiptPreview ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 cursor-pointer"
                        onClick={() => setReceiptEnlargedUrl(receiptPreview)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-slate-900 dark:text-white truncate">
                          {receiptName || "Receipt Attached"}
                        </span>
                        <button
                          type="button"
                          onClick={handleScanReceiptAI}
                          disabled={isScanningReceipt}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                        >
                          <Wand2 className="h-2.5 w-2.5" />
                          {isScanningReceipt ? "Scanning..." : "Scan with AI"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-center cursor-pointer hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1a1a1e] transition">
                      <Upload className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Upload receipt image
                      </span>
                      <input type="file" accept="image/*" onChange={handleReceiptFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer ${
                    transactionType === "income" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                >
                  {editingTransaction ? "Save Changes" : transactionType === "income" ? "Save Income" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DETAIL MODAL */}
      {detailTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800 mb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {detailTransaction.type === "income" ? "Income" : "Expense"} · {detailTransaction.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {detailTransaction.description}
                </h3>
              </div>
              <button
                onClick={() => setDetailTransaction(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div
                className={`rounded-xl p-2.5 text-center ${
                  detailTransaction.type === "income"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                }`}
              >
                <span className="text-lg font-extrabold">
                  {detailTransaction.type === "income" ? `+ ${formatCurrency(detailTransaction.amount)}` : `− ${formatCurrency(detailTransaction.amount)}`}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800">
                  <span className="text-slate-400">Date</span>
                  <span className="font-semibold">{detailTransaction.date}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800">
                  <span className="text-slate-400">Payment Method</span>
                  <span className="font-semibold">{detailTransaction.paymentMethod || "Bank Transfer"}</span>
                </div>

                {detailTransaction.note && (
                  <div className="border-b border-slate-100 py-1 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Note</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{detailTransaction.note}</p>
                  </div>
                )}

                {detailTransaction.receiptUrl && (
                  <div className="pt-1">
                    <span className="text-slate-400 block mb-1 font-medium">Receipt</span>
                    <img
                      src={detailTransaction.receiptUrl}
                      alt="Receipt"
                      className="h-32 w-full rounded-xl object-cover border border-slate-200 dark:border-slate-700 cursor-pointer"
                      onClick={() => setReceiptEnlargedUrl(detailTransaction.receiptUrl)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    const item = detailTransaction;
                    setDetailTransaction(null);
                    openAddModal(item.type || "expense", item);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    const id = detailTransaction.id;
                    setDeletingId(id);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-[#121214] text-center space-y-2.5">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Transaction?</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this record?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirmed(deletingId)}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ENLARGED RECEIPT MODAL */}
      {receiptEnlargedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setReceiptEnlargedUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-black p-2">
            <button
              onClick={() => setReceiptEnlargedUrl(null)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={receiptEnlargedUrl}
              alt="Enlarged Receipt"
              className="max-h-[85vh] w-auto rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
