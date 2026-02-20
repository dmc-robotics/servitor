# Servitor - Project Instructions

## System Overview

`` Servitor is a serial monitor/plotter and compiler/loader for arduino projects that uses the grot gem (~/code/gems/grot)

## Application Overview

- A serial plotter
- A serial monitor
- A project directory with one click build and load commands that call grot commands in the background
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

## General Guidance

- Don't improvise. Use conventional code when possible. Always ask for confirmation before writing code that breaks standard patterns
- Don't write code that fights against external libraries. Instead, suggest more conventional approahes.
- Check your work
- Favor maintainability, modularity, and simplicity over cleverness and complexity

## Project Structure

**Key Points:**

- Use constants for magic numbers

### Using Theminator

The app uses **theminator** - a simple OKLCH theming library for Vue 3 Options API apps.

**Location:** `~/code/theminator` (local development package)

## Dashboard Page

Location: `src/renderer/views/Dashboard.vue`

**Features**

- the user can add projects (directorie that contain .ino and .grotnofig files)
- the projects will be displayed in cards with a shadcn theme/style
-projects are editable
- cards will have a title, description, url, build button, load button, and update port button.
-the build and load buttons will call the grot commands
-the update port command will scan the available ports, find the arduino, and edit the .grot config file.

## Serial Page

Location: `src/renderer/views/Serial.vue`

**Features:**

- **Serial Monitor/plotter**
  - tabs to select monitor or plotter
  - text area underneath monitor/plotter to send data back through serial connection
  - real time updates
  - data protocol is simple and human readable, designed to be sent from arduino code

## Layout Component

Location: `src/renderer/components/Layout.vue`

**Features:**

- Sticky global header with serial connection indicator
- Collapsible sidebar navigation
- Main content area with router view

**Sticky Header:**

- Stays visible when scrolling
- Contains: SidebarTrigger, but only visible when screen is too narrow for icon view


## shadcn-vue Components

### Installation

```zsh
npx shadcn-vue@latest add <component-name>
```

Components are installed to `src/renderer/components/ui/`.

### Known Issues & Fixes

**Sidebar collapsible bug:**

- CLI-installed Sidebar has incorrect syntax: `w-[--sidebar-width]`
- Fix: Use `w-[var(--sidebar-width)]` (proper Tailwind v4 CSS variable syntax)
- See comment in `Sidebar.vue` for details

**SidebarTrigger mobile visibility:**

- Trigger should only show when sidebar becomes Sheet drawer on mobile
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

```zsh
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
- Avoid custom styling unless it greatly increases complexity

### Charts

- Extract chart configuration to constants
- Define proper interfaces for data points
- Use theme variables for colors

## Integration with Other Systems

### With grot

**Code:** `/Users/damoncali/code/gems/grot

## Notes

- **No git commits** - User handles all git operations
- **Dark mode first** - App defaults to dark mode, configurable in Settings
- **Theme persistence** - Settings stored in localStorage via theminator (`theminator:darkMode`, `theminator:theme`)
- **Type safety** - `strict: false` allows gradual TypeScript adoption

### shadcn-vue Compatibility

- Some CLI-installed components may have Tailwind v4 syntax issues
- Check and fix CSS variable syntax: `var(--variable)` not `--variable`
- Components tested: Sidebar, Card, Button, Switch, Select, Textarea
- if fixes are needed, make comments stating what the fix was and why.
