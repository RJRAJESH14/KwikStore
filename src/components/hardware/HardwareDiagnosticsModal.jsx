import React, { useState, useEffect, useRef } from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Wifi, 
  Printer, 
  Barcode, 
  HardDrive, 
  Server, 
  Monitor, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Play, 
  Zap, 
  Settings2, 
  X, 
  Sliders, 
  Cpu, 
  Share2, 
  HelpCircle,
  Clock,
  Radio,
  Scale
} from 'lucide-react';

export function HardwareDiagnosticsModal({ isOpen, onClose, initialTab = 'lan' }) {
  const {
    lanMode,
    serverHost,
    terminalName,
    terminalId,
    isOnline,
    pingLatency,
    networkInfo,
    connectedCounters,
    updateNetworkSettings,
    fetchNetworkDiagnostics,

    printers,
    selectedReceiptPrinter,
    selectedA4Printer,
    isPrinterLoading,
    setReceiptPrinter,
    setA4Printer,
    fetchPrinters,
    testPrintReceipt,
    kickCashDrawer,

    scannerStatus,
    simulateScan,

    scaleStatus,
    tareScale,
    zeroScale,
    simulateScaleWeight,
    connectWebSerialScale
  } = useNetwork();

  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copiedIp, setCopiedIp] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [testPrintStatus, setTestPrintStatus] = useState(null);
  const [cashDrawerStatus, setCashDrawerStatus] = useState(null);
  const [scaleSerialConnecting, setScaleSerialConnecting] = useState(false);
  const [scaleSerialMsg, setScaleSerialMsg] = useState(null);
  const [selectedBaudRate, setSelectedBaudRate] = useState(9600);

  // Edit Mode for LAN Settings
  const [modeInput, setModeInput] = useState(lanMode);
  const [hostInput, setHostInput] = useState(serverHost);
  const [terminalNameInput, setTerminalNameInput] = useState(terminalName);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Scanner Live Test Box
  const [scannerInputVal, setScannerInputVal] = useState('');
  const [scanHistory, setScanHistory] = useState([
    { code: '8901030383827', name: 'Tata Salt 1kg (EAN-13)', speed: '18ms', time: 'Just now' },
    { code: '8901058852391', name: 'Maggi 2-Min Noodles 70g', speed: '22ms', time: '2 mins ago' }
  ]);
  const scannerInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setModeInput(lanMode);
      setHostInput(serverHost);
      setTerminalNameInput(terminalName);
      fetchNetworkDiagnostics();
      fetchPrinters();
    }
  }, [isOpen, initialTab, lanMode, serverHost, terminalName, fetchNetworkDiagnostics, fetchPrinters]);

  // Copy Host LAN IP Address
  const handleCopyLanUrl = (ip) => {
    const url = `http://${ip}:${networkInfo.port || 4848}`;
    navigator.clipboard.writeText(url);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  // Run Manual Network Ping
  const handlePingServer = async () => {
    setIsPinging(true);
    await fetchNetworkDiagnostics();
    setIsPinging(false);
  };

  // Save Network Settings
  const handleSaveNetworkConfig = (e) => {
    e.preventDefault();
    updateNetworkSettings(modeInput, hostInput, terminalNameInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Execute Test Print Slip
  const handleTestPrint = async (paperWidth = '80mm') => {
    setTestPrintStatus('printing');
    const res = await testPrintReceipt(selectedReceiptPrinter, paperWidth);
    if (res && res.success) {
      setTestPrintStatus('success');
    } else {
      setTestPrintStatus('error');
    }
    setTimeout(() => setTestPrintStatus(null), 3500);
  };

  // Execute RJ11 Cash Drawer Kick
  const handleKickDrawer = async () => {
    setCashDrawerStatus('triggering');
    const res = await kickCashDrawer(selectedReceiptPrinter);
    if (res && res.success) {
      setCashDrawerStatus('success');
    } else {
      setCashDrawerStatus('error');
    }
    setTimeout(() => setCashDrawerStatus(null), 3500);
  };

  // Handle Manual Scanner Simulation
  const handleSimulateScan = (code, name) => {
    simulateScan(code);
    setScanHistory(prev => [
      { code, name, speed: `${Math.floor(Math.random() * 15 + 12)}ms`, time: 'Just now' },
      ...prev.slice(0, 7)
    ]);
  };

  // Handle Connect Web Serial Scale
  const handleConnectScalePort = async () => {
    setScaleSerialConnecting(true);
    setScaleSerialMsg(null);
    const res = await connectWebSerialScale(selectedBaudRate);
    setScaleSerialConnecting(false);
    setScaleSerialMsg(res);
    setTimeout(() => setScaleSerialMsg(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-md">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base tracking-tight">Hardware & LAN Diagnostics Hub</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Detect Active
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                LAN Terminals, Thermal/Laser Printers, Barcode Scanners & Electronic Weighing Scales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Pill Header Cards (4 Pills) */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 border-b text-xs ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/60 border-slate-200'
        }`}>
          {/* 1. LAN Status Pill */}
          <div 
            onClick={() => setActiveTab('lan')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              activeTab === 'lan'
                ? 'ring-2 ring-brand-500 border-brand-500/50 bg-brand-500/10'
                : isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <Wifi className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[10px] uppercase text-slate-400">Shop LAN</div>
                <div className="font-bold text-xs truncate">
                  {lanMode === 'SERVER' ? 'Master Host' : 'Counter'}
                </div>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold text-emerald-500 shrink-0">{pingLatency}ms</span>
          </div>

          {/* 2. Printer Status Pill */}
          <div 
            onClick={() => setActiveTab('printers')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              activeTab === 'printers'
                ? 'ring-2 ring-brand-500 border-brand-500/50 bg-brand-500/10'
                : isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
                <Printer className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[10px] uppercase text-slate-400">Printer</div>
                <div className="font-bold text-xs truncate">
                  {selectedReceiptPrinter ? selectedReceiptPrinter.split(' ')[0] : 'Ready'}
                </div>
              </div>
            </div>
            <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[9px] font-mono font-bold shrink-0">
              {printers.length} P
            </span>
          </div>

          {/* 3. Barcode Scanner Pill */}
          <div 
            onClick={() => setActiveTab('scanner')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              activeTab === 'scanner'
                ? 'ring-2 ring-brand-500 border-brand-500/50 bg-brand-500/10'
                : isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Barcode className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[10px] uppercase text-slate-400">Scanner</div>
                <div className="font-bold text-xs text-emerald-400 truncate">USB Ready</div>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold text-amber-400 shrink-0">{scannerStatus.totalScans}</span>
          </div>

          {/* 4. Weighing Scale Pill */}
          <div 
            onClick={() => setActiveTab('scale')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              activeTab === 'scale'
                ? 'ring-2 ring-brand-500 border-brand-500/50 bg-brand-500/10'
                : isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                <Scale className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[10px] uppercase text-slate-400">Scale</div>
                <div className="font-mono font-bold text-xs text-purple-400 truncate">
                  {Number(scaleStatus.weight || 0).toFixed(3)} kg
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`px-4 border-b flex space-x-5 text-xs font-semibold overflow-x-auto ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          <button
            onClick={() => setActiveTab('lan')}
            className={`py-3 border-b-2 flex items-center space-x-1.5 shrink-0 transition-colors ${
              activeTab === 'lan'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>LAN Multi-Counter</span>
          </button>

          <button
            onClick={() => setActiveTab('printers')}
            className={`py-3 border-b-2 flex items-center space-x-1.5 shrink-0 transition-colors ${
              activeTab === 'printers'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Thermal & Laser Printers</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`py-3 border-b-2 flex items-center space-x-1.5 shrink-0 transition-colors ${
              activeTab === 'scanner'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Barcode Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('scale')}
            className={`py-3 border-b-2 flex items-center space-x-1.5 shrink-0 transition-colors ${
              activeTab === 'scale'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Electronic Weighing Scale (RS232)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ================= TAB 1: LAN MULTI-COUNTER SYSTEM ================= */}
          {activeTab === 'lan' && (
            <div className="space-y-5">
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDark ? 'bg-gradient-to-r from-slate-800 to-slate-800/40 border-slate-700' : 'bg-gradient-to-r from-brand-50 to-indigo-50 border-brand-200'
              }`}>
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 rounded-xl bg-brand-600 text-white shadow-md shrink-0">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm">Central Shop Server Address</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold">
                        PORT {networkInfo.port || 4848}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Other billing PCs, laptops & tablets on your Wi-Fi/LAN can open this link in their browser or POS client:
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-black/20 dark:bg-black/40 border border-slate-500/20 select-all">
                        http://{networkInfo.primaryIp}:{networkInfo.port || 4848}
                      </span>
                      <button
                        onClick={() => handleCopyLanUrl(networkInfo.primaryIp)}
                        className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-1 transition-all shadow-sm"
                      >
                        {copiedIp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIp ? 'Copied LAN URL' : 'Copy URL'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handlePingServer}
                    disabled={isPinging}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-brand-500' : ''}`} />
                    <span>{isPinging ? 'Pinging...' : 'Ping Network'}</span>
                  </button>
                </div>
              </div>

              {/* Terminal Role & Mode Configuration */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-brand-500" />
                  Terminal Identity & Role Mode
                </h4>

                <form onSubmit={handleSaveNetworkConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">System Mode</label>
                    <select
                      value={modeInput}
                      onChange={(e) => setModeInput(e.target.value)}
                      className={`w-full text-xs font-medium rounded-xl border p-2.5 outline-none transition-all ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-brand-500' : 'bg-white border-slate-300 text-slate-800 focus:border-brand-500'
                      }`}
                    >
                      <option value="SERVER">Master Host (Host Server & Database)</option>
                      <option value="CLIENT">Secondary Counter (LAN Terminal Client)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Counter Terminal Name</label>
                    <input
                      type="text"
                      value={terminalNameInput}
                      onChange={(e) => setTerminalNameInput(e.target.value)}
                      placeholder="e.g. Counter 02 - Quick Express"
                      className={`w-full text-xs font-medium rounded-xl border p-2.5 outline-none transition-all ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-brand-500' : 'bg-white border-slate-300 text-slate-800 focus:border-brand-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Host Server IP:Port</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        disabled={modeInput === 'SERVER'}
                        value={modeInput === 'SERVER' ? `${networkInfo.primaryIp}:${networkInfo.port || 4848}` : hostInput}
                        onChange={(e) => setHostInput(e.target.value)}
                        placeholder="192.168.1.10:4848"
                        className={`flex-1 text-xs font-mono font-medium rounded-xl border p-2.5 outline-none transition-all ${
                          modeInput === 'SERVER' ? 'opacity-70 bg-slate-800/30' : ''
                        } ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-brand-500' : 'bg-white border-slate-300 text-slate-800 focus:border-brand-500'}`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
                      >
                        {saveSuccess ? 'Saved!' : 'Save'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Connected Counter Terminals Table */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-brand-500" />
                    Live Detected Multi-Counter Terminals on LAN
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {connectedCounters.length || 1} counter(s) connected
                  </span>
                </div>

                <div className={`border rounded-2xl overflow-hidden divide-y ${
                  isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100 shadow-sm'
                }`}>
                  {connectedCounters.map((counter, idx) => (
                    <div key={counter.id || idx} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl ${counter.isHost ? 'bg-brand-500/20 text-brand-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                          {counter.isHost ? <Server className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold flex items-center space-x-2">
                            <span>{counter.terminalName}</span>
                            {counter.isHost && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30 uppercase">
                                Master Host
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>IP: {counter.ip}</span>
                            <span>•</span>
                            <span>ID: {counter.id}</span>
                            <span>•</span>
                            <span>User: {counter.user || 'Cashier'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-right">
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            counter.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${counter.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {counter.status || 'ONLINE'}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{pingLatency}ms ping</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PRINTERS & SPOOLER ================= */}
          {activeTab === 'printers' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">System Print Drivers & Spooler</h4>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Direct hardware communication with USB & Network Thermal POS Printers
                  </p>
                </div>
                <button
                  onClick={fetchPrinters}
                  disabled={isPrinterLoading}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPrinterLoading ? 'animate-spin text-brand-500' : ''}`} />
                  <span>Scan Hardware Printers</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {printers.map((printer, index) => {
                  const isThermal = printer.type?.includes('THERMAL') || printer.name.toLowerCase().includes('pos') || printer.name.toLowerCase().includes('thermal');
                  const isSelectedReceipt = selectedReceiptPrinter === printer.name;
                  const isSelectedA4 = selectedA4Printer === printer.name;

                  return (
                    <div
                      key={printer.name + index}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelectedReceipt || isSelectedA4
                          ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/30'
                          : isDark ? 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2.5 rounded-xl mt-0.5 ${
                            isThermal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            <Printer className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs flex items-center space-x-2">
                              <span>{printer.name}</span>
                              {printer.isDefault && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>Port: {printer.port || 'USB001'}</span>
                              <span>•</span>
                              <span className="text-emerald-500 font-bold">{printer.status || 'READY'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-500/10 flex items-center justify-between text-xs">
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => setReceiptPrinter(printer.name)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              isSelectedReceipt
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isSelectedReceipt ? '✓ POS Thermal (Active)' : 'Set as Thermal POS'}
                          </button>

                          <button
                            onClick={() => setA4Printer(printer.name)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              isSelectedA4
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isSelectedA4 ? '✓ A4 Laser (Active)' : 'Set as A4 Laser'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hardware Diagnostics Testing Bar */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-brand-500" />
                  Live Printer Hardware Test Controls
                </h4>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleTestPrint('80mm')}
                    disabled={testPrintStatus === 'printing'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center space-x-2 shadow-md transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print 80mm Test Slip</span>
                  </button>

                  <button
                    onClick={() => handleTestPrint('58mm')}
                    disabled={testPrintStatus === 'printing'}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-2 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print 58mm Test Slip</span>
                  </button>

                  <button
                    onClick={handleKickDrawer}
                    disabled={cashDrawerStatus === 'triggering'}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-2 shadow-md transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Test RJ11 Cash Drawer Kick</span>
                  </button>
                </div>

                {testPrintStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    testPrintStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {testPrintStatus === 'printing' ? 'Sending RAW test stream to printer...' : 'Test print slip sent to thermal printer successfully!'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: BARCODE SCANNER HUB ================= */}
          {activeTab === 'scanner' && (
            <div className="space-y-5">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-gradient-to-r from-slate-800 to-slate-800/60 border-slate-700' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
              }`}>
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-xl bg-amber-500 text-white shadow-md">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm">USB HID Barcode Scanner Engine</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-bold border border-emerald-500/30">
                        Plug & Play Active
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Supports 1D Laser (Honeywell, TVS, Zebra) & 2D QR Code Wireless Handheld Scanners
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-amber-500">{scannerStatus.totalScans} total scans</div>
                  <div className="text-[10px] text-slate-400">{scannerStatus.scanSpeedMs || 16}ms burst rate</div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Real-Time Physical Scanner Test Box
                </h4>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Aim your handheld barcode gun at any physical product barcode and press trigger:
                </p>

                <div className="relative">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={scannerInputVal}
                    onChange={(e) => setScannerInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && scannerInputVal.trim()) {
                        handleSimulateScan(scannerInputVal.trim(), 'Custom Physical Scan');
                        setScannerInputVal('');
                      }
                    }}
                    placeholder="Click here and scan any barcode with your barcode reader..."
                    className={`w-full text-sm font-mono font-bold rounded-xl border p-3 pl-10 outline-none transition-all ${
                      isDark ? 'bg-slate-900 border-slate-700 text-emerald-400 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                  <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Quick Barcode Simulation Testing (1-Click Test)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleSimulateScan('8901030383827', 'Tata Salt Iodized 1kg')}
                    className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                      isDark ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">Tata Salt 1kg</div>
                    <div className="font-mono text-[11px] text-amber-500 mt-0.5">8901030383827 (EAN-13)</div>
                  </button>

                  <button
                    onClick={() => handleSimulateScan('8901058852391', 'Maggi Masala 2-Min Noodles')}
                    className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                      isDark ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">Maggi Noodles 70g</div>
                    <div className="font-mono text-[11px] text-amber-500 mt-0.5">8901058852391 (EAN-13)</div>
                  </button>

                  <button
                    onClick={() => handleSimulateScan('8901396112108', 'Dettol Original Soap 75g')}
                    className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                      isDark ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">Dettol Soap 75g</div>
                    <div className="font-mono text-[11px] text-amber-500 mt-0.5">8901396112108 (EAN-13)</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: ELECTRONIC WEIGHING SCALE ================= */}
          {activeTab === 'scale' && (
            <div className="space-y-5">
              {/* Digital LED 7-Segment Weight Meter */}
              <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
                isDark ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950/40 border-purple-500/30' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className="p-3.5 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/30 shrink-0">
                    <Scale className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-base">Live Electronic Weighing Scale</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        scaleStatus.isStable 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {scaleStatus.isStable ? '● STABLE' : '○ STABILIZING'}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Continuous RS-232 / USB Serial protocol for Grocery, Fruits, Vegetables & Sweets
                    </p>
                    <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                      <span>Port: {scaleStatus.port || 'COM1 / USB Serial'}</span>
                      <span>•</span>
                      <span>Baud: {scaleStatus.baudRate || 9600}</span>
                      <span>•</span>
                      <span>Tare: {Number(scaleStatus.tareWeight || 0).toFixed(3)} kg</span>
                    </div>
                  </div>
                </div>

                {/* Big LED Meter */}
                <div className="bg-black/90 px-6 py-4 rounded-2xl border-2 border-purple-500/50 shadow-inner flex flex-col items-center">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">
                    NET WEIGHT (KG)
                  </div>
                  <div className="text-4xl sm:text-5xl font-mono font-black tracking-wider text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                    {Number(scaleStatus.weight || 0).toFixed(3)}
                    <span className="text-lg text-emerald-500/80 ml-1 font-sans">kg</span>
                  </div>
                </div>
              </div>

              {/* Hardware Scale Controls (Tare, Zero, Connect) */}
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-500" />
                  Scale Hardware Calibration & Port Connection
                </h4>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={tareScale}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
                  >
                    <span>TARE (Zero Container Weight)</span>
                  </button>

                  <button
                    onClick={zeroScale}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5"
                  >
                    <span>ZERO (Reset Tare)</span>
                  </button>

                  <div className="flex items-center space-x-2 pl-3 border-l border-slate-700">
                    <select
                      value={selectedBaudRate}
                      onChange={(e) => setSelectedBaudRate(Number(e.target.value))}
                      className={`text-xs font-medium rounded-xl border p-2 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value={9600}>9600 Baud</option>
                      <option value={4800}>4800 Baud</option>
                      <option value={2400}>2400 Baud</option>
                      <option value={19200}>19200 Baud</option>
                    </select>

                    <button
                      onClick={handleConnectScalePort}
                      disabled={scaleSerialConnecting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{scaleSerialConnecting ? 'Connecting Port...' : 'Connect Serial Scale (USB/RS232)'}</span>
                    </button>
                  </div>
                </div>

                {scaleSerialMsg && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    scaleSerialMsg.success 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{scaleSerialMsg.message || scaleSerialMsg.error}</span>
                  </div>
                )}
              </div>

              {/* Digital Simulation Quick Weights */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Weighing Scale Simulation Quick Weights (1-Click Test)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <button
                    onClick={() => simulateScaleWeight(0.250)}
                    className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${
                      isDark ? 'bg-slate-800/80 border-slate-700 hover:border-purple-500' : 'bg-white border-slate-200 hover:border-purple-500 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">250g</div>
                    <div className="font-mono text-[11px] text-purple-400 mt-0.5">0.250 kg</div>
                  </button>

                  <button
                    onClick={() => simulateScaleWeight(0.500)}
                    className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${
                      isDark ? 'bg-slate-800/80 border-slate-700 hover:border-purple-500' : 'bg-white border-slate-200 hover:border-purple-500 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">500g</div>
                    <div className="font-mono text-[11px] text-purple-400 mt-0.5">0.500 kg</div>
                  </button>

                  <button
                    onClick={() => simulateScaleWeight(1.000)}
                    className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${
                      isDark ? 'bg-slate-800/80 border-slate-700 hover:border-purple-500' : 'bg-white border-slate-200 hover:border-purple-500 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">1.0 kg</div>
                    <div className="font-mono text-[11px] text-purple-400 mt-0.5">1.000 kg</div>
                  </button>

                  <button
                    onClick={() => simulateScaleWeight(1.750)}
                    className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${
                      isDark ? 'bg-slate-800/80 border-slate-700 hover:border-purple-500' : 'bg-white border-slate-200 hover:border-purple-500 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">1.75 kg</div>
                    <div className="font-mono text-[11px] text-purple-400 mt-0.5">1.750 kg</div>
                  </button>

                  <button
                    onClick={() => simulateScaleWeight(5.000)}
                    className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${
                      isDark ? 'bg-slate-800/80 border-slate-700 hover:border-purple-500' : 'bg-white border-slate-200 hover:border-purple-500 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">5.0 kg</div>
                    <div className="font-mono text-[11px] text-purple-400 mt-0.5">5.000 kg</div>
                  </button>

                  <button
                    onClick={() => simulateScaleWeight(0.000)}
                    className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${
                      isDark ? 'bg-rose-950/30 border-rose-800/50 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs">Empty</div>
                    <div className="font-mono text-[11px] mt-0.5">0.000 kg</div>
                  </button>
                </div>
              </div>

              {/* Supported Scale Manufacturers */}
              <div className={`p-3.5 rounded-xl border text-[11px] ${
                isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <span className="font-bold text-slate-300">Compatible Scale Brands: </span>
                Essae-Teraoka (DS-215 / DS-415), CAS (SW-1 / PD-2), Phoenix Scales, Citizen, Sansui POS, Toledo & Standard RS-232 Continuous ASCII Scales.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>KwikStore Hardware Spooler Engine v1.1.0</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}
