import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useShop } from "../../context/ShopContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  Users, 
  CreditCard, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Share2, 
  Building2, 
  Phone, 
  X, 
  Check, 
  ChevronRight, 
  ChevronDown,
  TrendingUp, 
  FileSpreadsheet,
  Receipt,
  ArrowUpDown,
  ExternalLink
} from "lucide-react";
import { A4TaxInvoice } from "../print/A4TaxInvoice";
import { ThermalReceipt } from "../print/ThermalReceipt";
import { jsPDF } from "jspdf";

export function InvoiceDataView() {
  const { activeShop } = useShop();
  const { isDark } = useTheme();
  const { hasPermission, user } = useAuth();
  const isOwner = Boolean(user && (user.roleKey === "SUPER_ADMIN" || user.roleKey === "owner" || user.roleId === 1));

  // View Mode: "INVOICES" (All Invoices) or "CUSTOMER_WISE" (Customer-Wise View)
  const [viewMode, setViewMode] = useState("INVOICES");

  // Data states
  const [invoices, setInvoices] = useState([]);
  const [customerWiseData, setCustomerWiseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [invoiceType, setInvoiceType] = useState("ALL");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState("ALL");
  const [customerList, setCustomerList] = useState([]);

  // Customer Dropdown State
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const customerDropdownRef = React.useRef(null);

  // Active Modals
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewFormat, setPreviewFormat] = useState("A4");
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    if (isCustomerDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerDropdownOpen]);

  const applyDatePreset = useCallback((preset) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    setDatePreset(preset);

    if (preset === "TODAY") {
      const todayStr = formatDate(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDate(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === "LAST_7_DAYS") {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (preset === "LAST_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    } else if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    }
  }, []);

  useEffect(() => {
    applyDatePreset("THIS_MONTH");
  }, [applyDatePreset]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers?shopId=" + (activeShop?.id || 1));
      if (res.ok) {
        const data = await res.json();
        setCustomerList(data || []);
      }
    } catch (e) {
      console.warn("Customer list load error:", e);
    }
  }, [activeShop]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const fetchInvoices = useCallback(async () => {
    if (!activeShop?.id) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        shopId: activeShop.id,
        limit: "1000"
      });

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (paymentMode !== "ALL") params.append("paymentMode", paymentMode);
      if (paymentStatus !== "ALL") params.append("paymentStatus", paymentStatus);
      if (invoiceType !== "ALL") params.append("invoiceType", invoiceType);
      if (selectedCustomerFilter !== "ALL") params.append("customerId", selectedCustomerFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch("/api/invoices?" + params.toString());
      if (!res.ok) throw new Error("Failed to fetch invoice records");
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Invoice fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeShop, startDate, endDate, paymentMode, paymentStatus, invoiceType, selectedCustomerFilter, search]);

  const fetchCustomerWise = useCallback(async () => {
    if (!activeShop?.id) return;
    try {
      const params = new URLSearchParams({
        shopId: activeShop.id
      });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch("/api/invoices/customer-wise?" + params.toString());
      if (res.ok) {
        const data = await res.json();
        setCustomerWiseData(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn("Customer-wise fetch error:", e);
    }
  }, [activeShop, startDate, endDate, search]);

  useEffect(() => {
    if (viewMode === "INVOICES") {
      fetchInvoices();
    } else {
      fetchCustomerWise();
    }
  }, [viewMode, fetchInvoices, fetchCustomerWise]);

  // Filtered customer list for combobox
  const filteredCustomerList = useMemo(() => {
    if (!customerSearchQuery.trim()) return customerList;
    const q = customerSearchQuery.toLowerCase().trim();
    return customerList.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [customerList, customerSearchQuery]);

  const selectedCustomerObj = useMemo(() => {
    if (selectedCustomerFilter === "ALL") return null;
    return customerList.find(c => String(c.id) === String(selectedCustomerFilter));
  }, [customerList, selectedCustomerFilter]);

  const summaryMetrics = useMemo(() => {
    const list = invoices || [];
    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalGst = 0;

    for (const inv of list) {
      totalSales += (inv.grand_total || 0);
      totalPaid += (inv.amount_paid || 0);
      totalDue += (inv.balance_due || 0);
      totalGst += ((inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0));
    }

    return {
      count: list.length,
      totalSales,
      totalPaid,
      totalDue,
      totalGst
    };
  }, [invoices]);

  const handleOpenPreview = async (inv, defaultFormat = "A4") => {
    try {
      const res = await fetch("/api/invoices/" + inv.id);
      if (res.ok) {
        const fullInvoice = await res.json();
        setPreviewInvoice(fullInvoice);
        setPreviewFormat(defaultFormat);
      } else {
        setPreviewInvoice(inv);
        setPreviewFormat(defaultFormat);
      }
    } catch (e) {
      setPreviewInvoice(inv);
      setPreviewFormat(defaultFormat);
    }
  };

  const handleOpenEdit = async (inv) => {
    try {
      const res = await fetch("/api/invoices/" + inv.id);
      if (res.ok) {
        const fullInvoice = await res.json();
        setEditingInvoice({
          ...fullInvoice,
          customer_name: fullInvoice.customer_name || "Walk-in Customer",
          customer_phone: fullInvoice.customer_phone || "",
          customer_gstin: fullInvoice.customer_gstin || "",
          customer_state_code: fullInvoice.customer_state_code || "07",
          billing_address: fullInvoice.billing_address || "",
          invoice_type: fullInvoice.invoice_type || "RETAIL_B2C",
          payment_mode: fullInvoice.payment_mode || "CASH",
          payment_status: fullInvoice.payment_status || "PAID",
          amount_paid: fullInvoice.amount_paid !== undefined ? fullInvoice.amount_paid : fullInvoice.grand_total,
          balance_due: fullInvoice.balance_due || 0,
          notes: fullInvoice.notes || ""
        });
      } else {
        setEditingInvoice({ ...inv });
      }
    } catch (e) {
      setEditingInvoice({ ...inv });
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch("/api/invoices/" + editingInvoice.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: editingInvoice.customer_name,
          customer_phone: editingInvoice.customer_phone,
          customer_gstin: editingInvoice.customer_gstin,
          customer_state_code: editingInvoice.customer_state_code,
          billing_address: editingInvoice.billing_address,
          invoice_type: editingInvoice.invoice_type,
          payment_mode: editingInvoice.payment_mode,
          payment_status: editingInvoice.payment_status,
          amount_paid: editingInvoice.amount_paid,
          balance_due: editingInvoice.balance_due,
          notes: editingInvoice.notes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update invoice");
      }

      setToastMessage({ type: "success", text: "Invoice #" + editingInvoice.invoice_number + " updated successfully!" });
      setEditingInvoice(null);
      fetchInvoices();
      if (viewMode === "CUSTOMER_WISE") fetchCustomerWise();
    } catch (err) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingInvoice) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/invoices/" + deletingInvoice.id, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete invoice");
      }

      setToastMessage({
        type: "success",
        text: "Invoice #" + deletingInvoice.invoice_number + " moved to Recycle Bin (30-day retention)."
      });
      setDeletingInvoice(null);
      fetchInvoices();
      if (viewMode === "CUSTOMER_WISE") fetchCustomerWise();
    } catch (err) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToExcelCsv = () => {
    if (invoices.length === 0) {
      setToastMessage({ type: "error", text: "No invoice data to export with current filters." });
      return;
    }

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return '"' + s + '"';
    };

    const headers = [
      "Invoice Number",
      "Date & Time",
      "Customer Name",
      "Phone Number",
      "GSTIN",
      "Invoice Type",
      "Payment Mode",
      "Payment Status",
      "Items Count",
      "Subtotal (Rs)",
      "Discount (Rs)",
      "Taxable Amount (Rs)",
      "CGST (Rs)",
      "SGST (Rs)",
      "IGST (Rs)",
      "Round Off (Rs)",
      "Grand Total (Rs)",
      "Amount Paid (Rs)",
      "Balance Due (Rs)",
      "Biller / Cashier",
      "Notes"
    ];

    const rows = invoices.map(inv => [
      escapeCsv(inv.invoice_number),
      escapeCsv(inv.invoice_date ? inv.invoice_date.slice(0, 19) : ""),
      escapeCsv(inv.customer_name || "Walk-in Customer"),
      escapeCsv(inv.customer_phone || ""),
      escapeCsv(inv.customer_gstin || ""),
      escapeCsv(inv.invoice_type || "RETAIL_B2C"),
      escapeCsv(inv.payment_mode || "CASH"),
      escapeCsv(inv.payment_status || "PAID"),
      inv.items_count || 1,
      Number(inv.sub_total || 0).toFixed(2),
      Number(inv.discount_amount || 0).toFixed(2),
      Number(inv.taxable_amount || 0).toFixed(2),
      Number(inv.cgst_amount || 0).toFixed(2),
      Number(inv.sgst_amount || 0).toFixed(2),
      Number(inv.igst_amount || 0).toFixed(2),
      Number(inv.round_off || 0).toFixed(2),
      Number(inv.grand_total || 0).toFixed(2),
      Number(inv.amount_paid || 0).toFixed(2),
      Number(inv.balance_due || 0).toFixed(2),
      escapeCsv(inv.cashier_name || "Store Biller"),
      escapeCsv(inv.notes || "")
    ]);

    rows.push([
      escapeCsv("TOTAL SUMMARY"),
      escapeCsv(summaryMetrics.count + " Invoices"),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      Number(summaryMetrics.totalSales).toFixed(2),
      Number(summaryMetrics.totalPaid).toFixed(2),
      Number(summaryMetrics.totalDue).toFixed(2),
      escapeCsv(""),
      escapeCsv("")
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const shopName = (activeShop?.name || "KwikStore").replace(/[^a-zA-Z0-9]/g, "_");
    link.download = "Invoice_Registry_" + shopName + "_" + (startDate || "All") + "_to_" + (endDate || "Current") + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage({ type: "success", text: "Excel/CSV file exported successfully!" });
  };

  const exportToPdfReport = () => {
    if (invoices.length === 0) {
      setToastMessage({ type: "error", text: "No invoice data to export with current filters." });
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const shopName = activeShop?.name || "KwikStore Pro";

      // 1. Top Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(shopName + " — Invoice Sales Registry", 12, 10);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(203, 213, 225);
      const dateRangeStr = startDate && endDate 
        ? "Period: " + startDate + " to " + endDate 
        : "Generated on: " + new Date().toLocaleString("en-IN");
      doc.text(dateRangeStr + "  •  Payment Filter: " + (paymentStatus !== "ALL" ? paymentStatus : "All Statuses") + "  •  Total Invoices: " + invoices.length, 12, 17);

      // 2. Summary KPI Box
      doc.setFillColor(248, 250, 252);
      doc.rect(12, 27, pageWidth - 24, 13, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(12, 27, pageWidth - 24, 13, "S");

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Total Invoices: " + summaryMetrics.count, 16, 35);

      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text("Total Sales: Rs. " + summaryMetrics.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 72, 35);

      doc.setTextColor(2, 132, 199); // sky-600
      doc.text("Total Paid: Rs. " + summaryMetrics.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 145, 35);

      doc.setTextColor(225, 29, 72); // rose-600
      doc.text("Total Due / Udhar: Rs. " + summaryMetrics.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 215, 35);

      // 3. Table Column Setup (Landscape A4: 297mm total width)
      const colX = [14, 23, 58, 81, 127, 154, 173, 192, 211, 232, 253];
      const headers = ["#", "Invoice No", "Date", "Customer Name", "Phone", "Type", "Mode", "Status", "Total (Rs)", "Paid (Rs)", "Due (Rs)"];

      const drawTableHeader = (currentY) => {
        // High contrast light slate header background with dark border
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(12, currentY, pageWidth - 24, 8, "F");
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.rect(12, currentY, pageWidth - 24, 8, "S");

        doc.setTextColor(15, 23, 42); // slate-900 (crisp black/dark navy)
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");

        headers.forEach((h, i) => {
          doc.text(h, colX[i], currentY + 5.5);
        });
      };

      let y = 43;
      drawTableHeader(y);
      y += 8;

      doc.setFontSize(7.5);
      const invoicesToPrint = invoices.slice(0, 500);

      invoicesToPrint.forEach((inv, index) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          // Header on new page
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, pageWidth, 12, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(shopName + " — Invoice Sales Registry (Continued)", 12, 8);

          y = 15;
          drawTableHeader(y);
          y += 8;
        }

        // Alternating row background
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(12, y, pageWidth - 24, 6.5, "F");
        }

        // Subtle row bottom divider
        doc.setDrawColor(226, 232, 240);
        doc.line(12, y + 6.5, pageWidth - 12, y + 6.5);

        // Row Content
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.text(String(index + 1), colX[0], y + 4.5);

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text(String(inv.invoice_number || ""), colX[1], y + 4.5);

        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        doc.text(String(inv.invoice_date ? inv.invoice_date.slice(0, 10) : ""), colX[2], y + 4.5);
        doc.text(String((inv.customer_name || "Walk-in").slice(0, 23)), colX[3], y + 4.5);
        doc.text(String(inv.customer_phone || "-").slice(0, 13), colX[4], y + 4.5);

        // Type formatted concisely
        const typeLabel = inv.invoice_type === "TAX_INVOICE_B2B" ? "B2B Tax" : "B2C";
        doc.text(typeLabel, colX[5], y + 4.5);

        // Payment Mode
        doc.text(String(inv.payment_mode || "CASH").slice(0, 7), colX[6], y + 4.5);

        // Payment Status Badge Text
        if (inv.payment_status === "PAID") {
          doc.setTextColor(22, 101, 52); // green-700
        } else if (inv.payment_status === "UNPAID") {
          doc.setTextColor(185, 28, 28); // red-700
        } else {
          doc.setTextColor(180, 83, 9); // amber-700
        }
        doc.setFont("helvetica", "bold");
        doc.text(String(inv.payment_status || "PAID"), colX[7], y + 4.5);

        // Amounts
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text(Number(inv.grand_total || 0).toFixed(2), colX[8], y + 4.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(Number(inv.amount_paid || 0).toFixed(2), colX[9], y + 4.5);

        if (Number(inv.balance_due) > 0) {
          doc.setTextColor(225, 29, 72); // rose-600
          doc.setFont("helvetica", "bold");
          doc.text(Number(inv.balance_due || 0).toFixed(2), colX[10], y + 4.5);
        } else {
          doc.setTextColor(148, 163, 184); // slate-400
          doc.setFont("helvetica", "normal");
          doc.text("0.00", colX[10], y + 4.5);
        }

        y += 6.5;
      });

      // Total summary row at bottom
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      doc.setFillColor(241, 245, 249);
      doc.rect(12, y, pageWidth - 24, 7.5, "F");
      doc.setDrawColor(148, 163, 184);
      doc.rect(12, y, pageWidth - 24, 7.5, "S");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("TOTAL SUMMARY (" + invoices.length + " Invoices)", colX[1], y + 5);
      doc.text(Number(summaryMetrics.totalSales).toFixed(2), colX[8], y + 5);
      doc.text(Number(summaryMetrics.totalPaid).toFixed(2), colX[9], y + 5);
      doc.setTextColor(summaryMetrics.totalDue > 0 ? 225 : 15, summaryMetrics.totalDue > 0 ? 29 : 23, summaryMetrics.totalDue > 0 ? 72 : 42);
      doc.text(Number(summaryMetrics.totalDue).toFixed(2), colX[10], y + 5);

      // Page numbers footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "normal");
        doc.text("Generated by " + shopName + " (KwikStore Pro)  •  Page " + i + " of " + pageCount, pageWidth / 2, pageHeight - 5, { align: "center" });
      }

      doc.save("Invoice_Registry_" + (startDate || "Start") + "_to_" + (endDate || "End") + ".pdf");
      setToastMessage({ type: "success", text: "PDF Report downloaded successfully!" });
    } catch (err) {
      console.error("PDF export error:", err);
      setToastMessage({ type: "error", text: "Failed to generate PDF export." });
    }
  };

  const handleDrillDownCustomer = (cust) => {
    if (cust.customer_id && cust.customer_id > 0) {
      setSelectedCustomerFilter(String(cust.customer_id));
      setSearch("");
    } else {
      setSelectedCustomerFilter("ALL");
      setSearch(cust.customer_phone !== "N/A" ? cust.customer_phone : cust.customer_name);
    }
    setViewMode("INVOICES");
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCustomerFilter("ALL");
    setPaymentMode("ALL");
    setPaymentStatus("ALL");
    setInvoiceType("ALL");
    applyDatePreset("THIS_MONTH");
  };

  return (
    <div className={"h-full flex flex-col overflow-hidden font-sans " + (isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      {toastMessage && (
        <div className={"fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition-all animate-bounce " + (
          toastMessage.type === "success" 
            ? "bg-emerald-600 text-white border-emerald-500" 
            : "bg-rose-600 text-white border-rose-500"
        )}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className={"px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 " + (
        isDark ? "bg-slate-900/95 border-slate-800" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Invoice Data & Sales Registry</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-brand-500/15 text-brand-700 dark:text-brand-400 border border-brand-500/30">
                {invoices.length} Bills
              </span>
            </div>
            <p className={"text-xs mt-0.5 " + (isDark ? "text-slate-400" : "text-slate-600 font-medium")}>
              Preview thermal & A4 slips, edit, delete with Recycle Bin protection, export Excel/PDF, and customer-wise view.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* View Toggle Tabs */}
          <div className={"p-1 rounded-xl border flex items-center space-x-1 " + (
            isDark ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-300"
          )}>
            <button
              onClick={() => setViewMode("INVOICES")}
              className={"px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 " + (
                viewMode === "INVOICES"
                  ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md font-extrabold"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-700 hover:text-slate-950 font-semibold"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Invoices</span>
            </button>
            <button
              onClick={() => setViewMode("CUSTOMER_WISE")}
              className={"px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 " + (
                viewMode === "CUSTOMER_WISE"
                  ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md font-extrabold"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-700 hover:text-slate-950 font-semibold"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer-Wise View</span>
            </button>
          </div>

          <button
            onClick={exportToExcelCsv}
            disabled={invoices.length === 0}
            className={"px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border " + (
              invoices.length === 0
                ? "opacity-50 cursor-not-allowed bg-slate-800/40 text-slate-500 border-slate-700"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-600/20"
            )}
            title="Export filtered invoices to Excel / CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={exportToPdfReport}
            disabled={invoices.length === 0}
            className={"px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border " + (
              invoices.length === 0
                ? "opacity-50 cursor-not-allowed bg-slate-800/40 text-slate-500 border-slate-700"
                : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
            )}
            title="Generate structured Printable PDF Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => {
              if (viewMode === "INVOICES") fetchInvoices();
              else fetchCustomerWise();
            }}
            className={"p-2 rounded-xl border transition-all " + (
              isDark 
                ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300" 
                : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm"
            )}
            title="Refresh Invoices"
          >
            <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin text-brand-500" : "")} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        <div className={"p-3.5 rounded-2xl border transition-all " + (
          isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className={"flex items-center justify-between text-xs font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>
            <span>Total Bills</span>
            <FileText className="w-4 h-4 text-brand-600 dark:text-brand-500" />
          </div>
          <div className="text-xl font-black mt-1 text-slate-900 dark:text-white font-mono">{summaryMetrics.count}</div>
          <div className={"text-[11px] font-medium mt-0.5 " + (isDark ? "text-slate-500" : "text-slate-600")}>Matching current filters</div>
        </div>

        <div className={"p-3.5 rounded-2xl border transition-all " + (
          isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className={"flex items-center justify-between text-xs font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>
            <span>Total Sales Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
          </div>
          <div className="text-xl font-black mt-1 text-emerald-700 dark:text-emerald-400 font-mono">
            ₹{summaryMetrics.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={"text-[11px] font-medium mt-0.5 " + (isDark ? "text-slate-500" : "text-slate-600")}>Gross bill revenue</div>
        </div>

        <div className={"p-3.5 rounded-2xl border transition-all " + (
          isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className={"flex items-center justify-between text-xs font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>
            <span>Amount Collected</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-500" />
          </div>
          <div className="text-xl font-black mt-1 text-sky-700 dark:text-sky-400 font-mono">
            ₹{summaryMetrics.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={"text-[11px] font-medium mt-0.5 " + (isDark ? "text-slate-500" : "text-slate-600")}>Cash / UPI / Card paid</div>
        </div>

        <div className={"p-3.5 rounded-2xl border transition-all " + (
          isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className={"flex items-center justify-between text-xs font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>
            <span>Outstanding Udhar</span>
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-500" />
          </div>
          <div className={"text-xl font-black mt-1 font-mono " + (summaryMetrics.totalDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400")}>
            ₹{summaryMetrics.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={"text-[11px] font-medium mt-0.5 " + (isDark ? "text-slate-500" : "text-slate-600")}>Balance due to collect</div>
        </div>

        <div className={"p-3.5 rounded-2xl border transition-all " + (
          isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className={"flex items-center justify-between text-xs font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>
            <span>Total GST Collected</span>
            <IndianRupee className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-black mt-1 text-indigo-700 dark:text-indigo-400 font-mono">
            ₹{summaryMetrics.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={"text-[11px] font-medium mt-0.5 " + (isDark ? "text-slate-500" : "text-slate-600")}>CGST + SGST + IGST</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={"px-6 py-3 border-b flex flex-wrap items-center gap-2.5 text-xs " + (
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-100/90 border-slate-200"
      )}>
        <div className="relative min-w-[220px] flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search Bill #, Customer, Phone, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={"w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-medium outline-none transition-all " + (
              isDark 
                ? "bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:border-brand-500" 
                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-brand-600 shadow-sm"
            )}
          />
        </div>

        <div className="flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <select
            value={datePreset}
            onChange={(e) => applyDatePreset(e.target.value)}
            className={"px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer " + (
              isDark 
                ? "bg-slate-800 border-slate-700 text-white" 
                : "bg-white border-slate-300 text-slate-800 shadow-sm"
            )}
          >
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="ALL">All Time</option>
            <option value="CUSTOM">Custom Dates</option>
          </select>
        </div>

        {datePreset === "CUSTOM" && (
          <div className="flex items-center space-x-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={"px-2 py-1.5 rounded-xl border text-xs font-bold outline-none " + (
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
              )}
            />
            <span className="text-slate-500 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={"px-2 py-1.5 rounded-xl border text-xs font-bold outline-none " + (
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
              )}
            />
          </div>
        )}

        {/* Searchable Customer Combobox */}
        {viewMode === "INVOICES" && (
          <div className="relative" ref={customerDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsCustomerDropdownOpen(prev => !prev);
                setCustomerSearchQuery("");
              }}
              className={"px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all max-w-[220px] " + (
                selectedCustomerObj
                  ? "bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-500/15 dark:border-brand-500/40 dark:text-brand-300 shadow-sm"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700/80"
                    : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-sm"
              )}
              title="Filter by Customer (Searchable with 500+ records support)"
            >
              <Users className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="truncate">
                {selectedCustomerObj ? selectedCustomerObj.name : "All Customers"}
              </span>
              {selectedCustomerObj ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomerFilter("ALL");
                  }}
                  className="p-0.5 hover:bg-rose-500/20 text-rose-500 rounded-full shrink-0"
                  title="Clear Customer Filter"
                >
                  <X className="w-3 h-3" />
                </span>
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              )}
            </button>

            {/* Popover Menu */}
            {isCustomerDropdownOpen && (
              <div className={"absolute left-0 mt-1.5 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden flex flex-col " + (
                isDark 
                  ? "bg-slate-900 border-slate-700 shadow-slate-950 text-white" 
                  : "bg-white border-slate-300 shadow-2xl text-slate-900"
              )}>
                {/* Search input in dropdown */}
                <div className={"p-2.5 border-b flex items-center space-x-2 " + (
                  isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                )}>
                  <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type name, phone, or GSTIN..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className={"w-full bg-transparent text-xs font-semibold outline-none " + (
                      isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                    )}
                  />
                  {customerSearchQuery && (
                    <button
                      onClick={() => setCustomerSearchQuery("")}
                      className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Customer List Scroll Container */}
                <div className="max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {/* All Customers Option */}
                  <button
                    onClick={() => {
                      setSelectedCustomerFilter("ALL");
                      setIsCustomerDropdownOpen(false);
                    }}
                    className={"w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors " + (
                      selectedCustomerFilter === "ALL"
                        ? "bg-brand-50 text-brand-700 font-black dark:bg-brand-600/20 dark:text-brand-300"
                        : isDark ? "hover:bg-slate-800 text-slate-200 font-bold" : "hover:bg-slate-100 text-slate-800 font-bold"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>All Customers</span>
                    </div>
                    {selectedCustomerFilter === "ALL" && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                  </button>

                  {/* Filtered items */}
                  {filteredCustomerList.length === 0 ? (
                    <div className="py-6 px-3 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                      No customer matches "{customerSearchQuery}"
                    </div>
                  ) : (
                    filteredCustomerList.map((c) => {
                      const isSelected = String(selectedCustomerFilter) === String(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerFilter(String(c.id));
                            setIsCustomerDropdownOpen(false);
                          }}
                          className={"w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors " + (
                            isSelected
                              ? "bg-brand-50 text-brand-700 font-black dark:bg-brand-600/25 dark:text-brand-300"
                              : isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-50 text-slate-900"
                          )}
                        >
                          <div className="truncate pr-2">
                            <div className={"font-bold truncate text-xs " + (isDark ? "text-white" : "text-slate-900")}>
                              {c.name}
                            </div>
                            <div className={"text-[11px] font-medium flex items-center space-x-2 mt-0.5 " + (isDark ? "text-slate-400" : "text-slate-600")}>
                              {c.phone && <span>📞 {c.phone}</span>}
                              {c.gstin && <span className="text-indigo-600 dark:text-indigo-400 font-semibold">• GST: {c.gstin}</span>}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer status */}
                <div className={"px-3 py-1.5 border-t text-[11px] font-semibold flex items-center justify-between " + (
                  isDark ? "bg-slate-800/60 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                )}>
                  <span>{customerList.length} total customers</span>
                  {customerSearchQuery && (
                    <span className="text-brand-600 dark:text-brand-400">{filteredCustomerList.length} found</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "INVOICES" && (
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className={"px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer " + (
              isDark 
                ? "bg-slate-800 border-slate-700 text-white" 
                : "bg-white border-slate-300 text-slate-800 shadow-sm"
            )}
          >
            <option value="ALL">All Status</option>
            <option value="PAID">PAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="UNPAID">UNPAID (Udhar)</option>
          </select>
        )}

        {viewMode === "INVOICES" && (
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className={"px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer " + (
              isDark 
                ? "bg-slate-800 border-slate-700 text-white" 
                : "bg-white border-slate-300 text-slate-800 shadow-sm"
            )}
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">CASH</option>
            <option value="UPI">UPI</option>
            <option value="CARD">CARD</option>
            <option value="SPLIT">SPLIT</option>
            <option value="CREDIT">CREDIT (Udhar)</option>
          </select>
        )}

        {viewMode === "INVOICES" && (
          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value)}
            className={"px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer " + (
              isDark 
                ? "bg-slate-800 border-slate-700 text-white" 
                : "bg-white border-slate-300 text-slate-800 shadow-sm"
            )}
          >
            <option value="ALL">All Bill Types</option>
            <option value="RETAIL_B2C">Retail (B2C)</option>
            <option value="TAX_INVOICE_B2B">Tax Invoice (B2B)</option>
            <option value="DELIVERY_CHALLAN">Delivery Challan</option>
            <option value="ESTIMATE">Estimate Slip</option>
          </select>
        )}

        {(search || selectedCustomerFilter !== "ALL" || paymentStatus !== "ALL" || paymentMode !== "ALL" || invoiceType !== "ALL" || datePreset !== "THIS_MONTH") && (
          <button
            onClick={handleClearFilters}
            className={"px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all " + (
              isDark 
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white" 
                : "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white shadow-sm"
            )}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Loading invoice records...</p>
          </div>
        ) : error ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 text-rose-500">
            <AlertCircle className="w-8 h-8" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : viewMode === "INVOICES" ? (
          invoices.length === 0 ? (
            <div className={"h-64 flex flex-col items-center justify-center rounded-2xl border p-8 text-center " + (
              isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
            )}>
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Invoices Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                No invoices match the selected date range or search filters. Try clearing or expanding your search.
              </p>
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className={"rounded-2xl border overflow-hidden shadow-sm " + (
              isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
            )}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={"border-b text-[11px] font-extrabold uppercase tracking-wider " + (
                      isDark ? "bg-slate-800/90 border-slate-700 text-slate-200" : "bg-slate-100 border-slate-300 text-slate-800"
                    )}>
                      <th className="py-3.5 px-4">Invoice #</th>
                      <th className="py-3.5 px-3">Date & Time</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-3">Type</th>
                      <th className="py-3.5 px-3">Mode</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-3 text-right">Items</th>
                      <th className="py-3.5 px-3 text-right">Tax (GST)</th>
                      <th className="py-3.5 px-4 text-right">Grand Total</th>
                      <th className="py-3.5 px-3 text-right">Paid</th>
                      <th className="py-3.5 px-3 text-right">Balance Due</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {invoices.map((inv) => {
                      const totalGst = (inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0);

                      return (
                        <tr
                          key={inv.id}
                          className={"transition-colors group " + (
                            isDark 
                              ? "hover:bg-slate-800/50" 
                              : "hover:bg-slate-50"
                          )}
                        >
                          {/* Invoice Number */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleOpenPreview(inv, "A4")}
                              className="font-mono font-extrabold text-brand-700 dark:text-brand-400 hover:underline flex items-center space-x-1"
                              title="Click to preview A4 Invoice"
                            >
                              <span>#{inv.invoice_number}</span>
                            </button>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {inv.invoice_date ? inv.invoice_date.slice(0, 10) : "N/A"}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {inv.invoice_date ? inv.invoice_date.slice(11, 16) : ""}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                              {inv.customer_name || "Walk-in Customer"}
                            </div>
                            {inv.customer_phone && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold font-mono mt-0.5">
                                📞 {inv.customer_phone}
                              </div>
                            )}
                            {inv.customer_gstin && (
                              <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold font-mono mt-0.5">
                                GST: {inv.customer_gstin}
                              </div>
                            )}
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full border " + (
                              inv.invoice_type === "TAX_INVOICE_B2B"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                                : inv.invoice_type === "DELIVERY_CHALLAN"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30"
                            )}>
                              {inv.invoice_type === "TAX_INVOICE_B2B" ? "B2B GST" : (inv.invoice_type === "DELIVERY_CHALLAN" ? "Challan" : "B2C Retail")}
                            </span>
                          </td>

                          {/* Payment Mode */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={"text-[10px] font-bold px-2 py-0.5 rounded-md " + (
                              inv.payment_mode === "CASH"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                : inv.payment_mode === "UPI"
                                ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400"
                                : inv.payment_mode === "CARD"
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
                                : inv.payment_mode === "CREDIT"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300"
                            )}>
                              {inv.payment_mode}
                            </span>
                          </td>

                          {/* Payment Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={"text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1 w-fit border " + (
                              inv.payment_status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                                : inv.payment_status === "UNPAID"
                                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                                : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                            )}>
                              <span>●</span>
                              <span>{inv.payment_status}</span>
                            </span>
                          </td>

                          {/* Items Count */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {inv.items_count || 1}
                          </td>

                          {/* Tax */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            ₹{totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Grand Total */}
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                            ₹{(inv.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                            ₹{(inv.amount_paid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Due */}
                          <td className="py-3.5 px-3 text-right font-mono">
                            {inv.balance_due > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                                ₹{inv.balance_due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 font-medium">₹0.00</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenPreview(inv, "A4")}
                                className={"p-1.5 rounded-lg border transition-all " + (
                                  isDark 
                                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-brand-400" 
                                    : "bg-white hover:bg-slate-100 border-slate-300 text-brand-700 shadow-sm"
                                )}
                                title="View & Print A4 Tax Invoice"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenPreview(inv, "THERMAL")}
                                className={"p-1.5 rounded-lg border transition-all " + (
                                  isDark 
                                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400" 
                                    : "bg-white hover:bg-slate-100 border-slate-300 text-amber-700 shadow-sm"
                                )}
                                title="View 80mm Thermal Slip"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(inv)}
                                className={"p-1.5 rounded-lg border transition-all " + (
                                  isDark 
                                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400" 
                                    : "bg-white hover:bg-slate-100 border-slate-300 text-sky-700 shadow-sm"
                                )}
                                title="Edit Customer & Payment Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeletingInvoice(inv)}
                                className={"p-1.5 rounded-lg border transition-all " + (
                                  isDark 
                                    ? "bg-slate-800 hover:bg-rose-950/40 border-slate-700 hover:border-rose-700 text-rose-400" 
                                    : "bg-white hover:bg-rose-50 border-slate-300 hover:border-rose-300 text-rose-700 shadow-sm"
                                )}
                                title="Move to Recycle Bin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          customerWiseData.length === 0 ? (
            <div className={"h-64 flex flex-col items-center justify-center rounded-2xl border p-8 text-center " + (
              isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
            )}>
              <Users className="w-12 h-12 text-slate-400 mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Customer Invoice Data</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                No customer billing records match the current filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {customerWiseData.map((cust, idx) => (
                <div
                  key={idx}
                  className={"p-5 rounded-2xl border transition-all flex flex-col justify-between " + (
                    isDark 
                      ? "bg-slate-900/80 hover:bg-slate-900 border-slate-800" 
                      : "bg-white hover:bg-slate-50/80 border-slate-200 shadow-sm"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={"font-extrabold text-base " + (isDark ? "text-white" : "text-slate-900")}>
                          {cust.customer_name}
                        </h3>
                        <div className={"text-xs font-semibold mt-1 flex items-center space-x-2 " + (isDark ? "text-slate-400" : "text-slate-600")}>
                          {cust.customer_phone !== "N/A" && <span>📞 {cust.customer_phone}</span>}
                          {cust.customer_gstin && <span className="text-indigo-600 dark:text-indigo-400 font-bold">• GST: {cust.customer_gstin}</span>}
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-extrabold bg-brand-50 text-brand-700 border border-brand-300 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                        {cust.total_invoices} Bills
                      </span>
                    </div>

                    <div className={"grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl border text-center " + (
                      isDark ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-100/90 border-slate-200"
                    )}>
                      <div>
                        <div className={"text-[11px] font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>Total Billed</div>
                        <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
                          ₹{(cust.total_sales || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div>
                        <div className={"text-[11px] font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>Total Paid</div>
                        <div className="text-xs font-black text-sky-700 dark:text-sky-400 mt-0.5 font-mono">
                          ₹{(cust.total_paid || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div>
                        <div className={"text-[11px] font-bold " + (isDark ? "text-slate-400" : "text-slate-600")}>Udhar Due</div>
                        <div className={"text-xs font-black mt-0.5 font-mono " + (cust.total_balance_due > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500")}>
                          ₹{(cust.total_balance_due || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>

                    {cust.last_invoice_number && (
                      <div className={"mt-3 text-[11px] font-semibold flex items-center justify-between " + (isDark ? "text-slate-400" : "text-slate-600")}>
                        <span>Last Bill: #{cust.last_invoice_number}</span>
                        <span>{cust.last_invoice_date ? cust.last_invoice_date.slice(0, 10) : ""}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleDrillDownCustomer(cust)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-brand-600/15 hover:bg-brand-600 text-brand-700 dark:text-brand-400 hover:text-white border border-brand-500/30 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>View All Customer Bills ({cust.total_invoices})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* FULL INVOICE PREVIEW MODAL */}
      {previewInvoice && previewFormat === "A4" && (
        <A4TaxInvoice
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onSwitchToThermal={() => setPreviewFormat("THERMAL")}
        />
      )}

      {previewInvoice && previewFormat === "THERMAL" && (
        <ThermalReceipt
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onSwitchToA4={() => setPreviewFormat("A4")}
        />
      )}

      {/* EDIT INVOICE MODAL */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={"w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden " + (
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
          )}>
            <div className={"px-6 py-4 border-b flex items-center justify-between " + (
              isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
            )}>
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-brand-500" />
                <h3 className="font-bold text-base">Edit Invoice #{editingInvoice.invoice_number}</h3>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editingInvoice.customer_name}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customer_name: e.target.value })}
                    className={"w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none " + (
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    )}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={editingInvoice.customer_phone}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customer_phone: e.target.value })}
                    className={"w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none " + (
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer GSTIN</label>
                  <input
                    type="text"
                    value={editingInvoice.customer_gstin}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customer_gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className={"w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none uppercase " + (
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Invoice Bill Type</label>
                  <select
                    value={editingInvoice.invoice_type}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, invoice_type: e.target.value })}
                    className={"w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none " + (
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    )}
                  >
                    <option value="RETAIL_B2C">Retail B2C Bill</option>
                    <option value="TAX_INVOICE_B2B">Tax Invoice (B2B)</option>
                    <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                    <option value="ESTIMATE">Estimate Slip</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={editingInvoice.billing_address}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, billing_address: e.target.value })}
                  placeholder="Street address, City, Pincode"
                  className={"w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none " + (
                    isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div className={"p-4 rounded-2xl border space-y-3 " + (
                isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-300"
              )}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>Grand Total</span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    ₹{(editingInvoice.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
                    <select
                      value={editingInvoice.payment_mode}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, payment_mode: e.target.value })}
                      className={"w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none " + (
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900 shadow-sm"
                      )}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">CARD</option>
                      <option value="SPLIT">SPLIT</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingInvoice.amount_paid}
                      onChange={(e) => {
                        const paid = parseFloat(e.target.value) || 0;
                        const due = Math.max(0, (editingInvoice.grand_total || 0) - paid);
                        const status = due <= 0.01 ? "PAID" : (paid > 0 ? "PARTIAL" : "UNPAID");
                        setEditingInvoice({
                          ...editingInvoice,
                          amount_paid: e.target.value,
                          balance_due: due,
                          payment_status: status
                        });
                      }}
                      className={"w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono font-black outline-none " + (
                        isDark ? "bg-slate-800 border-slate-700 text-sky-400" : "bg-white border-slate-300 text-sky-700 shadow-sm"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Balance Due (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingInvoice.balance_due}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, balance_due: parseFloat(e.target.value) || 0 })}
                      className={"w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono font-black outline-none " + (
                        isDark ? "bg-slate-800 border-slate-700 text-rose-400" : "bg-white border-slate-300 text-rose-700 shadow-sm"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Invoice Remarks / Notes</label>
                <input
                  type="text"
                  value={editingInvoice.notes}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                  placeholder="e.g. Dispatched via Express delivery, Verified"
                  className={"w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none " + (
                    isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className={"px-4 py-2 rounded-xl text-xs font-bold border " + (
                    isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg flex items-center space-x-1.5"
                >
                  {isSavingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={"w-full max-w-md rounded-3xl border p-6 shadow-2xl " + (
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">Move Invoice to Recycle Bin?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">Invoice #{deletingInvoice.invoice_number}</strong> (₹{(deletingInvoice.grand_total || 0).toLocaleString("en-IN")}) for <strong>{deletingInvoice.customer_name || "Walk-in"}</strong>?
            </p>

            <div className={"mt-3 p-3 rounded-xl border text-[11px] leading-relaxed " + (
              isDark ? "bg-slate-800/60 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
            )}>
              🛡️ <strong>Safety Net:</strong> This invoice and all its line items will be preserved in the <strong>Recycle Bin</strong> for 30 days and can be restored at any time with 1 click.
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingInvoice(null)}
                className={"px-4 py-2 rounded-xl text-xs font-bold border " + (
                  isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 flex items-center space-x-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Move to Recycle Bin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
