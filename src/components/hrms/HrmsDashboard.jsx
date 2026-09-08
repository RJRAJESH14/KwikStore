import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { SalarySlipPrint } from '../print/SalarySlipPrint';
import { OnboardingLetterPrint } from '../print/OnboardingLetterPrint';
import { EmployeeIdCardModal } from './EmployeeIdCardModal';
import { AttendanceAnalytics } from './AttendanceAnalytics';
import { StaffDirectoryView } from './StaffDirectoryView';
import { PORTAL_MODULES } from '../staff/StaffRbacManager';
import { numberToIndianWords } from '../../utils/numberToWords';
import { 
  UserCheck, 
  Users, 
  Calendar, 
  FileSpreadsheet, 
  Clock, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  DollarSign, 
  Printer, 
  ShieldCheck, 
  ShieldAlert,
  Shield,
  Key,
  Lock,
  Building2,
  CalendarCheck,
  Edit3,
  Trash2,
  Power,
  Calculator,
  CheckCircle2,
  X,
  Save,
  FileText,
  RotateCcw,
  Sparkles,
  CreditCard,
  Banknote,
  Send,
  Sliders,
  Award,
  Upload,
  Eye,
  Download,
  FileCheck,
  FileBadge,
  CheckSquare,
  AlertTriangle,
  FileUp,
  Image as ImageIcon,
  UserX,
  BarChart3
} from 'lucide-react';

// Standard 7 KYC & Academic Document Types
const KYC_DOCUMENT_TYPES = [
  { key: 'PASSPORT_PHOTO', label: 'Passport Size Photo', desc: 'Required for ID Card & Staff Avatar', accept: 'image/*', icon: '📷', isPhoto: true },
  { key: 'AADHAAR_FRONT', label: 'Aadhaar Card (Front)', desc: 'UIDAI Photo Identity Card Front Side', accept: 'image/*,application/pdf', icon: '🪪' },
  { key: 'AADHAAR_BACK', label: 'Aadhaar Card (Back)', desc: 'Permanent Address Proof Back Side', accept: 'image/*,application/pdf', icon: '🪪' },
  { key: 'PAN_CARD', label: 'PAN Card', desc: 'Income Tax PAN Card Proof', accept: 'image/*,application/pdf', icon: '💳' },
  { key: 'CERT_10TH', label: '10th / Matriculation Marksheet', desc: 'Secondary School Board Passing Certificate', accept: 'image/*,application/pdf', icon: '📜' },
  { key: 'CERT_12TH', label: '12th / +2 Intermediate Certificate', desc: 'Higher Secondary School Certificate', accept: 'image/*,application/pdf', icon: '📜' },
  { key: 'CERT_GRADUATION', label: 'Graduation / Degree Certificate', desc: 'University Degree or Diploma Certificate', accept: 'image/*,application/pdf', icon: '🎓' },
];

