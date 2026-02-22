import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock window.dashboardAPI before any store code accesses it at runtime
const mockDashboardAPI = {
  getProjects: vi.fn(),
  addProject: vi.fn(),
  updateProject: vi.fn(),
  removeProject: vi.fn(),
  build: vi.fn(),
  load: vi.fn(),
  updatePort: vi.fn(),
  checkPort: vi.fn(),
  validateConfig: vi.fn(),
  selectDirectory: vi.fn(),
  onProjectChanged: vi.fn().mockReturnValue(() => {})
}

vi.stubGlobal('window', { dashboardAPI: mockDashboardAPI })

import { useDashboardStore } from '../../../src/renderer/stores/dashboard'
import type { ProjectData } from '../../../src/shared/types/dashboard'

/** Build a minimal ProjectData for testing */
function makeProject(id: string, title = 'Test Project', hasGrotConfig = false): ProjectData {
  return {
    config: { id, path: `/projects/${id}`, title, description: '', addedAt: 0 },
    grotConfig: hasGrotConfig ? { fqbn: '', port: '', sketchPath: '', baudRate: 9600, targetCore: '', flashSplit: null } : null,
    hasInoFile: false,
    hasGrotConfig,
    directoryAccessible: true,
    portAvailable: false
  }
}

describe('useDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // appendOutput / clearOutput
  // -------------------------------------------------------------------------

  describe('appendOutput', () => {
    it('adds an entry to the output log with an incrementing id', () => {
      const store = useDashboardStore()
      store.appendOutput('ProjectA', 'build', { exitCode: 0, stdout: 'ok', stderr: '' })
      store.appendOutput('ProjectA', 'load', { exitCode: 1, stdout: '', stderr: 'err' })
      expect(store.outputLog).toHaveLength(2)
      expect(store.outputLog[0].id).toBe(1)
      expect(store.outputLog[1].id).toBe(2)
      expect(store.outputLog[0].command).toBe('build')
      expect(store.outputLog[1].command).toBe('load')
    })

    it('records the projectTitle and timestamp', () => {
      const store = useDashboardStore()
      const before = Date.now()
      store.appendOutput('My Board', 'build', { exitCode: 0, stdout: '', stderr: '' })
      const after = Date.now()
      expect(store.outputLog[0].projectTitle).toBe('My Board')
      expect(store.outputLog[0].timestamp).toBeGreaterThanOrEqual(before)
      expect(store.outputLog[0].timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('clearOutput', () => {
    it('empties the output log', () => {
      const store = useDashboardStore()
      store.appendOutput('P', 'build', { exitCode: 0, stdout: '', stderr: '' })
      store.clearOutput()
      expect(store.outputLog).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // ensureOperationState
  // -------------------------------------------------------------------------

  describe('ensureOperationState', () => {
    it('initializes all operation flags to false', () => {
      const store = useDashboardStore()
      store.ensureOperationState('proj-1')
      expect(store.operationState['proj-1']).toEqual({
        building: false,
        loading: false,
        updatingPort: false
      })
    })

    it('does not overwrite existing state', () => {
      const store = useDashboardStore()
      store.ensureOperationState('proj-1')
      store.operationState['proj-1'].building = true
      store.ensureOperationState('proj-1')
      expect(store.operationState['proj-1'].building).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // getOperationState getter
  // -------------------------------------------------------------------------

  describe('getOperationState getter', () => {
    it('returns all-false defaults for an unknown project id', () => {
      const store = useDashboardStore()
      const state = store.getOperationState('unknown-id')
      expect(state).toEqual({ building: false, loading: false, updatingPort: false })
    })

    it('returns the actual state for a known project', () => {
      const store = useDashboardStore()
      store.ensureOperationState('proj-1')
      store.operationState['proj-1'].building = true
      expect(store.getOperationState('proj-1').building).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // isAnyOperationRunning getter
  // -------------------------------------------------------------------------

  describe('isAnyOperationRunning getter', () => {
    it('returns false for an unknown project', () => {
      const store = useDashboardStore()
      expect(store.isAnyOperationRunning('unknown')).toBe(false)
    })

    it('returns true when building', () => {
      const store = useDashboardStore()
      store.ensureOperationState('p1')
      store.operationState['p1'].building = true
      expect(store.isAnyOperationRunning('p1')).toBe(true)
    })

    it('returns true when loading', () => {
      const store = useDashboardStore()
      store.ensureOperationState('p1')
      store.operationState['p1'].loading = true
      expect(store.isAnyOperationRunning('p1')).toBe(true)
    })

    it('returns true when updatingPort', () => {
      const store = useDashboardStore()
      store.ensureOperationState('p1')
      store.operationState['p1'].updatingPort = true
      expect(store.isAnyOperationRunning('p1')).toBe(true)
    })

    it('returns false when all operations are idle', () => {
      const store = useDashboardStore()
      store.ensureOperationState('p1')
      expect(store.isAnyOperationRunning('p1')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // handleProjectChanged
  // -------------------------------------------------------------------------

  describe('handleProjectChanged', () => {
    it('updates the matching project in the list', () => {
      const store = useDashboardStore()
      store.projects = [makeProject('p1', 'Old Title'), makeProject('p2')]
      const updated = makeProject('p1', 'New Title')
      store.handleProjectChanged('p1', updated)
      expect(store.projects[0].config.title).toBe('New Title')
      expect(store.projects[1].config.title).toBe('Test Project')
    })

    it('does nothing when project id is not found', () => {
      const store = useDashboardStore()
      store.projects = [makeProject('p1')]
      store.handleProjectChanged('ghost', makeProject('ghost'))
      expect(store.projects).toHaveLength(1)
    })

    it('calls validateConfig when updated project has grotConfig', () => {
      const store = useDashboardStore()
      store.projects = [makeProject('p1')]
      const validateSpy = vi.spyOn(store, 'validateConfig').mockResolvedValue(undefined)
      store.handleProjectChanged('p1', makeProject('p1', 'P1', true))
      expect(validateSpy).toHaveBeenCalledWith('p1')
    })

    it('removes configValidation entry when grotConfig is removed', () => {
      const store = useDashboardStore()
      store.projects = [makeProject('p1', 'P1', true)]
      store.configValidation['p1'] = { valid: true }
      store.handleProjectChanged('p1', makeProject('p1', 'P1', false))
      expect(store.configValidation['p1']).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // loadProjects
  // -------------------------------------------------------------------------

  describe('loadProjects', () => {
    it('populates projects on success', async () => {
      const store = useDashboardStore()
      const projects = [makeProject('p1'), makeProject('p2')]
      mockDashboardAPI.getProjects.mockResolvedValue({ success: true, data: projects })

      await store.loadProjects()

      expect(store.projects).toHaveLength(2)
      expect(store.loading).toBe(false)
    })

    it('initializes operationState for each loaded project', async () => {
      const store = useDashboardStore()
      mockDashboardAPI.getProjects.mockResolvedValue({
        success: true,
        data: [makeProject('p1'), makeProject('p2')]
      })

      await store.loadProjects()

      expect(store.operationState['p1']).toBeDefined()
      expect(store.operationState['p2']).toBeDefined()
    })

    it('leaves projects empty and clears loading flag on API failure', async () => {
      const store = useDashboardStore()
      mockDashboardAPI.getProjects.mockResolvedValue({ success: false, error: 'disk error' })

      await store.loadProjects()

      expect(store.projects).toEqual([])
      expect(store.loading).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // removeProject
  // -------------------------------------------------------------------------

  describe('removeProject', () => {
    it('removes the project from the list on success', async () => {
      const store = useDashboardStore()
      store.projects = [makeProject('p1'), makeProject('p2')]
      store.ensureOperationState('p1')
      mockDashboardAPI.removeProject.mockResolvedValue({ success: true })

      await store.removeProject('p1')

      expect(store.projects.find((p) => p.config.id === 'p1')).toBeUndefined()
      expect(store.projects).toHaveLength(1)
    })

    it('clears operationState for the removed project', async () => {
      const store = useDashboardStore()
      store.projects = [makeProject('p1')]
      store.ensureOperationState('p1')
      mockDashboardAPI.removeProject.mockResolvedValue({ success: true })

      await store.removeProject('p1')

      expect(store.operationState['p1']).toBeUndefined()
    })

    it('leaves projects unchanged on API failure', async () => {
      const store = useDashboardStore()
      store.projects = [makeProject('p1')]
      mockDashboardAPI.removeProject.mockResolvedValue({ success: false, error: 'not found' })

      await store.removeProject('p1')

      expect(store.projects).toHaveLength(1)
    })
  })
})
