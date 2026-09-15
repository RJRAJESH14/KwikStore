const { app, BrowserWindow, Menu, shell, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  console.log('electron-updater not available:', e.message);
}

// Windows 7 / 8 / 8.1 (NT kernel 6.1, 6.2, 6.3) GPU & crash prevention
if (process.platform === 'win32') {
  const release = os.release(); // e.g. "6.1.7601"
  if (release.startsWith('6.1') || release.startsWith('6.2') || release.startsWith('6.3')) {
    console.log('[Windows 7/8 Compatibility] Applying GPU safety flags to prevent blank screen crashes.');
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-software-rasterizer');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-d3d11');
    app.commandLine.appendSwitch('no-sandbox');
  }
}

// Handle EADDRINUSE or background server port conflicts silently
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('[Notice] Port already in use. Attaching to existing running server instance.');
  } else {
    console.error('Electron main process uncaught exception:', err);
    try {
      const logFile = path.join(app.getPath('userData'), 'kwikstore-error.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Uncaught Exception:\n${err.stack || err}\n\n`);
    } catch (e) {}
  }
});

let mainWindow = null;
let cfdWindow = null;
let serverStarted = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SERVER_PORT = 4848;

function openCfdWindow(customUrl) {
  if (cfdWindow && !cfdWindow.isDestroyed()) {
    cfdWindow.show();
    cfdWindow.focus();
    return cfdWindow;
  }

  // Detect secondary display for dual-monitor customer-facing setup
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const secondaryDisplay = displays.find(d => d.id !== primaryDisplay.id);

  let windowOptions = {
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: 'KwikStore Pro - Customer Facing Display (CFD)',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: process.platform === 'win32'
      ? path.join(__dirname, '..', 'build', 'icon.ico')
      : path.join(__dirname, '..', 'build', 'icon.png')
  };

  if (secondaryDisplay) {
    windowOptions.x = secondaryDisplay.bounds.x + 40;
    windowOptions.y = secondaryDisplay.bounds.y + 40;
  }

  cfdWindow = new BrowserWindow(windowOptions);

  const targetUrl = customUrl || (isDev ? 'http://localhost:5173/customer-display' : `http://localhost:${SERVER_PORT}/customer-display`);
  cfdWindow.loadURL(targetUrl);

  cfdWindow.on('closed', () => {
    cfdWindow = null;
  });

  return cfdWindow;
}

async function startBackendServer() {
  if (serverStarted) return true;
  try {
    const userDataDir = isDev 
      ? path.join(__dirname, '..', 'data')
      : path.join(app.getPath('userData'), 'data');
      
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    process.env.KWIKSTORE_DATA_DIR = userDataDir;

    // Seed/migrate database if needed
    const destDb = path.join(userDataDir, 'kwikstore.db');
    if (!fs.existsSync(destDb)) {
      const candidateDbs = [
        path.join(__dirname, '..', 'data', 'kwikstore.db'),
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'data', 'kwikstore.db'),
        path.join(__dirname, '..', 'server', 'data', 'kwikstore.db')
      ];
      for (const srcDb of candidateDbs) {
        if (fs.existsSync(srcDb)) {
          try {
            fs.copyFileSync(srcDb, destDb);
            console.log('Synchronized database to:', destDb);
            break;
          } catch (e) {}
        }
      }
    }

    // Locate physical server.js (handles ASAR unpacked extraction)
    let serverPath = path.join(__dirname, '..', 'server', 'server.js');
    if (!fs.existsSync(serverPath)) {
      const unpackedCandidate = serverPath.replace('app.asar', 'app.asar.unpacked');
      if (fs.existsSync(unpackedCandidate)) {
        serverPath = unpackedCandidate;
      }
    }

    console.log('Starting KwikStore Pro in-process backend server from:', serverPath);
    
    // Windows file:// URL conversion is required for Node ESM dynamic import on Windows
    const serverUrl = pathToFileURL(serverPath).href;
    await import(serverUrl);
    serverStarted = true;
    console.log(`KwikStore Pro backend server active on http://localhost:${SERVER_PORT}`);
    return true;
  } catch (err) {
    console.error('Failed to start KwikStore backend server:', err);
    try {
      const logFile = path.join(app.getPath('userData'), 'kwikstore-startup-error.log');
      fs.writeFileSync(logFile, `Startup error at ${new Date().toISOString()}:\n${err.stack || err}\n`, 'utf8');
    } catch (e) {}
    return false;
  }
}

