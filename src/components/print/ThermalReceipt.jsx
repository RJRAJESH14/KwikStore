import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { generateUpiQrDataUrl } from '../../utils/upiQr';
import { formatCurrency } from '../../utils/gstUtils';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { openWhatsAppInvoice } from '../../utils/whatsappUtils';
import { Printer, X, Share2, Copy, Check, QrCode, FileText, Download, Sparkles } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';

export function ThermalReceipt({ invoice, onClose, onPrint, onSwitchToA4 }) {
  const { isDark } = useTheme();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [paperWidth, setPaperWidth] = useState('80mm'); // '80mm' or '58mm'
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    if (invoice.shop_qr_type === 'NONE') {
      setQrCodeUrl(null);
      return;
    }
    if (invoice.shop_qr_type === 'CUSTOM_IMAGE' && invoice.shop_custom_qr_image) {
      setQrCodeUrl(invoice.shop_custom_qr_image);
      return;
    }
    if (invoice.shop_upi_id) {
      generateUpiQrDataUrl({
        upiId: invoice.shop_upi_id,
        name: invoice.shop_upi_name || invoice.shop_name,
        amount: invoice.balance_due > 0 ? invoice.balance_due : invoice.grand_total,
        invoiceNumber: invoice.invoice_number
      }).then(url => setQrCodeUrl(url));
    }
  }, [invoice]);

  if (!invoice) return null;

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppNotice, setWhatsAppNotice] = useState(null);

  const handlePrint = () => {
    window.print();
    if (onPrint) onPrint();
  };

  const handleShareWhatsApp = async () => {
    if (invoice.customer_phone) {
      setIsSendingWhatsApp(true);
      try {
        const res = await fetch('/api/whatsapp/send-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: invoice.id, phone: invoice.customer_phone })
        });
        const data = await res.json();
        if (data.mode === 'DIRECT_CLOUD_API' && data.success) {
          setWhatsAppNotice('✓ Sent directly to customer WhatsApp!');
          setTimeout(() => setWhatsAppNotice(null), 3500);
          setIsSendingWhatsApp(false);
          return;
        } else if (data.webUrl) {
          window.open(data.webUrl, '_blank');
        } else {
          openWhatsAppInvoice(invoice);
        }
      } catch (err) {
        openWhatsAppInvoice(invoice);
      } finally {
        setIsSendingWhatsApp(false);
      }
    } else {
      openWhatsAppInvoice(invoice);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const filename = `Receipt_${invoice.invoice_number}_${(invoice.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await exportElementToPdf('printable-thermal-receipt', filename, { scale: 2, margin: 4 });
    } catch (err) {
      console.error('Failed to export thermal receipt PDF:', err);
      alert('Could not export PDF directly. Please use Print and select Save as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const totalSavings = Number(invoice.discount_amount || 0) + 
    (invoice.items?.reduce((acc, item) => acc + Number(item.discount_amount || 0), 0) || 0);

  const safeDate = invoice.invoice_date ? new Date(String(invoice.invoice_date).replace(' ', 'T')) : new Date();
  const formattedDate = isNaN(safeDate.getTime()) ? String(invoice.invoice_date || '') : safeDate.toLocaleDateString('en-GB');
  const formattedTime = isNaN(safeDate.getTime()) ? '' : safeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const is58 = paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[94vh] my-auto animate-in zoom-in-95 overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Controls Top Bar (Hidden during printing) */}
        <div className={`p-3 border-b flex items-center justify-between shrink-0 print:hidden ${
          isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <div>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Thermal POS Receipt
              </span>
              <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                #{invoice.invoice_number}
              </span>
            </div>
          </div>

          {/* Width & Action Buttons */}
          <div className="flex items-center space-x-1.5">
            <div className={`flex items-center border rounded-lg p-0.5 text-[10px] font-mono ${
              isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'
            }`}>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded transition-all ${
                  paperWidth === '80mm' 
                    ? 'bg-brand-600 text-white font-bold' 
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded transition-all ${
                  paperWidth === '58mm' 
                    ? 'bg-brand-600 text-white font-bold' 
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                58mm
              </button>
            </div>

            {onSwitchToA4 && (
              <button
                onClick={onSwitchToA4}
                className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                title="Switch to A4 Tax Invoice Format"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-500" />
                <span className="hidden sm:inline">A4</span>
              </button>
            )}

            <button
              onClick={handleShareWhatsApp}
              className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-all"
              title="Share receipt on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              } ${isGeneratingPdf ? 'opacity-70 cursor-wait' : ''}`}
              title="Download Receipt PDF"
            >
              {isGeneratingPdf ? (
                <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-sky-500" />
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md flex items-center space-x-1 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button 
              onClick={onClose} 
              className={`p-1 rounded-lg transition-all ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Paper Viewport */}
        <div className={`p-4 overflow-y-auto flex justify-center ${
          isDark ? 'bg-slate-950' : 'bg-slate-200/60'
        }`}>
          <div 
            id="printable-thermal-receipt" 
            className="bg-white text-black p-3.5 pb-6 shadow-xl font-mono border border-slate-300 print:border-none print:shadow-none print:p-1" 
            style={{ width: is58 ? '230px' : '320px', fontSize: is58 ? '9px' : '11px' }}
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b-2 border-dashed border-gray-800 space-y-0.5">
              <h2 className={`font-black tracking-tight uppercase leading-tight ${is58 ? 'text-xs' : 'text-sm'}`}>{invoice.shop_name}</h2>
              {invoice.shop_legal_name && <p className="text-[8.5px] text-gray-700 leading-tight">{invoice.shop_legal_name}</p>}
              <p className="text-[8.5px] text-gray-700 leading-tight">{invoice.shop_address}, {invoice.shop_city}</p>
              <p className="text-[8.5px] font-bold text-gray-900">Ph: {invoice.shop_phone}</p>
              {invoice.shop_gstin && (
                <p className="text-[9px] font-black text-black">GSTIN: {invoice.shop_gstin}</p>
              )}
              {(invoice.shop_drug_license_no || invoice.drug_license_no) && (
                <p className="text-[8.5px] font-bold text-gray-800">D.L. No: {invoice.shop_drug_license_no || invoice.drug_license_no}</p>
              )}
              {invoice.shop_fssai_no && (
                <p className="text-[8.5px] font-bold text-gray-800">FSSAI: {invoice.shop_fssai_no}</p>
              )}
            </div>

            {/* Bill Details */}
            <div className="py-2 border-b border-dashed border-gray-600 text-[9.5px] space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>Bill: #{invoice.invoice_number}</span>
                <span>{formattedTime}</span>
              </div>
              <div className="flex justify-between text-gray-800">
                <span>Date: {formattedDate}</span>
                <span>Type: {invoice.invoice_type === 'TAX_INVOICE_B2B' ? 'B2B GST' : 'Retail'}</span>
              </div>
              <div className="text-gray-900 font-semibold break-words">
                Customer: <strong>{invoice.customer_name || 'Walk-in'}</strong> {invoice.customer_phone ? `(${invoice.customer_phone})` : ''}
              </div>
              {invoice.customer_gstin && (
                <div className="font-bold text-[8.5px]">Buyer GST: {invoice.customer_gstin}</div>
              )}
              {invoice.cashier_name && (
                <div className="text-[8.5px] text-gray-700">Cashier: {invoice.cashier_name}</div>
              )}
            </div>

            {/* Item Table (58mm 2-line layout vs 80mm table layout) */}
            {is58 ? (
              <div className="my-2 border-b-2 border-dashed border-gray-800 pb-1 space-y-1.5">
                <div className="flex justify-between font-black uppercase text-[8.5px] border-b border-gray-400 pb-0.5">
                  <span>Item / Qty × Rate</span>
                  <span>Amount</span>
                </div>
                {(invoice.items && invoice.items.length > 0) ? (
                  invoice.items.map((item, idx) => (
                    <div key={idx} className="border-b border-dashed border-gray-200 pb-1 last:border-b-0">
                      <div className="font-bold text-gray-950 leading-tight break-words">{item.item_name || 'Item'}</div>
                      <div className="flex justify-between items-center text-[8.5px] text-gray-700 mt-0.5">
                        <span>{item.quantity || 1} {item.unit || 'PCS'} × ₹{Number(item.unit_price || 0).toFixed(2)}</span>
                        <span className="font-mono font-black text-gray-950 text-[9.5px]">₹{Number(item.total_amount || (item.quantity * item.unit_price) || 0).toFixed(2)}</span>
                      </div>
                      {(item.barcode || item.product_barcode) && (
                        <div className="text-[7.5px] text-gray-500 font-mono">BC: {item.barcode || item.product_barcode}</div>
                      )}
                      {item.batch_no && (
                        <div className="text-[7.5px] text-gray-600">Batch: {item.batch_no} {item.expiry_date ? `| Exp: ${item.expiry_date}` : ''}</div>
                      )}
                      {item.serial_imei && (
                        <div className="text-[7.5px] text-gray-600">SN: {item.serial_imei}</div>
                      )}
                      {Number(item.free_quantity) > 0 && (
                        <div className="text-[7.5px] text-emerald-800 font-bold">+ {item.free_quantity} Free</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-[8.5px]">Consolidated Items</span>
                    <span className="font-mono font-bold text-[9px]">₹{Number(invoice.grand_total || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full my-2 text-[10px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-left font-black uppercase text-[9px]">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {(invoice.items && invoice.items.length > 0) ? (
                    invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 pr-1">
                          <div className="font-bold text-gray-900 leading-tight">{item.item_name || 'Item'}</div>
                          {(item.barcode || item.product_barcode) && (
                            <div className="text-[8px] text-gray-600 font-mono">BC: {item.barcode || item.product_barcode}</div>
                          )}
                          {item.batch_no && (
                            <div className="text-[8px] text-gray-700">Batch: {item.batch_no} {item.expiry_date ? `| Exp: ${item.expiry_date}` : ''}</div>
                          )}
                          {item.serial_imei && (
                            <div className="text-[8px] text-gray-700">SN: {item.serial_imei}</div>
                          )}
                          {item.variant_details && (
                            <div className="text-[8px] text-gray-700">{item.variant_details}</div>
                          )}
                          {Number(item.free_quantity) > 0 && (
                            <div className="text-[8px] text-emerald-800 font-bold">+ {item.free_quantity} Free</div>
                          )}
                        </td>
                        <td className="py-1 text-center font-semibold whitespace-nowrap">
                          {item.quantity || 1} {item.unit || 'PCS'}
                        </td>
                        <td className="py-1 text-right font-mono whitespace-nowrap">
                          ₹{Number(item.unit_price || 0).toFixed(2)}
                        </td>
                        <td className="py-1 text-right font-mono font-bold whitespace-nowrap">
                          ₹{Number(item.total_amount || (item.quantity * item.unit_price) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-1 pr-1 font-bold">Consolidated Retail Items</td>
                      <td className="py-1 text-center">1 LOT</td>
                      <td className="py-1 text-right font-mono">₹{Number(invoice.grand_total || 0).toFixed(2)}</td>
                      <td className="py-1 text-right font-mono font-bold">₹{Number(invoice.grand_total || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Calculations & Summary */}
            <div className={`pt-1.5 ${is58 ? '' : 'border-t-2 border-dashed border-gray-800'} text-[9.5px] space-y-0.5`}>
              <div className="flex justify-between">
                <span>Total Items ({invoice.items?.length || 0}):</span>
                <span className="font-mono font-semibold">₹{Number(invoice.sub_total || invoice.taxable_amount || invoice.grand_total || 0).toFixed(2)}</span>
              </div>
              
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Bill Discount:</span>
                  <span className="font-mono text-emerald-800">- ₹{Number(invoice.discount_amount).toFixed(2)}</span>
                </div>
              )}

              {Number(invoice.cgst_amount) > 0 && (
                <div className="flex justify-between text-[8.5px] text-gray-700">
                  <span>CGST:</span>
                  <span className="font-mono">₹{Number(invoice.cgst_amount).toFixed(2)}</span>
                </div>
              )}

              {Number(invoice.sgst_amount) > 0 && (
                <div className="flex justify-between text-[8.5px] text-gray-700">
                  <span>SGST:</span>
                  <span className="font-mono">₹{Number(invoice.sgst_amount).toFixed(2)}</span>
                </div>
              )}

              {Number(invoice.igst_amount) > 0 && (
                <div className="flex justify-between text-[8.5px] text-gray-700">
                  <span>IGST:</span>
                  <span className="font-mono">₹{Number(invoice.igst_amount).toFixed(2)}</span>
                </div>
              )}

              {Number(invoice.round_off) !== 0 && (
                <div className="flex justify-between text-[8.5px] text-gray-700">
                  <span>Round Off:</span>
                  <span className="font-mono">{Number(invoice.round_off) > 0 ? `+₹${invoice.round_off}` : `-₹${Math.abs(invoice.round_off)}`}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between text-xs font-black pt-1.5 border-t-2 border-black">
                <span>NET AMOUNT:</span>
                <span className={`${is58 ? 'text-xs' : 'text-sm'} font-black`}>₹{Number(invoice.grand_total || 0).toFixed(2)}</span>
              </div>

              {/* Tender / Paid */}
              <div className="flex justify-between text-[9.5px] font-semibold text-gray-800 pt-0.5">
                <span>Paid ({invoice.payment_mode || 'CASH'}):</span>
                <span className="font-mono font-bold">₹{Number(invoice.amount_paid || invoice.grand_total || 0).toFixed(2)}</span>
              </div>

              {Number(invoice.balance_due) > 0 && (
                <div className="flex justify-between text-[9.5px] font-black text-rose-800 border-t border-dashed border-rose-300 pt-0.5">
                  <span>Balance Due (Udhar):</span>
                  <span className="font-mono">₹{Number(invoice.balance_due).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Savings Highlight Badge */}
            {totalSavings > 0 && (
              <div className="my-2 p-1.5 rounded bg-gray-100 text-center border border-gray-400">
                <span className="text-[9px] font-black text-emerald-900">
                  🎉 YOU SAVED ₹{totalSavings.toFixed(2)} TODAY!
                </span>
              </div>
            )}

            {/* Dynamic UPI QR Code */}
            {qrCodeUrl && (
              <div className="my-2 text-center border-t border-dashed border-gray-600 pt-2">
                <p className="text-[8.5px] font-bold uppercase tracking-wider mb-1">Scan to Pay via UPI</p>
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR" 
                  className={`${is58 ? 'w-20 h-20' : 'w-24 h-24'} mx-auto border border-gray-400 p-1 rounded object-contain`} 
                />
                <p className="text-[7.5px] text-gray-600 mt-0.5">PhonePe • GPay • Paytm • BHIM</p>
              </div>
            )}

            {/* Scannable Barcode */}
            <div className="my-2 text-center border-t border-dashed border-gray-600 pt-2">
              <div className="flex justify-center">
                <BarcodeSvg 
                  value={invoice.invoice_number} 
                  height={is58 ? 18 : 24} 
                  barWidth={is58 ? 0.8 : 1.0} 
                  fontSize="text-[7.5px]" 
                />
              </div>
            </div>

            {/* Footer Notes */}
            <div className="text-center pt-2 border-t border-dashed border-gray-600 text-[8.5px] text-gray-700 leading-tight space-y-0.5">
              <p className="font-semibold">{invoice.thermal_footer_note || 'Thank you for shopping with us! Visit again.'}</p>
              <p className="text-[7.5px] text-gray-500">KwikStore Pro • Universal POS & Retail Engine</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
