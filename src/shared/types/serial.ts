/**
 * Shared types for serial communication
 * Used across main, preload, and renderer processes
 */

/** Generic result type for serial operations */
export interface SerialResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/** Serial port configuration */
export interface SerialConfig {
  path: string
  baudRate: number
}

/** Serial port information */
export interface PortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  productId?: string
  vendorId?: string
}

/** Connection status */
export interface ConnectionStatus {
  connected: boolean
  port?: string
  baudRate?: number
}

/** Serial data event payload */
export interface SerialDataEvent {
  timestamp: number
  data: string
}