export function HrmsDashboard() {
  const { user, hasPermission } = useAuth();
  const { activeShop, shops } = useShop();
  const { isDark } = useTheme();

  const isOwner = Boolean(
    user && (
      user.roleKey === 'SUPER_ADMIN' || 
      user.roleKey === 'owner' || 
      user.roleId === 1 || 
      user.username?.toLowerCase() === 'pujarani.sahoo'
    )
  );

  const canAccessHrms = isOwner || (user && (hasPermission('hrms:view') || hasPermission('hrms:payroll') || hasPermission('hrms:manage_payroll')));
  const canManagePayroll = isOwner || (user && (hasPermission('hrms:manage_payroll') || hasPermission('hrms:payroll') || hasPermission('hrms:view')));

  const [activeTab, setActiveTab] = useState('employees'); // employees, attendance, leaves, advances, payroll
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceSubTab, setAttendanceSubTab] = useState('daily'); // 'daily' | 'analytics'
  const [leaves, setLeaves] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payrollSummary, setPayrollSummary] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals & Letters
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [autoEmpCode, setAutoEmpCode] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedSalarySlip, setSelectedSalarySlip] = useState(null);
  const [selectedOnboardingLetter, setSelectedOnboardingLetter] = useState(null);
  const [idCardEmployee, setIdCardEmployee] = useState(null);

  // Employee Documents Hub & Preview Modal
  const [selectedDocEmployee, setSelectedDocEmployee] = useState(null);
  const [empDocsList, setEmpDocsList] = useState([]);
  const [docPreviewModal, setDocPreviewModal] = useState(null);

  // Employee Security & Portal Access Modal State
  const [accessModalEmployee, setAccessModalEmployee] = useState(null);
  const [accessForm, setAccessForm] = useState({
    employee_id: null,
    username: '',
    password: '',
    role_id: 3,
    is_active: 1,
    permissions: ['pos:billing']
  });
  
  // New Salary Process Employee Selector Modal State
  const [isNewSalaryModalOpen, setIsNewSalaryModalOpen] = useState(false);
  const [newSalarySearch, setNewSalarySearch] = useState('');
  const [newSalaryFilter, setNewSalaryFilter] = useState('all'); // 'all', 'pending', 'paid'
  
  // Interactive Process Payroll Modal State
  const [processingEmployee, setProcessingEmployee] = useState(null);
  const [payrollForm, setPayrollForm] = useState({
    employee_id: null,
    full_name: '',
    employee_code: '',
    designation: '',
    shop_id: 1,
    month_year: selectedMonth,
    total_days_in_month: 30,
    present_days: 30,
    paid_leaves: 0,
    unpaid_leaves: 0,
    overtime_hours: 0,
    overtime_rate: 150,
    monthly_basic: 20000,
    daily_wage: 667,
    earned_basic: 20000,
    hra: 4000,
    allowances: 1500,
    bonus: 0,
    overtime_pay: 0,
    gross_salary: 25500,
    pending_advance: 0,
    advance_deduction: 0,
    is_pf_eligible: false,
    uan_no: '',
    pf_rate_percent: 12,
    custom_pf_amount: 0,
    pf_deduction: 0,
    employer_pf: 0,
    other_deductions: 0,
    net_payable: 25500,
    payment_mode: 'BANK_TRANSFER',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_ref: '',
    notes: '',
    is_processed: false
  });

  // New/Edit Employee Form State (with Optional PF Settings & Auto EMP ID & Portal Privileges)
  const initialEmpForm = {
    shop_id: activeShop ? activeShop.id : 1,
    employee_code: '',
    full_name: '',
    phone: '',
    email: '',
    address: '',
    father_name: '',
    emergency_phone: '',
    blood_group: 'O+',
    gender: 'Male',
    date_of_birth: '',
    shift_type: 'GENERAL',
    date_of_joining: new Date().toISOString().slice(0, 10),
    designation: 'Cashier & Biller',
    department: 'Sales & Billing',
    monthly_basic_salary: 20000,
    daily_wage: 0,
    hra: 4000,
    special_allowance: 1500,
    overtime_rate_per_hour: 150,
    aadhaar_no: '',
    pan_no: '',
    bank_account: '',
    bank_ifsc: '',
    is_pf_eligible: false,
    uan_no: '',
    pf_rate_percent: 12,
    custom_pf_amount: 0,
    photo_url: '',
    username: '',
    password: '',
    role_id: 3, // Default Cashier
    create_login: false,
    permissions: ['pos:billing']
  };

  const [empForm, setEmpForm] = useState(initialEmpForm);

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    total_days: 1,
    reason: ''
  });

  // Advance Form State
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: 5000,
    reason: 'Personal staff urgent requirement'
  });

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (activeShop) {
      loadData();
    }
  }, [activeShop, activeTab, selectedMonth, selectedAttendanceDate]);

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/staff/roles');
      if (res.ok) setRoles(await res.json());
    } catch (e) {
      console.error('Error loading roles:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'employees') {
        const res = await fetch(`/api/hrms/employees?shopId=${activeShop.id}`);
        if (res.ok) setEmployees(await res.json());
      } else if (activeTab === 'attendance') {
        const res = await fetch(`/api/hrms/attendance?shopId=${activeShop.id}&date=${selectedAttendanceDate}`);
        if (res.ok) setAttendance(await res.json());
      } else if (activeTab === 'leaves') {
        const res = await fetch(`/api/hrms/leaves?shopId=${activeShop.id}`);
        if (res.ok) setLeaves(await res.json());
      } else if (activeTab === 'advances') {
        const res = await fetch(`/api/hrms/advances?shopId=${activeShop.id}`);
        if (res.ok) setAdvances(await res.json());
      } else if (activeTab === 'payroll') {
        const res = await fetch(`/api/hrms/payroll/calculate?shopId=${activeShop.id}&monthYear=${selectedMonth}`);
        if (res.ok) setPayrollSummary(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDocFileUpload = (docType, file) => {
    if (!file) return;

    // Check size limit: 500 KB (512,000 bytes)
    if (file.size > 512000) {
      alert(`⚠️ File "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 500 KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: {
          doc_type: docType,
          doc_name: KYC_DOCUMENT_TYPES.find(d => d.key === docType)?.label || docType,
          file_name: file.name,
          file_type: file.type || 'application/pdf',
          file_size: file.size,
          file_data: base64
        }
      }));

      // If passport photo, also set in empForm.photo_url for immediate avatar display
      if (docType === 'PASSPORT_PHOTO') {
        setEmpForm(prev => ({ ...prev, photo_url: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDoc = (docType) => {
    setUploadedDocs(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
    if (docType === 'PASSPORT_PHOTO') {
      setEmpForm(prev => ({ ...prev, photo_url: '' }));
    }
  };

  const openOnboardModal = async () => {
    setEditingEmployeeId(null);
    setUploadedDocs({});
    let nextCode = '';
    try {
      const res = await fetch('/api/hrms/employees/next-code');
      const data = await res.json();
      if (data.success) {
        nextCode = data.nextCode;
      }
    } catch (e) {}

    const generatedCode = nextCode || 'EMP-1005';
    setAutoEmpCode(generatedCode);
    const defaultRole = roles.find(r => r.id === 3) || roles[0];
    const initialPerms = defaultRole ? defaultRole.permissions : ['pos:billing'];
    setEmpForm({
      ...initialEmpForm,
      employee_code: generatedCode,
      shop_id: activeShop?.id || 1,
      role_id: defaultRole ? defaultRole.id : 3,
      permissions: initialPerms
    });
    setIsEmpModalOpen(true);
  };

  const handleRoleChangeInEmpForm = (roleId) => {
    const selectedRole = roles.find(r => r.id === roleId);
    setEmpForm(prev => ({
      ...prev,
      role_id: roleId,
      permissions: selectedRole ? [...selectedRole.permissions] : prev.permissions
    }));
  };

  const togglePortalInEmpForm = (module) => {
    setEmpForm(prev => {
      const currentPerms = prev.permissions || [];
      const hasAll = module.permissions.every(p => currentPerms.includes(p));
      let nextPerms;
      if (hasAll) {
        nextPerms = currentPerms.filter(p => !module.permissions.includes(p));
      } else {
        nextPerms = Array.from(new Set([...currentPerms, ...module.permissions]));
      }
      return { ...prev, permissions: nextPerms };
    });
  };

  const handleSelectAllPortalsInEmpForm = () => {
    const allPerms = PORTAL_MODULES.flatMap(m => m.permissions);
    setEmpForm(prev => ({ ...prev, permissions: Array.from(new Set(allPerms)) }));
  };

  const handleClearAllPortalsInEmpForm = () => {
    setEmpForm(prev => ({ ...prev, permissions: [] }));
  };

  const handleResetToRoleDefaultsInEmpForm = () => {
    const selectedRole = roles.find(r => r.id === empForm.role_id);
    if (selectedRole) {
      setEmpForm(prev => ({ ...prev, permissions: [...selectedRole.permissions] }));
    }
  };

  const openEditEmployeeModal = async (emp) => {
    setEditingEmployeeId(emp.id);
    setAutoEmpCode(emp.employee_code || '');
    setUploadedDocs({});
    
    // Load existing documents for this employee
    try {
      const res = await fetch(`/api/hrms/employees/${emp.id}/documents`);
      if (res.ok) {
        const docs = await res.json();
        const docObj = {};
        for (const d of docs) {
          docObj[d.doc_type] = d;
        }
        setUploadedDocs(docObj);
      }
    } catch (e) {
      console.error(e);
    }

    setEmpForm({
      id: emp.id,
      shop_id: emp.shop_id || activeShop.id,
      employee_code: emp.employee_code || '',
      full_name: emp.full_name || '',
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      father_name: emp.father_name || '',
      emergency_phone: emp.emergency_phone || '',
      blood_group: emp.blood_group || 'O+',
      gender: emp.gender || 'Male',
      date_of_birth: emp.date_of_birth || '',
      shift_type: emp.shift_type || 'GENERAL',
      date_of_joining: emp.date_of_joining || new Date().toISOString().slice(0, 10),
      designation: emp.designation || 'Staff',
      department: emp.department || 'Sales & Billing',
      monthly_basic_salary: emp.monthly_basic_salary || 0,
      daily_wage: emp.daily_wage || 0,
      hra: emp.hra || 0,
      special_allowance: emp.special_allowance || 0,
      overtime_rate_per_hour: emp.overtime_rate_per_hour || 0,
      aadhaar_no: emp.aadhaar_no || '',
      pan_no: emp.pan_no || '',
      bank_account: emp.bank_account || '',
      bank_ifsc: emp.bank_ifsc || '',
      is_pf_eligible: Boolean(emp.is_pf_eligible),
      uan_no: emp.uan_no || '',
      pf_rate_percent: emp.pf_rate_percent || 12,
      custom_pf_amount: emp.custom_pf_amount || 0,
      photo_url: emp.photo_url || '',
      username: emp.username || '',
      password: '',
      role_id: emp.role_id || 3,
      create_login: Boolean(emp.username),
      permissions: emp.effective_permissions || ['pos:billing'],
      status: emp.status || 'ACTIVE'
    });
    setIsEmpModalOpen(true);
  };

  // Open Portal Access & Security Modal for existing employee
  const openAccessModal = (emp) => {
    setAccessModalEmployee(emp);
    const suggestedUsername = (emp.full_name.split(' ')[0] + emp.employee_code.replace('EMP-', '')).toLowerCase().replace(/[^a-z0-9]/g, '');
    const empRole = roles.find(r => r.id === (emp.role_id || 3)) || roles[0];
    const initialPerms = emp.effective_permissions && emp.effective_permissions.length > 0
      ? emp.effective_permissions
      : (empRole ? empRole.permissions : ['pos:billing']);

    setAccessForm({
      employee_id: emp.id,
      shop_id: emp.shop_id || activeShop.id,
      username: emp.username || suggestedUsername,
      password: '',
      role_id: emp.role_id || 3,
      is_active: emp.login_is_active !== null && emp.login_is_active !== undefined ? emp.login_is_active : 1,
      permissions: initialPerms
    });
  };

  const handleRoleChangeInAccessForm = (roleId) => {
    const selectedRole = roles.find(r => r.id === roleId);
    setAccessForm(prev => ({
      ...prev,
      role_id: roleId,
      permissions: selectedRole ? [...selectedRole.permissions] : prev.permissions
    }));
  };

  const togglePortalInAccessForm = (module) => {
    setAccessForm(prev => {
      const hasAll = module.permissions.every(p => prev.permissions.includes(p));
      let nextPerms;
      if (hasAll) {
        nextPerms = prev.permissions.filter(p => !module.permissions.includes(p));
      } else {
        nextPerms = Array.from(new Set([...prev.permissions, ...module.permissions]));
      }
      return { ...prev, permissions: nextPerms };
    });
  };

  const handleSelectAllPortalsInAccess = () => {
    const allPerms = PORTAL_MODULES.flatMap(m => m.permissions);
    setAccessForm(prev => ({ ...prev, permissions: Array.from(new Set(allPerms)) }));
  };

  const handleClearAllPortalsInAccess = () => {
    setAccessForm(prev => ({ ...prev, permissions: [] }));
  };

  const handleResetToRoleDefaultsInAccess = () => {
    const selectedRole = roles.find(r => r.id === accessForm.role_id);
    if (selectedRole) {
      setAccessForm(prev => ({ ...prev, permissions: [...selectedRole.permissions] }));
    }
  };

  const handleSaveAccess = async (e) => {
    e.preventDefault();
    if (!accessModalEmployee) return;

    try {
      const res = await fetch(`/api/hrms/employees/${accessModalEmployee.id}/portal-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessForm)
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        setAccessModalEmployee(null);
        loadData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error updating portal access.');
    }
  };

  const openEmployeeDocsModal = async (emp) => {
    setSelectedDocEmployee(emp);
    try {
      const res = await fetch(`/api/hrms/employees/${emp.id}/documents`);
      if (res.ok) {
        setEmpDocsList(await res.json());
      } else {
        setEmpDocsList([]);
      }
    } catch (e) {
      console.error(e);
      setEmpDocsList([]);
    }
  };

  const handleSaveSingleDocInHub = async (empId, docType, file) => {
    if (!file) return;
    if (file.size > 512000) {
      alert(`⚠️ File "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 500 KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      const docPayload = {
        doc_type: docType,
        doc_name: KYC_DOCUMENT_TYPES.find(d => d.key === docType)?.label || docType,
        file_name: file.name,
        file_type: file.type || 'application/pdf',
        file_size: file.size,
        file_data: base64
      };

      try {
        const res = await fetch(`/api/hrms/employees/${empId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(docPayload)
        });
        const data = await res.json();
        if (data.success) {
          setNotification({ type: 'success', message: `${docPayload.doc_name} uploaded successfully.` });
          const docsRes = await fetch(`/api/hrms/employees/${empId}/documents`);
          if (docsRes.ok) setEmpDocsList(await docsRes.json());
          loadData();
        }
      } catch (err) {
        alert('Error uploading document.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSingleDocInHub = async (docId, empId) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      const res = await fetch(`/api/hrms/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        const docsRes = await fetch(`/api/hrms/employees/${empId}/documents`);
        if (docsRes.ok) setEmpDocsList(await docsRes.json());
        loadData();
      }
    } catch (e) {
      alert('Error deleting document.');
    }
  };

  const handleToggleEmployeeStatus = async (emp) => {
    try {
      const res = await fetch(`/api/hrms/employees/${emp.id}/toggle`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        loadData();
      } else {
        alert(data.message || 'Error updating status');
      }
    } catch (err) {
      alert('Error connecting to server.');
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!confirm(`Are you sure you want to remove employee "${emp.full_name}" (${emp.employee_code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/hrms/employees/${emp.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        loadData();
      } else {
        alert(data.message || 'Error deleting employee');
      }
    } catch (err) {
      alert('Error connecting to server.');
    }
  };

  // Open the Interactive Process Payroll Modal
  const openProcessPayrollModal = (record) => {
    const totalDays = Number(record.total_days_in_month || 30);
    const presentDays = Number(record.present_days !== undefined ? record.present_days : totalDays);
    const paidLeaves = Number(record.paid_leaves || 0);
    const unpaidLeaves = Number(record.unpaid_leaves || 0);
    const monthlyBasic = Number(record.monthly_basic || record.basic_pay || 0);
    const dailyWage = totalDays > 0 ? Math.round(monthlyBasic / totalDays) : 0;
    
    const effectiveDays = presentDays + paidLeaves;
    const earnedBasic = record.is_processed ? Number(record.basic_pay || record.earned_basic || 0) : Math.round(dailyWage * effectiveDays);
    const hra = Number(record.hra || 0);
    const allowances = Number(record.allowances || 0);
    const bonus = Number(record.bonus || 0);
    const overtimeHours = Number(record.overtime_hours || 0);
    const overtimeRate = Number(record.overtime_rate || record.overtime_rate_per_hour || 150);
    const overtimePay = record.is_processed ? Number(record.overtime_pay || 0) : Math.round(overtimeHours * overtimeRate);
    
    const grossSalary = earnedBasic + hra + allowances + bonus + overtimePay;
    const pendingAdv = Number(record.pending_advance || 0);
    const advanceDeduction = record.is_processed ? Number(record.advance_deduction || 0) : Math.min(pendingAdv, grossSalary);
    
    // Optional PF deduction calculation
    const isPfEligible = Boolean(record.is_pf_eligible || (Number(record.pf_deduction) > 0));
    const pfDeduction = Number(record.pf_deduction || 0);
    const otherDeductions = Number(record.other_deductions || 0);
    const netPayable = Math.max(0, grossSalary - advanceDeduction - pfDeduction - otherDeductions);

    setProcessingEmployee(record);
    setPayrollForm({
      employee_id: record.employee_id,
      full_name: record.full_name,
      employee_code: record.employee_code,
      designation: record.designation,
      shop_id: record.shop_id || activeShop?.id || 1,
      month_year: selectedMonth,
      total_days_in_month: totalDays,
      present_days: presentDays,
      paid_leaves: paidLeaves,
      unpaid_leaves: unpaidLeaves,
      overtime_hours: overtimeHours,
      overtime_rate: overtimeRate,
      monthly_basic: monthlyBasic,
      daily_wage: dailyWage,
      earned_basic: earnedBasic,
      hra: hra,
      allowances: allowances,
      bonus: bonus,
      overtime_pay: overtimePay,
      gross_salary: grossSalary,
      pending_advance: pendingAdv,
      advance_deduction: advanceDeduction,
      is_pf_eligible: isPfEligible,
      uan_no: record.uan_no || '',
      pf_rate_percent: record.pf_rate_percent || 12,
      custom_pf_amount: record.custom_pf_amount || 0,
      pf_deduction: pfDeduction,
      employer_pf: pfDeduction,
      other_deductions: otherDeductions,
      net_payable: netPayable,
      payment_mode: record.payment_mode || 'BANK_TRANSFER',
      payment_date: record.payment_date || new Date().toISOString().slice(0, 10),
      payment_ref: record.payment_ref || '',
      notes: record.notes || '',
      is_processed: Boolean(record.is_processed)
    });
  };

  // Real-time payroll calculation in modal as owner adjusts working days / overtime / PF / deductions
  const updatePayrollCalculations = (updates) => {
    setPayrollForm(prev => {
      const next = { ...prev, ...updates };

      const totalDays = Number(next.total_days_in_month || 30);
      const present = Number(next.present_days || 0);
      const paidLeaves = Number(next.paid_leaves || 0);
      const monthlyBasic = Number(next.monthly_basic || 0);
      
      const dailyWage = totalDays > 0 ? (monthlyBasic / totalDays) : 0;
      next.daily_wage = Math.round(dailyWage);

      // Recalculate earned basic if present/paid days changed
      if (updates.present_days !== undefined || updates.paid_leaves !== undefined || updates.total_days_in_month !== undefined || updates.monthly_basic !== undefined) {
        const effective = present + paidLeaves;
        next.earned_basic = Math.round(dailyWage * effective);
      }

      // Overtime
      const otHours = Number(next.overtime_hours || 0);
      const otRate = Number(next.overtime_rate || 0);
      next.overtime_pay = Math.round(otHours * otRate);

      // Gross
      const earnedBasic = Number(next.earned_basic || 0);
      const hra = Number(next.hra || 0);
      const allowances = Number(next.allowances || 0);
      const bonus = Number(next.bonus || 0);
      const otPay = Number(next.overtime_pay || 0);
      next.gross_salary = earnedBasic + hra + allowances + bonus + otPay;

      // Optional PF Calculation
      if (next.is_pf_eligible && updates.is_pf_eligible === true && next.pf_deduction === 0) {
        // Automatically default to 12% if newly toggled on
        next.pf_deduction = next.custom_pf_amount > 0 ? Number(next.custom_pf_amount) : Math.round(earnedBasic * (Number(next.pf_rate_percent || 12) / 100));
        next.employer_pf = next.pf_deduction;
      } else if (!next.is_pf_eligible && updates.is_pf_eligible === false) {
        next.pf_deduction = 0;
        next.employer_pf = 0;
      }

      // Net Take-Home Salary
      const advDeduct = Number(next.advance_deduction || 0);
      const pfDeduct = Number(next.pf_deduction || 0);
      const otherDeduct = Number(next.other_deductions || 0);
      next.net_payable = Math.max(0, next.gross_salary - advDeduct - pfDeduct - otherDeduct);

      return next;
    });
  };

  const handleProcessAndSavePayroll = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...payrollForm,
        shop_id: activeShop.id,
        month_year: selectedMonth
      };

      const res = await fetch('/api/hrms/payroll/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        setProcessingEmployee(null);
        if (data.payroll) {
          setSelectedSalarySlip(data.payroll);
        }
        loadData();
      } else {
        alert(data.message || 'Error processing payroll.');
      }
    } catch (err) {
      alert('Error submitting payroll run.');
    }
  };

  const handleResetPayroll = async () => {
    if (!confirm(`Are you sure you want to re-open/reset payroll for ${payrollForm.full_name} for ${selectedMonth}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/hrms/payroll/reset?shopId=${activeShop.id}&monthYear=${selectedMonth}&employeeId=${payrollForm.employee_id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        setProcessingEmployee(null);
        loadData();
      } else {
        alert(data.message || 'Error resetting payroll');
      }
    } catch (err) {
      alert('Error resetting payroll');
    }
  };

  // Bulk Process All Unpaid Employees
  const handleBulkProcessPayroll = async () => {
    const unpaid = payrollSummary.filter(r => !r.is_processed);
    if (unpaid.length === 0) {
      alert('All staff members have already been processed for ' + selectedMonth);
      return;
    }

    if (!confirm(`Process and disburse payroll for all ${unpaid.length} pending staff members for ${selectedMonth}?`)) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    for (const rec of unpaid) {
      try {
        await fetch('/api/hrms/payroll/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...rec,
            shop_id: activeShop.id,
            month_year: selectedMonth
          })
        });
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
    setNotification({ type: 'success', message: `Processed salary payroll for ${successCount} employees!` });
    loadData();
  };

  // Quick Attendance Actions
  const handleMarkBatchAttendance = async (status) => {
    try {
      const res = await fetch('/api/hrms/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: activeShop.id,
          date: selectedAttendanceDate,
          status: status
        })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        loadData();
      }
    } catch (err) {
      alert('Error marking attendance.');
    }
  };

  const handleUpdateIndividualAttendance = async (empId, newStatus) => {
    try {
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await fetch('/api/hrms/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          shop_id: activeShop.id,
          date: selectedAttendanceDate,
          status: newStatus,
          check_in_time: newStatus === 'ABSENT' ? null : nowTime
        })
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...empForm,
        shop_id: activeShop.id,
        id: editingEmployeeId || undefined,
        documents: Object.values(uploadedDocs)
      };
      const res = await fetch('/api/hrms/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsEmpModalOpen(false);
        setNotification({ 
          type: 'success', 
          message: editingEmployeeId 
            ? `Employee profile "${empForm.full_name}" updated successfully!` 
            : `New employee "${empForm.full_name}" (${data.employee_code || autoEmpCode}) onboarded successfully!` 
        });
        loadData();

        // If newly created employee, automatically open the Welcome & Appointment Onboarding Letter!
        if (!editingEmployeeId && data.employee) {
          setSelectedOnboardingLetter(data.employee);
        }
      } else {
        alert(data.message || 'Error saving employee.');
      }
    } catch (err) {
      alert('Error saving employee.');
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hrms/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leaveForm, shop_id: activeShop.id })
      });
      const data = await res.json();
      if (data.success) {
        setIsLeaveModalOpen(false);
        setNotification({ type: 'success', message: 'Leave application submitted successfully!' });
        loadData();
      }
    } catch (err) {
      alert('Error applying leave.');
    }
  };

  const handleUpdateLeaveStatus = async (leaveId, status) => {
    try {
      const res = await fetch(`/api/hrms/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId: user?.id })
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Leave application ${status.toLowerCase()} successfully.` });
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleIssueAdvance = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hrms/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...advanceForm, shop_id: activeShop.id })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdvanceModalOpen(false);
        setNotification({ type: 'success', message: 'Salary advance recorded successfully!' });
        loadData();
      }
    } catch (err) {
      alert('Error issuing advance.');
    }
  };

  // Summary Metrics for Payroll Tab
  const totalPayrollBudget = payrollSummary.reduce((acc, r) => acc + Number(r.gross_salary || 0), 0);
  const totalNetDisbursed = payrollSummary.filter(r => r.is_processed).reduce((acc, r) => acc + Number(r.net_payable || 0), 0);
  const pendingStaffCount = payrollSummary.filter(r => !r.is_processed).length;
  const processedStaffCount = payrollSummary.filter(r => r.is_processed).length;

  // RBAC Access Guard: Only store owner or users with HRMS permissions can access
  if (!canAccessHrms) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}>
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
          <ShieldCheck className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          You do not have administrative permission to view or manage the HRMS & Staff Payroll Portal. Only the store owner or authorized managers can access employee payroll and salary records.
        </p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top HRMS Toolbar */}
      <div className={`border-b px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              HRMS & Staff Payroll Management Portal
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              {activeShop?.name}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage staff profiles, track daily working attendance, approve leaves, manage advances, optional PF deduction, and process monthly salaries.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className={`flex items-center space-x-1 border p-1 rounded-xl ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}>
          {[
            { id: 'employees', label: 'Staff Directory', icon: Users },
            { id: 'attendance', label: 'Attendance & Working Days', icon: Clock },
            { id: 'leaves', label: 'Leaves & Holidays', icon: Calendar },
            { id: 'advances', label: 'Salary Advances', icon: DollarSign },
            { id: 'payroll', label: 'Process Payroll & Slips', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSel
                    ? 'bg-purple-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* Tab 1: Staff Directory (Rich Grid, Table, Compact & Org Views) */}
        {activeTab === 'employees' && (
          <StaffDirectoryView
            employees={employees}
            isOwner={isOwner}
            isDark={isDark}
            activeShop={activeShop}
            roles={roles}
            payrollSummary={payrollSummary}
            openOnboardModal={openOnboardModal}
            openEditEmployeeModal={openEditEmployeeModal}
            openEmployeeDocsModal={openEmployeeDocsModal}
            setSelectedOnboardingLetter={setSelectedOnboardingLetter}
            setIdCardEmployee={setIdCardEmployee}
            openAccessModal={openAccessModal}
            handleToggleEmployeeStatus={handleToggleEmployeeStatus}
            handleDeleteEmployee={handleDeleteEmployee}
            openProcessPayrollModal={openProcessPayrollModal}
            setActiveTab={setActiveTab}
          />
        )}

        {/* Tab 2: Attendance Register & Working Days */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* SUB-TAB VIEW SWITCHER */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAttendanceSubTab('daily')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    attendanceSubTab === 'daily'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Daily Attendance Register</span>
                </button>
                <button
                  onClick={() => setAttendanceSubTab('analytics')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    attendanceSubTab === 'analytics'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Employee Analytics (Week / Month / Year)</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500 text-white rounded-full uppercase font-bold">New</span>
                </button>
              </div>

              {attendanceSubTab === 'daily' && (
                <div className="text-xs text-slate-400">
                  Select a single date to mark check-ins and daily status.
                </div>
              )}
            </div>

            {/* VIEW 1: ADVANCED EMPLOYEE ATTENDANCE ANALYTICS (WEEK / MONTH / YEAR) */}
            {attendanceSubTab === 'analytics' ? (
              <AttendanceAnalytics
                activeShop={activeShop}
                employees={employees}
                isOwner={isOwner}
                onAttendanceUpdated={loadData}
              />
            ) : (
              /* VIEW 2: DAILY ATTENDANCE REGISTER */
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Staff Attendance & Daily Working Hours Register
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatic check-in is logged on POS login. Shop owner can stamp or adjust attendance for any date.
                    </p>
                  </div>

                  {/* Date Filter & Batch Actions */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={selectedAttendanceDate}
                      onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                      className={`border rounded-xl px-3 py-1.5 text-xs outline-none font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />

                    {isOwner && (
                      <button
                        onClick={() => handleMarkBatchAttendance('PRESENT')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center space-x-1 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark All Present</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Attendance Table */}
                <div className={`border rounded-2xl overflow-hidden shadow-lg ${
                  isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
                }`}>
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                  isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Check-In Time</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4 text-right">Quick Update</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {attendance.map((att, idx) => {
                    const isPresent = att.status === 'PRESENT';
                    const isHalfDay = att.status === 'HALF_DAY';
                    const isPaidLeave = att.status === 'PAID_LEAVE';

                    return (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-4">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{att.full_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{att.employee_code}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{att.designation}</td>
                        <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {att.check_in_time || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                            isPresent 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' 
                              : isHalfDay
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                                : isPaidLeave
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30'
                          }`}>
                            {att.status || 'ABSENT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {att.work_hours ? `${att.work_hours} hrs` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end items-center space-x-1 text-[10px]">
                            <button
                              onClick={() => handleUpdateIndividualAttendance(att.employee_id, 'PRESENT')}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleUpdateIndividualAttendance(att.employee_id, 'HALF_DAY')}
                              className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold"
                            >
                              Half Day
                            </button>
                            <button
                              onClick={() => handleUpdateIndividualAttendance(att.employee_id, 'PAID_LEAVE')}
                              className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-semibold"
                            >
                              Leave
                            </button>
                            <button
                              onClick={() => handleUpdateIndividualAttendance(att.employee_id, 'ABSENT')}
                              className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold"
                            >
                              Absent
                            </button>
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
      </div>
    )}

        {/* Tab 3: Leaves & Approvals */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Leave Applications & Approvals ({leaves.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Approved Paid Leaves are automatically factored into the employee's monthly basic pay calculation.
                </p>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Apply Staff Leave</span>
              </button>
            </div>

            <div className={`border rounded-2xl overflow-hidden shadow-lg ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                  isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Owner Approval</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {leaves.map((l) => (
                    <tr key={l.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{l.employee_name} ({l.employee_code})</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-300">{l.leave_type}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{l.start_date} to {l.end_date}</td>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{l.total_days} Days</td>
                      <td className="py-3 px-4 text-slate-400">{l.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'APPROVED' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' 
                            : (l.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30')
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {l.status === 'PENDING' && isOwner && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'APPROVED')}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shadow"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Advances */}
        {activeTab === 'advances' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Staff Salary Advances & Emergency Loans
                </h2>
                <p className="text-xs text-slate-400">
                  Track pending advance balances and automatically recover them during monthly salary processing.
                </p>
              </div>
              <button
                onClick={() => setIsAdvanceModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Advance</span>
              </button>
            </div>

            <div className={`border rounded-2xl overflow-hidden shadow-lg ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                  isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Advance Amount</th>
                    <th className="py-3 px-4">Date Issued</th>
                    <th className="py-3 px-4">Purpose / Reason</th>
                    <th className="py-3 px-4">Recovery Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {advances.map((adv) => (
                    <tr key={adv.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{adv.employee_name} ({adv.employee_code})</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-500">₹{adv.amount?.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{adv.date}</td>
                      <td className="py-3 px-4 text-slate-400">{adv.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          adv.status === 'RECOVERED' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                        }`}>
                          {adv.status === 'RECOVERED' ? 'RECOVERED IN SALARY' : 'PENDING RECOVERY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Process Payroll & Salary Slips */}
        {activeTab === 'payroll' && (
          <div className="space-y-4">
            {/* Top Payroll Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border shadow-sm ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Staff</span>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{payrollSummary.length} Employees</div>
                <span className="text-[10px] text-slate-500">Active payroll count</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Salaries Processed (Paid)</span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{processedStaffCount} / {payrollSummary.length}</div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-500">Disbursed: ₹{totalNetDisbursed.toLocaleString('en-IN')}</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Pending To Process</span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingStaffCount} Staff</div>
                <span className="text-[10px] text-amber-700 dark:text-amber-500">Requires review & processing</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Gross Payroll Budget</span>
                <div className="text-xl font-black text-brand-600 dark:text-brand-400 mt-1">₹{totalPayrollBudget.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-slate-500">For Month: {selectedMonth}</span>
              </div>
            </div>

            {/* Header with Month Picker & Bulk Process Button */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Monthly Payroll Runs & Salary Slips
                </h2>
                <p className="text-xs text-slate-400">
                  Click <strong>Process & Pay</strong> on any individual employee to adjust days, add bonuses, apply optional PF deduction, recover advances, and generate their formal salary slip.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1.5 border rounded-xl px-2.5 py-1.5 bg-slate-900/50">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] text-slate-400 font-semibold">Month:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                  />
                </div>

                {/* + New Salary Process Button */}
                {canManagePayroll && (
                  <button
                    onClick={() => {
                      setNewSalarySearch('');
                      setNewSalaryFilter('all');
                      setIsNewSalaryModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/25 flex items-center space-x-1.5 transition-all active:scale-95"
                    title="Start New Salary Processing for an Employee"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Process New Salary</span>
                  </button>
                )}

                {canManagePayroll && pendingStaffCount > 0 && (
                  <button
                    onClick={handleBulkProcessPayroll}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Process All ({pendingStaffCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Payroll Table */}
            <div className={`border rounded-2xl overflow-hidden shadow-xl ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                  isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4 text-center">Days Worked</th>
                    <th className="py-3.5 px-4 text-right">Earned Basic</th>
                    <th className="py-3.5 px-4 text-right">Gross Salary</th>
                    <th className="py-3.5 px-4 text-right">PF Deduction</th>
                    <th className="py-3.5 px-4 text-right">Advance Recovery</th>
                    <th className="py-3.5 px-4 text-right">Net Payable</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action & Slip</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {payrollSummary.map((rec, idx) => {
                    const isProcessed = Boolean(rec.is_processed);
                    const pfDeduct = Number(rec.pf_deduction || 0);

                    return (
                      <tr key={idx} className={`font-mono ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                        <td className="py-3.5 px-4">
                          <div className={`font-bold font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>{rec.full_name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                            <span>{rec.employee_code}</span>
                            {rec.is_pf_eligible && <span className="text-cyan-400 font-bold text-[9px]">• PF</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-sans">{rec.designation}</td>
                        <td className={`py-3.5 px-4 text-center ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          <span className="font-bold">{rec.present_days}</span> / {rec.total_days_in_month}
                          {Number(rec.paid_leaves) > 0 && <span className="text-[10px] text-purple-400 block font-sans">({rec.paid_leaves} leaves)</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right">₹{Number(rec.earned_basic || rec.basic_pay || 0).toLocaleString('en-IN')}</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          ₹{Number(rec.gross_salary || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {pfDeduct > 0 ? (
                            <span className="text-cyan-600 dark:text-cyan-400 font-bold">-₹{pfDeduct.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-rose-500 font-bold">
                          {Number(rec.advance_deduction) > 0 ? `-₹${Number(rec.advance_deduction).toLocaleString('en-IN')}` : '₹0'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          ₹{Number(rec.net_payable || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                            isProcessed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                          }`}>
                            {isProcessed ? 'PAID' : 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <div className="flex justify-end items-center space-x-1.5">
                            {/* Process & Pay Modal Button */}
                            <button
                              onClick={() => openProcessPayrollModal(rec)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-1 ${
                                isProcessed
                                  ? 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20'
                              }`}
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>{isProcessed ? 'Adjust' : 'Process & Pay'}</span>
                            </button>

                            {/* View / Print Salary Slip */}
                            <button
                              onClick={() => setSelectedSalarySlip(rec)}
                              className={`p-1.5 rounded-xl border transition-all ${
                                isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                              }`}
                              title="Print / View Official Salary Slip"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
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
      </div>

      {/* ========================================================= */}
      {/* 1. INTERACTIVE PROCESS PAYROLL & SALARY MODAL (WITH OPTIONAL PF) */}
      {/* ========================================================= */}
      {processingEmployee && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 my-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 border-b border-purple-700/50 flex justify-between items-center text-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Process Salary & Payroll ({payrollForm.month_year})</h3>
                  <p className="text-xs text-purple-200 font-medium">
                    {payrollForm.full_name} • <span className="font-mono">{payrollForm.employee_code}</span> ({payrollForm.designation})
                  </p>
                </div>
              </div>
              <button onClick={() => setProcessingEmployee(null)} className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800/50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleProcessAndSavePayroll} className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Section 1: Working Days & Attendance Breakdown */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center border-b pb-2 border-slate-700/40">
                  <span className="font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4" />
                    <span>1. Working Days & Attendance Calculation</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Daily Wage Rate: <strong>₹{payrollForm.daily_wage}</strong> / day
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Month Total Days</label>
                    <input
                      type="number"
                      value={payrollForm.total_days_in_month}
                      onChange={(e) => updatePayrollCalculations({ total_days_in_month: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono font-bold outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Present (Days Worked) *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={payrollForm.present_days}
                      onChange={(e) => updatePayrollCalculations({ present_days: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono font-black text-emerald-600 dark:text-emerald-400 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-purple-600 dark:text-purple-400 font-semibold mb-1">Paid Leaves (Days)</label>
                    <input
                      type="number"
                      value={payrollForm.paid_leaves}
                      onChange={(e) => updatePayrollCalculations({ paid_leaves: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-rose-500 font-semibold mb-1">Unpaid Leaves / LOP</label>
                    <input
                      type="number"
                      value={payrollForm.unpaid_leaves}
                      onChange={(e) => updatePayrollCalculations({ unpaid_leaves: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-rose-400' : 'bg-white border-slate-300 text-rose-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Overtime Hours Worked</label>
                    <input
                      type="number"
                      value={payrollForm.overtime_hours}
                      onChange={(e) => updatePayrollCalculations({ overtime_hours: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                      placeholder="e.g. 10 hours"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Overtime Rate / Hour (₹)</label>
                    <input
                      type="number"
                      value={payrollForm.overtime_rate}
                      onChange={(e) => updatePayrollCalculations({ overtime_rate: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Earnings & Allowances Structure */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center border-b pb-2 border-slate-700/40">
                  <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>2. Salary Earnings & Allowances Breakdown</span>
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    Gross: ₹{payrollForm.gross_salary?.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Basic Pay Earned (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={payrollForm.earned_basic}
                      onChange={(e) => updatePayrollCalculations({ earned_basic: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500">From monthly basic: ₹{payrollForm.monthly_basic}</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">House Rent Allowance (HRA)</label>
                    <input
                      type="number"
                      value={payrollForm.hra}
                      onChange={(e) => updatePayrollCalculations({ hra: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Special Allowances (₹)</label>
                    <input
                      type="number"
                      value={payrollForm.allowances}
                      onChange={(e) => updatePayrollCalculations({ allowances: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Bonus / Festival Incentive (₹)</label>
                    <input
                      type="number"
                      value={payrollForm.bonus}
                      onChange={(e) => updatePayrollCalculations({ bonus: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                      placeholder="e.g. 2000"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Overtime Pay (₹)</label>
                    <input
                      type="number"
                      value={payrollForm.overtime_pay}
                      onChange={(e) => updatePayrollCalculations({ overtime_pay: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono font-bold text-purple-400 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Optional PF (Provident Fund) & Statutory Deductions */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center border-b pb-2 border-slate-700/40">
                  <span className="font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center space-x-1.5">
                    <Award className="w-4 h-4" />
                    <span>3. Optional Provident Fund (PF) & Statutory Deductions</span>
                  </span>
                  <span className="text-xs font-black text-rose-500 font-mono">
                    Total Deductions: -₹{(Number(payrollForm.advance_deduction || 0) + Number(payrollForm.pf_deduction || 0) + Number(payrollForm.other_deductions || 0)).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Optional PF Switcher Card */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  payrollForm.is_pf_eligible
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payrollForm.is_pf_eligible}
                        onChange={(e) => updatePayrollCalculations({ is_pf_eligible: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                          Include Provident Fund (PF) Deduction for this salary slip
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Optional employee PF contribution (standard 12% of Basic or custom amount)
                        </span>
                      </div>
                    </label>

                    {payrollForm.is_pf_eligible && (
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        PF ACTIVE
                      </span>
                    )}
                  </div>

                  {payrollForm.is_pf_eligible && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-cyan-500/20 animate-in fade-in">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Employee PF Deduction (₹) *</label>
                        <input
                          type="number"
                          value={payrollForm.pf_deduction}
                          onChange={(e) => updatePayrollCalculations({ pf_deduction: parseFloat(e.target.value) || 0 })}
                          className={`w-full border rounded-xl p-2 font-mono font-bold text-cyan-400 outline-none ${
                            isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                          }`}
                        />
                        <div className="flex space-x-1 mt-1">
                          <button
                            type="button"
                            onClick={() => updatePayrollCalculations({ pf_deduction: Math.round(Number(payrollForm.earned_basic || 0) * 0.12) })}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                          >
                            12% Basic (₹{Math.round(Number(payrollForm.earned_basic || 0) * 0.12)})
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePayrollCalculations({ pf_deduction: 1800 })}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                          >
                            ₹1,800
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Employer PF Contribution (₹)</label>
                        <input
                          type="number"
                          value={payrollForm.employer_pf}
                          onChange={(e) => updatePayrollCalculations({ employer_pf: parseFloat(e.target.value) || 0 })}
                          className={`w-full border rounded-xl p-2 font-mono outline-none ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                          }`}
                        />
                        <span className="text-[10px] text-slate-400">Employer statutory benefit</span>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">EPF UAN / Account No</label>
                        <input
                          type="text"
                          value={payrollForm.uan_no}
                          onChange={(e) => setPayrollForm({ ...payrollForm, uan_no: e.target.value })}
                          className={`w-full border rounded-xl p-2 font-mono outline-none ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                          }`}
                          placeholder="e.g. 101234567890"
                        />
                        <span className="text-[10px] text-slate-400">Printed on salary slip</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advance Deductions & Other Deductions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-rose-400">Staff Advance Recovery (₹)</label>
                      {payrollForm.pending_advance > 0 && (
                        <span className="text-[10px] text-amber-400 font-bold">
                          Pending Loan: ₹{payrollForm.pending_advance}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={payrollForm.advance_deduction}
                      onChange={(e) => updatePayrollCalculations({ advance_deduction: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono font-bold text-rose-400 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                    {payrollForm.pending_advance > 0 && (
                      <div className="flex space-x-1.5 mt-1.5">
                        <button
                          type="button"
                          onClick={() => updatePayrollCalculations({ advance_deduction: payrollForm.pending_advance })}
                          className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/20"
                        >
                          Deduct Full (₹{payrollForm.pending_advance})
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePayrollCalculations({ advance_deduction: Math.round(payrollForm.pending_advance / 2) })}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                        >
                          Deduct 50%
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePayrollCalculations({ advance_deduction: 0 })}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Other Deductions / Tax / Penalty (₹)</label>
                    <input
                      type="number"
                      value={payrollForm.other_deductions}
                      onChange={(e) => updatePayrollCalculations({ other_deductions: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono font-bold text-rose-400 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Net Payable & Payment Disbursement */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">NET TAKE-HOME SALARY PAYABLE:</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      ₹{payrollForm.net_payable?.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-emerald-200/80 italic mt-0.5 font-medium">
                      {numberToIndianWords(payrollForm.net_payable)}
                    </p>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Payment Mode</label>
                    <select
                      value={payrollForm.payment_mode}
                      onChange={(e) => setPayrollForm({ ...payrollForm, payment_mode: e.target.value })}
                      className="border rounded-xl px-3 py-1.5 text-xs font-bold bg-slate-900 border-slate-700 text-white outline-none cursor-pointer"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="CASH">Cash in Hand</option>
                      <option value="CHEQUE">Bank Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Disbursement / Payment Date</label>
                    <input
                      type="date"
                      value={payrollForm.payment_date}
                      onChange={(e) => setPayrollForm({ ...payrollForm, payment_date: e.target.value })}
                      className="w-full border rounded-xl p-2 font-mono bg-slate-900 border-slate-700 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">UTR / Ref No / Notes</label>
                    <input
                      type="text"
                      value={payrollForm.payment_ref}
                      onChange={(e) => setPayrollForm({ ...payrollForm, payment_ref: e.target.value })}
                      className="w-full border rounded-xl p-2 font-mono bg-slate-900 border-slate-700 text-white outline-none"
                      placeholder="e.g. UTR-98765432"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <div>
                  {payrollForm.is_processed && (
                    <button
                      type="button"
                      onClick={handleResetPayroll}
                      className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center space-x-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-open / Reset Salary</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setProcessingEmployee(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center space-x-2 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm & Generate Pay Slip</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ONBOARD / EDIT EMPLOYEE MODAL (WITH DOCUMENTS & AUTO ID) */}
      {/* ========================================================= */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex justify-between items-center shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  editingEmployeeId 
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' 
                    : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                }`}>
                  {editingEmployeeId ? <Edit3 className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`text-sm font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>{editingEmployeeId ? `Edit Staff: ${empForm.full_name}` : 'Onboard New Store Employee & Portal Account'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingEmployeeId ? 'Update employee salary structure, documents & portal login.' : 'Auto-generates EMP ID, saves salary structure, attaches KYC verification documents & issues welcome letter.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Auto-Generated EMP ID Badge */}
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 flex items-center space-x-1">
                  <span>ID:</span>
                  <span className="text-white">{empForm.employee_code || autoEmpCode}</span>
                  <span className="text-[9px] text-purple-400 opacity-80 font-sans">({editingEmployeeId ? 'Assigned' : 'Auto-Gen'})</span>
                </span>
                <button 
                  onClick={() => setIsEmpModalOpen(false)} 
                  className={`p-1.5 rounded-xl border text-slate-400 hover:text-white transition-all ${
                    isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEmployee} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Section 1: Basic Profile Information */}
              <div className={`p-4 border rounded-2xl space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5 text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>1. Employee Personal & Contact Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={empForm.full_name}
                      onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-semibold outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Mobile Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={empForm.phone}
                      onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Designation *</label>
                    <input
                      type="text"
                      required
                      value={empForm.designation}
                      onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                      className={`w-full border rounded-xl p-2 outline-none font-medium ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="e.g. Senior Cashier & Biller"
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Department</label>
                    <select
                      value={empForm.department}
                      onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                      className={`w-full border rounded-xl p-2 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="Sales & Billing">Sales & Billing</option>
                      <option value="Inventory & Stock">Inventory & Stock</option>
                      <option value="Operations">Operations</option>
                      <option value="Accounts & Finance">Accounts & Finance</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Date of Joining</label>
                    <input
                      type="date"
                      value={empForm.date_of_joining}
                      onChange={(e) => setEmpForm({ ...empForm, date_of_joining: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Father / Guardian Name</label>
                    <input
                      type="text"
                      value={empForm.father_name}
                      onChange={(e) => setEmpForm({ ...empForm, father_name: e.target.value })}
                      className={`w-full border rounded-xl p-2 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="e.g. Ramesh Sharma"
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Emergency Phone</label>
                    <input
                      type="text"
                      value={empForm.emergency_phone}
                      onChange={(e) => setEmpForm({ ...empForm, emergency_phone: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="+91 99887 76655"
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Email Address</label>
                    <input
                      type="email"
                      value={empForm.email}
                      onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="employee@gmail.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Blood Group</label>
                    <select
                      value={empForm.blood_group || 'O+'}
                      onChange={(e) => setEmpForm({ ...empForm, blood_group: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-bold outline-none cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-rose-400' : 'bg-white border-slate-300 text-rose-600'
                      }`}
                    >
                      <option value="O+">O+ (Universal Donor)</option>
                      <option value="A+">A+</option>
                      <option value="B+">B+</option>
                      <option value="AB+">AB+ (Universal Recipient)</option>
                      <option value="O-">O-</option>
                      <option value="A-">A-</option>
                      <option value="B-">B-</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Gender</label>
                    <select
                      value={empForm.gender || 'Male'}
                      onChange={(e) => setEmpForm({ ...empForm, gender: e.target.value })}
                      className={`w-full border rounded-xl p-2 outline-none cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Date of Birth</label>
                    <input
                      type="date"
                      value={empForm.date_of_birth || ''}
                      onChange={(e) => setEmpForm({ ...empForm, date_of_birth: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Shift Timing</label>
                    <select
                      value={empForm.shift_type || 'GENERAL'}
                      onChange={(e) => setEmpForm({ ...empForm, shift_type: e.target.value })}
                      className={`w-full border rounded-xl p-2 outline-none cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="GENERAL">General (09:00 - 18:00)</option>
                      <option value="MORNING">Morning (07:00 - 16:00)</option>
                      <option value="EVENING">Evening (13:00 - 22:00)</option>
                      <option value="NIGHT">Night (21:00 - 06:00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Residential Address</label>
                  <input
                    type="text"
                    value={empForm.address}
                    onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                    className={`w-full border rounded-xl p-2 outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    placeholder="House No, Street, City, State, PIN"
                  />
                </div>
              </div>

              {/* Section 2: Salary Structure */}
              <div className={`p-4 border rounded-2xl space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1.5 text-xs uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  <span>2. Monthly Salary Structure & Compensation (INR)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Monthly Basic (₹) *</label>
                    <input
                      type="number"
                      required
                      value={empForm.monthly_basic_salary}
                      onChange={(e) => setEmpForm({ ...empForm, monthly_basic_salary: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">HRA Allowance (₹)</label>
                    <input
                      type="number"
                      value={empForm.hra}
                      onChange={(e) => setEmpForm({ ...empForm, hra: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Special Allowance (₹)</label>
                    <input
                      type="number"
                      value={empForm.special_allowance}
                      onChange={(e) => setEmpForm({ ...empForm, special_allowance: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Overtime Rate (₹/hr)</label>
                    <input
                      type="number"
                      value={empForm.overtime_rate_per_hour}
                      onChange={(e) => setEmpForm({ ...empForm, overtime_rate_per_hour: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-purple-400' : 'bg-white border-slate-300 text-purple-700 font-bold'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Optional PF (Provident Fund) Configuration */}
              <div className={`p-4 border rounded-2xl space-y-2.5 transition-all ${
                empForm.is_pf_eligible
                  ? 'border-cyan-500/40 bg-cyan-500/10'
                  : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empForm.is_pf_eligible}
                      onChange={(e) => setEmpForm({ ...empForm, is_pf_eligible: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 block">
                        3. Enable Provident Fund (PF / EPF) Deduction for this Employee (Optional)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Check to automatically deduct standard 12% EPF or a fixed custom monthly amount from salary slips.
                      </span>
                    </div>
                  </label>
                </div>

                {empForm.is_pf_eligible && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-cyan-500/20 animate-in fade-in">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">EPF UAN Number</label>
                      <input
                        type="text"
                        value={empForm.uan_no}
                        onChange={(e) => setEmpForm({ ...empForm, uan_no: e.target.value })}
                        className={`w-full border rounded-xl p-2 font-mono outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. 101234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">PF Rate (%)</label>
                      <input
                        type="number"
                        value={empForm.pf_rate_percent}
                        onChange={(e) => setEmpForm({ ...empForm, pf_rate_percent: parseFloat(e.target.value) || 12 })}
                        className={`w-full border rounded-xl p-2 font-mono outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Fixed Monthly PF (Optional)</label>
                      <input
                        type="number"
                        value={empForm.custom_pf_amount}
                        onChange={(e) => setEmpForm({ ...empForm, custom_pf_amount: parseFloat(e.target.value) || 0 })}
                        className={`w-full border rounded-xl p-2 font-mono outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="0 for 12%"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Bank Account & Government Tax Numbers */}
              <div className={`p-4 border rounded-2xl space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-sky-600 dark:text-sky-400 font-bold flex items-center space-x-1.5 text-xs uppercase tracking-wider">
                  <CreditCard className="w-4 h-4" />
                  <span>4. Bank Account & Identity Numbers (Aadhaar & PAN)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Aadhaar Card No</label>
                    <input
                      type="text"
                      value={empForm.aadhaar_no}
                      onChange={(e) => setEmpForm({ ...empForm, aadhaar_no: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="12-digit UID"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">PAN Card No</label>
                    <input
                      type="text"
                      value={empForm.pan_no}
                      onChange={(e) => setEmpForm({ ...empForm, pan_no: e.target.value.toUpperCase() })}
                      className={`w-full border rounded-xl p-2 font-mono uppercase outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="ABCDE1234F"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={empForm.bank_account}
                      onChange={(e) => setEmpForm({ ...empForm, bank_account: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="Bank A/C No"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Bank IFSC Code</label>
                    <input
                      type="text"
                      value={empForm.bank_ifsc}
                      onChange={(e) => setEmpForm({ ...empForm, bank_ifsc: e.target.value.toUpperCase() })}
                      className={`w-full border rounded-xl p-2 font-mono uppercase outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="e.g. SBIN0001234"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Employee KYC & Academic Verification Documents (<500 KB limit) */}
              <div className={`p-4 border rounded-2xl space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="text-amber-500 dark:text-amber-400 font-bold flex items-center space-x-1.5 text-xs uppercase tracking-wider">
                    <FileBadge className="w-4 h-4" />
                    <span>5. Verification Documents Upload (Photo, Aadhaar, PAN, Marksheets)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                    Max 500 KB per file • PDF / JPG / PNG
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Upload employee verification certificates for store owner identity verification and record keeping.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {KYC_DOCUMENT_TYPES.map((docType) => {
                    const uploaded = uploadedDocs[docType.key];

                    return (
                      <div
                        key={docType.key}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          uploaded 
                            ? 'border-emerald-500/40 bg-emerald-500/5' 
                            : isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start space-x-2">
                            <span className="text-base">{docType.icon}</span>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                                <span>{docType.label}</span>
                                {uploaded && (
                                  <span className="text-[9px] font-bold text-emerald-500 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                                    ✓ Attached
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">{docType.desc}</div>
                            </div>
                          </div>

                          {uploaded && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(docType.key)}
                              className="text-rose-400 hover:text-rose-300 text-[10px] font-bold shrink-0 p-1"
                              title="Remove uploaded document"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>

                        {/* Upload Input & Preview */}
                        <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between">
                          {uploaded ? (
                            <div className="flex items-center space-x-2 truncate">
                              {uploaded.file_type?.startsWith('image/') ? (
                                <img
                                  src={uploaded.file_data}
                                  alt="Preview"
                                  className="w-7 h-7 rounded object-cover border border-emerald-500/40 shrink-0 cursor-pointer"
                                  onClick={() => setDocPreviewModal(uploaded)}
                                />
                              ) : (
                                <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                              )}
                              <div className="truncate text-[10px]">
                                <span className="font-mono text-slate-200 block truncate">{uploaded.file_name}</span>
                                <span className="text-slate-400 font-mono">{(Number(uploaded.file_size || 0) / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">No document selected</span>
                          )}

                          <label className="cursor-pointer shrink-0">
                            <input
                              type="file"
                              accept={docType.accept}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocFileUpload(docType.key, file);
                              }}
                              className="hidden"
                            />
                            <span className="px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-300 hover:text-white transition-all shadow-sm">
                              <Upload className="w-2.5 h-2.5" />
                              <span>{uploaded ? 'Change' : 'Choose File'}</span>
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 6: Portal Login Credentials & Role-Based Access Privileges */}
              <div className={`p-4 border rounded-2xl space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-brand-600 dark:text-brand-400 font-bold flex items-center space-x-1.5 text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>6. System Login & Role-Based Portal Access Privileges</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    Granular RBAC Enabled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Username (Login ID)</label>
                    <input
                      type="text"
                      value={empForm.username}
                      onChange={(e) => setEmpForm({ ...empForm, username: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder="e.g. rahul1"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">
                      {editingEmployeeId ? 'Password (Blank = Keep Current)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      value={empForm.password}
                      onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                      className={`w-full border rounded-xl p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      placeholder={editingEmployeeId ? "••••••••" : "e.g. pass123"}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Assigned Role Preset</label>
                    <select
                      value={empForm.role_id}
                      onChange={(e) => handleRoleChangeInEmpForm(parseInt(e.target.value, 10))}
                      className={`w-full border rounded-xl p-2 outline-none font-medium ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} - {r.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Granular Portal Permissions Matrix */}
                <div className={`p-3 rounded-xl border space-y-2.5 mt-2 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-slate-700/60">
                    <div>
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Grant / Revoke Portal Tabs for this Employee
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Check/uncheck individual portals to customize which screens this employee can view when logged in.
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllPortalsInEmpForm}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllPortalsInEmpForm}
                        className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30"
                      >
                        Revoke All
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToRoleDefaultsInEmpForm}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30"
                        title="Reset to selected role template defaults"
                      >
                        Role Default
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PORTAL_MODULES.map((module) => {
                      const Icon = module.icon;
                      const currentPerms = empForm.permissions || [];
                      const isAllowed = module.permissions.every(p => currentPerms.includes(p));

                      return (
                        <div
                          key={module.id}
                          onClick={() => togglePortalInEmpForm(module)}
                          className={`p-2 rounded-xl border cursor-pointer transition-all flex items-start space-x-2 ${
                            isAllowed
                              ? `${module.bgColor} ${module.borderColor} shadow-sm`
                              : isDark
                                ? 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-90'
                                : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              onChange={() => {}}
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${module.color}`} />
                              <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {module.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {module.description}
                            </p>
                          </div>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 font-bold ${
                            isAllowed 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                          }`}>
                            {isAllowed ? 'ALLOWED' : 'REVOKED'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Submit Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                <div className="text-[11px] text-slate-400">
                  {!editingEmployeeId && <span>⚡ Formal Welcome / Appointment letter will generate automatically on saving.</span>}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEmpModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                      isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 flex items-center space-x-1.5 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingEmployeeId ? 'Save Employee Profile' : 'Save & Onboard Employee'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. APPLY LEAVE MODAL */}
      {/* ========================================================= */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Apply for Employee Leave</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Select Employee *</label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Leave Type *</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="CASUAL">Casual Leave (CL - Paid)</option>
                  <option value="SICK">Sick Leave (SL - Paid)</option>
                  <option value="PAID">Paid Privilege Leave (PL - Paid)</option>
                  <option value="UNPAID">Unpaid Leave (Loss of Pay - LOP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Reason / Notes</label>
                <textarea
                  rows="2"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Medical emergency or family function"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className={`px-3 py-1.5 rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. ISSUE ADVANCE MODAL */}
      {/* ========================================================= */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Issue Staff Salary Advance</h3>
            <form onSubmit={handleIssueAdvance} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Select Employee *</label>
                <select
                  required
                  value={advanceForm.employee_id}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, employee_id: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Advance Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) || 0 })}
                  className={`w-full border rounded-lg p-2 font-mono font-bold outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Reason / Notes</label>
                <input
                  type="text"
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Festival advance or emergency loan"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className={`px-3 py-1.5 rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow">
                  Issue Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. NEW SALARY PROCESS - EMPLOYEE SELECTOR MODAL */}
      {/* ========================================================= */}
      {isNewSalaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>Start New Salary Process</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                      {selectedMonth}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select an employee to compute monthly working days, allowances, optional PF, advance recovery, and disburse their salary.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSalaryModalOpen(false)}
                className={`p-2 rounded-xl border transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            }`}>
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search staff by name, code, designation..."
                  value={newSalarySearch}
                  onChange={(e) => setNewSalarySearch(e.target.value)}
                  className={`w-full text-xs pl-8 pr-7 py-2 rounded-xl border outline-none font-medium transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:border-purple-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-500'
                  }`}
                />
                <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                {newSalarySearch && (
                  <button
                    onClick={() => setNewSalarySearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className={`flex items-center space-x-1 border p-1 rounded-xl ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}>
                {[
                  { id: 'all', label: `All (${payrollSummary.length})` },
                  { id: 'pending', label: `Pending (${pendingStaffCount})` },
                  { id: 'paid', label: `Paid (${processedStaffCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setNewSalaryFilter(f.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      newSalaryFilter === f.id
                        ? 'bg-purple-600 text-white shadow'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {(() => {
                const filtered = payrollSummary.filter(rec => {
                  const matchesSearch = !newSalarySearch || 
                    rec.full_name?.toLowerCase().includes(newSalarySearch.toLowerCase()) ||
                    rec.employee_code?.toLowerCase().includes(newSalarySearch.toLowerCase()) ||
                    rec.designation?.toLowerCase().includes(newSalarySearch.toLowerCase()) ||
                    rec.department?.toLowerCase().includes(newSalarySearch.toLowerCase());

                  if (!matchesSearch) return false;
                  if (newSalaryFilter === 'pending') return !rec.is_processed;
                  if (newSalaryFilter === 'paid') return rec.is_processed;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <div className="text-3xl">👥</div>
                      <div className="text-sm font-bold">No employees found</div>
                      <p className="text-xs">No employees match your search or filter criteria for {selectedMonth}.</p>
                      {newSalarySearch && (
                        <button
                          onClick={() => setNewSalarySearch('')}
                          className="mt-2 text-xs text-purple-400 underline font-bold"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  );
                }

                return filtered.map((rec) => {
                  const isProcessed = Boolean(rec.is_processed);
                  const hasPf = Boolean(rec.is_pf_eligible);

                  return (
                    <div
                      key={rec.employee_id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isDark 
                          ? (isProcessed ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-900 border-purple-900/40 shadow-md') 
                          : (isProcessed ? 'bg-slate-50 border-slate-200' : 'bg-white border-purple-200 shadow-sm')
                      }`}
                    >
                      {/* Left: Staff Bio */}
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                          isProcessed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                        }`}>
                          {rec.full_name ? rec.full_name.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold">{rec.full_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold">
                              {rec.employee_code}
                            </span>
                            {hasPf && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                                PF Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {rec.designation} • {rec.department || 'Store'}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Salary & Attendance Summary */}
                      <div className="flex items-center space-x-6 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-sans">Basic Pay</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(rec.monthly_basic_salary || rec.basic_pay || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-sans">Days Worked</span>
                          <span className="font-bold">
                            {rec.present_days} / {rec.total_days_in_month}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-sans">Status</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                            isProcessed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                          }`}>
                            {isProcessed ? 'PAID' : 'PENDING'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {isProcessed ? (
                          <button
                            onClick={() => {
                              setIsNewSalaryModalOpen(false);
                              openProcessPayrollModal(rec);
                            }}
                            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700'
                            }`}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Adjust / Re-process</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setIsNewSalaryModalOpen(false);
                              openProcessPayrollModal(rec);
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 flex items-center space-x-1.5 transition-all active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Process & Pay Salary</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-3 border-t flex justify-between items-center text-xs ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <span>Total Store Employees: <strong>{payrollSummary.length}</strong></span>
              <button
                onClick={() => setIsNewSalaryModalOpen(false)}
                className={`px-4 py-1.5 rounded-xl border font-bold transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. SALARY SLIP PRINT / PREVIEW MODAL */}
      {/* ========================================================= */}
      {selectedSalarySlip && (
        <SalarySlipPrint
          payrollRecord={selectedSalarySlip}
          shop={activeShop}
          onClose={() => setSelectedSalarySlip(null)}
        />
      )}

      {/* ========================================================= */}
      {/* 7. OFFICIAL WELCOME & ONBOARDING APPOINTMENT LETTER MODAL */}
      {/* ========================================================= */}
      {selectedOnboardingLetter && (
        <OnboardingLetterPrint
          employee={selectedOnboardingLetter}
          shop={activeShop}
          onClose={() => setSelectedOnboardingLetter(null)}
        />
      )}

      {/* ========================================================= */}
      {/* 8. EMPLOYEE KYC DOCUMENTS & VERIFICATION HUB MODAL */}
      {/* ========================================================= */}
      {selectedDocEmployee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                  <FileBadge className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>KYC & Academic Verification Documents</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40">
                      {selectedDocEmployee.employee_code}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedDocEmployee.full_name} • {selectedDocEmployee.designation} ({selectedDocEmployee.department || 'Store Operations'})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDocEmployee(null)}
                className={`p-2 rounded-xl border text-slate-400 hover:text-white transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Verification Stats Banner */}
            <div className={`px-6 py-3 border-b flex items-center justify-between text-xs font-mono ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center space-x-2 font-sans">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Verification Status: <strong>{empDocsList.length} of 7 Documents Attached</strong></span>
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Max 500 KB per document • Formats: PDF, JPG, PNG
              </div>
            </div>

            {/* Document Slots List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {KYC_DOCUMENT_TYPES.map((docType) => {
                const existing = empDocsList.find(d => d.doc_type === docType.key);

                return (
                  <div
                    key={docType.key}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      existing
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                        existing
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {docType.icon}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{docType.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            existing
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {existing ? 'VERIFIED & UPLOADED' : 'MISSING / PENDING'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{docType.desc}</p>
                        {existing && (
                          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center space-x-3">
                            <span>File: <strong className="text-slate-300">{existing.file_name}</strong></span>
                            <span>•</span>
                            <span>Size: <strong>{(Number(existing.file_size || 0) / 1024).toFixed(1)} KB</strong></span>
                            <span>•</span>
                            <span>Date: {existing.uploaded_at?.slice(0, 10)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {existing ? (
                        <>
                          <button
                            onClick={() => setDocPreviewModal(existing)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-sky-600'
                            }`}
                            title="Preview full document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <a
                            href={existing.file_data}
                            download={existing.file_name}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title="Download document file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>

                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept={docType.accept}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleSaveSingleDocInHub(selectedDocEmployee.id, docType.key, f);
                              }}
                              className="hidden"
                            />
                            <span className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-300 hover:text-white transition-all shadow-sm">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Replace</span>
                            </span>
                          </label>

                          <button
                            onClick={() => handleDeleteSingleDocInHub(existing.id, selectedDocEmployee.id)}
                            className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all"
                            title="Delete this document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept={docType.accept}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleSaveSingleDocInHub(selectedDocEmployee.id, docType.key, f);
                            }}
                            className="hidden"
                          />
                          <span className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/25 flex items-center space-x-1.5 transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Document</span>
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className={`px-6 py-3.5 border-t flex justify-between items-center text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                onClick={() => setSelectedOnboardingLetter(selectedDocEmployee)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 font-bold flex items-center space-x-1.5 transition-all"
              >
                <Award className="w-3.5 h-3.5" />
                <span>View Onboarding Letter</span>
              </button>

              <button
                onClick={() => setSelectedDocEmployee(null)}
                className={`px-4 py-1.5 rounded-xl border font-bold ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. FULL-SCREEN DOCUMENT PREVIEWER MODAL */}
      {/* ========================================================= */}
      {docPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>{docPreviewModal.doc_name || docPreviewModal.file_name}</span>
                <span className="text-slate-400 font-mono">({(Number(docPreviewModal.file_size || 0) / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={docPreviewModal.file_data}
                  download={docPreviewModal.file_name}
                  className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setDocPreviewModal(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 min-h-[400px]">
              {docPreviewModal.file_type?.startsWith('image/') ? (
                <img
                  src={docPreviewModal.file_data}
                  alt={docPreviewModal.file_name}
                  className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800"
                />
              ) : (
                <iframe
                  src={docPreviewModal.file_data}
                  title={docPreviewModal.file_name}
                  className="w-full h-[75vh] rounded-xl border border-slate-800 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. EMPLOYEE PORTAL ACCESS & SECURITY PRIVILEGES MODAL */}
      {/* ========================================================= */}
      {accessModalEmployee && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-3 border-slate-700 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>Portal Access & Role Security: {accessModalEmployee.full_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {accessModalEmployee.employee_code}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Grant, customize, or revoke login credentials and individual portal screen permissions for this employee.
                  </p>
                </div>
              </div>
              <button onClick={() => setAccessModalEmployee(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveAccess} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Login Username *</label>
                  <input
                    type="text"
                    required
                    value={accessForm.username}
                    onChange={(e) => setAccessForm({ ...accessForm, username: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. rahul1"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {accessModalEmployee.username ? 'New Password (Blank = Keep Current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!accessModalEmployee.username}
                    value={accessForm.password}
                    onChange={(e) => setAccessForm({ ...accessForm, password: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder={accessModalEmployee.username ? "••••••••" : "Enter initial password"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Assigned Role Template</label>
                  <select
                    value={accessForm.role_id}
                    onChange={(e) => handleRoleChangeInAccessForm(parseInt(e.target.value, 10))}
                    className={`w-full border rounded-lg p-2 outline-none font-medium ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} - {r.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Account Access Status</label>
                  <select
                    value={accessForm.is_active}
                    onChange={(e) => setAccessForm({ ...accessForm, is_active: parseInt(e.target.value, 10) })}
                    className={`w-full border rounded-lg p-2 outline-none font-bold ${
                      accessForm.is_active === 1
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    } ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    <option value={1}>ACTIVE - Access Granted</option>
                    <option value={0}>LOCKED - Access Revoked</option>
                  </select>
                </div>
              </div>

              {/* Granular Portal Permissions Matrix */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-700/60">
                  <div>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      <span className={isDark ? 'text-white' : 'text-slate-900'}>Grant / Revoke Individual Portal Privileges</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Toggle portals below to grant (ALLOWED) or revoke (LOCKED) specific portal access.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPortalsInAccess}
                      className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                    >
                      Grant All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPortalsInAccess}
                      className="text-[10px] px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30"
                    >
                      Revoke All
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToRoleDefaultsInAccess}
                      className="text-[10px] px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30 flex items-center space-x-1"
                      title="Reset permissions to selected role defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Role Default</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PORTAL_MODULES.map((module) => {
                    const Icon = module.icon;
                    const isAllowed = module.permissions.every(p => accessForm.permissions.includes(p));

                    return (
                      <div
                        key={module.id}
                        onClick={() => togglePortalInAccessForm(module)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-2.5 ${
                          isAllowed
                            ? `${module.bgColor} ${module.borderColor} shadow-sm`
                            : isDark
                              ? 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-90'
                              : 'bg-white border-slate-200 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => {}}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${module.color}`} />
                            <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {module.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {module.description}
                          </p>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 font-bold ${
                          isAllowed 
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        }`}>
                          {isAllowed ? 'ALLOWED' : 'REVOKED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAccessModalEmployee(null)}
                  className={`px-3 py-1.5 rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow"
                >
                  Save Access & Privileges
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Employee Photo ID Card Badge Modal */}
      <EmployeeIdCardModal
        isOpen={Boolean(idCardEmployee)}
        onClose={() => setIdCardEmployee(null)}
        employee={idCardEmployee}
      />
    </div>
  );
}
