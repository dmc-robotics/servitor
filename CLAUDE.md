# Servitor - Project Instructions

## System Overview

`` Servitor is a serial monitor/plotter and compiler/loader for arduino projects that uses the grot gem (~/code/gems/grot)

## Application Overview

Calvin Explorator is an Electron desktop application built with Vue 3, TypeScript, and shadcn-vue components. Features include:

- A serial plotter
- A serial monitor
- A project directory with one click build and load commands
- Multi-theme support with light/dark modes from the themninator library
- Sticky global header and collapsable sidebar

## Tech Stack

### Core Technologies

- **Electron** - Desktop app framework
- **electron-vite** - Build tooling for Electron + Vite
- **Vue 3** - UI framework using **Options API** except for 3rd party add ons such as shadcn-vue components.
- **TypeScript** - Type-safe JavaScript
- **Vue Router** - Client-side routing with hash mode
- **Vite** - Build tool and dev server
- **Tailwind CSS 4.1** - Utility-first CSS framework with CSS-first configuration
- **theminator** - OKLCH theme system with 9 color themes (local package at ~/code/theminator)
- **shadcn-vue** - UI component library (CLI-installed)
- **Unovis** - Chart library for data visualization

### Key Conventions

- **TypeScript** - All code uses TypeScript with `strict: false` for gradual adoption
- **Options API** - Use Options API with `<script lang="ts">` in all Vue components (not Composition API). Using compisition api when importing components or libraries is acceptable - keep it in the 3rd party library's native API
- **Hash mode routing** - Router uses `createWebHashHistory()` for Electron compatibility
- **shadcn-vue CLI** - Install components via `npx shadcn-vue@latest add <component>`

## Project Structure

**Key Points:**

- Use constants for magic numbers

## Theming System

### Using Theminator

The app uses **theminator** - a simple OKLCH theming library for Vue 3 Options API apps.

**Location:** `~/code/theminator` (local development package)

### Chart Theming

Charts automatically adapt to active theme via `--chart-1` through `--chart-5` CSS variables.

## Dashboard Page

Location: `src/renderer/views/Dashboard.vue`

## Serial Page

Location: `src/renderer/views/Serial.vue`

**Features:**

- **Serial Monitor/plotter**
  - tabs to select monitor or plotter
  - text area underneath monitor/plotter to send data back through serial connection
  - real time updates
  - data protocol should be crated that is simple and human readable

## Layout Component

Location: `src/renderer/components/Layout.vue`

**Features:**

- Sticky global header with battery status indicator
- Collapsible sidebar navigation
- Main content area with router view

**Sticky Header:**

- Classes: `sticky top-0 z-10 bg-background`
- Stays visible when scrolling
- Contains: SidebarTrigger

**Key Points:**

- Header background uses theme variable to match page background
- `z-10` ensures header stays above scrolling content

## shadcn-vue Components

### Installation

```bash
npx shadcn-vue@latest add <component-name>
```

Components are installed to `src/renderer/components/ui/`.

### Known Issues & Fixes

**Sidebar collapsible bug:**

- CLI-installed Sidebar has incorrect syntax: `w-[--sidebar-width]`
- Fix: Use `w-[var(--sidebar-width)]` (proper Tailwind v4 CSS variable syntax)
- See comment in `Sidebar.vue` for details

**SidebarTrigger mobile visibility:**

- Trigger should only show when sidebar becomes Sheet drawer on mobile (< 768px)
- Fix: Add `md:hidden` class directly in `SidebarTrigger.vue` component
- Cleaner than adding per-use in Layout.vue

## Electron Configuration

**Window Setup** (prevents white flash on startup):

- `backgroundColor: '#1a1a1a'` - dark background while loading
- `show: false` + `mainWindow.once('ready-to-show', () => mainWindow.show())` - wait for render

**HTML Setup**:

- Keep `index.html` minimal with no inline styles
- All styling goes in `style.css` using theme CSS variables
- **Critical**: Inline styles override theme system and break light/dark mode switching

## Development Commands

