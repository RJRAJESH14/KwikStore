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
            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <ShoppingCart className="w-5 h-5 text-brand-400" />
                  <span className="font-bold text-base text-white">Your Shopping Basket</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 font-mono text-xs font-bold border border-brand-500/30">
                    {cart.length} {cart.length === 1 ? 'Item' : 'Items'} ({liveData.totalUnits || cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} Units)
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {cart.map((item, index) => {
                  const qty = Number(item.quantity) || 1;
                  const price = Number(item.unit_price) || 0;
                  const mrp = Number(item.mrp) || 0;
                  const discount = Number(item.discount_amount) || 0;
                  const lineTotal = Number(item.total || (qty * price));

                  return (
                    <div 
                      key={index} 
                      className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between hover:border-slate-700 transition-all shadow-sm"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-300 text-xs shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-sm text-white truncate">{item.item_name || item.name}</div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
                            <span>Qty: <strong className="text-white font-sans">{qty}</strong> {item.unit || 'PCS'}</span>
                            <span>•</span>
                            <span>@ ₹{price.toFixed(2)}</span>
                            {mrp > price && (
                              <span className="text-slate-500 line-through">MRP: ₹{mrp.toFixed(2)}</span>
                            )}
                            {discount > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold font-sans text-[11px] border border-emerald-500/20">
                                Save ₹{discount.toFixed(2)}
                              </span>
                            )}
                            {item.free_quantity > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold font-sans text-[10px]">
                                +{item.free_quantity} FREE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-base font-bold text-white">
                          ₹{lineTotal.toFixed(2)}
                        </div>
                        {item.tax_rate > 0 && (
                          <div className="text-[10px] text-slate-500 font-sans">
                            GST {item.tax_rate}% Incl.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Customer Details, Order Summary & Payment Method */}
            <div className="w-full max-w-sm flex flex-col space-y-3.5 shrink-0">
              {/* Customer Profile Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-md">
                    {(liveData.customerName || 'W')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</div>
                    <div className="font-bold text-sm text-white truncate">
                      {liveData.customerName || 'Walk-in Customer'}
                    </div>
                    {liveData.customerPhone && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        {liveData.customerPhone}
                      </div>
                    )}
                  </div>
                </div>
                {liveData.customer?.loyalty_points > 0 && (
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                      🎁 {liveData.customer.loyalty_points} Pts
                    </span>
                  </div>
                )}
              </div>

              {/* Total & Price Breakdown Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-brand-950/70 via-slate-900 to-slate-900 border-2 border-brand-500/40 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Payable Amount</div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    Bill #{liveData.invoiceNumber || 'NEW'}
                  </span>
                </div>

                <div className="text-4xl font-black tracking-tight text-white font-mono drop-shadow-md">
                  ₹{total.toFixed(2)}
                </div>

                {/* Applied Discounts & Savings Highlights */}
                {totalSavings > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                    <Percent className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Total Discount Applied: ₹{totalSavings.toFixed(2)}</span>
                  </div>
                )}

                {/* Financial Summary Rows */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  {liveData.subTotal > 0 && liveData.subTotal !== total && (
                    <div className="flex justify-between text-slate-400">
                      <span>Items Subtotal:</span>
                      <span className="font-mono text-slate-300">₹{Number(liveData.subTotal).toFixed(2)}</span>
                    </div>
                  )}
                  {liveData.totalSavings > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Savings & Discount:</span>
                      <span className="font-mono">-₹{Number(liveData.totalSavings).toFixed(2)}</span>
                    </div>
                  )}
                  {liveData.totalTax > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>GST / Taxes:</span>
                      <span className="font-mono text-slate-300">₹{Number(liveData.totalTax).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Payment Method & QR Display */}
              {isPaymentState && upiQrUrl ? (
                <div className="flex-1 p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2.5 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl border-4 border-white">
                    <img src={upiQrUrl} alt="UPI Payment QR Code" className="w-44 h-44 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                      <QrCode className="w-4 h-4 text-brand-400" />
                      <span>Scan & Pay ₹{total.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      GPay • PhonePe • Paytm • BHIM • AmazonPay
                    </p>
                  </div>
                </div>
              ) : liveData.isTenderOpen ? (
                /* Live Tender Mode Indicator */
                <div className="flex-1 p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-center space-y-2.5 shadow-xl">
                  <div className="flex items-center space-x-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Method: {liveData.paymentMode || 'CASH'}</span>
                  </div>

                  {liveData.paymentMode === 'CASH' && (
                    <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800 font-mono text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Cash Tendered:</span>
                        <strong className="text-white font-bold">₹{Number(liveData.cashTendered || total).toFixed(2)}</strong>
                      </div>
                      {Number(liveData.changeDue || 0) > 0 && (
                        <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
                          <span>Change to Return:</span>
                          <span>₹{Number(liveData.changeDue).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {liveData.paymentMode === 'CARD' && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs text-slate-300 space-y-1">
                      <div className="font-bold text-sky-400">Debit / Credit Card</div>
                      <p className="text-[11px] text-slate-400">Please tap or swipe your card on the EDC terminal.</p>
                    </div>
                  )}

                  {liveData.paymentMode === 'CREDIT' && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs text-slate-300 space-y-1">
                      <div className="font-bold text-amber-400">Customer Khata (Udhar)</div>
                      <p className="text-[11px] text-slate-400">Bill amount will be debited to customer account.</p>
                    </div>
                  )}

                  {liveData.paymentMode === 'SPLIT' && liveData.splitAmounts && (
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Split Payment:</div>
                      {Number(liveData.splitAmounts.cash) > 0 && <div className="flex justify-between"><span>Cash:</span><span>₹{Number(liveData.splitAmounts.cash).toFixed(2)}</span></div>}
                      {Number(liveData.splitAmounts.upi) > 0 && <div className="flex justify-between"><span>UPI:</span><span>₹{Number(liveData.splitAmounts.upi).toFixed(2)}</span></div>}
                      {Number(liveData.splitAmounts.card) > 0 && <div className="flex justify-between"><span>Card:</span><span>₹{Number(liveData.splitAmounts.card).toFixed(2)}</span></div>}
                      {Number(liveData.splitAmounts.credit) > 0 && <div className="flex justify-between"><span>Khata:</span><span>₹{Number(liveData.splitAmounts.credit).toFixed(2)}</span></div>}
                    </div>
                  )}
                </div>
              ) : (
                /* Default Accepted Payments Box */
                <div className="flex-1 p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 rounded-2xl bg-slate-800/80 text-brand-400">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Payment Methods Accepted</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cash • Dynamic UPI QR • Cards • Customer Khata
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
