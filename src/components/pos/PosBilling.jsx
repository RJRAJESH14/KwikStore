import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useNetwork } from '../../context/NetworkContext';
import { useTheme } from '../../context/ThemeContext';
import { ThermalReceipt } from '../print/ThermalReceipt';
import { A4TaxInvoice } from '../print/A4TaxInvoice';
import { ShiftRegisterModal } from './ShiftRegisterModal';
import { ReturnsModal } from './ReturnsModal';
import { QuickKeysGrid } from './QuickKeysGrid';
import { generateUpiQrDataUrl } from '../../utils/upiQr';
import { formatCurrency } from '../../utils/gstUtils';
import { 
  Search, 
  Barcode, 
  Plus, 
  Trash2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Users, 
  Printer, 
  Sparkles, 
  Pause, 
  Play, 
  Percent, 
  Check, 
  AlertCircle,
  Truck,
  Box,
  Layers,
  UserPlus,
  Phone,
  MapPin,
  Building,
  X,
  CheckCircle2,
  ShoppingCart,
  ShoppingBag,
  ArrowRight,
  Minus,
  Package,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  RotateCcw,
  Gift,
  Tag,
  Receipt,
  Grid,
  UserCheck,
  Coins,
  Split,
  Scale,
  Share2
} from 'lucide-react';
import { 
  playScanSound, 
  playSuccessSound, 
  playDeleteSound, 
  playErrorSound, 
  playHoldSound 
} from '../../utils/audioAlerts';

