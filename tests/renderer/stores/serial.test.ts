import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock window.serialAPI before store code accesses it at runtime
vi.stubGlobal('window', {
  serialAPI: {
    listPorts: vi.fn().mockResolvedValue({ success: true, data: [] }),
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
    write: vi.fn().mockResolvedValue({ success: true }),
    onData: vi.fn().mockReturnValue(() => {}),
    onConnectionLost: vi.fn().mockReturnValue(() => {}),
    getStatus: vi.fn().mockResolvedValue({ success: true, data: { connected: false } })
  }
})

import { useSerialStore } from '../../../src/renderer/stores/serial'
import { MAX_BUFFER_SIZE } from '../../../src/shared/types/serial'

describe('useSerialStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // clearData
  // -------------------------------------------------------------------------

  describe('clearData', () => {
    it('resets messages, plotData, timestamps, and nextMessageId', () => {
      const store = useSerialStore()
      store.messages = [{ id: 1, timestamp: 100, data: 'test', type: 'log' }]
      store.plotData = { temp: [25, 26] }
      store.timestamps = [100, 200]
      store.nextMessageId = 5

      store.clearData()

      expect(store.messages).toEqual([])
      expect(store.plotData).toEqual({})
      expect(store.timestamps).toEqual([])
      expect(store.nextMessageId).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // handleSerialData — message buffering
  // -------------------------------------------------------------------------

  describe('handleSerialData — message buffering', () => {
    it('adds a parsed message to the messages buffer', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'hello world' })
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].type).toBe('log')
      expect(store.messages[0].data).toBe('hello world')
    })

    it('assigns incrementing ids starting at 1', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'a' })
      store.handleSerialData({ timestamp: 1001, data: 'b' })
      expect(store.messages[0].id).toBe(1)
      expect(store.messages[1].id).toBe(2)
    })

    it('preserves the timestamp from the data event', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 999_888, data: 'msg' })
      expect(store.messages[0].timestamp).toBe(999_888)
    })

    it('correctly parses log-level messages', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'ERROR:out of memory' })
      expect(store.messages[0].type).toBe('error')
      expect(store.messages[0].message).toBe('out of memory')
    })

    it('trims message buffer to MAX_BUFFER_SIZE when exceeded', () => {
      const store = useSerialStore()
      for (let i = 0; i < MAX_BUFFER_SIZE + 10; i++) {
        store.handleSerialData({ timestamp: i, data: `log ${i}` })
      }
      expect(store.messages).toHaveLength(MAX_BUFFER_SIZE)
    })
  })

  // -------------------------------------------------------------------------
  // handleSerialData — plot data
  // -------------------------------------------------------------------------

  describe('handleSerialData — plot data', () => {
    it('does not add to plotData for non-data messages', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'hello world' })
      expect(store.plotData).toEqual({})
      expect(store.timestamps).toEqual([])
    })

    it('adds a single data value to plotData and timestamps', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'temp:25' })
      expect(store.plotData.temp).toEqual([25])
      expect(store.timestamps).toEqual([1000])
    })

    it('accumulates multiple data points for the same key', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'temp:25' })
      store.handleSerialData({ timestamp: 1001, data: 'temp:26' })
      expect(store.plotData.temp).toEqual([25, 26])
      expect(store.timestamps).toEqual([1000, 1001])
    })

    it('backfills null for a new key that appears after earlier data points', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'temp:25' })
      store.handleSerialData({ timestamp: 1001, data: 'temp:26,humidity:60' })
      // humidity did not exist at t=1000, so first slot is null
      expect(store.plotData.temp).toEqual([25, 26])
      expect(store.plotData.humidity).toEqual([null, 60])
    })

    it('fills null for a key missing from a later data point', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'temp:25,humidity:60' })
      store.handleSerialData({ timestamp: 1001, data: 'temp:26' })
      // humidity was not in second point → null
      expect(store.plotData.humidity).toEqual([60, null])
    })

    it('handles multiple keys in one data line', () => {
      const store = useSerialStore()
      store.handleSerialData({ timestamp: 1000, data: 'x:1,y:2,z:3' })
      expect(store.plotData.x).toEqual([1])
      expect(store.plotData.y).toEqual([2])
      expect(store.plotData.z).toEqual([3])
    })

    it('trims plotData arrays to MAX_BUFFER_SIZE when exceeded', () => {
      const store = useSerialStore()
      for (let i = 0; i < MAX_BUFFER_SIZE + 10; i++) {
        store.handleSerialData({ timestamp: i, data: `temp:${i}` })
      }
      expect(store.timestamps).toHaveLength(MAX_BUFFER_SIZE)
      expect(store.plotData.temp).toHaveLength(MAX_BUFFER_SIZE)
    })

    it('keeps plotData arrays length equal to timestamps length after trimming', () => {
      const store = useSerialStore()
      for (let i = 0; i < MAX_BUFFER_SIZE + 10; i++) {
        store.handleSerialData({ timestamp: i, data: i % 2 === 0 ? `temp:${i}` : `temp:${i},extra:${i}` })
      }
      expect(store.plotData.temp).toHaveLength(store.timestamps.length)
    })
  })
})
