import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Table as TableIcon, 
  Layers, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  ShieldAlert, 
  FileCheck, 
  Award, 
  CreditCard, 
  Edit3, 
  Trash2, 
  Power, 
  FileText, 
  Share2, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Clock, 
  UserCheck, 
  Eye, 
  X,
  FileUp,
  MapPin,
  Sparkles,
  ArrowUpDown,
  Briefcase,
  AlertCircle
} from 'lucide-react';

const KYC_DOCUMENT_TYPES = [
  { key: 'PASSPORT_PHOTO', label: 'Passport Size Photo', desc: 'Required for ID Card & Avatar', icon: '📷' },
  { key: 'AADHAAR_FRONT', label: 'Aadhaar Card (Front)', desc: 'UIDAI Photo Identity Card Front', icon: '🪪' },
  { key: 'AADHAAR_BACK', label: 'Aadhaar Card (Back)', desc: 'Permanent Address Proof Back', icon: '🪪' },
  { key: 'PAN_CARD', label: 'PAN Card', desc: 'Income Tax PAN Card Proof', icon: '💳' },
  { key: 'CERT_10TH', label: '10th / Matriculation', desc: 'Secondary School Board Passing Certificate', icon: '📜' },
  { key: 'CERT_12TH', label: '12th / +2 Intermediate', desc: 'Higher Secondary School Certificate', icon: '📜' },
  { key: 'CERT_GRADUATION', label: 'Graduation / Degree', desc: 'University Degree or Diploma Certificate', icon: '🎓' },
];

