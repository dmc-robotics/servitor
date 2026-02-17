# Servitor Implementation Plan

## Context

**What:** Build Servitor - an Electron desktop application for Arduino serial monitoring, plotting, and project management.

**Why:** To provide developers with a modern, themeable tool for real-time Arduino serial communication with visual data plotting capabilities.

**Current State:** Blank project with only CLAUDE.md documentation and MCP configuration. All external dependencies (theminator at ~/code/theminator, grot gem at ~/code/gems/grot) are confirmed available. This is a complete greenfield build.

## Implementation Strategy

Build in 6 progressive phases, each with testing checkpoints. Each phase builds on the previous, allowing validation before proceeding.

---

## Phase 1: Project Foundation (Config & Setup)

**Goal:** Establish project structure, install dependencies, configure build system

### 1.1 Initialize Project with electron-vite
```bash
npm create @quick-start/electron@latest . -- --template vue
```

This scaffolds the basic structure:
- `src/main/` - Electron main process
- `src/preload/` - IPC bridge
- `src/renderer/` - Vue application
- Config files: `electron.vite.config.ts`, `tsconfig.json`, `package.json`

### 1.2 Install Dependencies

**Runtime:**
```bash
npm install vue@^3.0.0 vue-router@^4.0.0 pinia@^2.0.0
npm install @unovis/vue serialport @serialport/parser-readline
```

**Development:**
```bash
npm install -D typescript@^5.0.0 tailwindcss@^4.1.0 @types/node @types/serialport
```

**Link theminator** (local package):
```bash
cd ~/code/theminator && npm link
cd /Users/damoncali/code/servitor && npm link theminator
```

### 1.3 Configure Critical Settings

**TypeScript** (`tsconfig.json`):
- Set `"strict": false` per CLAUDE.md requirement
- Target: ES2020, Module: ESNext

**Electron Window** (`src/main/index.ts`):
```typescript
const mainWindow = new BrowserWindow({
  backgroundColor: '#1a1a1a',  // Prevents white flash
  show: false,                  // Wait for ready-to-show event
  // ... webPreferences
})

mainWindow.once('ready-to-show', () => mainWindow.show())
```
**Critical:** This prevents white flash on startup - never remove!

**Router** (`src/renderer/router/index.ts`):
- Use `createWebHashHistory()` - required for Electron compatibility
- NOT `createWebHistory()` - will break in production

**Tailwind CSS** (`src/renderer/assets/main.css`):
```css
@import "tailwindcss";
@import "theminator/styles";

@layer base {
  body {
    background-color: var(--background);
    color: var(--foreground);
  }
}
```
**Note:** Tailwind 4.1 uses CSS-first config - no JavaScript config file needed

### 1.4 Update package.json scripts
```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview"
  }
}
```

**Verification:**
- [ ] `npm run dev` opens Electron window with dark background, no white flash
- [ ] Hot reload works (change component, see instant update)
- [ ] No TypeScript errors
- [ ] `ls -la node_modules/theminator` confirms link

---

## Phase 2: Theme System Integration

**Goal:** Integrate theminator, verify theme switching works, establish base HTML structure

### 2.1 Create Minimal index.html
**File:** `src/renderer/index.html`

**Critical:** NO inline styles! They override theme variables and break light mode.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Servitor</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 2.2 Initialize Theminator
**File:** `src/renderer/main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useThemeStore } from 'theminator'
import 'theminator/styles'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize AFTER Pinia
useThemeStore().initialize()

app.mount('#app')
```

### 2.3 Basic App.vue with Theme Toggle
**File:** `src/renderer/App.vue`

Use Options API with `defineComponent()`, mapState/mapActions from Pinia. Include temporary theme testing controls.

**Verification:**
- [ ] App opens with theminator default theme
- [ ] Dark/light toggle switches instantly
- [ ] HTML has `data-theme` and `class="dark"` attributes
- [ ] localStorage has `theminator:darkMode` and `theminator:theme` keys
- [ ] Theme persists after reload
- [ ] No console errors

---

## Phase 3: Navigation & Layout

**Goal:** Set up routing, install shadcn-vue components, create layout with sidebar

### 3.1 Create View Placeholders
Create these files with basic structure (Options API):
- `src/renderer/views/Dashboard.vue`
- `src/renderer/views/Serial.vue`
- `src/renderer/views/Settings.vue`

### 3.2 Configure Router
**File:** `src/renderer/router/index.ts`

Routes: `/` → redirect to `/dashboard`, `/dashboard`, `/serial`, `/settings`

**Critical:** `createWebHashHistory()` only!

### 3.3 Install shadcn-vue Components

