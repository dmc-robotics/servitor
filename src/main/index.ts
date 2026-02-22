import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { spawn, execFile } from 'child_process'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { SerialManager } from './serial-manager'
import { ProjectManager } from './project-manager'
import { SerialConfig } from '../shared/types/serial'
// import icon from '../../resources/icon.png?asset' // TODO: Add proper icon

// Global serial manager instance (singleton - only one instance for entire app lifecycle)
const serialManager = new SerialManager()

// Global project manager instance
const projectManager = new ProjectManager()

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
      // Intentionally disabled: preload needs Node.js APIs for IPC bridge
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
  ipcMain.handle('serial:connect', async (_event, config: SerialConfig) => {
    return await serialManager.connect(config)
  })

  // Disconnect from serial port
  ipcMain.handle('serial:disconnect', async () => {
    return await serialManager.disconnect()
  })

  // Write data to serial port
  ipcMain.handle('serial:write', async (_event, data: string) => {
    return await serialManager.write(data)
  })

  // Get connection status
  ipcMain.handle('serial:status', async () => {
    return serialManager.getConnectionStatus()
  })
}

/**
 * Set up callbacks to forward serial events to all open renderer windows
 * This handles 0, 1, or multiple windows gracefully
 */
function setupSerialCallbacks(): void {
  serialManager.setDataCallback((data) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('serial:data', data)
    })
  })

  serialManager.setConnectionLostCallback((reason) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('serial:connection-lost', reason)
    })
  })
}

/**
 * Register IPC handlers for project/dashboard management
 */
function registerDashboardIpcHandlers(): void {
  ipcMain.handle('dashboard:get-projects', async () => {
    return await projectManager.getProjects()
  })

  ipcMain.handle('dashboard:select-directory', async () => {
    return await projectManager.selectProjectDirectory()
  })

  ipcMain.handle('dashboard:add-project', async (_event, path: string, title: string, description: string) => {
    const result = await projectManager.addProject(path, title, description)
    if (result.success && result.data) {
      projectManager.watchProject(result.data.config)
    }
    return result
  })

  ipcMain.handle('dashboard:update-project', async (_event, id: string, updates: { title?: string; description?: string }) => {
    return await projectManager.updateProject(id, updates)
  })

  ipcMain.handle('dashboard:remove-project', async (_event, id: string) => {
    const result = await projectManager.removeProject(id)
    if (result.success) {
      projectManager.unwatchProject(id)
    }
    return result
  })

  ipcMain.handle('dashboard:build', async (_event, projectId: string) => {
    return await projectManager.grotBuild(projectId)
  })

  ipcMain.handle('dashboard:load', async (_event, projectId: string) => {
    return await projectManager.grotLoad(projectId)
  })

  ipcMain.handle('dashboard:check-port', async (_event, projectId: string) => {
    return await projectManager.checkPort(projectId)
  })

  ipcMain.handle('dashboard:update-port', async (_event, projectId: string) => {
    return await projectManager.grotUpdatePort(projectId)
  })

  ipcMain.handle('dashboard:validate-config', async (_event, projectId: string) => {
    return await projectManager.grotValidate(projectId)
  })
}

/**
 * Register IPC handlers for general app operations
 */
function registerAppIpcHandlers(): void {
  ipcMain.handle('app:open-in-terminal', async (_event, { path, terminal }: { path: string; terminal: 'alacritty' | 'terminal' }) => {
    try {
      if (!fs.existsSync(path)) {
        return { success: false, error: `Path does not exist: ${path}` }
      }
      if (terminal === 'alacritty') {
        spawn('alacritty', ['--working-directory', path], { detached: true, stdio: 'ignore' }).unref()
      } else {
        spawn('open', ['-a', 'Terminal', path], { detached: true, stdio: 'ignore' }).unref()
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('app:get-versions', async () => {
    const servitor = app.getVersion()
    let grot = 'unknown'
    try {
      const result = await new Promise<string>((resolve, reject) => {
        execFile('grot', ['--version'], { timeout: 5000 }, (error, stdout, stderr) => {
          if (error) reject(error)
          else resolve((stdout || stderr).trim())
        })
      })
      grot = result.match(/\d+\.\d+[\.\d]*/)?.[0] ?? result
    } catch {
      grot = 'not found'
    }
    return { success: true, data: { servitor, grot } }
  })

  ipcMain.handle('app:open-in-editor', async (_event, { filePath, editor }: { filePath: string; editor: 'textedit' | 'sublime' }) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File does not exist: ${filePath}` }
      }
      const appName = editor === 'sublime' ? 'Sublime Text' : 'TextEdit'
      spawn('open', ['-a', appName, filePath], { detached: true, stdio: 'ignore' }).unref()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
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

  // Register dashboard IPC handlers
  registerDashboardIpcHandlers()

  // Register app IPC handlers
  registerAppIpcHandlers()

  // Set up serial callbacks to broadcast to all windows
  setupSerialCallbacks()

  // Start watching project directories for file changes
  projectManager.startWatching((projectId, projectData) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('dashboard:project-changed', { projectId, projectData })
    })
  })

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
    projectManager.stopWatching()
    const QUIT_TIMEOUT_MS = 3000
    await Promise.race([
      serialManager.disconnect(),
      new Promise((r) => setTimeout(r, QUIT_TIMEOUT_MS))
    ])
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
