# Servitor Code Review

## Overall Assessment

The codebase is well-structured and follows its own conventions consistently (Options API, TypeScript, Pinia, shadcn-vue). The IPC layer, store design, and type sharing across processes are solid. There are several real bugs, some security considerations, and various quality improvements worth addressing.

---

## Bugs

### 1. `connectionLostCallback` fires on voluntary disconnect
**File:** `src/main/serial-manager.ts`
The `close` event handler captures `wasConnected = this.isConnected` when the handler is registered. During `disconnect()`, `cleanup()` is called only *after* the close promise resolves, so `this.isConnected` is still `true` when the `close` event fires. This means a deliberate disconnect triggers the "connection lost" notification to the user.
**Fix:** Set `this.isConnected = false` before calling `port.close()`, or add an `isDisconnecting` flag.

### 2. macOS port path normalization missing in `addProject()` and `updateProject()`
**File:** `src/main/project-manager.ts`
`getProjects()` normalizes macOS `tty.*` paths to `cu.*`, but `addProject()` and `updateProject()` use raw `p.path`. This means `portAvailable` may be incorrectly `false` for projects added or updated on macOS.

### 3. `grotBuild`/`grotLoad` return `success: true` on non-zero exit codes
**File:** `src/main/project-manager.ts`
The IPC handlers always return `{ success: true, data: output }` regardless of grot's exit code. A compile error is reported as `success: true`, which is semantically confusing and inconsistent with the `AppResult` pattern.

### 4. `updatePortInConfig()` silently fails if port key is absent or unquoted
**File:** `src/main/project-manager.ts`
The regex `content.replace(/^(port\s*=\s*)"[^"]*"/m, ...)` only matches quoted values. If the port key doesn't exist or uses a different format, the replacement silently does nothing.

### 5. Serial baud rate type mismatch
**File:** `src/renderer/views/Serial.vue`
`selectedBaudRate` is initialized as a `number` (9600), but shadcn Select coerces values to strings. After user selection, `selectedBaudRate` becomes a string like `"115200"` but is passed to `connect()` which expects a number.

### 6. `updateStatus()` defined but never called
**File:** `src/renderer/stores/serial.ts`
If the app reloads while a serial connection is active in the main process, the renderer shows "Not connected" because `updateStatus()` is never called on mount.

### 7. Build/Load buttons not disabled when directory is inaccessible
**File:** `src/renderer/components/ProjectCard.vue`
Buttons only check `hasGrotConfig` but not `directoryAccessible`. A project with a deleted/moved directory would still enable Build/Load.

### 8. `EditProjectDialog` remove ignores failure
**File:** `src/renderer/components/EditProjectDialog.vue`
`handleRemove` doesn't check the return value of `removeProject`. The dialog closes even on failure with no error shown.

### 9. `removeProject` handler unwatches before confirming removal
**File:** `src/main/index.ts`
`unwatchProject(id)` is called before `removeProject(id)`. If removal fails, the watcher is stopped but the project still exists.

---

## Reliability / Resource Concerns

### 10. `before-quit` can hang indefinitely
**File:** `src/main/index.ts`
If `serialManager.disconnect()` hangs (broken port state), `app.quit()` is never called. Add a timeout: `Promise.race([disconnect(), timeout(3000)])`.

### 11. Port not closed on error
**File:** `src/main/serial-manager.ts`
`cleanup()` nulls `this.port` but doesn't close it. When called from the error handler, the underlying port may hold OS file descriptors until garbage collected.

### 12. `write()` does not drain the port
**File:** `src/main/serial-manager.ts`
`port.write()` buffers data but doesn't flush. Rapidly sent messages can be dropped or merged. Call `port.drain()` after write.

### 13. Synchronous I/O on main thread
**File:** `src/main/project-manager.ts`
`readFileSync`/`writeFileSync` block Electron's event loop. Should use async `fs.promises` alternatives.

---

## Security Considerations

### 14. IPC handler arguments are untyped
**File:** `src/main/index.ts`
All IPC handler args (after `_event`) are implicitly `any`. Should be explicitly typed.

### 15. `open-in-terminal` and `open-in-editor` accept arbitrary paths
**File:** `src/main/index.ts`
No validation that paths are within expected project directories. A compromised renderer could open any path.

### 16. `sandbox: false`
**File:** `src/main/index.ts`
Disabling the renderer sandbox increases attack surface. Should be documented as intentional.

---

## UX Issues

### 17. No user-visible error feedback on serial operations
**File:** `src/renderer/views/Serial.vue`
`loadPorts` and `handleConnect` only `console.error` on failure. The user sees no indication of what went wrong.

### 18. Connection indicator has no label
**File:** `src/renderer/components/Layout.vue`
The colored dot has no tooltip, title attribute, or screen reader text.

### 19. Empty placeholder on serial send textarea
**File:** `src/renderer/views/Serial.vue`
`placeholder=""` gives users no hint about the input purpose.

