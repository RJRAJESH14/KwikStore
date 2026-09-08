import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AttendanceReportPrint } from '../print/AttendanceReportPrint';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Download, 
  User, 
  Users, 
  Sparkles,
  Award,
  TrendingUp,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  Edit2,
  Check,
  X,
  Building2,
  Filter
} from 'lucide-react';

export function AttendanceAnalytics({ activeShop, employees = [], isOwner, onAttendanceUpdated }) {
  const { isDark } = useTheme();

  // View state
  const [viewType, setViewType] = useState('month'); // 'week' | 'month' | 'year'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL'); // 'ALL' or employeeId
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Date states
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [currentWeekDate, setCurrentWeekDate] = useState(today.toISOString().slice(0, 10));

  // Data state
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'

  // Quick edit modal state
  const [quickEditDay, setQuickEditDay] = useState(null);
  const [quickStatus, setQuickStatus] = useState('PRESENT');
  const [quickCheckIn, setQuickCheckIn] = useState('09:00');
  const [quickCheckOut, setQuickCheckOut] = useState('18:00');
  const [quickHours, setQuickHours] = useState(8);
  const [quickNotes, setQuickNotes] = useState('');
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [activeShop?.id, viewType, selectedEmployeeId, currentYear, currentMonth, currentWeekDate]);

  const fetchAnalytics = async () => {
    if (!activeShop?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        shopId: activeShop.id,
        viewType,
        employeeId: selectedEmployeeId,
        year: currentYear,
        month: currentMonth,
        weekDate: currentWeekDate
      });

      const res = await fetch(`/api/hrms/attendance/analytics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to load attendance analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quick update handler
  const handleQuickStatusChange = async (empId, date, newStatus) => {
    try {
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await fetch('/api/hrms/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          shop_id: activeShop.id,
          date,
          status: newStatus,
          check_in_time: newStatus === 'ABSENT' ? null : nowTime,
          work_hours: newStatus === 'PRESENT' ? 8 : (newStatus === 'HALF_DAY' ? 4 : 0)
        })
      });
      fetchAnalytics();
      onAttendanceUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDetailedQuickEdit = async (e) => {
    e.preventDefault();
    if (!quickEditDay) return;
    setSavingQuickEdit(true);
    try {
      await fetch('/api/hrms/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: quickEditDay.employee_id,
          shop_id: activeShop.id,
          date: quickEditDay.date,
          status: quickStatus,
          check_in_time: quickStatus === 'ABSENT' ? null : quickCheckIn,
          check_out_time: quickStatus === 'ABSENT' ? null : quickCheckOut,
          work_hours: Number(quickHours),
          notes: quickNotes
        })
      });
      setQuickEditDay(null);
      fetchAnalytics();
      onAttendanceUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const openQuickEditModal = (empId, dayRecord, empName) => {
    setQuickEditDay({
      employee_id: empId,
      employee_name: empName,
      date: dayRecord.date,
      dayName: dayRecord.dayName,
      dayNumber: dayRecord.dayNumber
    });
    setQuickStatus(dayRecord.status === 'NOT_MARKED' || dayRecord.status === 'WEEK_OFF' ? 'PRESENT' : dayRecord.status);
    setQuickCheckIn(dayRecord.check_in_time || '09:30');
    setQuickCheckOut(dayRecord.check_out_time || '18:30');
    setQuickHours(dayRecord.work_hours || 8);
    setQuickNotes(dayRecord.notes || '');
  };

  // Week navigation
  const handlePrevWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekDate(d.toISOString().slice(0, 10));
  };
  const handleNextWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekDate(d.toISOString().slice(0, 10));
  };
  const handleCurrentWeek = () => {
    setCurrentWeekDate(new Date().toISOString().slice(0, 10));
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };
  const handleCurrentMonth = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };

  // Year navigation
  const handlePrevYear = () => setCurrentYear(prev => prev - 1);
  const handleNextYear = () => setCurrentYear(prev => prev + 1);
  const handleCurrentYear = () => setCurrentYear(new Date().getFullYear());

  // Print function
  const handlePrint = () => {
    setShowPrintModal(true);
  };

  // Export CSV function
  const handleExportCSV = () => {
    if (!analyticsData) return;
    let csvContent = "data:text/csv;charset=utf-8,";

    if (viewType === 'week' || viewType === 'month') {
      csvContent += `Attendance Report (${viewType.toUpperCase()} VIEW),Shop: ${activeShop?.name || ''},Period: ${analyticsData.startDate} to ${analyticsData.endDate}\n\n`;
      
      if (selectedEmployeeId === 'ALL') {
        csvContent += "Employee Code,Employee Name,Designation,Total Days,Present,Half Day,Leave,Absent,Total Hours,Attendance %\n";
        analyticsData.employees?.forEach(e => {
          csvContent += `"${e.employee.employee_code}","${e.employee.full_name}","${e.employee.designation}",${e.summary.totalDays},${e.summary.presentCount},${e.summary.halfDayCount},${e.summary.leaveCount},${e.summary.absentCount},${e.summary.totalHours},${e.summary.attendancePercent}%\n`;
        });
      } else {
        const emp = analyticsData.singleEmployee;
        if (emp) {
          csvContent += `Employee: ${emp.employee.full_name} (${emp.employee.employee_code}) - ${emp.employee.designation}\n`;
          csvContent += `Present: ${emp.summary.presentCount}, Half Days: ${emp.summary.halfDayCount}, Leaves: ${emp.summary.leaveCount}, Absent: ${emp.summary.absentCount}, Total Hours: ${emp.summary.totalHours}, Attendance: ${emp.summary.attendancePercent}%\n\n`;
          csvContent += "Date,Day,Status,Check-In,Check-Out,Work Hours,Notes\n";
          emp.records?.forEach(r => {
            csvContent += `"${r.date}","${r.dayName}","${r.status}","${r.check_in_time || ''}","${r.check_out_time || ''}",${r.work_hours || 0},"${r.notes || ''}"\n`;
          });
        }
      }
    } else if (viewType === 'year') {
      csvContent += `Annual Attendance Report (${currentYear}),Shop: ${activeShop?.name || ''}\n\n`;
      if (selectedEmployeeId === 'ALL') {
        csvContent += "Employee Code,Employee Name,Designation,Present Days,Half Days,Leaves,Absent Days,Total Hours,Annual Attendance %\n";
        analyticsData.employees?.forEach(e => {
          csvContent += `"${e.employee.employee_code}","${e.employee.full_name}","${e.employee.designation}",${e.summary.presentCount},${e.summary.halfDayCount},${e.summary.leaveCount},${e.summary.absentCount},${e.summary.totalHours},${e.summary.attendancePercent}%\n`;
        });
      } else {
        const emp = analyticsData.singleEmployee;
        if (emp) {
          csvContent += `Employee: ${emp.employee.full_name} (${emp.employee.employee_code})\n\n`;
          csvContent += "Month,Present Days,Half Days,Leaves,Absent Days,Total Hours,Attendance %\n";
          emp.monthlyBreakdown?.forEach(m => {
            csvContent += `"${m.monthName}",${m.presentCount},${m.halfDayCount},${m.leaveCount},${m.absentCount},${m.totalHours},${m.attendancePercent}%\n`;
          });
        }
      }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${viewType}_${selectedEmployeeId}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Present</span>;
      case 'HALF_DAY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">Half Day</span>;
      case 'PAID_LEAVE':
      case 'LEAVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">Leave</span>;
      case 'HOLIDAY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">Holiday</span>;
      case 'WEEK_OFF':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">Week Off</span>;
      case 'ABSENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">Absent</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">Unmarked</span>;
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const singleEmp = analyticsData?.singleEmployee;
  const isSingle = selectedEmployeeId !== 'ALL' && singleEmp;

  return (
    <div className="space-y-4">
      {/* TOP CONTROLS & FILTER BAR */}
      <div className={`p-4 rounded-2xl border shadow-md space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* View Type Tabs (Week, Month, Year) */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-fit">
            {[
              { id: 'week', label: 'Week Wise', icon: CalendarDays },
              { id: 'month', label: 'Month Wise', icon: Calendar },
              { id: 'year', label: 'Year Wise', icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = viewType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewType(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Employee Selection Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-brand-500 shrink-0" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none transition-all ${
                  isDark 
                    ? 'bg-slate-950 border-slate-700 text-white focus:border-brand-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-brand-600'
                }`}
              >
                <option value="ALL">👥 All Staff Members (Roster View)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code}) — {emp.designation}
                  </option>
                ))}
              </select>
            </div>

            {/* Export & Print */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handlePrint}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center space-x-1 transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title="Print Attendance Report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all"
                title="Export CSV Spreadsheet"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* TIME NAVIGATION BAR */}
        <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* WEEK SELECTOR */}
          {viewType === 'week' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevWeek}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCurrentWeek}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-500/10 text-brand-500 border border-brand-500/30 hover:bg-brand-500/20"
                >
                  This Week
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="font-bold text-xs font-mono ml-2">
                  📅 {analyticsData?.startDate ? `${analyticsData.startDate} to ${analyticsData.endDate}` : 'Loading...'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Pick any date in week:</span>
                <input
                  type="date"
                  value={currentWeekDate}
                  onChange={(e) => setCurrentWeekDate(e.target.value)}
                  className={`border rounded-lg px-2.5 py-1 text-xs font-mono outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          )}

          {/* MONTH SELECTOR */}
          {viewType === 'month' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCurrentMonth}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-500/10 text-brand-500 border border-brand-500/30 hover:bg-brand-500/20"
                >
                  Current Month
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="font-bold text-sm ml-2 text-brand-500 font-mono">
                  {monthNames[currentMonth - 1]} {currentYear}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className={`border rounded-lg px-2.5 py-1 text-xs font-semibold outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {monthNames.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className={`border rounded-lg px-2.5 py-1 text-xs font-mono outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>

                {isSingle && (
                  <div className="flex items-center space-x-1 ml-3 border-l pl-3 border-slate-700">
                    <button
                      onClick={() => setDisplayMode('grid')}
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        displayMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Calendar
                    </button>
                    <button
                      onClick={() => setDisplayMode('table')}
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        displayMode === 'table' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Table Log
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* YEAR SELECTOR */}
          {viewType === 'year' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevYear}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCurrentYear}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-500/10 text-brand-500 border border-brand-500/30 hover:bg-brand-500/20"
                >
                  This Year
                </button>
                <button
                  onClick={handleNextYear}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="font-bold text-sm ml-2 text-brand-500 font-mono">
                  Full Annual Report — Year {currentYear}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Select Year:</span>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className={`border rounded-lg px-3 py-1 text-xs font-mono font-bold outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS (WHEN SINGLE EMPLOYEE IS SELECTED) */}
      {isSingle && singleEmp.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Present */}
          <div className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between text-emerald-500 text-xs font-bold mb-1">
              <span>Present Days</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {singleEmp.summary.presentCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Full working days</div>
          </div>

          {/* Half Day */}
          <div className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between text-amber-500 text-xs font-bold mb-1">
              <span>Half Days</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {singleEmp.summary.halfDayCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">0.5 day wage value</div>
          </div>

          {/* Leaves */}
          <div className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center justify-between text-purple-500 text-xs font-bold mb-1">
              <span>Leaves / Off</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {singleEmp.summary.leaveCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Approved & holidays</div>
          </div>

          {/* Absent */}
          <div className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center justify-between text-rose-500 text-xs font-bold mb-1">
              <span>Absent Days</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {singleEmp.summary.absentCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Unexcused absence</div>
          </div>

          {/* Total Hours */}
          <div className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-sky-950/20 border-sky-500/30' : 'bg-sky-50 border-sky-200'
          }`}>
            <div className="flex items-center justify-between text-sky-500 text-xs font-bold mb-1">
              <span>Total Hours</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
              {singleEmp.summary.totalHours}h
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tracked work hours</div>
          </div>

          {/* Attendance % */}
          <div className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
          }`}>
            <div className="flex items-center justify-between text-indigo-500 text-xs font-bold mb-1">
              <span>Attendance %</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {singleEmp.summary.attendancePercent}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, singleEmp.summary.attendancePercent)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold">Compiling attendance logs...</p>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* 1. WEEK VIEW - SINGLE EMPLOYEE */}
          {/* ======================================================== */}
          {viewType === 'week' && isSingle && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-xs">
                    {singleEmp.employee.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{singleEmp.employee.full_name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{singleEmp.employee.employee_code} • {singleEmp.employee.designation}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Click any day card or action button to adjust attendance.
                </div>
              </div>

              {/* 7 Day Cards */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {singleEmp.records?.map((day, idx) => {
                  const isPresent = day.status === 'PRESENT';
                  const isHalfDay = day.status === 'HALF_DAY';
                  const isLeave = day.status === 'PAID_LEAVE' || day.status === 'LEAVE' || day.status === 'HOLIDAY';
                  const isAbsent = day.status === 'ABSENT';

                  return (
                    <div 
                      key={idx}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                        day.isToday ? 'ring-2 ring-brand-500' : ''
                      } ${
                        isPresent 
                          ? (isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200')
                          : isHalfDay
                            ? (isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/60 border-amber-200')
                            : isLeave
                              ? (isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50/60 border-purple-200')
                              : isAbsent
                                ? (isDark ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/60 border-rose-200')
                                : (isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200')
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider">{day.dayShort}</span>
                          {day.isToday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-brand-500 text-white">TODAY</span>
                          )}
                        </div>
                        <div className="text-lg font-black font-mono mt-0.5">{day.dayNumber}</div>
                        <div className="text-[10px] font-mono text-slate-400">{day.date}</div>

                        <div className="mt-2.5">
                          {getStatusBadge(day.status)}
                        </div>

                        <div className="mt-3 space-y-1 text-[11px] font-mono">
                          <div className="text-slate-400 flex items-center justify-between">
                            <span>In:</span>
                            <span className="font-bold text-brand-500">{day.check_in_time || '—'}</span>
                          </div>
                          <div className="text-slate-400 flex items-center justify-between">
                            <span>Hours:</span>
                            <span>{day.work_hours ? `${day.work_hours}h` : '—'}</span>
                          </div>
                          {day.notes && (
                            <div className="text-[10px] text-slate-400 truncate italic pt-1" title={day.notes}>
                              "{day.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                        <div className="grid grid-cols-2 gap-1 text-[9px] font-bold">
                          <button
                            onClick={() => handleQuickStatusChange(singleEmp.employee.id, day.date, 'PRESENT')}
                            className="py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(singleEmp.employee.id, day.date, 'HALF_DAY')}
                            className="py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors"
                          >
                            Half
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(singleEmp.employee.id, day.date, 'PAID_LEAVE')}
                            className="py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition-colors"
                          >
                            Leave
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(singleEmp.employee.id, day.date, 'ABSENT')}
                            className="py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors"
                          >
                            Absent
                          </button>
                        </div>
                        <button
                          onClick={() => openQuickEditModal(singleEmp.employee.id, day, singleEmp.employee.full_name)}
                          className="w-full py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center space-x-1"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>Detailed Edit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. MONTH VIEW - SINGLE EMPLOYEE */}
          {/* ======================================================== */}
          {viewType === 'month' && isSingle && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-xs">
                    {singleEmp.employee.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{singleEmp.employee.full_name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {monthNames[currentMonth - 1]} {currentYear} • Working Days: {singleEmp.summary.workingDays}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {displayMode === 'grid' ? 'Click any date to log or edit timings.' : 'Detailed day-by-day table.'}
                </div>
              </div>

              {/* CALENDAR GRID VIEW */}
              {displayMode === 'grid' ? (
                <div className={`p-4 rounded-2xl border shadow-lg ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {/* Calendar Day Header */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider mb-2 text-slate-400 border-b pb-2 border-slate-200 dark:border-slate-800">
                    <span className="text-rose-500">Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  {/* Days Matrix */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for padding before 1st day */}
                    {Array.from({ length: singleEmp.records[0]?.dayOfWeek || 0 }).map((_, i) => (
                      <div key={`pad-${i}`} className="min-h-[80px] rounded-xl bg-slate-500/5 opacity-30 border border-transparent" />
                    ))}

                    {/* Month Days */}
                    {singleEmp.records?.map((day, idx) => {
                      const isPresent = day.status === 'PRESENT';
                      const isHalfDay = day.status === 'HALF_DAY';
                      const isLeave = day.status === 'PAID_LEAVE' || day.status === 'LEAVE' || day.status === 'HOLIDAY';
                      const isAbsent = day.status === 'ABSENT';

                      return (
                        <div
                          key={idx}
                          onClick={() => openQuickEditModal(singleEmp.employee.id, day, singleEmp.employee.full_name)}
                          className={`min-h-[85px] p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all shadow-sm ${
                            day.isToday ? 'ring-2 ring-brand-500' : ''
                          } ${
                            isPresent
                              ? (isDark ? 'bg-emerald-950/25 border-emerald-500/30 hover:bg-emerald-950/40' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100')
                              : isHalfDay
                                ? (isDark ? 'bg-amber-950/25 border-amber-500/30 hover:bg-amber-950/40' : 'bg-amber-50 border-amber-200 hover:bg-amber-100')
                                : isLeave
                                  ? (isDark ? 'bg-purple-950/25 border-purple-500/30 hover:bg-purple-950/40' : 'bg-purple-50 border-purple-200 hover:bg-purple-100')
                                  : isAbsent
                                    ? (isDark ? 'bg-rose-950/25 border-rose-500/30 hover:bg-rose-950/40' : 'bg-rose-50 border-rose-200 hover:bg-rose-100')
                                    : (isDark ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60' : 'bg-slate-50 border-slate-200 hover:bg-slate-100')
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-black font-mono ${day.isWeekend ? 'text-rose-400' : ''}`}>
                              {day.dayNumber}
                            </span>
                            {day.isToday && (
                              <span className="text-[8px] font-bold px-1 rounded bg-brand-500 text-white">TODAY</span>
                            )}
                          </div>

                          <div className="my-1">
                            {getStatusBadge(day.status)}
                          </div>

                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                            <span>{day.check_in_time ? `⏱ ${day.check_in_time}` : ''}</span>
                            <span>{day.work_hours ? `${day.work_hours}h` : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* DETAILED TABLE LOG */
                <div className={`border rounded-2xl overflow-hidden shadow-lg ${
                  isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                      isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <tr>
                        <th className="py-3 px-4">Date & Day</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Check-In</th>
                        <th className="py-3 px-4">Check-Out</th>
                        <th className="py-3 px-4">Hours</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-right">Quick Update</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {singleEmp.records?.map((day, idx) => (
                        <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4 font-mono">
                            <div className="font-bold">{day.date}</div>
                            <div className="text-[10px] text-slate-400">{day.dayName}</div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(day.status)}</td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-500">{day.check_in_time || '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{day.check_out_time || '—'}</td>
                          <td className="py-3 px-4 font-mono">{day.work_hours ? `${day.work_hours} hrs` : '—'}</td>
                          <td className="py-3 px-4 text-slate-400 text-xs italic">{day.notes || '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end items-center space-x-1 text-[10px]">
                              <button
                                onClick={() => handleQuickStatusChange(singleEmp.employee.id, day.date, 'PRESENT')}
                                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(singleEmp.employee.id, day.date, 'HALF_DAY')}
                                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              >
                                Half
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(singleEmp.employee.id, day.date, 'ABSENT')}
                                className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              >
                                Absent
                              </button>
                              <button
                                onClick={() => openQuickEditModal(singleEmp.employee.id, day, singleEmp.employee.full_name)}
                                className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                                title="Edit Timings"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. YEAR VIEW - SINGLE EMPLOYEE */}
          {/* ======================================================== */}
          {viewType === 'year' && isSingle && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-xs">
                    {singleEmp.employee.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{singleEmp.employee.full_name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Annual Attendance Performance • Year {currentYear}
                    </p>
                  </div>
                </div>
              </div>

              {/* 12 Month Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {singleEmp.monthlyBreakdown?.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{m.monthName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20 font-bold">
                          {m.attendancePercent}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, m.attendancePercent)}%` }}
                        />
                      </div>

                      {/* Breakdown numbers */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <div className="text-[10px]">Present</div>
                          <div className="font-bold text-sm">{m.presentCount} d</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                          <div className="text-[10px]">Half Day</div>
                          <div className="font-bold text-sm">{m.halfDayCount} d</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                          <div className="text-[10px]">Leaves</div>
                          <div className="font-bold text-sm">{m.leaveCount} d</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                          <div className="text-[10px]">Absent</div>
                          <div className="font-bold text-sm">{m.absentCount} d</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Total Hours:</span>
                      <span className="font-bold text-slate-200">{m.totalHours} hrs</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Annual Summary Table */}
              <div className={`border rounded-2xl overflow-hidden shadow-lg ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
              }`}>
                <table className="w-full text-left text-xs">
                  <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                    isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-center">Present</th>
                      <th className="py-3 px-4 text-center">Half Day</th>
                      <th className="py-3 px-4 text-center">Leaves</th>
                      <th className="py-3 px-4 text-center">Absent</th>
                      <th className="py-3 px-4 text-center">Total Hours</th>
                      <th className="py-3 px-4 text-right">Attendance Score</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {singleEmp.monthlyBreakdown?.map((m, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-4 font-bold">{m.monthName}</td>
                        <td className="py-3 px-4 text-center text-emerald-500 font-bold">{m.presentCount}</td>
                        <td className="py-3 px-4 text-center text-amber-500 font-bold">{m.halfDayCount}</td>
                        <td className="py-3 px-4 text-center text-purple-500 font-bold">{m.leaveCount}</td>
                        <td className="py-3 px-4 text-center text-rose-500 font-bold">{m.absentCount}</td>
                        <td className="py-3 px-4 text-center">{m.totalHours} hrs</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-brand-500">{m.attendancePercent}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* GRAND TOTAL FOOTER */}
                  <tfoot className={`font-bold font-mono border-t ${
                    isDark ? 'bg-slate-950 text-white border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-300'
                  }`}>
                    <tr>
                      <td className="py-3.5 px-4 uppercase tracking-wider">ANNUAL GRAND TOTAL ({currentYear})</td>
                      <td className="py-3.5 px-4 text-center text-emerald-500 text-sm">{singleEmp.summary.presentCount} Days</td>
                      <td className="py-3.5 px-4 text-center text-amber-500 text-sm">{singleEmp.summary.halfDayCount} Days</td>
                      <td className="py-3.5 px-4 text-center text-purple-500 text-sm">{singleEmp.summary.leaveCount} Days</td>
                      <td className="py-3.5 px-4 text-center text-rose-500 text-sm">{singleEmp.summary.absentCount} Days</td>
                      <td className="py-3.5 px-4 text-center text-sky-500 text-sm">{singleEmp.summary.totalHours} hrs</td>
                      <td className="py-3.5 px-4 text-right text-brand-500 text-sm">{singleEmp.summary.attendancePercent}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. ALL EMPLOYEES ROSTER MATRIX (FOR WEEK / MONTH / YEAR) */}
          {/* ======================================================== */}
          {selectedEmployeeId === 'ALL' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Staff Attendance Comparison Roster ({viewType.toUpperCase()} VIEW)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Showing attendance performance summary across all active shop employees.
                  </p>
                </div>
              </div>

              <div className={`border rounded-2xl overflow-hidden shadow-lg ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
              }`}>
                <table className="w-full text-left text-xs">
                  <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                    isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4 text-center">Present</th>
                      <th className="py-3 px-4 text-center">Half Day</th>
                      <th className="py-3 px-4 text-center">Leaves</th>
                      <th className="py-3 px-4 text-center">Absent</th>
                      <th className="py-3 px-4 text-center">Total Hours</th>
                      <th className="py-3 px-4 text-center">Attendance %</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {analyticsData?.employees?.map((row, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="py-3.5 px-4">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {row.employee.full_name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">{row.employee.employee_code}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{row.employee.designation}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-500">
                          {row.summary.presentCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-500">
                          {row.summary.halfDayCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-500">
                          {row.summary.leaveCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-500">
                          {row.summary.absentCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {row.summary.totalHours} hrs
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            row.summary.attendancePercent >= 90
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : row.summary.attendancePercent >= 75
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                          }`}>
                            {row.summary.attendancePercent}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedEmployeeId(String(row.employee.id))}
                            className="px-3 py-1 rounded-lg bg-brand-600/10 hover:bg-brand-600/20 text-brand-600 dark:text-brand-400 border border-brand-500/30 text-xs font-bold transition-all"
                          >
                            View Details ➔
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* QUICK EDIT MODAL */}
      {quickEditDay && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <div>
                <h3 className="text-sm font-bold">Edit Attendance Entry</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {quickEditDay.employee_name} • {quickEditDay.date} ({quickEditDay.dayName})
                </p>
              </div>
              <button
                onClick={() => setQuickEditDay(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDetailedQuickEdit} className="p-5 space-y-4 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-400 mb-1.5">Attendance Status</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'PRESENT', label: 'Present (Full Day)', color: 'border-emerald-500 text-emerald-500 bg-emerald-500/10' },
                    { id: 'HALF_DAY', label: 'Half Day', color: 'border-amber-500 text-amber-500 bg-amber-500/10' },
                    { id: 'PAID_LEAVE', label: 'Paid Leave / Off', color: 'border-purple-500 text-purple-500 bg-purple-500/10' },
                    { id: 'ABSENT', label: 'Absent', color: 'border-rose-500 text-rose-500 bg-rose-500/10' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setQuickStatus(s.id)}
                      className={`p-2 rounded-xl border font-bold text-left transition-all ${
                        quickStatus === s.id
                          ? s.color + ' ring-2 ring-brand-500'
                          : 'border-slate-300 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timings */}
              {quickStatus !== 'ABSENT' && (
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Check-In Time</label>
                    <input
                      type="time"
                      value={quickCheckIn}
                      onChange={(e) => setQuickCheckIn(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Check-Out Time</label>
                    <input
                      type="time"
                      value={quickCheckOut}
                      onChange={(e) => setQuickCheckOut(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Work Hours & Notes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-400 mb-1">Work Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={quickHours}
                    onChange={(e) => setQuickHours(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-400 mb-1">Notes / Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Overtime, Client site, Doctor visit"
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickEditDay(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-400 hover:bg-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuickEdit}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-md flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingQuickEdit ? 'Saving...' : 'Save Attendance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Printable Attendance Register Modal */}
      {showPrintModal && (
        <AttendanceReportPrint
          shop={activeShop}
          analyticsData={analyticsData}
          viewType={viewType}
          selectedEmployeeId={selectedEmployeeId}
          currentMonth={currentMonth}
          currentYear={currentYear}
          currentWeekDate={currentWeekDate}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