export function StaffDirectoryView({
  employees = [],
  isOwner,
  isDark,
  activeShop,
  roles = [],
  payrollSummary = [],
  openOnboardModal,
  openEditEmployeeModal,
  openEmployeeDocsModal,
  setSelectedOnboardingLetter,
  setIdCardEmployee,
  openAccessModal,
  handleToggleEmployeeStatus,
  handleDeleteEmployee,
  openProcessPayrollModal,
  setActiveTab
}) {
  // View mode: 'grid' | 'table' | 'compact' | 'department'
  const [viewMode, setViewMode] = useState('grid');
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DISABLED'
  const [kycFilter, setKycFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'PENDING'
  const [accessFilter, setAccessFilter] = useState('ALL'); // 'ALL' | 'HAS_ACCESS' | 'NO_ACCESS'
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'salary_desc' | 'joining_desc'

  // 360 Degree Profile Inspector Drawer / Modal
  const [selectedProfileEmp, setSelectedProfileEmp] = useState(null);
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'job_salary' | 'bank_kyc' | 'docs' | 'access'

  // Helper for KYC Badge Theme Classes
  const getKycBadgeClasses = (docsCount) => {
    if (docsCount >= 4) {
      return isDark
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
    }
    if (docsCount > 0) {
      return isDark
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-amber-50 text-amber-700 border-amber-300 font-bold';
    }
    return isDark
      ? 'bg-slate-800 text-slate-300 border-slate-700'
      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 font-semibold';
  };

  // Extract unique departments from employees
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
      else set.add('General / Operations');
    });
    return Array.from(set);
  }, [employees]);

  // Filtered & Sorted Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.full_name?.toLowerCase().includes(q);
        const matchCode = emp.employee_code?.toLowerCase().includes(q);
        const matchPhone = emp.phone?.includes(q);
        const matchDesig = emp.designation?.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        const matchUser = emp.username?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchDesig && !matchDept && !matchUser) {
          return false;
        }
      }

      // Department filter
      if (departmentFilter !== 'ALL') {
        const dept = emp.department || 'General / Operations';
        if (dept !== departmentFilter) return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && emp.status !== 'ACTIVE') return false;
      if (statusFilter === 'DISABLED' && emp.status === 'ACTIVE') return false;

      // KYC filter
      const docsCount = Number(emp.documents_count || 0);
      if (kycFilter === 'VERIFIED' && docsCount < 4) return false;
      if (kycFilter === 'PENDING' && docsCount >= 4) return false;

      // Access filter
      if (accessFilter === 'HAS_ACCESS' && !emp.username) return false;
      if (accessFilter === 'NO_ACCESS' && emp.username) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name_asc') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'name_desc') return (b.full_name || '').localeCompare(a.full_name || '');
      if (sortBy === 'salary_desc') return (b.monthly_basic_salary || 0) - (a.monthly_basic_salary || 0);
      if (sortBy === 'joining_desc') return (b.date_of_joining || '').localeCompare(a.date_of_joining || '');
      return 0;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter, kycFilter, accessFilter, sortBy]);

  // Aggregate KPI Highlights
  const kpis = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'ACTIVE').length;
    const totalMonthlyPayroll = employees
      .filter(e => e.status === 'ACTIVE')
      .reduce((sum, e) => sum + Number(e.monthly_basic_salary || 0), 0);
    const portalUsers = employees.filter(e => e.username && e.login_is_active !== 0).length;
    const fullyKyc = employees.filter(e => Number(e.documents_count || 0) >= 4).length;

    return { total, active, totalMonthlyPayroll, portalUsers, fullyKyc };
  }, [employees]);

  // Group by department for Department View
  const departmentGroups = useMemo(() => {
    const map = {};
    filteredEmployees.forEach(emp => {
      const dept = emp.department || 'General / Operations';
      if (!map[dept]) map[dept] = [];
      map[dept].push(emp);
    });
    return map;
  }, [filteredEmployees]);

  // Export CSV function
  const handleExportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,";
    csv += `Staff Directory - ${activeShop?.name || 'KwikStore Pro'},Export Date: ${new Date().toLocaleDateString('en-GB')}\n\n`;
    csv += "Employee Code,Full Name,Designation,Department,Phone,Email,Joining Date,Monthly Basic Salary,PF Eligible,KYC Docs Count,Portal Username,Role,Status\n";
    
    filteredEmployees.forEach(emp => {
      csv += `"${emp.employee_code || ''}","${emp.full_name || ''}","${emp.designation || ''}","${emp.department || ''}","${emp.phone || ''}","${emp.email || ''}","${emp.date_of_joining || ''}",${emp.monthly_basic_salary || 0},"${emp.is_pf_eligible ? 'YES' : 'NO'}",${emp.documents_count || 0},"${emp.username || 'NONE'}","${emp.role_name || ''}","${emp.status || 'ACTIVE'}"\n`;
    });

    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `staff_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppClick = (emp) => {
    if (!emp?.phone) return;
    const phone = emp.phone.replace(/[^0-9]/g, '');
    const text = `Hello ${emp.full_name}, regarding your work at ${activeShop?.name || 'KwikStore Pro'}...`;
    const url = phone.length >= 10 
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}` 
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className={`text-base font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Store Employees & Access Directory ({filteredEmployees.length} of {employees.length})
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              {activeShop?.name || 'Main Branch'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage staff profiles, salary structures, KYC verification documents, system access roles, and identity cards.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isDark 
                ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200' 
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
            title="Export full employee directory as CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          {/* Onboard New Employee Button */}
          {isOwner && (
            <button
              onClick={openOnboardModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Staff</div>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400">{kpis.total}</div>
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Staff</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{kpis.active}</div>
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly Payroll</div>
            <div className="text-lg font-black text-sky-600 dark:text-sky-400">₹{kpis.totalMonthlyPayroll.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Portal Logins</div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400">{kpis.portalUsers}</div>
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">KYC Verified</div>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{kpis.fullyKyc}</div>
          </div>
        </div>
      </div>

      {/* Search, Filter & View Mode Control Toolbar */}
      <div className={`p-3.5 rounded-2xl border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        
        {/* Left: Search Bar & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, EMP ID, phone, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none font-medium transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white focus:border-brand-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-brand-500'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-200' 
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-200' 
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Staff</option>
            <option value="DISABLED">Disabled Staff</option>
          </select>

          {/* KYC Filter */}
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-200' 
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="ALL">All KYC Docs</option>
            <option value="VERIFIED">KYC Complete (4+ Docs)</option>
            <option value="PENDING">KYC Incomplete (&lt;4 Docs)</option>
          </select>

          {/* Portal Access Filter */}
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-200' 
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="ALL">All Logins</option>
            <option value="HAS_ACCESS">Has System Login</option>
            <option value="NO_ACCESS">No System Login</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-200' 
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="name_asc">Sort: Name (A-Z)</option>
            <option value="name_desc">Sort: Name (Z-A)</option>
            <option value="salary_desc">Sort: Salary (Highest)</option>
            <option value="joining_desc">Sort: Joining Date (Newest)</option>
          </select>
        </div>

        {/* Right: View Mode Toggle Buttons */}
        <div className={`flex items-center p-1 rounded-xl border self-end lg:self-center ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Grid Cards View"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'table'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Corporate Table View"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>

          <button
            onClick={() => setViewMode('compact')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'compact'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Compact Contact List View"
          >
            <List className="w-3.5 h-3.5" />
            <span>Compact</span>
          </button>

          <button
            onClick={() => setViewMode('department')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'department'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Department Org Hierarchy View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Org Dept</span>
          </button>
        </div>

      </div>

      {/* VIEW 1: MODERN GRID CARDS VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const isActive = emp.status === 'ACTIVE';
            const hasPf = Boolean(emp.is_pf_eligible);
            const docsCount = Number(emp.documents_count || 0);

            return (
              <div 
                key={emp.id} 
                className={`p-4 rounded-2xl border shadow-md space-y-3 transition-all hover:shadow-lg ${
                  isDark 
                    ? (isActive ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/60 border-rose-900/40 opacity-80') 
                    : (isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-300 opacity-80')
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    {/* Photo / Avatar */}
                    <div 
                      onClick={() => setSelectedProfileEmp(emp)}
                      className="relative cursor-pointer group"
                      title="Click to view 360° Employee Profile"
                    >
                      {emp.photo_url ? (
                        <img
                          src={emp.photo_url}
                          alt={emp.full_name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-purple-500/40 shadow-sm group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border group-hover:scale-105 transition-transform ${
                          isActive
                            ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : 'E'}
                        </div>
                      )}
                      <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        isActive ? 'bg-emerald-500' : 'bg-rose-500'
                      }`} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold">
                          {emp.employee_code}
                        </span>
                        {hasPf && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                            PF Active
                          </span>
                        )}
                        <button
                          onClick={() => openEmployeeDocsModal(emp)}
                          className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center space-x-1 transition-all hover:scale-105 ${getKycBadgeClasses(docsCount)}`}
                          title="Click to view and manage uploaded KYC documents"
                        >
                          <FileCheck className="w-2.5 h-2.5" />
                          <span>{docsCount}/7 Docs</span>
                        </button>
                      </div>
                      
                      <h3 
                        onClick={() => setSelectedProfileEmp(emp)}
                        className={`text-sm font-bold mt-1 cursor-pointer hover:underline ${isDark ? 'text-white' : 'text-slate-900'}`}
                      >
                        {emp.full_name}
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                        {emp.designation || 'Staff'} • {emp.department || 'General'}
                      </p>
                    </div>
                  </div>

                  {/* 360 View Profile Button */}
                  <button
                    onClick={() => setSelectedProfileEmp(emp)}
                    className="p-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold flex items-center space-x-1 transition-all"
                    title="View complete 360° Employee Dossier"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">Profile</span>
                  </button>
                </div>

                <div className={`text-xs space-y-1.5 pt-2 border-t font-mono ${
                  isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Phone / Contact:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold">{emp.phone}</span>
                      {emp.phone && (
                        <button
                          onClick={() => handleWhatsAppClick(emp)}
                          className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          title="Open WhatsApp chat"
                        >
                          <Share2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className={`font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Joining Date:</span>
                    <span className={`font-sans ${isDark ? 'text-slate-300' : 'text-slate-800 font-medium'}`}>{emp.date_of_joining || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Monthly Basic:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{Number(emp.monthly_basic_salary || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Portal Access:</span>
                    {emp.username ? (
                      emp.login_is_active !== 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>@{emp.username}</span>
                        </span>
                      ) : (
                        <span className="text-rose-500 font-bold flex items-center space-x-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>@{emp.username} (Revoked)</span>
                        </span>
                      )
                    ) : (
                      <span className={`italic font-sans text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>No Login</span>
                    )}
                  </div>
                </div>

                {/* Owner Action Buttons */}
                {isOwner && (
                  <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-1.5 ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                      {/* Edit Employee */}
                      <button
                        onClick={() => openEditEmployeeModal(emp)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-sky-600'
                        }`}
                        title="Edit Details & Salary"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Edit</span>
                      </button>

                      {/* Documents Hub */}
                      <button
                        onClick={() => openEmployeeDocsModal(emp)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-amber-600'
                        }`}
                        title="View / Upload KYC Docs"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span className="text-[10px]">KYC Docs</span>
                      </button>

                      {/* Welcome / Appointment Letter */}
                      <button
                        onClick={() => setSelectedOnboardingLetter(emp)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-emerald-600'
                        }`}
                        title="Print Appointment Letter"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Letter</span>
                      </button>

                      {/* Photo ID Card */}
                      <button
                        onClick={() => setIdCardEmployee(emp)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-purple-600'
                        }`}
                        title="Print Staff ID Card"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="text-[10px]">ID Card</span>
                      </button>

                      {/* Portal Access */}
                      <button
                        onClick={() => openAccessModal(emp)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                          emp.username
                            ? emp.login_is_active !== 0
                              ? 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-500'
                            : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        }`}
                        title="Configure Portal Login"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{emp.username ? 'Access' : 'Grant'}</span>
                      </button>

                      {/* Status Toggle */}
                      <button
                        onClick={() => handleToggleEmployeeStatus(emp)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isActive
                            ? isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                        }`}
                        title={isActive ? "Disable Employee" : "Enable Employee"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      {emp.role_id !== 1 && (
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold transition-all"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Process Salary Quick Action */}
                    <button
                      onClick={() => {
                        setActiveTab('payroll');
                        const found = payrollSummary.find(s => s.employee_id === emp.id);
                        if (found) openProcessPayrollModal(found);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[10px] font-bold flex items-center space-x-1 transition-all ml-auto"
                      title="Process Salary Slip"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Salary</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: CORPORATE TABLE VIEW */}
      {viewMode === 'table' && (
        <div className={`rounded-2xl border shadow-md overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-bold ${
                  isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-800'
                }`}>
                  <th className="py-3.5 px-3 text-center w-12">#</th>
                  <th className="py-3.5 px-3">Employee Details</th>
                  <th className="py-3.5 px-3">Designation & Dept</th>
                  <th className="py-3.5 px-3">Contact Details</th>
                  <th className="py-3.5 px-3 text-right">Basic Salary</th>
                  <th className="py-3.5 px-3 text-center">KYC Docs</th>
                  <th className="py-3.5 px-3">Portal Access</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredEmployees.map((emp, idx) => {
                  const isActive = emp.status === 'ACTIVE';
                  const docsCount = Number(emp.documents_count || 0);

                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-brand-500/5 transition-colors ${
                        !isActive ? 'opacity-60 bg-rose-500/5' : ''
                      }`}
                    >
                      <td className={`py-3 px-3 text-center font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div 
                            onClick={() => setSelectedProfileEmp(emp)}
                            className="cursor-pointer"
                          >
                            {emp.photo_url ? (
                              <img src={emp.photo_url} alt="" className="w-8 h-8 rounded-xl object-cover border border-purple-500/40" />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center border border-purple-500/30">
                                {emp.full_name?.charAt(0) || 'E'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div 
                              onClick={() => setSelectedProfileEmp(emp)}
                              className={`font-bold cursor-pointer hover:underline ${isDark ? 'text-white' : 'text-slate-900'}`}
                            >
                              {emp.full_name}
                            </div>
                            <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                              {emp.employee_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{emp.designation || 'Staff'}</div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{emp.department || 'General'}</div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className={`flex items-center space-x-1.5 ${isDark ? 'text-slate-300' : 'text-slate-800 font-medium'}`}>
                          <span>{emp.phone}</span>
                          {emp.phone && (
                            <button
                              onClick={() => handleWhatsAppClick(emp)}
                              className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            >
                              <Share2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        {emp.email && <div className={`text-[10px] font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{emp.email}</div>}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(emp.monthly_basic_salary || 0).toLocaleString('en-IN')}
                        {emp.is_pf_eligible ? (
                          <span className="block text-[9px] font-sans text-cyan-600 dark:text-cyan-400 font-semibold">+ PF Eligible</span>
                        ) : null}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => openEmployeeDocsModal(emp)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all ${getKycBadgeClasses(docsCount)}`}
                          title="Click to view and upload KYC documents"
                        >
                          {docsCount}/7 Verified
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        {emp.username ? (
                          <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>@{emp.username}</span>
                          </div>
                        ) : (
                          <span className={`italic text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>No Login</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30'
                        }`}>
                          {isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedProfileEmp(emp)}
                            className="p-1.5 rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            title="View Profile Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => openEditEmployeeModal(emp)}
                                className="p-1.5 rounded-lg border border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                                title="Edit Employee"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setIdCardEmployee(emp)}
                                className="p-1.5 rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                                title="Print ID Card"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedOnboardingLetter(emp)}
                                className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                title="Appointment Letter"
                              >
                                <Award className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openAccessModal(emp)}
                                className="p-1.5 rounded-lg border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                                title="Portal Access"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleEmployeeStatus(emp)}
                                className={`p-1.5 rounded-lg border ${
                                  isActive ? 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100' : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                                }`}
                                title={isActive ? "Disable" : "Enable"}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: COMPACT LIST VIEW */}
      {viewMode === 'compact' && (
        <div className="space-y-2">
          {filteredEmployees.map((emp) => {
            const isActive = emp.status === 'ACTIVE';
            const docsCount = Number(emp.documents_count || 0);

            return (
              <div
                key={emp.id}
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all hover:border-brand-500/40 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {/* Left: Avatar & Meta */}
                <div className="flex items-center space-x-3">
                  <div 
                    onClick={() => setSelectedProfileEmp(emp)}
                    className="cursor-pointer"
                  >
                    {emp.photo_url ? (
                      <img src={emp.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-purple-500/40" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center border border-purple-500/30">
                        {emp.full_name?.charAt(0) || 'E'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span 
                        onClick={() => setSelectedProfileEmp(emp)}
                        className={`font-bold text-sm cursor-pointer hover:underline ${isDark ? 'text-white' : 'text-slate-900'}`}
                      >
                        {emp.full_name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                        {emp.employee_code}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                      }`}>
                        {isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                      {emp.designation || 'Staff'} • {emp.department || 'General'}
                    </p>
                  </div>
                </div>

                {/* Middle: Salary & Phone */}
                <div className="flex items-center space-x-6 text-xs font-mono">
                  <div>
                    <span className={`text-[10px] block font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Monthly Salary</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{Number(emp.monthly_basic_salary || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] block font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Contact</span>
                    <div className="flex items-center space-x-1">
                      <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{emp.phone}</span>
                      {emp.phone && (
                        <button
                          onClick={() => handleWhatsAppClick(emp)}
                          className="p-1 rounded bg-emerald-500/10 text-emerald-600"
                        >
                          <Share2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] block font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>KYC Status</span>
                    <button
                      onClick={() => openEmployeeDocsModal(emp)}
                      className={`px-2 py-0.5 rounded text-[10px] border ${getKycBadgeClasses(docsCount)}`}
                    >
                      {docsCount}/7 Docs
                    </button>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setSelectedProfileEmp(emp)}
                    className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Profile</span>
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => openEditEmployeeModal(emp)}
                      className="p-1.5 rounded-lg border border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 4: DEPARTMENT ORG HIERARCHY VIEW */}
      {viewMode === 'department' && (
        <div className="space-y-6">
          {Object.entries(departmentGroups).map(([deptName, deptEmployees]) => {
            const deptPayroll = deptEmployees.reduce((sum, e) => sum + Number(e.monthly_basic_salary || 0), 0);

            return (
              <div 
                key={deptName} 
                className={`p-5 rounded-2xl border ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {/* Department Header Banner */}
                <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {deptName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {deptEmployees.length} Staff Member{deptEmployees.length > 1 ? 's' : ''} Allocated
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      Dept Payroll: ₹{deptPayroll.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                </div>

                {/* Staff Cards inside this Department */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deptEmployees.map(emp => (
                    <div 
                      key={emp.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {emp.photo_url ? (
                          <img src={emp.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-purple-500/40" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center border border-purple-500/30">
                            {emp.full_name?.charAt(0) || 'E'}
                          </div>
                        )}
                        <div>
                          <h4 
                            onClick={() => setSelectedProfileEmp(emp)}
                            className={`font-bold text-xs cursor-pointer hover:underline ${isDark ? 'text-white' : 'text-slate-900'}`}
                          >
                            {emp.full_name}
                          </h4>
                          <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{emp.designation || 'Staff'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedProfileEmp(emp)}
                        className="p-1.5 rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 360° EMPLOYEE PROFILE INSPECTOR MODAL / DRAWER */}
      {selectedProfileEmp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6">
          <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border my-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-6 border-b flex flex-wrap items-center justify-between gap-4 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-4">
                {selectedProfileEmp.photo_url ? (
                  <img
                    src={selectedProfileEmp.photo_url}
                    alt={selectedProfileEmp.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 font-black text-2xl flex items-center justify-center border-2 border-purple-500/40">
                    {selectedProfileEmp.full_name?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold">{selectedProfileEmp.full_name}</h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {selectedProfileEmp.employee_code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      selectedProfileEmp.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                    }`}>
                      {selectedProfileEmp.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedProfileEmp.designation || 'Staff'} • {selectedProfileEmp.department || 'General Operations'} • Joined {selectedProfileEmp.date_of_joining || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Quick Actions in Header */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleWhatsAppClick(selectedProfileEmp)}
                  className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                  title="WhatsApp"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedProfileEmp(null);
                    setIdCardEmployee(selectedProfileEmp);
                  }}
                  className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                  title="Print ID Card"
                >
                  <CreditCard className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedProfileEmp(null);
                    setSelectedOnboardingLetter(selectedProfileEmp);
                  }}
                  className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  title="Appointment Letter"
                >
                  <Award className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedProfileEmp(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Sub-Tabs Switcher */}
            <div className={`flex border-b px-6 space-x-4 text-xs font-bold overflow-x-auto ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}>
              <button
                onClick={() => setProfileTab('overview')}
                className={`py-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  profileTab === 'overview'
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Personal & Contact</span>
              </button>
              <button
                onClick={() => setProfileTab('job_salary')}
                className={`py-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  profileTab === 'job_salary'
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Salary & Package</span>
              </button>
              <button
                onClick={() => setProfileTab('bank_kyc')}
                className={`py-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  profileTab === 'bank_kyc'
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Bank & Statutory</span>
              </button>
              <button
                onClick={() => setProfileTab('docs')}
                className={`py-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  profileTab === 'docs'
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>KYC Checklist ({selectedProfileEmp.documents_count || 0}/7)</span>
              </button>
              <button
                onClick={() => setProfileTab('access')}
                className={`py-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  profileTab === 'access'
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>System Role & Access</span>
              </button>
            </div>

            {/* Profile Tab Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              
              {/* TAB 1: PERSONAL & CONTACT */}
              {profileTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-sm text-brand-500 flex items-center space-x-1.5">
                      <Users className="w-4 h-4" />
                      <span>Personal Information</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gender:</span>
                        <span className="font-semibold">{selectedProfileEmp.gender || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date of Birth:</span>
                        <span className="font-semibold">{selectedProfileEmp.date_of_birth || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Blood Group:</span>
                        <span className="font-semibold">{selectedProfileEmp.blood_group || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Father / Spouse Name:</span>
                        <span className="font-semibold">{selectedProfileEmp.father_name || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-sm text-brand-500 flex items-center space-x-1.5">
                      <Phone className="w-4 h-4" />
                      <span>Contact & Address</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mobile Phone:</span>
                        <span className="font-semibold">{selectedProfileEmp.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email Address:</span>
                        <span className="font-semibold">{selectedProfileEmp.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Emergency Contact:</span>
                        <span className="font-semibold">{selectedProfileEmp.emergency_contact || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Permanent Address:</span>
                        <span className="font-semibold block">{selectedProfileEmp.address || 'Address not registered'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SALARY & COMPENSATION */}
              {profileTab === 'job_salary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-sm text-emerald-500 flex items-center space-x-1.5">
                      <DollarSign className="w-4 h-4" />
                      <span>Salary Package Breakdown</span>
                    </h4>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Monthly Basic Pay:</span>
                        <span className="font-bold text-emerald-500">₹{Number(selectedProfileEmp.monthly_basic_salary || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">HRA Allowance:</span>
                        <span className="font-semibold">₹{Number(selectedProfileEmp.hra || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Special / Other Allowances:</span>
                        <span className="font-semibold">₹{Number(selectedProfileEmp.allowances || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-slate-400 font-sans font-bold">Gross Monthly Pay:</span>
                        <span className="font-black text-emerald-500">₹{(
                          Number(selectedProfileEmp.monthly_basic_salary || 0) +
                          Number(selectedProfileEmp.hra || 0) +
                          Number(selectedProfileEmp.allowances || 0)
                        ).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-sm text-sky-500 flex items-center space-x-1.5">
                      <Briefcase className="w-4 h-4" />
                      <span>Employment Terms & Shift</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date of Joining:</span>
                        <span className="font-semibold">{selectedProfileEmp.date_of_joining || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Wage Mode:</span>
                        <span className="font-semibold uppercase">{selectedProfileEmp.wage_mode || 'Monthly Salary'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Shift Timings:</span>
                        <span className="font-semibold">{selectedProfileEmp.shift_timing || 'Standard 09:00 - 18:00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">PF Deduction Status:</span>
                        <span className={`font-bold ${selectedProfileEmp.is_pf_eligible ? 'text-cyan-500' : 'text-slate-400'}`}>
                          {selectedProfileEmp.is_pf_eligible ? 'Active (12% EPF + 12% Employer)' : 'Exempt / Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BANK & STATUTORY */}
              {profileTab === 'bank_kyc' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-sm text-purple-500 flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Bank Account for Payroll</span>
                    </h4>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Bank Name:</span>
                        <span className="font-semibold">{selectedProfileEmp.bank_name || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Account Number:</span>
                        <span className="font-bold">{selectedProfileEmp.bank_account_no || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">IFSC Code:</span>
                        <span className="font-bold text-purple-400">{selectedProfileEmp.bank_ifsc || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Account Holder:</span>
                        <span className="font-semibold">{selectedProfileEmp.bank_account_holder || selectedProfileEmp.full_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-sm text-indigo-500 flex items-center space-x-1.5">
                      <FileCheck className="w-4 h-4" />
                      <span>Statutory & Tax Identity</span>
                    </h4>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">PAN Card Number:</span>
                        <span className="font-bold">{selectedProfileEmp.pan_number || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Aadhaar UID Number:</span>
                        <span className="font-bold">{selectedProfileEmp.aadhaar_number || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">EPF / UAN Number:</span>
                        <span className="font-semibold">{selectedProfileEmp.uan_number || 'Not registered'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">ESIC Number:</span>
                        <span className="font-semibold">{selectedProfileEmp.esic_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: KYC DOCUMENTS CHECKLIST */}
              {profileTab === 'docs' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standard Indian Retail 7-Document Verification Checklist
                    </p>
                    <button
                      onClick={() => {
                        setSelectedProfileEmp(null);
                        openEmployeeDocsModal(selectedProfileEmp);
                      }}
                      className="px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center space-x-1"
                    >
                      <FileUp className="w-3 h-3" />
                      <span>Upload & View Files Hub</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {KYC_DOCUMENT_TYPES.map((doc, idx) => (
                      <div
                        key={doc.key}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-lg">{doc.icon}</span>
                          <div>
                            <span className="font-bold block">{doc.label}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{doc.desc}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          Slot #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM ROLE & PRIVILEGES */}
              {profileTab === 'access' && (
                <div className="space-y-4 text-xs">
                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-purple-500 flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>POS & App Login Credentials</span>
                      </h4>
                      {isOwner && (
                        <button
                          onClick={() => {
                            setSelectedProfileEmp(null);
                            openAccessModal(selectedProfileEmp);
                          }}
                          className="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold"
                        >
                          Modify Permissions
                        </button>
                      )}
                    </div>

                    {selectedProfileEmp.username ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Login Username:</span>
                          <span className="font-bold text-purple-400">@{selectedProfileEmp.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Assigned Role:</span>
                          <span className="font-semibold">{selectedProfileEmp.role_name || 'Staff User'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Account Status:</span>
                          <span className={`font-bold ${selectedProfileEmp.login_is_active !== 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {selectedProfileEmp.login_is_active !== 0 ? 'Active & Logged In' : 'Access Revoked'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-500" />
                        <p>No system login created for this staff member yet.</p>
                        {isOwner && (
                          <button
                            onClick={() => {
                              setSelectedProfileEmp(null);
                              openAccessModal(selectedProfileEmp);
                            }}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold"
                          >
                            Grant Portal Access
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end space-x-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {isOwner && (
                <button
                  onClick={() => {
                    const emp = selectedProfileEmp;
                    setSelectedProfileEmp(null);
                    openEditEmployeeModal(emp);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
              <button
                onClick={() => setSelectedProfileEmp(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
