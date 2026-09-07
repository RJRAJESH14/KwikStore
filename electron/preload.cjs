const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: '1.1.0',
  isElectron: true,
  checkForUpdates: () => ipcRenderer.invoke('check-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onDownloadProgress: (callback) => {
    const listener = (_e, value) => callback(value);
    ipcRenderer.on('update-download-progress', listener);
    return () => ipcRenderer.removeListener('update-download-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_e, value) => callback(value);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (_e, value) => callback(value);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  }
});
