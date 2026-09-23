<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import Icon from '@/components/Icon.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { Button } from '@/components/ui/button'
import { STORAGE_KEYS } from '@/constants/storage'
import { useSerialStore } from '@/stores/serial'

/** Ctrl/Cmd + this key toggles the sidebar */
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true'
  } catch {
    return false
  }
}

export default defineComponent({
  name: 'Layout',
  components: {
    Icon,
    AppSidebar,
    Button
  },
  data() {
    return {
      sidebarCollapsed: loadSidebarCollapsed()
    }
  },
  computed: {
    ...mapState(useSerialStore, ['connected']),

    pageTitle(): string {
      return (this.$route.meta?.title as string) || 'Servitor'
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeyDown)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed
      try {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(this.sidebarCollapsed))
      } catch { /* ignore */ }
    },
    handleKeyDown(event: KeyboardEvent): void {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        this.toggleSidebar()
      }
    }
  }
})
</script>

<template>
  <div class="flex h-svh w-full">
    <AppSidebar :collapsed="sidebarCollapsed" />
    <main class="flex h-svh min-w-0 flex-1 flex-col bg-background">
      <header class="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <Button variant="ghost" size="icon-sm" title="Toggle sidebar (Ctrl/Cmd+B)" @click="toggleSidebar">
          <Icon name="PanelLeft" />
          <span class="sr-only">Toggle sidebar</span>
        </Button>
        <div class="flex flex-1 items-center justify-between">
          <h2 class="text-lg font-semibold">{{ pageTitle }}</h2>
          <div
            class="w-4 h-4 rounded-full"
            :class="connected ? 'bg-success' : 'bg-muted-foreground/50'"
            :title="connected ? 'Serial connected' : 'Not connected'"
          />
        </div>
      </header>
      <div class="flex flex-1 flex-col gap-4 min-h-0">
        <router-view />
      </div>
    </main>
  </div>
</template>
