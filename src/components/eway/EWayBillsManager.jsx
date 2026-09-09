import React, { useState, useEffect, useMemo } from 'react';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/gstUtils';
import { 
  Truck, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  FileText, 
  Plus, 
  RefreshCw, 
  X, 
  FileCode,
  MapPin,
  ExternalLink,
  Save,
  Check,
  FileSpreadsheet,
  Calendar,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';
import { EWayBillModal } from '../pos/EWayBillModal';
import { A4TaxInvoice } from '../print/A4TaxInvoice';

export function EWayBillsManager() {
  const { activeShop } = useShop();
  const { isDark } = useTheme();

  const [ewayBills, setEwayBills] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Search & Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL_TIME'); // ALL_TIME, TODAY, THIS_WEEK, THIS_MONTH, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transportModeFilter, setTransportModeFilter] = useState('ALL');
  
  // Selected items for modals
  const [editingBill, setEditingBill] = useState(null);
  const [viewingSlipBill, setViewingSlipBill] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [selectedInvoiceForNew, setSelectedInvoiceForNew] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isGeneratingSlipPdf, setIsGeneratingSlipPdf] = useState(false);
  const [isExportingRegistryPdf, setIsExportingRegistryPdf] = useState(false);

  const fetchEwayBills = async () => {
    setLoading(true);
    try {
      const shopParam = activeShop?.id ? `shopId=${activeShop.id}` : '';
      const statusParam = statusFilter !== 'ALL' ? `&status=${statusFilter}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      
      const res = await fetch(`/api/ewaybills?${shopParam}${statusParam}${searchParam}`);
      const data = await res.json();
      if (data.success) {
        setEwayBills(data.ewayBills || []);
      }
    } catch (e) {
      console.error('Error loading e-way bills:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentInvoices = async () => {
    try {
      const res = await fetch('/api/invoices?limit=30');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecentInvoices(data);
      } else if (data.invoices) {
        setRecentInvoices(data.invoices);
      }
    } catch (e) {
      console.error('Error fetching recent invoices:', e);
    }
  };

  useEffect(() => {
    fetchEwayBills();
  }, [activeShop, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEwayBills();
  };

  // Filter E-Way bills client-side for dynamic date presets & transport mode
  const filteredEWayBills = useMemo(() => {
    return ewayBills.filter(bill => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const invMatch = (bill.invoice_number || '').toLowerCase().includes(q);
        const ebnMatch = (bill.eway_bill_no || '').toLowerCase().includes(q);
        const vehMatch = (bill.vehicle_no || '').toLowerCase().includes(q);
        const custMatch = (bill.customer_name || '').toLowerCase().includes(q);
        const gstinMatch = (bill.customer_gstin || '').toLowerCase().includes(q);
        const transMatch = (bill.transporter_name || '').toLowerCase().includes(q);
        if (!invMatch && !ebnMatch && !vehMatch && !custMatch && !gstinMatch && !transMatch) {
          return false;
        }
      }

      // 2. Status
      if (statusFilter !== 'ALL' && bill.status !== statusFilter) {
        return false;
      }

      // 3. Transport Mode
      if (transportModeFilter !== 'ALL' && String(bill.transport_mode) !== String(transportModeFilter)) {
        return false;
      }

      // 4. Date Filter
      if (datePreset !== 'ALL_TIME') {
        const billDate = new Date(bill.created_at);
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        if (datePreset === 'TODAY') {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (billDate < todayStart || billDate > now) return false;
        } else if (datePreset === 'THIS_WEEK') {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);
          if (billDate < weekStart || billDate > now) return false;
        } else if (datePreset === 'THIS_MONTH') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (billDate < monthStart || billDate > now) return false;
        } else if (datePreset === 'CUSTOM') {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (billDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (billDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [ewayBills, search, statusFilter, transportModeFilter, datePreset, startDate, endDate]);

  // Fast 1-Click Action: Mark as Delivered / Completed
  const handleMarkDelivered = async (bill) => {
    const nextStatus = bill.status === 'DELIVERED' ? 'IN_TRANSIT' : 'DELIVERED';
    try {
      const res = await fetch(`/api/ewaybills/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: nextStatus === 'DELIVERED'
            ? `E-Way Bill #${bill.invoice_number} marked as DELIVERED / COMPLETED!`
            : `E-Way Bill #${bill.invoice_number} marked as IN TRANSIT.`
        });
        fetchEwayBills();
      } else {
        alert(data.message || 'Error updating status');
      }
    } catch (e) {
      alert('Network error updating status');
    }
  };

  const handleDelete = async (id, invNo) => {
    if (!window.confirm(`Are you sure you want to delete the E-Way bill record for Invoice #${invNo}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/ewaybills/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `E-Way bill #${invNo} deleted successfully.` });
        fetchEwayBills();
      } else {
        alert(data.message || 'Error deleting E-Way bill');
      }
    } catch (e) {
      alert('Network error deleting E-Way bill');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingBill) return;

    try {
      const res = await fetch(`/api/ewaybills/${editingBill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eway_bill_no: editingBill.eway_bill_no,
          vehicle_no: editingBill.vehicle_no,
          transporter_id: editingBill.transporter_id,
          transporter_name: editingBill.transporter_name,
          distance_km: editingBill.distance_km,
          transport_mode: editingBill.transport_mode,
          vehicle_type: editingBill.vehicle_type,
          status: editingBill.status,
          notes: editingBill.notes
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Updated E-Way bill for #${editingBill.invoice_number}` });
        setEditingBill(null);
        fetchEwayBills();
      } else {
        alert(data.message || 'Error updating E-Way bill');
      }
    } catch (e) {
      alert('Network error updating E-Way bill');
    }
  };

  const downloadJson = (bill) => {
    let payload = null;
    if (bill.payload_json) {
      try {
        payload = typeof bill.payload_json === 'string' ? JSON.parse(bill.payload_json) : bill.payload_json;
      } catch (e) {}
    }

    if (!payload) {
      payload = {
        version: "1.0.0421",
        billLists: [{
          userGstin: bill.shop_gstin || activeShop?.gstin || '21AAAAA0000A1Z5',
          supplyType: bill.supply_type || 'O',
          subSupplyType: bill.sub_supply_type || '1',
          docType: "INV",
          docNo: bill.invoice_number,
          docDate: new Date(bill.created_at || Date.now()).toLocaleDateString('en-GB'),
          fromGstin: bill.shop_gstin || activeShop?.gstin || '21AAAAA0000A1Z5',
          fromTrdName: bill.shop_name || activeShop?.name || 'KwikStore Retailer',
          toGstin: bill.customer_gstin || 'URP',
          toTrdName: bill.customer_name || 'Retail Customer',
          totalValue: Number(bill.total_amount || 0),
          totInvValue: Number(bill.total_amount || 0),
          transMode: bill.transport_mode || '1',
          transDistance: String(bill.distance_km || '50'),
          transporterName: bill.transporter_name || '',
          transporterId: bill.transporter_id || '',
          vehicleNo: bill.vehicle_no || ''
        }]
      };
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EWAYBILL_${bill.invoice_number}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Robust Invoice Lookup: Handles both invoice ID and invoice number
  const handleOpenInvoicePreview = async (invoiceNumber, invoiceId) => {
    try {
      const identifier = invoiceId || invoiceNumber;
      const res = await fetch(`/api/invoices/${encodeURIComponent(identifier)}`);
      if (res.ok) {
        const inv = await res.json();
        if (inv && (inv.id || inv.invoice_number)) {
          setViewingInvoice(inv);
          return;
        }
      }

      // Fallback search
      const listRes = await fetch(`/api/invoices?search=${encodeURIComponent(invoiceNumber)}`);
      if (listRes.ok) {
        const list = await listRes.json();
        const found = Array.isArray(list) 
          ? list.find(i => i.invoice_number === invoiceNumber || i.id === invoiceId)
          : null;
        if (found) {
          const detailRes = await fetch(`/api/invoices/${found.id}`);
          if (detailRes.ok) {
            setViewingInvoice(await detailRes.json());
            return;
          }
          setViewingInvoice(found);
          return;
        }
      }
      alert(`Could not find invoice details for ${invoiceNumber}.`);
    } catch (e) {
      console.error('Error fetching invoice details:', e);
      alert('Error fetching invoice details.');
    }
  };

  // Export E-Way Bills to CSV (Excel format)
  const exportToExcelCsv = () => {
    if (filteredEWayBills.length === 0) {
      alert('No E-Way bills to export.');
      return;
    }

    const headers = [
      'Document / Invoice #',
      'Date & Time',
      'E-Way Bill No (EBN)',
      'Customer Name',
      'Customer GSTIN',
      'Vehicle Number',
      'Vehicle Type',
      'Transporter Name',
      'Transporter GSTIN',
      'Transport Mode',
      'Approx Distance (KM)',
      'Total Value (INR)',
      'Transit Status',
      'Notes'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredEWayBills.map(b => [
      escapeCsv(b.invoice_number),
      escapeCsv(new Date(b.created_at).toLocaleString('en-IN')),
      escapeCsv(b.eway_bill_no || 'N/A'),
      escapeCsv(b.customer_name || 'Retail Client'),
      escapeCsv(b.customer_gstin || 'URP'),
      escapeCsv(b.vehicle_no),
      escapeCsv(b.vehicle_type === 'O' ? 'Over Dimensional' : 'Regular'),
      escapeCsv(b.transporter_name || 'Self'),
      escapeCsv(b.transporter_id || 'N/A'),
      escapeCsv(getTransportModeLabel(b.transport_mode)),
      escapeCsv(b.distance_km || 50),
      escapeCsv(Number(b.total_amount || 0).toFixed(2)),
      escapeCsv(b.status),
      escapeCsv(b.notes || '')
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EWay_Bills_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export E-Way Bills Registry to PDF
  const exportRegistryPdf = async () => {
    try {
      setIsExportingRegistryPdf(true);
      const filename = `EWay_Bills_Registry_${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportElementToPdf('printable-eway-bills-registry', filename, { scale: 2, margin: 6 });
    } catch (err) {
      console.error('Failed to export registry PDF:', err);
      alert('Could not export PDF directly. Please use print.');
    } finally {
      setIsExportingRegistryPdf(false);
    }
  };

  const getTransportModeLabel = (mode) => {
    switch (String(mode)) {
      case '1': return 'Road (Truck/Tempo)';
      case '2': return 'Rail (Train)';
      case '3': return 'Air (Cargo)';
      case '4': return 'Ship / Coastal';
      default: return 'Road (Truck/Tempo)';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_TRANSIT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">🚚 In Transit</span>;
      case 'DELIVERED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">✓ Delivered</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">✕ Cancelled</span>;
      case 'GENERATED':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">📄 Active Draft</span>;
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Header */}
      <div className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Indian GST E-Way Bills & Transit Hub
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Rule 138 NIC Compliant
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Manage consignment transit memos, update vehicle details, download NIC bulk JSON & print official Form GST EWB-01 slips.
            </p>
          </div>
        </div>

        {/* Top Actions & Export Bar */}
        <div className="flex items-center space-x-2">
          {/* Export to Excel */}
          <button
            onClick={exportToExcelCsv}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
              isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
            }`}
            title="Export filtered E-Way bills to Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Export to PDF Report */}
          <button
            onClick={exportRegistryPdf}
            disabled={isExportingRegistryPdf}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
              isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
            } ${isExportingRegistryPdf ? 'opacity-70 cursor-wait' : ''}`}
            title="Export filtered registry to PDF"
          >
            {isExportingRegistryPdf ? (
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-sky-500" />
            )}
            <span className="hidden sm:inline">{isExportingRegistryPdf ? 'Saving...' : 'PDF Report'}</span>
          </button>

          {/* Create New */}
          <button
            onClick={() => {
              fetchRecentInvoices();
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-brand-500/25 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New E-Way Bill</span>
          </button>
          
          <button
            onClick={fetchEwayBills}
            className={`p-2 rounded-xl border text-xs transition-all ${
              isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="px-6 pt-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div id="printable-eway-bills-registry" className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Generated</span>
            <div className="text-lg font-black mt-0.5">{ewayBills.length}</div>
          </div>
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">In Transit</span>
            <div className="text-lg font-black mt-0.5 text-amber-500">
              {ewayBills.filter(b => b.status === 'IN_TRANSIT').length}
            </div>
          </div>
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Delivered / Completed</span>
            <div className="text-lg font-black mt-0.5 text-emerald-500">
              {ewayBills.filter(b => b.status === 'DELIVERED').length}
            </div>
          </div>
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Cancelled</span>
            <div className="text-lg font-black mt-0.5 text-rose-500">
              {ewayBills.filter(b => b.status === 'CANCELLED').length}
            </div>
          </div>
        </div>

        {/* Enhanced Multi-Filter Toolbar */}
        <div className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 print:hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Bill #, Vehicle, Customer, Transporter..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none border ${
                isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-brand-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-500'
              }`}
            />
          </form>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Date Preset Filter */}
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className={`border text-xs rounded-xl px-2.5 py-1.5 font-semibold outline-none cursor-pointer ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL_TIME">All Time</option>
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">Past 7 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range Inputs */}
            {datePreset === 'CUSTOM' && (
              <div className="flex items-center space-x-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`border text-[11px] rounded-lg px-2 py-1 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`border text-[11px] rounded-lg px-2 py-1 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            )}

            {/* Transport Mode Filter */}
            <select
              value={transportModeFilter}
              onChange={(e) => setTransportModeFilter(e.target.value)}
              className={`border text-xs rounded-xl px-2.5 py-1.5 font-semibold outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="ALL">All Modes</option>
              <option value="1">🚛 Road</option>
              <option value="2">🚆 Rail</option>
              <option value="3">✈️ Air</option>
              <option value="4">🚢 Ship</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`border text-xs rounded-xl px-2.5 py-1.5 font-semibold outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="GENERATED">Active Draft</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered / Done</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Reset Button */}
            {(search || statusFilter !== 'ALL' || datePreset !== 'ALL_TIME' || transportModeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setDatePreset('ALL_TIME');
                  setStartDate('');
                  setEndDate('');
                  setTransportModeFilter('ALL');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center space-x-1 transition-all"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* E-Way Bills Data Table */}
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading E-Way bill records...</div>
          ) : filteredEWayBills.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold">No E-Way Bills Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No consignment transit memos matched the selected filters. Click "New E-Way Bill" to generate one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className={`border-b font-bold uppercase text-[10px] tracking-wider ${
                    isDark ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="p-3">Doc / Invoice #</th>
                    <th className="p-3">Consignment Value</th>
                    <th className="p-3">Recipient Customer</th>
                    <th className="p-3">Vehicle Details</th>
                    <th className="p-3">Transporter / Route</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredEWayBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Document Details */}
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenInvoicePreview(bill.invoice_number, bill.invoice_id)}
                            className="font-mono font-bold text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
                            title="1-Click: View Full A4 GST Tax Invoice"
                          >
                            <span>#{bill.invoice_number}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(bill.created_at).toLocaleDateString('en-GB')} • {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {bill.eway_bill_no && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-1 inline-block">
                            EBN: {bill.eway_bill_no}
                          </span>
                        )}
                      </td>

                      {/* Consignment Value */}
                      <td className="p-3">
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(bill.total_amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">GST Outward</span>
                      </td>

                      {/* Recipient */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {bill.customer_name || 'Retail Client'}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          GSTIN: {bill.customer_gstin || 'URP'}
                        </span>
                      </td>

                      {/* Vehicle Details */}
                      <td className="p-3">
                        <div className="flex items-center space-x-1 font-mono font-bold text-amber-600 dark:text-amber-400">
                          <Truck className="w-3.5 h-3.5 shrink-0" />
                          <span>{bill.vehicle_no || 'NOT_SPECIFIED'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {bill.vehicle_type === 'O' ? 'Over Dimensional' : 'Regular Vehicle'}
                        </span>
                      </td>

                      {/* Transporter / Route */}
                      <td className="p-3">
                        <div className="font-medium">
                          {bill.transporter_name || 'Direct / Self Transport'}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {getTransportModeLabel(bill.transport_mode)} • ~{bill.distance_km || 50} KM
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {getStatusBadge(bill.status)}
                      </td>

                      {/* Actions with 1-Click Complete */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* 1-Click Complete / Delivered Action */}
                          <button
                            onClick={() => handleMarkDelivered(bill)}
                            className={`p-1.5 rounded-lg border transition ${
                              bill.status === 'DELIVERED'
                                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30'
                                : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}
                            title={bill.status === 'DELIVERED' ? 'Mark as In Transit' : '1-Click: Mark as Completed / Delivered'}
                          >
                            <Check className="w-3.5 h-3.5 font-black" />
                          </button>

                          {/* Download NIC JSON */}
                          <button
                            onClick={() => downloadJson(bill)}
                            className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition"
                            title="Download NIC Standard Bulk JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Transit Slip */}
                          <button
                            onClick={() => setViewingSlipBill(bill)}
                            className="p-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition"
                            title="Preview & Print Official Form GST EWB-01 Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditingBill({ ...bill })}
                            className={`p-1.5 rounded-lg border transition ${
                              isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Edit Vehicle & Transporter Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(bill.id, bill.invoice_number)}
                            className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition"
                            title="Delete E-Way Bill Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 1. Edit E-Way Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-50 border-amber-200/60'
            }`}>
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold">
                  Edit E-Way Bill #{editingBill.invoice_number}
                </h3>
              </div>
              <button onClick={() => setEditingBill(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    value={editingBill.vehicle_no || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, vehicle_no: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Estimated Distance (KM) *</label>
                  <input
                    type="number"
                    required
                    value={editingBill.distance_km || 50}
                    onChange={(e) => setEditingBill({ ...editingBill, distance_km: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Transporter GSTIN</label>
                  <input
                    type="text"
                    value={editingBill.transporter_id || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, transporter_id: e.target.value.toUpperCase() })}
                    placeholder="15-digit GSTIN"
                    className={`w-full px-3 py-2 rounded-xl border font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Transporter Name</label>
                  <input
                    type="text"
                    value={editingBill.transporter_name || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, transporter_name: e.target.value })}
                    placeholder="e.g. VRL Logistics"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Transport Mode</label>
                  <select
                    value={editingBill.transport_mode || '1'}
                    onChange={(e) => setEditingBill({ ...editingBill, transport_mode: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="1">🚛 1 - Road</option>
                    <option value="2">🚆 2 - Rail</option>
                    <option value="3">✈️ 3 - Air</option>
                    <option value="4">🚢 4 - Ship</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Transit Status</label>
                  <select
                    value={editingBill.status || 'GENERATED'}
                    onChange={(e) => setEditingBill({ ...editingBill, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="GENERATED">Active Draft</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered / Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Government E-Way Bill No (EBN)</label>
                <input
                  type="text"
                  value={editingBill.eway_bill_no || ''}
                  onChange={(e) => setEditingBill({ ...editingBill, eway_bill_no: e.target.value })}
                  placeholder="12-digit NIC E-Way Bill Number"
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Notes & Route Description</label>
                <textarea
                  rows="2"
                  value={editingBill.notes || ''}
                  onChange={(e) => setEditingBill({ ...editingBill, notes: e.target.value })}
                  placeholder="Optional delivery instructions or transit remarks..."
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Form GST EWB-01 Printable Transit Slip Modal (High Contrast Fonts) */}
      {viewingSlipBill && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-3.5 border-b flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="text-xs font-bold">
                  Official Form GST EWB-01 Delivery Transit Slip
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    try {
                      setIsGeneratingSlipPdf(true);
                      const filename = `TransitSlip_${viewingSlipBill.invoice_number}.pdf`;
                      await exportElementToPdf('printable-transit-slip', filename, { scale: 2, margin: 6 });
                    } catch (e) {
                      console.error('Failed to export transit slip PDF:', e);
                      alert('Could not export PDF directly. Please use Print Slip.');
                    } finally {
                      setIsGeneratingSlipPdf(false);
                    }
                  }}
                  disabled={isGeneratingSlipPdf}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center space-x-1 transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                  } ${isGeneratingSlipPdf ? 'opacity-70 cursor-wait' : ''}`}
                  title="Download Official Form GST EWB-01 Transit Slip PDF"
                >
                  {isGeneratingSlipPdf ? (
                    <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>{isGeneratingSlipPdf ? 'Saving PDF...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button onClick={() => setViewingSlipBill(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* High-Contrast Printable Slip Content */}
            <div className="p-6 overflow-y-auto bg-white text-slate-950 font-sans text-xs">
              <div id="printable-transit-slip" className="border-2 border-black p-4 space-y-4 text-slate-950 bg-white">
                <div className="text-center border-b-2 border-black pb-2">
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-950">E-WAY BILL / DELIVERY TRANSIT MEMO</h2>
                  <p className="text-[10px] text-slate-800 font-bold">Under Rule 138 of Central Goods and Services Tax Rules, 2017</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-2 border-b border-black text-[11px] text-slate-950">
                  <div>
                    <p><b>E-Way Bill System:</b> NIC Form GST EWB-01</p>
                    <p><b>Doc Number:</b> <span className="font-bold font-mono">{viewingSlipBill.invoice_number}</span></p>
                    <p><b>Doc Date:</b> {new Date(viewingSlipBill.created_at).toLocaleDateString('en-IN')}</p>
                    {viewingSlipBill.eway_bill_no && <p><b>Govt EBN:</b> <span className="font-mono font-black text-slate-950">{viewingSlipBill.eway_bill_no}</span></p>}
                  </div>
                  <div className="text-right">
                    <p><b>Valid From:</b> {new Date(viewingSlipBill.created_at).toLocaleDateString('en-IN')}</p>
                    <p><b>Approx Distance:</b> {viewingSlipBill.distance_km || 50} KM</p>
                    <p><b>Vehicle No:</b> <span className="font-mono font-black text-sm text-slate-950">{viewingSlipBill.vehicle_no}</span></p>
                  </div>
                </div>

                {/* Part A */}
                <div>
                  <h4 className="font-black text-xs uppercase bg-slate-200 text-slate-950 px-2 py-1 mb-2 border border-black">PART - A (Consignment Details)</h4>
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-950">
                    <div className="border border-slate-400 p-2 bg-slate-50/50">
                      <p className="font-black text-slate-950">SUPPLIER (FROM):</p>
                      <p className="font-bold text-slate-900">{viewingSlipBill.shop_name || activeShop?.name}</p>
                      <p>GSTIN: <span className="font-mono font-black text-slate-950">{viewingSlipBill.shop_gstin || activeShop?.gstin || '21AAAAA0000A1Z5'}</span></p>
                      <p className="text-slate-800">{activeShop?.address || 'Shop Premise'}, {activeShop?.city || 'City'} - {activeShop?.pincode || '751001'}</p>
                    </div>
                    <div className="border border-slate-400 p-2 bg-slate-50/50">
                      <p className="font-black text-slate-950">RECIPIENT (TO):</p>
                      <p className="font-bold text-slate-900">{viewingSlipBill.customer_name || 'Retail Customer'}</p>
                      <p>GSTIN: <span className="font-mono font-black text-slate-950">{viewingSlipBill.customer_gstin || 'URP'}</span></p>
                      <p className="text-slate-800">Consignment Destination</p>
                    </div>
                  </div>

                  <div className="mt-2 border border-black p-2 bg-slate-100 flex justify-between font-bold text-xs text-slate-950">
                    <span className="font-black">TOTAL INVOICE TRANSIT VALUE:</span>
                    <span className="font-mono text-emerald-800 font-black text-sm">{formatCurrency(viewingSlipBill.total_amount)}</span>
                  </div>
                </div>

                {/* Part B */}
                <div>
                  <h4 className="font-black text-xs uppercase bg-slate-200 text-slate-950 px-2 py-1 mb-2 border border-black">PART - B (Vehicle & Transporter Details)</h4>
                  <div className="grid grid-cols-3 gap-2 border border-slate-400 p-2 text-[11px] text-slate-950 bg-slate-50/50">
                    <div>
                      <span className="text-slate-700 block text-[10px] font-bold">Mode:</span>
                      <b className="font-bold text-slate-950">{getTransportModeLabel(viewingSlipBill.transport_mode)}</b>
                    </div>
                    <div>
                      <span className="text-slate-700 block text-[10px] font-bold">Vehicle No:</span>
                      <b className="font-mono text-sm font-black text-slate-950">{viewingSlipBill.vehicle_no}</b>
                    </div>
                    <div>
                      <span className="text-slate-700 block text-[10px] font-bold">Transporter:</span>
                      <b className="font-bold text-slate-950">{viewingSlipBill.transporter_name || 'Self / Direct Vehicle'}</b>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 text-[10px] text-slate-800 font-medium">
                  <div>
                    <p>Generated by KwikStore Pro POS System</p>
                    <p>Transit Date: {new Date(viewingSlipBill.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b-2 border-black mb-1"></div>
                    <p className="font-black text-slate-950">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. New E-Way Bill Creation Invoice Selector Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-brand-500" />
                <h3 className="text-sm font-bold">Create E-Way Bill for Invoice</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-400">
                Select a recent customer bill/invoice to configure transporter details and generate an official NIC E-Way Bill:
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-xl p-2 border-slate-700/50">
                {recentInvoices.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No recent invoices found.</div>
                ) : (
                  recentInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedInvoiceForNew(inv)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                        selectedInvoiceForNew?.id === inv.id
                          ? 'bg-brand-500/20 border-brand-500'
                          : isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-mono font-bold text-brand-500">#{inv.invoice_number}</div>
                        <div className="text-[11px] text-slate-400">{inv.customer_name || 'Walk-in Customer'} • {inv.created_at || inv.invoice_date}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400">{formatCurrency(inv.grand_total || inv.total_amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedInvoiceForNew}
                  onClick={() => {
                    setIsCreateModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold"
                >
                  Configure Transit & Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trigger EWayBillModal if an invoice is selected for generation */}
      {selectedInvoiceForNew && (
        <EWayBillModal
          invoice={selectedInvoiceForNew}
          onClose={() => {
            setSelectedInvoiceForNew(null);
            fetchEwayBills();
          }}
        />
      )}

      {/* Trigger A4TaxInvoice if preview is requested */}
      {viewingInvoice && (
        <A4TaxInvoice
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
}
