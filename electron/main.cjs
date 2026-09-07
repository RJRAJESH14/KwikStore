const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
