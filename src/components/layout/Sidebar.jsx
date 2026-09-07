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
  TrendingDown
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, isCollapsed, onToggleCollapse }) {
  const { hasPermission, user } = useAuth();
  const { isDark } = useTheme();

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
      id: 'hrms',
      label: 'HRMS & Payroll',
      shortcut: 'F7',
      icon: UserCheck,
      color: 'text-purple-500',
      permission: 'hrms:view'
    },
    {
      id: 'multishop',
      label: 'Multi-Shop Branches',
      shortcut: 'F8',
      icon: Building2,
      color: 'text-indigo-500',
      permission: 'settings:multishop'
    },
    {
      id: 'staff',
      label: 'Staff Access (RBAC)',
      shortcut: 'F9',
      icon: ShieldCheck,
      color: 'text-emerald-500',
      permission: 'settings:rbac'
    },
    {
      id: 'reports',
      label: 'Reports & GST',
      shortcut: 'F10',
      icon: BarChart3,
      color: 'text-cyan-500',
      permission: 'reports:sales'
    },
    {
      id: 'expenses',
      label: 'Store Expenses',
      shortcut: 'F11',
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
      shortcut: 'F12',
      icon: Store,
      color: 'text-amber-400',
      permission: 'settings:invoice'
    },
    {
      id: 'license',
      label: 'License & Security',
      icon: Key,
      color: 'text-emerald-400',
      permission: 'settings:license'
    }
  ];

  const isOwner = Boolean(user && (user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'owner' || user.roleId === 1));

  return (
    <aside className={`border-r flex flex-col justify-between py-3 select-none shrink-0 transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-60'
    } ${
      isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/95 border-slate-200'
    }`}>
      {/* Top Header & Navigation Items */}
      <div className="space-y-1 px-2">
        {/* Management Portal Title & Collapse Toggle */}
        <div className={`px-2 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {!isCollapsed && <span>Management Portal</span>}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`p-1 rounded-lg border transition-all mx-auto ${isCollapsed ? 'w-full flex justify-center' : ''} ${
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

        {/* Nav Items List */}
        <div className="space-y-1 pt-1">
          {navItems.map((item) => {
            const allowed = isOwner || (user && hasPermission(item.permission));
            if (!allowed) return null;

            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center rounded-xl text-sm font-medium transition-all group relative ${
                  isCollapsed 
                    ? 'justify-center p-2.5' 
                    : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-emerald-600 text-white shadow-lg shadow-brand-500/20 font-semibold'
                    : isDark
                      ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
                title={isCollapsed ? `${item.label} [${item.shortcut}]` : undefined}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <span
                    className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                          : 'bg-slate-200 text-slate-600 group-hover:text-slate-800'
                    }`}
                  >
                    {item.shortcut}
                  </span>
                )}

                {/* Collapsed Active Indicator Pip */}
                {isCollapsed && isActive && (
                  <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FleetBillPro.in Website Card at Bottom */}
      <div className="px-2">
        {!isCollapsed ? (
          <a
            href="https://fleetbillpro.in"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-3 rounded-xl border text-xs block transition-all hover:scale-[1.02] group ${
              isDark ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/70' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-brand-600 dark:text-brand-400 font-bold mb-1">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>fleetbillpro.in</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Cloud & Offline Retail POS, Billing, GST & Multi-Store ERP Solutions.
            </p>
          </a>
        ) : (
          <a 
            href="https://fleetbillpro.in"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2.5 rounded-xl border flex justify-center text-brand-600 dark:text-brand-400 transition-all hover:scale-110 ${
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
