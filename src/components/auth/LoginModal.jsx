import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Lock, 
  User, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Phone, 
  HelpCircle, 
  ArrowLeft, 
  Eye, 
  EyeOff,
  CheckCircle2,
  UserPlus,
  Store,
  Building2
} from 'lucide-react';

export function LoginModal({ isOpen, onClose, isLockedScreen = false }) {
  const { login } = useAuth();
  const { isDark } = useTheme();

  // Mode: 'LOGIN', 'REGISTER', or 'RECOVERY'
  const [mode, setMode] = useState('LOGIN');

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Owner Registration State
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regShopType, setRegShopType] = useState('RETAIL');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRecoveryPin, setRegRecoveryPin] = useState('9988');
  const [regCity, setRegCity] = useState('');
  const [regGstin, setRegGstin] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Recovery State
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Verify, 2: New Password, 3: Success
  const [verifiedInfo, setVerifiedInfo] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  if (!isOpen) return null;

  // Handle standard Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  // Handle New Owner Registration
  const handleRegisterOwner = async (e) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please re-enter.');
      return;
    }

    if (regPassword.length < 4) {
      setRegError('Password must be at least 4 characters.');
      return;
    }

    if (!regUsername || regUsername.trim().length < 3) {
      setRegError('Username must be at least 3 characters.');
      return;
    }

    setRegLoading(true);

    try {
      const res = await fetch('/api/auth/register-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: regShopName.trim() || 'My Retail Store',
          ownerName: regOwnerName.trim() || regUsername.trim(),
          username: regUsername.trim(),
          phone: regPhone.trim(),
          password: regPassword.trim(),
          recoveryPin: regRecoveryPin.trim() || '9988',
          shopType: regShopType,
          city: regCity.trim() || 'Mumbai',
          stateCode: '27',
          gstin: regGstin.trim()
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { success: false, message: `Server returned status ${res.status}` };
      }
      setRegLoading(false);

      if (res.ok && data.success) {
        // Auto-login with the newly created account
        const loginRes = await login(regUsername.trim(), regPassword.trim());
        if (loginRes.success) {
          onClose();
        } else {
          setMode('LOGIN');
          setUsername(regUsername.trim());
          setPassword(regPassword.trim());
        }
      } else {
        setRegError(data.message || 'Failed to create Owner account. Please check your inputs.');
      }
    } catch (err) {
      setRegLoading(false);
      setRegError(err.message ? `Connection error: ${err.message}` : 'Network error while creating owner account. Please ensure server is running.');
    }
  };

  // Step 1: Verify Owner Identity
  const handleVerifyRecovery = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryLoading(true);

    try {
      const res = await fetch('/api/auth/owner-recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recoveryUsername,
          phone: recoveryPhone,
          recoveryKey: recoveryKey
        })
      });
      const data = await res.json();
      setRecoveryLoading(false);

      if (data.success) {
        setVerifiedInfo(data);
        setRecoveryStep(2);
        setRecoveryMessage(data.message);
      } else {
        setRecoveryError(data.message || 'Verification failed. Please check your credentials.');
      }
    } catch (err) {
      setRecoveryLoading(false);
      setRecoveryError('Network error while verifying identity.');
    }
  };

  // Step 2: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMessage('');

    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 4) {
      setRecoveryError('Password must be at least 4 characters.');
      return;
    }

    setRecoveryLoading(true);

    try {
      const res = await fetch('/api/auth/owner-recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recoveryUsername,
          phone: recoveryPhone,
          recoveryKey: recoveryKey,
          newPassword: newPassword
        })
      });
      const data = await res.json();
      setRecoveryLoading(false);

      if (data.success) {
        setRecoveryStep(3);
        setRecoveryMessage(data.message);
        setUsername(recoveryUsername);
        setPassword(newPassword);
      } else {
        setRecoveryError(data.message || 'Error updating password.');
      }
    } catch (err) {
      setRecoveryLoading(false);
      setRecoveryError('Network error while updating password.');
    }
  };

  const resetRecoveryFlow = () => {
    setMode('LOGIN');
    setRecoveryStep(1);
    setRecoveryError('');
    setRecoveryMessage('');
    setVerifiedInfo(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* ===================== MODE 1: REGULAR LOGIN ===================== */}
        {mode === 'LOGIN' && (
          <>
            {/* Header */}
            <div className={`p-6 border-b relative ${
              isDark ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {!isLockedScreen && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <img 
                src="/icon.png" 
                alt="KwikStore Pro" 
                className="w-12 h-12 rounded-xl shadow-md border border-brand-500/30 object-cover mb-3" 
              />
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Staff & Portal Login</h2>
              <p className="text-xs text-slate-400 mt-1">
                Logging in automatically records your shift check-in in the HRMS Attendance register.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('RECOVERY');
                      setRecoveryStep(1);
                      setRecoveryError('');
                      setRecoveryMessage('');
                    }}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Forgot Password? (Owner Reset)</span>
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{loading ? 'Authenticating & Checking-in...' : 'Sign In & Check In'}</span>
              </button>

              {/* New Owner Registration Button */}
              <div className="pt-3 border-t border-slate-800/40 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('REGISTER');
                    setRegError('');
                  }}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1.5 py-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New Store Owner? Create Owner Account</span>
                </button>
              </div>

              {/* Advertise for fleetbillpro.in */}
              <div className="pt-2 text-center text-[11px] text-slate-400">
                <span>Powered by </span>
                <a
                  href="https://fleetbillpro.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
                >
                  fleetbillpro.in
                </a>
                <span> • Smart Retail & ERP Suite</span>
              </div>
            </form>
          </>
        )}

        {/* ===================== MODE 3: NEW OWNER REGISTRATION ===================== */}
        {mode === 'REGISTER' && (
          <div>
            {/* Register Header */}
            <div className={`p-6 border-b relative ${
              isDark ? 'bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-slate-800' : 'bg-emerald-50/80 border-slate-200'
            }`}>
              <button
                onClick={() => setMode('LOGIN')}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors"
                title="Back to Sign In"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {!isLockedScreen && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3 mt-4">
                <Building2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Create Store & Owner Account</h2>
              <p className="text-xs text-slate-400 mt-1">
                Set up your primary store details and create your Super Admin Owner login.
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleRegisterOwner} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {regError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Shop / Business Name */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Shop / Business Name *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    required
                    placeholder="e.g. Mahaveer Retail & Supermarket"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    autoFocus
                  />
                </div>
              </div>

              {/* Shop Type / Industry Sector */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Business Sector / Industry *
                </label>
                <select
                  value={regShopType}
                  onChange={(e) => setRegShopType(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer focus:border-emerald-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="RETAIL">🛒 General Retail / Kirana & Grocery</option>
                  <option value="GARMENTS">👗 Garments, Apparel & Footwear</option>
                  <option value="PHARMACY">💊 Pharmacy, Chemist & Medical Store</option>
                  <option value="HARDWARE">🔩 Hardware, Electrical & Sanitary</option>
                  <option value="SUPERMARKET">🏬 Supermarket & FMCG Wholesale</option>
                  <option value="RESTAURANT">🍽️ Restaurant, Cafe & Food Court</option>
                </select>
              </div>

              {/* Owner Full Name & Username in 2 Cols */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    required
                    placeholder="e.g. Rajesh Sharma"
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Username (Sign In) *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    placeholder="e.g. rajesh_owner"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Owner Mobile & City in 2 Cols */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Mobile / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                    placeholder="e.g. 9876543210"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    City
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Password & Confirm Password in 2 Cols */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={4}
                      placeholder="Min 4 chars"
                      className={`w-full border rounded-xl pl-3 pr-8 py-2 text-xs outline-none focus:border-emerald-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Confirm Password *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    minLength={4}
                    placeholder="Re-enter password"
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Master Recovery PIN & GSTIN */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Master Recovery PIN
                  </label>
                  <input
                    type="text"
                    value={regRecoveryPin}
                    onChange={(e) => setRegRecoveryPin(e.target.value)}
                    placeholder="Default: 9988"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={regGstin}
                    onChange={(e) => setRegGstin(e.target.value)}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono uppercase outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{regLoading ? 'Creating Store & Account...' : 'Create Store & Sign In'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="text-xs text-slate-400 hover:text-emerald-500 hover:underline"
                >
                  Already registered? Back to Staff Login
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== MODE 2: OWNER RECOVERY WIZARD ===================== */}
        {mode === 'RECOVERY' && (
          <div>
            {/* Recovery Header */}
            <div className={`p-6 border-b relative ${
              isDark ? 'bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border-slate-800' : 'bg-sky-50 border-slate-200'
            }`}>
              <button
                onClick={resetRecoveryFlow}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors"
                title="Back to Sign In"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {!isLockedScreen && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mb-3 mt-4">
                <ShieldCheck className="w-6 h-6 text-sky-500" />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Owner Self-Reset</h2>
              <p className="text-xs text-slate-400 mt-1">
                Verify your registered store details to reset your primary Super Admin / Owner password.
              </p>
            </div>

            {/* Recovery Content */}
            <div className="p-6 space-y-4">
              {recoveryError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {/* STEP 1: VERIFICATION */}
              {recoveryStep === 1 && (
                <form onSubmit={handleVerifyRecovery} className="space-y-3.5">
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-800'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>Security Verification</span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      Enter the registered store mobile number and your Master Security Recovery PIN (Default: <strong className="font-mono text-emerald-400">9988</strong>) or Shop GSTIN.
                    </p>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Owner Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={recoveryUsername}
                        onChange={(e) => setRecoveryUsername(e.target.value)}
                        required
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-mono outline-none focus:border-sky-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                        placeholder="owner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Registered Store Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={recoveryPhone}
                        onChange={(e) => setRecoveryPhone(e.target.value)}
                        required
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-mono outline-none focus:border-sky-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. 9876543210"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Master Recovery PIN / Shop GSTIN *
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value)}
                        required
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-mono outline-none focus:border-sky-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                        placeholder="PIN: 9988 or Shop GSTIN"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{recoveryLoading ? 'Verifying Identity...' : 'Verify Store Ownership'}</span>
                  </button>
                </form>
              )}

              {/* STEP 2: SET NEW PASSWORD */}
              {recoveryStep === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2.5 ${
                    isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold">{verifiedInfo?.displayName || 'Store Owner'} Verified</div>
                      <div className="text-[10px] opacity-80">Account: @{verifiedInfo?.username} • {verifiedInfo?.shopName}</div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      New Password *
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={4}
                        className={`w-full border rounded-xl pl-9 pr-10 py-2 text-xs outline-none focus:border-emerald-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                        placeholder="Enter at least 4 characters"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={4}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{recoveryLoading ? 'Saving New Password...' : 'Save New Password & Sign In'}</span>
                  </button>
                </form>
              )}

              {/* STEP 3: SUCCESS CONFIRMATION */}
              {recoveryStep === 3 && (
                <div className="py-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Password Reset Successfully!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Your owner account password has been updated. You can now sign in directly.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setMode('LOGIN');
                      setLoading(true);
                      const res = await login(recoveryUsername, newPassword);
                      setLoading(false);
                      if (res.success) {
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Sign In to POS Portal Now</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
