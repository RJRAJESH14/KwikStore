import React, { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Store, 
  Building2, 
  MapPin, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Receipt,
  Phone,
  Mail
} from 'lucide-react';

const SHOP_TYPES = [
  { id: 'GENERAL_RETAIL', name: 'General Retail / Kirana', icon: '🛒' },
  { id: 'SUPERMARKET', name: 'Supermarket / Grocery', icon: '🏪' },
  { id: 'GARMENTS', name: 'Clothing & Footwear', icon: '👗' },
  { id: 'ELECTRONICS', name: 'Electronics & Mobile', icon: '📱' },
  { id: 'PHARMACY', name: 'Medical / Pharmacy', icon: '💊' },
  { id: 'HARDWARE', name: 'Hardware & Electricals', icon: '🔧' },
  { id: 'RESTAURANT', name: 'Cafe & Restaurant', icon: '☕' },
  { id: 'WHOLESALE', name: 'Wholesale & Distribution', icon: '📦' }
];

const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala',
  '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh'
};

export function FirstRunWizard({ isOpen, onClose, onComplete }) {
  const { activeShop, refreshShops } = useShop();
  const { isDark } = useTheme();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: activeShop?.name || 'My Retail Store',
    legal_name: activeShop?.legal_name || '',
    shop_type: activeShop?.shop_type || 'GENERAL_RETAIL',
    phone: activeShop?.phone || '9876543210',
    email: activeShop?.email || 'store@gmail.com',
    address: activeShop?.address || 'Main Market Road',
    city: activeShop?.city || 'Bhubaneswar',
    state: activeShop?.state || 'Odisha',
    state_code: activeShop?.state_code || '21',
    pincode: activeShop?.pincode || '751001',
    gstin: activeShop?.gstin || '',
    upi_id: activeShop?.upi_id || 'store@upi',
    upi_name: activeShop?.upi_name || '',
    invoice_prefix: activeShop?.invoice_prefix || 'KS',
    thermal_footer_note: activeShop?.thermal_footer_note || 'Thank you for shopping with us! Visit again.',
    terms_conditions: activeShop?.terms_conditions || '1. Goods once sold can only be exchanged within 7 days with valid bill.\n2. Warranty as per manufacturer terms.'
  });

  // Auto-detect state from GSTIN
  const handleGstinChange = (val) => {
    const clean = val.toUpperCase().trim();
    const updated = { ...form, gstin: clean };
    if (clean.length >= 2) {
      const code = clean.substring(0, 2);
      if (GST_STATE_CODES[code]) {
        updated.state_code = code;
        updated.state = GST_STATE_CODES[code];
      }
    }
    setForm(updated);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: activeShop?.id || 1
        })
      });

      const data = await res.json();
      if (data.success) {
        if (refreshShops) await refreshShops();
        if (onComplete) onComplete();
        if (onClose) onClose();
      } else {
        alert(data.message || 'Error saving shop details.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving shop profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Wizard Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">KwikStore Pro • Store Onboarding Wizard</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Step {step} of 3: {
                step === 1 ? 'Store Identity & Category' :
                step === 2 ? 'Tax, GSTIN & Location' : 'UPI QR & Invoice Branding'
              }</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progression Bar */}
        <div className="flex w-full h-1 bg-slate-800">
          <div className={`h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300 ${
            step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'
          }`} />
        </div>

        {/* Step 1: Store Identity */}
        {step === 1 && (
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-bold mb-1">Trading Store Name (Shown on Bills) *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Jay Durga Traders"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Legal Company / Firm Name</label>
                <input
                  type="text"
                  value={form.legal_name}
                  onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                  placeholder="e.g. Jay Durga Retail Pvt Ltd"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Store Contact Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 9853542577"
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-2">Select Your Business Category:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SHOP_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, shop_type: t.id })}
                    className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                      form.shop_type === t.id
                        ? 'border-brand-500 bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold shadow-sm'
                        : isDark ? 'border-slate-800 bg-slate-950 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-[11px] leading-tight">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Tax & Location */}
        {step === 2 && (
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-bold mb-1">GSTIN (15-Digit Indian GST Number - Optional for Composition/URP)</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="e.g. 21ABCDE1234F1Z5"
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">State Name *</label>
                <input
                  type="text"
                  required
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">GST State Code (e.g. 21, 07, 27) *</label>
                <input
                  type="text"
                  required
                  value={form.state_code}
                  onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-400 mb-1">Shop Premise Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Plot No 123, Main Road, Balianta"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">City / Town</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment & Receipt Branding */}
        {step === 3 && (
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Store Dynamic UPI ID (For QR on Invoices) *</label>
                <input
                  type="text"
                  required
                  value={form.upi_id}
                  onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                  placeholder="e.g. merchant@okhdfcbank"
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-emerald-500 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={form.invoice_prefix}
                  onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })}
                  placeholder="e.g. KS, JDT, INV"
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-400 mb-1">Thermal Receipt Footer Message</label>
                <input
                  type="text"
                  value={form.thermal_footer_note}
                  onChange={(e) => setForm({ ...form, thermal_footer_note: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-400 mb-1">Terms & Conditions (Printed on A4 Tax Invoices)</label>
                <textarea
                  rows="2"
                  value={form.terms_conditions}
                  onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 ${
                isDark ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-brand-500/20"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-brand-500/25"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Saving Store Profile...' : 'Complete Store Setup & Start Billing'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
