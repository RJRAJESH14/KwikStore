import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { numberToIndianWords } from '../../utils/numberToWords';
import { Printer, X, FileSpreadsheet, Share2, Download, Building2, User, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';

export function SalarySlipPrint({ payrollRecord, shop, onClose }) {
  const { isDark } = useTheme();
  if (!payrollRecord) return null;

  const handlePrint = () => {
    window.print();
  };

  const netPayable = Number(payrollRecord.net_payable || 0);
  const earnedBasic = Number(payrollRecord.earned_basic || payrollRecord.basic_pay || 0);
  const hra = Number(payrollRecord.hra || 0);
  const allowances = Number(payrollRecord.allowances || 0);
  const overtimePay = Number(payrollRecord.overtime_pay || 0);
  const grossSalary = Number(payrollRecord.gross_salary || (earnedBasic + hra + allowances + overtimePay));
  const advanceDeduction = Number(payrollRecord.advance_deduction || 0);
  const pfDeduction = Number(payrollRecord.pf_deduction || 0);
  const employerPf = Number(payrollRecord.employer_pf || 0);
  const otherDeductions = Number(payrollRecord.other_deductions || 0);
  const totalDeductions = advanceDeduction + pfDeduction + otherDeductions;

  const handleShareWhatsApp = () => {
    const text = `*SALARY PAYSLIP - ${payrollRecord.month_year}*\n` +
      `*Employer:* ${shop?.name || payrollRecord.shop_name || 'KwikStore Pro'}\n` +
      `*Employee:* ${payrollRecord.full_name} (${payrollRecord.employee_code})\n` +
      `*Designation:* ${payrollRecord.designation}\n` +
      `*Working Days:* ${payrollRecord.present_days} / ${payrollRecord.total_days_in_month} days\n` +
      `*Gross Earnings:* ₹${grossSalary.toLocaleString('en-IN')}\n` +
      (pfDeduction > 0 ? `*PF Deduction:* -₹${pfDeduction.toLocaleString('en-IN')}\n` : '') +
      (advanceDeduction > 0 ? `*Advance Recovery:* -₹${advanceDeduction.toLocaleString('en-IN')}\n` : '') +
      `*NET SALARY PAID:* ₹${netPayable.toLocaleString('en-IN')}\n` +
      `*Payment Mode:* ${payrollRecord.payment_mode || 'BANK_TRANSFER'}\n` +
      `*Payment Date:* ${payrollRecord.payment_date || new Date().toLocaleDateString('en-GB')}\n\n` +
      `Thank you for your dedicated service!`;

    const phone = (payrollRecord.phone || '').replace(/[^0-9]/g, '');
    const url = phone.length >= 10 
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}` 
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const filename = `SalarySlip_${payrollRecord.employee_code}_${payrollRecord.month_year}.pdf`;
      await exportElementToPdf('printable-salary-slip', filename, { scale: 2, margin: 6 });
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Could not export PDF directly. Please use the Print option and choose Save as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[94vh] my-auto animate-in zoom-in-95 overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Controls Bar */}
        <div className={`p-3.5 border-b flex items-center justify-between shrink-0 print:hidden ${
          isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Employee Salary Slip
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                  {payrollRecord.employee_code}
                </span>
                {pfDeduction > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                    PF Enrolled
                  </span>
                )}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Month: {payrollRecord.month_year} • {payrollRecord.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWhatsApp}
              className="p-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-1 transition-all"
              title="Send Salary Slip via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              } ${isGeneratingPdf ? 'opacity-70 cursor-wait' : ''}`}
              title="Download official PDF salary payslip"
            >
              {isGeneratingPdf ? (
                <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-purple-500" />
              )}
              <span>{isGeneratingPdf ? 'Saving PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center space-x-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>

            <button 
              onClick={onClose} 
              className={`p-1.5 rounded-lg transition-all ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslip Viewport */}
        <div className={`p-6 overflow-y-auto flex justify-center ${
          isDark ? 'bg-slate-950' : 'bg-slate-200/60'
        }`}>
          <div 
            id="printable-salary-slip" 
            className="w-[720px] bg-white text-slate-900 p-8 rounded-xl shadow-2xl text-xs font-sans border border-slate-300 space-y-4 print:p-0 print:border-none print:shadow-none"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
              <div className="space-y-0.5 max-w-[65%]">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                  OFFICIAL SALARY PAYSLIP
                </span>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight mt-1">{shop?.name || payrollRecord.shop_name || 'KwikStore Pro Store'}</h1>
                {shop?.legal_name && <p className="text-[11px] text-slate-600 font-medium">{shop.legal_name}</p>}
                <p className="text-[11px] text-slate-600">{shop?.address || 'Store Location'}, {shop?.city} - {shop?.pincode}</p>
                <div className="flex flex-wrap gap-2 pt-0.5 text-[10px] text-slate-700">
                  {shop?.phone && <span>Ph: <strong>{shop.phone}</strong></span>}
                  {shop?.gstin && <span className="font-bold">GSTIN: {shop.gstin}</span>}
                </div>
              </div>

              <div className="text-right flex flex-col items-end space-y-1">
                <div className="bg-slate-900 text-white px-3 py-1 rounded-xl text-right shadow-sm">
                  <div className="text-[8px] uppercase tracking-widest text-slate-300 font-bold">Salary Month</div>
                  <div className="text-sm font-black font-mono tracking-wider">{payrollRecord.month_year}</div>
                </div>
                <div className="text-[11px] text-slate-600 pt-0.5">
                  Payment Date: <strong className="font-mono text-slate-900">{payrollRecord.payment_date || new Date().toLocaleDateString('en-GB')}</strong>
                </div>
                <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Status: {payrollRecord.payment_status || 'PAID'} ({payrollRecord.payment_mode || 'BANK_TRANSFER'})
                </div>
              </div>
            </div>

            {/* Employee Information Card */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div>Employee Name: <strong className="text-slate-900 text-sm">{payrollRecord.full_name}</strong></div>
                <div>Employee Code: <strong className="font-mono text-purple-900">{payrollRecord.employee_code}</strong></div>
                <div>Designation: <strong className="text-slate-800">{payrollRecord.designation}</strong></div>
                <div>Department: <span className="text-slate-600">{payrollRecord.department || 'Sales & Billing'}</span></div>
                {payrollRecord.pan_no && <div>PAN Number: <strong className="font-mono">{payrollRecord.pan_no}</strong></div>}
                {(payrollRecord.uan_no || payrollRecord.pf_deduction > 0) && (
                  <div className="text-cyan-900 font-bold bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 inline-block mt-0.5">
                    EPF UAN: <span className="font-mono">{payrollRecord.uan_no || 'UAN-REG'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-right sm:text-left sm:pl-4 border-l border-slate-200">
                <div className="font-bold text-slate-700 border-b border-slate-200 pb-0.5 mb-1">Attendance & Banking Details</div>
                <div>Month Total Days: <strong className="font-mono">{payrollRecord.total_days_in_month || 30} Days</strong></div>
                <div>Days Worked (Present): <strong className="font-mono text-emerald-700">{payrollRecord.present_days || 0} Days</strong></div>
                <div>Paid Leaves: <strong className="font-mono">{payrollRecord.paid_leaves || 0} Days</strong></div>
                {Number(payrollRecord.unpaid_leaves) > 0 && (
                  <div>Loss of Pay (LOP): <strong className="font-mono text-rose-600">{payrollRecord.unpaid_leaves} Days</strong></div>
                )}
                {Number(payrollRecord.overtime_hours) > 0 && (
                  <div>Overtime Hours: <strong className="font-mono text-purple-700">{payrollRecord.overtime_hours} hrs</strong></div>
                )}
                <div className="pt-1 text-[11px] text-slate-600">
                  Bank A/C: <strong className="font-mono text-slate-900">{payrollRecord.bank_account || 'N/A'}</strong> (IFSC: {payrollRecord.bank_ifsc || 'N/A'})
                </div>
              </div>
            </div>

            {/* Salary Breakdown: Earnings vs Deductions */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                
                {/* Earnings Column */}
                <div>
                  <div className="bg-slate-900 text-white py-2 px-3 font-bold text-xs flex justify-between">
                    <span>EARNINGS & ALLOWANCES</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                    <div className="flex justify-between pt-1">
                      <div>
                        <span className="font-semibold text-slate-800">Basic Pay (Earned)</span>
                        <span className="text-[10px] text-slate-500 block">Monthly Basic: ₹{payrollRecord.monthly_basic?.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">₹{earnedBasic.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-700">House Rent Allowance (HRA)</span>
                      <span className="font-mono font-semibold text-slate-900">₹{hra.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-700">Special Allowances / Bonus</span>
                      <span className="font-mono font-semibold text-slate-900">₹{allowances.toFixed(2)}</span>
                    </div>

                    {overtimePay > 0 && (
                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-700">Overtime Earnings ({payrollRecord.overtime_hours} hrs)</span>
                        <span className="font-mono font-semibold text-purple-800">₹{overtimePay.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-3 border-t-2 border-slate-300 font-black text-sm text-slate-900">
                      <span>Total Gross Earnings (A):</span>
                      <span className="font-mono text-emerald-800">₹{grossSalary.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div>
                  <div className="bg-slate-900 text-white py-2 px-3 font-bold text-xs flex justify-between">
                    <span>DEDUCTIONS & RECOVERIES</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                    {pfDeduction > 0 && (
                      <div className="flex justify-between pt-1">
                        <div>
                          <span className="font-semibold text-cyan-900">Provident Fund (EPF 12%)</span>
                          <span className="text-[10px] text-slate-500 block">Employee PF Statutory Contribution</span>
                        </div>
                        <span className="font-mono font-bold text-cyan-800">₹{pfDeduction.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-1.5">
                      <div>
                        <span className="font-semibold text-slate-800">Staff Salary Advance Recovery</span>
                        <span className="text-[10px] text-slate-500 block">Deducted from monthly advance balance</span>
                      </div>
                      <span className="font-mono font-bold text-rose-700">₹{advanceDeduction.toFixed(2)}</span>
                    </div>

                    {otherDeductions > 0 && (
                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-700">Other Deductions / Tax / LOP</span>
                        <span className="font-mono font-semibold text-rose-700">₹{otherDeductions.toFixed(2)}</span>
                      </div>
                    )}

                    {pfDeduction === 0 && otherDeductions === 0 && (
                      <div className="py-2 text-[10px] text-slate-400 italic">No statutory PF / tax deductions applied</div>
                    )}

                    <div className="flex justify-between pt-3 border-t-2 border-slate-300 font-black text-sm text-slate-900">
                      <span>Total Deductions (B):</span>
                      <span className="font-mono text-rose-700">₹{totalDeductions.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Net Salary Payable Summary Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 flex justify-between items-center shadow-sm">
              <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Net Take-Home Salary (A - B):</div>
                <div className="text-xl font-black text-emerald-800 font-mono">
                  ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-bold text-slate-700 italic">
                  {numberToIndianWords(netPayable)}
                </div>
              </div>

              <div className="text-right text-xs space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Disbursement Mode</div>
                <div className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 inline-block font-mono">
                  {payrollRecord.payment_mode || 'BANK_TRANSFER'}
                </div>
                <div className="text-[10px] text-slate-500">Settled on {payrollRecord.payment_date || new Date().toLocaleDateString('en-GB')}</div>
              </div>
            </div>

            {/* Signatures & Seal */}
            <div className="flex justify-between items-end pt-8 border-t border-slate-200 text-xs">
              <div className="text-center w-48">
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                  Employee Signature
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">Acknowledged Receipt</p>
              </div>

              <div className="text-center w-56">
                <div className="text-xs font-bold text-slate-800 mb-1">For {shop?.name || payrollRecord.shop_name || 'KwikStore Pro'}</div>
                <div className="h-8 flex items-center justify-center">
                  <span className="text-[9px] text-slate-400 italic">[Authorized Digital Seal]</span>
                </div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                  Authorized Employer Signatory
                </div>
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-400 pt-2">
              Generated securely via KwikStore Pro • Confidential Employee Document
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
