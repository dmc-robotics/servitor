/**
 * Shared types and constants for serial communication
 * Used across main, preload, and renderer processes
 */

/** Line delimiter for serial data (Arduino uses LF) */
export const LINE_DELIMITER = '\n'

/** Default baud rate (Arduino standard) */
export const DEFAULT_BAUD_RATE = 9600

/** Standard baud rates for serial devices */
export const VALID_BAUD_RATES = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const

/** Type for valid baud rates */
export type ValidBaudRate = (typeof VALID_BAUD_RATES)[number]

/** Maximum messages to keep in buffer */
export const MAX_BUFFER_SIZE = 500

/** @deprecated Use AppResult from './app-result' instead */
export type { AppResult as SerialResult } from './app-result'

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
