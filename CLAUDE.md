# Servitor - Project Instructions

## System Overview

`` Servitor is a serial monitor/plotter and compiler/loader for arduino projects that uses the grot gem (~/code/gems/grot)

## Application Overview

- A serial plotter
- A serial monitor
- A project directory with one click build and load commands that call grot commands in the background
- Multi-theme support with light/dark modes
- Sticky global header and collapsable sidebar

## Tech Stack

### Core Technologies

- **Electron** - Desktop app framework
- **electron-vite** - Build tooling for Electron + Vite
- **Vue 3** - UI framework using **Options API**
- **Pinia** - State management (stores in `src/renderer/stores/`)
- **TypeScript** - Type-safe JavaScript
- **Vue Router** - Client-side routing with hash mode
- **Vite** - Build tool and dev server
- **Tailwind CSS 4.1** - Utility-first CSS framework with CSS-first configuration (build-time only)
- **serialport** - Serial I/O in the main process

### Key Conventions

- **TypeScript** - All code uses TypeScript with `strict: false` for gradual adoption
- **Options API** - Use Options API with `<script lang="ts">` in all Vue components (not Composition API)
- **Hash mode routing** - Router uses `createWebHashHistory()` for Electron compatibility
- **Store access** - Components use Pinia's `mapState` / `mapActions` (not a store instance in `data()` or ad-hoc `useXStore()` calls in methods)
- **Hand-written UI components** - Live in `src/renderer/components/ui/`. No component libraries (no shadcn-vue, reka-ui, etc.)
- **Icons** - `<Icon name="Trash2" class="h-4 w-4" />` from `@/components/Icon.vue`. SVG markup lives in `@/constants/icons.ts` (copied from lucide.dev); add new icons there

## General Guidance

- Don't improvise. Use conventional code when possible. Always ask for confirmation before writing code that breaks standard patterns
- Don't write code that fights against external libraries. Instead, suggest more conventional approahes.
- Check your work
- Favor maintainability, modularity, and simplicity over cleverness and complexity
- **Minimal dependencies** - Runtime dependencies are limited to `vue`, `pinia`, `vue-router`, `serialport`, and `@serialport/parser-readline`. Do not add npm packages (UI kits, icon packs, chart libraries, utility libraries) without asking first. Prefer a small, readable component or helper in this repo.

## Project Structure

**Key Points:**

- Use constants for magic numbers

### Themes

- 9 OKLCH color themes in `src/renderer/styles/themes.css`, names in `@/constants/theme`, applied by `@/stores/theme` (sets `.dark` and `data-theme` on `<html>`)
- `themes.css` layers: base (Default theme + status colors) → shared neutrals for colored themes → per-theme accents (primary, ring, chart colors). To add a theme, add a light + dark accent block and an entry to `THEMES`
- Copied from calvin_explorator (which replaced the former `theminator` package)

## Dashboard Page

Location: `src/renderer/views/Dashboard.vue`

**Features**

- the user can add projects (directorie that contain .ino and .grotnofig files)
- the projects will be displayed in cards (`Card` component)
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
- Contains: sidebar toggle button, page title, serial connection indicator

**Sidebar (`AppSidebar.vue`):**

- Plain `<aside>`; collapses to icon-only width
- Toggle via header button or Ctrl/Cmd+B; collapsed state persisted in localStorage
- Collapsed nav items show their label via native `title` attribute


## UI Components

Location: `src/renderer/components/ui/`

Hand-written, single-file Options API components styled with Tailwind and theme variables:

- `Button` (`variant`: default/destructive/outline/secondary/ghost/link, `size`: default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg)
- `Badge` (`variant`: default/secondary/destructive/outline/success/danger, `size`: default/sm). Class maps live in `badge/variants.ts`, shared with `ClickableBadge.vue`
- `Card` (bordered surface, no padding — sections inside set their own)
- `Label`, `Input`, `Textarea` (support `v-model`)
- `Switch` (`v-model`)
- `Select` (native `<select>`, `v-model` + `options`)
- `Dialog` (native `<dialog>`, `v-model:open`, `title`/`description` props, default + `footer` slots; nest a Dialog for confirmations)
- `SplitPane` (vertical resizable split, `top` / `bottom` slots)

Variant classes are plain `Record<string, string>` maps inside each component. Extra classes passed by the parent are appended via Vue attribute fallthrough — there is no class merging, so don't pass a class that conflicts with a base class (e.g. `px-*` on a Badge); add a variant/size instead.

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
npm run dev          # Start dev server + launch Electron with hot-reload
npm run build:mac    # Build for production (Mac)
npm start            # Preview production build (alias for preview)
npm run preview      # Preview production build
```

## Routing

- Uses `createWebHashHistory()` for Electron compatibility
- URLs: `/#/dashboard`, `/#/serial`, etc.
- Routes defined in `src/renderer/router/index.ts`

## Common Tasks

### Adding a New Page

1. Create `src/renderer/views/PageName.vue` with `<script lang="ts">` using Options API
2. Add route in `src/renderer/router/index.ts`
3. Add navigation item in `src/renderer/components/AppSidebar.vue`

### Adding UI Components

Write a small Options API component in `src/renderer/components/ui/<name>/` with an `index.ts` re-export. Follow the existing Button/Badge pattern. Do not install component libraries.

### Adding Icons

Copy the inner SVG markup from lucide.dev into `ICONS` in `src/renderer/constants/icons.ts`, then use `<Icon name="NewIcon" />`.

### Adding Charts

1. Import `LineChart` from `@/components/charts/LineChart.vue` (scale/tick helpers in `@/utils/chart.ts`)
2. Define data interface
3. Pass `:data`, a `:series` array (`{ name, y, color }`), and an `:x` accessor; `null` y values leave a gap in the line
4. The chart fills its container — give the parent a size (e.g. `flex-1 min-h-0`)
5. Use constants (`@/constants/chart`) for configuration values and `var(--chart-1)` … `var(--chart-5)` for colors

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

- **Color tokens only** - Use theme utilities (`bg-primary`, `text-muted-foreground`, `text-chart-1`, ...), never raw palette colors like `text-red-600` (exception: the ANSI color map in `utils/grot-colorizer.ts`)
- **Status colors** - `success` / `warning` / `destructive` (e.g. `text-success`, `bg-warning`, `border-destructive`)
- **New tokens** - Define the variable in `styles/themes.css`, then map it in the `@theme inline` block of `assets/main.css` to get utilities
- Use Tailwind classes for layout and spacing; scoped styles only for component internals (e.g. SVG in `LineChart.vue`)
- Avoid inline styles except for dynamic values
- Tailwind only picks up complete class names in source, so map state to full strings, never build them like `` `bg-${tone}` ``

### Charts

- Extract chart configuration to constants
- Define proper interfaces for data points
- Use theme variables for colors
- Keep chart styling inside `LineChart.vue`

## Integration with Other Systems

### With grot

**Code:** `/Users/damoncali/code/gems/grot

## Notes

- **No git commits** - User handles all git operations
- **Dark mode first** - App defaults to dark mode, configurable in Settings
- **Theme persistence** - Settings stored in localStorage (`theminator:darkMode`, `theminator:theme` — key names kept from the former theminator package)
- **Type safety** - `strict: false` allows gradual TypeScript adoption

### Tailwind v4 CSS Variables

- Use `w-[var(--variable)]`, not `w-[--variable]` (v3 syntax silently fails in v4)
- `::backdrop` does not inherit CSS variables in Electron 28 (Chromium 120), so `backdrop:` utilities need literal colors (see `Dialog.vue`)
