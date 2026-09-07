import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { 
  Vault, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertTriangle, 
  Receipt, X, DollarSign, Clock, User, FileText, Printer
} from 'lucide-react';

export function ShiftRegisterModal({ isOpen, onClose, onShiftUpdated }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { activeShop } = useShop();

  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [drawerAmount, setDrawerAmount] = useState('');
  const [drawerReason, setDrawerReason] = useState('');
  const [drawerType, setDrawerType] = useState('CASH_IN'); // CASH_IN or CASH_OUT
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closedSummary, setClosedSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('status'); // status, drawer_move, close_shift, history
  const [shiftHistory, setShiftHistory] = useState([]);

  const fetchActiveShift = async () => {
    if (!activeShop?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/active?shopId=${activeShop.id}&userId=${user?.id || ''}`);
      const data = await res.json();
      setActiveShift(data);
    } catch (e) {
      console.error('Fetch active shift error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!activeShop?.id) return;
    try {
      const res = await fetch(`/api/shifts/history?shopId=${activeShop.id}`);
      const data = await res.json();
      setShiftHistory(data);
    } catch (e) {
      console.error('Fetch shift history error:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActiveShift();
      fetchHistory();
      setClosedSummary(null);
    }
  }, [isOpen, activeShop?.id]);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (!activeShop?.id) return;
    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: activeShop.id,
          user_id: user?.id || 1,
          opening_cash: parseFloat(openingFloat) || 0,
          notes: 'Shift opened from POS register'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.shift);
        setOpeningFloat('');
        if (onShiftUpdated) onShiftUpdated(data.shift);
      } else {
        alert(data.message || 'Failed to open shift');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDrawerMovement = async (e) => {
    e.preventDefault();
    if (!activeShift?.id || !drawerAmount) return;
    try {
      const res = await fetch('/api/shifts/drawer-movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: activeShift.id,
          type: drawerType,
          amount: parseFloat(drawerAmount),
          reason: drawerReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.shift);
        setDrawerAmount('');
        setDrawerReason('');
        setActiveTab('status');
      } else {
        alert(data.message || 'Error recording drawer cash movement');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!activeShift?.id) return;
    try {
      const res = await fetch(`/api/shifts/${activeShift.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closing_cash: parseFloat(countedCash) || 0,
          notes: closingNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setClosedSummary(data.shift);
        setActiveShift(null);
        if (onShiftUpdated) onShiftUpdated(null);
      } else {
        alert(data.message || 'Error closing shift');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Cash Register & Drawer (X/Z Report)</h2>
              <p className="text-[11px] text-slate-400">Manage cashier opening float, drawer movements, and day-end shift close</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Closed Summary Z-Report Receipt View */}
        {closedSummary ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold">Shift Successfully Closed (Z-Report)</h3>
            <p className="text-xs text-slate-400">Shift #{closedSummary.id} closed at {new Date(closedSummary.closed_at).toLocaleTimeString('en-IN')}</p>

            <div className={`p-4 rounded-xl border text-left font-mono text-xs space-y-2 max-w-md mx-auto ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between border-b pb-1 font-bold">
                <span>Total Register Sales:</span>
                <span>₹{(closedSummary.total_sales || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Opening Float Cash:</span>
                <span>₹{(closedSummary.opening_cash || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cash Sales:</span>
                <span>₹{(closedSummary.cash_sales || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>UPI / Digital Sales:</span>
                <span>₹{(closedSummary.upi_sales || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Card Sales:</span>
                <span>₹{(closedSummary.card_sales || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Credit (Udhar) Sales:</span>
                <span>₹{(closedSummary.credit_sales || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold text-sky-400">
                <span>Expected Drawer Cash:</span>
                <span>₹{(closedSummary.expected_cash || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Actual Counted Cash:</span>
                <span>₹{(closedSummary.closing_cash || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className={`flex justify-between border-t pt-1 font-bold ${
                closedSummary.cash_difference === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <span>Cash Discrepancy:</span>
                <span>{closedSummary.cash_difference >= 0 ? '+' : ''}₹{(closedSummary.cash_difference || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Z-Report</span>
              </button>
              <button
                onClick={() => {
                  setClosedSummary(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* If no shift is open: Open Shift Form */}
            {!activeShift ? (
              <form onSubmit={handleOpenShift} className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>No active register shift is open. Please declare your opening cash float to begin billing.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Opening Float in Drawer (₹):</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 2000"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    required
                    className={`w-full p-3 rounded-xl border text-base font-bold font-mono focus:border-brand-500 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <p className="text-[11px] text-slate-500">Enter the exact change amount in the cash drawer at shift start.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center justify-center space-x-2"
                >
                  <Vault className="w-4 h-4" />
                  <span>Open Register & Start Shift</span>
                </button>
              </form>
            ) : (
              /* Active Shift Details & Controls */
              <div>
                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-800 px-4 pt-2 gap-2 text-xs font-bold">
                  {[
                    { id: 'status', label: 'Live Shift (X-Report)' },
                    { id: 'drawer_move', label: 'Drawer Cash In/Out' },
                    { id: 'close_shift', label: 'Close Register (Z-Report)' },
                    { id: 'history', label: 'Shift History' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`pb-2.5 px-3 border-b-2 transition-all ${
                        activeTab === tab.id
                          ? 'border-brand-500 text-brand-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* TAB 1: Live Status (X-Report) */}
                  {activeTab === 'status' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="text-[11px] text-slate-400">Opening Float</div>
                          <div className="text-base font-bold font-mono text-emerald-400">₹{(activeShift.opening_cash || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="text-[11px] text-slate-400">Total Shift Sales</div>
                          <div className="text-base font-bold font-mono text-sky-400">₹{(activeShift.liveStats?.totalSales || 0).toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-500">{activeShift.liveStats?.invoiceCount || 0} Bills</div>
                        </div>
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="text-[11px] text-slate-400">Expected In Drawer</div>
                          <div className="text-base font-bold font-mono text-amber-400">₹{(activeShift.calculatedExpectedCash || 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {/* Payment Mode Breakdown */}
                      <div className={`p-4 rounded-xl border space-y-2 text-xs font-mono ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between text-slate-300 font-sans font-bold text-xs pb-1 border-b border-slate-800">
                          <span>Live Payment Mode Breakdown</span>
                          <span>Shift #{activeShift.id}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Cash Sales (Received):</span>
                          <span className="text-emerald-400 font-bold">₹{(activeShift.liveStats?.cashSales || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>UPI / QR Digital:</span>
                          <span className="text-sky-400 font-bold">₹{(activeShift.liveStats?.upiSales || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Card / POS:</span>
                          <span className="text-purple-400 font-bold">₹{(activeShift.liveStats?.cardSales || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Credit (Udhar):</span>
                          <span className="text-rose-400 font-bold">₹{(activeShift.liveStats?.creditSales || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                          <span>Drawer Cash Movements:</span>
                          <span>+₹{activeShift.drawerIn || 0} / -₹{activeShift.drawerOut || 0}</span>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2">
                        <button
                          onClick={() => setActiveTab('drawer_move')}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Add Cash In / Out</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('close_shift')}
                          className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1"
                        >
                          <Vault className="w-3.5 h-3.5" />
                          <span>Close Shift</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Drawer Cash In / Out Movement */}
                  {activeTab === 'drawer_move' && (
                    <form onSubmit={handleDrawerMovement} className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDrawerType('CASH_IN')}
                          className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold ${
                            drawerType === 'CASH_IN'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                          <span>Cash In (Add Cash)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDrawerType('CASH_OUT')}
                          className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold ${
                            drawerType === 'CASH_OUT'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          <span>Cash Out (Payout / Petty Cash)</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Amount (₹):</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="e.g. 500"
                          value={drawerAmount}
                          onChange={(e) => setDrawerAmount(e.target.value)}
                          className={`w-full p-3 rounded-xl border font-mono font-bold text-sm outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Reason / Description:</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Staff tea/refreshment, vendor cash payout, extra float change"
                          value={drawerReason}
                          onChange={(e) => setDrawerReason(e.target.value)}
                          className={`w-full p-3 rounded-xl border text-xs outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center space-x-1"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Record Cash Movement</span>
                      </button>
                    </form>
                  )}

                  {/* TAB 3: Close Shift & Z-Report */}
                  {activeTab === 'close_shift' && (
                    <form onSubmit={handleCloseShift} className="space-y-4">
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                        ⚠️ Closing the register will finalize shift totals and generate a permanent Z-Report audit entry.
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-bold text-slate-300">Counted Physical Cash in Drawer (₹):</label>
                          <span className="text-slate-400 font-mono">Expected: ₹{(activeShift.calculatedExpectedCash || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="Count and enter total cash"
                          value={countedCash}
                          onChange={(e) => setCountedCash(e.target.value)}
                          className={`w-full p-3 rounded-xl border font-mono font-bold text-base outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      {countedCash !== '' && (
                        <div className={`p-3 rounded-xl border text-xs font-mono font-bold flex justify-between ${
                          (parseFloat(countedCash) || 0) - (activeShift.calculatedExpectedCash || 0) === 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          <span>Difference / Discrepancy:</span>
                          <span>
                            {(parseFloat(countedCash) || 0) - (activeShift.calculatedExpectedCash || 0) >= 0 ? '+' : ''}
                            ₹{((parseFloat(countedCash) || 0) - (activeShift.calculatedExpectedCash || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Closing Notes / Discrepancy Reason:</label>
                        <textarea
                          rows={2}
                          placeholder="Optional notes for shift supervisor"
                          value={closingNotes}
                          onChange={(e) => setClosingNotes(e.target.value)}
                          className={`w-full p-3 rounded-xl border text-xs outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2"
                      >
                        <Vault className="w-4 h-4" />
                        <span>Confirm Shift End & Print Z-Report</span>
                      </button>
                    </form>
                  )}

                  {/* TAB 4: History */}
                  {activeTab === 'history' && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {shiftHistory.map(sh => (
                        <div key={sh.id} className={`p-3 rounded-xl border text-xs font-mono flex justify-between items-center ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div>
                            <div className="font-bold font-sans text-slate-200">Shift #{sh.id} - {sh.cashier_name}</div>
                            <div className="text-[11px] text-slate-500">{new Date(sh.opened_at).toLocaleDateString('en-IN')} {new Date(sh.opened_at).toLocaleTimeString('en-IN')}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">Sales: ₹{(sh.total_sales || 0).toLocaleString('en-IN')}</div>
                            <div className={`text-[10px] ${sh.cash_difference === 0 ? 'text-slate-400' : 'text-rose-400'}`}>
                              Diff: ₹{sh.cash_difference || 0} ({sh.status})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
