import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { CreditCard, Printer, X, Shield, Phone, MapPin, QrCode, CheckCircle2, Building2 } from 'lucide-react';

export function EmployeeIdCardModal({ isOpen, onClose, employee }) {
  const { isDark } = useTheme();
  const { activeShop } = useShop();

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    const element = document.getElementById('employee-id-badge');
    if (!element) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ID Card - ${employee.employee_code} - ${employee.full_name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { size: portrait; margin: 15mm; }
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #ffffff !important; 
        color: #000000 !important; 
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
    }
  </style>
</head>
<body class="bg-white flex items-center justify-center p-8">
  <div style="width: 320px; min-height: 480px; box-shadow: none; border: 2px solid #cbd5e1; border-radius: 24px; padding: 16px; background: #ffffff; color: #0f172a;">
    ${element.innerHTML}
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print iframe error', err);
        window.print();
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {}
        }, 2000);
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all my-4 ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Top Header Bar */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Employee Photo ID Card</h3>
              <p className="text-[11px] text-slate-400">{employee.full_name} ({employee.employee_code})</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-xl transition-all ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable ID Card Container (Preview Viewport) */}
        <div className={`p-6 flex flex-col items-center justify-center ${
          isDark ? 'bg-slate-950/60' : 'bg-slate-100'
        }`}>
          
          {/* WHITE CORPORATE ID BADGE */}
          <div 
            id="employee-id-badge"
            className="w-80 min-h-[460px] bg-white border-2 border-slate-300 rounded-3xl shadow-xl p-5 flex flex-col justify-between items-center text-slate-900 relative overflow-hidden"
            style={{ breakInside: 'avoid' }}
          >
            
            {/* Top Lanyard Punch Slot */}
            <div className="w-14 h-2 bg-slate-200 border border-slate-300 rounded-full mx-auto -mt-1 mb-2.5" />

            {/* Shop Brand Banner */}
            <div className="text-center w-full border-b-2 border-purple-600 pb-2.5">
              <div className="flex items-center justify-center space-x-1.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                  {activeShop?.name || 'KWIKSTORE PRO RETAIL'}
                </h2>
              </div>
              <div className="text-[9px] font-bold text-purple-700 tracking-wider uppercase mt-0.5">
                Official Staff Identity Card
              </div>
            </div>

            {/* Employee Photo / Avatar */}
            <div className="relative my-3">
              <div className="w-24 h-24 rounded-2xl border-2 border-purple-600 bg-slate-50 overflow-hidden shadow-md flex items-center justify-center">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-purple-600">
                    {employee.full_name?.[0]?.toUpperCase() || 'E'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm">
                ✓
              </div>
            </div>

            {/* Name, Designation & Department */}
            <div className="text-center w-full px-2 mb-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                {employee.full_name}
              </h3>
              <div className="text-xs font-bold text-purple-700 mt-0.5">
                {employee.designation || 'Store Staff'}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                {employee.department || 'Retail Operations'}
              </div>
            </div>

            {/* Staff Details Matrix */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] font-mono space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-medium text-[10px]">EMPLOYEE ID:</span>
                <span className="font-bold text-purple-800 font-mono text-xs">{employee.employee_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-medium text-[10px]">JOINING DATE:</span>
                <span className="font-semibold text-slate-800">{employee.date_of_joining || '2026-09-04'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-medium text-[10px]">BLOOD GROUP:</span>
                <span className="text-rose-600 font-bold">{employee.blood_group || 'O+'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-medium text-[10px]">EMERGENCY CONTACT:</span>
                <span className="text-slate-900 font-bold">{employee.emergency_phone || employee.phone}</span>
              </div>
            </div>

            {/* Bottom Barcode & Security Authorization */}
            <div className="w-full text-center border-t border-slate-200 pt-2.5 mt-2.5">
              <div className="h-6 w-44 mx-auto bg-slate-900 rounded flex items-center justify-center text-white font-mono text-[9px] font-black tracking-widest shadow-sm">
                ||| | ||||| || ||| ||||
              </div>
              <div className="text-[9px] text-slate-500 font-mono tracking-wider mt-1 font-semibold uppercase">
                {employee.employee_code} • AUTHORIZED HOLDER
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions */}
        <div className={`p-4 border-t flex justify-end space-x-2.5 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center space-x-1.5 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print ID Card Badge</span>
          </button>
        </div>

      </div>
    </div>
  );
}
