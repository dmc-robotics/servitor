import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  SerialResult,
  PortInfo,
  ConnectionStatus,
  SerialDataEvent
} from '../shared/types/serial'

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
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('serial:data', listener)
    }
  }
}

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('serialAPI', serialAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.serialAPI = serialAPI
}
