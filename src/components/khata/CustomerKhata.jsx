import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { CustomerStatementPrint } from '../print/CustomerStatementPrint';
import { A4TaxInvoice } from '../print/A4TaxInvoice';
import { ThermalReceipt } from '../print/ThermalReceipt';
import { openWhatsAppInvoice } from '../../utils/whatsappUtils';
import { 
  Users, 
  Search, 
  Plus, 
  CreditCard, 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Download,
  Calendar,
  Filter,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  Building,
  Phone,
  ArrowRight,
  ChevronDown,
  Eye,
  Receipt,
  ShoppingBag,
  Tag,
  ExternalLink,
  Edit3,
  Trash2,
  UserCheck,
  MapPin,
  Mail,
  PhoneCall,
  ShieldCheck,
  AlertOctagon,
  Info,
  X,
  User,
  Save,
  RefreshCw
} from 'lucide-react';

export function CustomerKhata() {
  const { activeShop } = useShop();
  const { isDark } = useTheme();

  // Customer List States
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('ALL'); // ALL, RETAIL, WHOLESALE
  const [selectedCust, setSelectedCust] = useState(null);

  // View Customer Profile Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [customerToView, setCustomerToView] = useState(null);

  // Edit Customer Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Customer Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeletingCust, setIsDeletingCust] = useState(false);

  // Customer Khata Sub-tab Switcher
  const [activeKhataTab, setActiveKhataTab] = useState('ledger'); // 'ledger' or 'invoices'

  // Customer Ledger States & Search Engine
  const [custLedger, setCustLedger] = useState([]);
  const [custInvoices, setCustInvoices] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // 1-Click Invoice Viewer State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printFormat, setPrintFormat] = useState('A4'); // 'A4' or 'THERMAL'

  // Invoice Tab Filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL'); // 'ALL', 'PAID', 'CREDIT', 'PARTIAL'

  // Date Range & Transaction Filter Engine
  const [datePreset, setDatePreset] = useState('ALL_TIME'); // ALL_TIME, TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER, THIS_FINANCIAL_YEAR, LAST_YEAR, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionType, setTransactionType] = useState('ALL'); // ALL, INVOICE, PAYMENT_RECEIVED, OPENING_BALANCE
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCustOpen, setIsAddCustOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');

  // Add Customer Form
  const [newCust, setNewCust] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    credit_limit: 25000,
    opening_balance: 0,
    route_beat: '',
    customer_type: 'RETAIL'
  });

  // Format Helper: Date to YYYY-MM-DD
  const formatDateToYMD = (d) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Preset Date Engine
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();

    if (preset === 'TODAY') {
      const todayStr = formatDateToYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 6);
      setStartDate(formatDateToYMD(past7));
      setEndDate(formatDateToYMD(today));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDateToYMD(firstDay));
      setEndDate(formatDateToYMD(today));
    } else if (preset === 'THIS_QUARTER') {
      const currentMonth = today.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const firstDay = new Date(today.getFullYear(), quarterStartMonth, 1);
      setStartDate(formatDateToYMD(firstDay));
      setEndDate(formatDateToYMD(today));
    } else if (preset === 'THIS_FINANCIAL_YEAR') {
      // Indian Financial Year: April 1 to March 31
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed (April is 3)
      const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const firstDay = new Date(startYear, 3, 1); // 1st April
      const lastDay = new Date(startYear + 1, 2, 31); // 31st March
      setStartDate(formatDateToYMD(firstDay));
      setEndDate(formatDateToYMD(lastDay > today ? today : lastDay));
    } else if (preset === 'LAST_YEAR') {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const startYear = currentMonth >= 3 ? currentYear - 1 : currentYear - 2;
      const firstDay = new Date(startYear, 3, 1);
      const lastDay = new Date(startYear + 1, 2, 31);
      setStartDate(formatDateToYMD(firstDay));
      setEndDate(formatDateToYMD(lastDay));
    } else if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Load customer list
  useEffect(() => {
    if (activeShop) loadCustomers();
  }, [activeShop, search]);

  // Load customer ledger whenever selection or filters change
  useEffect(() => {
    if (selectedCust) {
      loadCustomerLedger(selectedCust.id);
    }
  }, [selectedCust, startDate, endDate, transactionType, ledgerSearch]);

  const loadCustomers = async () => {
    try {
      const res = await fetch(`/api/customers?shopId=${activeShop.id}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        if (data.length > 0 && !selectedCust) {
          setSelectedCust(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  const loadCustomerLedger = async (customerId) => {
    setLoadingLedger(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('dateFrom', startDate);
      if (endDate) queryParams.append('dateTo', endDate);
      if (transactionType && transactionType !== 'ALL') queryParams.append('transactionType', transactionType);
      if (ledgerSearch) queryParams.append('search', ledgerSearch);

      const res = await fetch(`/api/customers/${customerId}/ledger?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustLedger(data.ledger || []);
        setCustInvoices(data.invoices || []);
        setLedgerSummary(data.summary || null);
        if (data.customer) {
          setSelectedCust(prev => ({ ...prev, ...data.customer }));
        }
      }
    } catch (e) {
      console.error('Error fetching ledger:', e);
    } finally {
      setLoadingLedger(false);
    }
  };

  // 1-Click View Invoice Handler (Loads full invoice with items, GST tax, payment details)
  const handleViewInvoice = async (invoiceIdOrNo) => {
    if (!invoiceIdOrNo) return;
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceIdOrNo)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data);
        setPrintFormat('A4');
      } else {
        alert(`Invoice #${invoiceIdOrNo} could not be loaded.`);
      }
    } catch (e) {
      console.error('Error loading invoice:', e);
      alert('Network error loading invoice details.');
    }
  };

  const handleSelectCustomer = (cust) => {
    setSelectedCust(cust);
    setLedgerSearch('');
    setInvoiceSearch('');
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedCust) return;

    try {
      const res = await fetch('/api/customers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCust.id,
          shop_id: activeShop.id,
          amount: parseFloat(payAmount),
          payment_mode: payMode,
          notes: payNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsPaymentModalOpen(false);
        setPayAmount('');
        setPayNotes('');
        loadCustomers();
        loadCustomerLedger(selectedCust.id);
      } else {
        alert(data.message || 'Error recording payment.');
      }
    } catch (err) {
      alert('Error recording payment.');
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCust, shop_id: activeShop.id })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddCustOpen(false);
        setNewCust({
          name: '',
          phone: '',
          email: '',
          address: '',
          gstin: '',
          credit_limit: 25000,
          opening_balance: 0,
          route_beat: '',
          customer_type: 'RETAIL'
        });
        loadCustomers();
      }
    } catch (e) {
      alert('Error adding customer.');
    }
  };

  // 1. Open View Customer Details Modal
  const handleOpenViewModal = (cust) => {
    const target = cust || selectedCust;
    if (!target) return;
    setCustomerToView(target);
    setIsViewModalOpen(true);
  };

  // 2. Open Edit Customer Modal
  const handleOpenEditModal = (cust) => {
    const target = cust || selectedCust;
    if (!target) return;
    setCustomerToEdit({
      id: target.id,
      shop_id: target.shop_id || activeShop?.id,
      name: target.name || '',
      phone: target.phone || '',
      email: target.email || '',
      address: target.address || '',
      gstin: target.gstin || '',
      state_code: target.state_code || '07',
      credit_limit: target.credit_limit !== undefined ? target.credit_limit : 25000,
      route_beat: target.route_beat || '',
      customer_type: target.customer_type || 'RETAIL'
    });
    setIsEditModalOpen(true);
  };

  // 3. Save Edited Customer Profile
  const handleSaveEditCustomer = async (e) => {
    e.preventDefault();
    if (!customerToEdit || !customerToEdit.id) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/customers/${customerToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...customerToEdit, shop_id: activeShop.id })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        await loadCustomers();
        if (selectedCust?.id === customerToEdit.id) {
          setSelectedCust(prev => ({ ...prev, ...customerToEdit }));
          loadCustomerLedger(customerToEdit.id);
        }
      } else {
        alert(data.message || 'Failed to update customer details.');
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Error saving customer changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 4. Open Delete Customer Modal
  const handleOpenDeleteModal = (cust) => {
    const target = cust || selectedCust;
    if (!target) return;
    setCustomerToDelete(target);
    setIsDeleteModalOpen(true);
  };

  // 5. Confirm Delete Customer
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete || !customerToDelete.id) return;
    setIsDeletingCust(true);
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setIsDeleteModalOpen(false);
        const deletedId = customerToDelete.id;
        setCustomerToDelete(null);
        
        // Refresh customer list
        const resCust = await fetch(`/api/customers?shopId=${activeShop.id}&search=${encodeURIComponent(search)}`);
        if (resCust.ok) {
          const freshList = await resCust.json();
          setCustomers(freshList);
          if (selectedCust?.id === deletedId) {
            setSelectedCust(freshList.length > 0 ? freshList[0] : null);
          }
        }
      } else {
        alert(data.message || 'Failed to delete customer.');
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert('Error deleting customer.');
    } finally {
      setIsDeletingCust(false);
    }
  };

  const getWhatsAppReminderUrl = (cust) => {
    if (!cust || !cust.phone) return '#';
    const balance = cust.current_balance || 0;
    const text = encodeURIComponent(
      `Dear ${cust.name},\nThis is a gentle reminder from ${activeShop?.name} regarding your pending credit balance of ₹${balance.toLocaleString('en-IN')}.\nKindly settle the dues via UPI: ${activeShop?.upi_id || 'store UPI'}.\nThank you!`
    );
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const handleShareWhatsAppInvoice = async (inv, cust) => {
    try {
      let fullInv = inv;
      if (!fullInv.items || fullInv.items.length === 0) {
        const res = await fetch(`/api/invoices/${inv.id}`);
        if (res.ok) {
          fullInv = await res.json();
        }
      }
      openWhatsAppInvoice(fullInv, activeShop, cust || selectedCust);
    } catch (e) {
      openWhatsAppInvoice(inv, activeShop, cust || selectedCust);
    }
  };

  // Escape string for CSV export
  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  // Export Customer Ledger to Excel (.csv)
  const exportCustomerLedgerExcel = () => {
    if (!selectedCust) {
      alert('Please select a customer to export ledger.');
      return;
    }

    const periodLabel = datePreset === 'ALL_TIME' 
      ? 'All Time Records' 
      : `${startDate || 'Start'} to ${endDate || 'End'}`;

    const headers = [
      'Date & Time',
      'Transaction Type',
      'Reference / Bill #',
      'Payment Mode',
      'Debit (+) Bill (INR)',
      'Credit (-) Paid (INR)',
      'Balance Due (INR)',
      'Notes'
    ];

    const metaRows = [
      ['STATEMENT OF ACCOUNT / CUSTOMER KHATA REPORT'],
      [`Store Name:`, escapeCsv(activeShop?.name || 'KwikStore Pro')],
      [`Store GSTIN:`, escapeCsv(activeShop?.gstin || 'N/A')],
      [`Customer Name:`, escapeCsv(selectedCust.name)],
      [`Customer Phone:`, escapeCsv(selectedCust.phone || 'N/A')],
      [`Customer GSTIN:`, escapeCsv(selectedCust.gstin || 'Unregistered')],
      [`Customer Type:`, escapeCsv(selectedCust.customer_type || 'RETAIL')],
      [`Report Period:`, escapeCsv(periodLabel)],
      [`Opening Balance (INR):`, (ledgerSummary?.openingBalance || 0).toFixed(2)],
      [`Total Debits (INR):`, (ledgerSummary?.totalDebit || 0).toFixed(2)],
      [`Total Credits (INR):`, (ledgerSummary?.totalCredit || 0).toFixed(2)],
      [`Net Closing Balance Due (INR):`, ((ledgerSummary?.closingBalance !== undefined ? ledgerSummary.closingBalance : selectedCust.current_balance) || 0).toFixed(2)],
      []
    ];

    const dataRows = [];

    // Optional Opening Balance row
    if (ledgerSummary?.openingBalance > 0) {
      dataRows.push([
        escapeCsv(startDate || 'Initial Date'),
        escapeCsv('OPENING_BALANCE'),
        escapeCsv('B/F-BALANCE'),
        escapeCsv('—'),
        (ledgerSummary.openingBalance).toFixed(2),
        '0.00',
        (ledgerSummary.openingBalance).toFixed(2),
        escapeCsv('Opening Balance on Period Start')
      ]);
    }

    custLedger.forEach(row => {
      dataRows.push([
        escapeCsv(row.date?.slice(0, 19)),
        escapeCsv(row.transaction_type),
        escapeCsv(row.reference_no),
        escapeCsv(row.payment_mode || '—'),
        (row.debit_amount || 0).toFixed(2),
        (row.credit_amount || 0).toFixed(2),
        (row.balance_after || 0).toFixed(2),
        escapeCsv(row.notes || '')
      ]);
    });

    // Summary Totals Footer Row
    dataRows.push([
      escapeCsv('PERIOD TOTALS'),
      escapeCsv(`${custLedger.length} Transactions`),
      escapeCsv(''),
      escapeCsv(''),
      (ledgerSummary?.totalDebit || 0).toFixed(2),
      (ledgerSummary?.totalCredit || 0).toFixed(2),
      ((ledgerSummary?.closingBalance !== undefined ? ledgerSummary.closingBalance : selectedCust.current_balance) || 0).toFixed(2),
      escapeCsv('Net Closing Balance')
    ]);

    const csvLines = [
      ...metaRows.map(r => r.join(',')),
      headers.join(','),
      ...dataRows.map(r => r.join(','))
    ];

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Khata_Ledger_${selectedCust.name.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate || 'All'}_to_${endDate || 'Now'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.current_balance || 0), 0);

  // Filtered customer list by customer type
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (customerTypeFilter === 'ALL') return true;
      return c.customer_type === customerTypeFilter;
    });
  }, [customers, customerTypeFilter]);

  // Filtered customer invoices by status and search query
  const filteredInvoices = useMemo(() => {
    return custInvoices.filter(inv => {
      if (invoiceStatusFilter !== 'ALL') {
        if (invoiceStatusFilter === 'PAID' && inv.payment_status !== 'PAID') return false;
        if (invoiceStatusFilter === 'CREDIT' && (inv.payment_status !== 'CREDIT' && inv.balance_due <= 0)) return false;
        if (invoiceStatusFilter === 'PARTIAL' && inv.payment_status !== 'PARTIAL') return false;
      }
      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase().trim();
        const numMatch = inv.invoice_number?.toLowerCase().includes(q);
        const modeMatch = inv.payment_mode?.toLowerCase().includes(q);
        const dateMatch = inv.invoice_date?.toLowerCase().includes(q);
        const cashierMatch = inv.cashier_name?.toLowerCase().includes(q);
        const amtMatch = String(inv.grand_total).includes(q);
        return Boolean(numMatch || modeMatch || dateMatch || cashierMatch || amtMatch);
      }
      return true;
    });
  }, [custInvoices, invoiceStatusFilter, invoiceSearch]);

  // Invoice Aggregate Summary Stats
  const invoiceStats = useMemo(() => {
    const totalInvoiced = custInvoices.reduce((acc, inv) => acc + (inv.grand_total || 0), 0);
    const totalPaid = custInvoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
    const totalDue = custInvoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0);
    return {
      count: custInvoices.length,
      totalInvoiced,
      totalPaid,
      totalDue
    };
  }, [custInvoices]);

  const dateRangeMeta = {
    label: datePreset === 'ALL_TIME' ? 'All Time History' : (datePreset === 'THIS_FINANCIAL_YEAR' ? 'Financial Year (FY 2026-27)' : `${startDate || 'Start'} to ${endDate || 'End'}`),
    startDate,
    endDate
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Khata Toolbar */}
      <div className={`border-b px-6 py-3.5 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Customer Khata & Ledger Management
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              {activeShop?.name}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Track credit balances, filter date-wise statement of accounts, export to Excel & download PDF reports.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Market Udhar (Pending)</div>
            <div className="text-lg font-black text-rose-500 font-mono">₹{totalOutstanding.toLocaleString('en-IN')}</div>
          </div>

          <button
            onClick={() => setIsAddCustOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Compact Customer Sidebar (Left) + Expanded Ledger Engine (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Customers Directory (Compact ~300px) */}
        <div className={`w-72 lg:w-80 shrink-0 border-r flex flex-col overflow-hidden ${
          isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
        }`}>
          {/* Customer Search & Type Filters */}
          <div className={`p-3 border-b space-y-2 shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/70'}`}>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, GSTIN..."
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-sky-500 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Customer Type Quick Filter */}
            <div className="flex items-center space-x-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'RETAIL', label: 'Retail' },
                { id: 'WHOLESALE', label: 'B2B' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCustomerTypeFilter(t.id)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                    customerTypeFilter === t.id
                      ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                      : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredCustomers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No customers found.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCust?.id === c.id;
                const hasDue = (c.current_balance || 0) > 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all border group relative ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/70 shadow-sm ring-1 ring-sky-500/30'
                        : isDark ? 'hover:bg-slate-800/50 border-slate-800/60 bg-slate-950/40' : 'hover:bg-slate-100 border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <h4 className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={c.name}>
                            {c.name}
                          </h4>
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-500/10 text-slate-400 shrink-0">
                            {c.customer_type || 'RETAIL'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                          <span className="truncate">{c.phone || 'No phone'}</span>
                          {c.loyalty_points > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 font-bold shrink-0 text-[9px]">
                              🎁 {c.loyalty_points}
                            </span>
                          )}
                        </div>
                        {c.route_beat && (
                          <span className="text-[9px] text-amber-500 font-semibold truncate block">{c.route_beat}</span>
                        )}
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className={`text-xs font-black ${hasDue ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          ₹{c.current_balance?.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] text-slate-400">Limit: ₹{c.credit_limit?.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Selected Customer Ledger & Invoices Engine (Expanded Flex-1) */}
        <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
          {selectedCust ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Customer Profile Banner & Quick Actions */}
              <div className={`p-4 border-b flex flex-wrap justify-between items-center gap-3 shrink-0 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedCust.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                      {selectedCust.customer_type || 'RETAIL'}
                    </span>
                    {selectedCust.route_beat && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
                        {selectedCust.route_beat}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                    <span>Mobile: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedCust.phone || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>GSTIN: <strong className="text-cyan-600 dark:text-cyan-400">{selectedCust.gstin || 'Unregistered'}</strong></span>
                    {selectedCust.address && <span>• <span>{selectedCust.address}</span></span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View Details Button */}
                  <button
                    onClick={() => handleOpenViewModal(selectedCust)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20' : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                    }`}
                    title="View Full Customer Details"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-500" />
                    <span>View Detail</span>
                  </button>

                  {/* Edit Customer Button */}
                  <button
                    onClick={() => handleOpenEditModal(selectedCust)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                    title="Edit Customer Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Edit</span>
                  </button>

                  {/* Delete Customer Button */}
                  <button
                    onClick={() => handleOpenDeleteModal(selectedCust)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    }`}
                    title="Delete Customer Profile"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete</span>
                  </button>

                  <a
                    href={getWhatsAppReminderUrl(selectedCust)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                    title="Send WhatsApp Payment Reminder"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Export / Download Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5 text-sky-500" />
                      <span>Download Report</span>
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </button>

                    {showExportMenu && (
                      <div className={`absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-2xl z-30 p-1.5 space-y-1 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}>
                        <button
                          onClick={exportCustomerLedgerExcel}
                          className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <div>Download Excel (.csv)</div>
                            <div className="text-[10px] text-slate-400 font-normal">Excel / CSV ledger format</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowExportMenu(false);
                            setIsStatementModalOpen(true);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                          <div>
                            <div>Download PDF Statement</div>
                            <div className="text-[10px] text-slate-400 font-normal">Print / Save branded PDF</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setPayAmount(selectedCust.current_balance?.toString() || '');
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Collect Payment</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Ledger Statement vs All Invoices & Bills */}
              <div className={`px-4 pt-1.5 border-b flex items-center space-x-2 shrink-0 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/80 border-slate-200'
              }`}>
                <button
                  onClick={() => setActiveKhataTab('ledger')}
                  className={`px-3.5 py-2 border-b-2 font-bold text-xs flex items-center space-x-2 transition-all ${
                    activeKhataTab === 'ledger'
                      ? 'border-sky-500 text-sky-500 dark:text-sky-400 bg-sky-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📑 Account Ledger & Statement</span>
                </button>
                <button
                  onClick={() => setActiveKhataTab('invoices')}
                  className={`px-3.5 py-2 border-b-2 font-bold text-xs flex items-center space-x-2 transition-all ${
                    activeKhataTab === 'invoices'
                      ? 'border-sky-500 text-sky-500 dark:text-sky-400 bg-sky-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>🧾 Invoices & Bills History</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeKhataTab === 'invoices' 
                      ? 'bg-sky-500/20 text-sky-500 dark:text-sky-300 border border-sky-500/30' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {custInvoices.length}
                  </span>
                </button>
              </div>

              {activeKhataTab === 'ledger' ? (
                <>
                  {/* Advanced Date Range & Search Engine Control Bar */}
                  <div className={`p-3 border-b space-y-2.5 shrink-0 ${
                    isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {/* Date Preset Buttons (Weekly, Monthly, Yearly / FY, All Time) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase mr-1 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Calendar className="w-3 h-3 text-sky-500" />
                        <span>Range:</span>
                      </span>

                      {[
                        { id: 'ALL_TIME', label: 'All History' },
                        { id: 'TODAY', label: 'Today' },
                        { id: 'THIS_WEEK', label: 'This Week' },
                        { id: 'THIS_MONTH', label: 'This Month' },
                        { id: 'THIS_QUARTER', label: 'This Quarter' },
                        { id: 'THIS_FINANCIAL_YEAR', label: 'Yearly (FY 2026-27)' },
                        { id: 'LAST_YEAR', label: 'Last Year (FY 25-26)' },
                        { id: 'CUSTOM', label: 'Custom Date Range' }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => applyDatePreset(p.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            datePreset === p.id
                              ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                              : isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Second Row: Custom Start/End Date Pickers + Transaction Filter + Ledger Search */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-700/30">
                      {/* Custom Dates */}
                      {datePreset === 'CUSTOM' && (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`border rounded-lg px-2 py-1 text-xs font-mono outline-none ${
                              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                          <span className="text-slate-400 text-xs font-bold">to</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`border rounded-lg px-2 py-1 text-xs font-mono outline-none ${
                              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      )}

                      {/* Transaction Type Filter */}
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Type:</span>
                        <select
                          value={transactionType}
                          onChange={(e) => setTransactionType(e.target.value)}
                          className={`border rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer ${
                            isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="ALL">All Transactions</option>
                          <option value="INVOICE">Invoices (Udhar Bills)</option>
                          <option value="PAYMENT_RECEIVED">Payments Received</option>
                          <option value="OPENING_BALANCE">Opening Balance</option>
                        </select>
                      </div>

                      {/* Ledger Search */}
                      <div className="flex-1 min-w-[200px] relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          placeholder="Search bill #, receipt ref, notes..."
                          className={`w-full border rounded-lg pl-8 pr-2 py-1 text-xs outline-none ${
                            isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>

                      {/* Reset Filters */}
                      {(datePreset !== 'ALL_TIME' || transactionType !== 'ALL' || ledgerSearch) && (
                        <button
                          onClick={() => {
                            setDatePreset('ALL_TIME');
                            setStartDate('');
                            setEndDate('');
                            setTransactionType('ALL');
                            setLedgerSearch('');
                          }}
                          className="px-2 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-1 transition-all"
                          title="Reset all ledger filters"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Ledger Financial Summary Ribbon */}
                  <div className={`px-4 py-2.5 border-b grid grid-cols-5 gap-3 text-xs shrink-0 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Opening Balance</span>
                      <span className="font-mono font-bold text-sm">₹{(ledgerSummary?.openingBalance || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-rose-500 block text-[10px] uppercase font-bold">Total Invoiced (+)</span>
                      <span className="font-mono font-bold text-sm text-rose-500">₹{(ledgerSummary?.totalDebit || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-emerald-500 block text-[10px] uppercase font-bold">Total Paid (-)</span>
                      <span className="font-mono font-bold text-sm text-emerald-500">₹{(ledgerSummary?.totalCredit || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-sky-500 block text-[10px] uppercase font-bold">Net Period Change</span>
                      <span className="font-mono font-bold text-sm text-sky-500">
                        {(ledgerSummary?.netChange || 0) >= 0 ? '+' : ''}₹{(ledgerSummary?.netChange || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="pl-3 border-l border-slate-700/50">
                      <span className="text-rose-500 block text-[10px] uppercase font-bold">Closing Balance Due</span>
                      <span className="font-mono font-black text-base text-rose-500">
                        ₹{((ledgerSummary?.closingBalance !== undefined ? ledgerSummary.closingBalance : selectedCust.current_balance) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Ledger Statement Table */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className={`border rounded-xl overflow-hidden shadow-lg ${
                      isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
                    }`}>
                      <table className="w-full text-left text-xs font-mono">
                        <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                          isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Reference / Bill #</th>
                            <th className="py-2.5 px-3 text-right">Debit (+) Bill</th>
                            <th className="py-2.5 px-3 text-right">Credit (-) Paid</th>
                            <th className="py-2.5 px-3 text-right">Balance Due</th>
                            <th className="py-2.5 px-3">Notes & Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                          {/* Optional Opening Balance row */}
                          {ledgerSummary?.openingBalance > 0 && (
                            <tr className={isDark ? 'bg-amber-500/5' : 'bg-amber-50/60'}>
                              <td className="py-2.5 px-3 font-mono text-slate-400">{startDate || 'Period Start'}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                  OPENING_BAL
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-500">B/F Balance</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-500 font-semibold">
                                ₹{ledgerSummary.openingBalance.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">—</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                                ₹{ledgerSummary.openingBalance.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-400 italic">Balance brought forward</td>
                            </tr>
                          )}

                          {custLedger.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-10 text-center text-slate-400 font-sans">
                                {loadingLedger ? 'Loading statement...' : 'No ledger transactions match the selected filter criteria.'}
                              </td>
                            </tr>
                          ) : (
                            custLedger.map((row, idx) => (
                              <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                <td className="py-2.5 px-3 font-mono text-slate-400">{row.date?.slice(0, 16)}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    row.transaction_type === 'INVOICE' 
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30' 
                                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                  }`}>
                                    {row.transaction_type}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-3 font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {row.transaction_type === 'INVOICE' || row.invoice_id ? (
                                    <button
                                      onClick={() => handleViewInvoice(row.invoice_id || row.reference_no)}
                                      className="text-sky-500 hover:text-sky-400 underline decoration-sky-500/40 hover:decoration-sky-400 font-bold flex items-center space-x-1 group"
                                      title="1-Click: View Full GST Tax Invoice"
                                    >
                                      <span>{row.reference_no}</span>
                                      <Eye className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  ) : (
                                    <span>{row.reference_no}</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-500 font-semibold">
                                  {row.debit_amount > 0 ? `₹${row.debit_amount.toFixed(2)}` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {row.credit_amount > 0 ? `₹${row.credit_amount.toFixed(2)}` : '—'}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  ₹{row.balance_after?.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-[11px] text-slate-400">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      {row.payment_mode && <span className="font-semibold text-slate-300">[{row.payment_mode}] </span>}
                                      {row.notes || '—'}
                                    </div>
                                    {(row.transaction_type === 'INVOICE' || row.invoice_id) && (
                                      <button
                                        onClick={() => handleViewInvoice(row.invoice_id || row.reference_no)}
                                        className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 dark:text-sky-400 border border-sky-500/30 font-bold text-[10px] flex items-center space-x-1 shrink-0 transition-all"
                                        title="1-Click: View Full Tax Invoice"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>View Bill</span>
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
                  </div>
                </>
              ) : (
                /* INVOICES & BILLS TAB VIEW */
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Invoices Search & Filter Controls */}
                  <div className={`p-3 border-b space-y-2.5 shrink-0 ${
                    isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search Bar */}
                      <div className="flex-1 min-w-[220px] relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          placeholder="Search invoice #, payment mode, cashier, amount..."
                          className={`w-full border rounded-lg pl-8 pr-2 py-1.5 text-xs outline-none ${
                            isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>

                      {/* Status Filter Buttons */}
                      <div className="flex items-center space-x-1">
                        {[
                          { id: 'ALL', label: `All Bills (${custInvoices.length})` },
                          { id: 'PAID', label: '🟢 Fully Paid' },
                          { id: 'CREDIT', label: '🔴 Credit (Udhar)' },
                          { id: 'PARTIAL', label: '🟡 Partial' }
                        ].map(st => (
                          <button
                            key={st.id}
                            onClick={() => setInvoiceStatusFilter(st.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              invoiceStatusFilter === st.id
                                ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Reset Invoice Filter */}
                      {(invoiceSearch || invoiceStatusFilter !== 'ALL') && (
                        <button
                          onClick={() => {
                            setInvoiceSearch('');
                            setInvoiceStatusFilter('ALL');
                          }}
                          className="px-2 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-1 transition-all"
                          title="Reset invoice filters"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Invoice Statistics Summary Ribbon */}
                  <div className={`px-4 py-2.5 border-b grid grid-cols-4 gap-3 text-xs shrink-0 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Invoices</span>
                      <span className="font-mono font-bold text-sm text-sky-500">{invoiceStats.count} Invoices</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Invoiced Amount</span>
                      <span className="font-mono font-bold text-sm text-slate-200">
                        ₹{invoiceStats.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-500 block text-[10px] uppercase font-bold">Total Paid / Cleared</span>
                      <span className="font-mono font-bold text-sm text-emerald-500">
                        ₹{invoiceStats.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pl-3 border-l border-slate-700/50">
                      <span className="text-rose-500 block text-[10px] uppercase font-bold">Total Balance Pending</span>
                      <span className="font-mono font-black text-base text-rose-500">
                        ₹{invoiceStats.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Invoices List Table */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className={`border rounded-xl overflow-hidden shadow-lg ${
                      isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
                    }`}>
                      <table className="w-full text-left text-xs font-mono">
                        <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                          isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          <tr>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date & Time</th>
                            <th className="py-2.5 px-3 text-center">Items</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Grand Total</th>
                            <th className="py-2.5 px-3 text-right">Paid</th>
                            <th className="py-2.5 px-3 text-right">Balance Due</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">1-Click Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                          {filteredInvoices.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="py-12 text-center text-slate-400 font-sans">
                                No customer invoices found matching the search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredInvoices.map((inv) => (
                              <tr key={inv.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                <td className="py-2.5 px-3 font-mono font-bold">
                                  <button
                                    onClick={() => handleViewInvoice(inv.id)}
                                    className="text-sky-500 hover:text-sky-400 underline decoration-sky-500/40 hover:decoration-sky-400 flex items-center space-x-1 group"
                                    title="1-Click: View Full GST Tax Invoice"
                                  >
                                    <span>{inv.invoice_number}</span>
                                    <Eye className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-400">
                                  {inv.invoice_date?.slice(0, 16)}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                                    {inv.item_count || 1} items
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-300">
                                  {inv.payment_mode || 'CASH'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                                  ₹{(inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-500 font-semibold">
                                  ₹{(inv.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  inv.balance_due > 0 ? 'text-rose-500' : 'text-slate-400'
                                }`}>
                                  ₹{(inv.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    inv.payment_status === 'PAID'
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                      : inv.payment_status === 'CREDIT'
                                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                  }`}>
                                    {inv.payment_status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    {/* 1-Click View A4 */}
                                    <button
                                      onClick={() => {
                                        setPrintFormat('A4');
                                        handleViewInvoice(inv.id);
                                      }}
                                      className="px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 dark:text-sky-400 border border-sky-500/30 font-bold text-[10px] flex items-center space-x-1 transition-all"
                                      title="1-Click: View Full A4 GST Tax Invoice"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>A4 Bill</span>
                                    </button>

                                    {/* 1-Click View Thermal Receipt */}
                                    <button
                                      onClick={() => {
                                        setPrintFormat('THERMAL');
                                        handleViewInvoice(inv.id);
                                      }}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[10px] flex items-center space-x-1 transition-all"
                                      title="1-Click: Thermal POS Receipt Slip"
                                    >
                                      <Printer className="w-3 h-3 text-amber-400" />
                                      <span>Receipt</span>
                                    </button>

                                    {/* WhatsApp Invoice share */}
                                    <button
                                      onClick={() => handleShareWhatsAppInvoice(inv, selectedCust)}
                                      className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 transition-all"
                                      title="Share Full Itemized Bill on WhatsApp"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Select a customer from the left directory to view their complete ledger statement and invoice history.
            </div>
          )}
        </div>
      </div>

      {/* 1. Collect Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Collect Payment from {selectedCust?.name}
            </h3>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Amount to Receive (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className={`w-full border rounded-lg p-2.5 font-mono font-bold text-base outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Mode
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe / Paytm</option>
                  <option value="BANK_TRANSFER">Bank NEFT / RTGS / IMPS</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Receipt Notes
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Cleared pending invoice bill"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
                >
                  Save Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Customer Modal */}
      {isAddCustOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Create New Customer / Retailer Profile
            </h3>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Customer / Shop Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Rajesh Trading Co."
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer Type
                  </label>
                  <select
                    value={newCust.customer_type}
                    onChange={(e) => setNewCust({ ...newCust, customer_type: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="RETAIL">Retail Consumer (B2C)</option>
                    <option value="WHOLESALE">Wholesale / Business Dealer (B2B)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCust.gstin}
                    onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono uppercase outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Credit (Udhar) Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={newCust.credit_limit}
                    onChange={(e) => setNewCust({ ...newCust, credit_limit: parseFloat(e.target.value) || 0 })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Date of Birth (Birthday)
                  </label>
                  <input
                    type="date"
                    value={newCust.dob || ''}
                    onChange={(e) => setNewCust({ ...newCust, dob: e.target.value })}
                    className={`w-full border rounded-lg p-2 text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Anniversary Date
                  </label>
                  <input
                    type="date"
                    value={newCust.anniversary_date || ''}
                    onChange={(e) => setNewCust({ ...newCust, anniversary_date: e.target.value })}
                    className={`w-full border rounded-lg p-2 text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Market Beat / Delivery Route
                </label>
                <input
                  type="text"
                  value={newCust.route_beat}
                  onChange={(e) => setNewCust({ ...newCust, route_beat: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Route 1: Chandni Chowk Beat"
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Address / City
                </label>
                <input
                  type="text"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Main Market, Sector 18"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustOpen(false)}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Customer Statement of Account PDF Preview / Print Modal */}
      {isStatementModalOpen && selectedCust && (
        <CustomerStatementPrint
          customer={selectedCust}
          ledger={custLedger}
          summary={ledgerSummary}
          shop={activeShop}
          dateRange={dateRangeMeta}
          onClose={() => setIsStatementModalOpen(false)}
        />
      )}

      {/* 4. 1-Click Full A4 Tax Invoice Modal */}
      {selectedInvoice && printFormat === 'A4' && (
        <A4TaxInvoice
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={() => window.print()}
          onSwitchToThermal={() => setPrintFormat('THERMAL')}
        />
      )}

      {/* 5. 1-Click Thermal POS Slip Modal */}
      {selectedInvoice && printFormat === 'THERMAL' && (
        <ThermalReceipt
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={() => window.print()}
          onSwitchToA4={() => setPrintFormat('A4')}
        />
      )}

      {/* 6. View Customer Details Modal */}
      {isViewModalOpen && customerToView && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 text-xs overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4 border-slate-500/20">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center font-black text-lg shadow-lg">
                  {customerToView.name ? customerToView.name.slice(0, 2).toUpperCase() : 'CU'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {customerToView.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/30">
                      {customerToView.customer_type || 'RETAIL'}
                    </span>
                    {customerToView.route_beat && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
                        {customerToView.route_beat}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                    Customer ID: #{customerToView.id} • Registered in {activeShop?.name || 'Store'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsViewModalOpen(false)}
                className={`p-1.5 rounded-xl border transition-all ${
                  isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Pending Udhar Balance</div>
                <div className={`text-base font-black font-mono mt-0.5 ${
                  (customerToView.current_balance || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                }`}>
                  ₹{customerToView.current_balance?.toLocaleString('en-IN') || '0'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Credit Limit</div>
                <div className="text-base font-black font-mono mt-0.5 text-sky-500">
                  ₹{customerToView.credit_limit?.toLocaleString('en-IN') || '25,000'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Loyalty Points</div>
                <div className="text-base font-black font-mono mt-0.5 text-amber-500">
                  🎁 {customerToView.loyalty_points || 0} pts
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Lifetime Total Spent</div>
                <div className="text-base font-black font-mono mt-0.5 text-purple-500">
                  ₹{(customerToView.total_spent || ledgerSummary?.totalInvoicedAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Profile Information Grid */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex items-start space-x-2.5">
                  <PhoneCall className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Contact Phone</div>
                    <div className="font-mono font-bold text-xs mt-0.5">
                      {customerToView.phone ? (
                        <a href={`tel:${customerToView.phone}`} className="hover:underline text-emerald-600 dark:text-emerald-400">
                          {customerToView.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">No phone provided</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <Mail className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Email Address</div>
                    <div className="font-mono font-bold text-xs mt-0.5">
                      {customerToView.email ? (
                        <a href={`mailto:${customerToView.email}`} className="hover:underline text-sky-600 dark:text-sky-400">
                          {customerToView.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">No email registered</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">GSTIN / Tax ID</div>
                    <div className="font-mono font-bold text-xs mt-0.5 text-cyan-600 dark:text-cyan-400">
                      {customerToView.gstin || 'Unregistered Consumer (B2C)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Market Beat / Delivery Route</div>
                    <div className="font-semibold text-xs mt-0.5">
                      {customerToView.route_beat || 'General Delivery'}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-start space-x-2.5">
                  <Building className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Full Billing & Delivery Address</div>
                    <div className="font-medium text-xs mt-0.5 text-slate-700 dark:text-slate-200">
                      {customerToView.address || 'No physical address stored.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-500/20">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenDeleteModal(customerToView);
                }}
                className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Customer</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenEditModal(customerToView);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Customer Modal */}
      {isEditModalOpen && customerToEdit && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-500/20">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-500" />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Edit Customer Profile
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`p-1 rounded-lg border transition-all ${
                  isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerToEdit.name}
                  onChange={(e) => setCustomerToEdit({ ...customerToEdit, name: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Ramesh Kumar / Star Mart"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerToEdit.phone}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, phone: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer Type
                  </label>
                  <select
                    value={customerToEdit.customer_type}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, customer_type: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="RETAIL">Retail Consumer (B2C)</option>
                    <option value="WHOLESALE">Wholesale / Business Dealer (B2B)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerToEdit.email || ''}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, email: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. customer@example.com"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    GSTIN (Tax Number)
                  </label>
                  <input
                    type="text"
                    value={customerToEdit.gstin || ''}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, gstin: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono uppercase outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Credit (Udhar) Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={customerToEdit.credit_limit}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, credit_limit: parseFloat(e.target.value) || 0 })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Market Beat / Delivery Route
                  </label>
                  <input
                    type="text"
                    value={customerToEdit.route_beat || ''}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, route_beat: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. Monday Beat / Sector 4"
                  />
                </div>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Address
                </label>
                <input
                  type="text"
                  value={customerToEdit.address || ''}
                  onChange={(e) => setCustomerToEdit({ ...customerToEdit, address: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Shop No. 12, Main Bazaar Road"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-500/20">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Delete Customer Confirmation Modal */}
      {isDeleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Delete Customer Profile?
                </h3>
                <p className="text-slate-400 text-[11px]">This action cannot be undone.</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Customer:</span>
                <span className="font-bold">{customerToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Phone:</span>
                <span className="font-mono">{customerToDelete.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Current Balance:</span>
                <span className={`font-mono font-bold ${
                  (customerToDelete.current_balance || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                }`}>
                  ₹{customerToDelete.current_balance?.toLocaleString('en-IN') || '0'}
                </span>
              </div>
            </div>

            {(customerToDelete.current_balance || 0) > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <strong>Outstanding Debt Warning:</strong> This customer has an unpaid balance of ₹{customerToDelete.current_balance?.toLocaleString('en-IN')}. Deleting will erase active ledger tracking.
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Historical sales invoices will remain recorded in your accounts for tax and audit compliance, with this customer unlinked safely.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-500/20">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingCust}
                className={`px-3 py-1.5 rounded-lg font-semibold ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                disabled={isDeletingCust}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCust ? 'Deleting...' : 'Yes, Delete Customer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
