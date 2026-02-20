/**
 * Shared types for dashboard project management
 * Used across main, preload, and renderer processes
 */

import { SerialResult } from './serial'

/** Re-export for convenience */
export type { SerialResult }

/** Project metadata stored in userData/projects.json */
export interface ProjectConfig {
  id: string
  path: string        // Absolute directory path
  title: string
  description: string
  addedAt: number     // Timestamp
}

/** Parsed .grotconfig (TOML) fields we care about */
export interface GrotConfig {
  fqbn: string
  port: string
  sketchPath: string
  baudRate: number
}

/** Runtime project data: metadata + live .grotconfig reading */
export interface ProjectData {
  config: ProjectConfig
  grotConfig: GrotConfig | null
  hasInoFile: boolean
  hasGrotConfig: boolean
}

/** Output from a grot command execution */
export interface CommandOutput {
  exitCode: number
  stdout: string
  stderr: string
}
