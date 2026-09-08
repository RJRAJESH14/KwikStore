import React, { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { StockTransferModal } from './StockTransferModal';
import { 
  Building2, 
  Plus, 
  ArrowRightLeft, 
  Store, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Mail,
  FileText,
  Boxes,
  Edit3,
  Trash2,
  QrCode,
  Landmark,
  X
} from 'lucide-react';

export function MultiShopManager() {
  const { shops, activeShop, fetchShops, switchShop } = useShop();
  const { isDark } = useTheme();

  const [transfers, setTransfers] = useState([]);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [editBranchData, setEditBranchData] = useState(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Add Branch Form
  const [branchForm, setBranchForm] = useState({
    name: '',
    legal_name: '',
    shop_type: 'GENERAL_RETAIL',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Delhi',
    state_code: '07',
    pincode: '',
    gstin: '',
    upi_id: '',
    upi_name: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    invoice_prefix: 'BR',
    thermal_footer_note: 'Thank you for shopping with us!',
    terms_conditions: 'Goods once sold cannot be returned without bill.'
  });

  // Stock Transfer Form
  const [transferForm, setTransferForm] = useState({
    from_shop_id: activeShop ? activeShop.id : 1,
    to_shop_id: 2,
    product_name: 'Parle-G Gold Glucose Biscuits',
    quantity: 20,
    notes: 'Urgent weekend inventory replenishment'
  });

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const res = await fetch('/api/shops/transfers/list');
      if (res.ok) setTransfers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm)
      });
      const data = await res.json();
      if (data.success) {
        setIsAddBranchOpen(false);
        setBranchForm({
          name: '',
          legal_name: '',
          shop_type: 'GENERAL_RETAIL',
          phone: '',
          email: '',
          address: '',
          city: '',
          state: 'Delhi',
          state_code: '07',
          pincode: '',
          gstin: '',
          upi_id: '',
          upi_name: '',
          bank_name: '',
          bank_account_no: '',
          bank_ifsc: '',
          invoice_prefix: 'BR',
          thermal_footer_note: 'Thank you for shopping with us!',
          terms_conditions: 'Goods once sold cannot be returned without bill.'
        });
        setNotification({ type: 'success', message: 'New shop branch added successfully!' });
        fetchShops();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error creating branch.');
    }
  };

  const openEditBranch = (shop) => {
    setEditBranchData({
      id: shop.id,
      name: shop.name,
      legal_name: shop.legal_name || '',
      shop_type: shop.shop_type || 'GENERAL_RETAIL',
      phone: shop.phone || '',
      email: shop.email || '',
      address: shop.address || '',
      city: shop.city || '',
      state: shop.state || 'Delhi',
      state_code: shop.state_code || '07',
      pincode: shop.pincode || '',
      gstin: shop.gstin || '',
      upi_id: shop.upi_id || '',
      upi_name: shop.upi_name || '',
      bank_name: shop.bank_name || '',
      bank_account_no: shop.bank_account_no || '',
      bank_ifsc: shop.bank_ifsc || '',
      invoice_prefix: shop.invoice_prefix || 'INV',
      thermal_footer_note: shop.thermal_footer_note || 'Thank you for shopping with us!',
      terms_conditions: shop.terms_conditions || 'Goods once sold cannot be returned without bill.'
    });
  };

  const handleSaveEditBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editBranchData)
      });
      const data = await res.json();
      if (data.success) {
        setEditBranchData(null);
        setNotification({ type: 'success', message: `Shop branch "${editBranchData.name}" details updated successfully!` });
        fetchShops();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error updating branch details.');
    }
  };

  const handleDeleteBranch = async (shop) => {
    if (shops.length <= 1) {
      alert('Cannot delete the only remaining shop branch.');
      return;
    }

    if (!confirm(`Are you sure you want to delete and remove the branch "${shop.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/shops/${shop.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        if (activeShop && activeShop.id === shop.id) {
          const remaining = shops.filter(s => s.id !== shop.id);
          if (remaining.length > 0) switchShop(remaining[0].id);
        }
        fetchShops();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error deleting branch.');
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shops/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_shop_id: transferForm.from_shop_id,
          to_shop_id: transferForm.to_shop_id,
          items: [{ name: transferForm.product_name, quantity: transferForm.quantity }],
          notes: transferForm.notes
        })
      });
      if (res.ok) {
        setIsTransferOpen(false);
        setNotification({ type: 'success', message: 'Inter-branch stock transfer executed successfully!' });
        loadTransfers();
      }
    } catch (err) {
      alert('Error recording transfer.');
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Multi-Shop Toolbar */}
      <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Multi-Shop & Branch Management</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              {shops.length} Active Stores
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Shop owners have full rights to <strong>Add</strong>, <strong>Edit</strong>, <strong>Delete / Remove</strong> shop branches, edit GSTIN / UPI / bank details, and execute stock transfers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsTransferOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            <span>Transfer Stock</span>
          </button>

          <button
            onClick={() => setIsAddBranchOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Branch</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Notification Banner */}
        {notification && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Branches Grid */}
        <div>
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Store Branches ({shops.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.map((shop) => {
              const isCurrent = activeShop && activeShop.id === shop.id;

              return (
                <div key={shop.id} className={`p-5 rounded-2xl border shadow-lg space-y-3 transition-all ${
                  isCurrent
                    ? isDark ? 'bg-slate-900 border-indigo-500/50 ring-1 ring-indigo-500/30' : 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                    : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                        <Store className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{shop.name}</h3>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Active Branch
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{shop.legal_name || 'KwikStore Outlet'}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border ${
                      isDark ? 'bg-slate-800 text-indigo-300 border-slate-700' : 'bg-slate-100 text-indigo-700 border-slate-300'
                    }`}>
                      {shop.shop_type}
                    </span>
                  </div>

                  <div className={`text-xs space-y-1.5 pt-2 border-t ${
                    isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{shop.address || 'Address not set'}, {shop.city}, {shop.state} - {shop.pincode}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{shop.phone}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[11px] pt-1">
                      <span>GSTIN: <strong className="text-brand-600 dark:text-brand-400">{shop.gstin || 'Unregistered'}</strong></span>
                      <span>Prefix: <strong>{shop.invoice_prefix}</strong></span>
                    </div>
                    {shop.upi_id && (
                      <div className="flex items-center space-x-1.5 font-mono text-[11px] text-purple-600 dark:text-purple-400">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>UPI: {shop.upi_id}</span>
                      </div>
                    )}
                  </div>

                  {/* Owner Action Buttons for Shop Details */}
                  <div className={`pt-3 border-t flex items-center justify-between ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    {!isCurrent ? (
                      <button
                        onClick={() => switchShop(shop.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        }`}
                      >
                        Switch to this Branch
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-500 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selected Store</span>
                      </span>
                    )}

                    <div className="flex items-center space-x-2">
                      {/* Edit Branch Button */}
                      <button
                        onClick={() => openEditBranch(shop)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-sky-600'
                        }`}
                        title="Edit Shop Branch Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>

                      {/* Delete Branch Button */}
                      {shops.length > 1 && (
                        <button
                          onClick={() => handleDeleteBranch(shop)}
                          className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold flex items-center space-x-1 transition-all"
                          title="Delete / Remove this branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inter-Branch Transfer History */}
        <div>
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Inter-Branch Stock Transfers</h2>
          <div className={`border rounded-xl overflow-hidden shadow-lg ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
          }`}>
            <table className="w-full text-left text-xs">
              <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">From Branch</th>
                  <th className="py-3 px-4">To Branch</th>
                  <th className="py-3 px-4">Items / Qty</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-slate-400 font-sans text-xs">
                      No stock transfers recorded yet. Click "Transfer Stock" to transfer items.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.transfer_number}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans">{t.from_shop_name}</td>
                      <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-sans font-bold">{t.to_shop_name}</td>
                      <td className={`py-3 px-4 font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.items_json}</td>
                      <td className="py-3 px-4 text-slate-400">{t.transfer_date?.slice(0, 16)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Branch Modal */}
      {editBranchData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sky-500" />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Edit Shop Branch Details & GSTIN
                </h3>
              </div>
              <button onClick={() => setEditBranchData(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditBranch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Branch Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editBranchData.name}
                    onChange={(e) => setEditBranchData({ ...editBranchData, name: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Legal Registered Name</label>
                  <input
                    type="text"
                    value={editBranchData.legal_name}
                    onChange={(e) => setEditBranchData({ ...editBranchData, legal_name: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Shop Type / Sector</label>
                  <select
                    value={editBranchData.shop_type}
                    onChange={(e) => setEditBranchData({ ...editBranchData, shop_type: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="GENERAL_RETAIL">General Retail</option>
                    <option value="FMCG_WHOLESALE">FMCG & Food Distributor</option>
                    <option value="SUPERMARKET">Supermarket / Grocery</option>
                    <option value="GARMENTS">Garments & Apparel</option>
                    <option value="PHARMACY">Pharmacy & Medical</option>
                    <option value="ELECTRONICS">Electronics & Mobile (IMEI)</option>
                    <option value="HARDWARE">Hardware & Sanitary</option>
                    <option value="BAKERY">Bakery & Sweets</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editBranchData.phone}
                    onChange={(e) => setEditBranchData({ ...editBranchData, phone: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Email Address</label>
                  <input
                    type="email"
                    value={editBranchData.email}
                    onChange={(e) => setEditBranchData({ ...editBranchData, email: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Shop Address</label>
                <input
                  type="text"
                  value={editBranchData.address}
                  onChange={(e) => setEditBranchData({ ...editBranchData, address: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="Plot/Shop No, Street, Market Area"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>City</label>
                  <input
                    type="text"
                    value={editBranchData.city}
                    onChange={(e) => setEditBranchData({ ...editBranchData, city: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>State</label>
                  <input
                    type="text"
                    value={editBranchData.state}
                    onChange={(e) => setEditBranchData({ ...editBranchData, state: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>State Code</label>
                  <input
                    type="text"
                    value={editBranchData.state_code}
                    onChange={(e) => setEditBranchData({ ...editBranchData, state_code: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="07"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pincode</label>
                  <input
                    type="text"
                    value={editBranchData.pincode}
                    onChange={(e) => setEditBranchData({ ...editBranchData, pincode: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* GSTIN & Tax Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>GSTIN Number</label>
                  <input
                    type="text"
                    value={editBranchData.gstin}
                    onChange={(e) => setEditBranchData({ ...editBranchData, gstin: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="07AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Invoice Bill Prefix</label>
                  <input
                    type="text"
                    value={editBranchData.invoice_prefix}
                    onChange={(e) => setEditBranchData({ ...editBranchData, invoice_prefix: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="KS-DEL"
                  />
                </div>
              </div>

              {/* UPI & Bank Account Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>UPI ID (for Dynamic QR Payment)</label>
                  <input
                    type="text"
                    value={editBranchData.upi_id}
                    onChange={(e) => setEditBranchData({ ...editBranchData, upi_id: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="shopname@okhdfcbank"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Bank IFSC Code</label>
                  <input
                    type="text"
                    value={editBranchData.bank_ifsc}
                    onChange={(e) => setEditBranchData({ ...editBranchData, bank_ifsc: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="HDFC0001234"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBranchData(null)}
                  className={`px-3 py-1.5 rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow"
                >
                  Save Branch Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700">
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Create New Shop Branch</h3>
              <button onClick={() => setIsAddBranchOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Branch Name *</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. KwikStore South Hub"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Phone *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>City *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={branchForm.gstin}
                    onChange={(e) => setBranchForm({ ...branchForm, gstin: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="07AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Bill Prefix</label>
                  <input
                    type="text"
                    value={branchForm.invoice_prefix}
                    onChange={(e) => setBranchForm({ ...branchForm, invoice_prefix: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="BR"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsAddBranchOpen(false)} className={`px-3 py-1.5 rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow">
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inter-Branch Stock Transfers & Delivery Challan Modal */}
      <StockTransferModal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          loadTransfers();
        }}
      />
    </div>
  );
}
