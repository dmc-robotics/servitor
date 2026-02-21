import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { AppResult } from '../shared/types/app-result'
import {
  PortInfo,
  ConnectionStatus,
  SerialDataEvent
} from '../shared/types/serial'
import {
  ProjectData,
  ProjectConfig,
  CommandOutput
} from '../shared/types/dashboard'

/**
 * Serial API for renderer process
 * All methods use consistent AppResult pattern for error handling
 */
export interface SerialAPI {
  listPorts: () => Promise<AppResult<PortInfo[]>>
  connect: (config: { path: string; baudRate: number }) => Promise<AppResult<void>>
  disconnect: () => Promise<AppResult<void>>
  write: (data: string) => Promise<AppResult<void>>
  getStatus: () => Promise<AppResult<ConnectionStatus>>
  onData: (callback: (data: SerialDataEvent) => void) => () => void
  onConnectionLost: (callback: (reason: string) => void) => () => void
}

// Serial API implementation
const serialAPI: SerialAPI = {
  listPorts: () => ipcRenderer.invoke('serial:list-ports'),
  connect: (config) => ipcRenderer.invoke('serial:connect', config),
  disconnect: () => ipcRenderer.invoke('serial:disconnect'),
  write: (data) => ipcRenderer.invoke('serial:write', data),
  getStatus: () => ipcRenderer.invoke('serial:status'),
  onData: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, data: SerialDataEvent) => {
      callback(data)
    }
    ipcRenderer.on('serial:data', listener)
    return () => {
      ipcRenderer.removeListener('serial:data', listener)
    }
  },
  onConnectionLost: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, reason: string) => {
      callback(reason)
    }
    ipcRenderer.on('serial:connection-lost', listener)
    return () => {
      ipcRenderer.removeListener('serial:connection-lost', listener)
    }
  }
}

/**
 * App-level API for general OS operations
 */
export interface AppAPI {
  openInTerminal: (path: string, terminal: 'alacritty' | 'terminal') => Promise<AppResult<void>>
  openInEditor: (filePath: string, editor: 'textedit' | 'sublime') => Promise<AppResult<void>>
  getVersions: () => Promise<AppResult<{ servitor: string; grot: string }>>
}

const appAPI: AppAPI = {
  openInTerminal: (path, terminal) => ipcRenderer.invoke('app:open-in-terminal', { path, terminal }),
  openInEditor: (filePath, editor) => ipcRenderer.invoke('app:open-in-editor', { filePath, editor }),
  getVersions: () => ipcRenderer.invoke('app:get-versions')
}

/**
 * Dashboard API for project management
 */
export interface DashboardAPI {
  getProjects: () => Promise<AppResult<ProjectData[]>>
  selectDirectory: () => Promise<AppResult<string | null>>
  addProject: (path: string, title: string, description: string) => Promise<AppResult<ProjectData>>
  updateProject: (id: string, updates: Partial<Pick<ProjectConfig, 'title' | 'description'>>) => Promise<AppResult<ProjectData>>
  removeProject: (id: string) => Promise<AppResult<void>>
  build: (projectId: string) => Promise<AppResult<CommandOutput>>
  load: (projectId: string) => Promise<AppResult<CommandOutput>>
  checkPort: (projectId: string) => Promise<AppResult<{ available: boolean }>>
  updatePort: (projectId: string) => Promise<AppResult<{ port: string }>>
  validateConfig: (projectId: string) => Promise<AppResult<CommandOutput>>
  onProjectChanged: (callback: (projectId: string, data: ProjectData) => void) => () => void
}

const dashboardAPI: DashboardAPI = {
  getProjects: () => ipcRenderer.invoke('dashboard:get-projects'),
  selectDirectory: () => ipcRenderer.invoke('dashboard:select-directory'),
  addProject: (path, title, description) => ipcRenderer.invoke('dashboard:add-project', path, title, description),
  updateProject: (id, updates) => ipcRenderer.invoke('dashboard:update-project', id, updates),
  removeProject: (id) => ipcRenderer.invoke('dashboard:remove-project', id),
  build: (projectId) => ipcRenderer.invoke('dashboard:build', projectId),
  load: (projectId) => ipcRenderer.invoke('dashboard:load', projectId),
  checkPort: (projectId) => ipcRenderer.invoke('dashboard:check-port', projectId),
  updatePort: (projectId) => ipcRenderer.invoke('dashboard:update-port', projectId),
  validateConfig: (projectId) => ipcRenderer.invoke('dashboard:validate-config', projectId),
  onProjectChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { projectId: string; projectData: ProjectData }) => {
      callback(payload.projectId, payload.projectData)
    }
    ipcRenderer.on('dashboard:project-changed', listener)
    return () => {
      ipcRenderer.removeListener('dashboard:project-changed', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('serialAPI', serialAPI)
    contextBridge.exposeInMainWorld('dashboardAPI', dashboardAPI)
    contextBridge.exposeInMainWorld('appAPI', appAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.serialAPI = serialAPI
  // @ts-ignore (define in dts)
  window.dashboardAPI = dashboardAPI
  // @ts-ignore (define in dts)
  window.appAPI = appAPI
}
