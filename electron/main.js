const { app, BrowserWindow, Tray, Menu, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Enforce single instance lock so the app never duplicates in memory on boot
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Low-memory Chromium flags tuned for 4GB RAM Windows PCs
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('mute-audio');
app.commandLine.appendSwitch('aggressive-cache-discard');
app.commandLine.appendSwitch('disk-cache-size', '10485760');
app.commandLine.appendSwitch('media-cache-size', '5242880');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,AudioServiceOutOfProcess,MediaRouter,OptimizationHints');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128 --optimize-for-size');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let shownTrayNotice = false;

// Determine if started hidden (e.g. from Windows boot auto-run)
const isStartMinimized = process.argv.includes('--hidden') || process.argv.includes('--minimized');

// Start Express Backend directly inside the Node main runtime
const PORT = process.env.PORT || 3847;

global.wishSyncTrayNotify = (title, content) => {
  if (tray) {
    try {
      tray.displayBalloon?.({ title, content });
    } catch (e) {}
  }
};

function startBackendServer() {
  try {
    process.env.OPEN_BROWSER_ON_BOOT = 'false'; // prevent duplicate system browser opens
    process.env.STARTUP_BOOT = isStartMinimized ? 'true' : 'false';
    require('../src/index.js');
    console.log('[Electron] Embedded WishSync Express server active on port ' + PORT + (isStartMinimized ? ' (Windows boot standby)' : ''));
  } catch (err) {
    console.error('[Electron] Failed to start embedded backend:', err);
  }
}

function getIconPath() {
  const ico = path.join(__dirname, '../build/icon.ico');
  const png = path.join(__dirname, '../build/icon.png');
  if (fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  return null;
}

function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  const iconPath = getIconPath();
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'WishSync — Sussex College Network',
    icon: iconPath,
    backgroundColor: '#F4F5F7',
    show: false, // Don't show until ready-to-show
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Remove default menu bar for clean native app appearance
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Release UI Chromium renderer RAM completely when window is closed, keeping tray + WhatsApp engine alive
  mainWindow.on('close', () => {
    if (!isQuitting && tray && !shownTrayNotice) {
      shownTrayNotice = true;
      tray.displayBalloon?.({
        title: 'WishSync Running in Tray',
        content: 'Window closed to save RAM. WishSync remains active in the background.'
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    session.defaultSession.clearCache().catch(() => {});
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) return;

  tray = new Tray(iconPath);
  tray.setToolTip('WishSync — Sussex College Network');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open WishSync',
      click: () => createWindow()
    },
    {
      label: 'Sync Google Sheets Now',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript("if (typeof fetchAllState === 'function') fetchAllState();");
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'WhatsApp Status / Re-Pair',
      click: () => {
        createWindow();
        mainWindow?.webContents.executeJavaScript("document.getElementById('whatsappStatusBtn')?.click();");
      }
    },
    { type: 'separator' },
    {
      label: 'Launch at Windows Startup',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true,
          args: ['--hidden']
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit WishSync',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => createWindow());
}

// Ensure Windows auto-start is registered by default
function setupAutoStart() {
  try {
    const settings = app.getLoginItemSettings();
    if (!settings.openAtLogin) {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
        args: ['--hidden']
      });
      console.log('[Electron] Registered WishSync for automatic Windows boot startup.');
    }
  } catch (err) {
    console.warn('[Electron] Auto-start registration warning:', err.message);
  }
}

// Register custom protocol so browser can bring WishSync to foreground after OAuth
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('wishsync', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('wishsync');
}

// App lifecycle
app.whenReady().then(() => {
  startBackendServer();
  setupAutoStart();
  createTray();

  // If not booting silently in the background, open the primary dashboard
  if (!isStartMinimized) {
    createWindow();
  }
});

function bringWindowToForeground() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    // Trigger dashboard state refresh after OAuth
    mainWindow.webContents.executeJavaScript("if (typeof fetchAllState === 'function') fetchAllState();");
  } else {
    createWindow();
  }
}

// Second instance triggered: restore existing window or handle custom protocol
app.on('second-instance', (event, commandLine) => {
  bringWindowToForeground();
});

// macOS / Windows protocol handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  bringWindowToForeground();
});

app.on('before-quit', () => {
  isQuitting = true;
  try {
    const whatsappClient = require('../src/services/whatsappClient');
    whatsappClient.shutdown().catch(() => {});
  } catch (e) {}
});

app.on('window-all-closed', () => {
  // Do not quit when windows close on Windows, stay resident in tray!
});

