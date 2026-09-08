import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { 
  AlertTriangle, 
  Clock, 
  Send, 
  Printer, 
  RefreshCw, 
  X, 
  Package, 
  TrendingDown, 
  AlertCircle, 
  Calendar, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight,
  Phone,
  Layers,
  Sparkles
} from 'lucide-react';

export function StockAlertsModal({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const { activeShop } = useShop();

  const [activeTab, setActiveTab] = useState('OUT_OF_STOCK'); // 'OUT_OF_STOCK', 'LOW_STOCK', 'EXPIRED', 'EXPIRING_SOON'
  const [alertsData, setAlertsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expirySubFilter, setExpirySubFilter] = useState('30'); // '15', '30', '60', '90'

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen, activeShop]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/alerts?shopId=${activeShop?.id || 1}`);
      const data = await res.json();
      if (data.success) {
        setAlertsData(data);
      }
    } catch (e) {
      console.error('Failed to load inventory alerts', e);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppReorder = (item, supplierPhone, supplierName) => {
    const phone = (supplierPhone || item.supplier_phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const storeName = activeShop?.name || 'Our Retail Store';

    const text = `*PURCHASE REORDER REQUEST*\n` +
      `--------------------------------\n` +
      `From: *${storeName}*\n` +
      `Item: *${item.name || item.product_name}*\n` +
      `Barcode: ${item.barcode || 'N/A'}\n` +
      `Current Stock: *${item.current_stock || item.stock_qty || 0} ${item.unit || 'Units'}*\n` +
      `Suggested Reorder Qty: *${item.suggested_reorder_qty || (item.min_stock_alert ? item.min_stock_alert * 3 : 10)} ${item.unit || 'Units'}*\n` +
      `--------------------------------\n` +
      `Please confirm stock availability and dispatch estimate. Thank you!`;

    const encoded = encodeURIComponent(text);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const handleWhatsAppSupplierGroupReorder = (group) => {
    const phone = (group.supplierPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const storeName = activeShop?.name || 'Our Store';

    let itemListStr = group.items.map((it, idx) => 
      `${idx + 1}. *${it.name}* (Barcode: ${it.barcode || 'N/A'}) - Qty: *${it.suggested_reorder_qty} ${it.unit || 'Units'}*`
    ).join('\n');

    const text = `*PURCHASE ORDER REORDER REQUEST*\n` +
      `--------------------------------\n` +
      `From: *${storeName}*\n` +
      `To Supplier: *${group.supplierName}*\n\n` +
      `Please dispatch the following replenishment items:\n` +
      `${itemListStr}\n\n` +
      `Total Estimated Cost: ₹${group.totalEstimatedCost.toFixed(2)}\n` +
      `--------------------------------\n` +
      `Kindly confirm dispatch schedule. Thank you!`;

    const encoded = encodeURIComponent(text);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const handlePrintReorderSheet = () => {
    window.print();
  };

  if (!isOpen) return null;

  const outOfStockItems = alertsData?.criticalOutOfStock || [];
  const lowStockItems = alertsData?.lowStockItems || [];
  const expiredItems = alertsData?.expiry?.expired || [];
  
  let expiringSoonItems = [];
  if (expirySubFilter === '15') expiringSoonItems = alertsData?.expiry?.within15Days || [];
  else if (expirySubFilter === '30') expiringSoonItems = alertsData?.expiry?.within30Days || [];
  else if (expirySubFilter === '60') expiringSoonItems = alertsData?.expiry?.within60Days || [];
  else if (expirySubFilter === '90') expiringSoonItems = alertsData?.expiry?.within90Days || [];

  const totalAlerts = (outOfStockItems.length + lowStockItems.length + expiredItems.length + (alertsData?.expiry?.within30Days?.length || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh] ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* Top Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-rose-50 border-rose-200/60'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Stock Replenishment & Expiry Alert Center</h3>
                {totalAlerts > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                    {totalAlerts} Critical Alerts
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeShop?.name || 'Main Store'} • Realtime 0-Stock, Threshold Triggers & Expiry Batches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReorderSheet}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PO Sheet</span>
            </button>
            <button
              onClick={loadAlerts}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('OUT_OF_STOCK')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'OUT_OF_STOCK'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span>🚨 Out of Stock (0 Units)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-950/50 text-white text-[10px]">
              {outOfStockItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LOW_STOCK')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'LOW_STOCK'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span>⚠️ Low Stock Alerts</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-950/50 text-white text-[10px]">
              {lowStockItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('EXPIRED')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'EXPIRED'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span>⛔ Expired Stock</span>
            <span className="px-1.5 py-0.2 rounded-full bg-red-950/50 text-white text-[10px]">
              {expiredItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('EXPIRING_SOON')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'EXPIRING_SOON'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span>⏳ Expiring Soon (30/60/90 Days)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-950/50 text-white text-[10px]">
              {(alertsData?.expiry?.within30Days?.length || 0) + (alertsData?.expiry?.within60Days?.length || 0)}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
              <span>Scanning inventory catalog & batch expiry dates...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OUT OF STOCK (0 UNITS) */}
              {activeTab === 'OUT_OF_STOCK' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Products that are completely sold out and need urgent replenishment</span>
                    <span className="font-bold text-rose-500 font-mono">{outOfStockItems.length} items</span>
                  </div>

                  {outOfStockItems.length === 0 ? (
                    <div className="py-12 text-center text-xs text-emerald-500 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                      <span className="font-bold">No 0-Stock Items! Your inventory is fully stocked.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-950 font-bold uppercase text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Product / Barcode</th>
                            <th className="p-3">Category</th>
                            <th className="p-3 text-right">Current Stock</th>
                            <th className="p-3 text-right">Min Threshold</th>
                            <th className="p-3 text-right">Suggested Reorder</th>
                            <th className="p-3">Supplier</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                          {outOfStockItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-500/5">
                              <td className="p-3 font-sans">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.barcode || 'NO-BARCODE'}</div>
                              </td>
                              <td className="p-3 text-slate-400 font-sans">{item.category_name || 'General'}</td>
                              <td className="p-3 text-right font-black text-rose-500 text-sm">
                                0 {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-right text-slate-400">
                                {item.min_stock_alert || 5} {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-500">
                                {item.suggested_reorder_qty || 15} {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-slate-300 font-sans text-xs">
                                <div>{item.supplier_name || 'Direct / Local'}</div>
                                {item.supplier_phone && <div className="text-[10px] text-slate-500 font-mono">{item.supplier_phone}</div>}
                              </td>
                              <td className="p-3 text-center font-sans">
                                <button
                                  onClick={() => handleWhatsAppReorder(item, item.supplier_phone, item.supplier_name)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition active:scale-95"
                                  title="1-Click WhatsApp Reorder"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Reorder</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LOW STOCK ALERTS */}
              {activeTab === 'LOW_STOCK' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Products below minimum reorder alert threshold</span>
                    <span className="font-bold text-amber-500 font-mono">{lowStockItems.length} items</span>
                  </div>

                  {lowStockItems.length === 0 ? (
                    <div className="py-12 text-center text-xs text-emerald-500 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                      <span className="font-bold">All products are above minimum stock thresholds.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-950 font-bold uppercase text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Product / Barcode</th>
                            <th className="p-3">Category</th>
                            <th className="p-3 text-right">Current Stock</th>
                            <th className="p-3 text-right">Min Threshold</th>
                            <th className="p-3 text-right">Suggested Reorder</th>
                            <th className="p-3">Supplier</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                          {lowStockItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-500/5">
                              <td className="p-3 font-sans">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.barcode || 'NO-BARCODE'}</div>
                              </td>
                              <td className="p-3 text-slate-400 font-sans">{item.category_name || 'General'}</td>
                              <td className="p-3 text-right font-black text-amber-500 text-sm">
                                {item.current_stock} {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-right text-slate-400">
                                {item.min_stock_alert} {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-500">
                                {item.suggested_reorder_qty} {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-slate-300 font-sans text-xs">
                                <div>{item.supplier_name || 'Direct / Local'}</div>
                                {item.supplier_phone && <div className="text-[10px] text-slate-500 font-mono">{item.supplier_phone}</div>}
                              </td>
                              <td className="p-3 text-center font-sans">
                                <button
                                  onClick={() => handleWhatsAppReorder(item, item.supplier_phone, item.supplier_name)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition active:scale-95"
                                  title="1-Click WhatsApp Reorder"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Reorder</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Supplier-Grouped Bulk WhatsApp Purchase Orders */}
                  {(alertsData?.supplierGroups || []).length > 0 && (
                    <div className="pt-4 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-brand-500" />
                        Bulk Supplier Purchase Orders (Grouped by Vendor)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {alertsData.supplierGroups.map((grp, idx) => (
                          <div key={idx} className={`p-4 rounded-2xl border space-y-2.5 ${
                            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{grp.supplierName}</span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-bold">
                                {grp.items.length} Items
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Estimated Procurement Cost: <span className="font-mono font-bold text-slate-200">₹{grp.totalEstimatedCost.toFixed(2)}</span>
                            </div>
                            <button
                              onClick={() => handleWhatsAppSupplierGroupReorder(grp)}
                              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition active:scale-95"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>WhatsApp Bulk PO to {grp.supplierName}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EXPIRED STOCK */}
              {activeTab === 'EXPIRED' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Products that have passed their expiry date and should be removed from shelves</span>
                    <span className="font-bold text-red-500 font-mono">{expiredItems.length} expired batches</span>
                  </div>

                  {expiredItems.length === 0 ? (
                    <div className="py-12 text-center text-xs text-emerald-500 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                      <span className="font-bold">Zero expired products found in active stock!</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-red-500/30">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-red-500/10 font-bold uppercase text-[10px] text-red-400 border-b border-red-500/30">
                          <tr>
                            <th className="p-3">Product / Batch</th>
                            <th className="p-3">Expiry Date</th>
                            <th className="p-3 text-right">Expired Days Ago</th>
                            <th className="p-3 text-right">Remaining Stock</th>
                            <th className="p-3 text-right">Estimated Loss</th>
                            <th className="p-3">Supplier Return Info</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                          {expiredItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-red-500/5 bg-red-500/5">
                              <td className="p-3 font-sans">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{item.product_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Batch: {item.batch_no || 'DEFAULT'}</div>
                              </td>
                              <td className="p-3 text-red-400 font-bold">{item.expiry_date}</td>
                              <td className="p-3 text-right font-black text-red-500">
                                {Math.abs(item.daysToExpiry)} days ago
                              </td>
                              <td className="p-3 text-right font-bold text-slate-200">
                                {item.stock_qty} {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-right font-bold text-red-400">
                                ₹{((item.stock_qty || 0) * (item.purchase_rate || 0)).toFixed(2)}
                              </td>
                              <td className="p-3 text-slate-300 font-sans text-xs">
                                <div>{item.supplier_name || 'Direct'}</div>
                                {item.supplier_phone && <div className="text-[10px] text-slate-500 font-mono">{item.supplier_phone}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: EXPIRING SOON (30/60/90 DAYS) */}
              {activeTab === 'EXPIRING_SOON' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Time Horizon:</span>
                      {['15', '30', '60', '90'].map((d) => (
                        <button
                          key={d}
                          onClick={() => setExpirySubFilter(d)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                            expirySubFilter === d
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Within {d} Days
                        </button>
                      ))}
                    </div>

                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {expiringSoonItems.length} items found
                    </span>
                  </div>

                  {expiringSoonItems.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-slate-500/5 rounded-2xl border border-slate-800">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <span>No items expiring within the next {expirySubFilter} days.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-950 font-bold uppercase text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Product / Batch</th>
                            <th className="p-3">Expiry Date</th>
                            <th className="p-3 text-right">Days Left</th>
                            <th className="p-3 text-right">Current Stock</th>
                            <th className="p-3 text-right">Retail Value</th>
                            <th className="p-3">Supplier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                          {expiringSoonItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-500/5">
                              <td className="p-3 font-sans">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{item.product_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Batch: {item.batch_no || 'DEFAULT'}</div>
                              </td>
                              <td className="p-3 text-amber-400 font-bold">{item.expiry_date}</td>
                              <td className="p-3 text-right font-black text-amber-500">
                                {item.daysToExpiry} days
                              </td>
                              <td className="p-3 text-right font-bold text-slate-200">
                                {item.stock_qty} {item.unit || 'NOS'}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-400">
                                ₹{((item.stock_qty || 0) * (item.selling_rate || item.mrp || 0)).toFixed(2)}
                              </td>
                              <td className="p-3 text-slate-300 font-sans text-xs">
                                <div>{item.supplier_name || 'Direct'}</div>
                                {item.supplier_phone && <div className="text-[10px] text-slate-500 font-mono">{item.supplier_phone}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>

      </div>
    </div>
  );
}
