import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron before project-manager is imported (it references app at module level)
vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/tmp/test-userData') },
  dialog: { showOpenDialog: vi.fn() }
}))

// Mock serialport (imported at module level)
vi.mock('serialport', () => ({
  SerialPort: { list: vi.fn().mockResolvedValue([]) }
}))

// Mock fs so we can control filesystem behavior in enrichProject tests.
// vi.spyOn cannot be used on ESM module namespaces; vi.mock is required.
vi.mock('fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  watch: vi.fn()
}))

// Mock child_process so grotBuild/grotLoad/grotValidate tests don't spawn real processes.
vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

import * as fs from 'fs'
import * as childProcess from 'child_process'
import {
  parseGrotConfig,
  updatePortInConfig,
  enrichProject,
  ProjectManager
} from '../../src/main/project-manager'
import type { ProjectConfig } from '../../src/shared/types/dashboard'

const mockConfig: ProjectConfig = {
  id: 'test-id',
  path: '/projects/mysketch',
  title: 'My Sketch',
  description: 'Test project',
  addedAt: 1_000_000
}

// ---------------------------------------------------------------------------
// parseGrotConfig — Layer 1: pure function, no mocks needed
// ---------------------------------------------------------------------------

describe('parseGrotConfig', () => {
  it('parses all fields from a full config', () => {
    const content = [
      'fqbn = "arduino:avr:uno"',
      'port = "/dev/cu.usbmodem1234"',
      'sketch_path = "mysketch.ino"',
      'baud_rate = 115200',
      'target_core = "arduino:avr"',
      'flash_split = 0.5'
    ].join('\n')

    const result = parseGrotConfig(content)
    expect(result.fqbn).toBe('arduino:avr:uno')
    expect(result.port).toBe('/dev/cu.usbmodem1234')
    expect(result.sketchPath).toBe('mysketch.ino')
    expect(result.baudRate).toBe(115200)
    expect(result.targetCore).toBe('arduino:avr')
    expect(result.flashSplit).toBe(0.5)
  })

  it('defaults baud_rate to 9600 when missing', () => {
    const result = parseGrotConfig('fqbn = "arduino:avr:uno"')
    expect(result.baudRate).toBe(9600)
  })

  it('returns empty strings for missing string fields', () => {
    const result = parseGrotConfig('')
    expect(result.fqbn).toBe('')
    expect(result.port).toBe('')
    expect(result.sketchPath).toBe('')
    expect(result.targetCore).toBe('')
  })

  it('returns null for missing flashSplit', () => {
    const result = parseGrotConfig('')
    expect(result.flashSplit).toBeNull()
  })

  it('handles fields with extra whitespace around equals sign', () => {
    const result = parseGrotConfig('fqbn  =  "arduino:avr:nano"')
    expect(result.fqbn).toBe('arduino:avr:nano')
  })

  it('ignores fields not at line start (inline values)', () => {
    // The regex uses ^ with multiline flag, so only line-start keys match
    const content = 'description = "has fqbn = \\"fake\\""\nfqbn = "real:value"'
    const result = parseGrotConfig(content)
    expect(result.fqbn).toBe('real:value')
  })
})

// ---------------------------------------------------------------------------
// updatePortInConfig — Layer 1: pure function, no mocks needed
// ---------------------------------------------------------------------------

describe('updatePortInConfig', () => {
  it('updates a quoted port value', () => {
    const content = 'fqbn = "arduino:avr:uno"\nport = "/dev/old.port"\nbaud_rate = 9600'
    const result = updatePortInConfig(content, '/dev/cu.usbmodem1234')
    expect(result).toContain('port = "/dev/cu.usbmodem1234"')
    expect(result).not.toContain('/dev/old.port')
  })

  it('updates an unquoted port value', () => {
    const content = 'port = /dev/tty.usbmodem'
    const result = updatePortInConfig(content, '/dev/cu.usbmodem1234')
    expect(result).toContain('port = "/dev/cu.usbmodem1234"')
  })

  it('appends port key when missing', () => {
    const content = 'fqbn = "arduino:avr:uno"\nbaud_rate = 9600'
    const result = updatePortInConfig(content, '/dev/cu.usbmodem1234')
    expect(result).toContain('port = "/dev/cu.usbmodem1234"')
  })

  it('preserves all other config fields when updating', () => {
    const content = 'fqbn = "arduino:avr:uno"\nport = "/dev/old"\nbaud_rate = 9600'
    const result = updatePortInConfig(content, '/dev/cu.new')
    expect(result).toContain('fqbn = "arduino:avr:uno"')
    expect(result).toContain('baud_rate = 9600')
  })

  it('only updates the port line (not partial matches elsewhere)', () => {
    const content = 'port = "/dev/cu.first"\nbackup_port = "/dev/cu.second"'
    const result = updatePortInConfig(content, '/dev/cu.updated')
    expect(result).toContain('port = "/dev/cu.updated"')
    expect(result).toContain('backup_port = "/dev/cu.second"')
  })
})

// ---------------------------------------------------------------------------
// enrichProject — Layer 2: fs module mocked globally, reset per test
// ---------------------------------------------------------------------------

