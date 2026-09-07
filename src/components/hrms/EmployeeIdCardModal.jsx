import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { CreditCard, Printer, X, Shield, Phone, MapPin, QrCode } from 'lucide-react';

export function EmployeeIdCardModal({ isOpen, onClose, employee }) {
  const { isDark } = useTheme();
  const { activeShop } = useShop();

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-brand-500" />
            <h3 className="text-sm font-bold">Employee Photo ID Card Badge</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable ID Card Container */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950/40">
          <div 
            id="employee-id-badge"
            className="w-72 h-[420px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-brand-500/40 rounded-3xl shadow-2xl p-4 flex flex-col justify-between items-center text-white relative overflow-hidden"
            style={{ breakInside: 'avoid' }}
          >
            {/* Top Lanyard Punch Slot Simulation */}
            <div className="w-12 h-2.5 bg-slate-950 border border-slate-700 rounded-full mx-auto -mt-1 mb-2 opacity-60" />

            {/* Shop Brand Header */}
            <div className="text-center w-full border-b border-brand-500/20 pb-2">
              <div className="text-xs font-black tracking-wider text-brand-400 uppercase">{activeShop?.name || 'KwikStore Pro'}</div>
              <div className="text-[9px] text-slate-400 tracking-widest uppercase">Official Staff Identity Card</div>
            </div>

            {/* Employee Photo / Avatar */}
            <div className="relative mt-2">
              <div className="w-24 h-24 rounded-2xl border-2 border-brand-500 bg-slate-800 overflow-hidden shadow-lg shadow-brand-500/10 flex items-center justify-center">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-brand-400">{employee.full_name?.[0] || 'E'}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-slate-900">
                ✓
              </div>
            </div>

            {/* Name & Designation */}
            <div className="text-center w-full px-2 mt-1">
              <h3 className="text-sm font-black text-white tracking-wide">{employee.full_name}</h3>
              <div className="text-xs font-bold text-brand-400 mt-0.5">{employee.designation}</div>
              <div className="text-[10px] text-slate-400">{employee.department || 'Retail Operations'}</div>
            </div>

            {/* Staff Details Matrix */}
            <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">EMP ID:</span>
                <span className="font-bold text-white">{employee.employee_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">JOINED:</span>
                <span className="text-slate-300">{employee.date_of_joining || '2026'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BLOOD GRP:</span>
                <span className="text-rose-400 font-bold">{employee.blood_group || 'O+'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">EMERGENCY:</span>
                <span className="text-amber-400 font-bold">{employee.emergency_phone || employee.phone}</span>
              </div>
            </div>

            {/* Bottom Barcode / Security Strip */}
            <div className="w-full text-center border-t border-slate-800 pt-1.5 mt-1">
              <div className="h-5 w-36 mx-auto bg-white flex items-center justify-center text-slate-950 font-mono text-[8px] font-black tracking-widest">
                ||| | ||||| || |||
              </div>
              <div className="text-[8px] text-slate-400 font-mono tracking-wider mt-0.5">{employee.employee_code} • AUTHORIZED PERSON</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className={`p-4 border-t flex justify-end space-x-2 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print ID Card Badge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
