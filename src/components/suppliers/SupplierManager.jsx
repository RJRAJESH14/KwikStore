import React, { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { DataTablePagination } from '../common/DataTablePagination';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  CreditCard, 
  FileText, 
  Save, 
  X, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Package, 
  AlertCircle,
  Clock,
  ArrowUpRight,
  Landmark,
  UserCheck
} from 'lucide-react';

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }
];

const initialSupplierForm = {
  id: null,
  shop_id: 1,
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  gstin: '',
  address: '',
  city: '',
  state: 'Delhi',
  state_code: '07',
  pincode: '',
  bank_name: '',
  bank_account_no: '',
  bank_ifsc: '',
  upi_id: '',
  payment_terms: 'NET_30', // NET_7, NET_15, NET_30, NET_60, COD, ADVANCE
  current_balance: 0,
  notes: ''
};

export function SupplierManager() {
  const { activeShop } = useShop();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const isOwner = Boolean(user && (user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'owner' || user.roleId === 1));

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [form, setForm] = useState(initialSupplierForm);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (activeShop) {
      loadSuppliers();
    }
  }, [activeShop, search]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers?shopId=${activeShop.id}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setForm({
      ...initialSupplierForm,
      shop_id: activeShop?.id || 1,
      state: activeShop?.state || 'Delhi',
      state_code: activeShop?.state_code || '07'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setForm({
      ...initialSupplierForm,
      ...supplier,
      current_balance: supplier.current_balance || 0
    });
    setIsModalOpen(true);
  };

  const openViewModal = async (supplier) => {
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`);
      if (res.ok) {
        const fullData = await res.json();
        setViewingSupplier(fullData);
      } else {
        setViewingSupplier(supplier);
      }
    } catch (e) {
      setViewingSupplier(supplier);
    }
  };

  const handleStateChange = (e) => {
    const selectedStateName = e.target.value;
    const foundState = INDIAN_STATES.find(s => s.name === selectedStateName);
    setForm(prev => ({
      ...prev,
      state: selectedStateName,
      state_code: foundState ? foundState.code : prev.state_code
    }));
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter supplier company / trade name');
      return;
    }
    if (!form.phone.trim()) {
      alert('Please enter supplier contact phone number');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        shop_id: activeShop.id,
        phone: form.phone.trim(),
        gstin: form.gstin.trim().toUpperCase()
      };

      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: form.id ? `Supplier "${form.name}" updated successfully!` : `Supplier "${form.name}" created successfully!`
        });
        setIsModalOpen(false);
        loadSuppliers();
      } else {
        alert(data.message || 'Error saving supplier details.');
      }
    } catch (err) {
      alert('Network error saving supplier.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    if (!confirm(`Are you sure you want to delete supplier "${supplier.name}"? Products linked to this supplier will be unlinked.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Supplier "${supplier.name}" deleted successfully.` });
        loadSuppliers();
      } else {
        alert(data.message || 'Could not delete supplier.');
      }
    } catch (e) {
      alert('Network error deleting supplier.');
    }
  };

  // Export Suppliers to CSV
  const exportSuppliersCsv = () => {
    if (suppliers.length === 0) {
      alert('No suppliers to export.');
      return;
    }

    const headers = [
      'Supplier ID',
      'Company Name',
      'Contact Person',
      'Phone',
      'Email',
      'GSTIN',
      'City',
      'State',
      'Payment Terms',
      'Outstanding Payable (INR)',
      'Products Sourced',
      'Bank Name',
      'Account No',
      'IFSC',
      'UPI ID'
    ];

    const rows = suppliers.map(s => [
      s.id,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.contact_person || '').replace(/"/g, '""')}"`,
      `"${s.phone || ''}"`,
      `"${s.email || ''}"`,
      `"${s.gstin || ''}"`,
      `"${s.city || ''}"`,
      `"${s.state || ''}"`,
      `"${s.payment_terms || 'NET_30'}"`,
      (s.current_balance || 0).toFixed(2),
      s.products_count || 0,
      `"${s.bank_name || ''}"`,
      `"${s.bank_account_no || ''}"`,
      `"${s.bank_ifsc || ''}"`,
      `"${s.upi_id || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KwikStore_Suppliers_${activeShop?.name || 'Shop'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Calculations
  const totalSuppliersCount = suppliers.length;
  const totalOutstandingPayable = suppliers.reduce((sum, s) => sum + (parseFloat(s.current_balance) || 0), 0);
  const totalProductsSourced = suppliers.reduce((sum, s) => sum + (parseInt(s.products_count, 10) || 0), 0);

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Header */}
      <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Suppliers & Vendor Management
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Manage product vendors, distributor contacts, purchase payables (Dena Khata), and banking details for {activeShop?.name}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportSuppliersCsv}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm'
            }`}
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="p-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Suppliers</div>
            <div className={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {totalSuppliersCount} Vendors
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active Procurement Partners</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400">Outstanding Payables</div>
            <div className="text-2xl font-black text-rose-500 mt-1 font-mono">
              ₹{totalOutstandingPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Purchase Dena Khata to Clear</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Products Sourced</div>
            <div className={`text-2xl font-black mt-1 font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {totalProductsSourced} Items
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Linked in Inventory Catalog</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 pt-3 flex flex-col space-y-4">
        {/* Notification Alert */}
        {notification && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className={`p-3 rounded-2xl border flex items-center justify-between gap-4 shrink-0 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Company, Contact Person, Phone, GSTIN, City..."
              className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-indigo-500 ${
                isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{suppliers.length}</strong> suppliers
          </div>
        </div>

        {/* Suppliers Table Container */}
        <div className={`flex-1 overflow-hidden border rounded-2xl flex flex-col ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className={`sticky top-0 z-10 border-b uppercase text-[10px] font-bold tracking-wider ${
                isDark ? 'bg-slate-800/95 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Supplier / Company</th>
                  <th className="py-3 px-4">Contact Person & Phone</th>
                  <th className="py-3 px-4">GSTIN & Location</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-center">Items Sourced</th>
                  <th className="py-3 px-4 text-right">Payable Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      Loading suppliers list...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-bold text-slate-400">No suppliers found</p>
                      <p className="text-xs text-slate-500 mt-1">Add your distributor and vendor details to link them to inventory items.</p>
                      <button
                        onClick={openAddModal}
                        className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-md"
                      >
                        + Add First Supplier
                      </button>
                    </td>
                  </tr>
                ) : (
                  (pageSize === 'ALL' ? suppliers : suppliers.slice((currentPage - 1) * Number(pageSize), (currentPage - 1) * Number(pageSize) + Number(pageSize))).map((s) => (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Supplier / Company */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>{s.name}</span>
                        </div>
                        {s.email && (
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{s.email}</span>
                          </div>
                        )}
                        {s.bank_name && (
                          <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono mt-0.5">
                            Bank: {s.bank_name} {s.bank_account_no ? `(..${s.bank_account_no.slice(-4)})` : ''}
                          </div>
                        )}
                      </td>

                      {/* Contact Person & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {s.contact_person || 'Direct Contact'}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                          <a
                            href={`tel:${s.phone}`}
                            className="font-mono text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center space-x-1"
                            title="Click to Call"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{s.phone}</span>
                          </a>
                        </div>
                      </td>

                      {/* GSTIN & Location */}
                      <td className="py-3 px-4">
                        {s.gstin ? (
                          <span className="font-mono font-bold text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            {s.gstin}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unregistered</span>
                        )}
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate max-w-[180px]">
                            {[s.city, s.state].filter(Boolean).join(', ') || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Payment Terms */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          s.payment_terms === 'ADVANCE' || s.payment_terms === 'COD'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                        }`}>
                          {s.payment_terms?.replace('_', ' ') || 'NET 30'}
                        </span>
                        {s.upi_id && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono mt-1">
                            UPI: {s.upi_id}
                          </div>
                        )}
                      </td>

                      {/* Items Sourced */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openViewModal(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                            s.products_count > 0
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                          }`}
                          title="Click to view products supplied by this vendor"
                        >
                          {s.products_count || 0} Items
                        </button>
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3 px-4 text-right">
                        <div className={`font-mono font-bold text-sm ${
                          (s.current_balance || 0) > 0 ? 'text-rose-500' : 'text-slate-400'
                        }`}>
                          ₹{(s.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {(s.current_balance || 0) > 0 && (
                          <span className="text-[10px] text-rose-500 font-semibold block">Dena Khata</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openViewModal(s)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title="View Supplier Profile & Products"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditModal(s)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title="Edit Supplier Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {isOwner && (
                            <button
                              onClick={() => handleDeleteSupplier(s)}
                              className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/20 transition-all"
                              title="Delete Supplier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Page Navigation Footer */}
          <DataTablePagination
            totalRecords={suppliers.length}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            recordLabel="Suppliers"
          />
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {form.id ? 'Edit Supplier Profile' : 'Add New Product Supplier / Vendor'}
                  </h3>
                  <p className="text-xs text-slate-400">Save distributor details to assign while adding inventory products</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSupplier} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Company & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Supplier Company / Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Parle Agro Distributors"
                    className={`w-full border rounded-xl p-2.5 outline-none font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact Person / Sales Executive
                  </label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Primary Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="sales@parle-distributor.com"
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* GSTIN & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Supplier GSTIN (15-Digits)
                  </label>
                  <input
                    type="text"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                    placeholder="07AAAAA0000A1Z5"
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono font-bold uppercase ${
                      isDark ? 'bg-slate-950 border-slate-800 text-emerald-400 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-emerald-700 focus:border-indigo-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Credit Payment Terms
                  </label>
                  <select
                    value={form.payment_terms}
                    onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="NET_7">Net 7 Days Credit</option>
                    <option value="NET_15">Net 15 Days Credit</option>
                    <option value="NET_30">Net 30 Days Credit (Standard)</option>
                    <option value="NET_60">Net 60 Days Credit</option>
                    <option value="COD">Cash On Delivery (COD)</option>
                    <option value="ADVANCE">100% Advance Payment</option>
                  </select>
                </div>
              </div>

              {/* Address, City, State */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Supplier Godown / Office Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Plot 42, Industrial Area, Phase 2"
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="New Delhi"
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    State
                  </label>
                  <select
                    value={form.state}
                    onChange={handleStateChange}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {INDIAN_STATES.map(st => (
                      <option key={st.code} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    placeholder="110020"
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Bank & Settlement Details */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="font-bold text-indigo-500 flex items-center space-x-1.5">
                  <Landmark className="w-4 h-4" />
                  <span>Supplier Bank & UPI Payment Details (For Settlements)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      placeholder="e.g. State Bank of India"
                      className={`w-full border rounded-xl p-2 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={form.bank_account_no}
                      onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                      placeholder="38920192837"
                      className={`w-full border rounded-xl p-2 outline-none font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={form.bank_ifsc}
                      onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })}
                      placeholder="SBIN0001234"
                      className={`w-full border rounded-xl p-2 outline-none font-mono uppercase ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 mb-1">UPI VPA ID</label>
                    <input
                      type="text"
                      value={form.upi_id}
                      onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                      placeholder="parledistributor@okhdfcbank"
                      className={`w-full border rounded-xl p-2 outline-none font-mono text-purple-600 dark:text-purple-400 ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Opening Payable Balance (₹ Dena Khata)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.current_balance}
                      onChange={(e) => setForm({ ...form, current_balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className={`w-full border rounded-xl p-2 outline-none font-mono font-bold text-rose-500 ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Internal Supplier Notes & Delivery Timings
                </label>
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Delivers every Tuesday and Friday morning. Minimum order value ₹10,000 for free delivery."
                  className={`w-full border rounded-xl p-2.5 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : (form.id ? 'Update Supplier' : 'Save Supplier')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Supplier Details Modal */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {viewingSupplier.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewingSupplier.contact_person ? `${viewingSupplier.contact_person} • ` : ''}{viewingSupplier.phone}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingSupplier(null)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">GSTIN</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-emerald-400 text-xs mt-0.5">
                    {viewingSupplier.gstin || 'Unregistered'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Payment Terms</span>
                  <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                    {viewingSupplier.payment_terms?.replace('_', ' ') || 'NET 30'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Payable Dena Khata</span>
                  <div className="font-mono font-bold text-rose-500 text-sm mt-0.5">
                    ₹{(viewingSupplier.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Location</span>
                  <div className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                    {[viewingSupplier.city, viewingSupplier.state].filter(Boolean).join(', ') || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Banking & UPI Card */}
              {(viewingSupplier.bank_name || viewingSupplier.upi_id) && (
                <div className={`p-4 rounded-xl border space-y-1.5 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Landmark className="w-4 h-4 text-indigo-500" />
                    <span>Bank & UPI Settlement Coordinates</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                    {viewingSupplier.bank_name && <div>Bank: <strong>{viewingSupplier.bank_name}</strong></div>}
                    {viewingSupplier.bank_account_no && <div>A/C: <strong className="font-mono">{viewingSupplier.bank_account_no}</strong></div>}
                    {viewingSupplier.bank_ifsc && <div>IFSC: <strong className="font-mono">{viewingSupplier.bank_ifsc}</strong></div>}
                    {viewingSupplier.upi_id && <div>UPI: <strong className="font-mono text-purple-500">{viewingSupplier.upi_id}</strong></div>}
                  </div>
                </div>
              )}

              {/* Products Supplied by this Vendor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-emerald-500" />
                    <span>Products Supplied by {viewingSupplier.name} ({viewingSupplier.products?.length || 0})</span>
                  </h4>
                </div>

                {viewingSupplier.products && viewingSupplier.products.length > 0 ? (
                  <div className="border rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[10px] uppercase font-bold ${
                        isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <tr>
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-3">Barcode</th>
                          <th className="py-2 px-3 text-center">Stock</th>
                          <th className="py-2 px-3 text-right">Purchase Rate</th>
                          <th className="py-2 px-3 text-right">Retail Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {viewingSupplier.products.map(p => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{p.barcode || 'N/A'}</td>
                            <td className="py-2 px-3 text-center font-bold font-mono text-emerald-500">{p.current_stock} {p.unit}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{p.purchase_rate?.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-brand-600 dark:text-brand-400">₹{p.retail_rate?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center border rounded-xl text-slate-400">
                    No products currently assigned to this supplier.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end space-x-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                onClick={() => {
                  const s = viewingSupplier;
                  setViewingSupplier(null);
                  openEditModal(s);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Supplier Profile</span>
              </button>
              <button
                onClick={() => setViewingSupplier(null)}
                className={`px-4 py-2 rounded-xl font-semibold text-xs ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplierManager;
