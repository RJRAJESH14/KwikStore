import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useNetwork } from '../../context/NetworkContext';
import { useTheme } from '../../context/ThemeContext';
import { HelpModal } from '../help/HelpModal';
import { 
  Store, 
  User, 
  Wifi, 
  HardDrive, 
  ShieldCheck, 
  LogOut, 
  CheckCircle2, 
  Building2, 
  Sun, 
  Moon, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Menu,
  HelpCircle,
  Headphones,
  RefreshCw,
  BookOpen,
  Info,
  ChevronDown
} from 'lucide-react';

export function Navbar({ onOpenDatabaseHub, onOpenShopSettings, onOpenLoginModal, isSidebarCollapsed, onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { shops, activeShop, switchShop } = useShop();
  const { lanMode, isOnline } = useNetwork();
  const { theme, toggleTheme, isDark } = useTheme();

  // Help Modal & Dropdown States
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState('support');
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const helpDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target)) {
        setIsHelpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOwner = Boolean(user && (user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'owner' || user.roleId === 1));

  return (
    <header className={`h-16 border-b px-4 flex items-center justify-between z-30 select-none transition-colors duration-200 ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
    }`}>
      {/* Brand & Multi-Shop Switcher */}
      <div className="flex items-center space-x-3">
        {/* Hide / Show Sidebar Menu Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
            title={isSidebarCollapsed ? "Show / Expand Side Menu (Ctrl+B)" : "Hide / Collapse Side Menu (Ctrl+B)"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4 text-brand-500" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        <div className="flex items-center space-x-2.5">
          <img 
            src="/icon.png" 
            alt="KwikStore Pro Logo" 
            className="w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/20 object-cover border border-emerald-500/30" 
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <span className={`font-bold text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>KwikStore</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/30">PRO</span>
            </div>
            <div className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Universal POS & HRMS</span>
              <span>•</span>
              <span className="text-emerald-500 font-medium">100% Offline SQLite</span>
            </div>
          </div>
        </div>

        {/* Multi-Shop / Branch Selector */}
        <div className={`hidden md:flex items-center pl-4 border-l ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className={`flex items-center space-x-2 border rounded-lg px-3 py-1.5 transition-all ${
            isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
          }`}>
            <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <select
              value={activeShop ? activeShop.id : ''}
              onChange={(e) => switchShop(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer pr-2"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id} className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
            {isOwner ? (
              <button
                onClick={onOpenShopSettings}
                className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded hover:bg-brand-500 hover:text-white transition-colors ${
                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
                title="Click to edit Shop & Invoice Details"
              >
                {activeShop?.shop_type || 'RETAIL'}
              </button>
            ) : (
              <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {activeShop?.shop_type || 'RETAIL'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls: Dark/Light Mode, Shop Settings, Database Safety Hub, LAN Status, Staff Badge */}
      <div className="flex items-center space-x-2.5">
        {/* Shop & Invoice Settings Shortcut (Owner Only) */}
        {isOwner && (
          <button
            onClick={onOpenShopSettings}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm'
            }`}
            title="Shop & Invoice Settings (Owner Only)"
          >
            <Store className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Shop Settings</span>
          </button>
        )}

        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-all flex items-center space-x-1.5 text-xs font-semibold ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 shadow-sm'
          }`}
          title={isDark ? 'Switch to White/Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-slate-200">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline text-slate-700">Dark</span>
            </>
          )}
        </button>

        {/* Database Hub / Anti-Crash Indicator */}
        <button
          onClick={onOpenDatabaseHub}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
          }`}
          title="Database Drive & Disaster-Recovery Hub"
        >
          <HardDrive className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          <span className="hidden sm:inline">DB Hub</span>
        </button>

        {/* Help, Support & Updates Dropdown Menu */}
        <div className="relative" ref={helpDropdownRef}>
          <button
            onClick={() => setIsHelpDropdownOpen(!isHelpDropdownOpen)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isHelpDropdownOpen
                ? isDark ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-sky-50 border-sky-300 text-sky-800'
                : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
            title="Help, FleetBillPro Support & Updates"
          >
            <HelpCircle className="w-4 h-4 text-sky-500" />
            <span className="hidden sm:inline">Help</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isHelpDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu Popup */}
          {isHelpDropdownOpen && (
            <div className={`absolute right-0 top-full mt-1.5 w-60 border rounded-2xl shadow-2xl z-50 overflow-hidden divide-y animate-in fade-in zoom-in-95 duration-100 ${
              isDark ? 'bg-slate-900 border-slate-700 divide-slate-800 text-slate-200' : 'bg-white border-slate-200 divide-slate-100 text-slate-800 shadow-xl'
            }`}>
              <div className="p-1.5">
                <button
                  onClick={() => {
                    setIsHelpDropdownOpen(false);
                    setHelpInitialTab('support');
                    setIsHelpOpen(true);
                  }}
                  className={`w-full p-2 rounded-xl flex items-center space-x-2.5 text-left text-xs transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold">Support (FleetBillPro)</div>
                    <div className="text-[10px] text-slate-400 truncate">Helpdesk & Contact Info</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsHelpDropdownOpen(false);
                    setHelpInitialTab('updates');
                    setIsHelpOpen(true);
                  }}
                  className={`w-full p-2 rounded-xl flex items-center space-x-2.5 text-left text-xs transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold">Check for Updates</div>
                    <div className="text-[10px] text-slate-400 truncate">GitHub Releases (v1.1.0)</div>
                  </div>
                </button>
              </div>

              <div className="p-1.5">
                <button
                  onClick={() => {
                    setIsHelpDropdownOpen(false);
                    setHelpInitialTab('guide');
                    setIsHelpOpen(true);
                  }}
                  className={`w-full p-2 rounded-xl flex items-center space-x-2.5 text-left text-xs transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold">Shortcuts & Guide</div>
                    <div className="text-[10px] text-slate-400 truncate">POS Hotkeys & Tutorials</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsHelpDropdownOpen(false);
                    setHelpInitialTab('about');
                    setIsHelpOpen(true);
                  }}
                  className={`w-full p-2 rounded-xl flex items-center space-x-2.5 text-left text-xs transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold">About KwikStore Pro</div>
                    <div className="text-[10px] text-slate-400 truncate">v1.1.0 • SQLite Engine</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LAN Multi-Counter Status */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
          isDark
            ? 'bg-slate-800/80 border-slate-700/60 text-slate-300'
            : 'bg-slate-100 border-slate-300 text-slate-700'
        }`}>
          <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`} />
          <span className="hidden sm:inline">{lanMode === 'SERVER' ? 'Host Server' : 'Counter (LAN)'}</span>
        </div>

        {/* Staff User Profile / Login */}
        {user ? (
          <div className={`flex items-center space-x-2 pl-2 border-l ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`flex items-center space-x-2 border rounded-lg px-2.5 py-1.5 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
            }`}>
              <div className="w-6 h-6 rounded-full bg-brand-600/20 border border-brand-500/50 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs">
                {user.displayName.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className={`text-xs font-medium leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{user.displayName}</div>
                <div className="text-[10px] text-brand-600 dark:text-brand-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {user.roleName}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <User className="w-3.5 h-3.5" />
            <span>Staff Login</span>
          </button>
        )}
      </div>

      {/* Help, Support & Update Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTab={helpInitialTab}
      />
    </header>
  );
}
