import { SerialDataEvent } from '@/shared/types/serial'

/** Parsed serial data types */
export type ParsedDataType = 'data' | 'error' | 'warn' | 'info' | 'debug' | 'log'

/** Parsed serial data structure */
export interface ParsedSerialData extends SerialDataEvent {
  type: ParsedDataType
  values?: Record<string, number>
  message?: string
}

/** Serial data protocol regex patterns */
const PATTERNS = {
  /** Single labeled value: temp:25 */
  SINGLE_VALUE: /^([a-zA-Z_]\w*):(-?\d+(?:\.\d+)?)$/,

  /** Multiple labeled values: A:10,B:20,C:30 */
  MULTI_VALUE: /^([a-zA-Z_]\w*:-?\d+(?:\.\d+)?(?:,[a-zA-Z_]\w*:-?\d+(?:\.\d+)?)*)$/,

  /** Log levels: ERROR:message, WARN:message, INFO:message, DEBUG:message */
  LOG_LEVEL: /^(ERROR|WARN|INFO|DEBUG):(.+)$/
}

/** Maximum line length for serial data */
export const MAX_LINE_LENGTH = 256

/** Maximum messages to keep in buffer */
export const MAX_BUFFER_SIZE = 500

/**
 * Parse a line of serial data into structured format
 *
 * Protocol:
 * - temp:25             → data (single value)
 * - x:10,y:20,z:30      → data (multiple values)
 * - ERROR:message       → error log
 * - WARN:message        → warning log
 * - INFO:message        → info log
 * - DEBUG:message       → debug log
 * - anything else       → plain log
 */
export function parseSerialLine(line: string, timestamp: number): ParsedSerialData {
  const trimmed = line.trim()

  // Empty lines are plain logs
  if (!trimmed) {
    return {
      timestamp,
      data: line,
      type: 'log'
    }
  }

  // Check for log levels (ERROR:, WARN:, INFO:, DEBUG:)
  const logMatch = trimmed.match(PATTERNS.LOG_LEVEL)
  if (logMatch) {
    const level = logMatch[1].toLowerCase() as 'error' | 'warn' | 'info' | 'debug'
    return {
      timestamp,
      data: line,
      type: level,
      message: logMatch[2]
    }
  }

  // Check for multi-value data (A:10,B:20,C:30)
  const multiMatch = trimmed.match(PATTERNS.MULTI_VALUE)
  if (multiMatch) {
    const values: Record<string, number> = {}
    const pairs = trimmed.split(',')

    for (const pair of pairs) {
      const [key, val] = pair.split(':')
      if (key && val) {
        const num = parseFloat(val)
        if (!isNaN(num)) {
          values[key] = num
        }
      }
    }

    // Only return as data if we successfully parsed at least one value
    if (Object.keys(values).length > 0) {
      return {
        timestamp,
        data: line,
        type: 'data',
        values
      }
    }
  }

  // Check for single value data (temp:25)
  const singleMatch = trimmed.match(PATTERNS.SINGLE_VALUE)
  if (singleMatch) {
    return {
      timestamp,
      data: line,
      type: 'data',
      values: { [singleMatch[1]]: parseFloat(singleMatch[2]) }
    }
  }

  // Default: plain log message
  return {
    timestamp,
    data: line,
    type: 'log',
    message: trimmed
  }
}
