import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { SerialManager } from './serial-manager'
// import icon from '../../resources/icon.png?asset' // TODO: Add proper icon

// Global serial manager instance (singleton - only one instance for entire app lifecycle)
const serialManager = new SerialManager()

// Flag to track if app is quitting (for async cleanup)
let isQuitting = false

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false, // CRITICAL: Wait for ready-to-show to prevent white flash
    backgroundColor: '#1a1a1a', // CRITICAL: Dark background prevents white flash on startup
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}), // TODO: Add proper icon
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // CRITICAL: Only show window after content is ready - prevents white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/**
 * Register IPC handlers for serial communication
 * Called once at app startup - handlers are global, not per-window
 */
function registerSerialIpcHandlers(): void {
  // List available serial ports
  ipcMain.handle('serial:list-ports', async () => {
    return await serialManager.listPorts()
  })

  // Connect to a serial port
  ipcMain.handle('serial:connect', async (_event, config) => {
    return await serialManager.connect(config)
  })

  // Disconnect from serial port
  ipcMain.handle('serial:disconnect', async () => {
    return await serialManager.disconnect()
  })

  // Write data to serial port
  ipcMain.handle('serial:write', async (_event, data) => {
    return await serialManager.write(data)
  })

  // Get connection status
  ipcMain.handle('serial:status', async () => {
    return serialManager.getConnectionStatus()
  })
}

/**
 * Set up data callback to forward serial data to all open renderer windows
 * This handles 0, 1, or multiple windows gracefully
 */
function setupSerialDataCallback(): void {
  serialManager.setDataCallback((data) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('serial:data', data)
    })
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.servitor')

  // Register serial IPC handlers once (they're global, not per-window)
  registerSerialIpcHandlers()

  // Set up serial data callback to broadcast to all windows
  setupSerialDataCallback()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up serial connection before app quits
// Uses preventDefault pattern to ensure async cleanup completes
app.on('before-quit', async (e) => {
  if (!isQuitting) {
    e.preventDefault()
    isQuitting = true
    await serialManager.disconnect()
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
