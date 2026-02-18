import { defineStore } from 'pinia'
import { SerialDataEvent, PortInfo, DEFAULT_BAUD_RATE, MAX_BUFFER_SIZE } from '../../shared/types/serial'
import { parseSerialLine, ParsedSerialData } from '@/utils/serial-parser'

interface SerialState {
  // Connection state
  connected: boolean
  port: string | null
  baudRate: number
  availablePorts: PortInfo[]

  // Message buffer for monitor
  messages: ParsedSerialData[]

  // Plot data (separate arrays per data key)
  plotData: Record<string, number[]>
  timestamps: number[]

  // Listener cleanup functions
  dataCleanup: (() => void) | null
  connectionLostCleanup: (() => void) | null
}

export const useSerialStore = defineStore('serial', {
  state: (): SerialState => ({
    connected: false,
    port: null,
    baudRate: DEFAULT_BAUD_RATE,
    availablePorts: [],
    messages: [],
    plotData: {},
    timestamps: [],
    dataCleanup: null,
    connectionLostCleanup: null
  }),

  actions: {
    /**
     * Load available serial ports
     */
    async loadPorts(): Promise<void> {
      const result = await window.serialAPI.listPorts()
      if (result.success && result.data) {
        this.availablePorts = result.data
      } else {
        console.error('Failed to list ports:', result.error)
        this.availablePorts = []
      }
    },

    /**
     * Connect to a serial port
     */
    async connect(port: string, baudRate: number): Promise<boolean> {
      const result = await window.serialAPI.connect({ path: port, baudRate })

      if (result.success) {
        this.connected = true
        this.port = port
        this.baudRate = baudRate
        this.setupDataListener()
        return true
      } else {
        console.error('Failed to connect:', result.error)
        return false
      }
    },

    /**
     * Disconnect from serial port
     */
    async disconnect(): Promise<void> {
      // Remove listeners first
      if (this.dataCleanup) {
        this.dataCleanup()
        this.dataCleanup = null
      }
      if (this.connectionLostCleanup) {
        this.connectionLostCleanup()
        this.connectionLostCleanup = null
      }

      const result = await window.serialAPI.disconnect()
      if (result.success) {
        this.connected = false
        this.port = null
      } else {
        console.error('Failed to disconnect:', result.error)
      }
    },

    /**
     * Send data to serial port
     */
    async send(data: string): Promise<boolean> {
      if (!this.connected) {
        console.error('Not connected to serial port')
        return false
      }

      const result = await window.serialAPI.write(data)
      if (!result.success) {
        console.error('Failed to write:', result.error)
        return false
      }

      return true
    },

    /**
     * Clear all messages and plot data
     */
    clearData(): void {
      this.messages = []
      this.plotData = {}
      this.timestamps = []
    },

    /**
     * Set up listeners for incoming serial data and connection loss
     */
    setupDataListener(): void {
      // Remove existing listeners if any
      if (this.dataCleanup) {
        this.dataCleanup()
      }
      if (this.connectionLostCleanup) {
        this.connectionLostCleanup()
      }

      this.dataCleanup = window.serialAPI.onData((data: SerialDataEvent) => {
        this.handleSerialData(data)
      })

      this.connectionLostCleanup = window.serialAPI.onConnectionLost(() => {
        this.connected = false
        this.port = null
        if (this.dataCleanup) {
          this.dataCleanup()
          this.dataCleanup = null
        }
        if (this.connectionLostCleanup) {
          this.connectionLostCleanup()
          this.connectionLostCleanup = null
        }
      })
    },

    /**
     * Handle incoming serial data
     */
    handleSerialData(data: SerialDataEvent): void {
      // Parse the data
      const parsed = parseSerialLine(data.data, data.timestamp)

      // Add to message buffer
      this.messages.push(parsed)

      // Trim message buffer if too large
      if (this.messages.length > MAX_BUFFER_SIZE) {
        this.messages = this.messages.slice(-MAX_BUFFER_SIZE)
      }

      // If it's data with values, add to plot data
      if (parsed.type === 'data' && parsed.values) {
        // Add timestamp
        this.timestamps.push(parsed.timestamp)

        // Get all existing keys to ensure all arrays stay synchronized
        const allKeys = new Set([
          ...Object.keys(this.plotData),
          ...Object.keys(parsed.values)
        ])

        // For each key, add either the new value or null to maintain array alignment
        for (const key of allKeys) {
          if (!this.plotData[key]) {
            // New key - backfill with nulls for previous timestamps
            this.plotData[key] = new Array(this.timestamps.length - 1).fill(null)
          }

          // Add current value or null if not present in this data point
          this.plotData[key].push(parsed.values[key] ?? null)
        }

        // Trim plot data to match timestamps
        if (this.timestamps.length > MAX_BUFFER_SIZE) {
          this.timestamps = this.timestamps.slice(-MAX_BUFFER_SIZE)

          for (const key in this.plotData) {
            this.plotData[key] = this.plotData[key].slice(-MAX_BUFFER_SIZE)
          }
        }
      }
    },

    /**
     * Update connection status from backend
     */
    async updateStatus(): Promise<void> {
      const result = await window.serialAPI.getStatus()
      if (result.success && result.data) {
        this.connected = result.data.connected
        this.port = result.data.port || null
        this.baudRate = result.data.baudRate || DEFAULT_BAUD_RATE
      }
    }
  }
})
