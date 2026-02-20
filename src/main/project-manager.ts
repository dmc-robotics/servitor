import { app, dialog } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import { execFile } from 'child_process'
import { SerialPort } from 'serialport'
import {
  ProjectConfig,
  ProjectData,
  GrotConfig,
  CommandOutput
} from '../shared/types/dashboard'
import { AppResult } from '../shared/types/app-result'

const PROJECTS_FILE = 'projects.json'
const GROT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/** Generate a UUID v4 for project IDs */
function generateId(): string {
  return randomUUID()
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
    baudRate: getNum('baud_rate', 9600),
    targetCore: get('target_core')
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
        exitCode: typeof error?.code === 'number' ? error.code : (error ? 1 : 0),
        stdout: stdout || '',
        stderr: stderr || ''
      })
    })
  })
}

/**
 * Enrich a ProjectConfig with live data from the filesystem.
 * availablePorts is the list of port paths from SerialPort.list(), used to
 * check whether the configured port is currently connected.
 */
function enrichProject(config: ProjectConfig, availablePorts: string[]): ProjectData {
  let grotConfig: GrotConfig | null = null
  let hasInoFile = false
  let hasGrotConfig = false
  let directoryAccessible = false

  try {
    const entries = fs.readdirSync(config.path)
    directoryAccessible = true
    const dirName = config.path.replace(/\/+$/, '').split('/').pop() || ''
    hasInoFile = entries.includes(`${dirName}.ino`)
    hasGrotConfig = entries.some((e) => e === '.grotconfig')

    if (hasGrotConfig) {
      const grotFile = entries.find((e) => e === '.grotconfig')!
      const content = fs.readFileSync(join(config.path, grotFile), 'utf-8')
      grotConfig = parseGrotConfig(content)
    }
  } catch {
    // Directory may be inaccessible - leave defaults
  }

  const portAvailable = !!(grotConfig?.port && availablePorts.includes(grotConfig.port))

  return { config, grotConfig, hasInoFile, hasGrotConfig, directoryAccessible, portAvailable }
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
   * Fetches available serial ports once up front so each project can report
   * whether its configured port is currently connected.
   */
  async getProjects(): Promise<AppResult<ProjectData[]>> {
    try {
      const configs = this.readProjects()
      const portList = await SerialPort.list()
      const availablePorts = portList.map((p) => p.path)
      const projects = configs.map((config) => enrichProject(config, availablePorts))
      return { success: true, data: projects }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Open a native directory picker dialog.
   */
  async selectProjectDirectory(): Promise<AppResult<string | null>> {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Arduino Project Directory'
      })
      return { success: true, data: result.canceled ? null : result.filePaths[0] }
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
  ): Promise<AppResult<ProjectData>> {
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

      const portList = await SerialPort.list()
      return { success: true, data: enrichProject(config, portList.map((p) => p.path)) }
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
  ): Promise<AppResult<ProjectData>> {
    try {
      const projects = this.readProjects()
      const index = projects.findIndex((p) => p.id === id)
      if (index === -1) {
        return { success: false, error: 'Project not found' }
      }

      if (updates.title !== undefined) projects[index].title = updates.title.trim()
      if (updates.description !== undefined) projects[index].description = updates.description.trim()

      this.writeProjects(projects)
      const portList = await SerialPort.list()
      return { success: true, data: enrichProject(projects[index], portList.map((p) => p.path)) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Remove a project from the list (does NOT delete files on disk).
   */
  async removeProject(id: string): Promise<AppResult<void>> {
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
      const grotFile = entries.find((e) => e === '.grotconfig')
      return grotFile ? join(config.path, grotFile) : null
    } catch {
      return null
    }
  }

  /**
   * Run `grot build -c <configPath>` for a project.
   */
  async grotBuild(projectId: string): Promise<AppResult<CommandOutput>> {
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
  async grotLoad(projectId: string): Promise<AppResult<CommandOutput>> {
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
   * Check if a project's configured port is currently available.
   */
  async checkPort(projectId: string): Promise<AppResult<{ available: boolean }>> {
    try {
      const projects = this.readProjects()
      const config = projects.find((p) => p.id === projectId)
      if (!config) return { success: false, error: 'Project not found' }

      const configPath = this.findGrotConfigPath(config)
      if (!configPath) return { success: false, error: 'No .grotconfig file found in project directory' }

      const content = fs.readFileSync(configPath, 'utf-8')
      const grotConfig = parseGrotConfig(content)

      if (!grotConfig.port) {
        return { success: false, error: 'No port configured. Use "Scan Port" to detect your Arduino.' }
      }

      const ports = await SerialPort.list()
      const available = ports.some((p) => p.path === grotConfig.port)

      if (!available) {
        return { success: false, error: `Port "${grotConfig.port}" is not connected. Plug in your Arduino and try again.` }
      }

      return { success: true, data: { available: true } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Detect the most likely Arduino port and update it in the project's .grotconfig.
   * Uses SerialPort.list() and heuristics (usbmodem, usbserial, Arduino manufacturer).
   */
  async grotUpdatePort(projectId: string): Promise<AppResult<{ port: string }>> {
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
