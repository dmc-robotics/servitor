import { defineStore } from 'pinia'
import { ProjectData, CommandOutput } from '../../shared/types/dashboard'

/** Per-project operation state */
interface ProjectOperationState {
  building: boolean
  loading: boolean
  updatingPort: boolean
}

/** A single entry in the shared output log */
export interface OutputLogEntry {
  id: number
  projectTitle: string
  command: string
  output: CommandOutput
  timestamp: number
}

interface DashboardState {
  projects: ProjectData[]
  loading: boolean
  operationState: Record<string, ProjectOperationState>
  portScanErrors: Record<string, string>
  outputLog: OutputLogEntry[]
  outputPanelOpen: boolean
  nextLogId: number
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    projects: [],
    loading: false,
    operationState: {},
    portScanErrors: {},
    outputLog: [],
    outputPanelOpen: false,
    nextLogId: 1
  }),

  getters: {
    getOperationState: (state) => (id: string): ProjectOperationState => {
      return state.operationState[id] ?? { building: false, loading: false, updatingPort: false }
    },

    isAnyOperationRunning: (state) => (id: string): boolean => {
      const ops = state.operationState[id]
      if (!ops) return false
      return ops.building || ops.loading || ops.updatingPort
    }
  },

  actions: {
    /** Initialize operation state for a project if not yet tracked */
    ensureOperationState(id: string): void {
      if (!this.operationState[id]) {
        this.operationState[id] = { building: false, loading: false, updatingPort: false }
      }
    },

    /** Load all projects from the main process */
    async loadProjects(): Promise<void> {
      this.loading = true
      try {
        const result = await window.dashboardAPI.getProjects()
        if (result.success && result.data) {
          this.projects = result.data
          this.portScanErrors = {}
          // Ensure operation state exists for each project
          for (const p of this.projects) {
            this.ensureOperationState(p.config.id)
          }
        } else {
          console.error('Failed to load projects:', result.error)
        }
      } finally {
        this.loading = false
      }
    },

    /** Add a new project */
    async addProject(path: string, title: string, description: string): Promise<boolean> {
      const result = await window.dashboardAPI.addProject(path, title, description)
      if (result.success && result.data) {
        this.projects.push(result.data)
        this.ensureOperationState(result.data.config.id)
        return true
      } else {
        console.error('Failed to add project:', result.error)
        return false
      }
    },

    /** Update project title/description */
    async updateProject(id: string, updates: { title?: string; description?: string }): Promise<boolean> {
      const result = await window.dashboardAPI.updateProject(id, updates)
      if (result.success && result.data) {
        const index = this.projects.findIndex((p) => p.config.id === id)
        if (index !== -1) {
          this.projects[index] = result.data
        }
        return true
      } else {
        console.error('Failed to update project:', result.error)
        return false
      }
    },

    /** Remove a project */
    async removeProject(id: string): Promise<boolean> {
      const result = await window.dashboardAPI.removeProject(id)
      if (result.success) {
        this.projects = this.projects.filter((p) => p.config.id !== id)
        delete this.operationState[id]
        return true
      } else {
        console.error('Failed to remove project:', result.error)
        return false
      }
    },

    /** Append a command result to the output log */
    appendOutput(projectTitle: string, command: string, output: CommandOutput): void {
      this.outputLog.push({
        id: this.nextLogId++,
        projectTitle,
        command,
        output,
        timestamp: Date.now()
      })
      this.outputPanelOpen = true
    },

    /** Check if a project's port is connected, updating badge state on failure */
    async checkPortBeforeCommand(id: string, title: string, command: string): Promise<boolean> {
      const portResult = await window.dashboardAPI.checkPort(id)
      if (!portResult.success) {
        const errorMsg = portResult.error ?? 'Port not available'
        const index = this.projects.findIndex((p) => p.config.id === id)
        if (index !== -1) {
          this.projects[index].portAvailable = false
        }
        this.portScanErrors[id] = errorMsg
        this.appendOutput(title, command, {
          exitCode: 1,
          stdout: '',
          stderr: errorMsg
        })
        return false
      }
      return true
    },

    /** Build a project with grot */
    async buildProject(id: string): Promise<void> {
      this.ensureOperationState(id)
      this.operationState[id].building = true
      const project = this.projects.find((p) => p.config.id === id)
      const title = project?.config.title ?? 'Unknown'

      try {
        const result = await window.dashboardAPI.build(id)
        if (result.success && result.data) {
          this.appendOutput(title, 'build', result.data)
        } else {
          this.appendOutput(title, 'build', {
            exitCode: 1,
            stdout: '',
            stderr: result.error ?? 'Unknown error'
          })
        }
      } finally {
        this.operationState[id].building = false
      }
    },

    /** Load a project onto the board with grot */
    async loadToBoard(id: string): Promise<void> {
      this.ensureOperationState(id)
      this.operationState[id].loading = true
      const project = this.projects.find((p) => p.config.id === id)
      const title = project?.config.title ?? 'Unknown'

      try {
        if (!await this.checkPortBeforeCommand(id, title, 'load')) return

        const result = await window.dashboardAPI.load(id)
        if (result.success && result.data) {
          this.appendOutput(title, 'load', result.data)
        } else {
          this.appendOutput(title, 'load', {
            exitCode: 1,
            stdout: '',
            stderr: result.error ?? 'Unknown error'
          })
        }
      } finally {
        this.operationState[id].loading = false
      }
    },

    /** Update the Arduino port in the project's .grotconfig */
    async updatePort(id: string): Promise<void> {
      this.ensureOperationState(id)
      this.operationState[id].updatingPort = true
      const project = this.projects.find((p) => p.config.id === id)
      const title = project?.config.title ?? 'Unknown'

      try {
        const result = await window.dashboardAPI.updatePort(id)
        if (result.success && result.data) {
          // Refresh the project to show updated port; mark port as available since we just found it
          const index = this.projects.findIndex((p) => p.config.id === id)
          if (index !== -1 && this.projects[index].grotConfig) {
            this.projects[index].grotConfig!.port = result.data.port
            this.projects[index].portAvailable = true
          }
          delete this.portScanErrors[id]
          this.appendOutput(title, 'update-port', {
            exitCode: 0,
            stdout: `Port updated to ${result.data.port}`,
            stderr: ''
          })
        } else {
          const errorMsg = result.error ?? 'Unknown error'
          const index = this.projects.findIndex((p) => p.config.id === id)
          if (index !== -1) {
            this.projects[index].portAvailable = false
          }
          this.portScanErrors[id] = errorMsg
          this.appendOutput(title, 'update-port', {
            exitCode: 1,
            stdout: '',
            stderr: errorMsg
          })
        }
      } finally {
        this.operationState[id].updatingPort = false
      }
    },

    clearOutput(): void {
      this.outputLog = []
    },

    toggleOutputPanel(): void {
      this.outputPanelOpen = !this.outputPanelOpen
    }
  }
})
