import React, { useState } from 'react';
import { Printer, X, Download, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';

export function DeliveryChallanPrint({ transfer, onClose }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!transfer) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const filename = `DeliveryChallan_${transfer.transfer_number}.pdf`;
      await exportElementToPdf('printable-delivery-challan', filename, { scale: 2, margin: 6 });
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Could not export PDF directly. Please use Print Delivery Challan.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl bg-white text-slate-900 flex flex-col max-h-[96vh] my-auto overflow-hidden animate-in zoom-in-95">
        
        {/* Header Controls (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-slate-100 border-b border-slate-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">Delivery Challan (Rule 55) • {transfer.transfer_number}</h3>
              <p className="text-xs text-slate-400">Inter-Branch Stock Transit Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all ${isGeneratingPdf ? 'opacity-70 cursor-wait' : ''}`}
              title="Download PDF Delivery Challan"
            >
              {isGeneratingPdf ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{isGeneratingPdf ? 'Saving PDF...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Delivery Challan</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Delivery Challan Body */}
        <div id="printable-delivery-challan" className="p-8 overflow-y-auto space-y-5 text-xs font-sans print:p-0">
          <div className="border-2 border-black p-6 space-y-4">
            
            {/* Title */}
            <div className="text-center border-b-2 border-black pb-3">
              <h1 className="text-lg font-black uppercase tracking-wider">DELIVERY CHALLAN</h1>
              <p className="text-[11px] font-semibold text-gray-700">Issued under Rule 55 of the CGST Rules, 2017 for Inter-Branch Transfer of Goods</p>
            </div>

            {/* Doc Header details */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-black text-xs">
              <div>
                <p><b>Challan Number:</b> <span className="font-mono font-black">{transfer.transfer_number}</span></p>
                <p><b>Dispatch Date:</b> {new Date(transfer.dispatched_at || transfer.created_at).toLocaleString('en-IN')}</p>
                <p><b>Purpose of Transit:</b> <span className="font-bold">Inter-Branch Stock Replenishment (Not for Sale)</span></p>
              </div>
              <div className="text-right">
                <p><b>Vehicle No:</b> <span className="font-mono font-black text-sm">{transfer.vehicle_no || 'DIRECT HANDOVER'}</span></p>
                <p><b>Transporter:</b> {transfer.transporter_name || 'Own Staff / Vehicle'}</p>
                <p><b>Driver Phone:</b> {transfer.driver_phone || 'N/A'}</p>
              </div>
            </div>

            {/* Dispatcher (From) & Consignee (To) */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-black p-3 bg-gray-50">
                <p className="font-bold uppercase text-[10px] text-gray-600 mb-1">CONSIGNOR / DISPATCHING BRANCH (FROM):</p>
                <p className="font-black text-sm">{transfer.from_shop_name}</p>
                <p>GSTIN: <span className="font-mono font-bold">{transfer.from_shop_gstin || 'N/A'}</span></p>
                <p>{transfer.from_shop_address}, {transfer.from_shop_city}</p>
                <p>Phone: {transfer.from_shop_phone}</p>
              </div>

              <div className="border border-black p-3 bg-gray-50">
                <p className="font-bold uppercase text-[10px] text-gray-600 mb-1">CONSIGNEE / RECEIVING BRANCH (TO):</p>
                <p className="font-black text-sm">{transfer.to_shop_name}</p>
                <p>GSTIN: <span className="font-mono font-bold">{transfer.to_shop_gstin || 'N/A'}</span></p>
                <p>{transfer.to_shop_address}, {transfer.to_shop_city}</p>
                <p>Phone: {transfer.to_shop_phone}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-black">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-black font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-black w-8">#</th>
                    <th className="p-2 border-r border-black">Description of Goods</th>
                    <th className="p-2 border-r border-black font-mono">Barcode</th>
                    <th className="p-2 border-r border-black font-mono">HSN</th>
                    <th className="p-2 border-r border-black text-right">Quantity</th>
                    <th className="p-2 border-r border-black text-right">Unit Rate (₹)</th>
                    <th className="p-2 text-right">Taxable Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono text-[11px]">
                  {(transfer.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-black font-sans font-semibold">{it.product_name}</td>
                      <td className="p-2 border-r border-black">{it.barcode || '-'}</td>
                      <td className="p-2 border-r border-black">{it.hsn_code || '999999'}</td>
                      <td className="p-2 border-r border-black text-right font-bold">{it.quantity} {it.unit}</td>
                      <td className="p-2 border-r border-black text-right">₹{Number(it.unit_cost || 0).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">₹{Number(it.total_cost || (it.quantity * (it.unit_cost || 0))).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-black font-bold bg-gray-100">
                  <tr>
                    <td colSpan="4" className="p-2 text-right border-r border-black font-sans">TOTAL CONSIGNMENT:</td>
                    <td className="p-2 text-right border-r border-black font-black">{transfer.total_qty} Units</td>
                    <td className="p-2 border-r border-black"></td>
                    <td className="p-2 text-right font-black">₹{Number(transfer.total_value || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes & Declaration */}
            <div className="text-[10px] text-gray-700 space-y-1 pt-1">
              <p><b>Notes:</b> {transfer.notes || 'Goods dispatched for branch stocking. Strictly not for commercial sale in transit.'}</p>
              <p><b>Declaration:</b> We declare that this delivery challan shows the actual quantity of goods dispatched and that all particulars are true and correct.</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
              <div>
                <div className="w-36 border-b border-black mx-auto mb-1"></div>
                <p className="font-bold">Dispatched By</p>
                <p className="text-[10px] text-gray-500">({transfer.dispatched_by_name || 'Branch Manager'})</p>
              </div>

              <div>
                <div className="w-36 border-b border-black mx-auto mb-1"></div>
                <p className="font-bold">Driver / Carrier Signature</p>
                <p className="text-[10px] text-gray-500">({transfer.vehicle_no || 'Carrier'})</p>
              </div>

              <div>
                <div className="w-36 border-b border-black mx-auto mb-1"></div>
                <p className="font-bold">Received & Verified By</p>
                <p className="text-[10px] text-gray-500">({transfer.received_by_name || 'Consignee Manager'})</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
