/**
 * TypeScript declarations for Electron APIs exposed to renderer
 */

import { SerialAPI } from '../../preload/index'
import { DashboardAPI } from '../../preload/index'

declare global {
  interface Window {
    serialAPI: SerialAPI
    dashboardAPI: DashboardAPI
  }
}

export {}
