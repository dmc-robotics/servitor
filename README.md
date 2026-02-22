# Servitor

A desktop app for Arduino development — serial monitor, serial plotter, and one-click build/load project management. Built with Electron and Vue 3.

![Version](https://img.shields.io/badge/version-1.0.1-blue)

## Features

### Projects
Manage your Arduino projects from a single dashboard. Each project card shows board info, port status, and config validity at a glance.

- Add any directory containing a `.ino` sketch and `.grotconfig` file
- One-click **Build** and **Load** via the [grot](https://github.com/fungus-wine/grot) gem
- Auto-scan and update the serial port for a connected Arduino
- Live status badges that update when project files change on disk
- Colorized build output in a resizable output panel

### Serial Monitor
Connect to any serial port and watch data stream in real time.

- Configurable port and baud rate
- **Monitor tab** — displays parsed key/value pairs and plain text messages
- **Plotter tab** — charts numeric values in real time using Unovis
- Send data back to the device (Enter to send, Shift+Enter for new line)
- Raw mode toggle

**Data protocol** — simple and human-readable, designed to be sent from Arduino sketches:
```
temperature:23.4,humidity:61.2   # key/value pairs → plotted and displayed
Hello world                      # plain text → displayed in monitor
```

### Settings
- Choose your preferred terminal (Terminal.app or Alacritty) and editor (TextEdit or Sublime Text)
- 9 color themes with light/dark mode, powered by the [theminator](../theminator) OKLCH theme system
- View app and grot version info

## Requirements

- macOS (primary platform)
- [Node.js](https://nodejs.org/) 20+
- [grot gem](https://github.com/fungus-wine/grot) — Ruby CLI tool for Arduino build/load

## Development

```zsh
npm install
npm run dev        # Start dev server + Electron with hot-reload
```

### Other commands

```zsh
npm run build      # Type-check and build for production
npm run preview    # Preview the production build
npm test           # Run unit tests
npm run typecheck  # Run TypeScript checks
```

### Building a distributable

```zsh
npm run build:mac    # macOS .dmg
npm run build:win    # Windows installer
npm run build:linux  # Linux AppImage
```

For macOS, place your icon at `resources/icon.icns` before building. See [Creating an icns file](#creating-an-icns-file) below.

## Project Structure

```
src/
├── main/               # Electron main process
│   ├── index.ts        # App bootstrap, IPC handlers, window setup
│   ├── project-manager.ts  # Project storage, grot integration, file watching
│   └── serial-manager.ts   # Serial port connection and data streaming
├── preload/            # IPC bridge between main and renderer
├── renderer/           # Vue 3 frontend
│   ├── views/          # Pages: Projects, Serial, Settings
│   ├── components/     # Shared and UI components (shadcn-vue)
│   ├── stores/         # Pinia state: dashboard, serial, settings
│   ├── router/         # Hash-mode routing for Electron compatibility
│   └── utils/          # Serial parser, grot output colorizer
└── shared/types/       # TypeScript types shared across processes
resources/
├── icon.png            # Linux app icon
├── icon.icns           # macOS app icon (add your own)
└── icon.ico            # Windows app icon (add your own)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 28, electron-vite, electron-builder |
| UI framework | Vue 3 (Options API), TypeScript |
| Routing | Vue Router (hash mode) |
| State | Pinia |
| Styling | Tailwind CSS 4.1, shadcn-vue, theminator |
| Charts | Unovis |
| Icons | lucide-vue-next |
| Serial | serialport |
| Build tool | Vite |
| Testing | Vitest |


```
