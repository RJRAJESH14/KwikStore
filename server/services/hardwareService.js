import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// In-memory counter registry for LAN terminals
const activeCounters = new Map();

// Helper to get local IPv4 addresses
export function getLocalNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          interface: name,
          address: net.address,
          netmask: net.netmask,
          mac: net.mac
        });
      }
    }
  }

  // If no external IP found, include localhost
  if (addresses.length === 0) {
    addresses.push({
      interface: 'lo',
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      mac: '00:00:00:00:00:00'
    });
  }

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    primaryIp: addresses[0]?.address || '127.0.0.1',
    allIps: addresses,
    port: process.env.PORT || 4848,
    serverTime: new Date().toISOString()
  };
}

// Register or update a counter terminal heartbeat
export function registerCounter(counterData) {
  const { terminalId, terminalName, ip, role, user } = counterData;
  const id = terminalId || `CTR-${ip || 'UNKNOWN'}`;
  
  const record = {
    id,
    terminalName: terminalName || `Counter ${id.slice(-4)}`,
    ip: ip || '127.0.0.1',
    role: role || 'CLIENT',
    user: user || 'Counter Staff',
    lastSeen: Date.now(),
    status: 'ONLINE'
  };

  activeCounters.set(id, record);
  return record;
}

// Get all active counters (prune stale ones older than 90s)
export function getActiveCounters() {
  const now = Date.now();
  const result = [];

  // Add Host Server as primary counter
  const netInfo = getLocalNetworkInfo();
  result.push({
    id: 'HOST-MASTER',
    terminalName: `Master Server (${netInfo.hostname})`,
    ip: netInfo.primaryIp,
    role: 'HOST_SERVER',
    user: 'Administrator / Owner',
    lastSeen: now,
    status: 'ONLINE',
    isHost: true
  });

  for (const [id, counter] of activeCounters.entries()) {
    if (now - counter.lastSeen > 90000) {
      // Mark as offline after 90s, delete after 5m
      if (now - counter.lastSeen > 300000) {
        activeCounters.delete(id);
        continue;
      }
      counter.status = 'OFFLINE';
    } else {
      counter.status = 'ONLINE';
    }
    result.push(counter);
  }

  return result;
}

// Enumerate system printers via OS commands (fallback when outside Electron webContents)
export async function getSystemPrinters() {
  const platform = process.platform;
  const printers = [];

  try {
    if (platform === 'win32') {
      // Query Windows spooler via PowerShell
      const psScript = `Get-CimInstance Win32_Printer | Select-Object Name, PortName, Default, WorkOffline, PrinterStatus | ConvertTo-Json`;
      const { stdout } = await execPromise(`powershell -NoProfile -Command "${psScript}"`, { timeout: 4000 });
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const p of list) {
          if (p && p.Name) {
            printers.push({
              name: p.Name,
              port: p.PortName || 'USB',
              isDefault: Boolean(p.Default),
              status: p.WorkOffline ? 'OFFLINE' : 'READY',
              type: inferPrinterType(p.Name, p.PortName)
            });
          }
        }
      }
    } else if (platform === 'darwin' || platform === 'linux') {
      // Query CUPS spooler via lpstat
      try {
        const { stdout: pOut } = await execPromise('lpstat -p', { timeout: 3000 });
        let defaultPrinter = '';
        try {
          const { stdout: dOut } = await execPromise('lpstat -d', { timeout: 2000 });
          const match = dOut.match(/system default destination:\s*(.+)/i);
          if (match) defaultPrinter = match[1].trim();
        } catch (e) {}

        const lines = pOut.split('\n');
        for (const line of lines) {
          // Format: "printer HP_LaserJet is idle. enabled since..."
          const match = line.match(/^printer\s+([^\s]+)\s+(is|disabled)/i);
          if (match) {
            const name = match[1];
            const isIdle = line.includes('idle') || line.includes('ready');
            printers.push({
              name: name.replace(/_/g, ' '),
              systemName: name,
              port: 'CUPS / USB',
              isDefault: name === defaultPrinter,
              status: isIdle ? 'READY' : 'BUSY',
              type: inferPrinterType(name, '')
            });
          }
        }
      } catch (e) {
        // Fallback demo printer if no CUPS printers configured
      }
    }
  } catch (err) {
    console.log('[Hardware Service] Printer query note:', err.message);
  }

  // If no hardware printers found, return standard virtual/POS drivers
  if (printers.length === 0) {
    printers.push(
      { name: 'TVS RP 3200 Plus (Thermal POS)', port: 'USB001', isDefault: true, status: 'READY', type: 'THERMAL_80MM' },
      { name: 'EPSON TM-T82X (Thermal 80mm)', port: 'USB002', isDefault: false, status: 'READY', type: 'THERMAL_80MM' },
      { name: 'HP LaserJet Pro M126nw (A4 Laser)', port: 'IP_192.168.1.150', isDefault: false, status: 'READY', type: 'LASER_A4' },
      { name: 'Microsoft Print to PDF', port: 'PORTPROMPT:', isDefault: false, status: 'READY', type: 'VIRTUAL_PDF' }
    );
  }

  return printers;
}

// Helper to infer printer type from its name and port
function inferPrinterType(name = '', port = '') {
  const lower = (name + ' ' + port).toLowerCase();
  if (lower.includes('thermal') || lower.includes('pos') || lower.includes('rp') || lower.includes('t82') || lower.includes('receipt') || lower.includes('80mm') || lower.includes('58mm')) {
    return lower.includes('58') ? 'THERMAL_58MM' : 'THERMAL_80MM';
  }
  if (lower.includes('laser') || lower.includes('deskjet') || lower.includes('inkjet') || lower.includes('canon') || lower.includes('epson l') || lower.includes('hp laser')) {
    return 'LASER_A4';
  }
  if (lower.includes('pdf') || lower.includes('xps') || lower.includes('onenote')) {
    return 'VIRTUAL_PDF';
  }
  return 'GENERIC_PRINTER';
}
