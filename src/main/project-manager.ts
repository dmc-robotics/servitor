import { app, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import { SerialPort } from 'serialport'
import {
  ProjectConfig,
  ProjectData,
  GrotConfig,
  CommandOutput
} from '../shared/types/dashboard'
import { SerialResult } from '../shared/types/serial'

const PROJECTS_FILE = 'projects.json'
const GROT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generates a simple UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Parse relevant fields from a .grotconfig TOML file using regex.
 * We only need: fqbn, port, sketch_path, baud_rate
 */
function parseGrotConfig(content: string): GrotConfig {
  const get = (key: string): string => {
    const match = content.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'))
    return match ? match[1] : ''
  }
  const getNum = (key: string, fallback: number): number => {
    const match = content.match(new RegExp(`^${key}\\s*=\\s*(\\d+)`, 'm'))
    return match ? parseInt(match[1], 10) : fallback
  }
  return {
    fqbn: get('fqbn'),
    port: get('port'),
    sketchPath: get('sketch_path'),
    baudRate: getNum('baud_rate', 9600)
  }
}

/**
 * Update the port field in a .grotconfig TOML file content string.
 */
function updatePortInConfig(content: string, newPort: string): string {
  return content.replace(/^(port\s*=\s*)"[^"]*"/m, `$1"${newPort}"`)
}

/**
 * Execute a grot command and return combined output.
 * cwd should be set to the project directory so relative paths in .grotconfig resolve correctly.
 */
async function runGrot(args: string[], cwd: string): Promise<CommandOutput> {
  return new Promise((resolve) => {
    execFile('grot', args, { timeout: GROT_TIMEOUT_MS, cwd }, (error, stdout, stderr) => {
      resolve({
        exitCode: error?.code != null ? (error.code as number) : (error ? 1 : 0),
        stdout: stdout || '',
        stderr: stderr || ''
      })
    })
  })
}

/**
 * Enrich a ProjectConfig with live data from the filesystem
 */
function enrichProject(config: ProjectConfig): ProjectData {
  let grotConfig: GrotConfig | null = null
  let hasInoFile = false
  let hasGrotConfig = false

  try {
    const entries = fs.readdirSync(config.path)
    hasInoFile = entries.some((e) => e.endsWith('.ino'))
    hasGrotConfig = entries.some((e) => e.endsWith('.grotconfig'))

    if (hasGrotConfig) {
      const grotFile = entries.find((e) => e.endsWith('.grotconfig'))!
      const content = fs.readFileSync(join(config.path, grotFile), 'utf-8')
      grotConfig = parseGrotConfig(content)
    }
  } catch {
    // Directory may be inaccessible - leave defaults
  }

  return { config, grotConfig, hasInoFile, hasGrotConfig }
}

/**
 * ProjectManager handles all project management operations.
 * Stores project metadata in {userData}/projects.json.
 */
export class ProjectManager {
  private projectsFilePath: string

  constructor() {
    this.projectsFilePath = join(app.getPath('userData'), PROJECTS_FILE)
  }

  /**
   * Read projects.json, returning an empty array if it doesn't exist.
   */
  private readProjects(): ProjectConfig[] {
    try {
      if (!fs.existsSync(this.projectsFilePath)) {
        return []
      }
      const raw = fs.readFileSync(this.projectsFilePath, 'utf-8')
      return JSON.parse(raw) as ProjectConfig[]
    } catch (error) {
      console.error('Failed to read projects.json:', error)
      return []
    }
  }

  /**
   * Write projects array to projects.json.
   */
  private writeProjects(projects: ProjectConfig[]): void {
    fs.writeFileSync(this.projectsFilePath, JSON.stringify(projects, null, 2), 'utf-8')
  }

  /**
   * Get all projects enriched with filesystem data.
   */
  async getProjects(): Promise<SerialResult<ProjectData[]>> {
    try {
      const configs = this.readProjects()
      const projects = configs.map(enrichProject)
      return { success: true, data: projects }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Open a native directory picker dialog.
   */
  async selectProjectDirectory(): Promise<SerialResult<string | null>> {
    try {
      const result = dialog.showOpenDialogSync({
        properties: ['openDirectory'],
        title: 'Select Arduino Project Directory'
      })
      return { success: true, data: result ? result[0] : null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Add a new project. Validates the directory exists.
   */
  async addProject(
    path: string,
    title: string,
    description: string
  ): Promise<SerialResult<ProjectData>> {
    try {
      if (!fs.existsSync(path)) {
        return { success: false, error: 'Directory does not exist' }
      }

      const projects = this.readProjects()

      // Prevent duplicates
      if (projects.some((p) => p.path === path)) {
        return { success: false, error: 'Project at this path already exists' }
      }

      const config: ProjectConfig = {
        id: generateId(),
        path,
        title: title.trim(),
        description: description.trim(),
        addedAt: Date.now()
      }

      projects.push(config)
      this.writeProjects(projects)

      return { success: true, data: enrichProject(config) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Update project title and/or description.
   */
  async updateProject(
    id: string,
    updates: Partial<Pick<ProjectConfig, 'title' | 'description'>>
  ): Promise<SerialResult<ProjectData>> {
    try {
      const projects = this.readProjects()
      const index = projects.findIndex((p) => p.id === id)
      if (index === -1) {
        return { success: false, error: 'Project not found' }
      }

      if (updates.title !== undefined) projects[index].title = updates.title.trim()
      if (updates.description !== undefined) projects[index].description = updates.description.trim()

      this.writeProjects(projects)
      return { success: true, data: enrichProject(projects[index]) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Remove a project from the list (does NOT delete files on disk).
   */
  async removeProject(id: string): Promise<SerialResult<void>> {
    try {
      const projects = this.readProjects()
      const index = projects.findIndex((p) => p.id === id)
      if (index === -1) {
        return { success: false, error: 'Project not found' }
      }

      projects.splice(index, 1)
      this.writeProjects(projects)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Find the .grotconfig file path for a project.
   */
  private findGrotConfigPath(config: ProjectConfig): string | null {
    try {
      const entries = fs.readdirSync(config.path)
      const grotFile = entries.find((e) => e.endsWith('.grotconfig'))
      return grotFile ? join(config.path, grotFile) : null
    } catch {
      return null
    }
  }

  /**
   * Run `grot build -c <configPath>` for a project.
   */
  async grotBuild(projectId: string): Promise<SerialResult<CommandOutput>> {
    try {
      const projects = this.readProjects()
      const config = projects.find((p) => p.id === projectId)
      if (!config) return { success: false, error: 'Project not found' }

      const configPath = this.findGrotConfigPath(config)
      if (!configPath) return { success: false, error: 'No .grotconfig file found in project directory' }

      const output = await runGrot(['build', '-c', configPath], config.path)
      return { success: true, data: output }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Run `grot load -c <configPath>` for a project.
   */
  async grotLoad(projectId: string): Promise<SerialResult<CommandOutput>> {
    try {
      const projects = this.readProjects()
      const config = projects.find((p) => p.id === projectId)
      if (!config) return { success: false, error: 'Project not found' }

      const configPath = this.findGrotConfigPath(config)
      if (!configPath) return { success: false, error: 'No .grotconfig file found in project directory' }

      const output = await runGrot(['load', '-c', configPath], config.path)
      return { success: true, data: output }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Detect the most likely Arduino port and update it in the project's .grotconfig.
   * Uses SerialPort.list() and heuristics (usbmodem, usbserial, Arduino manufacturer).
   */
  async grotUpdatePort(projectId: string): Promise<SerialResult<{ port: string }>> {
    try {
      const projects = this.readProjects()
      const config = projects.find((p) => p.id === projectId)
      if (!config) return { success: false, error: 'Project not found' }

      const configPath = this.findGrotConfigPath(config)
      if (!configPath) return { success: false, error: 'No .grotconfig file found in project directory' }

      // Find candidate Arduino ports
      const ports = await SerialPort.list()
      const arduino = ports.find((p) => {
        const mfr = (p.manufacturer || '').toLowerCase()
        const path = p.path.toLowerCase()
        return (
          mfr.includes('arduino') ||
          mfr.includes('wch') ||
          path.includes('usbmodem') ||
          path.includes('usbserial') ||
          path.includes('cu.usbmodem') ||
          path.includes('cu.usbserial')
        )
      })

      if (!arduino) {
        return { success: false, error: 'No Arduino-like port found. Connect your device and try again.' }
      }

      // On macOS, serialport lists /dev/tty.* paths but cu.* is required for non-blocking open.
      // Apply the same conversion used in serial-manager.ts.
      const port = process.platform === 'darwin'
        ? arduino.path.replace('/dev/tty.', '/dev/cu.')
        : arduino.path

      // Update the port in the config file
      const content = fs.readFileSync(configPath, 'utf-8')
      const updated = updatePortInConfig(content, port)
      fs.writeFileSync(configPath, updated, 'utf-8')

      return { success: true, data: { port } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
