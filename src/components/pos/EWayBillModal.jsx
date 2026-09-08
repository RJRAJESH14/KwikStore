import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  Truck, 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  MapPin, 
  Navigation,
  FileCode,
  X
} from 'lucide-react';

export function EWayBillModal({ invoice, onClose }) {
  const { isDark } = useTheme();

  const [vehicleNo, setVehicleNo] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [transDistance, setTransDistance] = useState('50');
  const [transMode, setTransMode] = useState('1'); // 1=Road
  const [vehicleType, setVehicleType] = useState('R'); // R=Regular
  const [supplyType, setSupplyType] = useState('O'); // Outward
  const [subSupplyType, setSubSupplyType] = useState('1'); // Supply

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPayload, setGeneratedPayload] = useState(null);
  const [activeTab, setActiveTab] = useState('form'); // 'form', 'preview', 'print'

  const handleGenerate = async (downloadDirect = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ewaybill/generate-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id || invoice.invoice_number,
          transporterData: {
            vehicleNo: vehicleNo.trim().toUpperCase(),
            transporterId: transporterId.trim().toUpperCase(),
            transporterName: transporterName.trim(),
            transDistance: Number(transDistance) || 50,
            transMode,
            vehicleType,
            supplyType,
            subSupplyType
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedPayload(data.ewayBillPayload);
        if (downloadDirect) {
          downloadJsonFile(data.ewayBillPayload, `EWAYBILL_${data.invoiceNumber}.json`);
        } else {
          setActiveTab('preview');
        }
      } else {
        setError(data.message || 'Failed to generate E-Way bill JSON.');
      }
    } catch (e) {
      setError('Network error generating E-Way bill.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/einvoice/generate-json/${invoice.id || invoice.invoice_number}`);
      const data = await res.json();
      if (data.success) {
        downloadJsonFile(data.einvoicePayload, `EINVOICE_${data.invoiceNumber}.json`);
      } else {
        setError(data.message || 'Failed to generate E-Invoice JSON.');
      }
    } catch (e) {
      setError('Network error generating E-Invoice.');
    } finally {
      setLoading(false);
    }
  };

  const downloadJsonFile = (jsonData, filename) => {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh] ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-50 border-amber-200/60'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black flex items-center gap-1.5">
                Indian GST E-Way Bill & E-Invoice Portal Generator
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                  NIC Compliant
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Invoice #{invoice?.invoice_number} • ₹{Number(invoice?.total_amount || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'form' && (
            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(false); }} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  Part-A: Consignment & Value Overview
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Document No</span>
                    <span className="font-mono font-bold text-slate-200">{invoice?.invoice_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Invoice Total</span>
                    <span className="font-mono font-bold text-emerald-400">₹{Number(invoice?.total_amount || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Supply Type</span>
                    <span className="font-semibold text-slate-200">Outward - Regular</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Customer GSTIN</span>
                    <span className="font-mono text-slate-300">{invoice?.customer_gstin || 'URP (Unregistered)'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-500" />
                  Part-B: Transporter & Vehicle Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                      placeholder="e.g. OD02AB1234 / DL01A1234"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Required by GST law for transit goods &gt; ₹50,000</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Estimated Distance (KM) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="4000"
                      value={transDistance}
                      onChange={(e) => setTransDistance(e.target.value)}
                      placeholder="e.g. 50"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Transporter ID / GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={transporterId}
                      onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                      placeholder="15-digit Transporter GSTIN"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Transporter Name / Agency (Optional)
                    </label>
                    <input
                      type="text"
                      value={transporterName}
                      onChange={(e) => setTransporterName(e.target.value)}
                      placeholder="e.g. VRL Logistics / BlueDart"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Mode of Transport
                    </label>
                    <select
                      value={transMode}
                      onChange={(e) => setTransMode(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="1">🚛 1 - Road</option>
                      <option value="2">🚆 2 - Rail</option>
                      <option value="3">✈️ 3 - Air</option>
                      <option value="4">🚢 4 - Ship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="R">Regular Goods Vehicle</option>
                      <option value="O">Over Dimensional Cargo (ODC)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleGenerateEInvoice}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <FileCode className="w-4 h-4" />
                  Generate B2B E-Invoice JSON
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerate(true)}
                    disabled={loading || !vehicleNo}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Download NIC JSON
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !vehicleNo}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    Preview & Print Slip
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'preview' && generatedPayload && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-60 border border-slate-800">
                <pre>{JSON.stringify(generatedPayload, null, 2)}</pre>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  ← Edit Details
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadJsonFile(generatedPayload, `EWAYBILL_${invoice?.invoice_number}.json`)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('print')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Print Official Slip
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'print' && generatedPayload && (
            <div className="space-y-4">
              {/* High Contrast Printable Slip */}
              <div className="p-6 bg-white text-black font-sans rounded-xl border border-slate-300 shadow-sm text-xs print:p-0 print:border-none">
                <div className="border-2 border-black p-4 space-y-4">
                  <div className="text-center border-b-2 border-black pb-2">
                    <h2 className="text-base font-black uppercase tracking-wider">E-WAY BILL / DELIVERY TRANSIT MEMO</h2>
                    <p className="text-[10px] text-gray-700 font-semibold">Under Rule 138 of Central Goods and Services Tax Rules, 2017</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-2 border-b border-black text-[11px]">
                    <div>
                      <p><b>E-Way Bill System:</b> NIC Form GST EWB-01</p>
                      <p><b>Doc Number:</b> {invoice?.invoice_number}</p>
                      <p><b>Doc Date:</b> {new Date(invoice?.created_at || Date.now()).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p><b>Valid From:</b> {new Date().toLocaleDateString('en-IN')}</p>
                      <p><b>Approx Distance:</b> {transDistance} KM</p>
                      <p><b>Vehicle No:</b> <span className="font-mono font-black text-sm">{vehicleNo}</span></p>
                    </div>
                  </div>

                  {/* Part A */}
                  <div>
                    <h4 className="font-black text-xs uppercase bg-gray-200 px-2 py-1 mb-2 border border-black">PART - A (Consignment Details)</h4>
                    <div className="grid grid-cols-2 gap-4 text-[11px]">
                      <div className="border p-2">
                        <p className="font-bold text-gray-800">SUPPLIER (FROM):</p>
                        <p className="font-bold">{generatedPayload.billLists[0].fromTrdName}</p>
                        <p>GSTIN: <span className="font-mono font-bold">{generatedPayload.billLists[0].fromGstin}</span></p>
                        <p>{generatedPayload.billLists[0].fromAddr1}, {generatedPayload.billLists[0].fromPlace} - {generatedPayload.billLists[0].fromPincode}</p>
                      </div>
                      <div className="border p-2">
                        <p className="font-bold text-gray-800">RECIPIENT (TO):</p>
                        <p className="font-bold">{generatedPayload.billLists[0].toTrdName}</p>
                        <p>GSTIN: <span className="font-mono font-bold">{generatedPayload.billLists[0].toGstin}</span></p>
                        <p>{generatedPayload.billLists[0].toAddr1}, {generatedPayload.billLists[0].toPlace} - {generatedPayload.billLists[0].toPincode}</p>
                      </div>
                    </div>

                    <div className="mt-2 border border-black">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-gray-100 border-b border-black">
                          <tr>
                            <th className="p-1">#</th>
                            <th className="p-1">Item Description</th>
                            <th className="p-1">HSN</th>
                            <th className="p-1 text-right">Qty</th>
                            <th className="p-1 text-right">Taxable Val</th>
                            <th className="p-1 text-right">GST Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generatedPayload.billLists[0].itemList.map((it, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="p-1">{idx + 1}</td>
                              <td className="p-1 font-semibold">{it.productName}</td>
                              <td className="p-1 font-mono">{it.hsnCode}</td>
                              <td className="p-1 text-right">{it.quantity} {it.qtyUnit}</td>
                              <td className="p-1 text-right">₹{it.taxableAmount.toFixed(2)}</td>
                              <td className="p-1 text-right">{it.cgstRate + it.sgstRate + it.igstRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="font-bold bg-gray-100 border-t border-black">
                          <tr>
                            <td colSpan="4" className="p-1 text-right">TOTAL INVOICE VALUE:</td>
                            <td colSpan="2" className="p-1 text-right font-black">₹{generatedPayload.billLists[0].totInvValue.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Part B */}
                  <div>
                    <h4 className="font-black text-xs uppercase bg-gray-200 px-2 py-1 mb-2 border border-black">PART - B (Vehicle & Transporter Details)</h4>
                    <div className="grid grid-cols-3 gap-2 border p-2 text-[11px]">
                      <div>
                        <span className="text-gray-600 block text-[10px]">Mode:</span>
                        <b>Road (Truck/Tempo)</b>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-[10px]">Vehicle No:</span>
                        <b className="font-mono text-sm">{vehicleNo}</b>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-[10px]">Transporter:</span>
                        <b>{transporterName || 'Self / Direct Vehicle'}</b>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-4 text-[10px] text-gray-600">
                    <div>
                      <p>Generated by KwikStore Pro POS System</p>
                      <p>Date of Transit: {new Date().toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-32 border-b border-black mb-1"></div>
                      <p className="font-bold">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  ← Back to Form
                </button>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  Print Transit Slip Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