function loadApp(retries = 20) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  const targetUrl = `http://localhost:${SERVER_PORT}`;
  mainWindow.loadURL(targetUrl).catch((err) => {
    console.warn(`[Attempt ${21 - retries}] Waiting for backend server on ${targetUrl}...`, err.message);
    if (retries > 0) {
      setTimeout(() => loadApp(retries - 1), 500);
    } else {
      console.error('Backend server connection timed out. Loading local dist fallback...');
      let distIndex = path.join(__dirname, '..', 'dist', 'index.html');
      if (!fs.existsSync(distIndex)) {
        distIndex = distIndex.replace('app.asar', 'app.asar.unpacked');
      }
      if (fs.existsSync(distIndex)) {
        mainWindow.loadFile(distIndex);
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0f172a',
    title: 'KwikStore Pro - Universal Indian Retail & Billing POS',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: process.platform === 'win32'
      ? path.join(__dirname, '..', 'build', 'icon.ico')
      : path.join(__dirname, '..', 'build', 'icon.png')
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Fallback to ensure window shows even if ready-to-show takes long
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1500);

  loadApp();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('customer-display') || url.includes('/cfd')) {
      openCfdWindow(url);
      return { action: 'deny' };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (cfdWindow && !cfdWindow.isDestroyed()) {
      cfdWindow.close();
    }
  });

  createApplicationMenu();
}

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Reload App', accelerator: 'CmdOrCtrl+R', click: () => mainWindow && mainWindow.reload() },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow && mainWindow.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { role: 'quit', label: 'Exit KwikStore' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Full Screen POS Mode' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Customer Support & WhatsApp',
          click: () => {
            shell.openExternal('https://fleetbillpro.in');
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            shell.openExternal('https://fleetbillpro.in');
          }
        },
        { type: 'separator' },
        {
          label: 'About KwikStore Pro',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About KwikStore Pro',
              message: 'KwikStore Pro POS v1.2.0',
              detail: 'Universal Indian Billing POS + Multi-Shop + HRMS Desktop Application\n\nHelpline & WhatsApp: +91 8338833377\nOfficial Portal: https://fleetbillpro.in\nFleetBillPro Enterprise Cloud Channel'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  await startBackendServer();
  createWindow();

  // Setup auto-updater IPC handlers
  if (autoUpdater) {
    ipcMain.handle('check-update', async () => {
      try {
        if (isDev) {
          return { success: false, error: 'Auto-update is disabled in development mode' };
        }
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result?.updateInfo };
      } catch (err) {
        console.error('Update check failed:', err);
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('download-update', async () => {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (err) {
        console.error('Update download failed:', err);
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('install-update', () => {
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (err) {
        console.error('Failed to quit and install update:', err);
      }
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', {
          percent: Math.round(progressObj.percent || 0),
          bytesPerSecond: progressObj.bytesPerSecond || 0,
          transferred: progressObj.transferred || 0,
          total: progressObj.total || 0
        });
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });

    autoUpdater.on('error', (err) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', err?.message || 'Update error');
      }
    });
  }

  // Customer Facing Display (CFD) IPC Handler
  ipcMain.handle('open-cfd-window', () => {
    openCfdWindow();
    return { success: true };
  });

  // Hardware & Printer IPC Handlers
  ipcMain.handle('get-system-printers', async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const printers = await mainWindow.webContents.getPrintersAsync();
        return { success: true, printers };
      }
      return { success: true, printers: [] };
    } catch (err) {
      console.error('Failed to enumerate Electron printers:', err);
      return { success: false, error: err.message, printers: [] };
    }
  });

  ipcMain.handle('print-to-device', async (event, options = {}) => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return { success: false, error: 'Main window not available' };
      }
      return new Promise((resolve) => {
        mainWindow.webContents.print(
          {
            silent: options.silent || false,
            printBackground: true,
            deviceName: options.printerName || '',
            margins: { marginType: 'none' }
          },
          (success, failureReason) => {
            resolve({ success, failureReason });
          }
        );
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
