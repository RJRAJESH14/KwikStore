import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  Clock, 
  Cpu, 
  PhoneCall, 
  MessageSquare, 
  Unlock, 
  Sparkles,
  Lock,
  X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function LicenseActivationModal({ 
  licenseStatus, 
  onActivationSuccess, 
  isDismissable = false, 
  onClose 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [licenseKey, setLicenseKey] = useState('');
  const [customerName, setCustomerName] = useState(licenseStatus?.customerName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Developer Bypass Mode
  const [showDevBypass, setShowDevBypass] = useState(false);
  const [devPin, setDevPin] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  const machineId = licenseStatus?.machineId || 'KWIK-UNKNOWN-PC';

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!licenseKey.trim()) {
      setError('Please paste your License Key.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          customerName: customerName.trim()
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          if (onActivationSuccess) onActivationSuccess();
          if (onClose) onClose();
        }, 1500);
      } else {
        setError(data.message || 'Activation failed. Please verify your Machine ID and Key.');
      }
    } catch (err) {
      setLoading(false);
      setError('Network connection error while validating license.');
    }
  };

  const handleStartTrial = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/license/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || 'Valued Store Owner'
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          if (onActivationSuccess) onActivationSuccess();
          if (onClose) onClose();
        }, 1200);
      } else {
        setError(data.message || 'Unable to start evaluation trial.');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection error while activating evaluation trial.');
    }
  };

  const handleDeveloperBypass = async (e) => {
    e.preventDefault();
    setDevLoading(true);
    setError('');

    try {
      const res = await fetch('/api/license/developer-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: devPin.trim() })
      });

      const data = await res.json();
      setDevLoading(false);

      if (data.success) {
        setSuccessMsg('Developer Master Access Granted.');
        setTimeout(() => {
          if (onActivationSuccess) onActivationSuccess();
          if (onClose) onClose();
        }, 1000);
      } else {
        setError('Invalid Developer Master PIN.');
      }
    } catch (err) {
      setDevLoading(false);
      setError('Connection error verifying Developer PIN.');
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Rajesh,\nI would like to activate / purchase my KwikStore Pro License.\n\n🖥️ Machine ID: ${machineId}\n🏪 Shop Name: ${customerName || 'My Store'}\n\nPlease generate my activation key.`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* Modal Header */}
        <div className={`p-6 border-b relative ${
          isDark 
            ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-800' 
            : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-slate-200'
        }`}>
          {isDismissable && onClose && (
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">KwikStore Pro License Activation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Hardware-Locked Genuine Software Protection
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          
          {/* Status Alert if Expired or Trial */}
          {licenseStatus?.status === 'EXPIRED' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start space-x-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">License Subscription Expired</p>
                <p className="text-xs text-red-500/90 mt-0.5">
                  {licenseStatus.message || 'Your subscription period has concluded. Please enter a renewal key to continue billing.'}
                </p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-3 text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <Check className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{successMsg}</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-3 text-rose-600 dark:text-rose-400 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Machine Hardware ID Box */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-500" />
                YOUR COMPUTER HARDWARE ID (LOCKED TO THIS PC)
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                Permanent Fingerprint
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-3 mt-2">
              <code className="text-base font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                {machineId}
              </code>
              <button
                type="button"
                onClick={handleCopyMachineId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 text-xs font-semibold shadow-sm transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Send this ID to your seller to receive your genuine activation key.
            </p>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Shop / Business Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Pujarani Garments & Footwear"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                License Activation Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="KWIK-1YE-XXXX-YYYY-ZZZZ"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono tracking-wide focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              {loading ? 'Validating License...' : 'Activate KwikStore Pro'}
            </button>
          </form>

          {/* Quick Trial Option if Eligible */}
          {licenseStatus?.canStartTrial && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 mb-2 font-medium">New Customer? Test before buying:</p>
              <button
                type="button"
                onClick={handleStartTrial}
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-xl border border-dashed font-semibold text-xs flex items-center justify-center gap-2 transition ${
                  isDark 
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                    : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Start 7-Day Free Full Feature Trial
              </button>
            </div>
          )}

          {/* Seller / Developer Contact Card */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-emerald-50/50 border-emerald-100'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Seller & Developer Support
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Rajesh Sharma • <a href="https://fleetbillpro.in" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline font-semibold">fleetbillpro.in</a>
                </p>
              </div>

              <a
                href={`https://wa.me/918338833377?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp Key Request
              </a>
            </div>
          </div>

          {/* Developer Master Emergency Bypass */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowDevBypass(!showDevBypass)}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition inline-flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              {showDevBypass ? 'Hide Master Maintenance' : 'Developer Master Maintenance'}
            </button>

            {showDevBypass && (
              <form onSubmit={handleDeveloperBypass} className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-left animate-in fade-in">
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                  Developer Emergency Master PIN:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={8}
                    value={devPin}
                    onChange={(e) => setDevPin(e.target.value)}
                    placeholder="Enter Master PIN"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-slate-900 text-slate-100 text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={devLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                  >
                    {devLoading ? '...' : 'Unlock'}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
