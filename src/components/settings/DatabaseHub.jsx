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
  Layers,
  Cloud,
  CloudUpload,
  Clock,
  ExternalLink,
  History,
  Key
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

  // Google Drive Cloud Backup State
  const [gdriveConfig, setGdriveConfig] = useState({
    enabled: false,
    accessToken: '',
    folderName: 'KwikStore_Backups',
    schedule: 'DAILY_2200',
    customDailyTime: '22:00',
    keepLastN: 15,
    accountEmail: ''
  });
  const [gdriveLogs, setGdriveLogs] = useState([]);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [showGdriveLogs, setShowGdriveLogs] = useState(false);

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
    loadGdriveConfig();
    loadGdriveLogs();
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

  const loadGdriveConfig = async () => {
    try {
      const res = await fetch('/api/database/gdrive/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setGdriveConfig(data.config);
        }
      }
    } catch (e) {
      console.error('Failed to load Google Drive config', e);
    }
  };

  const loadGdriveLogs = async () => {
    try {
      const res = await fetch('/api/database/gdrive/logs?limit=10');
      if (res.ok) {
        const data = await res.json();
        setGdriveLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load Google Drive logs', e);
    }
  };

  const handleSaveGdriveConfig = async (e) => {
    if (e) e.preventDefault();
    setGdriveLoading(true);
    try {
      const res = await fetch('/api/database/gdrive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gdriveConfig)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '✅ Google Drive backup settings and schedule saved!' });
        loadGdriveConfig();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save Google Drive settings.' });
    } finally {
      setGdriveLoading(false);
    }
  };

  const handleTestGdrive = async () => {
    if (!gdriveConfig.accessToken) {
      setMessage({ type: 'error', text: 'Please enter a Google Drive Access Token first.' });
      return;
    }
    setGdriveLoading(true);
    try {
      const res = await fetch('/api/database/gdrive/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: gdriveConfig.accessToken })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `✨ ${data.message}` });
        loadGdriveConfig();
      } else {
        setMessage({ type: 'error', text: `❌ ${data.message}` });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Connection test failed. Check network or token.' });
    } finally {
      setGdriveLoading(false);
    }
  };

  const handleGdriveBackupNow = async () => {
    setGdriveLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/gdrive/backup-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `☁️ Google Drive Backup Uploaded: ${data.fileName} (${data.sizeMb}) to folder "${data.folderName}"` 
        });
        loadGdriveLogs();
        loadGdriveConfig();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to upload backup to Google Drive.' });
    } finally {
      setGdriveLoading(false);
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

        {/* Card: Google Drive Cloud Backup & Sync Hub */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-sky-500">
              <Cloud className="w-5 h-5" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Google Drive Cloud Auto-Backup (Zero Setup / Custom Path)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                gdriveConfig.enabled && gdriveConfig.accessToken
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${gdriveConfig.enabled && gdriveConfig.accessToken ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {gdriveConfig.enabled && gdriveConfig.accessToken ? (gdriveConfig.accountEmail ? `Connected: ${gdriveConfig.accountEmail}` : 'Cloud Sync Active') : 'Cloud Sync Disabled'}
              </span>
              <button
                type="button"
                onClick={() => setShowGdriveLogs(!showGdriveLogs)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                {showGdriveLogs ? 'Hide Cloud Logs' : 'View Cloud Logs'}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Securely upload automated daily/hourly encrypted database snapshots directly to your personal Google Drive or company folder.
          </p>

          <form onSubmit={handleSaveGdriveConfig} className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gdriveConfig.enabled}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, enabled: e.target.checked })}
                  className="rounded border-slate-400 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>Enable Google Drive Automated Cloud Backup</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-sky-500" />
                  Google OAuth / Access Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={gdriveConfig.accessToken}
                    onChange={(e) => setGdriveConfig({ ...gdriveConfig, accessToken: e.target.value })}
                    placeholder="Paste your Google Drive OAuth access token..."
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestGdrive}
                    disabled={gdriveLoading || !gdriveConfig.accessToken}
                    className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                  >
                    Test Token
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Generate via Google Cloud Console or OAuth Playground with <code>https://www.googleapis.com/auth/drive.file</code> scope.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
                  Google Drive Target Folder Name / Path
                </label>
                <input
                  type="text"
                  value={gdriveConfig.folderName}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, folderName: e.target.value })}
                  placeholder="e.g. KwikStore_Backups"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">If this folder does not exist on your Google Drive, KwikStore creates it automatically.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Cloud Backup Frequency / Schedule
                </label>
                <select
                  value={gdriveConfig.schedule}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, schedule: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="DAILY_2200">Custom Daily Time (Recommended)</option>
                  <option value="HOURLY_1">Every 1 Hour</option>
                  <option value="HOURLY_4">Every 4 Hours</option>
                  <option value="ON_SHUTDOWN">On Application Close</option>
                  <option value="MANUAL">Manual Trigger Only</option>
                </select>
              </div>

              {gdriveConfig.schedule === 'DAILY_2200' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Daily Backup Time (24h)
                  </label>
                  <input
                    type="time"
                    value={gdriveConfig.customDailyTime || '22:00'}
                    onChange={(e) => setGdriveConfig({ ...gdriveConfig, customDailyTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Cloud Retention (Versions to Keep)
                </label>
                <select
                  value={gdriveConfig.keepLastN || 15}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, keepLastN: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value={7}>Keep last 7 backups</option>
                  <option value={15}>Keep last 15 backups (Default)</option>
                  <option value={30}>Keep last 30 backups</option>
                  <option value={60}>Keep last 60 backups</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-400">
                {gdriveConfig.lastBackupAt ? `Last cloud sync: ${gdriveConfig.lastBackupAt}` : 'No cloud backups uploaded yet.'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={gdriveLoading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  Save Schedule Settings
                </button>
                <button
                  type="button"
                  onClick={handleGdriveBackupNow}
                  disabled={gdriveLoading || !gdriveConfig.accessToken}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                >
                  <CloudUpload className="w-4 h-4" />
                  {gdriveLoading ? 'Uploading to Drive...' : 'Upload to Drive Now'}
                </button>
              </div>
            </div>
          </form>

          {/* Cloud Audit Logs Accordion */}
          {showGdriveLogs && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Recent Google Drive Upload History</span>
                <button onClick={loadGdriveLogs} className="hover:text-slate-200 flex items-center gap-1 text-[11px]">
                  <RefreshCw className="w-3 h-3" /> Refresh Logs
                </button>
              </div>
              {gdriveLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">No Google Drive uploads recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase">
                        <th className="py-1.5 px-2">Date & Time</th>
                        <th className="py-1.5 px-2">Backup File</th>
                        <th className="py-1.5 px-2">Size</th>
                        <th className="py-1.5 px-2">Trigger</th>
                        <th className="py-1.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {gdriveLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-500/5">
                          <td className="py-1.5 px-2 text-slate-400">{log.created_at}</td>
                          <td className="py-1.5 px-2 text-slate-200 font-semibold">{log.file_name}</td>
                          <td className="py-1.5 px-2 text-slate-400">{log.file_size_mb} MB</td>
                          <td className="py-1.5 px-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                              {log.trigger_type}
                            </span>
                          </td>
                          <td className="py-1.5 px-2">
                            {log.status === 'SUCCESS' ? (
                              <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                              </span>
                            ) : (
                              <span className="text-rose-500 font-bold flex items-center gap-1 text-[11px]" title={log.error_message}>
                                <AlertTriangle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
