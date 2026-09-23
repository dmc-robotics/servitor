/**
 * Theme Constants
 * Color themes defined in `@/styles/themes.css` (one `[data-theme]` block each)
 */

export const THEMES = [
  { name: 'default', label: 'Default' },
  { name: 'red', label: 'Red' },
  { name: 'orange', label: 'Orange' },
  { name: 'yellow', label: 'Yellow' },
  { name: 'green', label: 'Green' },
  { name: 'blue', label: 'Blue' },
  { name: 'indigo', label: 'Indigo' },
  { name: 'violet', label: 'Violet' },
  { name: 'rose', label: 'Rose' }
] as const

export type ThemeName = typeof THEMES[number]['name']

export const DEFAULT_THEME: ThemeName = 'default'
export const DEFAULT_DARK_MODE = true

export function isThemeName(value: string): value is ThemeName {
  return THEMES.some(theme => theme.name === value)
}
