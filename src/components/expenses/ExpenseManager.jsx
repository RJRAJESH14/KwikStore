import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { 
  Receipt, Plus, Trash2, Search, Filter, Calendar, 
  TrendingDown, DollarSign, PieChart, Download, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';

export function ExpenseManager() {
  const { isDark } = useTheme();
  const { user, hasPermission } = useAuth();
  const { activeShop } = useShop();

  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categorySummary, setCategorySummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'STAFF_WELFARE',
    expense_title: '',
    amount: '',
    payment_mode: 'CASH',
    expense_date: new Date().toISOString().split('T')[0],
    paid_to: '',
    notes: ''
  });

  const categories = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'STAFF_WELFARE', label: 'Staff Welfare & Refreshments' },
    { id: 'TEA_SNACKS', label: 'Tea & Daily Snacks' },
    { id: 'RENT', label: 'Shop Rent' },
    { id: 'ELECTRICITY', label: 'Electricity & Utility Bills' },
    { id: 'TRANSPORT', label: 'Transport & Freight' },
    { id: 'REPAIR_MAINTENANCE', label: 'Repairs & Maintenance' },
    { id: 'MARKETING', label: 'Marketing & Printing' },
    { id: 'MISCELLANEOUS', label: 'Miscellaneous Operational' }
  ];

  const fetchExpenses = async () => {
    if (!activeShop?.id) return;
    setLoading(true);
    try {
      let url = `/api/expenses?shopId=${activeShop.id}`;
      if (selectedCategory && selectedCategory !== 'ALL') url += `&category=${selectedCategory}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalAmount(data.totalAmount || 0);
      setCategorySummary(data.categorySummary || {});
    } catch (e) {
      console.error('Fetch expenses error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeShop?.id, selectedCategory, dateFrom, dateTo]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!activeShop?.id) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          shop_id: activeShop.id,
          created_by_user_id: user?.id || 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setFormData({
          category: 'STAFF_WELFARE',
          expense_title: '',
          amount: '',
          payment_mode: 'CASH',
          expense_date: new Date().toISOString().split('T')[0],
          paid_to: '',
          notes: ''
        });
        fetchExpenses();
      } else {
        alert(data.message || 'Failed to save expense');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchExpenses();
      } else {
        alert(data.message || 'Error deleting expense');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Store Expense & Petty Cash Manager</h1>
              <p className="text-xs text-slate-400">Track daily operational costs, vendor payouts, staff tea, and shop utility bills</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Expense</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Recorded Expenses</div>
          <div className="text-2xl font-black font-mono text-rose-500 mt-1">₹{totalAmount.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{expenses.length} Expense Transactions</div>
        </div>

        <div className={`p-4 rounded-2xl border sm:col-span-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Expense Category Breakdown</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categorySummary).map(([cat, amt]) => (
              <span key={cat} className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs font-bold">
                {cat.replace(/_/g, ' ')}: ₹{amt.toLocaleString('en-IN')}
              </span>
            ))}
            {Object.keys(categorySummary).length === 0 && (
              <span className="text-xs text-slate-500">No category breakdown data available.</span>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, paid to, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchExpenses()}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs outline-none ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
          <button
            onClick={fetchExpenses}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
          >
            Filter
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`p-1.5 rounded-xl border text-xs outline-none ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={`p-1.5 rounded-xl border text-xs outline-none ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={`p-1.5 rounded-xl border text-xs outline-none ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Expense List Table */}
      <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Expense Details</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Paid To</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5">Created By</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
              {expenses.map((exp) => (
                <tr key={exp.id} className={isDark ? 'hover:bg-slate-800/40 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                  <td className={`p-3.5 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {new Date(exp.expense_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="p-3.5 font-sans">
                    <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{exp.expense_title}</div>
                    {exp.notes && <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{exp.notes}</div>}
                  </td>
                  <td className="p-3.5 font-sans">
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                      {exp.category?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`p-3.5 font-sans ${isDark ? 'text-slate-300' : 'text-slate-800 font-medium'}`}>
                    {exp.paid_to || '-'}
                  </td>
                  <td className="p-3.5 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {exp.payment_mode}
                    </span>
                  </td>
                  <td className={`p-3.5 font-sans ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {exp.created_by_name || 'Staff'}
                  </td>
                  <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400 text-sm">
                    ₹{(exp.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    {loading ? 'Loading expenses...' : 'No store expense records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-rose-500" />
                <span>Add Store Operational Expense</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Expense Title / Item:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Staff Tea & Biscuits, Shop Light Repair, Garbage Cleaning"
                  value={formData.expense_title}
                  onChange={(e) => setFormData({ ...formData, expense_title: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Category:</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {categories.filter(c => c.id !== 'ALL').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Amount (₹):</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="e.g. 250"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-mono font-bold text-sm outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Payment Mode:</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="CASH">Cash (Petty Cash Drawer)</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NetBanking</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Expense Date:</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Paid To (Person / Vendor):</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Tea Stall, Electrician Suresh, Landlord"
                  value={formData.paid_to}
                  onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Notes / Remarks:</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or receipt number"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
