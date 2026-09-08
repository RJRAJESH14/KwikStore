import React, { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { DeliveryChallanPrint } from '../print/DeliveryChallanPrint';
import { 
  ArrowRightLeft, 
  Truck, 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Clock, 
  X, 
  Search, 
  Layers, 
  Package, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Building2
} from 'lucide-react';

export function StockTransferModal({ isOpen, onClose }) {
  const { shops, activeShop } = useShop();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('CREATE'); // 'CREATE', 'TRANSFERS_LIST'
  const [transferList, setTransferList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [fromShopId, setFromShopId] = useState(activeShop?.id || 1);
  const [toShopId, setToShopId] = useState(shops.find(s => s.id !== (activeShop?.id || 1))?.id || 2);
  const [vehicleNo, setVehicleNo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('Stock replenishment dispatch');

  // Items in Transfer
  const [availableProducts, setAvailableProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Printable Delivery Challan
  const [selectedPrintTransfer, setSelectedPrintTransfer] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableProducts();
      loadTransfers();
    }
  }, [isOpen, fromShopId]);

  const loadAvailableProducts = async () => {
    try {
      const res = await fetch(`/api/products?shopId=${fromShopId}`);
      if (res.ok) {
        const prods = await res.json();
        setAvailableProducts(prods);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock-transfers');
      if (res.ok) {
        const data = await res.json();
        setTransferList(data.transfers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (prod) => {
    const existing = selectedItems.find(it => it.product_id === prod.id);
    if (existing) {
      setSelectedItems(selectedItems.map(it => 
        it.product_id === prod.id ? { ...it, quantity: it.quantity + 1 } : it
      ));
    } else {
      setSelectedItems([...selectedItems, {
        product_id: prod.id,
        product_name: prod.name,
        barcode: prod.barcode || '',
        hsn_code: prod.hsn_code || '999999',
        unit: prod.unit || 'PCS',
        unit_cost: prod.purchase_rate || 0,
        quantity: 1
      }]);
    }
    setProductSearch('');
  };

  const handleUpdateItemQty = (prodId, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setSelectedItems(selectedItems.map(it => 
      it.product_id === prodId ? { ...it, quantity: qty } : it
    ));
  };

  const handleRemoveItem = (prodId) => {
    setSelectedItems(selectedItems.filter(it => it.product_id !== prodId));
  };

  const handleDispatchTransfer = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setError('Please add at least 1 product item to transfer.');
      return;
    }
    if (Number(fromShopId) === Number(toShopId)) {
      setError('Source and Destination branch cannot be the same shop.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_shop_id: Number(fromShopId),
          to_shop_id: Number(toShopId),
          vehicle_no: vehicleNo.trim().toUpperCase(),
          transporter_name: transporterName.trim(),
          driver_phone: driverPhone.trim(),
          notes: notes.trim(),
          items: selectedItems,
          dispatched_by: user?.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setSelectedPrintTransfer(data.transfer);
        setSelectedItems([]);
        setVehicleNo('');
        setTransporterName('');
        setDriverPhone('');
        loadTransfers();
      } else {
        setError(data.message || 'Failed to dispatch transfer.');
      }
    } catch (e) {
      setError('Network error creating stock transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveTransfer = async (transferId) => {
    if (!confirm('Confirm receiving this stock transfer? Stock quantities will be automatically added to the receiving branch catalog.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/stock-transfers/${transferId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        loadTransfers();
      } else {
        setError(data.message || 'Failed to mark transfer as received.');
      }
    } catch (e) {
      setError('Network error updating received transfer.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = productSearch.trim()
    ? availableProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase())) ||
        (p.barcode && p.barcode.includes(productSearch))
      )
    : [];

  const totalTransferValue = selectedItems.reduce((acc, it) => acc + (it.quantity * it.unit_cost), 0);
  const totalTransferQty = selectedItems.reduce((acc, it) => acc + it.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`border rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh] ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* Modal Top Bar */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-indigo-50 border-indigo-200/60'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Inter-Branch Stock Transfers & Delivery Challan</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                  GST Rule 55 Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispatch goods safely between store locations with automatic inventory balance sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => { setActiveTab('CREATE'); setError(null); setSuccessMsg(null); }}
            className={`px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'CREATE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Stock Transfer</span>
          </button>

          <button
            onClick={() => { setActiveTab('TRANSFERS_LIST'); setError(null); setSuccessMsg(null); loadTransfers(); }}
            className={`px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'TRANSFERS_LIST'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Transfer History & Inward Receiving ({transferList.length})</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: CREATE TRANSFER FORM */}
          {activeTab === 'CREATE' && (
            <form onSubmit={handleDispatchTransfer} className="space-y-4">
              
              {/* Branch Selector Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Dispatching Branch (From) *
                  </label>
                  <select
                    value={fromShopId}
                    onChange={(e) => {
                      setFromShopId(Number(e.target.value));
                      setSelectedItems([]);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        🏢 {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Receiving Branch (To) *
                  </label>
                  <select
                    value={toShopId}
                    onChange={(e) => setToShopId(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {shops.filter(s => s.id !== fromShopId).map((s) => (
                      <option key={s.id} value={s.id}>
                        🏬 {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Search & Line Items */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Select Items to Transfer
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Type product name or scan barcode from source branch..."
                      className="w-full bg-transparent text-xs focus:outline-none"
                    />
                  </div>

                  {filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                      {filteredProducts.slice(0, 8).map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddItem(prod)}
                          className="p-2.5 hover:bg-indigo-500/10 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold">{prod.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">({prod.barcode || 'No-Barcode'})</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-emerald-500 font-bold">Stock: {prod.current_stock} {prod.unit}</span>
                            <span className="text-slate-400 ml-2">₹{prod.purchase_rate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                {selectedItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                    Search and add products above to create delivery challan items.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Product Name</th>
                          <th className="p-2.5 font-mono">HSN</th>
                          <th className="p-2.5 text-right">Transfer Qty</th>
                          <th className="p-2.5 text-right">Unit Cost</th>
                          <th className="p-2.5 text-right">Total Cost</th>
                          <th className="p-2.5 text-center">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                        {selectedItems.map((it) => (
                          <tr key={it.product_id}>
                            <td className="p-2.5 font-sans font-semibold">{it.product_name}</td>
                            <td className="p-2.5 text-slate-400">{it.hsn_code}</td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => handleUpdateItemQty(it.product_id, e.target.value)}
                                className="w-20 px-2 py-1 rounded border text-right font-mono font-bold bg-transparent border-slate-300 dark:border-slate-700"
                              />
                            </td>
                            <td className="p-2.5 text-right">₹{it.unit_cost.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-indigo-400">
                              ₹{(it.quantity * it.unit_cost).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.product_id)}
                                className="text-rose-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-200 dark:border-slate-800">
                        <tr>
                          <td colSpan="2" className="p-2.5 text-right uppercase text-[10px] text-slate-400">Consignment Summary:</td>
                          <td className="p-2.5 text-right font-mono font-black">{totalTransferQty} Units</td>
                          <td></td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-400">₹{totalTransferValue.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Transit & Vehicle Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    placeholder="e.g. OD02AB1234"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Transporter / Carrier (Optional)
                  </label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="e.g. Internal Store Van"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Driver Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="9876543210"
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || selectedItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Truck className="w-4 h-4" />
                  <span>{loading ? 'Dispatching...' : 'Dispatch & Generate Delivery Challan'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: TRANSFERS LIST & RECEIVING */}
          {activeTab === 'TRANSFERS_LIST' && (
            <div className="space-y-4">
              {transferList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No stock transfers recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 uppercase text-[10px] text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Challan #</th>
                        <th className="p-3">From Branch</th>
                        <th className="p-3">To Branch</th>
                        <th className="p-3 text-right">Items & Qty</th>
                        <th className="p-3 text-right">Value</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {transferList.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-500/5">
                          <td className="p-3 font-bold text-indigo-400">{tr.transfer_number}</td>
                          <td className="p-3 font-sans font-semibold">{tr.from_shop_name}</td>
                          <td className="p-3 font-sans font-semibold">{tr.to_shop_name}</td>
                          <td className="p-3 text-right">
                            <span className="font-bold">{tr.total_qty}</span> ({tr.total_items} items)
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-400">₹{Number(tr.total_value || 0).toFixed(2)}</td>
                          <td className="p-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tr.status === 'RECEIVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {tr.status}
                            </span>
                          </td>
                          <td className="p-3 text-center font-sans">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={async () => {
                                  const res = await fetch(`/api/stock-transfers/${tr.id}`);
                                  const data = await res.json();
                                  if (data.transfer) setSelectedPrintTransfer(data.transfer);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1"
                                title="Print Delivery Challan"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Challan</span>
                              </button>

                              {tr.status === 'DISPATCHED' && (
                                <button
                                  onClick={() => handleReceiveTransfer(tr.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                                  title="Receive Goods into Destination Shop"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Receive</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Printable Delivery Challan Modal */}
      {selectedPrintTransfer && (
        <DeliveryChallanPrint
          transfer={selectedPrintTransfer}
          onClose={() => setSelectedPrintTransfer(null)}
        />
      )}

    </div>
  );
}