describe('enrichProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks directory as inaccessible when readdirSync throws', () => {
    vi.mocked(fs.readdirSync).mockImplementation(() => { throw new Error('ENOENT') })
    const result = enrichProject(mockConfig, [])
    expect(result.directoryAccessible).toBe(false)
    expect(result.hasInoFile).toBe(false)
    expect(result.hasGrotConfig).toBe(false)
    expect(result.grotConfig).toBeNull()
  })

  it('detects .ino file matching directory name', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['mysketch.ino', 'README.md'] as any)
    const result = enrichProject(mockConfig, [])
    expect(result.directoryAccessible).toBe(true)
    expect(result.hasInoFile).toBe(true)
  })

  it('does not flag hasInoFile when name does not match directory', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['other.ino'] as any)
    const result = enrichProject(mockConfig, [])
    expect(result.hasInoFile).toBe(false)
  })

  it('detects .grotconfig file and parses it', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['.grotconfig'] as any)
    vi.mocked(fs.readFileSync).mockReturnValue('fqbn = "arduino:avr:uno"\nport = "/dev/cu.test"' as any)
    const result = enrichProject(mockConfig, [])
    expect(result.hasGrotConfig).toBe(true)
    expect(result.grotConfig?.fqbn).toBe('arduino:avr:uno')
    expect(result.grotConfig?.port).toBe('/dev/cu.test')
  })

  it('marks portAvailable true when configured port is in availablePorts', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['.grotconfig'] as any)
    vi.mocked(fs.readFileSync).mockReturnValue('port = "/dev/cu.test"' as any)
    const result = enrichProject(mockConfig, ['/dev/cu.test', '/dev/cu.other'])
    expect(result.portAvailable).toBe(true)
  })

  it('marks portAvailable false when configured port is not in availablePorts', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['.grotconfig'] as any)
    vi.mocked(fs.readFileSync).mockReturnValue('port = "/dev/cu.missing"' as any)
    const result = enrichProject(mockConfig, ['/dev/cu.other'])
    expect(result.portAvailable).toBe(false)
  })

  it('marks portAvailable false when no port is configured', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['.grotconfig'] as any)
    vi.mocked(fs.readFileSync).mockReturnValue('fqbn = "arduino:avr:uno"' as any)
    const result = enrichProject(mockConfig, ['/dev/cu.something'])
    expect(result.portAvailable).toBe(false)
  })

  it('passes config reference through unchanged', () => {
    vi.mocked(fs.readdirSync).mockReturnValue([] as any)
    const result = enrichProject(mockConfig, [])
    expect(result.config).toBe(mockConfig)
  })
})

// ---------------------------------------------------------------------------
// grotBuild / grotLoad / grotValidate — success: true even on non-zero exit code
// ---------------------------------------------------------------------------

/**
 * Helper: make execFile invoke its callback with a simulated grot result.
 * exitCode > 0 simulates a grot error (validation fail, build error, etc.).
 */
function mockExecFile(exitCode: number, stdout: string, stderr: string) {
  vi.mocked(childProcess.execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
    const error = exitCode !== 0 ? Object.assign(new Error('grot failed'), { code: exitCode }) : null
    callback(error, stdout, stderr)
    return {} as any
  })
}

describe('grotValidate — AppResult.success reflects IPC success, not grot exit code', () => {
  let manager: ProjectManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new ProjectManager()
    // Make projects.json readable with one project that has a .grotconfig
    vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
      if (String(p).endsWith('projects.json')) return JSON.stringify([mockConfig])
      return 'fqbn = "arduino:avr:uno"'
    })
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(['.grotconfig'] as any)
    vi.mocked(fs.watch).mockReturnValue({ close: vi.fn() } as any)
  })

  it('returns success: true with data when grot exits 0', async () => {
    mockExecFile(0, 'Validation passed', '')
    const result = await manager.grotValidate(mockConfig.id)
    expect(result.success).toBe(true)
    expect(result.data?.exitCode).toBe(0)
    expect(result.data?.stdout).toBe('Validation passed')
  })

  it('returns success: true with data when grot exits non-zero', async () => {
    mockExecFile(1, '', 'Error: missing fqbn')
    const result = await manager.grotValidate(mockConfig.id)
    expect(result.success).toBe(true)
    expect(result.data?.exitCode).toBe(1)
    expect(result.data?.stderr).toBe('Error: missing fqbn')
  })

  it('returns success: false when project is not found', async () => {
    const result = await manager.grotValidate('nonexistent-id')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })
})

describe('grotBuild — AppResult.success reflects IPC success, not grot exit code', () => {
  let manager: ProjectManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new ProjectManager()
    vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
      if (String(p).endsWith('projects.json')) return JSON.stringify([mockConfig])
      return 'fqbn = "arduino:avr:uno"'
    })
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(['.grotconfig'] as any)
    vi.mocked(fs.watch).mockReturnValue({ close: vi.fn() } as any)
  })

  it('returns success: true with data when grot build exits non-zero', async () => {
    mockExecFile(1, '', 'Compilation error: undeclared identifier')
    const result = await manager.grotBuild(mockConfig.id)
    expect(result.success).toBe(true)
    expect(result.data?.exitCode).toBe(1)
    expect(result.data?.stderr).toBe('Compilation error: undeclared identifier')
  })
})

describe('grotLoad — AppResult.success reflects IPC success, not grot exit code', () => {
  let manager: ProjectManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new ProjectManager()
    vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
      if (String(p).endsWith('projects.json')) return JSON.stringify([mockConfig])
      return 'fqbn = "arduino:avr:uno"'
    })
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(['.grotconfig'] as any)
    vi.mocked(fs.watch).mockReturnValue({ close: vi.fn() } as any)
  })

  it('returns success: true with data when grot load exits non-zero', async () => {
    mockExecFile(1, '', 'Upload failed: port not found')
    const result = await manager.grotLoad(mockConfig.id)
    expect(result.success).toBe(true)
    expect(result.data?.exitCode).toBe(1)
    expect(result.data?.stderr).toBe('Upload failed: port not found')
  })
})
