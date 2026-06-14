const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('platform'),
  isElectron: true,

  // Folders
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),

  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),

  // Download management
  startDownload: (data) => ipcRenderer.send('start-download', data),

  // Command channel (main -> renderer)
  onAppCommand: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('app-command', handler);
    return () => ipcRenderer.removeListener('app-command', handler);
  },

  // Update events
  onUpdateAvailable: (callback) => {
    const handler = (event) => callback();
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (event) => callback();
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },

  // File drop events
  onFilesDropped: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('files-dropped', handler);
    return () => ipcRenderer.removeListener('files-dropped', handler);
  },
});

// Simple flag for feature detection
contextBridge.exposeInMainWorld('isElectron', true);