### 20. Config badge optimistically shows 'ok' before validation
**File:** `src/renderer/components/ProjectCard.vue`
`configValid === undefined` returns `'ok'`, briefly showing green before validation completes.

### 21. Inconsistent empty-value display
**File:** `src/renderer/components/ProjectCard.vue`
`baudDisplay` returns `''` but `portDisplay` returns `'not set'`.

---

## Performance / Code Quality

### 22. `deep: true` watchers on arrays that only need length
**Files:** `src/renderer/components/SerialMonitor.vue`, `OutputPanel.vue`
Deep watching arrays of objects when only the length matters causes unnecessary traversal on every change.

### 23. Array index as `:key` in SerialMonitor
**File:** `src/renderer/components/SerialMonitor.vue`
When messages are trimmed from the front (MAX_BUFFER_SIZE), using index keys causes a full re-render.

### 24. `createYAccessor` creates new functions every render
**File:** `src/renderer/components/SerialPlotter.vue`
Called from `:y="createYAccessor(key)"` in `v-for`. Each render creates new function objects, causing Unovis to re-render all lines.

### 25. `CurveType` enum stored in `data()` becomes reactive
**File:** `src/renderer/components/SerialPlotter.vue`
Vue will proxy/observe the enum object unnecessarily. Use a computed instead.

### 26. ResizeObserver + window resize listener double-fire
**File:** `src/renderer/components/SerialPlotter.vue`
Both fire on window resize. ResizeObserver fires before the shrink-trick completes, potentially reading stale dimensions.

### 27. `unsubscribeProjectChanged` stored in reactive `data()`
**File:** `src/renderer/views/Projects.vue`
Cleanup functions should not be reactive. Store as instance property instead.

### 28. `operationState` computed returns function — fragile reactivity
**File:** `src/renderer/views/Projects.vue`
`useDashboardStore()` called on every computed access. When `operationState[id]` is the default plain object (from `??`), it's not tracked by Pinia reactivity.

### 29. `connectionLostCleanup` self-reference in callback
**File:** `src/renderer/stores/serial.ts`
The callback invokes its own unsubscribe function from inside the handler, which is fragile depending on the IPC listener implementation.

---

## Minor / Style Issues

### 30. Deprecated `SerialResult` alias still imported
**Files:** `src/main/serial-manager.ts`, `src/shared/types/serial.ts`
Migration to `AppResult` is incomplete.

### 31. `AppResult` re-exported from `dashboard.ts`
Creates two import paths for the same type.

### 32. `ClickableBadge` missing `type="button"`
Could accidentally submit parent forms.

### 33. Missing `DialogDescription` in AddProject/EditProject dialogs
Radix accessibility warning in console.

### 34. `pageTitle` computed hardcodes route names
**File:** `src/renderer/components/Layout.vue`
Should use `route.meta.title` for maintainability.

### 35. Cancel button in AddProjectDialog bypasses `handleOpenChange`
**File:** `src/renderer/components/AddProjectDialog.vue`
`@click="open = false"` skips `reset()`. Works because the Dialog emits `update:open`, but fragile.

### 36. No catch-all route
**File:** `src/renderer/router/index.ts`
Unknown hashes render blank content with no feedback.

### 37. Package.json issues
- Both `radix-vue` and `reka-ui` listed (migration incomplete?)
- `@types/serialport` in `dependencies` instead of `devDependencies`

### 38. Badge custom colors bypass theme system
**File:** `src/renderer/components/ui/badge/index.ts`
Hardcoded `dark:border-green-500` classes don't adapt to theminator themes.

---

## Implementation Plan — Fix All Issues

### Group A: Serial Manager (`src/main/serial-manager.ts`)
Fix issues #1, #11, #12, #30

1. Add `isDisconnecting` flag; set it before `port.close()` in `disconnect()`; check it in `close` handler to suppress `connectionLostCallback`
2. In `cleanup()`, close the port before nulling the reference (save ref, null, then close)
3. After `port.write()`, call `port.drain()` in a callback/promise before resolving
4. Replace `SerialResult` import with `AppResult` from `app-result.ts`

### Group B: Project Manager (`src/main/project-manager.ts`)
Fix issues #2, #3, #4, #13

1. Extract port normalization into a helper function (e.g., `normalizePorts(portList)`) and use it in `addProject()`, `updateProject()`, and `getProjects()`
2. In `grotBuild`/`grotLoad`/`grotValidate` IPC handlers, return `success: false` when `exitCode !== 0`
3. In `updatePortInConfig()`: handle missing port key by appending `port = "value"` if no match; handle unquoted values with a broader regex
4. Replace `readFileSync`/`writeFileSync` with `fs.promises.readFile`/`writeFile`

### Group C: Main Process IPC (`src/main/index.ts`)
Fix issues #9, #10, #14, #15, #16

