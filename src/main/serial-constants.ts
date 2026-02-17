/**
 * Serial communication constants
 */

export const SERIAL_CONSTANTS = {
  /** Line delimiter for serial data (Arduino uses LF) */
  LINE_DELIMITER: '\n',

  /** Default baud rate (Arduino standard) */
  DEFAULT_BAUD_RATE: 9600,

  /** Standard baud rates for serial devices */
  VALID_BAUD_RATES: [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const,

  /** Connection timeout in milliseconds */
  CONNECTION_TIMEOUT_MS: 5000,

  /** Write operation timeout in milliseconds */
  WRITE_TIMEOUT_MS: 1000
} as const

/** Type for valid baud rates */
export type ValidBaudRate = (typeof SERIAL_CONSTANTS.VALID_BAUD_RATES)[number]
