const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell, Notification, clipboard } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let clipboardWatcher = null;
let backendProcess = null;

const isDev = !app.isPackaged;
const userDataPath = app.getPath('userData');
const windowStateFile = path.join(userDataPath, 'window-state.json');

// Backend API server path - handles both dev and packaged app
const BACKEND_DIR = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend');
const BACKEND_DIST = path.join(BACKEND_DIR, 'dist', 'index.js');

// Start embedded backend API server
function startBackend() {
  if (!fs.existsSync(BACKEND_DIST)) {
    console.error('[Backend] Backend not found at:', BACKEND_DIST);
    return false;
  }

  const env = {
    ...process.env,
    PORT: '3001',
    DOWNLOAD_DIR: path.join(userDataPath, 'downloads'),
    NODE_ENV: isDev ? 'development' : 'production',
  };

  // Ensure download dir exists
  if (!fs.existsSync(env.DOWNLOAD_DIR)) {
    fs.mkdirSync(env.DOWNLOAD_DIR, { recursive: true });
  }

  backendProcess = spawn('node', [BACKEND_DIST], {
    cwd: BACKEND_DIR,
    env,
    stdio: 'pipe',
  });

  backendProcess.stdout.on('data', (data) => {
    console.log('[Backend]', data.toString().trim());
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('[Backend]', data.toString().trim());
  });

  backendProcess.on('exit', (code) => {
    console.log('[Backend] exited with code', code);
    backendProcess = null;
  });

  backendProcess.on('error', (err) => {
    console.error('[Backend] failed to start:', err.message);
    backendProcess = null;
  });

  console.log('[Backend] Starting at http://localhost:3001');
  return true;
}

function stopBackend() {
  if (backendProcess) {
    console.log('[Backend] Stopping...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

// Load saved window state
function loadWindowState() {
  try {
    if (fs.existsSync(windowStateFile)) {
      return JSON.parse(fs.readFileSync(windowStateFile, 'utf8'));
    }
  } catch {}
  return { width: 1400, height: 880, x: undefined, y: undefined, maximized: false };
}

// Save window state
function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getNormalBounds();
  const state = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: mainWindow.isMaximized(),
  };
  try {
    fs.writeFileSync(windowStateFile, JSON.stringify(state));
  } catch {}
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 960,
    minHeight: 600,
    title: 'Kelex Downloader',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 15, y: 12 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', 'public', 'logo-kelex.png'),
  });

  if (state.maximized) {
    mainWindow.maximize();
  }

  const startUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;
  if (isDev) {
    mainWindow.loadURL(startUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL(startUrl);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!isDev) autoUpdater.checkForUpdatesAndNotify();
  });

  // Save window state on change
  ['resize', 'move', 'close'].forEach(evt => {
    mainWindow.on(evt, saveWindowState);
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow.hide();
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

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle dropped files
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      document.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      document.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).map(f => f.path);
        const text = e.dataTransfer.getData('text');
        window.electronAPI?.onFilesDropped?.({ files, text });
      });
    `).catch(() => {});
  });
}

// System tray
function createTray() {
  let trayIcon;
  try {
    const iconPath = path.join(__dirname, '..', 'public', 'logo-kelex.png');
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

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
        mainWindow?.focus();
        mainWindow?.webContents.send('app-command', { action: 'new-download' });
      },
    },
    {
      label: 'Paste URL',
      accelerator: 'CmdOrCtrl+V',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        const text = clipboard.readText();
        if (text) mainWindow?.webContents.send('app-command', { action: 'paste-url', data: text });
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

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

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

// Application menu
function createMenu() {
  const template = [
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
            const text = clipboard.readText();
            if (text) mainWindow?.webContents.send('app-command', { action: 'paste-url', data: text });
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
        {
          label: 'Files',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow?.webContents.send('app-command', { action: 'navigate', page: '/files' }),
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

// Clipboard monitoring
function startClipboardWatcher() {
  let lastText = clipboard.readText();
  clipboardWatcher = setInterval(() => {
    const current = clipboard.readText();
    if (current !== lastText && current) {
      lastText = current;
      // Check if it's a URL we care about
      const isUrl = /^https?:\/\/.+/i.test(current) || /^magnet:/i.test(current) || /youtube\.com|youtu\.be/i.test(current);
      if (isUrl && mainWindow) {
        mainWindow.webContents.send('app-command', { action: 'clipboard-url', data: current });
      }
    }
  }, 1000);
}

function stopClipboardWatcher() {
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher);
    clipboardWatcher = null;
  }
}

// App event handlers
app.whenReady().then(async () => {
  // Start embedded backend first
  const backendStarted = startBackend();
  if (!backendStarted) {
    console.error('[Main] Failed to start backend. The app may not work correctly.');
  }

  // Wait a moment for backend to be ready
  await new Promise(resolve => setTimeout(resolve, 1500));

  createWindow();
  createTray();
  createMenu();
  startClipboardWatcher();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopClipboardWatcher();
    stopBackend();
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

app.on('before-quit', () => {
  isQuitting = true;
  stopClipboardWatcher();
  stopBackend();
  saveWindowState();
});

// IPC handlers
ipcMain.handle('app-version', () => app.getVersion());

ipcMain.handle('platform', () => process.platform);

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.filePaths[0] || null;
});

ipcMain.handle('open-folder', async (_, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('show-save-dialog', async (_, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (_, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Show notification
ipcMain.handle('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, '..', 'public', 'logo-kelex.png') }).show();
  }
});

// Download complete - show in folder
ipcMain.handle('show-in-folder', (_, filePath) => {
  shell.showItemInFolder(filePath);
});

// Start download from renderer
ipcMain.on('start-download', (_event, data) => {
  console.log('Download requested:', data.url);
  // Forward to renderer for processing via backend API
  mainWindow?.webContents.send('app-command', { action: 'start-download', data });
});

// Auto-updater events
if (!isDev) {
  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded');
  });
}

// Protocol handler for kelex:// links
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('kelex', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('kelex');
}

// Handle kelex:// protocol links
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('kelex://')) {
    const targetUrl = url.replace('kelex://', '');
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('app-command', { action: 'deep-link', data: targetUrl });
    }
  }
});

// Handle second instance (deep link from already running app)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      const url = commandLine.find(arg => arg.startsWith('kelex://'));
      if (url) {
        const targetUrl = url.replace('kelex://', '');
        mainWindow.webContents.send('app-command', { action: 'deep-link', data: targetUrl });
      }
    }
  });
}
