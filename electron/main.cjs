const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  console.log('electron-updater not available:', e.message);
}

// Handle EADDRINUSE or background server port conflicts silently
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('[Notice] Port already in use. Attaching to existing running server instance.');
  } else {
    console.error('Electron main process uncaught exception:', err);
  }
});

let mainWindow = null;
let serverStarted = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SERVER_PORT = 4848;

async function startBackendServer() {
  if (serverStarted) return;
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

    console.log('Starting KwikStore Pro in-process backend server...');
    await import('../server/server.js');
    serverStarted = true;
    console.log(`KwikStore Pro backend server active on http://localhost:${SERVER_PORT}`);
  } catch (err) {
    console.error('Failed to start KwikStore backend server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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
        { role: 'togglefullscreen', label: 'Full Screen POS Mode' }
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
          label: 'Check for Updates (GitHub)',
          click: () => {
            shell.openExternal('https://github.com/RJRAJESH14/KwikStore/releases');
          }
        },
        { type: 'separator' },
        {
          label: 'About KwikStore Pro',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About KwikStore Pro',
              message: 'KwikStore Pro POS v1.1.0',
              detail: 'Universal Indian Billing POS + Multi-Shop + HRMS Desktop Application\n\nHelpline & WhatsApp: +91 8338833377\nWebsite: https://fleetbillpro.in\nGitHub: https://github.com/RJRAJESH14/KwikStore'
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
