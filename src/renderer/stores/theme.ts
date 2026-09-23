/**
 * Theme Store
 * Dark mode + color theme, applied to <html> and persisted in localStorage
 */

import { defineStore } from 'pinia'
import { THEMES, DEFAULT_THEME, DEFAULT_DARK_MODE, isThemeName, type ThemeName } from '@/constants/theme'
import { STORAGE_KEYS } from '@/constants/storage'

interface ThemeState {
  darkMode: boolean
  selectedTheme: ThemeName
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch { /* ignore */ }
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    darkMode: DEFAULT_DARK_MODE,
    selectedTheme: DEFAULT_THEME
  }),

  getters: {
    availableThemes: () => THEMES
  },

  actions: {
    setDarkMode(isDark: boolean): void {
      this.darkMode = isDark
      this.applyToDocument()
      save(STORAGE_KEYS.DARK_MODE, String(isDark))
    },

    /** Unknown theme names fall back to the default theme */
    setTheme(theme: string): void {
      this.selectedTheme = isThemeName(theme) ? theme : DEFAULT_THEME
      this.applyToDocument()
      save(STORAGE_KEYS.THEME, this.selectedTheme)
    },

    /** Load saved preferences and apply them. Call once in main.ts after installing Pinia */
    initialize(): void {
      try {
        const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE)
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
        if (savedDarkMode !== null) this.darkMode = savedDarkMode === 'true'
        if (savedTheme && isThemeName(savedTheme)) this.selectedTheme = savedTheme
      } catch { /* use defaults */ }
      this.applyToDocument()
    },

    applyToDocument(): void {
      document.documentElement.classList.toggle('dark', this.darkMode)
      document.documentElement.dataset.theme = this.selectedTheme
    }
  }
})
