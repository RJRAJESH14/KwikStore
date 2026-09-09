import React, { useState, useEffect } from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  ShoppingCart, 
  Sparkles, 
  QrCode, 
  CheckCircle2, 
  Building2, 
  Phone, 
  Clock, 
  Tag, 
  Maximize, 
  Minimize, 
  ShieldCheck, 
  Store,
  CreditCard,
  Percent
} from 'lucide-react';

export function CustomerFacingDisplay() {
  const { cfdData } = useNetwork();
  const { activeShop } = useShop();
  const { isDark } = useTheme();

  const [liveData, setLiveData] = useState(() => {
    try {
      const cached = localStorage.getItem('kwikstore_cfd_cache');
      return cached ? JSON.parse(cached) : cfdData;
    } catch (e) {
      return cfdData;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to live broadcast events across tabs and windows
  useEffect(() => {
    const handleCfdUpdate = (e) => {
      if (e.detail) setLiveData(e.detail);
    };

    const handleStorageChange = (e) => {
      if (e.key === 'kwikstore_cfd_cache' && e.newValue) {
        try {
          setLiveData(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('cfd-update', handleCfdUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('cfd-update', handleCfdUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Update whenever cfdData context changes
  useEffect(() => {
    if (cfdData) setLiveData(cfdData);
  }, [cfdData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const cart = liveData.cart || [];
  const total = Number(liveData.total || 0);
  const totalSavings = Number(liveData.totalSavings || 0);
  const upiQrUrl = liveData.upiQrUrl;
  const isPaymentState = Boolean(upiQrUrl) || liveData.status === 'PAYMENT';
  const isSettledState = liveData.status === 'SETTLED';
  const isIdle = cart.length === 0 && !isPaymentState && !isSettledState;

  const shopName = liveData.shop?.name || activeShop?.name || 'KwikStore Pro';
  const shopPhone = liveData.shop?.phone || activeShop?.phone || '+91 8338833377';
  const shopIcon = liveData.shop?.shop_icon || activeShop?.shop_icon || '🏬';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Brand & Status Bar */}
      <header className="h-20 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-2xl shadow-md border border-brand-500/30">
            {shopIcon}
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{shopName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                CUSTOMER DISPLAY
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Helpline: {shopPhone}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">100% Verified Billing</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="font-mono text-base font-bold text-white tracking-wider">{currentTime}</div>
            <div className="text-[10px] text-slate-400">Live POS Terminal Sync</div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Toggle Fullscreen Display (F11)"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 flex gap-6 overflow-hidden">
        {/* ================= 1. IDLE STATE: WELCOME & OFFERS BANNER ================= */}
        {isIdle && (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300 my-auto">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-brand-600/30 to-indigo-600/30 border-2 border-brand-500/40 flex items-center justify-center shadow-2xl shadow-brand-500/20">
              <Sparkles className="w-14 h-14 text-brand-400 animate-pulse" />
            </div>

            <div className="max-w-xl space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">
                Welcome to {shopName}!
              </h2>
              <p className="text-slate-400 text-base">
                Your items will appear here as the cashier scans them. Fast, accurate, and contactless digital billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full pt-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
                <div className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 mb-1">
                  <Tag className="w-4 h-4" />
                  <span>Instant Discounts</span>
                </div>
                <p className="text-xs text-slate-400">Direct MRP markdowns & trade scheme benefits on every bill.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
                <div className="text-cyan-400 font-bold text-sm flex items-center gap-1.5 mb-1">
                  <QrCode className="w-4 h-4" />
                  <span>Dynamic UPI QR</span>
                </div>
                <p className="text-xs text-slate-400">Scan & pay instantly with GooglePay, PhonePe, Paytm, or BHIM.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
                <div className="text-purple-400 font-bold text-sm flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Digital WhatsApp Bill</span>
                </div>
                <p className="text-xs text-slate-400">Get your official tax invoice receipt delivered straight to WhatsApp.</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. ACTIVE BILLING OR PAYMENT STATE ================= */}
        {!isIdle && (
          <>
            {/* Left Side: Active Cart Items Table */}
            <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-brand-400" />
                  <span className="font-bold text-base text-white">Your Shopping Basket</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 font-mono text-xs font-bold border border-brand-500/30">
                  {cart.length} Item(s)
                </span>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.map((item, index) => (
                  <div 
                    key={index} 
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate">{item.item_name || item.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>Qty: <strong className="text-white font-sans">{item.quantity}</strong> {item.unit || 'PCS'}</span>
                          <span>•</span>
                          <span>@ ₹{Number(item.unit_price || 0).toFixed(2)}</span>
                          {Number(item.discount_amount || 0) > 0 && (
                            <span className="text-emerald-400 font-semibold font-sans">
                              (Save ₹{Number(item.discount_amount).toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-base font-bold text-white">
                        ₹{Number(item.total || (item.quantity * item.unit_price)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Total Summary & UPI Payment Card */}
            <div className="w-full max-w-sm flex flex-col space-y-4 shrink-0">
              {/* Total & Savings Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-brand-950/60 to-slate-900 border-2 border-brand-500/40 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Payable Amount</div>
                  <div className="text-5xl font-black tracking-tight text-white font-mono mt-1 drop-shadow-md">
                    ₹{total.toFixed(2)}
                  </div>

                  {totalSavings > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>You Saved ₹{totalSavings.toFixed(2)} on this purchase!</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Customer: <strong className="text-slate-200">{liveData.customerName || 'Walk-in Customer'}</strong></span>
                  <span>Bill #{liveData.invoiceNumber || 'NEW'}</span>
                </div>
              </div>

              {/* Dynamic Payment QR Box */}
              {isPaymentState && upiQrUrl ? (
                <div className="flex-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-white">
                    <img src={upiQrUrl} alt="UPI Payment QR Code" className="w-48 h-48 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                      <QrCode className="w-4 h-4 text-brand-400" />
                      <span>Scan to Pay ₹{total.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      GPay • PhonePe • Paytm • BHIM • AmazonPay
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-800/80 text-brand-400">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Payment Methods Accepted</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Cash, UPI QR, Credit/Debit Cards & Customer Khata
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="h-10 bg-slate-950 border-t border-slate-900 px-6 flex items-center justify-between text-[11px] text-slate-500">
        <span>Powered by KwikStore Pro Enterprise POS Engine</span>
        <span className="text-emerald-500 font-medium">✓ Real-time Terminal Sync</span>
      </footer>
    </div>
  );
}
