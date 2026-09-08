import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { numberToIndianWords } from '../../utils/numberToWords';
import { Printer, X, Download, Share2, Building2, CheckCircle2, Award, Calendar, FileText, UserCheck, Shield } from 'lucide-react';

export function OnboardingLetterPrint({ employee, shop, onClose }) {
  const { isDark } = useTheme();
  if (!employee) return null;

  const basicPay = Number(employee.monthly_basic_salary || 0);
  const hra = Number(employee.hra || 0);
  const allowance = Number(employee.special_allowance || 0);
  const monthlyGross = basicPay + hra + allowance;
  const annualCtc = monthlyGross * 12;
  const isPf = Boolean(employee.is_pf_eligible);
  const joiningDate = employee.date_of_joining || new Date().toISOString().slice(0, 10);
  const refNo = `KWIK/HR/${employee.employee_code || 'EMP'}/${new Date().getFullYear()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*OFFICIAL APPOINTMENT & WELCOME LETTER*\n` +
      `*Employer:* ${shop?.name || employee.shop_name || 'KwikStore Pro'}\n` +
      `*Dear ${employee.full_name},*\n\n` +
      `Welcome to our store team! We are pleased to formally confirm your appointment as *${employee.designation}* in the *${employee.department || 'Store Operations'}* department.\n\n` +
      `*Employee ID:* ${employee.employee_code}\n` +
      `*Joining Date:* ${joiningDate}\n` +
      `*Monthly Gross Compensation:* ₹${monthlyGross.toLocaleString('en-IN')}/month\n` +
      (isPf ? `*Provident Fund (PF):* Enrolled (12% EPF under UAN: ${employee.uan_no || 'Pending'})\n` : '') +
      `*Store Location:* ${shop?.address || 'Main Branch'}\n\n` +
      `We wish you a rewarding and successful career with us!\n` +
      `*Authorized Signatory* - ${shop?.name || 'KwikStore Pro'}`;

    const phone = (employee.phone || '').replace(/[^0-9]/g, '');
    const url = phone.length >= 10 
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}` 
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadHtml = () => {
    const element = document.getElementById('printable-onboarding-letter');
    if (!element) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Letter - ${employee.employee_code} - ${employee.full_name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
      .print\\:hidden { display: none !important; }
    }
  </style>
</head>
<body class="bg-white p-8 font-sans text-slate-900 flex justify-center">
  <div style="width: 780px;">
    ${element.innerHTML}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Appointment_Letter_${employee.employee_code}_${employee.full_name.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col my-auto print:border-none print:shadow-none print:rounded-none ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className={`px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b print:hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center space-x-2">
                <span className={isDark ? 'text-white' : 'text-slate-900'}>Official Appointment & Onboarding Letter</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-400/30">
                  {employee.employee_code}
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Formal employment confirmation letter with compensation breakdown & terms of employment.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center space-x-1.5 transition-all"
              title="Share Appointment Letter on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-all ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Download HTML Letter"
            >
              <Download className="w-4 h-4 text-sky-500" />
              <span>Download</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center space-x-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Letter</span>
            </button>

            <button 
              onClick={onClose} 
              className={`p-2 rounded-xl transition-all ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div id="printable-onboarding-letter" className="p-10 font-sans text-slate-900 bg-white max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-8">
          
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black uppercase tracking-tight text-slate-950">
                  {shop?.legal_name || shop?.name || employee.shop_name || 'KwikStore Pro Enterprises'}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium leading-relaxed max-w-md">
                <p>{shop?.address || employee.shop_address || 'Main Market Road, Commercial Complex'}</p>
                <p>{shop?.city || 'Delhi'}, {shop?.state || 'Delhi'} - {shop?.pincode || '110001'}</p>
                <p>Phone: {shop?.phone || employee.shop_phone || '+91 98765 43210'} • Email: {shop?.email || employee.shop_email || 'admin@kwikstore.in'}</p>
                {shop?.gstin && <p className="font-mono font-bold text-slate-800">GSTIN: {shop.gstin}</p>}
              </div>
            </div>

            {/* Reference & Date Box */}
            <div className="text-right text-xs space-y-1">
              <span className="inline-block px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg font-bold uppercase tracking-wider text-[10px]">
                OFFICIAL APPOINTMENT LETTER
              </span>
              <div className="font-mono text-slate-500 pt-2">
                <div><strong>Ref No:</strong> {refNo}</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          {/* Letter Body */}
          <div className="space-y-4 text-xs leading-relaxed text-slate-800">
            
            {/* Recipient Details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <div className="font-bold text-sm text-slate-950">{employee.full_name}</div>
              <div className="text-slate-600">Employee ID: <span className="font-mono font-bold text-purple-700">{employee.employee_code}</span></div>
              {employee.phone && <div className="text-slate-600">Phone: {employee.phone}</div>}
              {employee.address && <div className="text-slate-600">Address: {employee.address}</div>}
            </div>

            <p className="font-semibold text-slate-900 pt-1">
              Dear {employee.full_name},
            </p>

            <p>
              On behalf of <strong>{shop?.name || employee.shop_name || 'our company'}</strong>, we are pleased to confirm your appointment for the position of <strong className="text-purple-900">{employee.designation}</strong> in the <strong>{employee.department || 'Sales & Store Operations'}</strong> department, commencing on <strong>{joiningDate}</strong>.
            </p>

            <p>
              We were impressed with your qualifications and background, and we believe your skills and dedication will contribute significantly to the growth of our retail store operations and customer satisfaction.
            </p>

            {/* Compensation & Salary Breakdown */}
            <div className="pt-2">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-900 mb-2 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Salary & Compensation Structure</span>
              </h4>

              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Component</th>
                      <th className="py-2.5 px-4">Frequency</th>
                      <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-4 font-medium">Monthly Basic Pay</td>
                      <td className="py-2 px-4 text-slate-500">Monthly</td>
                      <td className="py-2 px-4 text-right font-mono font-semibold">₹{basicPay.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-medium">House Rent Allowance (HRA)</td>
                      <td className="py-2 px-4 text-slate-500">Monthly</td>
                      <td className="py-2 px-4 text-right font-mono font-semibold">₹{hra.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-medium">Special / Store Allowance</td>
                      <td className="py-2 px-4 text-slate-500">Monthly</td>
                      <td className="py-2 px-4 text-right font-mono font-semibold">₹{allowance.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-purple-50/60 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td className="py-2.5 px-4 text-purple-900">Total Monthly Gross Salary</td>
                      <td className="py-2.5 px-4 text-purple-700">Monthly</td>
                      <td className="py-2.5 px-4 text-right font-mono text-purple-900 text-sm">₹{monthlyGross.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-2 px-4">Annual Cost to Company (CTC)</td>
                      <td className="py-2 px-4 text-slate-500">Per Annum</td>
                      <td className="py-2 px-4 text-right font-mono text-emerald-700">₹{annualCtc.toLocaleString('en-IN')} / year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Optional PF Information */}
              <div className="mt-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Provident Fund (PF / EPF): </span>
                  {isPf ? (
                    <span className="text-emerald-700 font-semibold">Enrolled under Employee Provident Fund (12% Basic Pay). UAN: {employee.uan_no || 'To be generated'}.</span>
                  ) : (
                    <span className="text-slate-600">Standard Direct Store Disbursement (Non-PF).</span>
                  )}
                </div>
                {Number(employee.overtime_rate_per_hour) > 0 && (
                  <div className="font-mono text-slate-600">
                    OT Rate: <strong>₹{employee.overtime_rate_per_hour}/hr</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="pt-2 space-y-1.5">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-900 mb-1 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Key Terms & Store Code of Conduct</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 text-[11px]">
                <li><strong>Working Hours & Attendance:</strong> Daily check-in via the POS/HRMS portal is mandatory. Store working shifts and timings must be strictly adhered to.</li>
                <li><strong>Cash & Inventory Handling:</strong> You are responsible for accurate cash counter billing, receipt generation, and safe handling of store inventory.</li>
                <li><strong>Leave Policy:</strong> All leaves must be applied and approved in advance through the HRMS portal. Unapproved absences may lead to loss of pay (LOP).</li>
                <li><strong>Confidentiality:</strong> You agree to keep all customer data, store pricing, supplier bills, and sales figures confidential at all times.</li>
                <li><strong>Notice Period:</strong> Either party may terminate employment by providing a 15-day written notice or equivalent basic salary in lieu of notice.</li>
              </ol>
            </div>

            <p className="pt-2 text-slate-700 text-[11px]">
              Please sign and return the duplicate copy of this letter as a token of your acceptance of the terms and conditions mentioned above. We look forward to a fruitful and mutually rewarding association.
            </p>

            {/* Signatures & Seal Box */}
            <div className="pt-8 grid grid-cols-2 gap-8 items-end border-t border-slate-200">
              {/* Employer Signatory */}
              <div>
                <div className="border border-dashed border-slate-300 rounded-xl h-24 flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">
                  [ Employer Authorized Seal & Stamp ]
                </div>
                <div className="text-xs font-bold text-slate-950">For {shop?.name || employee.shop_name || 'KwikStore Pro'}</div>
                <div className="text-[11px] text-slate-600">Authorized Signatory / Store Owner</div>
              </div>

              {/* Employee Acceptance Sign */}
              <div>
                <div className="border border-dashed border-slate-300 rounded-xl h-24 flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">
                  [ Employee Acceptance Signature ]
                </div>
                <div className="text-xs font-bold text-slate-950">{employee.full_name}</div>
                <div className="text-[11px] text-slate-600">Date of Acceptance: __________________</div>
              </div>
            </div>

          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Generated via KwikStore Pro Universal Retail & HRMS Management System • Confidential Employment Document
          </div>

        </div>
      </div>
    </div>
  );
}
