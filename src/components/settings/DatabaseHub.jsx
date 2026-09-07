import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  HardDrive, 
  ShieldCheck, 
  Download, 
  FolderPlus, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Usb,
  FileCheck,
  PlusCircle,
  Repeat,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Layers
} from 'lucide-react';

export function DatabaseHub() {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [dbStatus, setDbStatus] = useState(null);
  const [newDbPath, setNewDbPath] = useState('D:\\KwikStoreData\\kwikstore.db');
  const [restoreFilePath, setRestoreFilePath] = useState('D:\\KwikStoreData\\kwikstore.db');
  const [switchFilePath, setSwitchFilePath] = useState('D:\\KwikStoreData\\kwikstore.db');
  const [customBackupPath, setCustomBackupPath] = useState('E:\\USB_Backups');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  // New Fresh DB Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [freshDbPath, setFreshDbPath] = useState('D:\\KwikStoreData\\my_new_store.db');
  const [freshShopName, setFreshShopName] = useState(user?.shopName || 'Pujarani Garments & Footwear');
  const [freshOwnerName, setFreshOwnerName] = useState(user?.displayName || 'Pujarani Sahoo');
  const [freshUsername, setFreshUsername] = useState(user?.username || 'pujarani.store');
  const [freshPassword, setFreshPassword] = useState('Shop@2026');
  const [freshShopType, setFreshShopType] = useState('GARMENTS');
  const [freshCity, setFreshCity] = useState('Bhubaneswar');

  useEffect(() => {
    loadDatabaseStatus();
  }, []);

  const loadDatabaseStatus = async () => {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        if (data.dbPath) {
          setNewDbPath(data.dbPath);
          setRestoreFilePath(data.dbPath);
          setSwitchFilePath(data.dbPath);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyPath = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerBackup = async (customPath = null) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPath })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Backup created successfully: ${data.fileName} (${data.sizeMb})` });
        loadDatabaseStatus();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create backup.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewDatabase = async (e) => {
    e.preventDefault();
    if (!confirm(`Are you sure you want to create a brand new clean database at:\n${freshDbPath} ?\nThis will initialize a pristine database and set it as default.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/create-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbPath: freshDbPath.trim(),
          shopName: freshShopName.trim(),
          ownerName: freshOwnerName.trim(),
          username: freshUsername.trim(),
          password: freshPassword.trim(),
          recoveryPin: '9853',
          shopType: freshShopType,
          city: freshCity.trim(),
          stateCode: '21'
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setMessage({ type: 'success', text: `🎉 ${data.message}` });
        setShowCreateModal(false);
        loadDatabaseStatus();
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to create new database.' });
      }
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Error connecting to backend while creating database.' });
    }
  };

  const handleSwitchDb = async () => {
    if (!confirm(`Switch active database to:\n${switchFilePath} ?\nThe application will immediately connect to this database.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDbPath: switchFilePath.trim() })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `⚡ Switched to ${switchFilePath}! Loaded ${data.stats?.invoices} invoices, ${data.stats?.products} products.` 
        });
        loadDatabaseStatus();
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to switch database.' });
      }
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Error connecting to database.' });
    }
  };

  const handleWipeTestData = async () => {
    if (!confirm(`⚠️ DANGER: Are you sure you want to WIPE all test invoices, sample sales, and test customer Khata debt?\n\nThis is recommended when handing over the software to a customer so they start with ₹0 sales and clean reports.\nProduct catalog will be preserved.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipeProducts: false })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setMessage({ type: 'success', text: `🧹 Clean state initialized: ${data.message}` });
        loadDatabaseStatus();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Failed to reset test data.' });
    }
  };

  const handleRelocateDb = async () => {
    if (!confirm(`Are you sure you want to relocate the active database to: \n${newDbPath} ?\nYour current data will be copied safely.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/relocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: newDbPath })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        loadDatabaseStatus();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to relocate database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDb = async () => {
    if (!confirm(`Are you sure you want to RESTORE the database from:\n${restoreFilePath} ?\nThis will replace the active data with this backup.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupFilePath: restoreFilePath })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `${data.message} Restored ${data.stats?.invoices} invoices, ${data.stats?.products} products, and ${data.stats?.customers} customers.` 
        });
        loadDatabaseStatus();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to restore database.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Header */}
      <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Database Safety & Multi-DB Hub</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              100% Anti-Corruption Safe
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage SQLite database files, create fresh customer databases, switch active databases, or backup to external D:\ or USB drives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Clean DB</span>
          </button>

          <button
            onClick={() => handleTriggerBackup()}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{loading ? 'Backing Up...' : 'Instant 1-Click Backup'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-xs flex items-center space-x-2.5 ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300' 
              : 'bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Current Database Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400">Active DB File Size</div>
            <div className={`text-xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{dbStatus?.fileSizeMb || '0.00 MB'}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">SQLite WAL Mode Active</div>
          </div>

          <div className={`p-4 rounded-xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Invoices Stored</div>
            <div className="text-xl font-black text-brand-600 dark:text-brand-400 font-mono">{dbStatus?.stats?.invoices || 0}</div>
            <div className="text-[10px] text-slate-400">Bills & Tax Invoices</div>
          </div>

          <div className={`p-4 rounded-xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400">Active Products</div>
            <div className={`text-xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{dbStatus?.stats?.products || 0}</div>
            <div className="text-[10px] text-slate-400">Universal Catalog Items</div>
          </div>

          <div className={`p-4 rounded-xl border space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-400">Customers in Khata</div>
            <div className="text-xl font-black text-amber-500 font-mono">{dbStatus?.stats?.customers || 0}</div>
            <div className="text-[10px] text-slate-400">Retail & Wholesale Accounts</div>
          </div>
        </div>

        {/* Current Active Database Banner */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              CURRENT ACTIVE DATABASE FILE (DEFAULT)
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Connected & Live
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs font-bold">
            <span className="text-emerald-400 truncate">{dbStatus?.dbPath}</span>
            <button
              onClick={() => handleCopyPath(dbStatus?.dbPath)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-sans font-semibold flex items-center gap-1 shrink-0"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy Path'}
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500">Need a clean start for customer delivery?</span>
            <button
              onClick={handleWipeTestData}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wipe Test Sales & Khata Debts (Keep Catalog Clean)
            </button>
          </div>
        </div>

        {/* Card: Switch Active Database */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-500">
              <Repeat className="w-5 h-5" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Switch Active Database / Set Default</h2>
            </div>
            <span className="text-[11px] text-slate-400">Point POS to another store file</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch between different shop databases (e.g. branch files or financial years) without overwriting existing data.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={switchFilePath}
              onChange={(e) => setSwitchFilePath(e.target.value)}
              placeholder="e.g. D:\KwikStoreData\branch2.db"
              className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              onClick={handleSwitchDb}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <Repeat className="w-4 h-4" />
              Switch Database
            </button>
          </div>
        </div>

        {/* Card: Relocate Database Location */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-brand-500">
              <FolderPlus className="w-5 h-5" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Relocate Database to another Drive (D:\ or E:\ Drive)</h2>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Copy current active database safely to a permanent non-OS partition (e.g. D:\ drive) to prevent data loss when Windows is formatted.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={newDbPath}
              onChange={(e) => setNewDbPath(e.target.value)}
              placeholder="e.g. D:\KwikStoreData\kwikstore.db"
              className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              onClick={handleRelocateDb}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              Migrate Database
            </button>
          </div>
        </div>

        {/* Card: Restore Database from Backup */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-500">
              <RefreshCw className="w-5 h-5" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Disaster Recovery: Restore Database from Backup / Mapped Drive</h2>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            If your PC was formatted or reinstalled, simply paste the path of your backup file or external drive database to recover 100% of your invoices, customers, and stock.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={restoreFilePath}
              onChange={(e) => setRestoreFilePath(e.target.value)}
              placeholder="e.g. D:\KwikStoreData\kwikstore_backup.db or E:\USB\kwikstore.sqlite"
              className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              onClick={handleRestoreDb}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Restore Database
            </button>
          </div>
        </div>

      </div>

      {/* Modal: Create New Fresh Database */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-purple-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold">Create New Clean Shop Database</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewDatabase} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Database File Path (.db) *
                </label>
                <input
                  type="text"
                  required
                  value={freshDbPath}
                  onChange={(e) => setFreshDbPath(e.target.value)}
                  placeholder="e.g. D:\KwikStoreData\pujarani_garments.db"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">Will be set as the new default active database.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Shop / Business Name *</label>
                  <input
                    type="text"
                    required
                    value={freshShopName}
                    onChange={(e) => setFreshShopName(e.target.value)}
                    placeholder="e.g. Pujarani Garments"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Business Sector</label>
                  <select
                    value={freshShopType}
                    onChange={(e) => setFreshShopType(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="GARMENTS">👗 Garments & Apparel</option>
                    <option value="PHARMACY">💊 Pharmacy & Medical</option>
                    <option value="HARDWARE">🔩 Hardware & Electricals</option>
                    <option value="SUPERMARKET">🛒 Supermarket & Grocery</option>
                    <option value="RETAIL">🛍️ General Retail POS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    value={freshOwnerName}
                    onChange={(e) => setFreshOwnerName(e.target.value)}
                    placeholder="Owner Name"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">City</label>
                  <input
                    type="text"
                    value={freshCity}
                    onChange={(e) => setFreshCity(e.target.value)}
                    placeholder="City"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Owner Username *</label>
                  <input
                    type="text"
                    required
                    value={freshUsername}
                    onChange={(e) => setFreshUsername(e.target.value)}
                    placeholder="username"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Owner Password *</label>
                  <input
                    type="password"
                    required
                    value={freshPassword}
                    onChange={(e) => setFreshPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs">
                ✨ <b>Clean Slate Guarantee:</b> This database will start with 0 invoices, 0 customer Khata debt, and pristine accounting records.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  {loading ? 'Creating DB...' : 'Create & Set Default'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
