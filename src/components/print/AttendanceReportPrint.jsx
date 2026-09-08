import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Printer, X, Download, Share2, Building2, User, Calendar, Clock, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function AttendanceReportPrint({
  shop,
  analyticsData,
  viewType = 'month',
  selectedEmployeeId = 'ALL',
  currentMonth = 9,
  currentYear = 2026,
  currentWeekDate,
  onClose
}) {
  const { isDark } = useTheme();

  if (!analyticsData) return null;

  const isAll = selectedEmployeeId === 'ALL';
  const singleEmp = analyticsData.singleEmployee;
  const periodTitle = viewType === 'month' 
    ? `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`
    : viewType === 'year'
    ? `Annual ${currentYear}`
    : `Week (${analyticsData.startDate} to ${analyticsData.endDate})`;

  const handlePrint = () => {
    const element = document.getElementById('printable-attendance-report');
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
  <title>Attendance Report - ${periodTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #ffffff !important; 
        color: #000000 !important; 
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #cbd5e1; }
    }
  </style>
</head>
<body class="bg-white p-6 font-sans text-slate-900">
  ${element.innerHTML}
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print iframe error, fallback to window.print', err);
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

  const handleShareWhatsApp = () => {
    let text = `*📋 ATTENDANCE REPORT - ${periodTitle}*\n`;
    text += `*Shop:* ${shop?.name || 'KwikStore Pro'}\n\n`;

    if (!isAll && singleEmp) {
      const { employee, summary } = singleEmp;
      text += `*Employee:* ${employee.full_name} (${employee.employee_code})\n`;
      text += `*Designation:* ${employee.designation || 'Staff'}\n`;
      text += `*Present Days:* ${summary.presentCount} days\n`;
      text += `*Half Days:* ${summary.halfDayCount}\n`;
      text += `*Leaves/Off:* ${summary.leaveCount}\n`;
      text += `*Absent Days:* ${summary.absentCount}\n`;
      text += `*Total Hours:* ${summary.totalHours} hrs\n`;
      text += `*Attendance Score:* ${summary.attendancePercent}%\n\n`;
    } else if (isAll && analyticsData.employees) {
      text += `*Total Employees Tracked:* ${analyticsData.employees.length}\n`;
      text += `*Average Staff Attendance:* ${analyticsData.overallStats?.avgAttendancePercent || 0}%\n`;
      text += `*Total Shop Work Hours:* ${analyticsData.overallStats?.totalShopHours || 0} hrs\n\n`;
    }

    text += `Generated via KwikStore Pro`;

    const phone = !isAll && singleEmp?.employee?.phone ? singleEmp.employee.phone.replace(/[^0-9]/g, '') : '';
    const url = phone.length >= 10 
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}` 
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadHtml = () => {
    const element = document.getElementById('printable-attendance-report');
    if (!element) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Attendance Report - ${periodTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, sans-serif; }
    }
  </style>
</head>
<body class="bg-white p-6 font-sans text-slate-900">
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
    link.download = `Attendance_${viewType}_${selectedEmployeeId}_${periodTitle.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:my-0 print:max-w-none">
        
        {/* Top Action Bar (Hidden on Print) */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b ${
          isDark 
            ? 'bg-slate-800 border-slate-700 text-white' 
            : 'bg-slate-100 border-slate-200 text-slate-900'
        } print:hidden`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/10 text-emerald-600 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Attendance Register & Report Preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {periodTitle} • {isAll ? 'All Staff Register' : singleEmp?.employee?.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={handleDownloadHtml}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-semibold transition-all ${
                isDark 
                  ? 'border-slate-700 hover:bg-slate-700 text-slate-200' 
                  : 'border-slate-300 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Download className="w-4 h-4" />
              HTML
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Canvas */}
        <div id="printable-attendance-report" className="p-8 sm:p-10 bg-white text-slate-900 print:p-0 print:text-black">
          
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {shop?.name || 'KWIKSTORE PRO RETAIL'}
                </h1>
                <p className="text-xs text-slate-600 font-medium max-w-md mt-0.5">
                  {shop?.address || 'Main Market Road'} {shop?.phone ? `• Ph: ${shop.phone}` : ''} {shop?.email ? `• ${shop.email}` : ''}
                </p>
                {shop?.gstin && (
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
                    GSTIN: {shop.gstin}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                  {viewType === 'month' ? 'Monthly Attendance Register' : viewType === 'year' ? 'Annual Attendance Performance' : 'Weekly Timecard Register'}
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  Period: {periodTitle}
                </p>
                <p className="text-[11px] text-slate-500">
                  Printed On: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          </div>

          {/* SINGLE EMPLOYEE VIEW */}
          {!isAll && singleEmp && (
            <div>
              {/* Employee Meta Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs">
                <div>
                  <span className="text-slate-500 uppercase font-semibold block text-[10px]">Employee Name</span>
                  <span className="font-bold text-slate-900 text-sm">{singleEmp.employee.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold block text-[10px]">Employee ID</span>
                  <span className="font-bold text-slate-900">{singleEmp.employee.employee_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold block text-[10px]">Designation</span>
                  <span className="font-bold text-slate-900">{singleEmp.employee.designation || 'Staff'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold block text-[10px]">Phone Number</span>
                  <span className="font-bold text-slate-900">{singleEmp.employee.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Summary KPI Mini Cards */}
              <div className="grid grid-cols-6 gap-2 mb-6 text-center">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Present</div>
                  <div className="text-lg font-black text-emerald-800">{singleEmp.summary.presentCount}</div>
                  <div className="text-[9px] text-emerald-600">Full Days</div>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Half Days</div>
                  <div className="text-lg font-black text-amber-800">{singleEmp.summary.halfDayCount}</div>
                  <div className="text-[9px] text-amber-600">0.5 Wage</div>
                </div>
                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-purple-700">Leaves / Off</div>
                  <div className="text-lg font-black text-purple-800">{singleEmp.summary.leaveCount}</div>
                  <div className="text-[9px] text-purple-600">Approved/Off</div>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-rose-700">Absent</div>
                  <div className="text-lg font-black text-rose-800">{singleEmp.summary.absentCount}</div>
                  <div className="text-[9px] text-rose-600">Unexcused</div>
                </div>
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-sky-700">Total Hours</div>
                  <div className="text-lg font-black text-sky-800">{singleEmp.summary.totalHours}h</div>
                  <div className="text-[9px] text-sky-600">Work Duration</div>
                </div>
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-indigo-700">Attendance %</div>
                  <div className="text-lg font-black text-indigo-800">{singleEmp.summary.attendancePercent}%</div>
                  <div className="text-[9px] text-indigo-600">Score</div>
                </div>
              </div>

              {/* Day-by-Day Logs Table (for Month / Week) */}
              {viewType !== 'year' && (
                <div className="overflow-x-auto border border-slate-300 rounded-lg mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="py-2 px-3 text-center w-12 border-r border-slate-200">#</th>
                        <th className="py-2 px-3 border-r border-slate-200">Date</th>
                        <th className="py-2 px-3 border-r border-slate-200">Day</th>
                        <th className="py-2 px-3 text-center border-r border-slate-200">Status</th>
                        <th className="py-2 px-3 text-center border-r border-slate-200">Check In</th>
                        <th className="py-2 px-3 text-center border-r border-slate-200">Check Out</th>
                        <th className="py-2 px-3 text-center border-r border-slate-200">Hours</th>
                        <th className="py-2 px-3">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {singleEmp.records?.map((r, idx) => {
                        const statusColor = 
                          r.status === 'PRESENT' ? 'text-emerald-700 font-bold bg-emerald-50/50' :
                          r.status === 'HALF_DAY' ? 'text-amber-700 font-bold bg-amber-50/50' :
                          r.status === 'LEAVE' ? 'text-purple-700 font-bold bg-purple-50/50' :
                          r.status === 'ABSENT' ? 'text-rose-700 font-bold bg-rose-50/50' :
                          r.status === 'WEEK_OFF' || r.status === 'HOLIDAY' ? 'text-sky-700 font-semibold bg-sky-50/30' :
                          'text-slate-500';

                        return (
                          <tr key={idx} className={`hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="py-1.5 px-3 text-center text-slate-500 font-mono text-[11px] border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200 font-mono">
                              {r.date}
                            </td>
                            <td className="py-1.5 px-3 text-slate-700 border-r border-slate-200">
                              {r.dayName}
                            </td>
                            <td className={`py-1.5 px-3 text-center text-[11px] border-r border-slate-200 ${statusColor}`}>
                              {r.status?.replace('_', ' ')}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[11px] text-slate-700 border-r border-slate-200">
                              {r.check_in_time || '—'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[11px] text-slate-700 border-r border-slate-200">
                              {r.check_out_time || '—'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-semibold font-mono text-slate-900 border-r border-slate-200">
                              {r.work_hours ? `${r.work_hours}h` : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 text-[11px] truncate max-w-xs">
                              {r.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 12-Month Breakdown Table (for Year View) */}
              {viewType === 'year' && (
                <div className="overflow-x-auto border border-slate-300 rounded-lg mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="py-2.5 px-3 border-r border-slate-200">Month</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-200 text-emerald-800">Present Days</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-200 text-amber-800">Half Days</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-200 text-purple-800">Leaves / Off</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-200 text-rose-800">Absent Days</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-200 text-sky-800">Total Hours</th>
                        <th className="py-2.5 px-3 text-center text-indigo-800">Attendance Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {singleEmp.monthlyBreakdown?.map((m, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                            {m.monthName}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700 border-r border-slate-200">
                            {m.presentCount}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-amber-700 border-r border-slate-200">
                            {m.halfDayCount}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-purple-700 border-r border-slate-200">
                            {m.leaveCount}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-rose-700 border-r border-slate-200">
                            {m.absentCount}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-sky-700 border-r border-slate-200">
                            {m.totalHours}h
                          </td>
                          <td className="py-2 px-3 text-center font-black text-indigo-900">
                            {m.attendancePercent}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                        <td className="py-2.5 px-3 uppercase text-slate-900 border-r border-slate-300">ANNUAL TOTAL</td>
                        <td className="py-2.5 px-3 text-center text-emerald-800 border-r border-slate-300">{singleEmp.summary.presentCount}</td>
                        <td className="py-2.5 px-3 text-center text-amber-800 border-r border-slate-300">{singleEmp.summary.halfDayCount}</td>
                        <td className="py-2.5 px-3 text-center text-purple-800 border-r border-slate-300">{singleEmp.summary.leaveCount}</td>
                        <td className="py-2.5 px-3 text-center text-rose-800 border-r border-slate-300">{singleEmp.summary.absentCount}</td>
                        <td className="py-2.5 px-3 text-center text-sky-800 border-r border-slate-300">{singleEmp.summary.totalHours}h</td>
                        <td className="py-2.5 px-3 text-center text-indigo-900 font-black">{singleEmp.summary.attendancePercent}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ALL EMPLOYEES ROSTER MASTER VIEW */}
          {isAll && analyticsData.employees && (
            <div>
              <div className="overflow-x-auto border border-slate-300 rounded-lg mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">#</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Emp Code</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Employee Name</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Designation</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-200">Present</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-200">Half</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-200">Leave</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-200">Absent</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-200">Work Hours</th>
                      <th className="py-2.5 px-3 text-center">Score %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analyticsData.employees.map((e, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                        <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px] border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                          {e.employee.employee_code}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                          {e.employee.full_name}
                        </td>
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                          {e.employee.designation || 'Staff'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700 border-r border-slate-200">
                          {e.summary.presentCount}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-amber-700 border-r border-slate-200">
                          {e.summary.halfDayCount}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-purple-700 border-r border-slate-200">
                          {e.summary.leaveCount}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-rose-700 border-r border-slate-200">
                          {e.summary.absentCount}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-sky-700 border-r border-slate-200">
                          {e.summary.totalHours}h
                        </td>
                        <td className="py-2 px-3 text-center font-black text-indigo-900">
                          {e.summary.attendancePercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signature & Sign-Off Blocks */}
          <div className="grid grid-cols-2 gap-10 mt-12 pt-8 border-t border-dashed border-slate-300 text-xs">
            <div className="text-center">
              <div className="h-12 border-b border-slate-400 mx-8"></div>
              <p className="font-bold text-slate-800 mt-2">Employee Signature</p>
              <p className="text-[10px] text-slate-500">I hereby verify the logged attendance hours & records.</p>
            </div>
            <div className="text-center">
              <div className="h-12 border-b border-slate-400 mx-8"></div>
              <p className="font-bold text-slate-800 mt-2">Authorized Signatory / Store Manager</p>
              <p className="text-[10px] text-slate-500">KwikStore Pro HR & Payroll Management System</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-8">
            Computer-generated attendance register produced by KwikStore Pro. Valid without physical seal when verified.
          </div>

        </div>

      </div>
    </div>
  );
}
