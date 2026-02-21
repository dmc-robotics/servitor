<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useThemeStore } from 'theminator'
import { useSettingsStore } from '@/stores/settings'

export default defineComponent({
  name: 'Settings',
  components: {
    Switch,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  },
  data() {
    return {
      versions: { servitor: '...', grot: '...' }
    }
  },
  async mounted() {
    const result = await window.appAPI.getVersions()
    if (result.success && result.data) this.versions = result.data
  },
  computed: {
    ...mapState(useThemeStore, ['darkMode', 'selectedTheme', 'availableThemes']),
    ...mapState(useSettingsStore, ['terminalApp', 'editorApp']),

    // Two-way computed properties for v-model
    darkModeModel: {
      get(): boolean {
        return this.darkMode
      },
      set(value: boolean): void {
        this.setDarkMode(value)
      }
    },
    selectedThemeModel: {
      get(): string {
        return this.selectedTheme
      },
      set(value: string): void {
        this.setTheme(value)
      }
    },
    terminalAppModel: {
      get(): string {
        return this.terminalApp
      },
      set(value: string): void {
        this.setTerminalApp(value as 'alacritty' | 'terminal')
      }
    },
    editorAppModel: {
      get(): string {
        return this.editorApp
      },
      set(value: string): void {
        this.setEditorApp(value as 'textedit' | 'sublime')
      }
    }
  },
  methods: {
    ...mapActions(useThemeStore, ['setDarkMode', 'setTheme']),
    ...mapActions(useSettingsStore, ['setTerminalApp', 'setEditorApp'])
  }
})
</script>

<template>
  <div class="p-4">
    <h2 class="text-3xl font-bold mb-6">Settings</h2>

    <div class="max-w-2xl space-y-6">
      <div class="border rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">General</h3>

        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <label class="text-sm font-medium">Terminal App</label>
              <p class="text-sm text-muted-foreground">Choose which terminal opens when clicking a project path</p>
            </div>
            <div class="w-48">
              <Select v-model="terminalAppModel">
                <SelectTrigger>
                  <SelectValue placeholder="Select terminal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terminal">Terminal</SelectItem>
                  <SelectItem value="alacritty">Alacritty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <label class="text-sm font-medium">Editor App</label>
              <p class="text-sm text-muted-foreground">Choose which editor opens config and sketch files</p>
            </div>
            <div class="w-48">
              <Select v-model="editorAppModel">
                <SelectTrigger>
                  <SelectValue placeholder="Select editor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="textedit">TextEdit</SelectItem>
                  <SelectItem value="sublime">Sublime Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div class="border rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Appearance</h3>

        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <label class="text-sm font-medium">Theme</label>
              <p class="text-sm text-muted-foreground">Select your color theme</p>
            </div>
            <div class="w-48">
              <Select v-model="selectedThemeModel">
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="theme in availableThemes" :key="theme.name" :value="theme.name">
                    {{ theme.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <label class="text-sm font-medium">Dark Mode</label>
              <p class="text-sm text-muted-foreground">Toggle between light and dark theme</p>
            </div>
            <Switch v-model="darkModeModel" />
          </div>
        </div>
      </div>
      <div class="border rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">About</h3>

        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Servitor</span>
            <span>{{ versions.servitor }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">grot</span>
            <span>{{ versions.grot }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
