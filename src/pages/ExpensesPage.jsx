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
  Sparkles,
  Image as ImageIcon,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart2,
} from "lucide-react";

// Simple SVG Weekly Trend Bar Chart Component
function SimpleMoneyTrendChart({ monthTransactions, currentYear, currentMonth }) {
  const weeklyData = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
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
  }, [monthTransactions, currentYear, currentMonth]);

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
      <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
        <BarChart2 className="h-6 w-6 stroke-1 text-slate-300 dark:text-slate-700 mb-1" />
        <span className="text-xs font-semibold">Not enough data yet</span>
        <span className="text-[10px] text-slate-400">Add transactions to see your money trend.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3 h-24 pt-2">
        {weeklyData.map((w, idx) => {
          const incHeight = Math.max(4, Math.round((w.income / maxVal) * 80));
          const expHeight = Math.max(4, Math.round((w.expense / maxVal) * 80));

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1.5 h-20 w-full justify-center">
                {/* Income Bar */}
                <div
                  className="w-2.5 rounded-t-sm bg-emerald-500 transition-all duration-500"
                  style={{ height: `${incHeight}%` }}
                  title={`Income: AED ${w.income.toLocaleString()}`}
                />
                {/* Expense Bar */}
                <div
                  className="w-2.5 rounded-t-sm bg-slate-700 dark:bg-slate-400 transition-all duration-500"
                  style={{ height: `${expHeight}%` }}
                  title={`Expense: AED ${w.expense.toLocaleString()}`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">{w.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-xs bg-emerald-500" /> Income
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-xs bg-slate-700 dark:bg-slate-400" /> Expenses
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

  // Filters
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
    month: "long",
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

  // Active filtered transactions for right side feed
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
    <div className="mx-auto max-w-6xl space-y-4 pb-16">
      {/* 3. HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Receipt className="h-5 w-5" />
            </div>
            Expenses
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            Track your income, spending and balance.
          </p>
        </div>

        {/* Right Header: Month Selector + Add Transaction */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 rounded-xl bg-white px-1 py-1 dark:bg-[#121214] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-1.5 text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => openAddModal("expense")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-500 transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* 2. CLEAN TWO-COLUMN LAYOUT (Left: 40% Overview, Right: 60% Transactions) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: MONEY OVERVIEW (40% -> md:col-span-5) */}
        <div className="md:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-[#121214] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Money Overview
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{monthLabel}</span>
            </div>

            {/* 4. BALANCE */}
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Balance</span>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight mt-0.5 ${
                  monthlyBalance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {monthlyBalance >= 0 ? formatCurrency(monthlyBalance) : `- AED ${Math.abs(monthlyBalance).toLocaleString()}`}
              </div>
            </div>

            {/* 5. INCOME + EXPENSE SUMMARY */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Income
                </span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                  + {formatCurrency(monthlyIncome)}
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Expenses
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block truncate">
                  − {formatCurrency(monthlyExpenses)}
                </span>
              </div>
            </div>

            {/* 6. ONLY ONE SIMPLE GRAPH */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Monthly Trend
              </span>
              <SimpleMoneyTrendChart
                monthTransactions={monthTransactions}
                currentYear={currentYear}
                currentMonth={currentMonth}
              />
            </div>

            {/* 7. SMALL SPENDING BREAKDOWN */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Spending Breakdown
                </span>
                <span className="text-[10px] text-slate-400">{expenseCategoryTotals.length} active</span>
              </div>

              {expenseCategoryTotals.length === 0 ? (
                <span className="text-xs text-slate-400 italic block py-1">No spending yet</span>
              ) : (
                <div className="space-y-2 pt-1">
                  {expenseCategoryTotals.slice(0, 5).map((cat) => {
                    const meta = getCategoryMeta(cat.id, "expense");
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {meta.emoji} {cat.id}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white ml-2">
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
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TRANSACTIONS LIST (60% -> md:col-span-7) */}
        <div className="md:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-[#121214] space-y-4">
            {/* 8. TRANSACTIONS HEADER & FILTERS */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Transactions
                <span className="text-xs font-semibold text-slate-400 font-normal">
                  ({filteredTransactions.length})
                </span>
              </h2>

              {/* Compact Filter: All | Income | Expenses */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setTypeFilter("All");
                    setSelectedCategory("All");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    typeFilter === "All"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-[#1a1a1e] dark:text-white"
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
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    typeFilter === "income"
                      ? "bg-emerald-600 text-white shadow-xs"
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
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    typeFilter === "expense"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Expenses
                </button>
              </div>
            </div>

            {/* 18. SEARCH BAR & CATEGORY PILLS */}
            <div className="space-y-2">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full rounded-xl border border-slate-200/80 bg-white pl-3.5 pr-9 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none shrink-0 max-w-full">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
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
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 9 & 10. TRANSACTION LIST GROUPED BY DATE */}
            {groupedTransactions.length === 0 ? (
              /* 19. EMPTY STATE */
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a1a1e]/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 mb-2">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">No transactions yet</h3>
                <p className="mt-1 max-w-xs text-[11px] text-slate-500 dark:text-slate-400">
                  {searchQuery || selectedCategory !== "All" || typeFilter !== "All"
                    ? "No transactions match your active filters."
                    : "Add your first income or expense to start tracking your money."}
                </p>
                <button
                  onClick={() => openAddModal("expense")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Transaction
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedTransactions.map((group) => {
                  const dateLabel = getDateHeaderLabel(group.dateStr);

                  // 10. DATE SUBTOTAL (Income - Expenses)
                  const dayIncome = group.items
                    .filter((i) => i.type === "income")
                    .reduce((s, i) => s + (i.amount || 0), 0);
                  const dayExpense = group.items
                    .filter((i) => i.type !== "income")
                    .reduce((s, i) => s + (i.amount || 0), 0);
                  const dayNet = dayIncome - dayExpense;

                  return (
                    <div key={group.dateStr} className="space-y-2">
                      <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
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
                          {dayNet > 0 ? `+ ${formatCurrency(dayNet)}` : dayNet < 0 ? `- AED ${Math.abs(dayNet).toLocaleString()}` : "AED 0.00"}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const isIncome = item.type === "income";
                          const meta = getCategoryMeta(item.category, item.type);

                          return (
                            <div
                              key={item.id}
                              onClick={() => setDetailTransaction(item)}
                              className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 transition-all hover:bg-white hover:border-indigo-500/40 hover:shadow-xs dark:border-slate-800 dark:bg-[#1a1a1e] dark:hover:bg-[#222226] cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Emoji Badge */}
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${
                                    isIncome ? "bg-emerald-100/70 text-emerald-600 dark:bg-emerald-500/20" : "bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
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
                                      <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-1 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                                        <ImageIcon className="h-2.5 w-2.5" />
                                        Receipt
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                      {item.category} · {item.paymentMethod || "Bank Transfer"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 11. INCOME VS EXPENSE VISUAL DIFFERENCE */}
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span
                                  className={`text-xs sm:text-sm font-extrabold ${
                                    isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                                  }`}
                                >
                                  {isIncome ? `+ ${formatCurrency(item.amount)}` : `− ${formatCurrency(item.amount)}`}
                                </span>

                                <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition">
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
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 12, 13 & 14. ADD / EDIT TRANSACTION MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
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
            <div className="space-y-1 mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                What type of transaction?
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleTypeToggle("income")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    transactionType === "income"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeToggle("expense")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    transactionType === "expense"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  Expense
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3.5">
              {/* Source/Title & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {transactionType === "income" ? "Source / Title *" : "Title *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={transactionType === "income" ? "e.g., Salary" : "e.g., Nesto Supermarket"}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (AED) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">AED</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200/80 bg-white pl-12 pr-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
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
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
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
                    placeholder="Optional details..."
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  />
                </div>
              </div>

              {/* Receipt Image upload for Expenses */}
              {transactionType === "expense" && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      Attach Receipt Image
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
                    <div className="flex items-center gap-2.5">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 cursor-pointer"
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
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" />
                          {isScanningReceipt ? "Scanning..." : "Scan Receipt (AI)"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-center cursor-pointer hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1a1a1e] transition">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Click to upload receipt
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
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer ${
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

      {/* DETAIL MODAL */}
      {detailTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-3">
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

            <div className="space-y-3">
              <div
                className={`rounded-xl p-3 text-center ${
                  detailTransaction.type === "income"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                }`}
              >
                <span className="text-xl font-extrabold">
                  {detailTransaction.type === "income" ? `+ ${formatCurrency(detailTransaction.amount)}` : `− ${formatCurrency(detailTransaction.amount)}`}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
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
                    <span className="text-slate-400 block mb-1.5 font-medium">Attached Receipt</span>
                    <img
                      src={detailTransaction.receiptUrl}
                      alt="Receipt"
                      className="h-36 w-full rounded-xl object-cover border border-slate-200 dark:border-slate-700 cursor-pointer"
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

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Transaction?</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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

      {/* ENLARGED RECEIPT MODAL */}
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
