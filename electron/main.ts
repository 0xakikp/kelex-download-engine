import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { updateElectronApp } from 'electron-updater';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Enable auto-updater
updateElectronApp();

// Globals
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Detect if running in dev or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Path to the built web app
const getWebAppPath = () => {
  if (isDev) {
    return 'http://localhost:5173';
  }
  return path.join(__dirname, '..', 'dist', 'index.html');
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 960,
    minHeight: 600,
    title: 'Kelex Downloader',
    show: false, // Show when ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 15, y: 12 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for file downloads
    },
    icon: path.join(__dirname, '..', 'public', 'logo-kelex.png'),
  });

  const startUrl = getWebAppPath();
  if (startUrl.startsWith('http')) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(startUrl);
  }

  // Show window when ready (prevents flash of unstyled content)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'logo-kelex.png');
  // Use a simple colored circle as tray icon fallback
  const trayIcon = nativeImage.createFromNamedImage('NSActionTemplate', [16, 16]).resize({ width: 16, height: 16 });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Kelex Downloader');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Kelex',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'New Download',
      accelerator: 'CmdOrCtrl+N',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('app-command', { action: 'new-download' });
      },
    },
    { type: 'separator' },
    {
      label: 'Pause All',
      click: () => {
        mainWindow?.webContents.send('app-command', { action: 'pause-all' });
      },
    },
    {
      label: 'Resume All',
      click: () => {
        mainWindow?.webContents.send('app-command', { action: 'resume-all' });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double click to show
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  // Single click on macOS
  tray.on('click', () => {
    if (process.platform === 'darwin') {
      if (mainWindow?.isVisible()) {
        mainWindow?.hide();
      } else {
        mainWindow?.show();
        mainWindow?.focus();
      }
    }
  });
}

// Create application menu (macOS)
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'About Kelex' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('app-command', { action: 'open-settings' });
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Download',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('app-command', { action: 'new-download' });
          },
        },
        {
          label: 'Paste URL',
          accelerator: 'CmdOrCtrl+V',
          click: () => {
            mainWindow?.webContents.send('app-command', { action: 'paste-url' });
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Downloads',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.webContents.send('app-command', { action: 'navigate', page: '/downloads' }),
        },
        {
          label: 'YouTube',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow?.webContents.send('app-command', { action: 'navigate', page: '/youtube' }),
        },
        {
          label: 'Torrents',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow?.webContents.send('app-command', { action: 'navigate', page: '/torrents' }),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Kelex Documentation',
          click: () => shell.openExternal('https://kelex.app/docs'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/kelex/downloader/issues'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// IPC handlers
ipcMain.handle('app-version', () => app.getVersion());

ipcMain.handle('platform', () => process.platform);

ipcMain.handle('show-save-dialog', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Handle download started from renderer
ipcMain.on('start-download', (_event, data) => {
  console.log('Download requested:', data.url);
  // In a real app, this would trigger the actual download engine
});

// Auto-updater events
if (!isDev) {
  app.on('ready', () => {
    // Check for updates after 3 seconds
    setTimeout(() => {
      // Auto-updater will handle this via updateElectronApp()
    }, 3000);
  });
}
