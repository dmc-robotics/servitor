import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock serialport before importing serial-manager
vi.mock('serialport', () => {
  const MockSerialPort = vi.fn().mockImplementation(() => ({
    pipe: vi.fn().mockReturnValue({
      on: vi.fn(),
      unpipe: vi.fn(),
      destroy: vi.fn()
    }),
    on: vi.fn(),
    open: vi.fn(),
    close: vi.fn((cb: (err: null) => void) => cb(null)),
    write: vi.fn(),
    drain: vi.fn(),
    isOpen: false
  }))
  ;(MockSerialPort as any).list = vi.fn().mockResolvedValue([])
  return { SerialPort: MockSerialPort }
})

vi.mock('@serialport/parser-readline', () => ({
  ReadlineParser: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    unpipe: vi.fn(),
    destroy: vi.fn()
  }))
}))

import { SerialPort } from 'serialport'
import { SerialManager } from '../../src/main/serial-manager'

describe('SerialManager', () => {
  let manager: SerialManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new SerialManager()
  })

  // -------------------------------------------------------------------------
  // listPorts
  // -------------------------------------------------------------------------

  describe('listPorts', () => {
    it('returns success with empty list when no ports available', async () => {
      vi.mocked(SerialPort.list).mockResolvedValue([])
      const result = await manager.listPorts()
      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('maps all port fields correctly', async () => {
      vi.mocked(SerialPort.list).mockResolvedValue([{
        path: '/dev/cu.usbmodem1234',
        manufacturer: 'Arduino LLC',
        serialNumber: 'ABC123',
        pnpId: undefined,
        locationId: undefined,
        productId: '0043',
        vendorId: '2341'
      }])
      const result = await manager.listPorts()
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      const port = result.data![0]
      expect(port.manufacturer).toBe('Arduino LLC')
      expect(port.serialNumber).toBe('ABC123')
      expect(port.productId).toBe('0043')
      expect(port.vendorId).toBe('2341')
    })

    it('normalizes /dev/tty.* to /dev/cu.* on darwin', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

      vi.mocked(SerialPort.list).mockResolvedValue([{
        path: '/dev/tty.usbmodem1234',
        manufacturer: undefined,
        serialNumber: undefined,
        pnpId: undefined,
        locationId: undefined,
        productId: undefined,
        vendorId: undefined
      }])

      const result = await manager.listPorts()
      expect(result.data![0].path).toBe('/dev/cu.usbmodem1234')

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('leaves paths unchanged on non-darwin platforms', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })

      vi.mocked(SerialPort.list).mockResolvedValue([{
        path: '/dev/ttyUSB0',
        manufacturer: undefined,
        serialNumber: undefined,
        pnpId: undefined,
        locationId: undefined,
        productId: undefined,
        vendorId: undefined
      }])

      const result = await manager.listPorts()
      expect(result.data![0].path).toBe('/dev/ttyUSB0')

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('returns error result when SerialPort.list throws', async () => {
      vi.mocked(SerialPort.list).mockRejectedValue(new Error('USB access denied'))
      const result = await manager.listPorts()
      expect(result.success).toBe(false)
      expect(result.error).toBe('USB access denied')
    })
  })

  // -------------------------------------------------------------------------
  // getConnectionStatus
  // -------------------------------------------------------------------------

  describe('getConnectionStatus', () => {
    it('reports disconnected with no port info initially', () => {
      const result = manager.getConnectionStatus()
      expect(result.success).toBe(true)
      expect(result.data!.connected).toBe(false)
      expect(result.data!.port).toBeUndefined()
      expect(result.data!.baudRate).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // disconnect when not connected
  // -------------------------------------------------------------------------

  describe('disconnect', () => {
    it('returns success immediately when already disconnected', async () => {
      const result = await manager.disconnect()
      expect(result.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // write when not connected
  // -------------------------------------------------------------------------

  describe('write', () => {
    it('returns error when not connected to a port', async () => {
      const result = await manager.write('hello\n')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Not connected')
    })
  })

  // -------------------------------------------------------------------------
  // setDataCallback / setConnectionLostCallback
  // -------------------------------------------------------------------------

  describe('callbacks', () => {
    it('accepts a data callback without error', () => {
      expect(() => manager.setDataCallback(() => {})).not.toThrow()
    })

    it('accepts a connectionLost callback without error', () => {
      expect(() => manager.setConnectionLostCallback(() => {})).not.toThrow()
    })
  })
})
