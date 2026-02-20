import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  SerialResult,
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
 * All methods use consistent SerialResult pattern for error handling
 */
export interface SerialAPI {
  listPorts: () => Promise<SerialResult<PortInfo[]>>
  connect: (config: { path: string; baudRate: number }) => Promise<SerialResult<void>>
  disconnect: () => Promise<SerialResult<void>>
  write: (data: string) => Promise<SerialResult<void>>
  getStatus: () => Promise<SerialResult<ConnectionStatus>>
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
 * Dashboard API for project management
 */
export interface DashboardAPI {
  getProjects: () => Promise<SerialResult<ProjectData[]>>
  selectDirectory: () => Promise<SerialResult<string | null>>
  addProject: (path: string, title: string, description: string) => Promise<SerialResult<ProjectData>>
  updateProject: (id: string, updates: Partial<Pick<ProjectConfig, 'title' | 'description'>>) => Promise<SerialResult<ProjectData>>
  removeProject: (id: string) => Promise<SerialResult<void>>
  build: (projectId: string) => Promise<SerialResult<CommandOutput>>
  load: (projectId: string) => Promise<SerialResult<CommandOutput>>
  updatePort: (projectId: string) => Promise<SerialResult<{ port: string }>>
}

const dashboardAPI: DashboardAPI = {
  getProjects: () => ipcRenderer.invoke('dashboard:get-projects'),
  selectDirectory: () => ipcRenderer.invoke('dashboard:select-directory'),
  addProject: (path, title, description) => ipcRenderer.invoke('dashboard:add-project', path, title, description),
  updateProject: (id, updates) => ipcRenderer.invoke('dashboard:update-project', id, updates),
  removeProject: (id) => ipcRenderer.invoke('dashboard:remove-project', id),
  build: (projectId) => ipcRenderer.invoke('dashboard:build', projectId),
  load: (projectId) => ipcRenderer.invoke('dashboard:load', projectId),
  updatePort: (projectId) => ipcRenderer.invoke('dashboard:update-port', projectId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('serialAPI', serialAPI)
    contextBridge.exposeInMainWorld('dashboardAPI', dashboardAPI)
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
}
