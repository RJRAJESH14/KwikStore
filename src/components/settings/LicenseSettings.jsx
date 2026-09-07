import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  Cpu, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  ExternalLink,
  MessageSquare,
  Wrench,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import LicenseActivationModal from '../license/LicenseActivationModal';

export default function LicenseSettings() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // In-App Developer License Generator Tool
  const [showDevGenerator, setShowDevGenerator] = useState(false);
  const [devPin, setDevPin] = useState('');
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [targetMachineId, setTargetMachineId] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [targetPlan, setTargetPlan] = useState('1YEAR');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  const fetchLicenseStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/license/status');
      const data = await res.json();
      setLicense(data);
    } catch (e) {
      console.error('Failed to load license status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenseStatus();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlockDevTools = (e) => {
    e.preventDefault();
    if (devPin.trim() === '990011') {
      setDevUnlocked(true);
      setGenError('');
      if (!targetMachineId && license?.machineId) {
        setTargetMachineId(license.machineId);
      }
    } else {
      setGenError('Incorrect Developer Master PIN.');
    }
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    setGenError('');
    setGeneratedKey(null);

    if (!targetMachineId.trim()) {
      setGenError('Please enter the client Machine ID.');
      return;
    }

    setGenLoading(true);
    try {
      const res = await fetch('/api/license/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: targetMachineId.trim(),
          customerName: targetCustomer.trim() || 'KwikStore Client',
          planType: targetPlan,
          devPin: '990011'
        })
      });

      const data = await res.json();
      setGenLoading(false);

      if (data.success) {
        setGeneratedKey(data);
      } else {
        setGenError(data.message || 'Key generation failed.');
      }
    } catch (err) {
      setGenLoading(false);
      setGenError('Server error while generating key.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center space-x-3 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Checking License Status...</span>
      </div>
    );
  }

  const isExpired = license?.status === 'EXPIRED';
  const isTrial = license?.status === 'TRIAL';
  const isDevMode = license?.isDeveloperMode;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              isExpired 
                ? 'bg-rose-500/20 text-rose-500 shadow-rose-500/10' 
                : 'bg-emerald-500/20 text-emerald-500 shadow-emerald-500/10'
            }`}>
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {license?.planName || 'KwikStore Pro Genuine License'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isExpired 
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                    : isTrial 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isExpired ? 'EXPIRED' : isTrial ? 'TRIAL EVALUATION' : isDevMode ? 'DEVELOPER MASTER' : 'ACTIVE & VERIFIED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Licensed to: <span className="font-semibold text-slate-700 dark:text-slate-300">{license?.customerName || 'Registered Store Owner'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Key className="w-3.5 h-3.5" />
              {isExpired ? 'Renew License' : 'Upgrade / Re-Activate'}
            </button>
            <button
              onClick={fetchLicenseStatus}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
              title="Refresh Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Details & Machine ID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Machine Fingerprint */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-500" />
              LOCKED HARDWARE MACHINE ID
            </span>
            <span className="text-[10px] font-mono uppercase font-semibold text-slate-400">
              Hardware Bound
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <code className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {license?.machineId}
            </code>
            <button
              onClick={() => handleCopy(license?.machineId)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            This installation is securely bound to this computer's motherboard and CPU.
          </p>
        </div>

        {/* Card 2: Expiry & Validity */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              SUBSCRIPTION VALIDITY
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {license?.daysRemaining ?? '---'} Days Remaining
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Plan Tier:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{license?.planType || 'Standard'}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Expiry Date:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Never (Lifetime)'}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">Status:</span>
              <span className="font-semibold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Genuine Product
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Developer Master Key Generator Panel */}
      <div className={`p-6 rounded-2xl border border-dashed ${
        isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Developer & Seller Portal (Master Key Generator)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate cryptographic activation keys for your customer installations right here.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDevGenerator(!showDevGenerator)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10 transition"
          >
            {showDevGenerator ? 'Hide Tool' : 'Open Key Generator'}
          </button>
        </div>

        {showDevGenerator && (
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
            {!devUnlocked ? (
              <form onSubmit={handleUnlockDevTools} className="max-w-md space-y-3">
                <label className="block text-xs font-bold text-slate-500">
                  Enter Developer Master PIN to unlock key generator:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={8}
                    value={devPin}
                    onChange={(e) => setDevPin(e.target.value)}
                    placeholder="Master PIN (Default: 990011)"
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                  >
                    Unlock
                  </button>
                </div>
                {genError && <p className="text-xs text-rose-500 font-medium">{genError}</p>}
              </form>
            ) : (
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Customer Machine ID *
                    </label>
                    <input
                      type="text"
                      value={targetMachineId}
                      onChange={(e) => setTargetMachineId(e.target.value)}
                      placeholder="KWIK-XXXX-YYYY-ZZZZ"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Customer / Shop Name
                    </label>
                    <input
                      type="text"
                      value={targetCustomer}
                      onChange={(e) => setTargetCustomer(e.target.value)}
                      placeholder="e.g. Pujarani Garments"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Plan Duration
                    </label>
                    <select
                      value={targetPlan}
                      onChange={(e) => setTargetPlan(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="1YEAR">1-Year Professional (365 Days)</option>
                      <option value="LIFETIME">Lifetime Unlimited</option>
                      <option value="6MONTHS">6 Months (180 Days)</option>
                      <option value="1MONTH">1 Month Subscription (30 Days)</option>
                      <option value="2YEAR">2-Year Enterprise (730 Days)</option>
                      <option value="TRIAL">14-Day Trial</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={genLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {genLoading ? 'Generating...' : 'Generate Customer License Key'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMachineId(license?.machineId || '')}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                  >
                    Fill with Current PC's ID
                  </button>
                </div>

                {genError && <p className="text-xs text-rose-500 font-medium">{genError}</p>}

                {generatedKey && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Generated License Key:
                    </p>
                    <div className="flex items-center justify-between bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm font-bold">
                      <span className="text-emerald-400">{generatedKey.licenseKey}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(generatedKey.licenseKey)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-semibold"
                      >
                        Copy Key
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Locked to: <b>{generatedKey.machineId}</b> | Plan: <b>{generatedKey.planType}</b> ({generatedKey.daysValid} Days)
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>

      {/* License Modal for Activation / Renewal */}
      {showModal && (
        <LicenseActivationModal
          licenseStatus={license}
          isDismissable={true}
          onClose={() => setShowModal(false)}
          onActivationSuccess={() => {
            fetchLicenseStatus();
            setShowModal(false);
          }}
        />
      )}

    </div>
  );
}
