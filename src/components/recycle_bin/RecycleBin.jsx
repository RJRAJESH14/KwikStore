import React, { useState, useEffect, useMemo } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Trash2,
  RotateCcw,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  Package,
  UserCheck,
  Truck,
  TrendingDown,
  Receipt,
  CheckCircle,
  Eye,
  X,
  ShieldAlert,
  Info,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';

export function RecycleBin() {
  const { activeShop } = useShop();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, expiringSoon: 0, byType: {} });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal States
  const [inspectItem, setInspectItem] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState(null); // 'RESTORE', 'DELETE_PERM', 'EMPTY_ALL'
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const typeConfig = {
    ALL: { label: 'All Items', icon: Layers, color: 'text-slate-400', badgeBg: 'bg-slate-500/10' },
    INVOICE: { label: 'Invoices & Bills', icon: Receipt, color: 'text-sky-400', badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    CUSTOMER: { label: 'Customers & Khata', icon: Users, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    PRODUCT: { label: 'Products & Inventory', icon: Package, color: 'text-amber-400', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    EMPLOYEE: { label: 'Employees & HRMS', icon: UserCheck, color: 'text-purple-400', badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    SUPPLIER: { label: 'Suppliers & Vendors', icon: Truck, color: 'text-indigo-400', badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
    EXPENSE: { label: 'Store Expenses', icon: TrendingDown, color: 'text-rose-400', badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    QUOTATION: { label: 'Quotations & Estimates', icon: FileText, color: 'text-cyan-400', badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' }
  };

  useEffect(() => {
    loadRecycleBin();
    loadStats();
  }, [activeShop, selectedType, search]);

  const loadRecycleBin = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeShop?.id) params.append('shopId', activeShop.id);
      if (selectedType !== 'ALL') params.append('itemType', selectedType);
      if (search) params.append('search', search);

      const res = await fetch(`/api/recycle-bin?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error('Error fetching recycle bin:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/recycle-bin/stats?shopId=${activeShop?.id || 1}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Inspect data snapshot
  const handleInspect = async (item) => {
    setInspectLoading(true);
    try {
      const res = await fetch(`/api/recycle-bin/${item.id}`);
      if (res.ok) {
        const fullItem = await res.json();
        setInspectItem(fullItem);
      } else {
        setInspectItem(item);
      }
    } catch (e) {
      setInspectItem(item);
    } finally {
      setInspectLoading(false);
    }
  };

  // Restore 1-Click
  const handleRestore = async (id) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/recycle-bin/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Item restored successfully!');
        setActionItem(null);
        setActionType(null);
        setInspectItem(null);
        loadRecycleBin();
        loadStats();
      } else {
        alert(data.message || 'Error restoring item.');
      }
    } catch (e) {
      alert('Network error restoring item.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete Permanently
  const handlePermanentDelete = async (id) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/recycle-bin/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Item permanently purged.');
        setActionItem(null);
        setActionType(null);
        setInspectItem(null);
        loadRecycleBin();
        loadStats();
      } else {
        alert(data.message || 'Error deleting item.');
      }
    } catch (e) {
      alert('Network error deleting item.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty Entire Recycle Bin
  const handleEmptyAll = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/recycle-bin/empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: activeShop?.id || 1 })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Recycle Bin emptied!');
        setActionType(null);
        loadRecycleBin();
        loadStats();
      } else {
        alert(data.message || 'Error emptying bin.');
      }
    } catch (e) {
      alert('Network error emptying bin.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 animate-bounce text-xs font-bold">
          <CheckCircle className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className={`p-4 border-b shrink-0 flex flex-wrap justify-between items-center gap-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black tracking-tight">Recycle Bin & Data Recovery Vault</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                30-Day Auto Retention
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Restore any deleted invoices, customers, products, employees, or expenses with 1-click back to their original destination.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              loadRecycleBin();
              loadStats();
            }}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
            title="Refresh Recycle Bin"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {stats.total > 0 && (
            <button
              onClick={() => setActionType('EMPTY_ALL')}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-500 text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Recycle Bin</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Counters Bar */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b shrink-0 ${
        isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'
      }`}>
        <div className={`p-3 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Deleted in Bin</div>
            <div className="text-lg font-black font-mono mt-0.5 text-sky-500">{stats.total}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-3 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Expiring Soon (&lt; 7 Days)</div>
            <div className={`text-lg font-black font-mono mt-0.5 ${stats.expiringSoon > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              {stats.expiringSoon}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-3 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Bills & Customers</div>
            <div className="text-lg font-black font-mono mt-0.5 text-emerald-500">
              {(stats.byType['INVOICE'] || 0) + (stats.byType['CUSTOMER'] || 0)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        <div className={`p-3 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Products & HRMS</div>
            <div className="text-lg font-black font-mono mt-0.5 text-purple-500">
              {(stats.byType['PRODUCT'] || 0) + (stats.byType['EMPLOYEE'] || 0)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <Package className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className={`p-3 border-b space-y-2 shrink-0 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Search Engine */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted items by title, name, phone, invoice number..."
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-rose-500 ${
              isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 overflow-x-auto pb-1">
          {Object.entries(typeConfig).map(([typeKey, cfg]) => {
            const Icon = cfg.icon;
            const count = typeKey === 'ALL' ? stats.total : (stats.byType[typeKey] || 0);
            const isSelected = selectedType === typeKey;

            return (
              <button
                key={typeKey}
                onClick={() => setSelectedType(typeKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-all ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                    : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-500/15 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Items List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto opacity-75" />
            <div className="text-xs text-slate-400 font-semibold">Scanning 30-Day Recycle Bin...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-500/10 text-slate-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="text-sm font-bold">Recycle Bin is Empty</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || selectedType !== 'ALL'
                ? 'No deleted items matching your search or category filter.'
                : 'No items currently deleted in your store. When items are removed, they will be safely kept here for 30 days.'}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const cfg = typeConfig[item.item_type] || typeConfig['ALL'];
            const Icon = cfg.icon;
            const daysLeft = item.days_left !== undefined ? item.days_left : 30;
            const isCritical = daysLeft <= 5;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-md'
                }`}
              >
                {/* Left Metadata & Info */}
                <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${cfg.badgeBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-xs truncate" title={item.title}>
                        {item.title}
                      </h3>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-semibold ${cfg.badgeBg}`}>
                        {item.item_type}
                      </span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-bold flex items-center space-x-1 ${
                        isCritical
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
                      </span>
                    </div>

                    {item.subtitle && (
                      <p className="text-xs text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                      <span>Deleted: <strong>{item.deleted_at?.slice(0, 19)}</strong></span>
                      <span>•</span>
                      <span>By: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.deleted_by_name || 'Admin'}</strong></span>
                      <span>•</span>
                      <span>Auto-Purge on: <strong className="text-rose-400">{item.expires_at?.slice(0, 10)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  {/* Inspect Details */}
                  <button
                    onClick={() => handleInspect(item)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Preview item snapshot"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>Inspect</span>
                  </button>

                  {/* 1-Click Restore */}
                  <button
                    onClick={() => {
                      setActionItem(item);
                      setActionType('RESTORE');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  {/* Permanent Delete */}
                  <button
                    onClick={() => {
                      setActionItem(item);
                      setActionType('DELETE_PERM');
                    }}
                    className={`p-1.5 rounded-xl border transition-all ${
                      isDark ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-rose-300 text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Inspect Item Details */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-xs overflow-hidden max-h-[85vh] flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-500/20">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Snapshot Archive: {inspectItem.title}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Type: {inspectItem.item_type} • ID: #{inspectItem.original_id} • Auto-Purge: {inspectItem.expires_at?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Snapshot JSON / Structured Data Display */}
            <div className="flex-1 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
              <pre className="whitespace-pre-wrap word-break-all">
                {JSON.stringify(inspectItem.data || inspectItem, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-500/20">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = inspectItem.id;
                  handleRestore(id);
                }}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Restoring...' : 'Restore to Active Store'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Action Confirmation (Restore, Delete Permanent, Empty All) */}
      {actionType && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {actionType === 'RESTORE' && actionItem && (
              <>
                <div className="flex items-center space-x-3 text-emerald-500">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-500">Restore to Original Destination?</h3>
                    <p className="text-slate-400 text-[11px]">The record will be restored back to your store.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                  <div className="text-xs font-bold text-white">{actionItem.title}</div>
                  <div className="text-[11px] text-slate-400">{actionItem.subtitle}</div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-500/20">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestore(actionItem.id)}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Restoring...' : 'Yes, Restore'}</span>
                  </button>
                </div>
              </>
            )}

            {actionType === 'DELETE_PERM' && actionItem && (
              <>
                <div className="flex items-center space-x-3 text-rose-500">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-500">Permanently Delete Item?</h3>
                    <p className="text-slate-400 text-[11px]">This item will be permanently erased now.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                  <div className="text-xs font-bold text-white">{actionItem.title}</div>
                  <div className="text-[11px] text-slate-400">{actionItem.subtitle}</div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-500/20">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(actionItem.id)}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
                  </button>
                </div>
              </>
            )}

            {actionType === 'EMPTY_ALL' && (
              <>
                <div className="flex items-center space-x-3 text-rose-500">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-500">Empty Entire Recycle Bin?</h3>
                    <p className="text-slate-400 text-[11px]">All {stats.total} items in the bin will be permanently erased.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to purge all deleted records? This action cannot be reversed.
                </p>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-500/20">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEmptyAll}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Purging...' : 'Yes, Empty Recycle Bin'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