```bash
npx shadcn-vue@latest init
# Choose: Default style, Neutral color, CSS variables: Yes, src directory: Yes

npx shadcn-vue@latest add sidebar button card switch select textarea tabs -y
```

Components install to: `src/renderer/components/ui/`

### 3.4 Fix shadcn-vue Bugs

**Sidebar.vue** - Tailwind v4 CSS variable syntax:
```vue
<!-- BEFORE (incorrect) -->
<div class="w-[--sidebar-width]">

<!-- AFTER (correct) -->
<div class="w-[var(--sidebar-width)]">
```

**SidebarTrigger.vue** - Mobile visibility:
```vue
<Button class="md:hidden" ...>
```

Add comments explaining fixes per CLAUDE.md convention.

### 3.5 Create Layout Component
**File:** `src/renderer/components/Layout.vue`

**Structure:**
- Sticky header (`sticky top-0 z-10 bg-background`) with SidebarTrigger + title + battery status
- Collapsible Sidebar with navigation menu (Dashboard, Serial Monitor, Settings)
- Main content area with `<router-view />`
- Use Options API with `defineComponent()`

### 3.6 Update App.vue
Replace content with `<Layout />` component.

**Verification:**
- [ ] Navigation menu works (URLs: `/#/dashboard`, `/#/serial`, `/#/settings`)
- [ ] Sidebar collapses on desktop
- [ ] Sidebar becomes drawer on mobile (<768px), trigger appears
- [ ] Header stays sticky when scrolling
- [ ] Active route highlights in sidebar
- [ ] Theme toggle still functional

---

## Phase 4: Serial Communication Backend

**Goal:** Implement serialport in main process, create IPC bridge, enable basic serial communication

### 4.1 Create Serial Manager
**File:** `src/main/serial-manager.ts`

**Class:** `SerialManager`
- Methods: `listPorts()`, `connect()`, `disconnect()`, `write()`, `getConnectionStatus()`
- Uses SerialPort + ReadlineParser (line-delimited data)
- Callback pattern for streaming data to renderer

### 4.2 Set Up IPC Handlers
**File:** `src/main/index.ts`

Add IPC handlers:
- `serial:list-ports` → List available ports
- `serial:connect` → Connect with config (path, baudRate)
- `serial:disconnect` → Close connection
- `serial:write` → Send data to serial
- `serial:status` → Get connection status
- `serial:data` event → Stream data to renderer

### 4.3 Define IPC Bridge
**File:** `src/preload/index.ts`

```typescript
export interface SerialAPI {
  listPorts: () => Promise<any[]>
  connect: (config: { path: string, baudRate: number }) => Promise<{ success: boolean }>
  disconnect: () => Promise<{ success: boolean }>
  write: (data: string) => Promise<{ success: boolean }>
  getStatus: () => Promise<{ connected: boolean }>
  onData: (callback: (data: { timestamp: number, data: string }) => void) => void
  removeDataListener: () => void
}

// contextBridge.exposeInMainWorld('serialAPI', serialAPI)
```

### 4.4 TypeScript Declarations
**File:** `src/renderer/types/electron.d.ts`

```typescript
declare global {
  interface Window {
    serialAPI: SerialAPI
  }
}
```

**Verification:**
- [ ] Build succeeds with no TypeScript errors
- [ ] `window.serialAPI` exists in console
- [ ] `await window.serialAPI.listPorts()` returns port list
- [ ] Can connect to Arduino (if available)
- [ ] `write()` sends data successfully
- [ ] `onData()` callback receives data from Arduino

---

## Phase 5: Serial Monitor & Plotter UI

**Goal:** Build complete Serial page with monitor/plotter tabs, real-time visualization, send/receive

### 5.1 Define Data Protocol

**Human-readable format:**
```
VALUE:123           # Single unnamed value
temp:25             # Single labeled value
A:10,B:20,C:30      # Multiple values (CSV)
LOG:Debug message   # Console log message
# Comment line      # Ignored
```

### 5.2 Create Data Parser
**File:** `src/renderer/utils/serial-parser.ts`

**Function:** `parseSerialLine(line: string, timestamp: number): ParsedSerialData`

**Interface:**
```typescript
interface ParsedSerialData {
  type: 'value' | 'label' | 'multi' | 'log' | 'raw'
  timestamp: number
  values?: { [key: string]: number }
  message?: string
  raw: string
}
```

Uses regex patterns to parse different formats, extracts numeric data for plotting.

### 5.3 Create Serial Store
**File:** `src/renderer/stores/serial.ts`

**Pinia Store State:**
- `connected`, `port`, `baudRate`
- `messages: ParsedSerialData[]` - monitor buffer (max 500)
- `plotData: { [key: string]: number[] }` - separate arrays per data key
- `timestamps: number[]` - time series

