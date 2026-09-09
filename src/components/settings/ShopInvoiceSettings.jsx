import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { generateUpiQrDataUrl } from '../../utils/upiQr';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { FirstRunWizard } from '../common/FirstRunWizard';
import { 
  Store, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  CreditCard, 
  QrCode, 
  Landmark, 
  CheckCircle2, 
  Save, 
  Printer, 
  Sparkles, 
  Eye, 
  FileCheck,
  ShieldCheck,
  Globe,
  Upload,
  Image as ImageIcon,
  Trash2,
  Zap,
  Info,
  Wand2,
  AlertTriangle,
  RotateCcw,
  Send,
  MessageCircle,
  Key,
  Share2
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

export const STORE_ICONS = [
  { icon: '🏬', label: 'General Retail', type: 'GENERAL_RETAIL' },
  { icon: '🛒', label: 'Supermarket / Grocery', type: 'SUPERMARKET' },
  { icon: '👗', label: 'Garments & Fashion', type: 'GARMENTS' },
  { icon: '💊', label: 'Pharmacy & Medical', type: 'PHARMACY' },
  { icon: '🔩', label: 'Hardware & Sanitary', type: 'HARDWARE' },
  { icon: '📱', label: 'Electronics & Mobile', type: 'ELECTRONICS' },
  { icon: '🎂', label: 'Bakery & Sweets', type: 'BAKERY' },
  { icon: '📦', label: 'FMCG Wholesale', type: 'FMCG_WHOLESALE' },
  { icon: '💎', label: 'Jewelry & Watches' },
  { icon: '🍕', label: 'Restaurant & Cafe' },
  { icon: '📚', label: 'Bookstore & Stationery' },
  { icon: '👟', label: 'Footwear & Shoes' },
  { icon: '💄', label: 'Cosmetics & Beauty' },
  { icon: '🥩', label: 'Meat & Poultry' },
  { icon: '🚗', label: 'Auto Parts & Garage' },
  { icon: '🪴', label: 'Nursery & Plant Store' }
];

export const getDefaultIconForShopType = (type) => {
  switch (type) {
    case 'GARMENTS': return '👗';
    case 'PHARMACY': return '💊';
    case 'HARDWARE': return '🔩';
    case 'SUPERMARKET': return '🛒';
    case 'ELECTRONICS': return '📱';
    case 'BAKERY': return '🎂';
    case 'FMCG_WHOLESALE': return '📦';
    case 'GENERAL_RETAIL':
    default:
      return '🏬';
  }
};

export function ShopInvoiceSettings() {
  const { activeShop, shops, switchShop, fetchShops } = useShop();
  const { isDark } = useTheme();
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: 1,
    name: '',
    legal_name: '',
    shop_type: 'GENERAL_RETAIL',
    shop_icon: '🏬',
    logo_url: null,
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Delhi',
    state_code: '07',
    pincode: '',
    gstin: '',
    drug_license_no: '',
    upi_id: '',
    upi_name: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    invoice_prefix: 'INV',
    thermal_footer_note: 'Thank you for shopping with us! Please visit again.',
    terms_conditions: '1. Goods once sold cannot be returned without bill.\n2. Subject to local jurisdiction only.',
    qr_type: 'DYNAMIC', // DYNAMIC, CUSTOM_IMAGE, NONE
    custom_qr_image: null
  });

  const [previewMode, setPreviewMode] = useState('80mm'); // 'A4' or '80mm'
  const [dynamicQrUrl, setDynamicQrUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Commercial Turnkey State
  const [showWizard, setShowWizard] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanOptions, setCleanOptions] = useState({
    resetSales: true,
    resetKhata: true,
    resetInventory: false,
    resetHrms: false
  });
  const [cleanConfirmText, setCleanConfirmText] = useState('');
  const [cleaning, setCleaning] = useState(false);

  // WhatsApp Cloud API State
  const [whatsAppConfig, setWhatsAppConfig] = useState({
    isEnabled: false,
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    senderNumber: '',
    defaultCountryCode: '91'
  });
  const [testPhone, setTestPhone] = useState('');
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [whatsAppTestStatus, setWhatsAppTestStatus] = useState(null);

  useEffect(() => {
    fetch('/api/whatsapp/config')
      .then(res => res.json())
      .then(data => {
        if (data.config) setWhatsAppConfig(data.config);
      })
      .catch(() => {});
  }, []);

  const handleTestWhatsApp = async () => {
    if (!testPhone.trim()) {
      alert('Please enter a valid mobile number (e.g. 9876543210) to send a test WhatsApp message.');
      return;
    }
    setTestingWhatsApp(true);
    setWhatsAppTestStatus(null);
    try {
      const res = await fetch('/api/whatsapp/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone.trim() })
      });
      const data = await res.json();
      setWhatsAppTestStatus(data);
    } catch (e) {
      setWhatsAppTestStatus({ success: false, error: e.message });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  useEffect(() => {
    if (activeShop) {
      setFormData({
        id: activeShop.id,
        name: activeShop.name || '',
        legal_name: activeShop.legal_name || '',
        shop_type: activeShop.shop_type || 'GENERAL_RETAIL',
        shop_icon: activeShop.shop_icon || getDefaultIconForShopType(activeShop.shop_type),
        logo_url: activeShop.logo_url || null,
        phone: activeShop.phone || '',
        email: activeShop.email || '',
        address: activeShop.address || '',
        city: activeShop.city || '',
        state: activeShop.state || 'Delhi',
        state_code: activeShop.state_code || '07',
        pincode: activeShop.pincode || '',
        gstin: activeShop.gstin || '',
        drug_license_no: activeShop.drug_license_no || '',
        upi_id: activeShop.upi_id || '',
        upi_name: activeShop.upi_name || activeShop.name || '',
        bank_name: activeShop.bank_name || '',
        bank_account_no: activeShop.bank_account_no || '',
        bank_ifsc: activeShop.bank_ifsc || '',
        invoice_prefix: activeShop.invoice_prefix || 'INV',
        thermal_footer_note: activeShop.thermal_footer_note || 'Thank you for shopping with us! Please visit again.',
        terms_conditions: activeShop.terms_conditions || '1. Goods once sold cannot be returned without bill.\n2. Subject to local jurisdiction only.',
        qr_type: activeShop.qr_type || 'DYNAMIC',
        custom_qr_image: activeShop.custom_qr_image || null
      });
    }
  }, [activeShop]);

  // Live Dynamic UPI QR generation for preview
  useEffect(() => {
    if (formData.upi_id) {
      generateUpiQrDataUrl({
        upiId: formData.upi_id,
        name: formData.upi_name || formData.name || 'Merchant',
        amount: 1450,
        invoiceNumber: `${formData.invoice_prefix || 'INV'}-2026-0001`
      }).then(url => setDynamicQrUrl(url));
    } else {
      setDynamicQrUrl(null);
    }
  }, [formData.upi_id, formData.upi_name, formData.name, formData.invoice_prefix]);

  // Handle Custom QR Image upload from PC
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, or JPEG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        qr_type: 'CUSTOM_IMAGE',
        custom_qr_image: reader.result
      }));
      setNotification({ type: 'success', message: 'Custom QR Standee image uploaded successfully!' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomImage = () => {
    setFormData(prev => ({
      ...prev,
      custom_qr_image: null,
      qr_type: 'DYNAMIC'
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, or SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        logo_url: reader.result
      }));
      setNotification({ type: 'success', message: 'Shop brand logo uploaded successfully!' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      logo_url: null
    }));
  };

  const handleShopTypeChange = (newType) => {
    const defaultIcon = getDefaultIconForShopType(newType);
    setFormData(prev => ({
      ...prev,
      shop_type: newType,
      shop_icon: defaultIcon
    }));
  };

  const applySectorPreset = (sectorKey) => {
    const icon = getDefaultIconForShopType(sectorKey);
    if (sectorKey === 'GARMENTS') {
      setFormData(prev => ({
        ...prev,
        shop_type: 'GARMENTS',
        shop_icon: icon,
        terms_conditions: '1. Exchange allowed within 7 days with original price tag and bill intact.\n2. No exchange or return on altered garments or sale items.\n3. Subject to local jurisdiction.',
        thermal_footer_note: 'Thank you for shopping with us! Looking forward to your next visit.'
      }));
      setNotification({ type: 'success', message: 'Applied Garments & Apparel terms and policy preset!' });
    } else if (sectorKey === 'PHARMACY') {
      setFormData(prev => ({
        ...prev,
        shop_type: 'PHARMACY',
        shop_icon: icon,
        terms_conditions: '1. Licensed Retail Pharmacy. Store medicines in cool, dry place.\n2. Schedule H & H1 drugs dispensed strictly against valid medical prescription.\n3. Cut strips or temperature-sensitive medicines cannot be returned.',
        thermal_footer_note: 'Wish you a speedy recovery! Get Well Soon.'
      }));
      setNotification({ type: 'success', message: 'Applied Pharmacy & Medical terms preset!' });
    } else if (sectorKey === 'HARDWARE') {
      setFormData(prev => ({
        ...prev,
        shop_type: 'HARDWARE',
        shop_icon: icon,
        terms_conditions: '1. Goods once cut or customized (pipes, wires, cables, sheets) cannot be returned.\n2. In case of manufacturing defect, brand warranty applies.\n3. 18% p.a. interest chargeable on delayed credit payments after 30 days.',
        thermal_footer_note: 'Thank you for your business! Best building & hardware supplies always.'
      }));
      setNotification({ type: 'success', message: 'Applied Hardware & Sanitary terms preset!' });
    } else if (sectorKey === 'SUPERMARKET') {
      setFormData(prev => ({
        ...prev,
        shop_type: 'SUPERMARKET',
        shop_icon: icon,
        terms_conditions: '1. Goods once sold will not be taken back without bill.\n2. Please check packed items, seal integrity, and expiry dates before leaving counter.\n3. Subject to local jurisdiction.',
        thermal_footer_note: 'Thank you for shopping at our supermarket! Visit again soon.'
      }));
      setNotification({ type: 'success', message: 'Applied Supermarket & Grocery terms preset!' });
    }
  };

  const handleStateChange = (e) => {
    const selectedStateName = e.target.value;
    const foundState = INDIAN_STATES.find(s => s.name === selectedStateName);
    setFormData(prev => ({
      ...prev,
      state: selectedStateName,
      state_code: foundState ? foundState.code : prev.state_code
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      // Also save WhatsApp Cloud API configuration
      await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsAppConfig)
      });

      if (data.success) {
        setNotification({ type: 'success', message: 'Shop details, WhatsApp Cloud API & Invoice settings saved successfully!' });
        await fetchShops();
      } else {
        alert(data.message || 'Error saving shop settings.');
      }
    } catch (err) {
      alert('Error updating shop settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCleanDemoData = async () => {
    if (cleanConfirmText.trim().toUpperCase() !== 'CLEAN') {
      alert('Please type CLEAN in capital letters to confirm reset.');
      return;
    }
    setCleaning(true);
    try {
      const res = await fetch('/api/settings/clean-demo-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanOptions)
      });
      const data = await res.json();
      if (data.success) {
        setShowCleanModal(false);
        setCleanConfirmText('');
        setNotification({ type: 'success', message: 'Demo data cleaned successfully! Your store is ready for real customers.' });
        if (fetchShops) await fetchShops();
      } else {
        alert(data.message || 'Error cleaning demo data');
      }
    } catch (err) {
      alert('Failed to clean demo data: ' + err.message);
    } finally {
      setCleaning(false);
    }
  };

  // Determine which QR image to render in preview
  const activeQrPreviewUrl = 
    formData.qr_type === 'NONE' 
      ? null 
      : formData.qr_type === 'CUSTOM_IMAGE' && formData.custom_qr_image
        ? formData.custom_qr_image
        : dynamicQrUrl;

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
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Shop Details & Invoice Settings
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/30">
              FleetBill Pro Engine
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Configure your shop identity, GSTIN, Bank details, and choose between <strong>Dynamic UPI QR</strong> or <strong>Custom Standee QR Image</strong>.
          </p>
        </div>

        {/* Action Buttons: Wizard, Clean Demo, Branch Selector & Save */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowWizard(true)}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center space-x-1.5 transition-all"
            title="Launch 3-step Store Setup Wizard"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Setup Wizard</span>
          </button>

          <button
            onClick={() => setShowCleanModal(true)}
            className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center space-x-1.5 transition-all"
            title="Clean demo invoices & transactions to start fresh"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Clean Demo Data</span>
          </button>

          <div className={`flex items-center space-x-2 border rounded-xl px-3 py-1.5 ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
          }`}>
            <span className="text-base select-none leading-none">
              {formData.shop_icon || getDefaultIconForShopType(formData.shop_type)}
            </span>
            <span className="text-xs text-slate-400 font-medium">Branch:</span>
            <select
              value={activeShop ? activeShop.id : ''}
              onChange={(e) => switchShop(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer"
            >
              {shops.map(s => (
                <option key={s.id} value={s.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                  {(s.shop_icon || getDefaultIconForShopType(s.shop_type))} {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Main Body: 2-Column Responsive Layout */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left Column: Settings Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {notification && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Business Identity */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center space-x-2 border-b pb-3 border-slate-700/50">
                <Store className="w-4 h-4 text-brand-500" />
                <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  1. Business Identity & Branding
                </h2>
              </div>

              {/* Shop Icon & Avatar Selector */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              } space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className={`block text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Default Store Icon & Brand Avatar
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Select a default industry store icon or upload your custom logo for invoices, receipts & branch switcher.
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5 text-brand-500" />
                      <span>Upload Logo</span>
                    </button>
                    {formData.logo_url && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-all flex items-center space-x-1"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  {/* Active Preview Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 via-brand-600/10 to-emerald-500/20 border-2 border-brand-500/40 flex items-center justify-center text-3xl shadow-inner overflow-hidden">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Shop Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span>{formData.shop_icon || getDefaultIconForShopType(formData.shop_type)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow">
                      Active
                    </span>
                  </div>

                  {/* Icon Quick Grid */}
                  <div className="flex-1">
                    <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                      Choose Default Store Icon:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STORE_ICONS.map((item) => {
                        const isSelected = (!formData.logo_url && (formData.shop_icon === item.icon || (!formData.shop_icon && getDefaultIconForShopType(formData.shop_type) === item.icon)));
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, shop_icon: item.icon, logo_url: null }));
                            }}
                            title={item.label}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                              isSelected
                                ? 'bg-brand-500/20 border-2 border-brand-500 shadow-md scale-105'
                                : isDark
                                  ? 'bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                                  : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 shadow-sm'
                            }`}
                          >
                            <span>{item.icon}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Shop / Store Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-semibold text-sm ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-brand-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-brand-500'
                    }`}
                    placeholder="e.g. Dwarka Mart"
                  />
                  <span className="text-[10px] text-slate-400">Printed as primary title on all invoices</span>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Legal / Registered Enterprise Name
                  </label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-brand-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-brand-500'
                    }`}
                    placeholder="e.g. Dwarka Mart Pvt Ltd"
                  />
                  <span className="text-[10px] text-slate-400">Official company entity for GST B2B tax bills</span>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Business Sector / Shop Type
                  </label>
                  <select
                    value={formData.shop_type}
                    onChange={(e) => handleShopTypeChange(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 outline-none font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="GENERAL_RETAIL">🏬 General Retail Store</option>
                    <option value="SUPERMARKET">🛒 Supermarket / Grocery / Kirana</option>
                    <option value="FMCG_WHOLESALE">📦 FMCG & Food Distributor (Biscuits/Masala)</option>
                    <option value="GARMENTS">👗 Garments & Apparel Outlet</option>
                    <option value="PHARMACY">💊 Pharmacy & Medical Healthcare</option>
                    <option value="ELECTRONICS">📱 Electronics & Mobile Store (IMEI)</option>
                    <option value="HARDWARE">🔩 Hardware & Sanitary Store</option>
                    <option value="BAKERY">🎂 Bakery & Sweets Shop</option>
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Primary Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="+91 98535 42577"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="rajesh.sahoo14@gmail.com"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Invoice Bill Prefix *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoice_prefix}
                    onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono font-bold uppercase ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. KS-NOI or DM"
                  />
                  <span className="text-[10px] text-slate-400">Bills format: {formData.invoice_prefix}-2026-0001</span>
                </div>
              </div>
            </div>

            {/* Section 2: Address & GST Details */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center space-x-2 border-b pb-3 border-slate-700/50">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  2. Shop Location & Indian GST Compliance
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Complete Shop Address Line
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="Atala, Balianta"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="Bhubaneswar"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="752101"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    State & GST State Code
                  </label>
                  <select
                    value={formData.state}
                    onChange={handleStateChange}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.name}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    GSTIN Number (15-Digits)
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-700'
                    }`}
                    placeholder="09ABCDE1234F1Z8"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Drug License No (D.L. No)
                    </label>
                    <span className="text-[10px] text-purple-400 font-bold px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                      Pharmacy / Medical
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.drug_license_no}
                    onChange={(e) => setFormData({ ...formData, drug_license_no: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-purple-300' : 'bg-slate-50 border-slate-300 text-purple-700'
                    }`}
                    placeholder="e.g. DL-20B/21B-123456"
                  />
                  <span className="text-[10px] text-slate-400">Printed on Pharmacy bills & tax invoices</span>
                </div>
              </div>
            </div>

            {/* Section 3: UPI QR & Bank Settings (With Upload Option) */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center space-x-2 border-b pb-3 border-slate-700/50">
                <QrCode className="w-4 h-4 text-purple-500" />
                <div>
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    3. UPI QR Code & Bank Account (Printed on Invoices)
                  </h2>
                </div>
              </div>

              {/* QR Mode Selection Cards */}
              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Choose Invoice UPI QR Mode:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode 1: Dynamic QR */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, qr_type: 'DYNAMIC' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.qr_type === 'DYNAMIC'
                        ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                        : isDark ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-brand-500 font-bold text-xs mb-1">
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>Dynamic UPI QR</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Auto-generates QR with <strong>exact bill amount</strong> for PhonePe, GPay, Paytm.
                    </p>
                  </button>

                  {/* Mode 2: Custom Standee Image Upload */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, qr_type: 'CUSTOM_IMAGE' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.qr_type === 'CUSTOM_IMAGE'
                        ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
                        : isDark ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-purple-500 font-bold text-xs mb-1">
                      <ImageIcon className="w-4 h-4 shrink-0" />
                      <span>Upload Standee QR</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Upload your <strong>printed shop standee QR photo</strong> (PhonePe, Paytm, BharatPe).
                    </p>
                  </button>

                  {/* Mode 3: Hide QR */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, qr_type: 'NONE' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.qr_type === 'NONE'
                        ? 'border-slate-500 bg-slate-500/10 ring-1 ring-slate-500'
                        : isDark ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-slate-400 font-bold text-xs mb-1">
                      <span>🚫 Hide QR Code</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Do not print any QR code on sales invoices.
                    </p>
                  </button>
                </div>
              </div>

              {/* Dynamic QR Configuration Inputs */}
              {formData.qr_type === 'DYNAMIC' && (
                <div className={`p-4 rounded-xl border space-y-3 animate-in fade-in ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-1.5 text-brand-500 text-xs font-bold">
                    <Info className="w-3.5 h-3.5" />
                    <span>How Dynamic QR Works:</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    When customers scan this on their PhonePe / GPay / Paytm / BHIM app, the <strong>exact bill total is automatically filled in</strong>. They do not need to type the amount, preventing underpayment.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        UPI VPA ID (Merchant ID) *
                      </label>
                      <input
                        type="text"
                        value={formData.upi_id}
                        onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                          isDark ? 'bg-slate-900 border-slate-700 text-purple-300' : 'bg-white border-slate-300 text-purple-700'
                        }`}
                        placeholder="e.g. Dwarka.Mart@hdfcbank or 9853542577@paytm"
                      />
                    </div>

                    <div>
                      <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        UPI Payee Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.upi_name}
                        onChange={(e) => setFormData({ ...formData, upi_name: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. Dwarka Mart"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Image Upload Box */}
              {formData.qr_type === 'CUSTOM_IMAGE' && (
                <div className={`p-4 rounded-xl border space-y-4 animate-in fade-in ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-purple-500 flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload Shop Standee QR Image</span>
                    </span>
                    {formData.custom_qr_image && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomImage}
                        className="text-rose-500 hover:text-rose-400 text-xs font-semibold flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Image</span>
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                  />

                  {formData.custom_qr_image ? (
                    <div className="flex items-center space-x-4 p-3 rounded-xl border border-purple-500/30 bg-purple-500/10">
                      <img
                        src={formData.custom_qr_image}
                        alt="Uploaded QR Standee"
                        className="w-20 h-20 object-contain bg-white rounded-lg border p-1"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Custom Standee Image Active</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">This exact QR code image will appear on all your Thermal & A4 Invoices.</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 text-xs font-semibold text-purple-400 hover:underline"
                        >
                          Change image...
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDark ? 'border-slate-700 hover:border-purple-500 bg-slate-900/40' : 'border-slate-300 hover:border-purple-500 bg-white'
                      }`}
                    >
                      <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-xs font-bold text-purple-400">Click to Browse & Upload QR Image</div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Upload a photo of your PhonePe / Paytm / Google Pay / Bank Standee QR (PNG, JPG, JPEG)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="HDFC Bank / SBI"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.bank_account_no}
                    onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="50200012345678"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Bank IFSC Code
                  </label>
                  <input
                    type="text"
                    value={formData.bank_ifsc}
                    onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono uppercase ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="HDFC0001234"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Invoice Terms & Thermal Notes */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center space-x-2 border-b pb-3 border-slate-700/50">
                <FileCheck className="w-4 h-4 text-sky-500" />
                <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  4. Invoice Terms & Thermal Receipt Greeting
                </h2>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1-Click Industry Policy Presets */}
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center space-x-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      1-Click Industry Policy & Return Presets:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => applySectorPreset('GARMENTS')}
                      className="px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/20"
                    >
                      👗 Garment Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => applySectorPreset('PHARMACY')}
                      className="px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                    >
                      💊 Pharmacy Rx
                    </button>
                    <button
                      type="button"
                      onClick={() => applySectorPreset('HARDWARE')}
                      className="px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                    >
                      🔩 Hardware / B2B
                    </button>
                    <button
                      type="button"
                      onClick={() => applySectorPreset('SUPERMARKET')}
                      className="px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    >
                      🛒 Supermarket
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Thermal Receipt Footer Greeting Message
                  </label>
                  <input
                    type="text"
                    value={formData.thermal_footer_note}
                    onChange={(e) => setFormData({ ...formData, thermal_footer_note: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="Thank you for shopping with us! Please visit again."
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Terms & Conditions / Return Policy (Printed on A4 Invoice)
                  </label>
                  <textarea
                    rows="3"
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="1. Goods once sold will not be returned.&#10;2. Subject to local jurisdiction."
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Direct WhatsApp Cloud API Messaging Integration */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    5. Direct WhatsApp Cloud API Messaging (Meta Graph API)
                  </h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsAppConfig.isEnabled}
                    onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Send digital tax invoices & PDF receipts directly to customers' WhatsApp phones in the background via Official Meta WhatsApp Cloud API.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    WhatsApp Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={whatsAppConfig.phoneNumberId}
                    onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, phoneNumberId: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 109283746592817"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Meta Business Account ID (WABA ID)
                  </label>
                  <input
                    type="text"
                    value={whatsAppConfig.businessAccountId}
                    onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, businessAccountId: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 987654321098765"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Meta System User Permanent Access Token
                  </label>
                  <input
                    type="password"
                    value={whatsAppConfig.accessToken}
                    onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, accessToken: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="EAAB..."
                  />
                </div>
              </div>

              {/* Test Message Dispatch Box */}
              <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <div className="font-bold text-emerald-500 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Test Verification:</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Enter 10-digit Mobile Number"
                    className={`flex-1 border rounded-xl p-2 font-mono outline-none text-xs ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestWhatsApp}
                    disabled={testingWhatsApp}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all flex items-center space-x-1.5 shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${testingWhatsApp ? 'animate-spin' : ''}`} />
                    <span>{testingWhatsApp ? 'Sending...' : 'Send Test Bill'}</span>
                  </button>
                </div>

                {whatsAppTestStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    whatsAppTestStatus.success 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{whatsAppTestStatus.message || whatsAppTestStatus.error}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'Save & Update All Invoice Templates'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Interactive FleetBill-Style Invoice Preview */}
        <div className={`w-full lg:w-[480px] border-t lg:border-t-0 lg:border-l flex flex-col shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200/60 border-slate-300'
        }`}>
          {/* Preview Toolbar */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}>
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-brand-500" />
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Live Invoice Preview</span>
            </div>

            <div className={`flex items-center border rounded-lg p-0.5 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}>
              <button
                onClick={() => setPreviewMode('A4')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  previewMode === 'A4'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 GST Tax
              </button>
              <button
                onClick={() => setPreviewMode('80mm')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  previewMode === '80mm'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm Thermal
              </button>
            </div>
          </div>

          {/* Live Document Preview Box */}
          <div className="flex-1 overflow-y-auto p-4 flex justify-center items-start">
            {previewMode === 'A4' ? (
              /* A4 Tax Invoice Live Simulation */
              <div className="w-full bg-white text-slate-900 p-5 rounded-xl shadow-2xl text-[10px] font-sans border border-slate-300 space-y-3">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-2.5 flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        TAX INVOICE (GST)
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        ORIGINAL FOR RECIPIENT
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{formData.name || 'Store Name'}</h3>
                    {formData.legal_name && <p className="text-[9px] text-slate-600 font-medium">{formData.legal_name}</p>}
                    <p className="text-[9px] text-slate-600">
                      {formData.address || 'Address'}, {formData.city} - {formData.pincode}
                    </p>
                    <p className="text-[9px] text-slate-700 font-semibold">Ph: {formData.phone} | {formData.email}</p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {formData.gstin && (
                        <span className="text-[8px] font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                          GSTIN: {formData.gstin}
                        </span>
                      )}
                      {formData.drug_license_no && (
                        <span className="text-[8px] font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                          D.L. No: {formData.drug_license_no}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end space-y-0.5">
                    <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-right">
                      <div className="text-[7px] uppercase tracking-wider text-slate-300 font-bold">Invoice Number</div>
                      <div className="font-black font-mono text-[10px]">{formData.invoice_prefix || 'INV'}-2026-0001</div>
                    </div>
                    <div className="text-[8px] text-slate-700 pt-0.5">Date: <strong className="font-mono">{new Date().toLocaleDateString('en-GB')}</strong></div>
                    <div className="text-[8px] text-slate-500">Place of Supply: {formData.state} ({formData.state_code || '07'})</div>
                    <div className="mt-1 border border-slate-200 rounded p-0.5 bg-white">
                      <BarcodeSvg value={`${formData.invoice_prefix || 'INV'}-2026-0001`} height={18} barWidth={0.8} fontSize="text-[6px]" />
                    </div>
                  </div>
                </div>

                {/* Bill To & Payment Summary Card */}
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
                    <div className="font-bold text-slate-500 uppercase text-[8px] border-b pb-0.5 mb-0.5">Billed To (Buyer):</div>
                    <div className="font-bold text-slate-900">Walk-in Customer</div>
                    <div className="text-slate-600">Mobile: +91 98765 43210</div>
                    <div className="text-slate-500 text-[8px]">Retail Consumer</div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-500 uppercase text-[8px] border-b pb-0.5 mb-0.5">Payment Details:</div>
                      <div>
                        <span className="text-[8px] text-slate-500">Status: </span>
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-1 rounded text-[8px]">PAID (UPI)</span>
                      </div>
                      <div className="text-[8px] text-slate-600">Staff: Counter 1</div>
                    </div>
                    {activeQrPreviewUrl && (
                      <div className="text-center bg-white p-1 rounded border shrink-0">
                        <img src={activeQrPreviewUrl} alt="QR" className="w-11 h-11 mx-auto object-contain" />
                        <span className="text-[6px] text-slate-500 font-bold block">Scan to Pay</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sample Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-[9px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[8px]">
                        <th className="py-1 px-1.5 text-left">#</th>
                        <th className="py-1 px-1.5 text-left">Item Description</th>
                        <th className="py-1 px-1 text-center">HSN</th>
                        <th className="py-1 px-1 text-center">Qty</th>
                        <th className="py-1 px-1 text-right">Rate</th>
                        <th className="py-1 px-1 text-center">GST</th>
                        <th className="py-1 px-1.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-1 px-1.5 text-slate-400">1</td>
                        <td className="py-1 px-1.5">
                          <div className="font-bold text-slate-900">Parle-G Gold Biscuits (Box)</div>
                          <div className="text-[7px] text-slate-400">Batch: B-2026 | Exp: 12/2026</div>
                        </td>
                        <td className="py-1 px-1 text-center font-mono">1905</td>
                        <td className="py-1 px-1 text-center font-bold">2 BOX</td>
                        <td className="py-1 px-1 text-right font-mono">₹650.00</td>
                        <td className="py-1 px-1 text-center font-mono">18%</td>
                        <td className="py-1 px-1.5 text-right font-bold font-mono">₹1,300.00</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="py-1 px-1.5 text-slate-400">2</td>
                        <td className="py-1 px-1.5">
                          <div className="font-bold text-slate-900">Tata Tea Premium (500g)</div>
                        </td>
                        <td className="py-1 px-1 text-center font-mono">0902</td>
                        <td className="py-1 px-1 text-center font-bold">1 PCS</td>
                        <td className="py-1 px-1 text-right font-mono">₹150.00</td>
                        <td className="py-1 px-1 text-center font-mono">5%</td>
                        <td className="py-1 px-1.5 text-right font-bold font-mono">₹150.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total & Bank Details */}
                <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
                    <div className="font-bold text-slate-800 text-[8px] border-b pb-0.5 mb-0.5">Bank Remittance:</div>
                    <div>Bank: <strong>{formData.bank_name || 'HDFC Bank'}</strong></div>
                    <div>A/C: <strong className="font-mono">{formData.bank_account_no || '50200012345678'}</strong></div>
                    <div>IFSC: <strong className="font-mono">{formData.bank_ifsc || 'HDFC0001234'}</strong></div>
                    {formData.upi_id && <div>UPI: <strong className="font-mono text-cyan-800">{formData.upi_id}</strong></div>}
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5 text-right">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Taxable Turnover:</span>
                      <span className="font-mono font-semibold">₹1,250.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GST (CGST+SGST):</span>
                      <span className="font-mono font-semibold">₹200.00</span>
                    </div>
                    <div className="flex justify-between font-black text-xs border-t-2 border-slate-900 pt-1 text-slate-900">
                      <span>Grand Total:</span>
                      <span className="font-mono text-emerald-800">₹1,450.00</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                {formData.terms_conditions && (
                  <div className="border-t pt-1 text-[7px] text-slate-500">
                    <div className="font-bold text-slate-700">Terms & Conditions:</div>
                    <p className="whitespace-pre-line leading-tight">{formData.terms_conditions}</p>
                  </div>
                )}
              </div>
            ) : (
              /* 80mm Thermal Receipt Slip Live Simulation */
              <div className="w-[280px] bg-white text-black p-4 font-mono text-[10px] rounded-lg shadow-2xl border border-slate-300 space-y-2">
                <div className="text-center pb-2 border-b-2 border-dashed border-gray-800 space-y-0.5">
                  <h3 className="font-black text-xs tracking-tight uppercase">{formData.name || 'Store Name'}</h3>
                  {formData.legal_name && <p className="text-[8px] text-gray-700">{formData.legal_name}</p>}
                  <p className="text-[9px] text-gray-700">{formData.address || 'Address'}, {formData.city}</p>
                  <p className="text-[9px] font-bold text-gray-900">Ph: {formData.phone}</p>
                  {formData.gstin && (
                    <p className="text-[9px] font-black text-black">GSTIN: {formData.gstin}</p>
                  )}
                  {formData.drug_license_no && (
                    <p className="text-[8px] font-bold text-gray-800">D.L. No: {formData.drug_license_no}</p>
                  )}
                </div>

                <div className="py-1 border-b border-dashed border-gray-600 text-[9px] space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>Bill: #{formData.invoice_prefix || 'INV'}-2026-0001</span>
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                    <span>Type: Retail</span>
                  </div>
                  <div>Customer: <strong>Walk-in Customer</strong></div>
                </div>

                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-800 text-left font-black uppercase text-[8px]">
                      <th className="py-0.5">Item</th>
                      <th className="py-0.5 text-center">Qty</th>
                      <th className="py-0.5 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    <tr>
                      <td className="py-0.5">
                        <div className="font-bold">Parle-G Gold Box</div>
                        <div className="text-[7px] text-gray-600">Batch: B-2026</div>
                      </td>
                      <td className="py-0.5 text-center">2</td>
                      <td className="py-0.5 text-right font-bold font-mono">₹1,300.00</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-bold">Tata Tea 500g</td>
                      <td className="py-0.5 text-center">1</td>
                      <td className="py-0.5 text-right font-bold font-mono">₹150.00</td>
                    </tr>
                  </tbody>
                </table>

                <div className="pt-1 border-t-2 border-dashed border-gray-800 text-[9px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹1,450.00</span>
                  </div>
                  <div className="flex justify-between font-black text-xs border-t-2 border-black pt-1">
                    <span>NET PAYABLE:</span>
                    <span className="font-mono">₹1,450.00</span>
                  </div>
                  <div className="flex justify-between text-gray-700 text-[8px]">
                    <span>Paid (UPI):</span>
                    <span className="font-mono font-bold">₹1,450.00</span>
                  </div>
                </div>

                {/* Savings Banner */}
                <div className="my-1.5 p-1 rounded bg-gray-100 text-center border border-gray-400">
                  <span className="text-[8px] font-black text-emerald-900">
                    🎉 YOU SAVED ₹45.00 TODAY!
                  </span>
                </div>

                {activeQrPreviewUrl && (
                  <div className="text-center my-2 border-t border-dashed border-gray-600 pt-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider">Scan to Pay via UPI</p>
                    <img src={activeQrPreviewUrl} alt="QR" className="w-20 h-20 mx-auto border border-gray-400 p-0.5 rounded my-1 object-contain" />
                    {formData.qr_type === 'DYNAMIC' && <p className="text-[7px] text-gray-600 font-mono">{formData.upi_id}</p>}
                    {formData.qr_type === 'CUSTOM_IMAGE' && <p className="text-[7px] text-purple-700 font-bold">Shop Standee QR</p>}
                  </div>
                )}

                {/* Scannable Invoice Barcode */}
                <div className="text-center my-1.5 border-t border-dashed border-gray-600 pt-1">
                  <div className="flex justify-center">
                    <BarcodeSvg value={`${formData.invoice_prefix || 'INV'}-2026-0001`} height={20} barWidth={0.8} fontSize="text-[6px]" />
                  </div>
                </div>

                <div className="text-center pt-1 border-t border-dashed border-gray-600 text-[8px] text-gray-700">
                  <p className="font-semibold">{formData.thermal_footer_note || 'Thank you for shopping with us!'}</p>
                  <p className="text-[7px] text-gray-500">KwikStore Pro • Fast & 100% Offline</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3-Step First-Run Onboarding Setup Wizard */}
      {showWizard && (
        <FirstRunWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={async () => {
            setShowWizard(false);
            if (fetchShops) await fetchShops();
            setNotification({ type: 'success', message: 'Store profile configured successfully via Setup Wizard!' });
          }}
        />
      )}

      {/* Commercial Clean Demo Data Modal */}
      {showCleanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden p-6 space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold">Clean Demo Transactions & Start Fresh</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prepare KwikStore Pro for your real store by wiping test invoices, mock sales, and sample customer balances.
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select What to Reset</div>
              
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanOptions.resetSales}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, resetSales: e.target.checked }))}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-medium">Reset Sales, Invoices & Payment Logs (Recommended)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanOptions.resetKhata}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, resetKhata: e.target.checked }))}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-medium">Reset Customer Udhar Khata Balances & Ledgers</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanOptions.resetInventory}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, resetInventory: e.target.checked }))}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-medium">Wipe Sample Products & Inventory (Optional)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanOptions.resetHrms}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, resetHrms: e.target.checked }))}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-medium">Wipe Sample Staff Attendance & Payroll Records</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-rose-500">
                Type "CLEAN" to confirm transaction wipe:
              </label>
              <input
                type="text"
                placeholder="CLEAN"
                value={cleanConfirmText}
                onChange={(e) => setCleanConfirmText(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold font-mono tracking-widest border outline-none ${
                  isDark 
                    ? 'bg-slate-950 border-rose-500/50 text-white focus:border-rose-500' 
                    : 'bg-white border-rose-300 text-slate-900 focus:border-rose-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCleanModal(false);
                  setCleanConfirmText('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCleanDemoData}
                disabled={cleaning || cleanConfirmText.trim().toUpperCase() !== 'CLEAN'}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${cleaning ? 'animate-spin' : ''}`} />
                <span>{cleaning ? 'Wiping...' : 'Confirm & Reset Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

