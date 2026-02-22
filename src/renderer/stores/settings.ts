import { defineStore } from 'pinia'

const TERMINAL_STORAGE_KEY = 'servitor:terminalApp'
const EDITOR_STORAGE_KEY = 'servitor:editorApp'

type TerminalApp = 'alacritty' | 'terminal'
export type EditorApp = 'textedit' | 'sublime'

const VALID_TERMINALS: TerminalApp[] = ['alacritty', 'terminal']
const VALID_EDITORS: EditorApp[] = ['textedit', 'sublime']

interface SettingsState {
  terminalApp: TerminalApp
  editorApp: EditorApp
}

function loadSetting<T extends string>(key: string, validValues: T[], fallback: T): T {
  const stored = localStorage.getItem(key)
  return validValues.includes(stored as T) ? (stored as T) : fallback
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    terminalApp: loadSetting(TERMINAL_STORAGE_KEY, VALID_TERMINALS, 'terminal'),
    editorApp: loadSetting(EDITOR_STORAGE_KEY, VALID_EDITORS, 'textedit')
  }),

  actions: {
    setTerminalApp(app: TerminalApp): void {
      this.terminalApp = app
      localStorage.setItem(TERMINAL_STORAGE_KEY, app)
    },

    setEditorApp(app: EditorApp): void {
      this.editorApp = app
      localStorage.setItem(EDITOR_STORAGE_KEY, app)
    }
  }
})
