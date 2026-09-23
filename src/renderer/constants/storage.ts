/**
 * Storage Keys Constants
 * Centralized localStorage keys to avoid magic strings
 */

export const STORAGE_KEYS = {
  // Theme settings (key names kept from the former theminator package so saved preferences carry over)
  DARK_MODE: 'theminator:darkMode',
  THEME: 'theminator:theme',

  // Sidebar collapsed state
  SIDEBAR_COLLAPSED: 'sidebarCollapsed'
} as const