export function PosBilling() {
  const { user } = useAuth();
  const { activeShop } = useShop();
  const { activeShift, fetchActiveShift, subscribeToScanner, scaleStatus, updateCustomerDisplay } = useNetwork();
  const { isDark } = useTheme();

  // State
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState('PERCENT'); // PERCENT or FIXED

  // Modal & View States
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isReturnsModalOpen, setIsReturnsModalOpen] = useState(false);
  const [isQuickKeysView, setIsQuickKeysView] = useState(false);

  // Sales Staff & Loyalty & Credit Note states
  const [selectedSalesEmployeeId, setSelectedSalesEmployeeId] = useState('');
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState(0);
  const [loyaltyConfig, setLoyaltyConfig] = useState({ earnRatePercent: 1, redeemValueRs: 1, minRedeemPoints: 50, maxRedeemPercent: 50 });
  const [creditNoteCode, setCreditNoteCode] = useState('');
  const [appliedCreditNote, setAppliedCreditNote] = useState(null);
  const [creditNoteError, setCreditNoteError] = useState('');
  const [isVerifyingCreditNote, setIsVerifyingCreditNote] = useState(false);

  // Split Tender amounts
  const [splitAmounts, setSplitAmounts] = useState({
    cash: '',
    upi: '',
    card: '',
    credit: ''
  });

  // Sound Alerts & Mute State (Persisted in localStorage)
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('pos_sound_muted') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleSoundMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      localStorage.setItem('pos_sound_muted', String(next));
    } catch (e) {}
    if (!next) {
      playScanSound(false); // Auditory feedback when unmuting
    }
  };
  
  // Customer Selection & Quick Create State
  const [isCustomerSearchModalOpen, setIsCustomerSearchModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerNotification, setCustomerNotification] = useState(null);

  const initialCustomerForm = {
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    state_code: activeShop?.state_code || '07',
    credit_limit: 25000,
    opening_balance: 0,
    route_beat: '',
    customer_type: 'RETAIL'
  };
  const [newCustomerForm, setNewCustomerForm] = useState(initialCustomerForm);

  // Rate Tier Mode (Distributor / Wholesale Support)
  const [priceTier, setPriceTier] = useState('RETAIL'); // RETAIL, WHOLESALE, DEALER, MRP

  // Tender / Payment Modal
  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('CASH'); // CASH, UPI, CARD, CREDIT, SPLIT
  const [amountPaid, setAmountPaid] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState(null);
  const [heldBills, setHeldBills] = useState([]);
  const [recentInvoice, setRecentInvoice] = useState(null);
  const [printFormat, setPrintFormat] = useState('THERMAL'); // THERMAL or A4

  const searchInputRef = useRef(null);

  // Fetch products, customers, employees, loyalty config
  useEffect(() => {
    if (activeShop) {
      fetchProducts();
      fetchCustomers();
      fetchEmployees();
      fetchLoyaltyConfig();
    }
  }, [activeShop]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?shopId=${activeShop.id}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/customers?shopId=${activeShop.id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/hrms/employees?shopId=${activeShop.id}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : (data.employees || []));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLoyaltyConfig = async () => {
    try {
      const res = await fetch(`/api/loyalty/config?shopId=${activeShop.id}`);
      if (res.ok) {
        const data = await res.json();
        setLoyaltyConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setIsCustomerSearchModalOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      alert('Please enter customer name');
      return;
    }
    try {
      const payload = {
        ...newCustomerForm,
        shop_id: activeShop.id,
        phone: newCustomerForm.phone.trim(),
        gstin: newCustomerForm.gstin.trim().toUpperCase()
      };
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        // Fetch updated customer list and select the new customer
        const custRes = await fetch(`/api/customers?shopId=${activeShop.id}`);
        if (custRes.ok) {
          const list = await custRes.json();
          setCustomers(list);
          const created = list.find(c => c.id === data.id) || { ...payload, id: data.id, current_balance: payload.opening_balance || 0 };
          setSelectedCustomer(created);
        }
        setIsAddCustomerModalOpen(false);
        setIsCustomerSearchModalOpen(false);
        setNewCustomerForm(initialCustomerForm);
        setCustomerNotification(`Customer "${newCustomerForm.name}" created & attached to bill!`);
        setTimeout(() => setCustomerNotification(null), 3500);
      } else {
        alert(data.message || 'Error creating customer');
      }
    } catch (err) {
      alert('Network error creating customer');
    }
  };

  // Live item search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.item_code && p.item_code.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.regional_name && p.regional_name.toLowerCase().includes(q))
    );
    setSearchResults(filtered.slice(0, 10));
  }, [searchQuery, products]);

  // Global Keyboard Shortcuts (F2-F10)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCart([]);
        setSelectedCustomer(null);
        setSearchQuery('');
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) openTenderModal();
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsReturnsModalOpen(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsShiftModalOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleRecallBill();
      } else if (e.key === 'F10') {
        e.preventDefault();
        setIsQuickKeysView(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, heldBills]);

  // Add product to cart
  const addToCart = (product, options = {}) => {
    playScanSound(isMuted);

    let price = product.retail_rate;
    if (priceTier === 'WHOLESALE') price = product.wholesale_rate || product.retail_rate;
    else if (priceTier === 'DEALER') price = product.dealer_rate || product.wholesale_rate || product.retail_rate;
    else if (priceTier === 'MRP') price = product.mrp;

    const derivedVariant = options.variant_details || (
      (product.default_size || product.default_color)
        ? `${product.default_size ? `Size: ${product.default_size}` : ''}${product.default_size && product.default_color ? ' • ' : ''}${product.default_color || ''}`
        : null
    );
    const derivedBatch = options.batch_no || product.default_batch_no || (product.batches?.[0]?.batch_no || null);
    const derivedExpiry = options.expiry_date || product.default_expiry_date || (product.batches?.[0]?.expiry_date || null);

    const existingIndex = cart.findIndex(item => 
      item.product_id === product.id && 
      item.batch_no === derivedBatch && 
      item.serial_imei === options.serial_imei &&
      item.variant_details === derivedVariant
    );

    let freeQty = 0;
    // Auto trade scheme: e.g. 10+1 free or 5+1 free
    if (product.trade_scheme) {
      const totalQty = (existingIndex >= 0 ? cart[existingIndex].quantity + 1 : 1);
      if (product.trade_scheme.includes('10+1')) {
        freeQty = Math.floor(totalQty / 10);
      } else if (product.trade_scheme.includes('5+1')) {
        freeQty = Math.floor(totalQty / 5);
      }
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].free_quantity = freeQty;
      setCart(updated);
    } else {
      const newItem = {
        product_id: product.id,
        item_name: product.name,
        image_url: product.image_url || null,
        hsn_code: product.hsn_code || '1905',
        unit: product.unit || 'PCS',
        unit_type: options.unit_type || 'PRIMARY',
        quantity: 1,
        free_quantity: freeQty,
        unit_price: price,
        tax_rate: product.tax_rate || 18,
        discount_amount: 0,
        batch_no: derivedBatch,
        expiry_date: derivedExpiry,
        serial_imei: options.serial_imei || null,
        variant_details: derivedVariant,
        trade_scheme: product.trade_scheme
      };
      setCart([...cart, newItem]);
    }

    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Automatic Barcode Scanner Listener
  useEffect(() => {
    if (!subscribeToScanner) return;
    const unsubscribe = subscribeToScanner((scannedCode) => {
      if (!scannedCode) return;
      const q = scannedCode.trim().toLowerCase();
      const exactMatch = products.find(p => p.barcode && p.barcode.toLowerCase() === q);
      if (exactMatch) {
        addToCart(exactMatch);
      } else {
        setSearchQuery(scannedCode);
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    });
    return () => unsubscribe();
  }, [subscribeToScanner, products, addToCart]);

  const updateCartItemQty = (index, qty) => {
    const val = parseFloat(qty);
    if (isNaN(val) || val <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = val;
    if (updated[index].trade_scheme && updated[index].trade_scheme.includes('10+1')) {
      updated[index].free_quantity = Math.floor(val / 10);
    }
    setCart(updated);
  };

  const updateCartItemPrice = (index, price) => {
    const val = parseFloat(price);
    if (isNaN(val) || val < 0) return;
    const updated = [...cart];
    updated[index].unit_price = val;
    setCart(updated);
  };

  const removeFromCart = (index) => {
    playDeleteSound(isMuted);
    setCart(cart.filter((_, i) => i !== index));
  };

  // Calculations
  const subTotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price) - (item.discount_amount || 0), 0);
  const discountAmount = overallDiscountType === 'PERCENT' ? (subTotal * (overallDiscount / 100)) : overallDiscount;
  const taxableTotal = Math.max(0, subTotal - discountAmount);

  // Loyalty discount calculation
  const maxRedeemablePoints = selectedCustomer ? Math.min(
    selectedCustomer.loyalty_points || 0,
    Math.floor((taxableTotal * ((loyaltyConfig?.maxRedeemPercent || 50) / 100)) / (loyaltyConfig?.redeemValueRs || 1))
  ) : 0;
  const loyaltyDiscount = (redeemLoyaltyPoints > 0) ? (redeemLoyaltyPoints * (loyaltyConfig?.redeemValueRs || 1)) : 0;

  // Credit Note discount calculation
  const maxCreditDiscount = Math.max(0, taxableTotal - loyaltyDiscount);
  const creditNoteDiscount = appliedCreditNote ? Math.min(appliedCreditNote.balance, maxCreditDiscount) : 0;

  const grandTotal = Math.max(0, Math.round(taxableTotal - loyaltyDiscount - creditNoteDiscount));
  const totalCartQuantity = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0) + (Number(item.free_quantity) || 0), 0);

  // Split tender total calculation
  const splitTotal = (parseFloat(splitAmounts.cash) || 0) +
                     (parseFloat(splitAmounts.upi) || 0) +
                     (parseFloat(splitAmounts.card) || 0) +
                     (parseFloat(splitAmounts.credit) || 0);
  const splitRemaining = Math.max(0, grandTotal - splitTotal);

  // Broadcast live cart state to Customer Facing Display (CFD)
  useEffect(() => {
    if (!updateCustomerDisplay) return;
    const totalSavings = (cart.reduce((sum, item) => sum + (Number(item.discount_amount || 0)), 0)) + loyaltyDiscount + creditNoteDiscount;
    updateCustomerDisplay({
      cart,
      total: grandTotal,
      totalSavings,
      customerName: selectedCustomer?.name,
      upiQrUrl: isTenderOpen && paymentMode === 'UPI' ? upiQrUrl : null,
      status: isTenderOpen ? (paymentMode === 'UPI' ? 'PAYMENT' : 'ACTIVE') : cart.length > 0 ? 'ACTIVE' : 'IDLE',
      shop: activeShop
    });
  }, [cart, grandTotal, selectedCustomer, isTenderOpen, paymentMode, upiQrUrl, loyaltyDiscount, creditNoteDiscount, activeShop, updateCustomerDisplay]);

  // Grab electronic weighing scale weight into a cart item
  const applyScaleWeightToCart = (index) => {
    const weight = Number(scaleStatus?.effectiveWeight || scaleStatus?.weight || 0);
    if (weight > 0) {
      updateCartItemQty(index, weight);
    } else {
      alert('Scale weight is 0.000 kg. Please place the product on your electronic weighing scale or test with simulation in Hardware Hub.');
    }
  };

  // Credit note verification
  const handleVerifyCreditNote = async () => {
    if (!creditNoteCode.trim()) return;
    setIsVerifyingCreditNote(true);
    setCreditNoteError('');
    try {
      const res = await fetch(`/api/credit-notes/verify/${encodeURIComponent(creditNoteCode.trim())}?shopId=${activeShop.id}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCreditNote(data.creditNote);
        setCreditNoteError('');
      } else {
        setAppliedCreditNote(null);
        setCreditNoteError(data.message || 'Invalid or expired credit note voucher');
      }
    } catch (e) {
      setAppliedCreditNote(null);
      setCreditNoteError('Could not verify credit note voucher');
    } finally {
      setIsVerifyingCreditNote(false);
    }
  };

  const handleRemoveCreditNote = () => {
    setAppliedCreditNote(null);
    setCreditNoteCode('');
    setCreditNoteError('');
  };

  // Hold & Recall Bills
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    playHoldSound(isMuted);
    const bill = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      customer: selectedCustomer,
      priceTier,
    };
    setHeldBills([...heldBills, bill]);
    setCart([]);
    setSelectedCustomer(null);
  };

  const handleRecallBill = (billId) => {
    if (heldBills.length === 0) return;
    playHoldSound(isMuted);
    const target = billId ? heldBills.find(b => b.id === billId) : heldBills[heldBills.length - 1];
    if (target) {
      setCart(target.cart);
      setSelectedCustomer(target.customer);
      setPriceTier(target.priceTier || 'RETAIL');
      setHeldBills(heldBills.filter(b => b.id !== target.id));
    }
  };

  // Open Tender Modal
  const openTenderModal = async () => {
    setAmountPaid(grandTotal.toString());
    setCashTendered(grandTotal.toString());
    setSplitAmounts({
      cash: grandTotal.toString(),
      upi: '',
      card: '',
      credit: ''
    });
    setIsTenderOpen(true);

    if (activeShop?.upi_id) {
      const qr = await generateUpiQrDataUrl({
        upiId: activeShop.upi_id,
        name: activeShop.upi_name || activeShop.name,
        amount: grandTotal,
        invoiceNumber: 'POS-BILL'
      });
      setUpiQrUrl(qr);
    }
  };

  // Finalize Invoice Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    let paidVal = parseFloat(amountPaid) || 0;
    if (paymentMode === 'SPLIT') {
      paidVal = (parseFloat(splitAmounts.cash) || 0) +
                (parseFloat(splitAmounts.upi) || 0) +
                (parseFloat(splitAmounts.card) || 0);
    } else if (paymentMode === 'CASH') {
      paidVal = grandTotal;
    } else if (paymentMode === 'UPI' || paymentMode === 'CARD') {
      paidVal = grandTotal;
    } else if (paymentMode === 'CREDIT') {
      paidVal = 0;
    }

    const isCredit = paymentMode === 'CREDIT' || (paymentMode === 'SPLIT' && (parseFloat(splitAmounts.credit) || 0) > 0);

    // Credit limit validation for customers
    if (isCredit && selectedCustomer) {
      const creditPortion = paymentMode === 'CREDIT' ? grandTotal : (parseFloat(splitAmounts.credit) || 0);
      const pendingDue = (selectedCustomer.current_balance || 0) + creditPortion;
      if (pendingDue > selectedCustomer.credit_limit) {
        alert(`Warning: This bill exceeds customer credit limit of ₹${selectedCustomer.credit_limit.toLocaleString('en-IN')}. Current balance is ₹${selectedCustomer.current_balance.toLocaleString('en-IN')}`);
      }
    }

    const payload = {
      shop_id: activeShop.id,
      invoice_type: selectedCustomer?.gstin ? 'TAX_INVOICE_B2B' : 'RETAIL_B2C',
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      customer_phone: selectedCustomer?.phone || '',
      customer_gstin: selectedCustomer?.gstin || '',
      customer_state_code: selectedCustomer?.state_code || activeShop.state_code || '07',
      billing_address: selectedCustomer?.address || '',
      items: cart,
      discount_amount: discountAmount,
      discount_percent: overallDiscountType === 'PERCENT' ? overallDiscount : 0,
      payment_mode: paymentMode,
      amount_paid: paidVal,
      payment_details: {
        mode: paymentMode,
        cashTendered: parseFloat(cashTendered) || 0,
        changeReturned: Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal),
        splitBreakdown: paymentMode === 'SPLIT' ? splitAmounts : undefined
      },
      cashier_user_id: user?.id || 1,
      sales_employee_id: selectedSalesEmployeeId ? parseInt(selectedSalesEmployeeId, 10) : null,
      loyalty_points_redeemed: redeemLoyaltyPoints > 0 ? redeemLoyaltyPoints : 0,
      credit_note_code: appliedCreditNote ? appliedCreditNote.credit_note_code : null,
      credit_note_discount: creditNoteDiscount,
      shift_id: activeShift?.id || 1,
      notes: `Price Tier: ${priceTier}`
    };

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.invoice) {
        playSuccessSound(isMuted);
        setRecentInvoice(data.invoice);
        setIsTenderOpen(false);
        setCart([]);
        setSelectedCustomer(null);
        setSelectedSalesEmployeeId('');
        setRedeemLoyaltyPoints(0);
        setAppliedCreditNote(null);
        setCreditNoteCode('');
        fetchProducts(); // refresh stock
        if (selectedCustomer) fetchCustomers();
      } else {
        playErrorSound(isMuted);
        alert('Billing error: ' + (data.message || 'Could not complete bill'));
      }
    } catch (e) {
      playErrorSound(isMuted);
      alert('Network error while completing checkout.');
    }
  };

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal);

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top POS Action Toolbar */}
      <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center space-x-3">
          {/* Rate Tier Switcher (Retail, Wholesale, Dealer, MRP) */}
          <div className={`flex items-center border rounded-lg p-1 space-x-1 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
          }`}>
            <span className={`text-[10px] font-bold uppercase px-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rate Tier:</span>
            {['RETAIL', 'WHOLESALE', 'DEALER', 'MRP'].map((tier) => (
              <button
                key={tier}
                onClick={() => setPriceTier(tier)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  priceTier === tier
                    ? 'bg-brand-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Customer / Retailer Selector with Quick Add */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => {
                setCustomerSearchQuery('');
                setIsCustomerSearchModalOpen(true);
              }}
              className={`flex items-center space-x-2 border rounded-xl px-3 py-1.5 text-xs font-semibold transition-all max-w-[260px] ${
                selectedCustomer
                  ? isDark
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25'
                    : 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'
                  : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-200'
              }`}
              title="Click to Select or Search Existing Customer"
            >
              <Users className={`w-3.5 h-3.5 shrink-0 ${selectedCustomer ? 'text-sky-500' : 'text-slate-400'}`} />
              <div className="text-left truncate">
                <div className="truncate font-bold leading-tight">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                </div>
                {selectedCustomer?.phone && (
                  <div className="text-[10px] text-slate-400 font-mono leading-tight">{selectedCustomer.phone}</div>
                )}
              </div>
              {selectedCustomer?.current_balance > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500 font-mono shrink-0">
                  Udhar: ₹{selectedCustomer.current_balance}
                </span>
              )}
            </button>

            {selectedCustomer && (
              <button
                onClick={handleClearCustomer}
                className={`p-1.5 rounded-xl border text-slate-400 hover:text-rose-500 transition-all ${
                  isDark ? 'bg-slate-950 border-slate-800 hover:border-rose-900' : 'bg-slate-100 border-slate-300 hover:border-rose-300'
                }`}
                title="Reset to Walk-in Customer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Add Customer Button */}
            <button
              onClick={() => {
                setNewCustomerForm({
                  ...initialCustomerForm,
                  state_code: activeShop?.state_code || '07'
                });
                setIsAddCustomerModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center space-x-1 transition-all"
              title="Register New Customer on the fly"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Customer</span>
            </button>
          </div>
        </div>

        {/* Cart Trigger Badge, Sound Mute Toggle, Shift, Returns & Held Bills / Controls */}
        <div className="flex items-center space-x-2">
          {/* Shift Register (X/Z Report) */}
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              activeShift
                ? isDark
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25 ring-1 ring-blue-500/30'
                  : 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 ring-1 ring-blue-300/60'
                : isDark
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 ring-1 ring-amber-500/30'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 ring-1 ring-amber-300/60'
            }`}
            title="Shift Register / Cash Float & Z-Report (F7)"
          >
            <Receipt className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="hidden sm:inline font-bold">
              {activeShift ? `Shift #${activeShift.shift_code || activeShift.id}` : 'Shift Register'} [F7]
            </span>
          </button>

          {/* Returns & Credit Notes */}
          <button
            onClick={() => setIsReturnsModalOpen(true)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="Customer Item Returns & Credit Note Vouchers (F6)"
          >
            <RotateCcw className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="hidden md:inline">Returns [F6]</span>
          </button>

          {/* Touch Grid Toggle */}
          <button
            onClick={() => setIsQuickKeysView(prev => !prev)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isQuickKeysView
                ? 'bg-brand-500/20 border-brand-500 text-brand-400 font-bold ring-1 ring-brand-500/40'
                : isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle Fast Touch Catalog Grid (F10)"
          >
            <Grid className="w-4 h-4 text-brand-500 shrink-0" />
            <span className="hidden md:inline">Touch Grid [F10]</span>
          </button>

          {/* Sound Alerts / Mute Toggle Button */}
          <button
            onClick={toggleSoundMute}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              !isMuted
                ? isDark
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-300/60'
                : isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-200'
            }`}
            title={isMuted ? 'Sound Alerts Muted (Click to Enable Sound)' : 'Sound Alerts Enabled (Click to Mute)'}
          >
            {!isMuted ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="hidden sm:inline font-bold">Sound ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="hidden sm:inline font-medium">Muted</span>
              </>
            )}
          </button>

          {/* Prominent Cart Icon with Live Count & View All Products */}
          <button
            onClick={() => setIsCartModalOpen(true)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              cart.length > 0
                ? isDark
                  ? 'bg-brand-500/15 border-brand-500/50 text-brand-300 hover:bg-brand-500/25 ring-1 ring-brand-500/30'
                  : 'bg-brand-50 border-brand-300 text-brand-800 hover:bg-brand-100 ring-1 ring-brand-300/60'
                : isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
            }`}
            title="Click to View All Products in Cart"
          >
            <div className="relative flex items-center">
              <ShoppingCart className="w-4 h-4 text-brand-500" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-sm">
                  {cart.length}
                </span>
              )}
            </div>
            <span>
              Cart ({cart.length} • {totalCartQuantity} Pcs)
            </span>
            {cart.length > 0 && (
              <span className="font-mono text-emerald-500 font-bold pl-1 border-l border-brand-500/30">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            )}
          </button>

          {heldBills.length > 0 && (
            <button
              onClick={() => handleRecallBill()}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-300 text-xs font-semibold animate-pulse"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Recall ({heldBills.length}) [F9]</span>
            </button>
          )}

          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs disabled:opacity-40 ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title="Hold Current Bill (F8)"
          >
            <Pause className="w-3.5 h-3.5 text-amber-500" />
            <span>Hold [F8]</span>
          </button>
        </div>
      </div>

      {/* Main Billing Grid */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left 8 Cols: Search & Live Bill Line Items */}
        <div className={`col-span-8 flex flex-col border-r overflow-hidden ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          {/* Barcode & Product Search Bar */}
          <div className={`p-3 border-b relative shrink-0 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="relative">
              <Barcode className="w-5 h-5 text-brand-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = searchQuery.trim().toLowerCase();
                    const exactBarcode = products.find(p => p.barcode && p.barcode.toLowerCase() === q);
                    if (exactBarcode) {
                      addToCart(exactBarcode);
                    } else if (searchResults.length > 0) {
                      addToCart(searchResults[0]);
                    } else if (q) {
                      playErrorSound(isMuted);
                    }
                  }
                }}
                placeholder="Scan Barcode or Search Items by Name, Brand, SKU, HSN... (Press Enter to Add)"
                className={`w-full border rounded-xl pl-11 pr-4 py-2.5 text-sm font-mono shadow-inner outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${
                  isDark ? 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                autoFocus
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                F3 Search
              </span>
            </div>

            {/* Dropdown Search Results Overlay */}
            {searchResults.length > 0 && (
              <div className={`absolute left-3 right-3 top-full mt-1 border rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto divide-y ${
                isDark ? 'bg-slate-900 border-slate-700 divide-slate-800' : 'bg-white border-slate-300 divide-slate-100'
              }`}>
                {searchResults.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className={`p-3 cursor-pointer flex items-center justify-between transition-colors group ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {prod.image_url ? (
                        <img 
                          src={prod.image_url} 
                          alt={prod.name} 
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700/50 shrink-0 shadow-sm" 
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold text-sm truncate group-hover:text-brand-500 ${isDark ? 'text-white' : 'text-slate-900'}`}>{prod.name}</span>
                          {prod.trade_scheme && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 shrink-0">
                              {prod.trade_scheme}
                            </span>
                          )}
                          {prod.has_batch === 1 && (
                            <span className="text-[10px] font-mono px-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 shrink-0">
                              Pharma Batch
                            </span>
                          )}
                          {prod.has_serial_imei === 1 && (
                            <span className="text-[10px] font-mono px-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30 shrink-0">
                              IMEI
                            </span>
                          )}
                        </div>
                        <div className={`text-xs flex items-center space-x-3 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span>Barcode: <strong className="font-mono">{prod.barcode || 'N/A'}</strong></span>
                          <span>Stock: <strong className={prod.current_stock <= prod.min_stock_alert ? 'text-rose-500' : 'text-emerald-500'}>{prod.current_stock} {prod.unit}</strong></span>
                          <span>GST: {prod.tax_rate}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <div className="text-sm font-black text-brand-600 dark:text-brand-400">
                        ₹{(priceTier === 'WHOLESALE' ? prod.wholesale_rate : (priceTier === 'DEALER' ? prod.dealer_rate : prod.retail_rate)).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 line-through">MRP: ₹{prod.mrp}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Area: Quick Keys Grid OR Cart Line Items */}
          {isQuickKeysView ? (
            <div className="flex-1 overflow-hidden p-3 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/40 shrink-0">
                <div className="flex items-center space-x-2">
                  <Grid className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-bold">Fast-Touch Quick Keys Tile Grid</span>
                </div>
                <span className="text-[11px] text-slate-400">1-Tap adds loose & fast-selling items directly to cart</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <QuickKeysGrid 
                  products={products} 
                  onSelectItem={addToCart} 
                  priceTier={priceTier} 
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3">
                  <Barcode className={`w-16 h-16 stroke-1 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cart is Empty</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Scan a product barcode, press F3 to search, or toggle Touch Grid [F10].</p>
                  </div>
                </div>
              ) : (
                <div className={`border rounded-xl overflow-hidden shadow-lg ${
                  isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
                }`}>
                  {/* Cart Subheader with quick View All toggle */}
                  <div className={`px-3 py-2 border-b flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="w-3.5 h-3.5 text-brand-500" />
                      <span className="font-bold">
                        Current Cart: {cart.length} {cart.length === 1 ? 'Product' : 'Products'} ({totalCartQuantity} Units)
                      </span>
                    </div>
                    <button
                      onClick={() => setIsCartModalOpen(true)}
                      className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                    >
                      <span>View All in Full Cart</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                      isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item Details</th>
                        <th className="py-2.5 px-3 text-center">Qty / Free</th>
                        <th className="py-2.5 px-3 text-right">Price (₹)</th>
                        <th className="py-2.5 px-3 text-center">GST</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        <th className="py-2.5 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {cart.map((item, idx) => (
                        <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2.5">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.item_name} 
                                  className="w-9 h-9 object-cover rounded-lg border border-slate-700/50 shrink-0 shadow-sm" 
                                />
                              ) : (
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                  isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                                }`}>
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.item_name}</div>
                                <div className="text-[10px] flex flex-wrap gap-2 mt-0.5">
                                  {item.batch_no && <span className="text-purple-500 dark:text-purple-300">Batch: {item.batch_no} (Exp: {item.expiry_date})</span>}
                                  {item.serial_imei && <span className="text-blue-500 dark:text-blue-300">IMEI: {item.serial_imei}</span>}
                                  {item.variant_details && <span className="text-amber-500 dark:text-amber-300">{item.variant_details}</span>}
                                  {item.trade_scheme && <span className="text-emerald-500 font-semibold">{item.trade_scheme}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center space-x-1">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => updateCartItemQty(idx, e.target.value)}
                                className={`w-14 border rounded px-1.5 py-1 text-center font-bold focus:border-brand-500 outline-none ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => applyScaleWeightToCart(idx)}
                                className={`p-1 rounded border transition-colors ${
                                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-purple-900/40 text-purple-400' : 'border-slate-300 bg-white hover:bg-purple-50 text-purple-600'
                                }`}
                                title="Grab live weight from Electronic Weighing Scale"
                              >
                                <Scale className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] text-slate-400">{item.unit}</span>
                              {item.free_quantity > 0 && (
                                <span className="px-1 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold text-[10px]">
                                  +{item.free_quantity} Free
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateCartItemPrice(idx, e.target.value)}
                              className={`w-16 border rounded px-1.5 py-1 text-right font-mono font-semibold focus:border-brand-500 outline-none ${
                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{item.tax_rate}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-brand-600 dark:text-brand-400 font-mono">
                            ₹{((item.quantity * item.unit_price) - (item.discount_amount || 0)).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Right 4 Cols: Bill Summary & Tender Actions */}
        <div className={`col-span-4 flex flex-col justify-between p-4 overflow-y-auto ${
          isDark ? 'bg-slate-900' : 'bg-slate-50'
        }`}>
          <div className="space-y-4">
            {/* Customer Details Summary Banner */}
            {selectedCustomer ? (
              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedCustomer.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30 shrink-0">
                      {selectedCustomer.customer_type || 'RETAIL'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => {
                        setCustomerSearchQuery('');
                        setIsCustomerSearchModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-sky-500 hover:underline px-1"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleClearCustomer}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-500 px-1"
                      title="Clear to Walk-in Customer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {selectedCustomer.phone && <div className="text-slate-400 font-mono">Mobile: {selectedCustomer.phone}</div>}
                {selectedCustomer.gstin && (
                  <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                    GSTIN: {selectedCustomer.gstin} (B2B Tax Invoice)
                  </div>
                )}
                {selectedCustomer.route_beat && <div className="text-[11px] text-amber-500 font-semibold">Route: {selectedCustomer.route_beat}</div>}
                <div className={`flex justify-between pt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-slate-500">Khata / Udhar Balance:</span>
                  <span className={`font-bold font-mono ${selectedCustomer.current_balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ₹{selectedCustomer.current_balance?.toLocaleString('en-IN') || '0'}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-400">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Walk-in Customer</div>
                    <div className="text-[10px] text-slate-400">Cash / Retail Counter Sale</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setCustomerSearchQuery('');
                      setIsCustomerSearchModalOpen(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[11px] font-bold border border-sky-500/30 transition-all"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => {
                      setNewCustomerForm({
                        ...initialCustomerForm,
                        state_code: activeShop?.state_code || '07'
                      });
                      setIsAddCustomerModalOpen(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bill Summary Calculations */}
            <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex justify-between text-slate-500">
                <span>Items Sub Total:</span>
                <span className={`font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{subTotal.toFixed(2)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Discount:</span>
                </span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                    className={`w-14 border rounded px-1.5 py-0.5 text-right font-mono text-xs ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={() => setOverallDiscountType(overallDiscountType === 'PERCENT' ? 'FIXED' : 'PERCENT')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {overallDiscountType === 'PERCENT' ? '%' : '₹'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>Taxable Amount:</span>
                <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>₹{taxableTotal.toFixed(2)}</span>
              </div>

              {/* Grand Total Display */}
              <div className={`pt-3 border-t-2 flex justify-between items-baseline ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Amount</div>
                  <div className="text-[11px] text-emerald-500">Inclusive of All GST</div>
                </div>
                <div className="text-2xl font-black text-brand-600 dark:text-brand-400 font-mono tracking-tight">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Tender Button */}
          <div className="pt-4 space-y-2">
            <button
              onClick={openTenderModal}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-base shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Banknote className="w-5 h-5" />
              <span>Collect Payment [F4]</span>
            </button>
            <div className={`text-center text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              F2: New Bill • F3: Search • F4: Tender • F8: Hold • F9: Recall
            </div>
          </div>
        </div>
      </div>

      {/* Cart Overview / View All Products in Cart Modal */}
      {isCartModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-brand-500/20 text-brand-500">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Cart Overview & Product List
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {cart.length} unique {cart.length === 1 ? 'item' : 'items'} • {totalCartQuantity} total pieces/units in active cart
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {cart.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove all items from this cart?')) {
                        playDeleteSound(isMuted);
                        setCart([]);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center space-x-1 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cart</span>
                  </button>
                )}
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Products Table */}
            <div className="p-4 flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <ShoppingBag className={`w-16 h-16 stroke-1 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                  <div>
                    <h4 className="font-bold text-sm">Your Cart is Empty</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Scan barcodes or search for products to add them to the cart.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsCartModalOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md hover:bg-brand-500 transition-all"
                  >
                    Search Products (F3)
                  </button>
                </div>
              ) : (
                <div className={`border rounded-xl overflow-hidden shadow-inner ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                      isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <tr>
                        <th className="py-3 px-3">#</th>
                        <th className="py-3 px-3">Product Name & Details</th>
                        <th className="py-3 px-3 text-center">Quantity (Units)</th>
                        <th className="py-3 px-3 text-right">Unit Price (₹)</th>
                        <th className="py-3 px-3 text-center">GST %</th>
                        <th className="py-3 px-3 text-right">Line Total (₹)</th>
                        <th className="py-3 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
                      {cart.map((item, idx) => (
                        <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-white'}>
                          <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-3">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.item_name} 
                                  className="w-11 h-11 object-cover rounded-xl border border-slate-700/50 shrink-0 shadow-sm" 
                                />
                              ) : (
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                  isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                                }`}>
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {item.item_name}
                                </div>
                                <div className="text-[11px] flex flex-wrap gap-2 mt-1">
                                  {item.batch_no && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20 font-mono text-[10px]">
                                      Batch: {item.batch_no} (Exp: {item.expiry_date})
                                    </span>
                                  )}
                                  {item.serial_imei && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono text-[10px]">
                                      IMEI: {item.serial_imei}
                                    </span>
                                  )}
                                  {item.variant_details && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                                      {item.variant_details}
                                    </span>
                                  )}
                                  {item.trade_scheme && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[10px]">
                                      {item.trade_scheme}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center space-x-1.5 bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-lg">
                              <button
                                onClick={() => updateCartItemQty(idx, item.quantity - 1)}
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-sm'
                                }`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateCartItemQty(idx, e.target.value)}
                                className={`w-12 border rounded px-1 py-0.5 text-center font-bold font-mono text-xs focus:border-brand-500 outline-none ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                              <button
                                onClick={() => updateCartItemQty(idx, item.quantity + 1)}
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-800 shadow-sm'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-slate-400 pl-1">{item.unit}</span>
                            </div>
                            {item.free_quantity > 0 && (
                              <div className="mt-1">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold text-[10px]">
                                  +{item.free_quantity} Free Units
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateCartItemPrice(idx, e.target.value)}
                              className={`w-20 border rounded px-2 py-1 text-right font-mono font-semibold focus:border-brand-500 outline-none ${
                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {item.tax_rate}%
                          </td>
                          <td className="py-3 px-3 text-right font-bold font-mono text-brand-600 dark:text-brand-400 text-sm">
                            ₹{((item.quantity * item.unit_price) - (item.discount_amount || 0)).toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer: Grand Summary & Proceed Actions */}
            {cart.length > 0 && (
              <div className={`p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Financial Summary */}
                <div className="flex items-center space-x-6 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Subtotal</span>
                    <span className="font-bold text-sm">₹{subTotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div>
                      <span className="text-emerald-500 block text-[10px] uppercase">Discount</span>
                      <span className="font-bold text-sm text-emerald-500">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Taxable</span>
                    <span className="font-bold text-sm">₹{taxableTotal.toFixed(2)}</span>
                  </div>
                  <div className="pl-3 border-l border-slate-700/50">
                    <span className="text-brand-500 block text-[10px] uppercase font-bold">Grand Total</span>
                    <span className="font-black text-xl text-brand-600 dark:text-brand-400">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <button
                    onClick={() => setIsCartModalOpen(false)}
                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Continue Adding Items
                  </button>
                  <button
                    onClick={() => {
                      setIsCartModalOpen(false);
                      openTenderModal();
                    }}
                    className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Proceed to Tender [F4]</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tender / Payment Modal */}
      {isTenderOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment & Tender Checkout</h3>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-mono font-bold">Total Bill: ₹{grandTotal.toLocaleString('en-IN')}</p>
              </div>
              <button onClick={() => setIsTenderOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Sales Assistant / Staff Attribution */}
              {employees.length > 0 && (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="font-semibold text-slate-400">Sales Staff / Commission:</span>
                  </div>
                  <select
                    value={selectedSalesEmployeeId}
                    onChange={(e) => setSelectedSalesEmployeeId(e.target.value)}
                    className={`border rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:border-brand-500 cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- No Staff Attribution --</option>
                    {employees.filter(e => e.is_active !== 0).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation || 'Staff'}) {emp.sales_commission_percent > 0 ? `• ${emp.sales_commission_percent}% Comm.` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Loyalty Points Redemption Section */}
              {selectedCustomer && (selectedCustomer.loyalty_points || 0) > 0 && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-600 dark:text-amber-300">
                      <Coins className="w-4 h-4 shrink-0" />
                      <span>Loyalty Reward Points</span>
                    </div>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                      Available: {selectedCustomer.loyalty_points} pts (₹{selectedCustomer.loyalty_points * (loyaltyConfig?.redeemValueRs || 1)})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 text-[11px]">Redeem Points:</span>
                    <input
                      type="number"
                      min="0"
                      max={maxRedeemablePoints}
                      value={redeemLoyaltyPoints || ''}
                      onChange={(e) => {
                        const val = Math.min(maxRedeemablePoints, Math.max(0, parseInt(e.target.value, 10) || 0));
                        setRedeemLoyaltyPoints(val);
                      }}
                      placeholder={`Max ${maxRedeemablePoints}`}
                      className={`w-28 border rounded-lg px-2 py-1 text-xs font-mono font-bold outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setRedeemLoyaltyPoints(maxRedeemablePoints)}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/40"
                    >
                      Max ({maxRedeemablePoints})
                    </button>
                    {loyaltyDiscount > 0 && (
                      <span className="font-bold text-emerald-500 font-mono text-xs ml-auto">
                        -₹{loyaltyDiscount.toFixed(2)} Off
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Credit Note Voucher Redemption Section */}
              <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                appliedCreditNote 
                  ? 'border-purple-500/40 bg-purple-500/10' 
                  : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-purple-600 dark:text-purple-300">
                    <Tag className="w-4 h-4 shrink-0" />
                    <span>Redeem Store Credit Note / Voucher</span>
                  </div>
                  {appliedCreditNote && (
                    <button
                      type="button"
                      onClick={handleRemoveCreditNote}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {appliedCreditNote ? (
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{appliedCreditNote.credit_note_code}</span>
                      <span className="text-[11px] text-slate-400 ml-2">Available: ₹{appliedCreditNote.balance}</span>
                    </div>
                    <span className="font-bold font-mono text-emerald-500">
                      -₹{creditNoteDiscount.toFixed(2)} Applied
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={creditNoteCode}
                      onChange={(e) => setCreditNoteCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CN-2026-0001"
                      className={`flex-1 border rounded-lg px-2.5 py-1 text-xs font-mono font-bold uppercase outline-none focus:border-purple-500 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCreditNote}
                      disabled={!creditNoteCode.trim() || isVerifyingCreditNote}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-40"
                    >
                      {isVerifyingCreditNote ? 'Checking...' : 'Apply Voucher'}
                    </button>
                  </div>
                )}
                {creditNoteError && (
                  <p className="text-[11px] text-rose-500 font-semibold">{creditNoteError}</p>
                )}
              </div>

              {/* Payment Mode Buttons */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'CASH', label: 'Cash', icon: Banknote },
                  { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                  { id: 'CARD', label: 'Card / POS', icon: CreditCard },
                  { id: 'CREDIT', label: 'Credit (Udhar)', icon: Users },
                  { id: 'SPLIT', label: 'Split Pay', icon: Split }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setPaymentMode(mode.id);
                        if (mode.id === 'SPLIT') {
                          setSplitAmounts({
                            cash: grandTotal.toString(),
                            upi: '',
                            card: '',
                            credit: ''
                          });
                        }
                      }}
                      className={`p-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 border transition-all ${
                        isSelected
                          ? 'bg-brand-500/20 border-brand-500 text-brand-600 dark:text-brand-400 font-bold shadow-md ring-1 ring-brand-500/30'
                          : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] truncate font-semibold">{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic QR Display if UPI selected */}
              {paymentMode === 'UPI' && upiQrUrl && (
                <div className={`p-4 rounded-xl border text-center space-y-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Scan UPI QR to Pay ₹{grandTotal}</div>
                  <img src={upiQrUrl} alt="UPI QR" className="w-32 h-32 mx-auto bg-white p-1 rounded-lg shadow-md" />
                  <div className="text-[10px] text-slate-400">PhonePe • Google Pay • Paytm • BHIM</div>
                </div>
              )}

              {/* Split / Multi-Tender Breakdown */}
              {paymentMode === 'SPLIT' && (
                <div className={`p-3.5 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center space-x-1">
                      <Split className="w-3.5 h-3.5 text-brand-500" />
                      <span>Split Payment Tender Breakdown:</span>
                    </span>
                    <span className="font-mono text-slate-400">
                      Target: <strong className="text-white">₹{grandTotal}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Cash (₹)</label>
                      <input
                        type="number"
                        value={splitAmounts.cash}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, cash: e.target.value })}
                        placeholder="0"
                        className={`w-full border rounded-lg px-2.5 py-1.5 font-mono font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">UPI / QR (₹)</label>
                      <input
                        type="number"
                        value={splitAmounts.upi}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, upi: e.target.value })}
                        placeholder="0"
                        className={`w-full border rounded-lg px-2.5 py-1.5 font-mono font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Card / POS (₹)</label>
                      <input
                        type="number"
                        value={splitAmounts.card}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, card: e.target.value })}
                        placeholder="0"
                        className={`w-full border rounded-lg px-2.5 py-1.5 font-mono font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Credit / Udhar (₹)</label>
                      <input
                        type="number"
                        value={splitAmounts.credit}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, credit: e.target.value })}
                        placeholder="0"
                        className={`w-full border rounded-lg px-2.5 py-1.5 font-mono font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
                    <span className="text-slate-400">Total Tender Allocated:</span>
                    <span className={`font-bold ${splitRemaining === 0 ? 'text-emerald-500' : 'text-amber-400'}`}>
                      ₹{splitTotal} / ₹{grandTotal} {splitRemaining > 0 ? `(₹${splitRemaining} Unallocated)` : '✓ Settled'}
                    </span>
                  </div>
                </div>
              )}

              {/* Credit Udhar Customer Check / Balance Display */}
              {paymentMode === 'CREDIT' && (
                <div className={`p-4 rounded-xl border space-y-2.5 ${
                  selectedCustomer
                    ? isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300'
                }`}>
                  {selectedCustomer ? (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Khata Customer:</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedCustomer.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-400">Current Balance:</span>
                        <span className="font-bold text-rose-500">₹{selectedCustomer.current_balance?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-400">Credit Limit:</span>
                        <span className="text-slate-300">₹{selectedCustomer.credit_limit?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className={`flex justify-between items-center text-xs font-mono font-bold pt-2 border-t ${
                        isDark ? 'border-slate-800' : 'border-slate-200'
                      }`}>
                        <span>New Udhar Balance:</span>
                        <span className="text-rose-500">
                          ₹{((selectedCustomer.current_balance || 0) + grandTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-600 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Credit (Udhar) requires a registered customer account!</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Walk-in customers cannot take items on credit. Please select an existing customer or create a new one.
                      </p>
                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchQuery('');
                            setIsCustomerSearchModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 text-white font-bold text-xs"
                        >
                          Select Existing Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCustomerForm({
                              ...initialCustomerForm,
                              state_code: activeShop?.state_code || '07'
                            });
                            setIsAddCustomerModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ New Customer</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cash Tendered & Change Calculation */}
              {paymentMode === 'CASH' && (
                <div className={`p-3 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Cash Received from Customer (₹):</label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className={`w-32 border rounded-lg px-3 py-1.5 text-right font-mono font-bold text-sm focus:border-brand-500 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex space-x-2">
                    {[grandTotal, 100, 200, 500, 2000].map((amt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCashTendered(amt.toString())}
                        className={`px-2.5 py-1 rounded text-xs font-mono border ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  <div className={`flex justify-between pt-2 border-t font-mono text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <span className="text-slate-500">Change / Return to Customer:</span>
                    <span className={`font-black text-sm ${changeDue > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Print Format Choice */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Print Format:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPrintFormat('THERMAL')}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold ${
                      printFormat === 'THERMAL' 
                        ? 'bg-brand-600 border-brand-500 text-white' 
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    80mm Thermal Slip
                  </button>
                  <button
                    onClick={() => setPrintFormat('A4')}
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold ${
                      printFormat === 'A4' 
                        ? 'bg-brand-600 border-brand-500 text-white' 
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    A4 GST Tax Invoice
                  </button>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={
                  (paymentMode === 'CREDIT' && !selectedCustomer) ||
                  (paymentMode === 'SPLIT' && (parseFloat(splitAmounts.credit) || 0) > 0 && !selectedCustomer)
                }
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>Complete Bill & Print ({printFormat})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Customer Search & Selection Modal */}
      {isCustomerSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Select or Search Customer
                  </h3>
                  <p className="text-xs text-slate-400">Attach customer to current bill for GST invoice or Khata (Udhar)</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsCustomerSearchModalOpen(false);
                    setNewCustomerForm({
                      ...initialCustomerForm,
                      state_code: activeShop?.state_code || '07'
                    });
                    setIsAddCustomerModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center space-x-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Customer</span>
                </button>
                <button
                  onClick={() => setIsCustomerSearchModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Live Search Input */}
            <div className={`p-3 border-b ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Search by customer name, mobile number, GSTIN, route..."
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-sky-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
              {/* Option 1: Walk-in Customer (Default) */}
              <div
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsCustomerSearchModalOpen(false);
                }}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  !selectedCustomer
                    ? 'border-sky-500/50 bg-sky-500/10'
                    : isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Walk-in Customer (Cash Sale)</div>
                    <div className="text-[10px] text-slate-400">No account ledger • Default counter bill</div>
                  </div>
                </div>
                {!selectedCustomer && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500 text-white">Active</span>
                )}
              </div>

              {/* Customer List Filtered */}
              {customers
                .filter(c => {
                  if (!customerSearchQuery.trim()) return true;
                  const q = customerSearchQuery.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.gstin && c.gstin.toLowerCase().includes(q)) ||
                    (c.route_beat && c.route_beat.toLowerCase().includes(q)) ||
                    (c.address && c.address.toLowerCase().includes(q))
                  );
                })
                .map(cust => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-sky-500/60 bg-sky-500/10'
                          : isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{cust.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                              {cust.customer_type || 'RETAIL'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                            {cust.phone && <span>📱 {cust.phone}</span>}
                            {cust.gstin && <span className="text-cyan-600 dark:text-cyan-400">GST: {cust.gstin}</span>}
                            {cust.route_beat && <span>Route: {cust.route_beat}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs font-mono font-bold ${cust.current_balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {cust.current_balance > 0 ? `₹${cust.current_balance} Due` : '₹0 Balance'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">Limit: ₹{cust.credit_limit?.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Quick Create / Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Add New Customer
                  </h3>
                  <p className="text-xs text-slate-400">Register customer and immediately attach to current bill</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-semibold outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. Ramesh Kumar / Gupta Store"
                    autoFocus
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Mobile Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer Type
                  </label>
                  <select
                    value={newCustomerForm.customer_type}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customer_type: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="RETAIL">Retail Consumer (B2C)</option>
                    <option value="WHOLESALE">Wholesale / Business Dealer (B2B)</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    GSTIN (Optional for B2B)
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.gstin}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstin: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-lg p-2 font-mono uppercase outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Address / Locality / City
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.address}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. Sector 18, Noida"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Route / Beat / Area
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.route_beat}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, route_beat: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. Market Route 2"
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
                    value={newCustomerForm.credit_limit}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, credit_limit: parseFloat(e.target.value) || 0 })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Opening Balance / Udhar (₹)
                  </label>
                  <input
                    type="number"
                    value={newCustomerForm.opening_balance}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, opening_balance: parseFloat(e.target.value) || 0 })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Select Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {customerNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{customerNotification}</span>
        </div>
      )}

      {/* Print Preview Overlays with dynamic format switching */}
      {recentInvoice && printFormat === 'THERMAL' && (
        <ThermalReceipt
          invoice={recentInvoice}
          onClose={() => setRecentInvoice(null)}
          onSwitchToA4={() => setPrintFormat('A4')}
        />
      )}

      {recentInvoice && printFormat === 'A4' && (
        <A4TaxInvoice
          invoice={recentInvoice}
          onClose={() => setRecentInvoice(null)}
          onSwitchToThermal={() => setPrintFormat('THERMAL')}
        />
      )}

      {/* Shift Register (X/Z Report) Modal */}
      <ShiftRegisterModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onShiftUpdated={fetchActiveShift}
      />

      {/* Customer Item Returns & Credit Note Modal */}
      <ReturnsModal
        isOpen={isReturnsModalOpen}
        onClose={() => setIsReturnsModalOpen(false)}
        onReturnProcessed={() => {
          fetchProducts();
        }}
      />
    </div>
  );
}
