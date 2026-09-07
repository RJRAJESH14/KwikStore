import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { 
  AlertTriangle, Clock, Calendar, CheckCircle2, 
  Tag, ArrowRight, ShieldAlert, Package, RefreshCw, Filter
} from 'lucide-react';

export function ExpiryTracker({ onOpenProductEdit }) {
  const { isDark } = useTheme();
  const { activeShop } = useShop();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL, EXPIRED, CRITICAL_15, EXPIRING_30, EXPIRING_60, EXPIRING_90

  const fetchExpiryData = async () => {
    if (!activeShop?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/expiry-analysis?shopId=${activeShop.id}`);
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error('Fetch expiry analysis error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryData();
  }, [activeShop?.id]);

  const getFilteredItems = () => {
    if (!analysis) return [];
    if (selectedFilter === 'EXPIRED') return analysis.expired || [];
    if (selectedFilter === 'CRITICAL_15') return analysis.within15Days || [];
    if (selectedFilter === 'EXPIRING_30') return analysis.within30Days || [];
    if (selectedFilter === 'EXPIRING_60') return analysis.within60Days || [];
    if (selectedFilter === 'EXPIRING_90') return analysis.within90Days || [];
    return [
      ...(analysis.expired || []),
      ...(analysis.within15Days || []),
      ...(analysis.within30Days || []),
      ...(analysis.within60Days || []),
      ...(analysis.within90Days || [])
    ];
  };

  const items = getFilteredItems();

  return (
    <div className="space-y-4">
      {/* Top Warning Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'EXPIRED', label: 'Expired Items', count: analysis?.summary?.expiredCount || 0, color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
          { id: 'CRITICAL_15', label: 'Expiring in 15 Days', count: analysis?.summary?.within15Count || 0, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
          { id: 'EXPIRING_30', label: 'Expiring in 30 Days', count: analysis?.summary?.within30Count || 0, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
          { id: 'EXPIRING_60', label: 'Expiring in 60 Days', count: analysis?.summary?.within60Count || 0, color: 'text-sky-500 bg-sky-500/10 border-sky-500/30' },
          { id: 'EXPIRING_90', label: 'Expiring in 90 Days', count: analysis?.summary?.within90Count || 0, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' }
        ].map(card => (
          <button
            key={card.id}
            onClick={() => setSelectedFilter(selectedFilter === card.id ? 'ALL' : card.id)}
            className={`p-3 rounded-2xl border text-left transition-all ${card.color} ${
              selectedFilter === card.id ? 'ring-2 ring-brand-500 scale-[1.02]' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{card.label}</div>
            <div className="text-xl font-black font-mono mt-0.5">{card.count}</div>
          </button>
        ))}
      </div>

      {/* Expiry Items List */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-3.5 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold">
              {selectedFilter === 'ALL' ? 'All Tracked Expiring Batches' : `Showing: ${selectedFilter.replace('_', ' ')}`}
            </span>
            <span className="text-xs text-slate-400 font-mono">({items.length} records)</span>
          </div>
          <button
            onClick={fetchExpiryData}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Refresh expiry data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Batch #</th>
                <th className="p-3">Expiry Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Stock Left</th>
                <th className="p-3">Supplier / Vendor</th>
                <th className="p-3 text-right">Stock Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-3 font-sans">
                    <div className="font-bold text-slate-200">{it.product_name}</div>
                    <div className="text-[10px] text-slate-500">{it.barcode || 'No barcode'}</div>
                  </td>
                  <td className="p-3 text-slate-300">{it.batch_no || 'DEFAULT'}</td>
                  <td className="p-3 text-amber-400 font-bold">
                    {new Date(it.expiry_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="p-3 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      it.daysToExpiry < 0
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : it.daysToExpiry <= 15
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {it.daysToExpiry < 0 ? `EXPIRED (${Math.abs(it.daysToExpiry)}d ago)` : `In ${it.daysToExpiry} days`}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-200">{it.stock_qty} {it.unit || 'PCS'}</td>
                  <td className="p-3 font-sans text-slate-400">{it.supplier_name || 'Direct Vendor'}</td>
                  <td className="p-3 text-right font-bold text-slate-300">
                    ₹{((it.stock_qty || 0) * (it.purchase_rate || it.selling_rate || 0)).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    {loading ? 'Analyzing product expiry dates...' : 'No expiring stock found matching the selected filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
