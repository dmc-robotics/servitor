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
  computed: {
    ...mapState(useThemeStore, ['darkMode', 'selectedTheme', 'availableThemes']),

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
    }
  },
  methods: {
    ...mapActions(useThemeStore, ['setDarkMode', 'setTheme'])
  }
})
</script>

<template>
  <div>
    <h2 class="text-3xl font-bold mb-6">Settings</h2>

    <div class="max-w-2xl">
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
    </div>
  </div>
</template>
