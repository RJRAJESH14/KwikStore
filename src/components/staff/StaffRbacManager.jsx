import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Key, 
  Lock, 
  Check, 
  Sparkles, 
  Eye, 
  EyeOff,
  Edit3, 
  DollarSign, 
  Shield, 
  Store,
  Power,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  UserX,
  X,
  ShoppingCart,
  Package,
  Truck,
  UserCheck,
  Building2,
  BarChart3,
  HardDrive,
  Sliders,
  CheckSquare,
  Square,
  RotateCcw,
  FileText,
  Plus,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

// Granular Portal Access Modules Configuration (12 Integrated Modules)
export const PORTAL_MODULES = [
  {
    id: 'pos',
    name: 'POS Billing & Checkout',
    icon: ShoppingCart,
    color: 'text-brand-500',
    borderColor: 'border-brand-500/40',
    bgColor: 'bg-brand-500/10',
    badgeColor: 'bg-brand-500/20 text-brand-600 dark:text-brand-400',
    description: 'Cashier checkout, barcode scanning, invoice generation & thermal receipts',
    permissions: ['pos:billing']
  },
  {
    id: 'inventory',
    name: 'Inventory Master',
    icon: Package,
    color: 'text-amber-500',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    description: 'Stock catalog, add/edit products, stock audit & cost/margin visibility',
    permissions: ['inventory:view', 'inventory:edit', 'inventory:costs']
  },
  {
    id: 'suppliers',
    name: 'Suppliers & Vendors',
    icon: Truck,
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/40',
    bgColor: 'bg-indigo-500/10',
    badgeColor: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    description: 'Vendor directory, contact details, GSTIN & product sourcing records',
    permissions: ['suppliers:view', 'suppliers:edit']
  },
  {
    id: 'khata',
    name: 'Customer Khata (Credit)',
    icon: Users,
    color: 'text-sky-500',
    borderColor: 'border-sky-500/40',
    bgColor: 'bg-sky-500/10',
    badgeColor: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
    description: 'Customer directory, udhaar balances, payment ledger & WhatsApp reminders',
    permissions: ['customers:view', 'customers:edit', 'customers:credit']
  },
  {
    id: 'quotations',
    name: 'Quotations & Estimates',
    icon: FileText,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-500/10',
    badgeColor: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    description: 'Create & manage price quotations for new/existing clients and B2B shops',
    permissions: ['quotations:view', 'quotations:create']
  },
  {
    id: 'hrms',
    name: 'HRMS & Staff Payroll',
    icon: UserCheck,
    color: 'text-purple-500',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-500/10',
    badgeColor: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    description: 'Employee profiles, daily attendance check-ins & salary disbursements',
    permissions: ['hrms:view', 'hrms:manage_payroll', 'hrms:attendance']
  },
  {
    id: 'reports',
    name: 'Reports & GST Analytics',
    icon: BarChart3,
    color: 'text-cyan-500',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-500/10',
    badgeColor: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    description: 'Daily/monthly sales summary, GST reports, profit analysis & Excel export',
    permissions: ['reports:sales', 'reports:gst']
  },
  {
    id: 'multishop',
    name: 'Multi-Shop Branches',
    icon: Building2,
    color: 'text-indigo-500',
    borderColor: 'border-indigo-500/40',
    bgColor: 'bg-indigo-500/10',
    badgeColor: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    description: 'Create & manage multiple shop branches, outlets, warehouses & godowns',
    permissions: ['settings:multishop']
  },
  {
    id: 'staff',
    name: 'Staff Access & RBAC',
    icon: ShieldCheck,
    color: 'text-emerald-500',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/10',
    badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    description: 'Create staff accounts, reset passwords, lock/disable & assign permissions',
    permissions: ['settings:rbac']
  },
  {
    id: 'settings',
    name: 'DB Hub & Safety Backup',
    icon: HardDrive,
    color: 'text-rose-500',
    borderColor: 'border-rose-500/40',
    bgColor: 'bg-rose-500/10',
    badgeColor: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    description: 'One-click local SQLite backups, database export & safety disaster recovery',
    permissions: ['settings:database_backup']
  },
  {
    id: 'shop_settings',
    name: 'Shop & Invoice Settings',
    icon: Store,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    description: 'Shop identity, GSTIN, thermal printer format & UPI payment QR customization',
    permissions: ['settings:invoice']
  },
  {
    id: 'license',
    name: 'License & Security',
    icon: Key,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/10',
    badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    description: 'Software license key, activation status, hardware ID & security log',
    permissions: ['settings:license']
  }
];

