import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { exportToPdf } from '../../utils/pdfExport';
import { A4TaxInvoice } from '../print/A4TaxInvoice';
import { ThermalReceipt } from '../print/ThermalReceipt';
import { OwnerSummaryModal } from './OwnerSummaryModal';
import { EWayBillModal } from '../pos/EWayBillModal';
import { 
  BarChart3, 
  TrendingUp, 
  FileSpreadsheet, 
  DollarSign, 
  Percent, 
  Calendar, 
  FileText,
  CreditCard,
  Banknote,
  Download,
  Filter,
  Search,
  RotateCcw,
  Printer,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Truck
} from 'lucide-react';

export function ReportsView() {
  const { activeShop } = useShop();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const isOwner = Boolean(user && (user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'owner' || user.roleId === 1));

  // Filter States
  const [datePreset, setDatePreset] = useState('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [invoiceType, setInvoiceType] = useState('ALL');
  const [cashierUserId, setCashierUserId] = useState('ALL');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  // UI & Tab States
  const [activeReportTab, setActiveReportTab] = useState('SALES_REGISTER'); // 'SALES_REGISTER', 'PROFIT_LOSS', 'GSTR1_HSN'
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [profitLossData, setProfitLossData] = useState({ summary: { totalRevenue: 0, totalCogs: 0, totalGrossProfit: 0, marginPercent: 0 }, items: [] });
  const [hsnData, setHsnData] = useState([]);
  
  // Invoice Inspection / Print Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printFormat, setPrintFormat] = useState('A4'); // 'A4' or 'THERMAL'
  const [isPrintSummaryModalOpen, setIsPrintSummaryModalOpen] = useState(false);
  const [isOwnerSummaryOpen, setIsOwnerSummaryOpen] = useState(false);
  const [ewayBillInvoice, setEwayBillInvoice] = useState(null);
  const [isExportingSummaryPdf, setIsExportingSummaryPdf] = useState(false);

  const printableSummaryRef = useRef(null);

  const handleDownloadSummaryPdf = async () => {
    if (!printableSummaryRef.current) return;
    setIsExportingSummaryPdf(true);
    try {
      await exportToPdf(printableSummaryRef.current, `Sales_Summary_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to export sales summary PDF:', err);
    } finally {
      setIsExportingSummaryPdf(false);
    }
  };

  // Helper to format ISO date to YYYY-MM-DD
  const formatDateToYMD = (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Set date ranges according to preset
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();

    if (preset === 'TODAY') {
      const todayStr = formatDateToYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDateToYMD(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'THIS_WEEK') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 6);
      setStartDate(formatDateToYMD(past7));
      setEndDate(formatDateToYMD(today));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDateToYMD(firstDay));
      setEndDate(formatDateToYMD(today));
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(formatDateToYMD(firstDay));
      setEndDate(formatDateToYMD(lastDay));
    } else if (preset === 'FY') {
      // Indian Financial Year (April 1 to March 31)
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed (3 is April)
      const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const firstDay = new Date(fyStartYear, 3, 1);
      const lastDay = new Date(fyStartYear + 1, 2, 31);
      setStartDate(formatDateToYMD(firstDay));
      setEndDate(formatDateToYMD(today > lastDay ? lastDay : today));
    } else if (preset === 'CUSTOM') {
      // Keep existing custom dates
    }
  };

  // Initialize dates on mount
  useEffect(() => {
    applyDatePreset('THIS_MONTH');
    loadStaffUsers();
  }, []);

  // Fetch data when filters or shop change
  useEffect(() => {
    if (activeShop && startDate && endDate) {
      loadReportsAndInvoices();
    }
  }, [activeShop, startDate, endDate, paymentMode, paymentStatus, invoiceType, cashierUserId, search, minAmount, maxAmount]);

  const loadStaffUsers = async () => {
    try {
      const res = await fetch('/api/staff/users');
      if (res.ok) setStaffUsers(await res.json());
    } catch (e) {
      console.error('Failed to load staff users', e);
    }
  };

  const loadReportsAndInvoices = async () => {
    setLoading(true);
    try {
      // 1. Dashboard stats
      const statsRes = await fetch(`/api/reports/dashboard-stats?shopId=${activeShop.id}`);
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Filtered Invoices
      const queryParams = new URLSearchParams({
        shopId: activeShop.id,
        startDate,
        endDate,
        paymentMode,
        paymentStatus,
        invoiceType,
        cashierUserId,
        search,
        minAmount,
        maxAmount,
        limit: '1000'
      });

      const invRes = await fetch(`/api/invoices?${queryParams.toString()}`);
      if (invRes.ok) {
        setInvoices(await invRes.json());
      }

      // 3. Profit & Loss Report
      const plRes = await fetch(`/api/reports/profit-loss?shopId=${activeShop.id}&startDate=${startDate}&endDate=${endDate}`);
      if (plRes.ok) {
        setProfitLossData(await plRes.json());
      }

      // 4. HSN Summary Report
      const hsnRes = await fetch(`/api/reports/hsn-summary?shopId=${activeShop.id}&startDate=${startDate}&endDate=${endDate}`);
      if (hsnRes.ok) {
        setHsnData(await hsnRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setPaymentMode('ALL');
    setPaymentStatus('ALL');
    setInvoiceType('ALL');
    setCashierUserId('ALL');
    setMinAmount('');
    setMaxAmount('');
    applyDatePreset('THIS_MONTH');
  };

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (paymentMode !== 'ALL') count++;
    if (paymentStatus !== 'ALL') count++;
    if (invoiceType !== 'ALL') count++;
    if (cashierUserId !== 'ALL') count++;
    if (minAmount || maxAmount) count++;
    if (datePreset === 'CUSTOM') count++;
    return count;
  }, [search, paymentMode, paymentStatus, invoiceType, cashierUserId, minAmount, maxAmount, datePreset]);

  // Aggregate Calculations over Filtered Data
  const summary = useMemo(() => {
    let turnover = 0;
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let paid = 0;
    let balanceDue = 0;
    let cash = 0;
    let upi = 0;
    let card = 0;
    let credit = 0;
    let b2bCount = 0;
    let b2cCount = 0;

    for (const inv of invoices) {
      const gTotal = inv.grand_total || 0;
      turnover += gTotal;
      taxable += (inv.taxable_amount || 0);
      cgst += (inv.cgst_amount || 0);
      sgst += (inv.sgst_amount || 0);
      igst += (inv.igst_amount || 0);
      paid += (inv.amount_paid || 0);
      balanceDue += (inv.balance_due || 0);

      if (inv.invoice_type === 'TAX_INVOICE_B2B') b2bCount++;
      else b2cCount++;

      // Payment mode split
      if (inv.payment_mode === 'CASH') cash += gTotal;
      else if (inv.payment_mode === 'UPI') upi += gTotal;
      else if (inv.payment_mode === 'CARD') card += gTotal;
      else if (inv.payment_mode === 'CREDIT') credit += gTotal;
      else if (inv.payment_mode === 'SPLIT' && inv.payment_details_json) {
        try {
          const split = JSON.parse(inv.payment_details_json);
          cash += (split.cash || 0);
          upi += (split.upi || 0);
          card += (split.card || 0);
        } catch (e) {
          cash += gTotal;
        }
      } else {
        cash += gTotal;
      }
    }

    const totalGst = cgst + sgst + igst;
    const avgBill = invoices.length > 0 ? turnover / invoices.length : 0;

    return {
      turnover,
      taxable,
      cgst,
      sgst,
      igst,
      totalGst,
      paid,
      balanceDue,
      avgBill,
      cash,
      upi,
      card,
      credit,
      b2bCount,
      b2cCount,
      count: invoices.length
    };
  }, [invoices]);

  // Open Invoice in Modal for Viewing / Printing
  const handleViewInvoice = async (invId) => {
    // 1. Instant selection from local list so popup shows immediately
    const localInv = invoices.find(i => i.id === invId || i.invoice_number === invId);
    if (localInv) {
      setSelectedInvoice(localInv);
    }

    // 2. Fetch full line items, batch, barcode & terms from server
    try {
      const res = await fetch(`/api/invoices/${invId}`);
      if (res.ok) {
        const fullInv = await res.json();
        if (fullInv && (fullInv.id || fullInv.invoice_number)) {
          setSelectedInvoice(fullInv);
        }
      }
    } catch (e) {
      console.warn('Notice fetching full invoice details:', e.message);
    }
  };

  // Helper for CSV escaping
  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  // 1. Export Standard Sales Register CSV / Excel
  const exportSalesRegisterCsv = () => {
    if (invoices.length === 0) {
      alert('No invoices found in the selected filter range to export.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer Phone',
      'Customer GSTIN',
      'Invoice Type',
      'Payment Mode',
      'Payment Status',
      'Taxable Amount (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total GST (INR)',
      'Round Off (INR)',
      'Grand Total (INR)',
      'Amount Paid (INR)',
      'Balance Due (INR)',
      'Biller Name'
    ];

    const rows = invoices.map(inv => [
      escapeCsv(inv.invoice_number),
      escapeCsv(inv.invoice_date?.slice(0, 19)),
      escapeCsv(inv.customer_name || 'Walk-in Customer'),
      escapeCsv(inv.customer_phone || ''),
      escapeCsv(inv.customer_gstin || ''),
      escapeCsv(inv.invoice_type),
      escapeCsv(inv.payment_mode),
      escapeCsv(inv.payment_status),
      (inv.taxable_amount || 0).toFixed(2),
      (inv.cgst_amount || 0).toFixed(2),
      (inv.sgst_amount || 0).toFixed(2),
      (inv.igst_amount || 0).toFixed(2),
      ((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0)).toFixed(2),
      (inv.round_off || 0).toFixed(2),
      (inv.grand_total || 0).toFixed(2),
      (inv.amount_paid || 0).toFixed(2),
      (inv.balance_due || 0).toFixed(2),
      escapeCsv(inv.cashier_name || 'Biller')
    ]);

    // Add Summary Total Row
    rows.push([
      escapeCsv('TOTALS'),
      escapeCsv(`${summary.count} Invoices`),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      summary.taxable.toFixed(2),
      summary.cgst.toFixed(2),
      summary.sgst.toFixed(2),
      summary.igst.toFixed(2),
      summary.totalGst.toFixed(2),
      '0.00',
      summary.turnover.toFixed(2),
      summary.paid.toFixed(2),
      summary.balanceDue.toFixed(2),
      escapeCsv('')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_Register_${activeShop?.name || 'Shop'}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // 2. Export GSTR-1 Ready Format CSV
  const exportGstr1Csv = () => {
    if (invoices.length === 0) {
      alert('No invoices available to generate GSTR-1.');
      return;
    }

    const headers = [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Place Of Supply',
      'Reverse Charge',
      'Applicable % of Tax Rate',
      'Invoice Type',
      'E-Commerce GSTIN',
      'Rate',
      'Taxable Value',
      'Cess Amount'
    ];

    const rows = invoices.map(inv => {
      const isB2B = inv.customer_gstin && inv.customer_gstin.trim().length >= 10;
      const rate = inv.taxable_amount > 0 
        ? Math.round((((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0)) / inv.taxable_amount) * 100) 
        : 18;

      return [
        escapeCsv(inv.customer_gstin || 'URP'),
        escapeCsv(inv.customer_name || 'Consumer'),
        escapeCsv(inv.invoice_number),
        escapeCsv(inv.invoice_date?.slice(0, 10)),
        (inv.grand_total || 0).toFixed(2),
        escapeCsv(inv.customer_state_code || activeShop?.state_code || '07'),
        escapeCsv('N'),
        escapeCsv(''),
        escapeCsv(isB2B ? 'Regular' : 'B2C'),
        escapeCsv(''),
        `${rate}%`,
        (inv.taxable_amount || 0).toFixed(2),
        '0.00'
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR1_Sales_Report_${activeShop?.name || 'Shop'}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // 3. Export Profit & Loss Report CSV
  const exportProfitLossCsv = () => {
    if (!profitLossData || !profitLossData.items || profitLossData.items.length === 0) {
      alert('No profit & loss data available in the selected date range.');
      return;
    }

    const headers = [
      'Product / Item Name',
      'Unit',
      'Sold Quantity',
      'Average Selling Price (INR)',
      'Unit Purchase Cost (INR)',
      'Total Sales Revenue (INR)',
      'Total Cost of Goods Sold - COGS (INR)',
      'Gross Profit (INR)',
      'Gross Margin (%)'
    ];

    const rows = profitLossData.items.map(item => {
      const margin = item.total_sales_revenue > 0 ? ((item.gross_profit / item.total_sales_revenue) * 100).toFixed(2) : '0.00';
      return [
        escapeCsv(item.item_name),
        escapeCsv(item.unit || 'PCS'),
        item.sold_qty,
        (item.avg_selling_price || 0).toFixed(2),
        (item.unit_purchase_cost || 0).toFixed(2),
        (item.total_sales_revenue || 0).toFixed(2),
        (item.total_cogs || 0).toFixed(2),
        (item.gross_profit || 0).toFixed(2),
        `${margin}%`
      ];
    });

    // Summary Row
    rows.push([
      escapeCsv('TOTAL PROFIT / LOSS SUMMARY'),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      (profitLossData.summary?.totalRevenue || 0).toFixed(2),
      (profitLossData.summary?.totalCogs || 0).toFixed(2),
      (profitLossData.summary?.totalGrossProfit || 0).toFixed(2),
      `${(profitLossData.summary?.marginPercent || 0).toFixed(2)}%`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Profit_Loss_Report_${activeShop?.name || 'Shop'}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // 4. Export HSN / SAC Summary CSV
  const exportHsnSummaryCsv = () => {
    if (!hsnData || hsnData.length === 0) {
      alert('No HSN summary data available in the selected date range.');
      return;
    }

    const headers = [
      'HSN / SAC Code',
      'Unit of Measurement (UQC)',
      'GST Tax Rate (%)',
      'Total Quantity',
      'Total Invoice Value (INR)',
      'Taxable Value (INR)',
      'Integrated Tax (IGST INR)',
      'Central Tax (CGST INR)',
      'State Tax (SGST INR)',
      'Total GST Tax (INR)'
    ];

    let sumQty = 0, sumVal = 0, sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumTax = 0;

    const rows = hsnData.map(row => {
      const totalTax = (row.total_cgst || 0) + (row.total_sgst || 0) + (row.total_igst || 0);
      sumQty += (row.total_qty || 0);
      sumVal += (row.total_value || 0);
      sumTaxable += (row.taxable_value || 0);
      sumCgst += (row.total_cgst || 0);
      sumSgst += (row.total_sgst || 0);
      sumIgst += (row.total_igst || 0);
      sumTax += totalTax;

      return [
        escapeCsv(row.hsn_code),
        escapeCsv(row.unit || 'PCS'),
        `${row.tax_rate}%`,
        row.total_qty,
        (row.total_value || 0).toFixed(2),
        (row.taxable_value || 0).toFixed(2),
        (row.total_igst || 0).toFixed(2),
        (row.total_cgst || 0).toFixed(2),
        (row.total_sgst || 0).toFixed(2),
        totalTax.toFixed(2)
      ];
    });

    rows.push([
      escapeCsv('TOTAL HSN SUMMARY'),
      escapeCsv(''),
      escapeCsv(''),
      sumQty,
      sumVal.toFixed(2),
      sumTaxable.toFixed(2),
      sumIgst.toFixed(2),
      sumCgst.toFixed(2),
      sumSgst.toFixed(2),
      sumTax.toFixed(2)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HSN_GST_Summary_${activeShop?.name || 'Shop'}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Header & Export Toolbar */}
      <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Sales Analytics & GSTR-1 Tax Reports
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              {activeShop?.name}
            </span>
            {isOwner && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Owner Access: Full Export & Reports
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Comprehensive sales register, GST liability breakdown, multi-channel payment logs, and dynamic reports.
          </p>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center space-x-2 relative">
          {/* Day-End Owner Summary Button */}
          <button
            onClick={() => setIsOwnerSummaryOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 transition-all"
            title="Open Day-End Business Overview & WhatsApp Summary"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Owner Day Summary</span>
          </button>

          {/* Printable Report Summary */}
          <button
            onClick={() => setIsPrintSummaryModalOpen(true)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
            }`}
            title="Print Full Sales Summary & Ledger"
          >
            <Printer className="w-3.5 h-3.5 text-brand-500" />
            <span>Print Summary</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Reports</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showExportMenu && (
              <div className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="px-3 py-2 border-b text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Export Format
                </div>

                <button
                  onClick={exportSalesRegisterCsv}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center space-x-2 transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold">Sales Register (Excel / CSV)</div>
                    <div className="text-[10px] text-slate-400">Detailed itemized sales ledger</div>
                  </div>
                </button>

                <button
                  onClick={exportProfitLossCsv}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center space-x-2 transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold">Profit & Loss Report (CSV)</div>
                    <div className="text-[10px] text-slate-400">Gross profit & item margins</div>
                  </div>
                </button>

                <button
                  onClick={exportHsnSummaryCsv}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center space-x-2 transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <div className="font-bold">HSN / SAC Summary (CSV)</div>
                    <div className="text-[10px] text-slate-400">HSN-wise GST summary</div>
                  </div>
                </button>

                <button
                  onClick={exportGstr1Csv}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center space-x-2 transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Percent className="w-4 h-4 text-cyan-500 shrink-0" />
                  <div>
                    <div className="font-bold">GSTR-1 Ready Format (CSV)</div>
                    <div className="text-[10px] text-slate-400">B2B & B2C GST portal compliant</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setIsPrintSummaryModalOpen(true);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center space-x-2 border-t transition-colors ${
                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-200' : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <div className="font-bold">A4 Sales Report PDF View</div>
                    <div className="text-[10px] text-slate-400">Printable monthly/daily summary</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar & Date Presets */}
      <div className={`p-4 border-b space-y-3 shrink-0 ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Range Preset Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-cyan-500" />
              Period:
            </span>
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'FY', label: 'FY 2026-27' },
              { id: 'CUSTOM', label: 'Custom' }
            ].map(preset => {
              const isSelected = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyDatePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25'
                      : isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Date Picker Range (Always active, editable for custom) */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setStartDate(e.target.value);
                }}
                className={`border rounded-xl px-2.5 py-1 text-xs font-mono font-medium outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setEndDate(e.target.value);
                }}
                className={`border rounded-xl px-2.5 py-1 text-xs font-mono font-medium outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Toggle Advanced Filters Button */}
            <button
              onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1 transition-all ${
                activeFilterCount > 0
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-600 text-white text-[10px] flex items-center justify-center ml-1">
                  {activeFilterCount}
                </span>
              )}
              {isAdvancedFilterOpen ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Advanced Filters Drawer */}
        {isAdvancedFilterOpen && (
          <div className={`p-4 rounded-2xl border space-y-3 animate-in fade-in slide-in-from-top-2 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              {/* Search input */}
              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1 font-semibold">Search Invoices</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Invoice #, Customer, Phone, GSTIN..."
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 outline-none font-medium cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Payment Modes</option>
                  <option value="CASH">Cash Only</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CREDIT">Customer Khata (Credit / Udhar)</option>
                  <option value="SPLIT">Split Multi-Pay</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 outline-none font-medium cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">Paid (Fully Settled)</option>
                  <option value="PARTIAL">Partial (Outstanding Due)</option>
                  <option value="UNPAID">Unpaid (Full Udhar)</option>
                </select>
              </div>

              {/* Invoice Type */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Invoice Type</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 outline-none font-medium cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Invoice Types</option>
                  <option value="RETAIL_B2C">Retail B2C Bill</option>
                  <option value="TAX_INVOICE_B2B">Tax Invoice B2B (GST)</option>
                  <option value="CHALLAN">Delivery Challan</option>
                  <option value="ESTIMATE">Quotation / Estimate</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/40 text-xs">
              {/* Biller / Cashier Filter */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Biller / Cashier</label>
                <select
                  value={cashierUserId}
                  onChange={(e) => setCashierUserId(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 outline-none font-medium cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Staff / Billers</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.display_name} ({u.role_name || 'Staff'})</option>
                  ))}
                </select>
              </div>

              {/* Min & Max Amount */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Min Amount (₹)</label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className={`w-full border rounded-xl px-3 py-2 font-mono outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Max Amount (₹)</label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className={`w-full border rounded-xl px-3 py-2 font-mono outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Reset Filter Button */}
              <div className="flex items-end justify-end">
                <button
                  onClick={handleResetFilters}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reports Sub-Navigation Tabs */}
      <div className={`px-6 border-b flex items-center space-x-2 shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {[
          { id: 'SALES_REGISTER', label: 'Sales Register & Invoices', icon: FileSpreadsheet },
          { id: 'PROFIT_LOSS', label: 'Profit & Loss Analysis', icon: DollarSign },
          { id: 'GSTR1_HSN', label: 'GSTR-1 & HSN Summary', icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                isActive
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeReportTab === 'SALES_REGISTER' && (
          <div className="space-y-6">
            {/* Dynamic Summary KPI Cards (Computed strictly for the active filter range) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Filtered Turnover */}
          <div className={`p-4 rounded-xl border space-y-1 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
              <span>Filtered Sales Turnover</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-brand-600 dark:text-brand-400 font-mono">
              ₹{summary.turnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>{summary.count} Bills Generated</span>
              <span className="font-mono">Avg: ₹{summary.avgBill.toFixed(0)}/bill</span>
            </div>
          </div>

          {/* Card 2: GST Tax Liability */}
          <div className={`p-4 rounded-xl border space-y-1 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
              <span>GST Tax Collected</span>
              <Percent className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              ₹{summary.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Taxable: ₹{summary.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Card 3: Paid vs Outstanding Udhar */}
          <div className={`p-4 rounded-xl border space-y-1 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
              <span>Amount Received (Paid)</span>
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{summary.paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-rose-500 font-mono font-semibold">
              Balance Due: ₹{summary.balanceDue.toFixed(2)}
            </div>
          </div>

          {/* Card 4: Inventory Asset Valuation */}
          <div className={`p-4 rounded-xl border space-y-1 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
              <span>Total Stock Value (MRP)</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-500 font-mono">
              ₹{(stats?.stockValuationMrp || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              At Cost: ₹{(stats?.stockValuationCost || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* GST Tax Breakdown Summary & Multi-Channel Payment Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GST Tax Summary Box (2 Cols) */}
          <div className={`lg:col-span-2 p-5 rounded-2xl border shadow-lg space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <FileSpreadsheet className="w-4 h-4 text-cyan-500" />
                <span>GSTR-1 Tax Breakdown Summary</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {startDate} to {endDate}
              </span>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t text-xs font-mono ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CGST (Central Tax):</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{summary.cgst.toFixed(2)}</span>
              </div>
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SGST (State Tax):</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{summary.sgst.toFixed(2)}</span>
              </div>
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>IGST (Inter-State):</span>
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">₹{summary.igst.toFixed(2)}</span>
              </div>
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total GST Liability:</span>
                <span className="text-sm font-black text-brand-600 dark:text-brand-400">₹{summary.totalGst.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Modes Breakdown (1 Col) */}
          <div className={`p-5 rounded-2xl border shadow-lg space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Payment Mode Breakdown</span>
            </h2>

            <div className={`space-y-2 pt-2 border-t text-xs font-mono ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-500" /> Cash:
                </span>
                <span className="font-bold">₹{summary.cash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-cyan-500" /> UPI / QR:
                </span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">₹{summary.upi.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-500" /> Card / POS:
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400">₹{summary.card.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-1 border-slate-800/40">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Udhar / Credit:
                </span>
                <span className="font-bold text-rose-500">₹{summary.credit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtered Sales Invoices Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-bold uppercase tracking-wider flex items-center space-x-2 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <span>Sales Invoices</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">
                {invoices.length} Found
              </span>
            </h2>
            <span className="text-xs text-slate-400">
              Showing filtered records from {startDate} to {endDate}
            </span>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-lg ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
          }`}>
            <table className="w-full text-left text-xs font-mono">
              <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">GST Tax (₹)</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Biller</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
                      <p className="font-semibold">No sales invoices found matching your filter criteria.</p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs text-cyan-500 hover:underline font-bold"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const totalTax = (inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0);
                    return (
                      <tr 
                        key={inv.id} 
                        onClick={() => handleViewInvoice(inv.id)}
                        className={`cursor-pointer transition-colors ${
                          isDark ? 'hover:bg-slate-800/60' : 'hover:bg-cyan-50/50'
                        }`}
                      >
                        {/* Invoice Number */}
                        <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'} group`}>
                          <span className="text-cyan-600 dark:text-cyan-400 hover:underline">
                            {inv.invoice_number}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {inv.invoice_date?.slice(0, 16)}
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4">
                          <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {inv.customer_name || 'Walk-in Customer'}
                          </div>
                          {inv.customer_phone && (
                            <div className="text-[10px] text-slate-400 font-mono">{inv.customer_phone}</div>
                          )}
                          {inv.customer_gstin && (
                            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                              GSTIN: {inv.customer_gstin}
                            </div>
                          )}
                        </td>

                        {/* Invoice Type */}
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            inv.invoice_type === 'TAX_INVOICE_B2B'
                              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {inv.invoice_type}
                          </span>
                        </td>

                        {/* Taxable Value */}
                        <td className="py-3 px-4 text-right font-mono text-slate-400 text-xs">
                          ₹{(inv.taxable_amount || 0).toFixed(2)}
                        </td>

                        {/* GST Tax */}
                        <td className="py-3 px-4 text-right font-mono text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
                          ₹{totalTax.toFixed(2)}
                        </td>

                        {/* Grand Total */}
                        <td className="py-3 px-4 text-right font-mono font-black text-brand-600 dark:text-brand-400 text-sm">
                          ₹{inv.grand_total?.toFixed(2)}
                        </td>

                        {/* Payment */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            inv.payment_status === 'PAID' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                          }`}>
                            {inv.payment_status} ({inv.payment_mode})
                          </span>
                        </td>

                        {/* Biller */}
                        <td className="py-3 px-4 text-slate-400 text-xs">
                          {inv.cashier_name || 'Biller'}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewInvoice(inv.id);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-400 hover:text-cyan-300' 
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-cyan-600 hover:text-cyan-700'
                              }`}
                              title="View & Print GST Invoice"
                            >
                              <Eye className="w-3.5 h-3.5 pointer-events-none" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEwayBillInvoice(inv);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 hover:text-amber-300' 
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-amber-600 hover:text-amber-700'
                              }`}
                              title="Generate NIC E-Way Bill & E-Invoice JSON"
                            >
                              <Truck className="w-3.5 h-3.5 pointer-events-none" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

        {/* TAB 2: Profit & Loss Analysis */}
        {activeReportTab === 'PROFIT_LOSS' && (
          <div className="space-y-6">
            {/* P&L Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Revenue */}
              <div className={`p-4 rounded-xl border space-y-1 transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                  <span>Net Sales Revenue</span>
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  ₹{(profitLossData.summary?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">
                  Taxable turnover from all sales
                </div>
              </div>

              {/* COGS */}
              <div className={`p-4 rounded-xl border space-y-1 transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                  <span>Cost of Goods Sold (COGS)</span>
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-black text-amber-500 font-mono">
                  ₹{(profitLossData.summary?.totalCogs || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">
                  Direct purchase procurement cost
                </div>
              </div>

              {/* Gross Profit */}
              <div className={`p-4 rounded-xl border space-y-1 transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                  <span>Total Gross Profit</span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className={`text-xl font-black font-mono ${
                  (profitLossData.summary?.totalGrossProfit || 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
                }`}>
                  ₹{(profitLossData.summary?.totalGrossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">
                  Revenue minus direct COGS
                </div>
              </div>

              {/* Gross Margin % */}
              <div className={`p-4 rounded-xl border space-y-1 transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                  <span>Overall Gross Margin %</span>
                  <Percent className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                  {(profitLossData.summary?.marginPercent || 0).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-400">
                  Gross profit percentage on sales
                </div>
              </div>
            </div>

            {/* Itemized Profit & Margin Breakdown Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h2 className={`text-sm font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Item-wise Profit Margin Analysis
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">
                    {profitLossData.items?.length || 0} Products
                  </span>
                </div>
                <button
                  onClick={exportProfitLossCsv}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export P&L (CSV)</span>
                </button>
              </div>

              <div className={`border rounded-xl overflow-hidden shadow-lg ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
              }`}>
                <table className="w-full text-left text-xs font-mono">
                  <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                    isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3 px-4">Item / Product Name</th>
                      <th className="py-3 px-4 text-center">Unit</th>
                      <th className="py-3 px-4 text-right">Qty Sold</th>
                      <th className="py-3 px-4 text-right">Avg Selling Rate (₹)</th>
                      <th className="py-3 px-4 text-right">Unit Cost (₹)</th>
                      <th className="py-3 px-4 text-right">Sales Revenue (₹)</th>
                      <th className="py-3 px-4 text-right">Total COGS (₹)</th>
                      <th className="py-3 px-4 text-right">Gross Profit (₹)</th>
                      <th className="py-3 px-4 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {(!profitLossData.items || profitLossData.items.length === 0) ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
                          <p className="font-semibold">No sales or purchase cost records found for the selected date range.</p>
                        </td>
                      </tr>
                    ) : (
                      profitLossData.items.map((item, idx) => {
                        const margin = item.total_sales_revenue > 0 ? (item.gross_profit / item.total_sales_revenue) * 100 : 0;
                        return (
                          <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className={`py-3 px-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {item.item_name}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                              {item.unit || 'PCS'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                              {item.sold_qty}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">
                              ₹{(item.avg_selling_price || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">
                              ₹{(item.unit_purchase_cost || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                              ₹{(item.total_sales_revenue || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-amber-500">
                              ₹{(item.total_cogs || 0).toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${
                              item.gross_profit >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              ₹{(item.gross_profit || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                margin >= 30 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : margin >= 15 
                                    ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                                    : margin >= 0
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}>
                                {margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GSTR-1 & HSN Summary */}
        {activeReportTab === 'GSTR1_HSN' && (
          <div className="space-y-6">
            {/* Top Action & Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  HSN / SAC Tax Breakdown for GSTR-1 Filing
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aggregated by Harmonized System of Nomenclature (HSN) and GST tax rates.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={exportHsnSummaryCsv}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 transition-all"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>HSN Summary (CSV)</span>
                </button>
                <button
                  onClick={exportGstr1Csv}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>GSTR-1 Portal Format (CSV)</span>
                </button>
              </div>
            </div>

            {/* HSN Summary Table */}
            <div className={`border rounded-xl overflow-hidden shadow-lg ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
            }`}>
              <table className="w-full text-left text-xs font-mono">
                <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                  isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">HSN / SAC Code</th>
                    <th className="py-3 px-4 text-center">Unit (UQC)</th>
                    <th className="py-3 px-4 text-center">GST Rate (%)</th>
                    <th className="py-3 px-4 text-right">Total Qty</th>
                    <th className="py-3 px-4 text-right">Total Value (₹)</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-3 px-4 text-right">CGST (₹)</th>
                    <th className="py-3 px-4 text-right">SGST (₹)</th>
                    <th className="py-3 px-4 text-right">IGST (₹)</th>
                    <th className="py-3 px-4 text-right">Total GST Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {hsnData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
                        <p className="font-semibold">No HSN items recorded in invoices for the selected date range.</p>
                      </td>
                    </tr>
                  ) : (
                    hsnData.map((row, idx) => {
                      const totalTax = (row.total_cgst || 0) + (row.total_sgst || 0) + (row.total_igst || 0);
                      return (
                        <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {row.hsn_code}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                            {row.unit || 'PCS'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {row.tax_rate}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            {row.total_qty}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-300">
                            ₹{(row.total_value || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            ₹{(row.taxable_value || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-500">
                            ₹{(row.total_cgst || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-500">
                            ₹{(row.total_sgst || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-sky-500">
                            ₹{(row.total_igst || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-brand-600 dark:text-brand-400">
                            ₹{totalTax.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail / Print Modal (A4 Tax Invoice or Thermal Receipt) */}
      {selectedInvoice && (
        printFormat === 'THERMAL' ? (
          <ThermalReceipt
            invoice={selectedInvoice}
            onClose={() => { setSelectedInvoice(null); setPrintFormat('A4'); }}
            onPrint={() => window.print()}
            onSwitchToA4={() => setPrintFormat('A4')}
          />
        ) : (
          <A4TaxInvoice
            invoice={selectedInvoice}
            onClose={() => { setSelectedInvoice(null); setPrintFormat('A4'); }}
            onPrint={() => window.print()}
            onSwitchToThermal={() => setPrintFormat('THERMAL')}
          />
        )
      )}

      {/* Printable Sales Summary Modal */}
      {isPrintSummaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Top Bar */}
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-cyan-500" />
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Sales Summary & Tax Statement
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeShop?.name} • Period: {startDate} to {endDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={handleDownloadSummaryPdf}
                  disabled={isExportingSummaryPdf}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingSummaryPdf ? 'Exporting...' : 'PDF'}</span>
                </button>
                <button
                  onClick={() => setIsPrintSummaryModalOpen(false)}
                  className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div 
              id="printable-sales-summary"
              ref={printableSummaryRef}
              className={`p-6 overflow-y-auto space-y-6 text-xs font-sans ${
                isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'
              }`}
            >
              {/* Report Header */}
              <div className="text-center border-b pb-4 space-y-1 border-slate-200 dark:border-slate-800">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {activeShop?.name}
                </h1>
                <p className="text-xs text-slate-500">
                  {activeShop?.address}, {activeShop?.city}, {activeShop?.state} - GSTIN: <strong>{activeShop?.gstin || 'N/A'}</strong>
                </p>
                <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-xs mt-1">
                  Sales Register & Tax Statement • {startDate} to {endDate}
                </div>
              </div>

              {/* KPI Summary Matrix */}
              <div className="grid grid-cols-4 gap-3 font-mono text-center">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-[10px] text-slate-400 uppercase">Total Sales</div>
                  <div className="text-base font-black text-brand-600 dark:text-brand-400">₹{summary.turnover.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">{summary.count} Invoices</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-[10px] text-slate-400 uppercase">Taxable Sales</div>
                  <div className="text-base font-bold text-slate-700 dark:text-slate-300">₹{summary.taxable.toFixed(2)}</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-[10px] text-slate-400 uppercase">GST Tax Liability</div>
                  <div className="text-base font-black text-cyan-600 dark:text-cyan-400">₹{summary.totalGst.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">CGST+SGST+IGST</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-[10px] text-slate-400 uppercase">Udhar Outstanding</div>
                  <div className="text-base font-bold text-rose-500">₹{summary.balanceDue.toFixed(2)}</div>
                </div>
              </div>

              {/* Invoices List Table */}
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Taxable</th>
                    <th className="p-2 text-right">GST</th>
                    <th className="p-2 text-right">Grand Total</th>
                    <th className="p-2">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="p-2 font-bold">{inv.invoice_number}</td>
                      <td className="p-2 text-slate-500">{inv.invoice_date?.slice(0, 10)}</td>
                      <td className="p-2 font-sans">{inv.customer_name}</td>
                      <td className="p-2">{inv.invoice_type}</td>
                      <td className="p-2 text-right">₹{(inv.taxable_amount || 0).toFixed(2)}</td>
                      <td className="p-2 text-right">₹{((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0)).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold text-brand-600 dark:text-brand-400">₹{inv.grand_total?.toFixed(2)}</td>
                      <td className="p-2">{inv.payment_mode} ({inv.payment_status})</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-4 text-center text-slate-400 font-sans">No invoices found for selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="text-right text-[11px] text-slate-400 pt-2">
                Report generated on {new Date().toLocaleString()} by {user?.displayName || 'Shop Owner'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Owner Day-End Summary Modal */}
      <OwnerSummaryModal
        isOpen={isOwnerSummaryOpen}
        onClose={() => setIsOwnerSummaryOpen(false)}
      />

      {/* E-Way Bill & E-Invoice Generator Modal */}
      {ewayBillInvoice && (
        <EWayBillModal
          invoice={ewayBillInvoice}
          onClose={() => setEwayBillInvoice(null)}
        />
      )}
    </div>
  );
}
