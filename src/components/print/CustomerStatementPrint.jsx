import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { generateUpiQrDataUrl } from '../../utils/upiQr';
import { Printer, X, Download, FileText, Share2, DollarSign, Calendar, Building, Phone } from 'lucide-react';

export function CustomerStatementPrint({ customer, ledger, summary, shop, dateRange, onClose }) {
  const { isDark } = useTheme();
  const [upiQrUrl, setUpiQrUrl] = useState(null);

  useEffect(() => {
    if (!shop || !customer) return;
    const balance = summary?.closingBalance || customer.current_balance || 0;
    if (balance > 0 && shop.upi_id) {
      generateUpiQrDataUrl({
        upiId: shop.upi_id,
        name: shop.upi_name || shop.name,
        amount: balance,
        invoiceNumber: `KHATA-${customer.id}`
      }).then(url => setUpiQrUrl(url));
    }
  }, [shop, customer, summary]);

  if (!customer) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const element = document.getElementById('printable-customer-statement');
    if (!element) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Statement of Account - ${customer.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body class="bg-white p-8 font-sans text-slate-900">
  ${element.innerHTML}
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Statement_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateRange?.startDate || 'All'}_to_${dateRange?.endDate || 'Now'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    const balance = summary?.closingBalance || customer.current_balance || 0;
    const text = `*STATEMENT OF ACCOUNT / KHATA SUMMARY*\n` +
      `*Store:* ${shop?.name}\n` +
      `*Customer:* ${customer.name}\n` +
      `*Period:* ${dateRange?.label || 'All Time'}\n` +
      `*Opening Balance:* ₹${(summary?.openingBalance || 0).toFixed(2)}\n` +
      `*Total Bills (Debit):* ₹${(summary?.totalDebit || 0).toFixed(2)}\n` +
      `*Total Payments (Credit):* ₹${(summary?.totalCredit || 0).toFixed(2)}\n` +
      `*Net Closing Balance Due:* ₹${balance.toFixed(2)}\n\n` +
      `Kindly clear pending dues via UPI: ${shop?.upi_id || 'Store UPI'}\n` +
      `Thank you for your business!`;

    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone.length >= 10 
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(text)}` 
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[95vh] my-auto animate-in zoom-in-95 overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header Modal Bar */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 print:hidden ${
          isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Customer Statement of Account (PDF Report)
              </h3>
              <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {customer.name} • {dateRange?.label || 'All Time'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-1"
              title="Share Statement via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Download Statement HTML/PDF File"
            >
              <Download className="w-4 h-4 text-sky-500" />
              <span>Download Statement</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center space-x-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>

            <button 
              onClick={onClose} 
              className={`p-2 rounded-xl transition-all ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className={`p-6 overflow-y-auto flex justify-center ${
          isDark ? 'bg-slate-950/80' : 'bg-slate-200/60'
        }`}>
          <div id="printable-customer-statement" className="w-[820px] bg-white text-slate-900 p-8 rounded-lg shadow-2xl text-xs font-sans border border-slate-200">
            {/* Store Letterhead */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded">
                  STATEMENT OF ACCOUNT / KHATA LEDGER
                </span>
                <h1 className="text-xl font-black text-slate-900 mt-1">{shop?.name || 'KwikStore Pro'}</h1>
                <p className="text-xs text-slate-600">{shop?.legal_name}</p>
                <p className="text-xs text-slate-600 mt-0.5">{shop?.address}, {shop?.city}, {shop?.state} - {shop?.pincode}</p>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">Phone: {shop?.phone} | Email: {shop?.email}</p>
                {shop?.gstin && <p className="text-xs font-bold text-slate-900 mt-0.5">GSTIN: {shop?.gstin}</p>}
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-500">Report Period</div>
                <div className="text-sm font-bold text-slate-800">{dateRange?.label || 'Full Ledger History'}</div>
                <div className="text-[10px] text-slate-500 mt-1">Generated On: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                {upiQrUrl && (
                  <div className="mt-2 inline-block text-center border p-1 rounded bg-slate-50">
                    <img src={upiQrUrl} alt="UPI QR" className="w-16 h-16 mx-auto" />
                    <span className="text-[8px] font-mono text-slate-500 block">Scan to Pay Due</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details & Ledger Summary Cards */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Customer Profile</div>
                <div className="text-sm font-bold text-slate-900">{customer.name}</div>
                <div className="text-xs text-slate-600">Mobile: <strong className="font-mono">{customer.phone || 'N/A'}</strong></div>
                {customer.gstin && <div className="text-xs text-cyan-800 font-mono font-bold">GSTIN: {customer.gstin}</div>}
                {customer.address && <div className="text-xs text-slate-600">Address: {customer.address}</div>}
                {customer.route_beat && <div className="text-xs text-amber-700 font-semibold">Beat / Route: {customer.route_beat}</div>}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Opening Balance</span>
                  <span className="font-bold font-mono">₹{(summary?.openingBalance || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-rose-600 text-[10px] block">Total Invoiced (+)</span>
                  <span className="font-bold font-mono text-rose-600">₹{(summary?.totalDebit || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-emerald-600 text-[10px] block">Total Paid (-)</span>
                  <span className="font-bold font-mono text-emerald-600">₹{(summary?.totalCredit || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold text-[10px] block">Closing Balance Due</span>
                  <span className="text-base font-black font-mono text-rose-600">
                    ₹{((summary?.closingBalance !== undefined ? summary.closingBalance : customer.current_balance) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="py-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-y border-slate-300">
                    <th className="py-2 px-2.5">Date</th>
                    <th className="py-2 px-2.5">Type</th>
                    <th className="py-2 px-2.5">Reference / Bill #</th>
                    <th className="py-2 px-2.5 text-right">Debit (+) Bill</th>
                    <th className="py-2 px-2.5 text-right">Credit (-) Paid</th>
                    <th className="py-2 px-2.5 text-right">Balance Due</th>
                    <th className="py-2 px-2.5">Notes / Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px] font-mono">
                  {summary?.openingBalance > 0 && (
                    <tr className="bg-amber-50/50">
                      <td className="py-2 px-2.5 text-slate-500 font-sans italic" colSpan="3">
                        Opening Balance as on {dateRange?.startDate || 'Start Date'}
                      </td>
                      <td className="py-2 px-2.5 text-right text-rose-600 font-bold">₹{summary.openingBalance.toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right text-slate-400">—</td>
                      <td className="py-2 px-2.5 text-right font-bold text-slate-900">₹{summary.openingBalance.toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-slate-500 font-sans italic">B/F Balance</td>
                    </tr>
                  )}

                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-400 font-sans">
                        No transactions recorded in the selected period.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2 px-2.5 text-slate-600">{row.date?.slice(0, 16)}</td>
                        <td className="py-2 px-2.5 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            row.transaction_type === 'INVOICE' 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {row.transaction_type}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">{row.reference_no}</td>
                        <td className="py-2 px-2.5 text-right text-rose-600 font-semibold">
                          {row.debit_amount > 0 ? `₹${row.debit_amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-emerald-600 font-semibold">
                          {row.credit_amount > 0 ? `₹${row.credit_amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                          ₹{row.balance_after?.toFixed(2)}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 font-sans text-[10px]">
                          {row.payment_mode ? `[${row.payment_mode}] ` : ''}{row.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                    <td colSpan="3" className="py-2.5 px-2.5 uppercase font-sans">
                      Period Total ({ledger.length} Entries)
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-rose-600">
                      ₹{(summary?.totalDebit || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-emerald-600">
                      ₹{(summary?.totalCredit || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-rose-600 text-sm font-black">
                      ₹{((summary?.closingBalance !== undefined ? summary.closingBalance : customer.current_balance) || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2.5 font-sans text-[10px] text-slate-500">Net Outstanding</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Terms & Signature */}
            <div className="pt-6 mt-4 border-t border-slate-300 flex justify-between items-end text-xs">
              <div className="text-slate-500 text-[10px] space-y-0.5">
                <p>• This is a computer generated statement of account.</p>
                <p>• Please report any discrepancies within 7 days of receiving this statement.</p>
                <p>• Pay dues promptly to maintain uninterrupted credit limit facility.</p>
              </div>

              <div className="text-center">
                <div className="w-40 border-b border-slate-400 pb-8 mb-1 text-slate-400 text-[10px]">
                  Authorized Signature
                </div>
                <div className="font-bold text-slate-900">{shop?.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