**Actions:**
- `connect()`, `disconnect()`, `send()`, `clearData()`
- `handleSerialData()` - parse incoming data, update buffers, trim to max size

### 5.4 Build Monitor Component
**File:** `src/renderer/components/SerialMonitor.vue`

**Features:**
- Scrollable message display (auto-scroll with toggle)
- Timestamp + color-coded messages (raw=muted, log=primary, data=foreground)
- Textarea for input with Enter=send, Shift+Enter=newline
- Send button (disabled when not connected)

**Options API:** Use `mapState` for messages/connected, `mapActions` for send

**Critical:** `event.preventDefault()` on plain Enter!

### 5.5 Build Plotter Component
**File:** `src/renderer/components/SerialPlotter.vue`

**Uses Unovis:**
- `VisXYContainer`, `VisLine`, `VisAxis` components
- Transform store data to `{ timestamp, key1, key2, ... }[]` format
- Line per data key with colors from `var(--chart-1)` through `var(--chart-5)`
- Legend showing data keys with color indicators

**Styling:** Use `:deep()` to style Unovis internals with theme variables

### 5.6 Create Serial Page
**File:** `src/renderer/views/Serial.vue`

**Structure:**
- Connection controls card: Port selector, baud rate selector, Connect/Disconnect/Refresh/Clear buttons
- Tabs component with "Monitor" and "Plotter" tabs
- TabsContent with SerialMonitor and SerialPlotter components

**Options API:** Use Pinia mapState/mapActions, load ports on mount

**Verification:**
- [ ] Port dropdown populated on page load
- [ ] Connect to Arduino - status shows "Connected"
- [ ] Arduino sends data - appears in monitor, plots in plotter
- [ ] Type message + Enter - Arduino receives
- [ ] Shift+Enter creates newline, doesn't send
- [ ] Switch tabs - both views update in real-time
- [ ] Clear button resets both monitor and plotter
- [ ] Disconnect - status updates, controls reset
- [ ] All data protocol formats parse correctly

---

## Phase 6: Dashboard & Settings

**Goal:** Complete Dashboard with stats, Settings with theme controls

### 6.1 Build Dashboard
**File:** `src/renderer/views/Dashboard.vue`

**Cards:**
1. **Connection Status** - Green/gray dot, port name, "Connect to Port" or "View Serial Monitor" button
2. **Message Statistics** - Total message count, last message timestamp
3. **System Info** - Platform, app version

**Welcome message** - Brief intro and call to action

**Options API:** Use Pinia mapState for serial store data, router.push for navigation

### 6.2 Build Settings
**File:** `src/renderer/views/Settings.vue`

**Appearance Card:**
- Dark Mode toggle (Switch component, bound to theminator store)
- Color Theme selector (Select component, all 9 themes)

**About Card:**
- App name, version, tech stack

**Options API:** Use computed properties with getters/setters for v-model bindings to Pinia actions

**Verification:**
- [ ] Dashboard shows real connection status from serial store
- [ ] Message count updates as data arrives
- [ ] Navigation buttons work
- [ ] Settings dark mode toggle works instantly
- [ ] All 9 color themes work in both light and dark modes
- [ ] Theme persists after app restart (localStorage)

---

## Future Enhancement: Grot Integration (Phase 7)

**Not required for MVP**, but documented for future:

- Create `src/main/grot-manager.ts` using `child_process.spawn` to call grot CLI
- Add IPC handlers for `grot build`, `grot load`, `grot ports`
- Project directory picker with `.grotconfig` parser
- One-click Build/Upload buttons on Dashboard or new Projects page
- Build output console with error highlighting

---

## Critical Conventions (MUST FOLLOW)

From CLAUDE.md - strictly enforce throughout implementation:

1. **Options API only** - All custom Vue components use `<script lang="ts">` with `defineComponent()`
2. **Hash routing** - `createWebHashHistory()` required for Electron, never change to createWebHistory
3. **NO inline styles** - Breaks theme system, all colors via CSS variables only
4. **TypeScript strict: false** - Per requirements, set in tsconfig.json
5. **Electron anti-flash config** - `backgroundColor: '#1a1a1a'` + `show: false` + `ready-to-show` event
6. **Tailwind v4 syntax** - CSS variables need `var()` wrapper: `var(--variable)` not `--variable`
7. **Constants for magic numbers** - Buffer sizes, colors, timeouts all named constants
8. **Interfaces for data** - Type all data structures with TypeScript interfaces
9. **Theme CSS variables** - All colors via `var(--color-name)`, no hardcoded colors
10. **Document fixes** - Add comments to shadcn-vue components explaining corrections

---

