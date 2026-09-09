import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  UserCheck, 
  Building2, 
  ShieldCheck, 
  BarChart3, 
  HardDrive,
  Store,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Truck, 
  FileText, 
  Key,
  Globe,
  ExternalLink,
  TrendingDown,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, isCollapsed, onToggleCollapse }) {
  const { hasPermission, user } = useAuth();
  const { isDark } = useTheme();
  const [binCount, setBinCount] = React.useState(0);

  React.useEffect(() => {
    const fetchBinCount = async () => {
      try {
        const res = await fetch('/api/recycle-bin/stats');
        if (res.ok) {
          const data = await res.json();
          setBinCount(data.total || 0);
        }
      } catch (e) {}
    };
    fetchBinCount();
    const interval = setInterval(fetchBinCount, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const navItems = [
    {
      id: 'pos',
      label: 'POS Billing',
      shortcut: 'F2',
      icon: ShoppingCart,
      color: 'text-brand-500',
      permission: 'pos:billing'
    },
    {
      id: 'invoice_data',
      label: 'Invoice Data',
      icon: FileSpreadsheet,
      color: 'text-indigo-400',
      permission: 'pos:billing'
    },
    {
      id: 'inventory',
      label: 'Inventory Master',
      shortcut: 'F3',
      icon: Package,
      color: 'text-amber-500',
      permission: 'inventory:view'
    },
    {
      id: 'suppliers',
      label: 'Suppliers (Vendors)',
      shortcut: 'F4',
      icon: Truck,
      color: 'text-indigo-400',
      permission: 'suppliers:view'
    },
    {
      id: 'khata',
      label: 'Customer Khata',
      shortcut: 'F5',
      icon: Users,
      color: 'text-sky-500',
      permission: 'customers:view'
    },
    {
      id: 'quotations',
      label: 'Quotations & Estimates',
      shortcut: 'F6',
      icon: FileText,
      color: 'text-cyan-400',
      permission: 'quotations:view'
    },
    {
      id: 'staff',
      label: 'Staff Access (RBAC)',
      shortcut: 'F7',
      icon: ShieldCheck,
      color: 'text-emerald-500',
      permission: 'settings:rbac'
    },
    {
      id: 'reports',
      label: 'Reports & GST',
      shortcut: 'F8',
      icon: BarChart3,
      color: 'text-cyan-500',
      permission: 'reports:sales'
    },
    {
      id: 'eway_bills',
      label: 'E-Way Bills & Transit',
      icon: Truck,
      color: 'text-amber-500',
      permission: 'reports:sales'
    },
    {
      id: 'expenses',
      label: 'Store Expenses',
      shortcut: 'F9',
      icon: TrendingDown,
      color: 'text-rose-400',
      permission: 'expenses:view'
    },
    {
      id: 'settings',
      label: 'DB Hub & Safety',
      icon: HardDrive,
      color: 'text-rose-500',
      permission: 'settings:database_backup'
    },
    {
      id: 'shop_settings',
      label: 'Shop & Invoice Settings',
      shortcut: 'F10',
      icon: Store,
      color: 'text-amber-400',
      permission: 'settings:invoice'
    },
    {
      id: 'multishop',
      label: 'Multi-Shop Branches',
      shortcut: 'F11',
      icon: Building2,
      color: 'text-indigo-500',
      permission: 'settings:multishop'
    },
    {
      id: 'hrms',
      label: 'HRMS & Payroll',
      shortcut: 'F12',
      icon: UserCheck,
      color: 'text-purple-500',
      permission: 'hrms:view'
    },
    {
      id: 'license',
      label: 'License & Security',
      icon: Key,
      color: 'text-emerald-400',
      permission: 'settings:license'
    },
    {
      id: 'recycle_bin',
      label: 'Recycle Bin',
      icon: Trash2,
      color: 'text-rose-400',
      badge: binCount > 0 ? binCount : null,
      permission: 'settings:database_backup'
    }
  ];

  const isOwner = Boolean(user && (user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'owner' || user.roleId === 1));

  return (
    <aside className={`border-r h-full flex flex-col justify-between select-none shrink-0 transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-60'
    } ${
      isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/95 border-slate-200'
    }`}>
      {/* Top Header & Navigation Items */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Management Portal Title & Collapse Toggle */}
        <div className={`px-3 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider shrink-0 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {!isCollapsed && <span>Management Portal</span>}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`p-1 rounded-lg border transition-all ${isCollapsed ? 'w-full flex justify-center' : 'ml-auto'} ${
                isDark 
                  ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-white' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
              }`}
              title={isCollapsed ? "Expand Sidebar Menu (Ctrl+B)" : "Collapse Sidebar Menu (Ctrl+B)"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Scrollable Nav Items List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2 space-y-0.5 py-1">
          {navItems.map((item) => {
            const allowed = isOwner || (user && hasPermission(item.permission));
            if (!allowed) return null;

            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-all group relative ${
                  isCollapsed 
                    ? 'justify-center p-2' 
                    : 'justify-between px-2.5 py-2'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-md shadow-brand-500/20 font-semibold'
                    : isDark
                      ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
                title={isCollapsed ? `${item.label} [${item.shortcut}]` : undefined}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (item.badge !== undefined && item.badge !== null ? (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : item.shortcut ? (
                  <span
                    className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                          : 'bg-slate-200 text-slate-600 group-hover:text-slate-800'
                    }`}
                  >
                    {item.shortcut}
                  </span>
                ) : null)}

                {/* Collapsed Active Indicator Pip */}
                {isCollapsed && isActive && (
                  <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FleetBillPro.in Website Card Pinned at Bottom */}
      <div className={`p-2 shrink-0 border-t ${isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-slate-50/90'}`}>
        {!isCollapsed ? (
          <a
            href="https://fleetbillpro.in"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2.5 rounded-xl border text-xs block transition-all hover:scale-[1.01] group ${
              isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/70' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-brand-600 dark:text-brand-400 font-bold mb-0.5">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">fleetbillpro.in</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className={`text-[10px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Cloud & Offline Retail POS, Billing & GST ERP Solutions.
            </p>
          </a>
        ) : (
          <a 
            href="https://fleetbillpro.in"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-xl border flex justify-center text-brand-600 dark:text-brand-400 transition-all hover:scale-110 ${
              isDark ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
            }`}
            title="Visit fleetbillpro.in - Cloud & Offline POS Suite"
          >
            <Globe className="w-4 h-4" />
          </a>
        )}
      </div>
    </aside>
  );
}
