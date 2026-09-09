import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  // 1. LAN & Multi-Counter State
  const [lanMode, setLanMode] = useState(() => localStorage.getItem('kwikstore_lan_mode') || 'SERVER'); // 'SERVER' or 'CLIENT'
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('kwikstore_server_host') || '127.0.0.1:4848');
  const [terminalName, setTerminalName] = useState(() => localStorage.getItem('kwikstore_terminal_name') || 'Counter 01 (Main Billing)');
  const [terminalId] = useState(() => {
    let id = localStorage.getItem('kwikstore_terminal_id');
    if (!id) {
      id = 'CTR-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      localStorage.setItem('kwikstore_terminal_id', id);
    }
    return id;
  });

  const [isOnline, setIsOnline] = useState(true);
  const [pingLatency, setPingLatency] = useState(1);
  const [networkInfo, setNetworkInfo] = useState({
    hostname: 'localhost',
    primaryIp: '127.0.0.1',
    allIps: [{ interface: 'lo', address: '127.0.0.1' }],
    port: 4848
  });
  const [connectedCounters, setConnectedCounters] = useState([]);
  const [activeShift, setActiveShift] = useState({ id: 1, name: 'Morning Counter Shift' });

  // 2. Hardware Printers State
  const [printers, setPrinters] = useState([]);
  const [selectedReceiptPrinter, setSelectedReceiptPrinter] = useState(
    () => localStorage.getItem('kwikstore_receipt_printer') || ''
  );
  const [selectedA4Printer, setSelectedA4Printer] = useState(
    () => localStorage.getItem('kwikstore_a4_printer') || ''
  );
  const [isPrinterLoading, setIsPrinterLoading] = useState(false);

  // 3. Barcode Scanner Live HID State
  const [scannerStatus, setScannerStatus] = useState({
    isConnected: true,
    driverName: 'USB HID POS Barcode Scanner (Plug & Play)',
    lastBarcode: '',
    lastScanTime: null,
    scanSpeedMs: 0,
    totalScans: 0
  });

  // 4. Electronic Weighing Scale State (RS-232 / USB Serial & Web Serial)
  const [scaleStatus, setScaleStatus] = useState({
    isConnected: true,
    weight: 0.000,
    effectiveWeight: 0.000,
    unit: 'kg',
    isStable: true,
    tareWeight: 0.000,
    port: 'COM1 / USB Serial',
    baudRate: 9600,
    lastUpdated: Date.now()
  });

  // 5. Customer Facing Display (CFD) State & Broadcast Bus
  const [cfdData, setCfdData] = useState(() => {
    try {
      const saved = localStorage.getItem('kwikstore_cfd_cache');
      return saved ? JSON.parse(saved) : { status: 'IDLE', cart: [], total: 0, upiQrUrl: null };
    } catch (e) {
      return { status: 'IDLE', cart: [], total: 0, upiQrUrl: null };
    }
  });

  const scanListenersRef = useRef(new Set());
  const keyBufferRef = useRef([]);
  const lastKeyTimeRef = useRef(0);
  const serialPortRef = useRef(null);

  // Helper to update Network & LAN settings
  const updateNetworkSettings = (mode, host, name) => {
    setLanMode(mode);
    setServerHost(host);
    if (name) setTerminalName(name);
    localStorage.setItem('kwikstore_lan_mode', mode);
    localStorage.setItem('kwikstore_server_host', host);
    if (name) localStorage.setItem('kwikstore_terminal_name', name);
  };

  // Fetch Network & Counter Diagnostics
  const fetchNetworkDiagnostics = useCallback(async () => {
    const startTime = performance.now();
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      const res = await fetch(`${baseUrl}/api/hardware/network-status`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const latency = Math.round(performance.now() - startTime);
        setPingLatency(Math.max(1, latency));
        setIsOnline(true);
        if (data.network) setNetworkInfo(data.network);
        if (data.counters) setConnectedCounters(data.counters);
      } else {
        setIsOnline(false);
      }
    } catch (err) {
      setIsOnline(false);
      setPingLatency(999);
    }
  }, [lanMode, serverHost]);

  // Send periodic terminal heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      await fetch(`${baseUrl}/api/hardware/counter-heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId,
          terminalName,
          role: lanMode === 'SERVER' ? 'HOST_SERVER' : 'CLIENT_COUNTER'
        })
      });
    } catch (e) {}
  }, [lanMode, serverHost, terminalId, terminalName]);

  // Fetch System Printers
  const fetchPrinters = useCallback(async () => {
    setIsPrinterLoading(true);
    let list = [];

    // Check if running inside Electron desktop container
    if (window.electronAPI && typeof window.electronAPI.getSystemPrinters === 'function') {
      try {
        const electronRes = await window.electronAPI.getSystemPrinters();
        if (electronRes.success && electronRes.printers && electronRes.printers.length > 0) {
          list = electronRes.printers.map((p) => ({
            name: p.name,
            displayName: p.displayName || p.name,
            isDefault: p.isDefault,
            status: 'READY',
            type: p.name.toLowerCase().includes('laser') ? 'LASER_A4' : 'THERMAL_80MM',
            port: 'USB / System Spooler'
          }));
        }
      } catch (e) {
        console.warn('Electron printer enumeration fallback:', e);
      }
    }

    // Fallback to backend OS driver query
    if (list.length === 0) {
      try {
        const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
        const res = await fetch(`${baseUrl}/api/hardware/printers`);
        if (res.ok) {
          const data = await res.json();
          if (data.printers) list = data.printers;
        }
      } catch (err) {
        console.warn('Backend printer query error:', err);
      }
    }

    if (list.length === 0) {
      list = [
        { name: 'TVS RP 3200 Plus (Thermal 80mm)', isDefault: true, status: 'READY', type: 'THERMAL_80MM', port: 'USB001' },
        { name: 'EPSON TM-T82X (Thermal 80mm)', isDefault: false, status: 'READY', type: 'THERMAL_80MM', port: 'USB002' },
        { name: 'HP LaserJet Pro M126nw (A4)', isDefault: false, status: 'READY', type: 'LASER_A4', port: 'IP_192.168.1.150' },
        { name: 'Microsoft Print to PDF', isDefault: false, status: 'READY', type: 'VIRTUAL_PDF', port: 'PORTPROMPT:' }
      ];
    }

    setPrinters(list);

    const savedReceipt = localStorage.getItem('kwikstore_receipt_printer');
    const savedA4 = localStorage.getItem('kwikstore_a4_printer');

    if (!savedReceipt) {
      const defaultThermal = list.find((p) => p.type.includes('THERMAL') || p.name.toLowerCase().includes('pos') || p.name.toLowerCase().includes('thermal')) || list[0];
      if (defaultThermal) {
        setSelectedReceiptPrinter(defaultThermal.name);
        localStorage.setItem('kwikstore_receipt_printer', defaultThermal.name);
      }
    }
    if (!savedA4) {
      const defaultLaser = list.find((p) => p.type.includes('LASER') || p.name.toLowerCase().includes('laser') || p.name.toLowerCase().includes('pdf')) || list[0];
      if (defaultLaser) {
        setSelectedA4Printer(defaultLaser.name);
        localStorage.setItem('kwikstore_a4_printer', defaultLaser.name);
      }
    }

    setIsPrinterLoading(false);
  }, [lanMode, serverHost]);

  const setReceiptPrinter = (name) => {
    setSelectedReceiptPrinter(name);
    localStorage.setItem('kwikstore_receipt_printer', name);
  };

  const setA4Printer = (name) => {
    setSelectedA4Printer(name);
    localStorage.setItem('kwikstore_a4_printer', name);
  };

  // Test Print Slip action
  const testPrintReceipt = async (printerName = selectedReceiptPrinter, paperWidth = '80mm') => {
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      const res = await fetch(`${baseUrl}/api/hardware/test-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName, paperWidth })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Cash Drawer RJ-11 Kick action
  const kickCashDrawer = async (printerName = selectedReceiptPrinter) => {
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      const res = await fetch(`${baseUrl}/api/hardware/cash-drawer-kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // 6. Weighing Scale Methods
  const fetchScaleStatus = useCallback(async () => {
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      const res = await fetch(`${baseUrl}/api/hardware/scale/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.scale) setScaleStatus(data.scale);
      }
    } catch (e) {}
  }, [lanMode, serverHost]);

  const tareScale = async () => {
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      const res = await fetch(`${baseUrl}/api/hardware/scale/tare`, { method: 'POST' });
      const data = await res.json();
      if (data.scale) setScaleStatus(data.scale);
      return data;
    } catch (e) {
      setScaleStatus(prev => ({ ...prev, tareWeight: prev.weight, weight: 0 }));
    }
  };

  const zeroScale = async () => {
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      const res = await fetch(`${baseUrl}/api/hardware/scale/zero`, { method: 'POST' });
      const data = await res.json();
      if (data.scale) setScaleStatus(data.scale);
      return data;
    } catch (e) {
      setScaleStatus(prev => ({ ...prev, tareWeight: 0, weight: 0 }));
    }
  };

  const simulateScaleWeight = async (weightInKg) => {
    try {
      const baseUrl = lanMode === 'CLIENT' ? `http://${serverHost}` : '';
      const res = await fetch(`${baseUrl}/api/hardware/scale/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: weightInKg, isStable: true })
      });
      const data = await res.json();
      if (data.scale) setScaleStatus(data.scale);
    } catch (e) {
      setScaleStatus(prev => ({
        ...prev,
        weight: Number(weightInKg),
        effectiveWeight: Number(weightInKg),
        isStable: true,
        lastUpdated: Date.now()
      }));
    }
  };

  // Connect physical Serial Scale via Web Serial API (in Chromium / Electron)
  const connectWebSerialScale = async (baudRate = 9600) => {
    if (!('serial' in navigator)) {
      return { success: false, message: 'Web Serial API not supported in this browser environment.' };
    }
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(baudRate) });
      serialPortRef.current = port;

      setScaleStatus(prev => ({
        ...prev,
        isConnected: true,
        port: 'Web Serial Port',
        baudRate: Number(baudRate)
      }));

      const reader = port.readable.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep partial line
          for (const line of lines) {
            const match = line.match(/[-+]?\s*([0-9]+\.?[0-9]*)/);
            if (match) {
              const val = parseFloat(match[1]);
              if (!isNaN(val)) {
                simulateScaleWeight(val);
              }
            }
          }
        }
      })();

      return { success: true, message: 'Electronic Weighing Scale connected successfully via Serial Port!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // 7. Customer Facing Display Broadcast helper
  const updateCustomerDisplay = useCallback((displayPayload) => {
    const updated = {
      ...cfdData,
      ...displayPayload,
      timestamp: Date.now()
    };
    setCfdData(updated);
    try {
      localStorage.setItem('kwikstore_cfd_cache', JSON.stringify(updated));
      // Trigger storage event for multi-tab/secondary window sync
      window.dispatchEvent(new CustomEvent('cfd-update', { detail: updated }));
    } catch (e) {}
  }, [cfdData]);

  // 8. Global Barcode Scanner Burst Detector
  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = performance.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        if (keyBufferRef.current.length >= 3) {
          const scannedCode = keyBufferRef.current.join('');
          const scanDuration = Math.round(timeDiff * keyBufferRef.current.length);

          setScannerStatus((prev) => ({
            ...prev,
            isConnected: true,
            lastBarcode: scannedCode,
            lastScanTime: Date.now(),
            scanSpeedMs: Math.min(60, Math.max(8, Math.round(scanDuration / keyBufferRef.current.length))),
            totalScans: prev.totalScans + 1
          }));

          scanListenersRef.current.forEach((cb) => {
            try {
              cb(scannedCode);
            } catch (err) {}
          });
        }
        keyBufferRef.current = [];
      } else if (e.key.length === 1) {
        if (timeDiff > 120 && keyBufferRef.current.length > 0) {
          keyBufferRef.current = [];
        }
        keyBufferRef.current.push(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const subscribeToScanner = useCallback((callback) => {
    scanListenersRef.current.add(callback);
    return () => scanListenersRef.current.delete(callback);
  }, []);

  const simulateScan = useCallback((code) => {
    setScannerStatus((prev) => ({
      ...prev,
      isConnected: true,
      lastBarcode: code,
      lastScanTime: Date.now(),
      scanSpeedMs: 16,
      totalScans: prev.totalScans + 1
    }));
    scanListenersRef.current.forEach((cb) => cb(code));
  }, []);

  // Periodic polling
  useEffect(() => {
    fetchNetworkDiagnostics();
    fetchPrinters();
    fetchScaleStatus();
    sendHeartbeat();

    const interval = setInterval(() => {
      fetchNetworkDiagnostics();
      fetchScaleStatus();
      sendHeartbeat();
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchNetworkDiagnostics, fetchPrinters, fetchScaleStatus, sendHeartbeat]);

  return (
    <NetworkContext.Provider
      value={{
        // LAN & Network
        lanMode,
        serverHost,
        terminalName,
        terminalId,
        isOnline,
        pingLatency,
        networkInfo,
        connectedCounters,
        activeShift,
        setActiveShift,
        updateNetworkSettings,
        fetchNetworkDiagnostics,

        // Printers
        printers,
        selectedReceiptPrinter,
        selectedA4Printer,
        isPrinterLoading,
        setReceiptPrinter,
        setA4Printer,
        fetchPrinters,
        testPrintReceipt,
        kickCashDrawer,

        // Barcode Scanner
        scannerStatus,
        subscribeToScanner,
        simulateScan,

        // Electronic Weighing Scale
        scaleStatus,
        tareScale,
        zeroScale,
        simulateScaleWeight,
        connectWebSerialScale,
        fetchScaleStatus,

        // Customer Facing Display (CFD)
        cfdData,
        updateCustomerDisplay
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
export const useHardware = () => useContext(NetworkContext);
