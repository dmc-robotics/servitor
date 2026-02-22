import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import {
  LINE_DELIMITER,
  SerialConfig,
  SerialDataEvent,
  PortInfo,
  ConnectionStatus
} from '../shared/types/serial'
import { AppResult } from '../shared/types/app-result'

/**
 * On macOS, the serialport npm package only returns /dev/tty.* paths.
 * tty.* devices block on open waiting for carrier detect, which hangs
 * with USB serial devices. cu.* ("calling unit") opens immediately.
 * Both refer to the same physical device.
 */
function preferCuDevice(path: string): string {
  if (process.platform === 'darwin') {
    return path.replace('/dev/tty.', '/dev/cu.')
  }
  return path
}

/**
 * SerialManager handles all serial port communication
 * Uses callback pattern to stream data to renderer process
 */
export class SerialManager {
  private port: SerialPort | null = null
  private parser: ReadlineParser | null = null
  private isConnected = false
  private isDisconnecting = false
  private currentConfig: SerialConfig | null = null
  private dataCallback: ((data: SerialDataEvent) => void) | null = null
  private connectionLostCallback: ((reason: string) => void) | null = null

  /**
   * List all available serial ports
   */
  async listPorts(): Promise<AppResult<PortInfo[]>> {
    try {
      const ports = await SerialPort.list()
      const portList = ports.map((port) => ({
        path: preferCuDevice(port.path),
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        locationId: port.locationId,
        productId: port.productId,
        vendorId: port.vendorId
      }))
      return { success: true, data: portList }
    } catch (error) {
      console.error('Error listing serial ports:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Connect to a serial port with given configuration
   */
  async connect(config: SerialConfig): Promise<AppResult<void>> {
    if (this.isConnected) {
      await this.disconnect()
    }

    try {
      this.port = new SerialPort({
        path: config.path,
        baudRate: config.baudRate,
        autoOpen: false
      })

      // Set up parser for line-delimited data
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: LINE_DELIMITER }))

      // Set up data handler
      this.parser.on('data', (data: string) => {
        if (this.dataCallback) {
          this.dataCallback({
            timestamp: Date.now(),
            data: data.trim()
          })
        }
      })

      // Set up error handler
      this.port.on('error', (err) => {
        console.error('Serial port error:', err)
        const reason = err instanceof Error ? err.message : 'Unknown error'
        // Port is already in error state - skip graceful close and cleanup directly
        this.cleanup()
        this.connectionLostCallback?.(reason)
      })

      // Set up close handler - fires on unexpected disconnect (e.g. USB unplugged)
      this.port.on('close', () => {
        console.log('Serial port closed')
        const wasConnected = this.isConnected
        this.isConnected = false
        this.currentConfig = null
        // Only fire connectionLost for unexpected disconnects, not voluntary ones
        if (wasConnected && !this.isDisconnecting) {
          this.connectionLostCallback?.('Port closed')
        }
      })

      // Open the port
      await new Promise<void>((resolve, reject) => {
        this.port!.open((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })

      this.isConnected = true
      this.currentConfig = config
      console.log(`Connected to ${config.path} at ${config.baudRate} baud`)

      return { success: true }
    } catch (error) {
      console.error('Error connecting to serial port:', error)
      this.cleanup()
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Disconnect from the current serial port
   */
  async disconnect(): Promise<AppResult<void>> {
    if (!this.port || !this.isConnected) {
      return { success: true }
    }

    this.isDisconnecting = true
    try {
      await new Promise<void>((resolve, reject) => {
        this.port!.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })

      this.cleanup()
      console.log('Disconnected from serial port')

      return { success: true }
    } catch (error) {
      console.error('Error disconnecting from serial port:', error)
      this.cleanup()
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      this.isDisconnecting = false
    }
  }

  /**
   * Write data to the serial port
   */
  async write(data: string): Promise<AppResult<void>> {
    if (!this.port || !this.isConnected) {
      return { success: false, error: 'Not connected to a serial port' }
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.port!.write(data, (err) => {
          if (err) {
            reject(err)
          } else {
            this.port!.drain((drainErr) => {
              if (drainErr) reject(drainErr)
              else resolve()
            })
          }
        })
      })

      return { success: true }
    } catch (error) {
      console.error('Error writing to serial port:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): AppResult<ConnectionStatus> {
    return {
      success: true,
      data: {
        connected: this.isConnected,
        port: this.currentConfig?.path,
        baudRate: this.currentConfig?.baudRate
      }
    }
  }

  /**
   * Set callback for incoming data
   */
  setDataCallback(callback: (data: SerialDataEvent) => void): void {
    this.dataCallback = callback
  }

  /**
   * Set callback for connection lost events (port error or unexpected close)
   */
  setConnectionLostCallback(callback: (reason: string) => void): void {
    this.connectionLostCallback = callback
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Destroy parser stream to clean up listeners and free resources
    if (this.parser) {
      this.parser.unpipe() // Disconnect from port
      this.parser.destroy() // Destroy stream and remove event listeners
    }

    // Save port ref before nulling so we can close it if still open
    const port = this.port
    this.port = null
    this.parser = null
    this.isConnected = false
    this.currentConfig = null

    // Close the port if it's still open (e.g. called from error handler)
    if (port?.isOpen) {
      port.close((err) => {
        if (err) console.error('Error closing port during cleanup:', err)
      })
    }
  }
}
