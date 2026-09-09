import React, { useState, Component } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShopProvider, useShop } from './context/ShopContext';
import { NetworkProvider } from './context/NetworkContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PosBilling } from './components/pos/PosBilling';
import { InventoryManager } from './components/inventory/InventoryManager';
import { CustomerKhata } from './components/khata/CustomerKhata';
import { HrmsDashboard } from './components/hrms/HrmsDashboard';
import { MultiShopManager } from './components/multishop/MultiShopManager';
import { StaffRbacManager } from './components/staff/StaffRbacManager';
import { ReportsView } from './components/reports/ReportsView';
import { DatabaseHub } from './components/settings/DatabaseHub';
import { ShopInvoiceSettings } from './components/settings/ShopInvoiceSettings';
import LicenseSettings from './components/settings/LicenseSettings';
import LicenseActivationModal from './components/license/LicenseActivationModal';
import { SupplierManager } from './components/suppliers/SupplierManager';
import { QuotationManager } from './components/quotations/QuotationManager';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { EWayBillsManager } from './components/eway/EWayBillsManager';
import { LoginModal } from './components/auth/LoginModal';
import { CustomerFacingDisplay } from './components/customer/CustomerFacingDisplay';
import { RecycleBin } from './components/recycle_bin/RecycleBin';
import { InvoiceDataView } from './components/invoices/InvoiceDataView';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('KwikStore Pro Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-xs text-slate-400 max-w-md mb-4 font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">
            {this.state.error?.message || 'Unknown render exception'}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Cache & Reload App</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainLayout() {
  const [activeTab, setActiveTab] = useState('pos');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('kwikstore_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const { isDark } = useTheme();
  const { loading, activeShop } = useShop();
  const { user, hasPermission } = useAuth();

  const isOwner = Boolean(user && (user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'owner' || user.roleId === 1));

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('kwikstore_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const [licenseStatus, setLicenseStatus] = useState(null);

  const fetchLicense = async () => {
    try {
      const res = await fetch('/api/license/status');
      const data = await res.json();
      setLicenseStatus(data);
    } catch (e) {
      console.error('License check notice:', e);
    }
  };

  React.useEffect(() => {
    fetchLicense();
  }, []);

  // Keyboard shortcut Ctrl+B to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading && !activeShop) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center ${
        isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-500/25 animate-pulse mb-3">
          <span className="text-white font-black text-xl">K</span>
        </div>
        <div className="text-sm font-bold">KwikStore Pro</div>
        <div className="text-xs text-slate-400 mt-1">Connecting to local SQLite database...</div>
      </div>
    );
  }

  // 1. Strict License Lockout if Expired or Fresh Unactivated Install
  if (licenseStatus && (licenseStatus.status === 'EXPIRED' || licenseStatus.status === 'UNACTIVATED')) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-4 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}>
        <LicenseActivationModal
          licenseStatus={licenseStatus}
          isDismissable={false}
          onActivationSuccess={fetchLicense}
        />
      </div>
    );
  }

  // 2. If user is logged out, lock the portal and display the login / owner creation screen
  if (!user) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-4 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}>
        <LoginModal
          isOpen={true}
          isLockedScreen={true}
          onClose={() => {}}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen font-sans overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Navbar */}
      <Navbar
        onOpenDatabaseHub={() => (isOwner || hasPermission('settings:database_backup')) && setActiveTab('settings')}
        onOpenShopSettings={() => (isOwner || hasPermission('settings:invoice') || hasPermission('settings:multishop')) && setActiveTab('shop_settings')}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main App Body: Sidebar + Active Screen */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'pos' && <PosBilling />}
          {activeTab === 'invoice_data' && (isOwner || hasPermission('pos:billing') ? <InvoiceDataView /> : <PosBilling />)}
          {activeTab === 'inventory' && (isOwner || hasPermission('inventory:view') ? <InventoryManager /> : <PosBilling />)}
          {activeTab === 'suppliers' && (isOwner || hasPermission('suppliers:view') ? <SupplierManager /> : <PosBilling />)}
          {activeTab === 'khata' && (isOwner || hasPermission('customers:view') ? <CustomerKhata /> : <PosBilling />)}
          {activeTab === 'quotations' && (isOwner || hasPermission('quotations:view') ? <QuotationManager /> : <PosBilling />)}
          {activeTab === 'hrms' && (isOwner || hasPermission('hrms:view') ? <HrmsDashboard /> : <PosBilling />)}
          {activeTab === 'multishop' && (isOwner || hasPermission('settings:multishop') ? <MultiShopManager /> : <PosBilling />)}
          {activeTab === 'staff' && (isOwner || hasPermission('settings:rbac') ? <StaffRbacManager /> : <PosBilling />)}
          {activeTab === 'expenses' && (isOwner || hasPermission('expenses:view') ? <ExpenseManager /> : <PosBilling />)}
          {activeTab === 'reports' && (isOwner || hasPermission('reports:sales') ? <ReportsView /> : <PosBilling />)}
          {activeTab === 'eway_bills' && (isOwner || hasPermission('reports:sales') ? <EWayBillsManager /> : <PosBilling />)}
          {activeTab === 'settings' && (isOwner || hasPermission('settings:database_backup') ? <DatabaseHub /> : <PosBilling />)}
          {activeTab === 'shop_settings' && (isOwner || hasPermission('settings:invoice') || hasPermission('settings:multishop') ? <ShopInvoiceSettings /> : <PosBilling />)}
          {activeTab === 'license' && (isOwner || hasPermission('settings:license') ? <LicenseSettings /> : <PosBilling />)}
          {activeTab === 'recycle_bin' && (isOwner || hasPermission('settings:database_backup') ? <RecycleBin /> : <PosBilling />)}
        </main>
      </div>

      {/* Staff Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const isCfdMode = window.location.pathname.includes('customer-display') || 
                    window.location.hash.includes('customer-display') || 
                    window.location.search.includes('view=cfd');

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ShopProvider>
            <NetworkProvider>
              {isCfdMode ? <CustomerFacingDisplay /> : <MainLayout />}
            </NetworkProvider>
          </ShopProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
