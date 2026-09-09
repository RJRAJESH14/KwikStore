import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Share2, 
  Printer, 
  Edit3, 
  Trash2, 
  Building2, 
  Users, 
  UserPlus, 
  Send, 
  Sparkles, 
  Check, 
  X, 
  Percent, 
  ShoppingCart, 
  Eye, 
  RotateCcw, 
  AlertCircle, 
  ArrowUpRight,
  Package,
  Layers,
  ChevronDown,
  HelpCircle,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '19', name: 'West Bengal' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

function numberToWordsINR(amount) {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';
  const num = Math.round(amount);
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 === 0 ? '' : ' ' + inWords(n % 100));
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 === 0 ? '' : ' ' + inWords(n % 1000));
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 === 0 ? '' : ' ' + inWords(n % 100000));
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 === 0 ? '' : ' ' + inWords(n % 10000000));
  }

  return 'Rupees ' + inWords(num) + ' Only';
}

export function QuotationManager() {
  const { user, hasPermission } = useAuth();
  const { activeShop, shops } = useShop();
  const { isDark } = useTheme();

  // Mode: 'LIST' or 'FORM'
  const [viewMode, setViewMode] = useState('LIST');

  // Quotation List State
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    draftCount: 0,
    sentCount: 0,
    acceptedCount: 0,
    convertedCount: 0,
    totalValue: 0,
    convertedValue: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'WEEKLY', 'MONTHLY', 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [notification, setNotification] = useState(null);

  // Active Preview & Print Modal
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Convert to Invoice Modal
  const [convertModalQuotation, setConvertModalQuotation] = useState(null);
  const [convertPaymentMode, setConvertPaymentMode] = useState('CASH');

  // Master Data Cache
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Form State for Creating/Editing Quotation
  const [formData, setFormData] = useState({
    id: null,
    shop_id: activeShop ? activeShop.id : 1,
    quotation_number: '',
    quotation_date: new Date().toISOString().slice(0, 10),
    validity_days: 15,
    valid_until_date: '',
    recipient_type: 'EXISTING_CUSTOMER', // 'NEW_CUSTOMER', 'EXISTING_CUSTOMER', 'SHOP_BRANCH'
    customer_id: null,
    target_shop_id: null,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_gstin: '',
    customer_state_code: activeShop ? activeShop.state_code : '07',
    billing_address: '',
    items: [],
    discount_amount: 0,
    discount_percent: 0,
    status: 'DRAFT',
    terms_conditions: '1. Prices quoted are valid for 15 days from the date of quotation.\n2. GST and applicable taxes are charged as per government norms.\n3. Delivery timeline: 2-3 business days upon confirmation.\n4. Payment terms: 100% against delivery.',
    notes: 'Thank you for your business enquiry! We look forward to serving you.'
  });

  // Product Search / Autocomplete in Form
  const [productQuery, setProductQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Calculate Date Range based on Filter
  const getDateRange = (filter) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    if (filter === 'TODAY') {
      return { dateFrom: todayStr, dateTo: todayStr };
    } else if (filter === 'WEEKLY') {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return { dateFrom: weekAgo.toISOString().slice(0, 10), dateTo: todayStr };
    } else if (filter === 'MONTHLY') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: monthStart.toISOString().slice(0, 10), dateTo: todayStr };
    } else if (filter === 'CUSTOM') {
      return { dateFrom: customStartDate, dateTo: customEndDate };
    }
    return { dateFrom: '', dateTo: '' };
  };

  useEffect(() => {
    loadQuotations();
    loadProducts();
    loadCustomers();
  }, [activeShop, statusFilter, dateFilter, customStartDate, customEndDate]);

  const loadQuotations = async () => {
    if (!activeShop) return;
    setLoadingList(true);
    try {
      let url = `/api/quotations?shopId=${activeShop.id}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      
      const { dateFrom, dateTo } = getDateRange(dateFilter);
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuotations(data.quotations || []);
        setStats(data.stats || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  const loadProducts = async () => {
    if (!activeShop) return;
    try {
      const res = await fetch(`/api/products?shopId=${activeShop.id}`);
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomers = async () => {
    if (!activeShop) return;
    try {
      const res = await fetch(`/api/customers?shopId=${activeShop.id}`);
      if (res.ok) setCustomers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Start New Quotation Form
  const handleOpenNewQuotation = async () => {
    if (!activeShop) return;
    let nextNum = '';
    try {
      const res = await fetch(`/api/quotations/next-number?shopId=${activeShop.id}`);
      if (res.ok) {
        const data = await res.json();
        nextNum = data.quotationNumber;
      }
    } catch (e) {}

    const todayStr = new Date().toISOString().slice(0, 10);
    const validD = new Date();
    validD.setDate(validD.getDate() + 15);

    setFormData({
      id: null,
      shop_id: activeShop.id,
      quotation_number: nextNum,
      quotation_date: todayStr,
      validity_days: 15,
      valid_until_date: validD.toISOString().slice(0, 10),
      recipient_type: 'EXISTING_CUSTOMER',
      customer_id: null,
      target_shop_id: null,
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      customer_gstin: '',
      customer_state_code: activeShop.state_code || '07',
      billing_address: '',
      items: [],
      discount_amount: 0,
      discount_percent: 0,
      status: 'DRAFT',
      terms_conditions: '1. Prices quoted are valid for 15 days from quotation date.\n2. Goods supplied subject to stock availability.\n3. Standard manufacturer warranty applies.',
      notes: 'Thank you for your enquiry. Please let us know if you need any customized specifications.'
    });

    setProductQuery('');
    setCustomerSearchQuery('');
    setViewMode('FORM');
  };

  // Open Edit Form
  const handleEditQuotation = async (qId) => {
    try {
      const res = await fetch(`/api/quotations/${qId}`);
      if (res.ok) {
        const q = await res.json();
        setFormData({
          id: q.id,
          shop_id: q.shop_id,
          quotation_number: q.quotation_number,
          quotation_date: (q.quotation_date || '').slice(0, 10),
          validity_days: 15,
          valid_until_date: (q.valid_until_date || '').slice(0, 10),
          recipient_type: q.recipient_type || 'EXISTING_CUSTOMER',
          customer_id: q.customer_id,
          target_shop_id: q.target_shop_id,
          customer_name: q.customer_name || '',
          customer_phone: q.customer_phone || '',
          customer_email: q.customer_email || '',
          customer_gstin: q.customer_gstin || '',
          customer_state_code: q.customer_state_code || activeShop.state_code || '07',
          billing_address: q.billing_address || '',
          items: (q.items || []).map(item => ({
            product_id: item.product_id,
            item_name: item.item_name,
            hsn_code: item.hsn_code,
            unit: item.unit,
            unit_type: item.unit_type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            tax_rate: item.tax_rate,
            price_tier: 'custom'
          })),
          discount_amount: q.discount_amount || 0,
          discount_percent: q.discount_percent || 0,
          status: q.status || 'DRAFT',
          terms_conditions: q.terms_conditions || '',
          notes: q.notes || ''
        });
        setViewMode('FORM');
      }
    } catch (e) {
      alert('Failed to load quotation.');
    }
  };

  // Handle Recipient Mode Changes
  const handleSelectRecipientType = (type) => {
    setFormData(prev => ({
      ...prev,
      recipient_type: type,
      customer_id: null,
      target_shop_id: null,
      customer_name: type === 'NEW_CUSTOMER' ? '' : prev.customer_name,
      customer_phone: type === 'NEW_CUSTOMER' ? '' : prev.customer_phone,
      customer_email: '',
      customer_gstin: '',
      billing_address: ''
    }));
  };

  const handleSelectCustomer = (cust) => {
    setFormData(prev => ({
      ...prev,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone || '',
      customer_email: cust.email || '',
      customer_gstin: cust.gstin || '',
      customer_state_code: cust.state_code || activeShop.state_code || '07',
      billing_address: cust.address || ''
    }));
    setIsCustomerDropdownOpen(false);
  };

  const handleSelectShopBranch = (shop) => {
    setFormData(prev => ({
      ...prev,
      target_shop_id: shop.id,
      customer_name: `${shop.name} (${shop.city})`,
      customer_phone: shop.phone || '',
      customer_email: shop.email || '',
      customer_gstin: shop.gstin || '',
      customer_state_code: shop.state_code || '07',
      billing_address: shop.address || `${shop.city}, ${shop.state}`
    }));
  };

  // Handle Validity Days Change
  const handleValidityDaysChange = (days) => {
    const d = new Date(formData.quotation_date || new Date());
    d.setDate(d.getDate() + parseInt(days, 10));
    setFormData(prev => ({
      ...prev,
      validity_days: days,
      valid_until_date: d.toISOString().slice(0, 10)
    }));
  };

  // Add Product from Inventory to Quotation Items
  const handleAddProductToQuotation = (prod) => {
    const rate = prod.retail_rate || prod.mrp || 0;
    const newItem = {
      product_id: prod.id,
      item_name: prod.name,
      hsn_code: prod.hsn_code || '1905',
      unit: prod.unit || 'PCS',
      unit_type: 'PRIMARY',
      quantity: 1,
      unit_price: rate,
      discount_amount: 0,
      tax_rate: prod.tax_rate !== undefined ? prod.tax_rate : 18.0,
      price_tier: 'retail',
      // Metadata for tier switching
      mrp: prod.mrp,
      retail_rate: prod.retail_rate,
      wholesale_rate: prod.wholesale_rate,
      dealer_rate: prod.dealer_rate,
      current_stock: prod.current_stock
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setProductQuery('');
  };

  // Update line item property
  const handleUpdateItem = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      // If price tier changed, auto-update unit_price
      if (field === 'price_tier') {
        if (value === 'retail') item.unit_price = item.retail_rate || item.mrp || 0;
        else if (value === 'wholesale') item.unit_price = item.wholesale_rate || item.retail_rate || 0;
        else if (value === 'dealer') item.unit_price = item.dealer_rate || item.wholesale_rate || 0;
        else if (value === 'mrp') item.unit_price = item.mrp || 0;
      }

      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  // Remove line item
  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Dynamic calculations for current form items
  const isInterState = (formData.customer_state_code && activeShop?.state_code && formData.customer_state_code !== activeShop.state_code);

  let subTotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTaxable = 0;

  formData.items.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const disc = parseFloat(item.discount_amount) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;

    const rawTotal = (qty * price) - disc;
    subTotal += rawTotal;

    const taxable = Math.round((rawTotal / (1 + (taxRate / 100))) * 100) / 100;
    const taxAmt = Math.round((rawTotal - taxable) * 100) / 100;

    if (isInterState) {
      totalIgst += taxAmt;
    } else {
      const half = Math.round((taxAmt / 2) * 100) / 100;
      totalCgst += half;
      totalSgst += (taxAmt - half);
    }
    totalTaxable += taxable;
  });

  let overallDisc = parseFloat(formData.discount_amount) || 0;
  if (formData.discount_percent > 0) {
    overallDisc = Math.round((subTotal * (formData.discount_percent / 100)) * 100) / 100;
  }

  const finalPreRound = subTotal - overallDisc;
  const grandTotal = Math.round(finalPreRound);
  const roundOff = Math.round((grandTotal - finalPreRound) * 100) / 100;

  // Save Quotation Handler
  const handleSaveQuotation = async (e, directAction = null) => {
    if (e) e.preventDefault();
    if (formData.items.length === 0) {
      alert('Please add at least 1 product from inventory.');
      return;
    }

    if (!formData.customer_name || formData.customer_name.trim() === '') {
      alert('Please enter or select a customer / shop name.');
      return;
    }

    try {
      const payload = {
        ...formData,
        created_by_user_id: user ? user.id : 1
      };

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        loadQuotations();

        if (directAction === 'PRINT') {
          // Open print view immediately
          const fetchRes = await fetch(`/api/quotations/${data.id}`);
          if (fetchRes.ok) {
            setSelectedQuotation(await fetchRes.json());
            setIsPrintModalOpen(true);
          }
        }

        setViewMode('LIST');
      } else {
        alert(data.message || 'Error saving quotation.');
      }
    } catch (err) {
      alert('Network error saving quotation.');
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async (q) => {
    if (!confirm(`Are you sure you want to delete Quotation #${q.quotation_number}?`)) return;
    try {
      const res = await fetch(`/api/quotations/${q.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        loadQuotations();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('Error deleting quotation.');
    }
  };

  // Status toggle (e.g. SENT, ACCEPTED, REJECTED)
  const handleUpdateStatus = async (qId, nextStatus) => {
    try {
      const res = await fetch(`/api/quotations/${qId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Status updated to ${nextStatus}` });
        loadQuotations();
      }
    } catch (e) {
      alert('Error updating status.');
    }
  };

  // Convert Quotation to Invoice
  const handleConfirmConvert = async () => {
    if (!convertModalQuotation) return;
    try {
      const res = await fetch(`/api/quotations/${convertModalQuotation.id}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierUserId: user ? user.id : 1,
          paymentMode: convertPaymentMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        setConvertModalQuotation(null);
        loadQuotations();
      } else {
        alert(data.message || 'Error converting quotation.');
      }
    } catch (e) {
      alert('Error converting quotation.');
    }
  };

  // Open Full Printable A4 Modal
  const handleOpenPrintModal = async (qId) => {
    try {
      const res = await fetch(`/api/quotations/${qId}`);
      if (res.ok) {
        setSelectedQuotation(await res.json());
        setIsPrintModalOpen(true);
      }
    } catch (e) {
      alert('Failed to load quotation details.');
    }
  };

  // WhatsApp Share Helper
  const handleShareWhatsApp = (q) => {
    const text = `*PRICE ESTIMATE / QUOTATION*\n` +
      `*Quotation No:* ${q.quotation_number}\n` +
      `*Date:* ${(q.quotation_date || '').slice(0, 10)}\n` +
      `*Valid Till:* ${(q.valid_until_date || '').slice(0, 10)}\n` +
      `*From:* ${activeShop?.name || 'KwikStore'}\n` +
      `*Customer:* ${q.customer_name}\n` +
      `*Total Estimated Amount:* ₹${q.grand_total.toLocaleString('en-IN')}\n\n` +
      `For any questions or order confirmation, please reply to this message.`;

    const encoded = encodeURIComponent(text);
    const phone = (q.customer_phone || '').replace(/[^0-9]/g, '');
    const url = phone.length >= 10 ? `https://wa.me/91${phone.slice(-10)}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Filtered Products for Autocomplete Dropdown
  const filteredProductOptions = products.filter(p => {
    if (!productQuery || productQuery.trim().length === 0) return false;
    const q = productQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.item_code && p.item_code.toLowerCase().includes(q))
    );
  }).slice(0, 8);

  // Filtered Customers for Autocomplete
  const filteredCustomerOptions = customers.filter(c => {
    if (!customerSearchQuery || customerSearchQuery.trim().length === 0) return true;
    const q = customerSearchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }).slice(0, 6);

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Header Bar */}
      <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-500">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Quotation & Price Estimation Hub
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Prepare formal quotations for New Customers, Khata Clients & B2B Shops directly using Inventory data
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {viewMode === 'FORM' ? (
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Quotations List</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewQuotation}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quotation</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Notification Toast */}
        {notification && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* VIEW MODE: LIST */}
        {viewMode === 'LIST' && (
          <>
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Quotations</span>
                  <FileText className="w-4 h-4 text-cyan-500" />
                </div>
                <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.totalCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">₹{stats.totalValue.toLocaleString('en-IN')} Total Value</div>
              </div>

              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Draft & Sent</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">
                  {stats.draftCount + stats.sentCount}
                </div>
                <div className="text-[10px] text-amber-500/80 mt-0.5">Awaiting customer response</div>
              </div>

              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Converted to Sale</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
                  {stats.convertedCount}
                </div>
                <div className="text-[10px] text-emerald-500/80 mt-0.5">₹{stats.convertedValue.toLocaleString('en-IN')} Sales Generated</div>
              </div>

              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Conversion Rate</span>
                  <ArrowUpRight className="w-4 h-4 text-purple-500" />
                </div>
                <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {stats.totalCount > 0 ? `${Math.round((stats.convertedCount / stats.totalCount) * 100)}%` : '0%'}
                </div>
                <div className="text-[10px] text-purple-400 mt-0.5">Lead to Billing Success</div>
              </div>
            </div>

            {/* Search, Date & Status Filters */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadQuotations()}
                  placeholder="Search quotation #, customer, phone..."
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-cyan-500 transition-all ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Date & Status Filter Group */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Filter Pills */}
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-xs text-slate-400 font-medium">Date:</span>
                  <div className={`flex items-center border rounded-lg p-0.5 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                  }`}>
                    {[
                      { id: 'ALL', label: 'All Time' },
                      { id: 'TODAY', label: 'Today' },
                      { id: 'WEEKLY', label: 'Weekly' },
                      { id: 'MONTHLY', label: 'Monthly' },
                      { id: 'CUSTOM', label: 'Custom' }
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDateFilter(d.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          dateFilter === d.id
                            ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-sm'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Pickers (Shown only when 'CUSTOM' is selected) */}
                {dateFilter === 'CUSTOM' && (
                  <div className="flex items-center space-x-1.5 animate-in fade-in">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`px-2 py-1 rounded-lg border text-xs font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`px-2 py-1 rounded-lg border text-xs font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                )}

                {/* Status Filter Pills */}
                <div className="flex items-center space-x-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Status:</span>
                  <div className={`flex items-center border rounded-lg p-0.5 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                  }`}>
                    {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          statusFilter === st
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quotations Table */}
            <div className={`border rounded-xl overflow-hidden shadow-lg ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                  isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Quotation #</th>
                    <th className="py-3 px-4">Recipient Customer / Shop</th>
                    <th className="py-3 px-4">Quote Date & Validity</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Grand Total (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions & Convert</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {quotations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-500" />
                        <p className="font-semibold">No quotations found.</p>
                        <p className="text-[11px] mt-1">Click "Create New Quotation" to prepare an estimate for a new customer or shop.</p>
                      </td>
                    </tr>
                  ) : (
                    quotations.map((q) => {
                      const isConverted = q.status === 'CONVERTED';

                      return (
                        <tr key={q.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {q.quotation_number}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{q.customer_name}</div>
                              <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                                <span>{q.customer_phone || 'No phone'}</span>
                                {q.customer_gstin && <span>• GST: {q.customer_gstin}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-300">
                              <div>{(q.quotation_date || '').slice(0, 10)}</div>
                              <div className="text-[10px] text-amber-500">Till: {(q.valid_until_date || '').slice(0, 10)}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {q.item_count} items
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{q.grand_total.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              q.status === 'CONVERTED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : q.status === 'SENT'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                  : q.status === 'ACCEPTED'
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}>
                              {q.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end items-center space-x-1.5">
                              {/* 1. Print / Spec Sheet Button */}
                              <button
                                onClick={() => handleOpenPrintModal(q.id)}
                                className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                }`}
                                title="View & Print A4 Spec Sheet"
                              >
                                <Printer className="w-3.5 h-3.5 text-cyan-500" />
                                <span>Print</span>
                              </button>

                              {/* 2. WhatsApp Share */}
                              <button
                                onClick={() => handleShareWhatsApp(q)}
                                className="px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center space-x-1 transition-all"
                                title="Share quotation breakdown on WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </button>

                              {/* 3. 1-Click Convert to Invoice (If not yet converted) */}
                              {!isConverted ? (
                                <button
                                  onClick={() => setConvertModalQuotation(q)}
                                  className="px-2 py-1 rounded border border-purple-500/40 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center space-x-1 shadow-sm transition-all"
                                  title="Convert accepted quotation into actual POS sales invoice"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>Convert to Bill</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-500 font-mono px-2 py-1">
                                  ✓ Invoiced
                                </span>
                              )}

                              {/* 4. Edit Button */}
                              {!isConverted && (
                                <button
                                  onClick={() => handleEditQuotation(q.id)}
                                  className={`p-1 rounded border transition-all ${
                                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-sky-600'
                                  }`}
                                  title="Edit Quotation"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 5. Delete Button */}
                              <button
                                onClick={() => handleDeleteQuotation(q)}
                                className="p-1 rounded border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all"
                                title="Delete Quotation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </>
        )}

        {/* VIEW MODE: FORM (CREATOR / EDITOR) */}
        {viewMode === 'FORM' && (
          <form onSubmit={(e) => handleSaveQuotation(e)} className="space-y-6 animate-in fade-in">
            {/* Top Config Card: Recipient Selection & Quotation Metadata */}
            <div className={`p-5 rounded-2xl border space-y-4 shadow-md ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-700/60">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Select Recipient Target (New Customer, Existing Client, or Shop Branch)
                    </h3>
                    <p className="text-[11px] text-slate-400">Choose whether this quotation is for an on-the-fly client, registered khata account, or commercial branch</p>
                  </div>
                </div>

                {/* Recipient Type Pills */}
                <div className={`flex items-center border rounded-xl p-0.5 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleSelectRecipientType('EXISTING_CUSTOMER')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      formData.recipient_type === 'EXISTING_CUSTOMER'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Existing Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRecipientType('NEW_CUSTOMER')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      formData.recipient_type === 'NEW_CUSTOMER'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>New Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRecipientType('SHOP_BRANCH')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      formData.recipient_type === 'SHOP_BRANCH'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Shop Branch / B2B</span>
                  </button>
                </div>
              </div>

              {/* Recipient Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {formData.recipient_type === 'EXISTING_CUSTOMER' && (
                  <div className="relative">
                    <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Search & Select Customer *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) => {
                          setFormData({ ...formData, customer_name: e.target.value });
                          setCustomerSearchQuery(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Type customer name or phone..."
                        className={`w-full border rounded-xl p-2.5 text-xs outline-none focus:border-cyan-500 ${
                          isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {isCustomerDropdownOpen && (
                      <div className={`absolute left-0 right-0 top-full mt-1 z-30 border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}>
                        {filteredCustomerOptions.map(c => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className={`p-2.5 border-b last:border-0 cursor-pointer flex items-center justify-between transition-colors ${
                              isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-xs">{c.name}</div>
                              <div className="text-[10px] text-slate-400">{c.phone} • GST: {c.gstin || 'None'}</div>
                            </div>
                            <div className="text-right font-mono text-[11px] text-sky-500">
                              Khata: ₹{c.current_balance || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {formData.recipient_type === 'NEW_CUSTOMER' && (
                  <div>
                    <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      New Customer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar / Sharma Traders"
                      className={`w-full border rounded-xl p-2.5 text-xs outline-none focus:border-cyan-500 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                )}

                {formData.recipient_type === 'SHOP_BRANCH' && (
                  <div>
                    <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Select Target Shop Branch *
                    </label>
                    <select
                      value={formData.target_shop_id || ''}
                      onChange={(e) => {
                        const sel = shops.find(s => s.id === parseInt(e.target.value, 10));
                        if (sel) handleSelectShopBranch(sel);
                      }}
                      className={`w-full border rounded-xl p-2.5 text-xs outline-none focus:border-cyan-500 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">-- Choose Branch --</option>
                      {shops.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.city}) - {s.shop_type}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className={`w-full border rounded-xl p-2.5 text-xs font-mono outline-none focus:border-cyan-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    GSTIN (For B2B Tax Invoice Quote)
                  </label>
                  <input
                    type="text"
                    value={formData.customer_gstin}
                    onChange={(e) => setFormData({ ...formData, customer_gstin: e.target.value.toUpperCase() })}
                    placeholder="15-digit GST Number (optional)"
                    className={`w-full border rounded-xl p-2.5 text-xs font-mono uppercase outline-none focus:border-cyan-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Quotation Metadata: Number, Dates, State */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className={`block font-semibold mb-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Quotation Number
                  </label>
                  <input
                    type="text"
                    value={formData.quotation_number}
                    onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })}
                    className={`w-full border rounded-xl p-2 text-xs font-mono font-bold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-cyan-400' : 'bg-slate-50 border-slate-300 text-cyan-700'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Quotation Date
                  </label>
                  <input
                    type="date"
                    value={formData.quotation_date}
                    onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                    className={`w-full border rounded-xl p-2 text-xs font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Price Validity (Days)
                  </label>
                  <select
                    value={formData.validity_days}
                    onChange={(e) => handleValidityDaysChange(e.target.value)}
                    className={`w-full border rounded-xl p-2 text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="7">Valid for 7 Days</option>
                    <option value="15">Valid for 15 Days</option>
                    <option value="30">Valid for 30 Days</option>
                    <option value="60">Valid for 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Destination State (GST POS)
                  </label>
                  <select
                    value={formData.customer_state_code}
                    onChange={(e) => setFormData({ ...formData, customer_state_code: e.target.value })}
                    className={`w-full border rounded-xl p-2 text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {INDIAN_STATES.map(st => (
                      <option key={st.code} value={st.code}>{st.code} - {st.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Inventory Product Picker & Line Items Matrix */}
            <div className={`p-5 rounded-2xl border space-y-4 shadow-md ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-700/60">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Select Products from Inventory Master
                    </h3>
                    <p className="text-[11px] text-slate-400">Search products, choose price tiers (Retail, Wholesale, Dealer, MRP), and configure discounts</p>
                  </div>
                </div>

                {/* Fast Inventory Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search product name, barcode..."
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />

                  {/* Search Autocomplete Results */}
                  {filteredProductOptions.length > 0 && (
                    <div className={`absolute left-0 right-0 top-full mt-1 z-30 border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                    }`}>
                      {filteredProductOptions.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleAddProductToQuotation(p)}
                          className={`p-2.5 border-b last:border-0 cursor-pointer flex items-center justify-between transition-colors ${
                            isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{p.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Barcode: {p.barcode || 'N/A'} • Stock: {p.current_stock} {p.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-xs text-emerald-500">₹{p.retail_rate || p.mrp}</div>
                            <div className="text-[9px] text-slate-400 font-mono">Wholesale: ₹{p.wholesale_rate || p.retail_rate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                    isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">HSN</th>
                      <th className="py-2.5 px-3">Price Tier</th>
                      <th className="py-2.5 px-3">Quoted Rate (₹)</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Discount (₹)</th>
                      <th className="py-2.5 px-3">GST %</th>
                      <th className="py-2.5 px-3">Total (₹)</th>
                      <th className="py-2.5 px-3 text-center">✕</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-400">
                          <Package className="w-6 h-6 mx-auto mb-1 text-slate-500 opacity-50" />
                          <p>No products added yet. Use the search bar above to add items from your inventory.</p>
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, idx) => {
                        const itemTotal = (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)) - parseFloat(item.discount_amount || 0);

                        return (
                          <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.item_name}
                                onChange={(e) => handleUpdateItem(idx, 'item_name', e.target.value)}
                                className={`w-full border rounded-lg p-1.5 text-xs font-semibold ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.hsn_code}
                                onChange={(e) => handleUpdateItem(idx, 'hsn_code', e.target.value)}
                                className={`w-20 border rounded-lg p-1.5 text-xs font-mono ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.price_tier || 'custom'}
                                onChange={(e) => handleUpdateItem(idx, 'price_tier', e.target.value)}
                                className={`border rounded-lg p-1.5 text-[11px] font-semibold ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-cyan-400' : 'bg-white border-slate-300 text-cyan-700'
                                }`}
                              >
                                <option value="retail">Retail Rate</option>
                                <option value="wholesale">Wholesale Rate</option>
                                <option value="dealer">Dealer Rate</option>
                                <option value="mrp">MRP</option>
                                <option value="custom">Custom Rate</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="any"
                                value={item.unit_price}
                                onChange={(e) => handleUpdateItem(idx, 'unit_price', e.target.value)}
                                className={`w-24 border rounded-lg p-1.5 text-xs font-mono font-bold text-right ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                                  className={`w-16 border rounded-lg p-1.5 text-xs font-mono font-bold text-center ${
                                    isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700'
                                  }`}
                                />
                                <span className="text-[10px] text-slate-400 font-mono">{item.unit}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.discount_amount}
                                onChange={(e) => handleUpdateItem(idx, 'discount_amount', e.target.value)}
                                className={`w-20 border rounded-lg p-1.5 text-xs font-mono text-right ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-600'
                                }`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.tax_rate}
                                onChange={(e) => handleUpdateItem(idx, 'tax_rate', parseFloat(e.target.value))}
                                className={`border rounded-lg p-1.5 text-xs font-mono ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-right text-emerald-500">
                              ₹{Math.max(0, itemTotal).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary & Tax Calculation Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-800">
                {/* Terms & Conditions Box */}
                <div className="space-y-3">
                  <div>
                    <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Quotation Terms & Conditions
                    </label>
                    <textarea
                      rows="3"
                      value={formData.terms_conditions}
                      onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                      className={`w-full border rounded-xl p-2 text-xs outline-none ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Notes / Remarks for Customer
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g. Special festive discount included"
                      className={`w-full border rounded-xl p-2 text-xs outline-none ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-bold text-slate-200">₹{subTotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <span>Taxable Base Value:</span>
                    <span className="font-mono">₹{totalTaxable.toLocaleString('en-IN')}</span>
                  </div>

                  {isInterState ? (
                    <div className="flex justify-between items-center text-cyan-400">
                      <span>IGST (Integrated Tax):</span>
                      <span className="font-mono font-bold">₹{totalIgst.toLocaleString('en-IN')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-cyan-400">
                        <span>CGST (Central Tax):</span>
                        <span className="font-mono font-bold">₹{totalCgst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-cyan-400">
                        <span>SGST (State Tax):</span>
                        <span className="font-mono font-bold">₹{totalSgst.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center text-slate-400">
                    <span>Round Off:</span>
                    <span className="font-mono">{roundOff >= 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                  </div>

                  <div className="border-t pt-2 flex justify-between items-center border-slate-700">
                    <span className="font-bold text-sm">Estimated Grand Total:</span>
                    <span className="text-xl font-bold font-mono text-emerald-500">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 italic text-right font-serif">
                    {numberToWordsINR(grandTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>

              <div className="flex items-center space-x-2.5">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Quotation</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSaveQuotation(e, 'PRINT')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save & Print A4 Sheet</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Convert to Invoice Modal */}
      {convertModalQuotation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Convert Quotation to POS Sales Bill
                  </h3>
                  <p className="text-[10px] text-slate-400">Quotation #{convertModalQuotation.quotation_number}</p>
                </div>
              </div>
              <button onClick={() => setConvertModalQuotation(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Customer:</span>
                  <span>{convertModalQuotation.customer_name}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Quotation Amount:</span>
                  <span className="text-emerald-500 font-mono font-bold">₹{convertModalQuotation.grand_total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Select Payment Tender Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['CASH', 'UPI', 'CARD', 'CREDIT'].map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setConvertPaymentMode(mode)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        convertPaymentMode === mode
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mode === 'CREDIT' ? 'Credit (Udhar)' : mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
                ⚡ Converting will immediately generate an official POS Invoice, record attendance revenue, deduct stock, and update the quotation status to <strong>CONVERTED</strong>.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConvertModalQuotation(null)}
                  className={`px-3 py-1.5 rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg"
                >
                  Confirm & Generate Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Printable A4 Quotation Modal */}
      {isPrintModalOpen && selectedQuotation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col animate-in zoom-in-95">
            {/* Modal Actions Header (Hidden on Print) */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-sm">Quotation Preview: {selectedQuotation.quotation_number}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 Document</span>
                </button>
                <button
                  onClick={() => handleShareWhatsApp(selectedQuotation)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white font-bold text-sm ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* A4 Printable Sheet Document */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 font-sans print:p-0 print:m-0">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    {selectedQuotation.shop_name || activeShop?.name}
                  </h2>
                  {selectedQuotation.shop_legal_name && (
                    <div className="text-xs font-semibold text-slate-600">{selectedQuotation.shop_legal_name}</div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-1 max-w-sm leading-relaxed">
                    {selectedQuotation.shop_address || activeShop?.address}<br />
                    {selectedQuotation.shop_city}, {selectedQuotation.shop_state} - {selectedQuotation.shop_pincode || activeShop?.pincode}<br />
                    Phone: {selectedQuotation.shop_phone || activeShop?.phone} • Email: {selectedQuotation.shop_email || activeShop?.email}
                  </div>
                  {selectedQuotation.shop_gstin && (
                    <div className="mt-1 font-mono font-bold text-slate-800 text-[11px]">
                      GSTIN: {selectedQuotation.shop_gstin}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-bold px-3 py-1 text-xs tracking-wider rounded">
                    ESTIMATE / QUOTATION
                  </div>
                  <div className="mt-2 font-mono text-xs">
                    <div><span className="text-slate-500 font-medium">Quote No:</span> <strong className="text-slate-900">{selectedQuotation.quotation_number}</strong></div>
                    <div><span className="text-slate-500 font-medium">Date:</span> {(selectedQuotation.quotation_date || '').slice(0, 10)}</div>
                    <div><span className="text-slate-500 font-medium">Valid Till:</span> <strong className="text-amber-700">{(selectedQuotation.valid_until_date || '').slice(0, 10)}</strong></div>
                  </div>
                </div>
              </div>

              {/* Quotation Recipient Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quotation Prepared For:</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{selectedQuotation.customer_name}</div>
                  {selectedQuotation.billing_address && (
                    <div className="text-slate-600 text-[11px] mt-0.5">{selectedQuotation.billing_address}</div>
                  )}
                  {selectedQuotation.customer_phone && (
                    <div className="text-slate-600 text-[11px]">Phone: {selectedQuotation.customer_phone}</div>
                  )}
                  {selectedQuotation.customer_email && (
                    <div className="text-slate-600 text-[11px]">Email: {selectedQuotation.customer_email}</div>
                  )}
                </div>

                <div className="text-right">
                  {selectedQuotation.customer_gstin ? (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Customer GSTIN:</span>
                      <div className="font-mono font-bold text-slate-900">{selectedQuotation.customer_gstin}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">Retail / Consumer Quote</div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-1">
                    State Code: <strong>{selectedQuotation.customer_state_code || '07'}</strong>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase text-slate-700">
                    <tr>
                      <th className="py-2 px-3 text-center w-8">#</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">HSN</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2 px-3 text-right">Discount (₹)</th>
                      <th className="py-2 px-3 text-right">Taxable (₹)</th>
                      <th className="py-2 px-3 text-center">GST %</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {(selectedQuotation.items || []).map((item, index) => (
                      <tr key={index}>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.item_name}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-500">{item.hsn_code || '1905'}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{item.quantity} {item.unit}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{item.unit_price}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {item.discount_amount > 0 ? `₹${item.discount_amount}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">₹{item.taxable_value}</td>
                        <td className="py-2 px-3 text-center font-mono">{item.tax_rate}%</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{item.total_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Tax Summary */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="font-bold text-slate-800 text-[11px] uppercase mb-1">Amount in Words:</div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-800 italic">
                    {numberToWordsINR(selectedQuotation.grand_total)}
                  </div>

                  {selectedQuotation.shop_bank_name && (
                    <div className="mt-3 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                      <div className="font-bold text-slate-800 text-[10px] uppercase">Bank Details for Payment:</div>
                      <div>Bank: <strong>{selectedQuotation.shop_bank_name}</strong></div>
                      <div>A/C No: <strong>{selectedQuotation.shop_bank_account_no}</strong></div>
                      <div>IFSC: <strong>{selectedQuotation.shop_bank_ifsc}</strong></div>
                      {selectedQuotation.shop_upi_id && <div>UPI ID: <strong>{selectedQuotation.shop_upi_id}</strong></div>}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-right">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-mono font-bold">₹{selectedQuotation.sub_total.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedQuotation.discount_amount > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200 text-amber-700">
                      <span>Overall Discount:</span>
                      <span className="font-mono">-₹{selectedQuotation.discount_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Taxable Value:</span>
                    <span className="font-mono">₹{selectedQuotation.taxable_amount.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedQuotation.igst_amount > 0 ? (
                    <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                      <span>IGST:</span>
                      <span className="font-mono">₹{selectedQuotation.igst_amount}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                        <span>CGST:</span>
                        <span className="font-mono">₹{selectedQuotation.cgst_amount}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                        <span>SGST:</span>
                        <span className="font-mono">₹{selectedQuotation.sgst_amount}</span>
                      </div>
                    </>
                  )}
                  {selectedQuotation.round_off !== 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200 text-slate-500">
                      <span>Round Off:</span>
                      <span className="font-mono">₹{selectedQuotation.round_off}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-bold text-slate-900">
                    <span>Estimated Total:</span>
                    <span className="font-mono text-base text-emerald-700">
                      ₹{selectedQuotation.grand_total.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms and Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300">
                <div className="text-[10px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700 uppercase">Terms & Conditions:</div>
                  <p className="whitespace-pre-line leading-relaxed">
                    {selectedQuotation.terms_conditions || selectedQuotation.shop_default_terms || '1. Prices valid for 15 days.\n2. Goods once sold will not be taken back without bill.'}
                  </p>
                </div>

                <div className="text-right flex flex-col justify-end">
                  <div className="h-12"></div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800 text-[11px]">
                    For {selectedQuotation.shop_name || activeShop?.name}
                  </div>
                  <div className="text-[10px] text-slate-400">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