## Final Verification (Before Declaring Complete)

### Functional Testing
- [ ] `npm run dev` - App opens without white flash
- [ ] Connect to Arduino serial port successfully
- [ ] Receive and display serial data in monitor
- [ ] Plot numeric data in real-time
- [ ] Send data back to Arduino
- [ ] All data protocol formats parse correctly
- [ ] Switch between dark/light modes instantly
- [ ] All 9 color themes work in both modes
- [ ] Navigate between all pages (Dashboard, Serial, Settings)
- [ ] Sidebar responsive behavior (desktop collapse, mobile drawer)
- [ ] Settings persist across app restarts

### Production Build Testing
- [ ] `npm run build` - Builds without errors
- [ ] `npm run preview` - Production build runs successfully
- [ ] All features work in production build (not just dev mode)
- [ ] No console errors in production
- [ ] Theme system works in packaged app

### Code Quality
- [ ] All TypeScript files compile without errors
- [ ] Options API used consistently in all custom components
- [ ] No inline styles in HTML or components
- [ ] All shadcn-vue fixes documented with comments
- [ ] All magic numbers extracted to constants
- [ ] All data structures have TypeScript interfaces

---

## Project File Structure

```
/Users/damoncali/code/servitor/
├── package.json
├── tsconfig.json
├── electron.vite.config.ts
├── CLAUDE.md
├── .mcp.json
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron main, IPC handlers, window setup
│   │   └── serial-manager.ts     # SerialPort logic, connection management
│   ├── preload/
│   │   └── index.ts              # IPC bridge, SerialAPI definition
│   ├── renderer/
│   │   ├── index.html            # Minimal HTML (NO inline styles!)
│   │   ├── main.ts               # Vue app entry, theminator init
│   │   ├── App.vue               # Root component with Layout
│   │   ├── assets/
│   │   │   └── main.css          # Tailwind + theminator imports
│   │   ├── components/
│   │   │   ├── ui/               # shadcn-vue components (CLI-installed)
│   │   │   ├── Layout.vue        # Sticky header + sidebar + router-view
│   │   │   ├── SerialMonitor.vue # Message display + send input
│   │   │   └── SerialPlotter.vue # Unovis chart visualization
│   │   ├── views/
│   │   │   ├── Dashboard.vue     # Stats cards + welcome message
│   │   │   ├── Serial.vue        # Connection controls + Monitor/Plotter tabs
│   │   │   └── Settings.vue      # Theme controls + about info
│   │   ├── stores/
│   │   │   └── serial.ts         # Pinia store: state, actions, data buffers
│   │   ├── utils/
│   │   │   └── serial-parser.ts  # Data protocol parser
│   │   ├── types/
│   │   │   └── electron.d.ts     # Window.serialAPI type declarations
│   │   └── router/
│   │       └── index.ts          # Vue Router with hash history
└── node_modules/
    └── theminator -> ~/code/theminator  # Symlinked local package
```

---

## Implementation Priority

**Core MVP Features (Phases 1-6):**
1. Project setup and configuration
2. Theme system integration
3. Navigation and layout
4. Serial backend (IPC + SerialPort)
5. Serial monitor and plotter
6. Dashboard and settings pages

**Future Enhancements (Phase 7+):**
- Grot integration for Arduino build/upload
- Project management UI
- Settings for buffer size, auto-scroll, etc.
- Data export (CSV, JSON)
- Connection history
- Custom data protocol editor

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| White flash on startup | Poor UX | Use backgroundColor + show:false config (Phase 1) |
| Light mode broken | Theme system fails | No inline styles, CSS variables only (Phase 2) |
| Router breaks in production | App won't load | Use hash history, test production build (Phase 3) |
| Serial data loss | Missing messages | Buffer with max size, trim on overflow (Phase 5) |
| Type errors | Build failures | Define all interfaces upfront (Phase 4) |
| Tailwind v4 syntax | Component styling breaks | Fix shadcn-vue components, document changes (Phase 3) |

---

## Success Criteria

**MVP Complete When:**
- ✅ Electron app opens without white flash
- ✅ Theme system works (9 themes, light/dark mode, persistence)
- ✅ Can connect to Arduino via serial port
- ✅ Real-time serial monitor displays all incoming data
- ✅ Real-time plotter visualizes numeric data
- ✅ Can send commands back to Arduino
- ✅ All navigation works (Dashboard, Serial, Settings)
- ✅ Production build works identically to dev mode
- ✅ All conventions from CLAUDE.md followed

**Definition of Done:**
- All phases 1-6 complete and verified
- All verification checkpoints passed
- No console errors in production build
- Code follows all critical conventions
- Ready for user testing with real Arduino hardware