```bash
npm run dev      # Start dev server + launch Electron with hot-reload
npm run build    # Build for production
npm start        # Preview production build (alias for preview)
npm run preview  # Preview production build
```

## Routing

- Uses `createWebHashHistory()` for Electron compatibility
- URLs: `/#/dashboard`, `/#/serial`, etc.
- Routes defined in `src/renderer/router/index.ts`

## Common Tasks

### Adding a New Page

1. Create `src/renderer/views/PageName.vue` with `<script lang="ts">` using Options API
2. Add route in `src/renderer/router/index.ts`
3. Add navigation item in `src/renderer/components/Layout.vue`

### Adding shadcn-vue Components

```bash
npx shadcn-vue@latest add <component-name> -y
```

Components auto-install with dependencies and types.

### Adding Charts

1. Import Unovis components: `import { VisXYContainer, VisLine, VisAxis } from '@unovis/vue'`
2. Define data interface
3. Use constants for configuration values
4. Reference theme colors with `var(--chart-1)`

### Keyboard Shortcuts in Inputs

- Enter = send/submit, Shift+Enter = new line
- Always `event.preventDefault()` on plain Enter to avoid unwanted newlines
- Let Shift+Enter use default behavior (creates newline)

## File Editing Rules

- **Use TypeScript** - `.ts` extension for scripts, `lang="ts"` in Vue files
- **Use Options API** - `<script lang="ts">` with `defineComponent()` in all Vue components we create
- **Define interfaces** - Type all data structures
- **Extract constants** - No magic numbers
- **Use theme variables** - Reference CSS variables for colors

## Best Practices

### TypeScript

- Define interfaces for all data structures
- Avoid `any` types
- Use proper function signatures with return types
- Type refs: `ref<Type>(initialValue)`

### Vue Components

- Keep components focused and single-purpose
- Use `defineComponent()` for proper TypeScript inference
- Use proper TypeScript interfaces for props
- Type data properties: `items: [] as Type[]`

### Styling

- Use Tailwind classes for layout and spacing
- Use theme CSS variables for colors (always `var(--variable)` syntax)
- Use scoped styles for component-specific styling
- Avoid inline styles except for dynamic values

### Charts

- Extract chart configuration to constants
- Define proper interfaces for data points
- Use theme variables for colors
- Keep chart styling in scoped styles with `:deep()`

## Integration with Other Systems

### With grot

**Code:** `/Users/damoncali/code/gems/grot

## Notes

- **No git commits** - User handles all git operations
- **Production optimization** - Production builds are optimized and fast
- **Dark mode first** - App defaults to dark mode, configurable in Settings
- **Theme persistence** - Settings stored in localStorage via theminator (`theminator:darkMode`, `theminator:theme`)
- **Type safety** - `strict: false` allows gradual TypeScript adoption
- **Dummy data** - Currently uses data generators; real integration pending cogitator network interface
- **Theminator** - Theme system extracted to reusable library at `~/code/theminator`

## Troubleshooting

### White Flash on Startup

Fixed via Electron configuration only:

1. `backgroundColor: '#1a1a1a'` in BrowserWindow
2. `show: false` + `ready-to-show` event

**Do not use inline styles** - they override theme variables and break light/dark mode.

### Light Mode Issues

**Problem**: Inline styles in `index.html` with hardcoded colors (e.g., `color: #fafafa`) will override theme CSS variables and break light mode (white text on white background).

**Solution**: Remove all inline styles from HTML. Let theme system handle all colors via CSS variables in `style.css`. The `@layer base` section in `style.css` sets `background-color: var(--background)` and `color: var(--foreground)` which automatically adapt to light/dark mode and selected theme.

### shadcn-vue Compatibility

- Some CLI-installed components may have Tailwind v4 syntax issues
- Check and fix CSS variable syntax: `var(--variable)` not `--variable`
- Components tested: Sidebar, Card, Button, Switch, Select, Textarea
- if fixes are needed, make comments stating what the fix was and why.

### Chart Styling

- Use `:deep()` for styling Unovis chart internals
- Set CSS variables on container for theme integration
- Grid lines require `!important` to override defaults
