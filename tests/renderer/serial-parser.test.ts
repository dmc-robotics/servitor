import { describe, it, expect } from 'vitest'
import { parseSerialLine } from '../../src/renderer/utils/serial-parser'

const TS = 1_000_000

describe('parseSerialLine', () => {
  describe('plain log messages', () => {
    it('returns log type for plain text', () => {
      const result = parseSerialLine('hello world', TS)
      expect(result.type).toBe('log')
      expect(result.message).toBe('hello world')
      expect(result.timestamp).toBe(TS)
    })

    it('returns log type for empty string', () => {
      const result = parseSerialLine('', TS)
      expect(result.type).toBe('log')
      expect(result.data).toBe('')
    })

    it('returns log type for whitespace-only string', () => {
      const result = parseSerialLine('   ', TS)
      expect(result.type).toBe('log')
    })

    it('preserves original data field untrimmed', () => {
      const input = '  hello  '
      const result = parseSerialLine(input, TS)
      expect(result.data).toBe(input)
    })

    it('assigns id of 0 (caller assigns real ids)', () => {
      const result = parseSerialLine('any message', TS)
      expect(result.id).toBe(0)
    })
  })

  describe('log level messages', () => {
    it('parses ERROR level', () => {
      const result = parseSerialLine('ERROR:something went wrong', TS)
      expect(result.type).toBe('error')
      expect(result.message).toBe('something went wrong')
    })

    it('parses WARN level', () => {
      const result = parseSerialLine('WARN:low memory', TS)
      expect(result.type).toBe('warn')
      expect(result.message).toBe('low memory')
    })

    it('parses INFO level', () => {
      const result = parseSerialLine('INFO:system ready', TS)
      expect(result.type).toBe('info')
      expect(result.message).toBe('system ready')
    })

    it('parses DEBUG level', () => {
      const result = parseSerialLine('DEBUG:loop count 42', TS)
      expect(result.type).toBe('debug')
      expect(result.message).toBe('loop count 42')
    })

    it('treats lowercase error: as plain log (case-sensitive)', () => {
      const result = parseSerialLine('error:not a level', TS)
      expect(result.type).toBe('log')
    })

    it('includes message content after colon', () => {
      const result = parseSerialLine('ERROR:divide by zero at line 42', TS)
      expect(result.message).toBe('divide by zero at line 42')
    })
  })

  describe('data values', () => {
    it('parses single integer key:value pair', () => {
      const result = parseSerialLine('temp:25', TS)
      expect(result.type).toBe('data')
      expect(result.values).toEqual({ temp: 25 })
    })

    it('parses multiple key:value pairs', () => {
      const result = parseSerialLine('A:10,B:20,C:30', TS)
      expect(result.type).toBe('data')
      expect(result.values).toEqual({ A: 10, B: 20, C: 30 })
    })

    it('parses negative values', () => {
      const result = parseSerialLine('temp:-5', TS)
      expect(result.type).toBe('data')
      expect(result.values).toEqual({ temp: -5 })
    })

    it('parses float values', () => {
      const result = parseSerialLine('temp:25.5', TS)
      expect(result.type).toBe('data')
      expect(result.values).toEqual({ temp: 25.5 })
    })

    it('parses mixed negative floats in multi-value line', () => {
      const result = parseSerialLine('x:-1.5,y:2.0', TS)
      expect(result.type).toBe('data')
      expect(result.values).toEqual({ x: -1.5, y: 2.0 })
    })

    it('allows underscore in key names', () => {
      const result = parseSerialLine('soil_moisture:512', TS)
      expect(result.type).toBe('data')
      expect(result.values).toEqual({ soil_moisture: 512 })
    })

    it('assigns id of 0 (caller assigns real ids)', () => {
      const result = parseSerialLine('temp:25', TS)
      expect(result.id).toBe(0)
    })
  })

  describe('malformed input', () => {
    it('treats key starting with colon as plain log', () => {
      const result = parseSerialLine(':25', TS)
      expect(result.type).toBe('log')
    })

    it('treats key with empty value as plain log', () => {
      const result = parseSerialLine('temp:', TS)
      expect(result.type).toBe('log')
    })

    it('treats key starting with digit as plain log', () => {
      const result = parseSerialLine('1sensor:25', TS)
      expect(result.type).toBe('log')
    })

    it('treats mixed valid/invalid pairs as plain log', () => {
      // Regex requires ALL pairs to match the DATA_VALUES pattern
      const result = parseSerialLine('temp:25,bad', TS)
      expect(result.type).toBe('log')
    })

    it('treats non-numeric value as plain log', () => {
      const result = parseSerialLine('temp:hot', TS)
      expect(result.type).toBe('log')
    })
  })
})
