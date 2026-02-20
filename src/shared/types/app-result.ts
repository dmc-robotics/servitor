/** Generic result wrapper for IPC operations across all processes */
export interface AppResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
