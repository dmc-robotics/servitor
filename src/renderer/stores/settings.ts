import { defineStore } from 'pinia'

const TERMINAL_STORAGE_KEY = 'servitor:terminalApp'
const EDITOR_STORAGE_KEY = 'servitor:editorApp'

type TerminalApp = 'alacritty' | 'terminal'
export type EditorApp = 'textedit' | 'sublime'

interface SettingsState {
  terminalApp: TerminalApp
  editorApp: EditorApp
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    terminalApp: (localStorage.getItem(TERMINAL_STORAGE_KEY) as TerminalApp) || 'terminal',
    editorApp: (localStorage.getItem(EDITOR_STORAGE_KEY) as EditorApp) || 'textedit'
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
