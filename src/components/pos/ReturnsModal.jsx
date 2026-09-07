import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { 
  RotateCcw, Search, CheckCircle2, AlertCircle, 
  Receipt, X, DollarSign, ArrowRight, ShieldCheck, Printer
} from 'lucide-react';

export function ReturnsModal({ isOpen, onClose, onCreditNoteCreated }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { activeShop } = useShop();

  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [foundInvoice, setFoundInvoice] = useState(null);
  const [returnItems, setReturnItems] = useState({}); // { itemId: { returnQty: 1, restock: true, reason: '' } }
  const [refundMode, setRefundMode] = useState('CREDIT_NOTE'); // CREDIT_NOTE or CASH_REFUND
  const [generalReason, setGeneralReason] = useState('Customer Return');
  const [createdNote, setCreatedNote] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const searchInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceSearchQuery.trim()) return;
    setLoadingInvoice(true);
    setFoundInvoice(null);
    setReturnItems({});
    try {
      const res = await fetch(`/api/invoices?search=${encodeURIComponent(invoiceSearchQuery.trim())}&shopId=${activeShop?.id || 1}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.invoices || []);
      const exact = list.find(i => 
        String(i.invoice_number).toLowerCase() === invoiceSearchQuery.trim().toLowerCase() ||
        String(i.id) === invoiceSearchQuery.trim()
      ) || list[0];

      if (exact) {
        // Fetch full invoice with line items
        const fullRes = await fetch(`/api/invoices/${exact.id}`);
        const fullData = await fullRes.json();
        setFoundInvoice(fullData);
      } else {
        alert('No invoice found matching "' + invoiceSearchQuery + '"');
      }
    } catch (err) {
      alert('Error searching invoice: ' + err.message);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleQtyChange = (itemId, val, maxQty) => {
    const qty = Math.min(maxQty, Math.max(0, parseFloat(val) || 0));
    setReturnItems(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { restock: true, reason: '' }),
        returnQty: qty
      }
    }));
  };

  const toggleRestock = (itemId) => {
    setReturnItems(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { returnQty: 0, reason: '' }),
        restock: !prev[itemId]?.restock
      }
    }));
  };

  // Calculate total refund amount
  const calculateTotalRefund = () => {
    if (!foundInvoice?.items) return 0;
    return foundInvoice.items.reduce((sum, item) => {
      const rQty = returnItems[item.id]?.returnQty || 0;
      const unitPrice = item.unit_price || 0;
      return sum + (rQty * unitPrice);
    }, 0);
  };

  const totalRefund = calculateTotalRefund();

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!foundInvoice || totalRefund <= 0) {
      alert('Please select at least 1 item quantity to return.');
      return;
    }

    const payloadItems = foundInvoice.items
      .filter(it => (returnItems[it.id]?.returnQty || 0) > 0)
      .map(it => ({
        product_id: it.product_id,
        item_name: it.item_name,
        quantity: returnItems[it.id].returnQty,
        unit_price: it.unit_price,
        return_amount: returnItems[it.id].returnQty * it.unit_price,
        restock: returnItems[it.id].restock !== false
      }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: activeShop?.id || 1,
          original_invoice_id: foundInvoice.id,
          original_invoice_number: foundInvoice.invoice_number,
          customer_id: foundInvoice.customer_id,
          customer_name: foundInvoice.customer_name || 'Walk-in Customer',
          customer_phone: foundInvoice.customer_phone || '',
          refund_mode: refundMode,
          items: payloadItems,
          reason: generalReason,
          created_by_user_id: user?.id || 1
        })
      });
      const data = await res.json();
      if (data.success && data.creditNote) {
        setCreatedNote(data.creditNote);
        if (onCreditNoteCreated) onCreditNoteCreated(data.creditNote);
      } else {
        alert(data.message || 'Failed to generate credit note');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Product Return & Store Credit Note</h2>
              <p className="text-[11px] text-slate-400">Process item returns, restock inventory, and issue reusable Credit Notes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Generated Note View */}
        {createdNote ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold">Credit Note Successfully Issued!</h3>
            
            <div className={`p-5 rounded-2xl border text-center space-y-2 max-w-sm mx-auto ${
              isDark ? 'bg-slate-950 border-purple-500/30' : 'bg-purple-50 border-purple-200'
            }`}>
              <div className="text-[11px] text-purple-400 font-bold uppercase tracking-wider">Credit Voucher Code</div>
              <div className="text-xl font-mono font-black text-purple-400 tracking-wider select-all">{createdNote.credit_note_no}</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">₹{(createdNote.total_refund_amount || 0).toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-slate-400">Customer: {createdNote.customer_name} ({createdNote.status})</p>
            </div>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Credit Note Slip</span>
              </button>
              <button
                onClick={() => {
                  setCreatedNote(null);
                  setFoundInvoice(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Search Original Invoice */}
            <form onSubmit={searchInvoice} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Enter Invoice # (e.g. INV-2026-0001) or Scan Bill Barcode"
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none focus:border-purple-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={loadingInvoice}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1"
              >
                <span>{loadingInvoice ? 'Searching...' : 'Find Bill'}</span>
              </button>
            </form>

            {/* Found Invoice Items & Quantities */}
            {foundInvoice && (
              <form onSubmit={handleSubmitReturn} className="space-y-4">
                <div className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="font-bold">{foundInvoice.invoice_number}</span>
                    <span className="text-slate-400 ml-2">({new Date(foundInvoice.invoice_date).toLocaleDateString('en-IN')})</span>
                    <div className="text-[11px] text-slate-400">Customer: {foundInvoice.customer_name} • Paid: ₹{foundInvoice.grand_total}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">{foundInvoice.payment_status}</span>
                  </div>
                </div>

                {/* Items Return Table */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Items to Return</div>
                  {(foundInvoice.items || []).map(item => {
                    const currentReturnQty = returnItems[item.id]?.returnQty || 0;
                    return (
                      <div key={item.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        currentReturnQty > 0 ? 'border-purple-500/50 bg-purple-500/5' : isDark ? 'border-slate-800' : 'border-slate-200'
                      }`}>
                        <div className="flex-1 pr-2">
                          <div className="font-bold text-slate-200">{item.item_name}</div>
                          <div className="text-[11px] text-slate-400">Original Qty: {item.quantity} {item.unit} @ ₹{item.unit_price}</div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <label className="text-[11px] text-slate-400">Return Qty:</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              step="1"
                              value={currentReturnQty}
                              onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)}
                              className={`w-14 p-1 rounded border text-center font-mono font-bold text-xs ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                              }`}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleRestock(item.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border ${
                              returnItems[item.id]?.restock !== false
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {returnItems[item.id]?.restock !== false ? 'Restock Stock' : 'Damaged / No Restock'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Refund Mode Selection */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRefundMode('CREDIT_NOTE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 ${
                      refundMode === 'CREDIT_NOTE'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Issue Store Credit Note (Voucher)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMode('CASH_REFUND')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 ${
                      refundMode === 'CASH_REFUND'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Instant Cash Refund</span>
                  </button>
                </div>

                {/* Total Refund Summary & Submit */}
                <div className={`p-3 rounded-xl border flex items-center justify-between font-mono font-bold text-sm ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-400 font-sans text-xs">Total Refund Amount:</span>
                  <span className="text-purple-400 text-base">₹{totalRefund.toLocaleString('en-IN')}</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || totalRefund <= 0}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Processing Return...' : `Confirm Return & Issue ₹${totalRefund}`}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