1. Reorder `removeProject` handler: call `removeProject()` first, only `unwatchProject()` on success
2. Add timeout to `before-quit` cleanup: `Promise.race([serialManager.disconnect(), new Promise(r => setTimeout(r, 3000))])`
3. Add explicit TypeScript types to all IPC handler arguments
4. Add path validation for `open-in-terminal` and `open-in-editor` (verify path exists and is a directory/file)
5. Add comment documenting `sandbox: false` as intentional

### Group D: Serial View & Store (`src/renderer/views/Serial.vue`, `src/renderer/stores/serial.ts`)
Fix issues #5, #6, #17, #19, #29

1. Change `selectedBaudRate` to string type; convert to `Number()` before passing to `connect()`
2. Call `updateStatus()` in Serial.vue's `mounted()` hook
3. Add user-visible error feedback: show toast/inline error when `loadPorts` or `handleConnect` fails
4. Add placeholder text to serial send textarea: `"Send to device (Enter to send)"`
5. In `connectionLostCleanup` callback, save ref to local variable before calling: `const cleanup = this.connectionLostCleanup; this.connectionLostCleanup = null; cleanup?.()`

### Group E: ProjectCard (`src/renderer/components/ProjectCard.vue`)
Fix issues #7, #20, #21

1. Add `!project.directoryAccessible` to Build/Load button disabled conditions
2. Change `configBadgeState` to return a neutral state (e.g., `'secondary'`) when `configValid === undefined` instead of `'ok'`
3. Change `baudDisplay` to return `'not set'` instead of `''` for consistency with `portDisplay`

### Group F: Dialogs (`src/renderer/components/AddProjectDialog.vue`, `EditProjectDialog.vue`)
Fix issues #8, #33, #35

1. In EditProjectDialog `handleRemove`: check return value of `removeProject`, show error if failed, only close on success
2. Add `DialogDescription` (can be visually hidden) to both dialogs
3. In AddProjectDialog: change Cancel button to `@click="handleOpenChange(false)"`

### Group G: Projects View (`src/renderer/views/Projects.vue`)
Fix issues #27, #28

1. Move `unsubscribeProjectChanged` from `data()` to instance property set in `created()`
2. Refactor `operationState` computed: use `mapState` to expose `getOperationState` directly, or access `store.operationState` as a map

### Group H: SerialMonitor (`src/renderer/components/SerialMonitor.vue`)
Fix issues #22, #23

1. Remove `deep: true` from `messages` watcher (Pinia reactive arrays trigger shallow watchers on push)
2. Add an `id` field to parsed messages (incrementing counter in store) and use it as `:key` instead of array index

### Group I: SerialPlotter (`src/renderer/components/SerialPlotter.vue`)
Fix issues #24, #25, #26

1. Cache y-accessor functions: create a computed `yAccessors` map keyed by data key, only recreate when `dataKeys` changes
2. Move `CurveType` from `data()` to a computed property
3. Remove the `ResizeObserver` — the `window.addEventListener('resize')` with the shrink trick already handles all resize cases

### Group J: OutputPanel (`src/renderer/components/OutputPanel.vue`)
Fix issue #22

1. Remove `deep: true` from `outputLog` watcher

### Group K: Layout (`src/renderer/components/Layout.vue`)
Fix issues #18, #34

1. Add `title` attribute to connection indicator dot (`"Serial connected"` / `"Not connected"`)
2. Refactor `pageTitle`: add `meta: { title: '...' }` to route definitions in `router/index.ts`, read from `this.$route.meta.title` in Layout

### Group L: Minor Fixes
Fix issues #31, #32, #36, #37, #38

1. Remove `AppResult` re-export from `dashboard.ts`; update any imports that use this path
2. Add `type="button"` to ClickableBadge's `<button>` element
3. Add catch-all route in `router/index.ts`: `{ path: '/:pathMatch(.*)*', redirect: '/projects' }`
4. Move `@types/serialport` from `dependencies` to `devDependencies` in package.json; investigate if `radix-vue` can be removed (if fully migrated to `reka-ui`)
5. Update badge variants to use theminator CSS variables instead of hardcoded Tailwind color classes

### Group M: Shared Types Cleanup
Fix remaining type issues

1. Remove deprecated `SerialResult` type from `src/shared/types/serial.ts`
2. Constrain `SerialConfig.baudRate` to `ValidBaudRate` type
3. Move `MAX_BUFFER_SIZE` from shared types to the renderer store where it's used

### Verification

1. Run `npm run dev` and verify the app starts without errors
2. Test serial connect/disconnect — verify no spurious "connection lost" notification on voluntary disconnect
3. Test project add/edit/remove — verify port badges show correctly on macOS
4. Test grot build with intentional compile error — verify `success: false` is returned
5. Test serial baud rate selection — verify correct number type is sent to main process
6. Test quit behavior — verify app exits cleanly even if serial port is in bad state
7. Visually verify connection indicator tooltip, dialog accessibility, badge states
8. Check console for Radix/accessibility warnings
