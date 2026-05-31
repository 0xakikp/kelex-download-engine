import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('platform'),

  // Command channel (main -> renderer)
  onAppCommand: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('app-command', callback);
    // Return cleanup function
    return () => ipcRenderer.removeListener('app-command', callback);
  },

  // Dialogs
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),

  // Download management
  startDownload: (data: { url: string; type?: string }) => {
    ipcRenderer.send('start-download', data);
  },

  // Check if running in Electron
  isElectron: true,
});

// Expose a simpler flag for feature detection
contextBridge.exposeInMainWorld('isElectron', true);

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      onAppCommand: (callback: (event: any, data: any) => void) => () => void;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      startDownload: (data: { url: string; type?: string }) => void;
      isElectron: boolean;
    };
    isElectron: boolean;
  }
}
