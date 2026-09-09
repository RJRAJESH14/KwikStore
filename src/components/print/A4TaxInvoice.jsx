import React, { useEffect, useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { generateUpiQrDataUrl } from '../../utils/upiQr';
import { numberToIndianWords } from '../../utils/numberToWords';
import { formatCurrency } from '../../utils/gstUtils';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { openWhatsAppInvoice, generateWhatsAppInvoiceText } from '../../utils/whatsappUtils';
import { Printer, X, Download, FileText, Share2, Receipt, CheckCircle, ShieldCheck, Landmark, Building2, Phone, Mail, MapPin, Copy, Check, Truck } from 'lucide-react';
import { EWayBillModal } from '../pos/EWayBillModal';
import { exportElementToPdf } from '../../utils/pdfExport';

export function A4TaxInvoice({ invoice, onClose, onPrint, onSwitchToThermal }) {
  const { isDark } = useTheme();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [copyType, setCopyType] = useState('ORIGINAL FOR RECIPIENT'); // ORIGINAL FOR RECIPIENT, DUPLICATE FOR TRANSPORTER, TRIPLICATE FOR SUPPLIER
  const [copiedBill, setCopiedBill] = useState(false);
  const [showEWayModal, setShowEWayModal] = useState(false);
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

  // Dynamic HSN Tax Summary Computation
  const hsnSummary = useMemo(() => {
    if (!invoice || !invoice.items || invoice.items.length === 0) return [];
    
    const map = {};
    invoice.items.forEach(item => {
      const hsn = item.hsn_code || '1905';
      const rate = Number(item.tax_rate || 0);
      const key = `${hsn}_${rate}`;
      
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price || 0);
      const taxable = Number(item.taxable_value || (qty * unitPrice / (1 + rate / 100)) || 0);
      const totalAmt = Number(item.total_amount || (qty * unitPrice) || 0);
      const taxAmt = totalAmt - taxable;

      const isInterState = invoice.customer_state_code && invoice.shop_state_code && 
                           invoice.customer_state_code !== invoice.shop_state_code;

      if (!map[key]) {
        map[key] = {
          hsn,
          taxRate: rate,
          taxableValue: 0,
          cgstRate: isInterState ? 0 : rate / 2,
          cgstAmount: 0,
          sgstRate: isInterState ? 0 : rate / 2,
          sgstAmount: 0,
          igstRate: isInterState ? rate : 0,
          igstAmount: 0,
          totalTax: 0
        };
      }

      map[key].taxableValue += taxable;
      if (isInterState) {
        map[key].igstAmount += taxAmt;
      } else {
        map[key].cgstAmount += taxAmt / 2;
        map[key].sgstAmount += taxAmt / 2;
      }
      map[key].totalTax += taxAmt;
    });

    return Object.values(map);
  }, [invoice]);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
    if (onPrint) onPrint();
  };

  const handleShareWhatsApp = () => {
    openWhatsAppInvoice(invoice);
  };

  const handleCopyBillText = () => {
    const text = generateWhatsAppInvoiceText(invoice);
    navigator.clipboard.writeText(text);
    setCopiedBill(true);
    setTimeout(() => setCopiedBill(false), 2500);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const filename = `Invoice_${invoice.invoice_number}_${(invoice.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await exportElementToPdf('printable-a4-invoice', filename, {
        scale: 2,
        margin: 4
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Could not export PDF directly. You can also click Print Invoice and select "Save as PDF".');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const safeDate = invoice.invoice_date ? new Date(String(invoice.invoice_date).replace(' ', 'T')) : new Date();
  const formattedDate = isNaN(safeDate.getTime()) ? String(invoice.invoice_date || '') : safeDate.toLocaleDateString('en-GB');
  const formattedTime = isNaN(safeDate.getTime()) ? '' : safeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-[98vw] max-w-5xl lg:max-w-6xl shadow-2xl flex flex-col max-h-[96vh] my-auto animate-in zoom-in-95 overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header Modal Bar (Controls in single top liner) */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 print:hidden overflow-x-auto ${
          isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-1.5">
              <h3 className={`text-xs font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                A4 GST Invoice
              </h3>
              <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-1.5 py-0.2 rounded border border-brand-500/20 font-mono">
                #{invoice.invoice_number}
              </span>
            </div>
          </div>

          {/* Single-Line Action Controls */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              className={`border text-[11px] rounded-lg px-2 py-1 font-semibold outline-none cursor-pointer focus:border-brand-500 shrink-0 ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-slate-200' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="ORIGINAL FOR RECIPIENT">Original</option>
              <option value="DUPLICATE FOR TRANSPORTER">Duplicate</option>
              <option value="TRIPLICATE FOR SUPPLIER">Triplicate</option>
            </select>

            {onSwitchToThermal && (
              <button
                onClick={onSwitchToThermal}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center space-x-1 transition-all shrink-0 ${
                  isDark 
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                title="Switch to 80mm Thermal Receipt Slip Format"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                <span>Thermal</span>
              </button>
            )}

            <button
              onClick={handleCopyBillText}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center space-x-1 transition-all shrink-0 ${
                copiedBill 
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : isDark 
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Copy formatted invoice text to clipboard"
            >
              {copiedBill ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedBill ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center space-x-1 transition-all shrink-0"
              title="Share full itemized invoice on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setShowEWayModal(true)}
              className="px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center space-x-1 transition-all shrink-0"
              title="Generate NIC E-Way Bill & E-Invoice JSON"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>E-Way Bill</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center space-x-1 transition-all shrink-0 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              } ${isGeneratingPdf ? 'opacity-70 cursor-wait' : ''}`}
              title="Download official PDF document"
            >
              {isGeneratingPdf ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-500" />
              )}
              <span>{isGeneratingPdf ? 'Saving PDF...' : 'PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-[11px] font-bold shadow-md shadow-brand-500/20 flex items-center space-x-1.5 transition-all shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button 
              onClick={onClose} 
              className={`p-1.5 rounded-lg transition-all shrink-0 ${
                isDark 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700' 
                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* A4 Document Viewport */}
        <div className={`p-4 sm:p-5 overflow-y-auto flex justify-center ${
          isDark ? 'bg-slate-950' : 'bg-slate-200/60'
        }`}>
          <div 
            id="printable-a4-invoice" 
            className="w-[820px] bg-white text-slate-900 p-8 rounded-xl shadow-2xl text-xs font-sans border border-slate-300 space-y-4 print:p-0 print:border-none print:shadow-none"
          >
            
            {/* Top Header Badge & Company Details */}
            <div className="border-b-2 border-slate-900 pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1 max-w-[65%]">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      {invoice.invoice_type === 'TAX_INVOICE_B2B' ? 'TAX INVOICE (GST B2B)' : 'TAX INVOICE / CASH BILL (B2C)'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      {copyType}
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{invoice.shop_name}</h1>
                  {invoice.shop_legal_name && (
                    <p className="text-xs text-slate-600 font-medium">{invoice.shop_legal_name}</p>
                  )}
                  <p className="text-xs text-slate-600 leading-snug">
                    {invoice.shop_address}, {invoice.shop_city}, {invoice.shop_state} - {invoice.shop_pincode}
                  </p>
                  <p className="text-xs text-slate-700 font-semibold">
                    Phone: {invoice.shop_phone} {invoice.shop_email ? `| Email: ${invoice.shop_email}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {invoice.shop_gstin && (
                      <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        GSTIN: {invoice.shop_gstin}
                      </span>
                    )}
                    {(invoice.shop_drug_license_no || invoice.drug_license_no) && (
                      <span className="text-[11px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        D.L. No: {invoice.shop_drug_license_no || invoice.drug_license_no}
                      </span>
                    )}
                    {invoice.shop_fssai_no && (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        FSSAI: {invoice.shop_fssai_no}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Header: Invoice Metadata & Scannable Barcode */}
                <div className="text-right flex flex-col items-end space-y-1">
                  <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-right shadow-sm">
                    <div className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">Invoice Number</div>
                    <div className="text-sm font-black font-mono tracking-wider">{invoice.invoice_number}</div>
                  </div>
                  <div className="text-xs text-slate-700 pt-1">
                    Invoice Date: <strong className="font-mono text-slate-900">{formattedDate}</strong>
                  </div>
                  {formattedTime && (
                    <div className="text-xs text-slate-500">
                      Time: <span className="font-mono">{formattedTime}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-600">
                    Place of Supply: <strong className="text-slate-900">{invoice.shop_state || 'Delhi'} ({invoice.shop_state_code || '07'})</strong>
                  </div>
                  <div className="mt-1 border border-slate-200 rounded-lg p-1 bg-white shadow-sm">
                    <BarcodeSvg value={invoice.invoice_number} height={24} barWidth={1.0} fontSize="text-[8px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To & Dispatch / Payment Card */}
            <div className="grid grid-cols-2 gap-4">
              {/* Buyer / Customer Section */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                    <span>Billed To (Buyer / Recipient):</span>
                    <span className="text-[9px] font-bold text-slate-500 font-mono">
                      {invoice.invoice_type === 'TAX_INVOICE_B2B' ? 'B2B GST Account' : 'Retail Consumer'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{invoice.customer_name || 'Walk-in Customer'}</div>
                  {invoice.customer_phone && (
                    <div className="text-xs text-slate-600">
                      Mobile: <span className="font-mono font-semibold">{invoice.customer_phone}</span>
                    </div>
                  )}
                  {invoice.billing_address && (
                    <div className="text-xs text-slate-600 leading-snug">{invoice.billing_address}</div>
                  )}
                </div>

                {invoice.customer_gstin && (
                  <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-2">
                    Buyer GSTIN: <span className="font-mono">{invoice.customer_gstin}</span> (State Code: {invoice.customer_state_code || '07'})
                  </div>
                )}
              </div>

              {/* Payment Status & Counter QR */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-1">
                    Payment & Settlement Details
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Payment Mode:</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded border inline-block mt-0.5 ${
                      invoice.payment_status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                        : 'bg-amber-500/10 text-amber-700 border-amber-300'
                    }`}>
                      {invoice.payment_mode || 'CASH'} • {invoice.payment_status || 'PAID'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Biller / Staff: <strong className="text-slate-800">{invoice.cashier_name || 'Counter Staff'}</strong>
                  </div>
                  {invoice.vehicle_no && (
                    <div className="text-[11px] text-slate-600">
                      Vehicle No: <strong className="text-slate-800 font-mono">{invoice.vehicle_no}</strong>
                    </div>
                  )}
                </div>

                {qrCodeUrl && (
                  <div className="text-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <img src={qrCodeUrl} alt="UPI QR" className="w-16 h-16 mx-auto object-contain rounded" />
                    <span className="text-[8px] text-slate-600 font-bold uppercase block mt-1 tracking-wider">Scan to Pay (UPI)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th className="py-2.5 px-2.5 text-left w-8">#</th>
                    <th className="py-2.5 px-2.5 text-left">Item Description</th>
                    <th className="py-2.5 px-2 text-center w-16">HSN/SAC</th>
                    <th className="py-2.5 px-2 text-center w-16">Qty</th>
                    <th className="py-2.5 px-2 text-right w-20">Rate (₹)</th>
                    <th className="py-2.5 px-2 text-center w-14">GST %</th>
                    <th className="py-2.5 px-2 text-right w-20">Taxable (₹)</th>
                    <th className="py-2.5 px-2.5 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {(invoice.items && invoice.items.length > 0) ? (
                    invoice.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2 px-2.5 text-slate-500 text-left font-mono">{idx + 1}</td>
                        <td className="py-2 px-2.5">
                          <div className="font-bold text-slate-900">{item.item_name || 'Product Item'}</div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap gap-2 mt-0.5">
                            {(item.barcode || item.product_barcode) && (
                              <span>Barcode: <strong className="font-mono text-slate-700">{item.barcode || item.product_barcode}</strong></span>
                            )}
                            {item.batch_no && (
                              <span className="bg-purple-50 text-purple-700 px-1 rounded border border-purple-200">
                                Batch: <strong>{item.batch_no}</strong> {item.expiry_date ? `(Exp: ${item.expiry_date})` : ''}
                              </span>
                            )}
                            {item.serial_imei && (
                              <span className="bg-sky-50 text-sky-700 px-1 rounded border border-sky-200">
                                SN/IMEI: <strong>{item.serial_imei}</strong>
                              </span>
                            )}
                            {item.variant_details && (
                              <span>Variant: <strong>{item.variant_details}</strong></span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600">{item.hsn_code || '1905'}</td>
                        <td className="py-2 px-2 text-center font-bold">
                          {item.quantity || 1} <span className="text-[10px] text-slate-500 font-normal">{item.unit || 'PCS'}</span>
                          {item.free_quantity > 0 && (
                            <span className="block text-[9px] text-emerald-700 font-bold bg-emerald-50 rounded px-1 mt-0.5">
                              +{item.free_quantity} FREE
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                        <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700">{item.tax_rate || 0}%</td>
                        <td className="py-2 px-2 text-right font-mono">₹{Number(item.taxable_value || (item.quantity * item.unit_price) || 0).toFixed(2)}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900 font-mono">₹{Number(item.total_amount || (item.quantity * item.unit_price) || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-2.5 text-slate-500 text-left font-mono">1</td>
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-slate-900">Retail Sales Items (Consolidated)</div>
                        <div className="text-[10px] text-slate-400">Invoice #{invoice.invoice_number}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600">1905</td>
                      <td className="py-2.5 px-2 text-center font-bold">1 LOT</td>
                      <td className="py-2.5 px-2 text-right font-mono">₹{Number(invoice.taxable_amount || invoice.grand_total || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-center font-mono">GST</td>
                      <td className="py-2.5 px-2 text-right font-mono">₹{Number(invoice.taxable_amount || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 font-mono">₹{Number(invoice.grand_total || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* HSN Summary Tax Matrix (Official GST Requirement) */}
            {hsnSummary.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-700 border-b border-slate-200 uppercase tracking-wider">
                  HSN/SAC Tax Breakdown Summary
                </div>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-1 px-2 text-left">HSN/SAC</th>
                      <th className="py-1 px-2 text-right">Taxable Val (₹)</th>
                      <th className="py-1 px-2 text-right">CGST (₹)</th>
                      <th className="py-1 px-2 text-right">SGST (₹)</th>
                      <th className="py-1 px-2 text-right">IGST (₹)</th>
                      <th className="py-1 px-2 text-right">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {hsnSummary.map((h, i) => (
                      <tr key={i} className="text-slate-700">
                        <td className="py-1 px-2 text-left font-bold">{h.hsn} ({h.taxRate}%)</td>
                        <td className="py-1 px-2 text-right">₹{h.taxableValue.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right">₹{h.cgstAmount.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right">₹{h.sgstAmount.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right">₹{h.igstAmount.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right font-bold text-slate-900">₹{h.totalTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Calculations, Tax Summary & Bank Details */}
            <div className="grid grid-cols-2 gap-6 pt-1">
              {/* Left Column: Bank Details & Amount in Words */}
              <div className="space-y-2.5">
                {/* Amount in Words */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Invoice Amount in Words:</div>
                  <div className="text-xs font-bold text-slate-900 italic mt-0.5">
                    {numberToIndianWords(invoice.grand_total)}
                  </div>
                </div>

                {/* Bank Account Details */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-0.5">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1 flex items-center justify-between">
                    <span>Bank & Electronic Remittance:</span>
                    <span className="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                      Verified Remittance
                    </span>
                  </div>
                  <div>Bank Name: <strong className="text-slate-900">{invoice.shop_bank_name || 'HDFC Bank'}</strong></div>
                  <div>Account Number: <strong className="font-mono text-slate-900">{invoice.shop_bank_account_no || '50200012345678'}</strong></div>
                  <div>IFSC Code: <strong className="font-mono text-slate-900">{invoice.shop_bank_ifsc || 'HDFC0000123'}</strong></div>
                  {invoice.shop_upi_id && <div>UPI ID: <strong className="font-mono text-cyan-800">{invoice.shop_upi_id}</strong></div>}
                </div>

                {/* Terms and conditions */}
                <div className="text-[9px] text-slate-500 pt-1">
                  <div className="font-bold text-slate-700 mb-0.5 uppercase tracking-wider">Terms & Conditions:</div>
                  <p className="whitespace-pre-line leading-relaxed text-slate-600">{invoice.terms_conditions || '1. Goods once sold will not be returned without bill.\n2. Subject to local jurisdiction.'}</p>
                </div>
              </div>

              {/* Right Column: Financial Breakdown Matrix */}
              <div className="space-y-1 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span>Taxable Turnover:</span>
                    <span className="font-mono font-semibold">₹{Number(invoice.taxable_amount || 0).toFixed(2)}</span>
                  </div>
                  {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-emerald-700 font-semibold">
                      <span>Total Savings / Discount:</span>
                      <span className="font-mono font-bold">- ₹{Number(invoice.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.cgst_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-slate-700">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono font-semibold">₹{Number(invoice.cgst_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.sgst_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-slate-700">
                      <span>State GST (SGST):</span>
                      <span className="font-mono font-semibold">₹{Number(invoice.sgst_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.igst_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-slate-700">
                      <span>Integrated GST (IGST):</span>
                      <span className="font-mono font-semibold">₹{Number(invoice.igst_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.round_off) !== 0 && (
                    <div className="flex justify-between py-0.5 text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">{Number(invoice.round_off) > 0 ? `+₹${invoice.round_off}` : `-₹${Math.abs(invoice.round_off)}`}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900 mt-1">
                    <span>Grand Total (INR):</span>
                    <span className="text-base font-mono text-emerald-800">₹{Number(invoice.grand_total || 0).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-0.5 text-slate-700 text-xs border-t border-slate-200 pt-1.5">
                    <span>Amount Paid:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{Number(invoice.amount_paid || invoice.grand_total || 0).toFixed(2)}</span>
                  </div>

                  {Number(invoice.balance_due) > 0 && (
                    <div className="flex justify-between py-1 text-rose-700 font-bold text-xs bg-rose-50 px-2.5 rounded-lg border border-rose-200">
                      <span>Balance Outstanding (Udhar):</span>
                      <span className="font-mono">₹{Number(invoice.balance_due || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Signature & Watermark Footer */}
            <div className="flex justify-between items-end pt-6 border-t border-slate-200">
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700">Thank you for your business!</div>
                <div>Generated via KwikStore Pro • Universal POS & Retail Engine</div>
              </div>

              <div className="text-center">
                <div className="font-bold text-slate-900 text-xs">For {invoice.shop_name}</div>
                <div className="h-10 flex items-center justify-center">
                  <span className="text-[9px] text-slate-400 italic">[Digitally Generated Signature]</span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-700 font-bold px-6">
                  Authorized Signatory
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showEWayModal && (
        <EWayBillModal
          invoice={invoice}
          onClose={() => setShowEWayModal(false)}
        />
      )}
    </div>
  );
}