export function StaffRbacManager() {
  const { user } = useAuth();
  const { shops, activeShop } = useShop();
  const { isDark } = useTheme();

  const [staffUsers, setStaffUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, DISABLED
  
  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [editProfileUser, setEditProfileUser] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  // New User Form State
  const [userForm, setUserForm] = useState({
    shop_id: activeShop ? activeShop.id : 1,
    employee_id: '',
    username: '',
    password: '',
    display_name: '',
    phone: '',
    role_id: 3, // Default Cashier
    permissions: ['pos:billing']
  });

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    id: null,
    shop_id: 1,
    employee_id: null,
    username: '',
    display_name: '',
    phone: '',
    role_id: 3,
    is_active: 1,
    permissions: []
  });

  // Custom Role Form State
  const [roleForm, setRoleForm] = useState({
    id: null,
    name: '',
    description: '',
    permissions: ['pos:billing']
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadEmployees();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/staff/users');
      if (res.ok) setStaffUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/staff/roles');
      if (res.ok) {
        const rolesData = await res.json();
        setRoles(rolesData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/hrms/employees');
      if (res.ok) setEmployees(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to open Add Modal with default role permissions
  const openAddUserModal = () => {
    const defaultRole = roles.find(r => r.id === 3) || roles[0];
    const initialPerms = defaultRole ? defaultRole.permissions : ['pos:billing'];
    setUserForm({
      shop_id: activeShop ? activeShop.id : 1,
      employee_id: '',
      username: '',
      password: '',
      display_name: '',
      phone: '',
      role_id: defaultRole ? defaultRole.id : 3,
      permissions: initialPerms
    });
    setIsAddUserOpen(true);
  };

  // Handle Employee selection in Add Form
  const handleSelectEmployeeInAdd = (empId) => {
    if (!empId) {
      setUserForm(prev => ({ ...prev, employee_id: '' }));
      return;
    }
    const emp = employees.find(e => e.id === parseInt(empId, 10));
    if (emp) {
      const suggestedUsername = (emp.full_name.split(' ')[0] + emp.employee_code.replace('EMP-', '')).toLowerCase().replace(/[^a-z0-9]/g, '');
      setUserForm(prev => ({
        ...prev,
        employee_id: emp.id,
        display_name: emp.full_name,
        phone: emp.phone || '',
        username: prev.username || suggestedUsername
      }));
    }
  };

  // Helper to update role and sync permissions in Add Form
  const handleRoleChangeInAddForm = (roleId) => {
    const selectedRole = roles.find(r => r.id === roleId);
    setUserForm(prev => ({
      ...prev,
      role_id: roleId,
      permissions: selectedRole ? [...selectedRole.permissions] : prev.permissions
    }));
  };

  // Helper to toggle a portal module in Add Form
  const togglePortalInAddForm = (module) => {
    setUserForm(prev => {
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

  // Select all / Deselect all in Add Form
  const handleSelectAllPortalsInAdd = () => {
    const allPerms = PORTAL_MODULES.flatMap(m => m.permissions);
    setUserForm(prev => ({ ...prev, permissions: Array.from(new Set(allPerms)) }));
  };

  const handleClearAllPortalsInAdd = () => {
    setUserForm(prev => ({ ...prev, permissions: [] }));
  };

  const handleResetToRoleDefaultsInAdd = () => {
    const selectedRole = roles.find(r => r.id === userForm.role_id);
    if (selectedRole) {
      setUserForm(prev => ({ ...prev, permissions: [...selectedRole.permissions] }));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (data.success) {
        setIsAddUserOpen(false);
        setNotification({ type: 'success', message: `Staff account @${userForm.username} created with ${userForm.permissions.length} access privileges!` });
        loadUsers();
        loadEmployees();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error creating staff user.');
    }
  };

  // Toggle staff account active/disabled
  const handleToggleStatus = async (targetUser) => {
    const willEnable = targetUser.is_active !== 1;
    const actionText = willEnable ? 'GRANT and enable' : 'REVOKE and lock';
    
    if (!confirm(`Are you sure you want to ${actionText} login access for ${targetUser.display_name} (@${targetUser.username})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/users/${targetUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: willEnable })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ 
          type: 'success', 
          message: willEnable 
            ? `Staff portal access for ${targetUser.display_name} has been restored & granted.`
            : `Staff portal access for ${targetUser.display_name} has been revoked & locked.` 
        });
        loadUsers();
        loadEmployees();
      }
    } catch (e) {
      alert('Error updating user status.');
    }
  };

  // Reset or edit staff password
  const handleSavePasswordReset = async (e) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword) return;

    try {
      const res = await fetch(`/api/staff/users/${passwordModalUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ 
          type: 'success', 
          message: `Password for ${passwordModalUser.display_name} (@${passwordModalUser.username}) updated successfully!` 
        });
        setPasswordModalUser(null);
        setNewPassword('');
        loadUsers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error updating password.');
    }
  };

  // Open Edit Profile Modal
  const openEditModal = (u) => {
    const userPerms = u.permissions || [];
    setEditForm({
      id: u.id,
      shop_id: u.shop_id,
      employee_id: u.employee_id || null,
      username: u.username,
      display_name: u.display_name,
      phone: u.phone || '',
      role_id: u.role_id,
      is_active: u.is_active,
      permissions: userPerms
    });
    setEditProfileUser(u);
  };

  // Toggle portal in Edit Form
  const togglePortalInEditForm = (module) => {
    setEditForm(prev => {
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

  // Select all / Deselect all in Edit Form
  const handleSelectAllPortalsInEdit = () => {
    const allPerms = PORTAL_MODULES.flatMap(m => m.permissions);
    setEditForm(prev => ({ ...prev, permissions: Array.from(new Set(allPerms)) }));
  };

  const handleClearAllPortalsInEdit = () => {
    setEditForm(prev => ({ ...prev, permissions: [] }));
  };

  const handleResetToRoleDefaultsInEdit = () => {
    const selectedRole = roles.find(r => r.id === editForm.role_id);
    if (selectedRole) {
      setEditForm(prev => ({ ...prev, permissions: [...selectedRole.permissions] }));
    }
  };

  const handleSaveEditProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setEditProfileUser(null);
        setNotification({ type: 'success', message: `Staff profile and portal access privileges for ${editForm.display_name} updated successfully.` });
        loadUsers();
        loadEmployees();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error updating staff profile.');
    }
  };

  // Delete / Remove Staff Account
  const handleDeleteUser = async (targetUser) => {
    if (targetUser.username === 'owner' || targetUser.role_id === 1) {
      alert('The primary Shop Owner account cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete staff account for ${targetUser.display_name} (@${targetUser.username})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/users/${targetUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        loadUsers();
        loadEmployees();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('Error deleting staff account.');
    }
  };

  // Custom Role Management Handlers
  const openCreateRoleModal = () => {
    setRoleForm({
      id: null,
      name: '',
      description: '',
      permissions: ['pos:billing']
    });
    setEditingRole(null);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (r) => {
    setRoleForm({
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: r.permissions || []
    });
    setEditingRole(r);
    setIsRoleModalOpen(true);
  };

  const togglePortalInRoleForm = (module) => {
    setRoleForm(prev => {
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

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      });
      const data = await res.json();
      if (data.success) {
        setIsRoleModalOpen(false);
        setNotification({ type: 'success', message: data.message });
        loadRoles();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error saving custom role.');
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.id === 1 || role.role_key === 'SUPER_ADMIN') {
      alert('Super Admin role cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete role template "${role.name}"? Any staff currently assigned to this role will default to Cashier.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/roles/${role.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        loadRoles();
        loadUsers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error deleting role.');
    }
  };

  // Filtered staff list
  const filteredUsers = staffUsers.filter(u => {
    const matchesSearch = 
      (u.display_name && u.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.shop_name && u.shop_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.role_name && u.role_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.employee_name && u.employee_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === 'ACTIVE') return matchesSearch && u.is_active === 1;
    if (statusFilter === 'DISABLED') return matchesSearch && u.is_active === 0;
    return matchesSearch;
  });

  const activeCount = staffUsers.filter(u => u.is_active === 1).length;
  const disabledCount = staffUsers.filter(u => u.is_active === 0).length;

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top RBAC Toolbar */}
      <div className={`border-b px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Staff Accounts & Role-Based Access Control (RBAC)</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Shop Owner Full Privileges
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Create custom roles, manage staff credentials, and grant or revoke portal access for new & existing employees.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={openCreateRoleModal}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-300' 
                : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-500" />
            <span>+ Create Custom Role</span>
          </button>

          <button
            onClick={openAddUserModal}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Staff Account</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Notification Banner */}
        {notification && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Accounts</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{staffUsers.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across all branches & counters</div>
          </div>

          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Granted & Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Authorized for POS & Portal</div>
          </div>

          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Revoked / Locked</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <div className={`text-2xl font-bold mt-2 ${disabledCount > 0 ? 'text-rose-500' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>
              {disabledCount}
            </div>
            <div className="text-[10px] text-rose-500/80 mt-0.5">Access strictly blocked</div>
          </div>

          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Available Roles</span>
              <Shield className="w-4 h-4 text-purple-500" />
            </div>
            <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{roles.length}</div>
            <div className="text-[10px] text-purple-400 mt-0.5">System & Custom Role Templates</div>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search staff by name, @username, linked employee, role..."
              className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Status:</span>
            <div className={`flex items-center border rounded-lg p-0.5 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
            }`}>
              {['ALL', 'ACTIVE', 'DISABLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Users Table */}
        <div>
          <div className={`border rounded-xl overflow-hidden shadow-lg ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
          }`}>
            <table className="w-full text-left text-xs">
              <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
                isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Staff User / Employee</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Role Assigned</th>
                  <th className="py-3 px-4">Portal Access Allowed</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Access Status</th>
                  <th className="py-3 px-4 text-right">Shop Owner Controls</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredUsers.map((u) => {
                  const isActive = u.is_active === 1;
                  const isOwnerAccount = u.role_id === 1 && (u.username === 'owner' || u.username === 'pujarani.sahoo');
                  
                  // Calculate active modules for this user
                  const userPerms = u.permissions || [];
                  const activeModules = PORTAL_MODULES.filter(m => 
                    m.permissions.some(p => userPerms.includes(p))
                  );

                  return (
                    <tr key={u.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                          }`}>
                            {u.display_name ? u.display_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className={`font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{u.display_name}</span>
                              {u.employee_name && (
                                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  HRMS: {u.employee_name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-medium">{u.shop_name}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          u.role_key === 'SUPER_ADMIN' || u.role_key === 'owner'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30'
                            : u.role_key === 'STORE_MANAGER'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                        }`}>
                          {u.role_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {isOwnerAccount ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              Full Access (All 12 Portals)
                            </span>
                          ) : activeModules.length > 0 ? (
                            <>
                              {activeModules.slice(0, 3).map(m => (
                                <span 
                                  key={m.id} 
                                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded border flex items-center space-x-1 ${
                                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  <span>{m.name.split(' ')[0]}</span>
                                </span>
                              ))}
                              {activeModules.length > 3 && (
                                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                                  +{activeModules.length - 3} more
                                </span>
                              )}
                              {u.custom_permissions && (
                                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                  Custom
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-mono">No Portal Access</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{u.last_login_at || 'Never'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}>
                          {isActive ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isActive ? 'GRANTED' : 'REVOKED'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end items-center space-x-1.5">
                          {/* 1. Edit Profile & Access Button */}
                          <button
                            onClick={() => openEditModal(u)}
                            className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title="Edit Staff Details & Customize Portal Access"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-500" />
                            <span>Edit Access</span>
                          </button>

                          {/* 2. Reset / Change Password Button */}
                          <button
                            onClick={() => {
                              setPasswordModalUser(u);
                              setNewPassword('');
                              setShowPassword(false);
                            }}
                            className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            }`}
                            title="Change or Reset Staff Password"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-500" />
                            <span>Password</span>
                          </button>

                          {/* 3. Grant / Revoke Access Toggle */}
                          {!isOwnerAccount && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center space-x-1 transition-all ${
                                isActive
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-500'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-600'
                              }`}
                              title={isActive ? 'Revoke and lock this account access immediately' : 'Grant and restore account access'}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{isActive ? 'Revoke' : 'Grant'}</span>
                            </button>
                          )}

                          {/* 4. Delete / Remove Button */}
                          {!isOwnerAccount && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-2 py-1 rounded border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-semibold flex items-center space-x-1 transition-all"
                              title="Delete and remove staff account permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
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

        {/* Roles & Granular Permission Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Role Templates & Granular Portals Matrix
              </h2>
              <p className="text-[11px] text-slate-400">Preconfigured role presets. You can create custom roles or customize individual staff permissions anytime.</p>
            </div>

            <button
              onClick={openCreateRoleModal}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center space-x-1 transition-all ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-300' 
                  : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Role</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {roles.map((role) => {
              const isSuperAdmin = role.id === 1 || role.role_key === 'SUPER_ADMIN';
              const activePortals = PORTAL_MODULES.filter(m => m.permissions.some(p => role.permissions.includes(p)));

              return (
                <div key={role.id} className={`p-4 rounded-xl border shadow-md space-y-3 flex flex-col justify-between ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Shield className="w-4 h-4 text-purple-500" />
                        <span>{role.name}</span>
                      </h3>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {role.permissions.length} perms
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{role.description || 'Custom staff role template'}</p>
                  </div>

                  <div className={`space-y-1.5 pt-2 border-t text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Allowed Portals ({activePortals.length}/12):</div>
                    <div className="flex flex-wrap gap-1">
                      {isSuperAdmin ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Full Access (All 12 Portals)
                        </span>
                      ) : activePortals.length > 0 ? (
                        activePortals.map(m => (
                          <span key={m.id} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${m.bgColor} ${m.borderColor} ${m.color}`}>
                            {m.name.split(' ')[0]}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No portals assigned</span>
                      )}
                    </div>

                    {!isSuperAdmin && (
                      <div className="flex items-center justify-end space-x-2 pt-2">
                        <button
                          onClick={() => openEditRoleModal(role)}
                          className="text-[11px] font-semibold text-sky-400 hover:underline flex items-center space-x-0.5"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {role.id > 3 && (
                          <button
                            onClick={() => handleDeleteRole(role)}
                            className="text-[11px] font-semibold text-rose-400 hover:underline flex items-center space-x-0.5 ml-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Role Create / Edit Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {roleForm.id ? `Edit Role: ${roleForm.name}` : 'Create New Custom Role'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Define role template name, description, and assign authorized default portals</p>
                </div>
              </div>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Role Name *</label>
                <input
                  type="text"
                  required
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Sales Executive, Delivery In-Charge, Auditor"
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Description</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="Briefly describe what this role is authorized to perform in store..."
                />
              </div>

              {/* Portal Matrix */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between border-b pb-2 border-slate-700">
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Default Allowed Portals for this Role</span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setRoleForm({ ...roleForm, permissions: PORTAL_MODULES.flatMap(m => m.permissions) })}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleForm({ ...roleForm, permissions: [] })}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold border border-rose-500/30"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PORTAL_MODULES.map((module) => {
                    const Icon = module.icon;
                    const isAllowed = module.permissions.every(p => roleForm.permissions.includes(p));

                    return (
                      <div
                        key={module.id}
                        onClick={() => togglePortalInRoleForm(module)}
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
                            : 'bg-slate-800/40 text-slate-400 border border-slate-700/40'
                        }`}>
                          {isAllowed ? 'ALLOWED' : 'LOCKED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow"
                >
                  Save Role Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset / Edit Staff Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Edit Password for {passwordModalUser.display_name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">@{passwordModalUser.username}</p>
                </div>
              </div>
              <button onClick={() => setPasswordModalUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSavePasswordReset} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  disabled
                  value={passwordModalUser.username}
                  className={`w-full border rounded-lg p-2 font-mono opacity-70 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Enter New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Type new password here..."
                    className={`w-full border rounded-lg p-2 pr-9 font-mono outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className={`px-3 py-1.5 rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Profile & Granular Portal Access Modal */}
      {editProfileUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700 shrink-0">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Edit Staff Profile & Grant/Revoke Portal Access
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure credentials and grant or revoke access for individual portals</p>
                </div>
              </div>
              <button onClick={() => setEditProfileUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditProfile} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Staff Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Username *</label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Assigned Shop Branch</label>
                  <select
                    value={editForm.shop_id}
                    onChange={(e) => setEditForm({ ...editForm, shop_id: parseInt(e.target.value, 10) })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Role Template Preset</label>
                  <select
                    value={editForm.role_id}
                    onChange={(e) => {
                      const newRoleId = parseInt(e.target.value, 10);
                      const selRole = roles.find(r => r.id === newRoleId);
                      setEditForm(prev => ({
                        ...prev,
                        role_id: newRoleId,
                        permissions: selRole ? [...selRole.permissions] : prev.permissions
                      }));
                    }}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name} - {r.description}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Account Access Status</label>
                  <select
                    value={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: parseInt(e.target.value, 10) })}
                    className={`w-full border rounded-lg p-2 outline-none font-bold ${
                      editForm.is_active === 1
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    } ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    <option value={1}>ACTIVE - Access Granted</option>
                    <option value={0}>LOCKED - Access Revoked</option>
                  </select>
                </div>
              </div>

              {/* Granular Portal Access Selection Matrix */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-700/60">
                  <div>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <Sliders className="w-4 h-4 text-emerald-500" />
                      <span className={isDark ? 'text-white' : 'text-slate-900'}>Grant / Revoke Individual Portal Privileges</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Click any portal below to grant (ALLOWED) or revoke (LOCKED) access.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPortalsInEdit}
                      className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                    >
                      Grant All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPortalsInEdit}
                      className="text-[10px] px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30"
                    >
                      Revoke All
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToRoleDefaultsInEdit}
                      className="text-[10px] px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30 flex items-center space-x-1"
                      title="Reset to default permissions for selected role template"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Role Default</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PORTAL_MODULES.map((module) => {
                    const Icon = module.icon;
                    const isAllowed = module.permissions.every(p => editForm.permissions.includes(p));

                    return (
                      <div
                        key={module.id}
                        onClick={() => togglePortalInEditForm(module)}
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
                            onChange={() => {}} // Handled by parent div
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
                  onClick={() => setEditProfileUser(null)}
                  className={`px-3 py-1.5 rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow"
                >
                  Save Staff Profile & Privileges
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal with Granular Portal Access Selection */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Create Staff Login & Portal Access</h3>
                  <p className="text-[11px] text-slate-400">Create new login credentials, optionally link to HRMS staff, and grant authorized portals</p>
                </div>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Optional Link to HRMS Employee */}
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Link to Existing HRMS Employee (Optional)
                </label>
                <select
                  value={userForm.employee_id}
                  onChange={(e) => handleSelectEmployeeInAdd(e.target.value)}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- Standalone Staff User (Not Linked to HRMS) --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code} • {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Staff Display Name *</label>
                  <input
                    type="text"
                    required
                    value={userForm.display_name}
                    onChange={(e) => setUserForm({ ...userForm, display_name: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Phone Number</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Assigned Shop Branch</label>
                  <select
                    value={userForm.shop_id}
                    onChange={(e) => setUserForm({ ...userForm, shop_id: parseInt(e.target.value, 10) })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Role Template Preset</label>
                  <select
                    value={userForm.role_id}
                    onChange={(e) => handleRoleChangeInAddForm(parseInt(e.target.value, 10))}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name} - {r.description}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Login Username *</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. rahul1"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Login Password *</label>
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="Enter password"
                  />
                </div>
              </div>

              {/* Granular Portal Access Selection Matrix */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-700/60">
                  <div>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <Sliders className="w-4 h-4 text-emerald-500" />
                      <span className={isDark ? 'text-white' : 'text-slate-900'}>Assign Portal Access & Privileges</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Check/uncheck individual portals to configure which screens this staff account can view and operate.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPortalsInAdd}
                      className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                    >
                      Grant All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPortalsInAdd}
                      className="text-[10px] px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30"
                    >
                      Revoke All
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToRoleDefaultsInAdd}
                      className="text-[10px] px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30 flex items-center space-x-1"
                      title="Reset to default permissions for selected role template"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Role Default</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PORTAL_MODULES.map((module) => {
                    const Icon = module.icon;
                    const isAllowed = module.permissions.every(p => userForm.permissions.includes(p));

                    return (
                      <div
                        key={module.id}
                        onClick={() => togglePortalInAddForm(module)}
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
                            onChange={() => {}} // Handled by parent div
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
                            : 'bg-slate-800/40 text-slate-400 border border-slate-700/40'
                        }`}>
                          {isAllowed ? 'ALLOWED' : 'LOCKED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 shrink-0">
                <button type="button" onClick={() => setIsAddUserOpen(false)} className={`px-3 py-1.5 rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow">
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
