<script lang="ts">
import { defineComponent } from 'vue'
import Icon from '@/components/Icon.vue'
import type { IconName } from '@/constants/icons'

interface NavigationItem {
  title: string
  url: string
  icon: IconName
}

/** Sidebar width when expanded / collapsed to icons */
const WIDTH_EXPANDED = '10rem'
const WIDTH_COLLAPSED = '3rem'

export default defineComponent({
  name: 'AppSidebar',
  components: {
    Icon
  },
  props: {
    collapsed: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      items: [
        { title: 'Projects', url: '/projects', icon: 'Blocks' },
        { title: 'Serial Monitor', url: '/serial', icon: 'Cable' },
        { title: 'Settings', url: '/settings', icon: 'Settings' }
      ] satisfies NavigationItem[]
    }
  },
  computed: {
    width(): string {
      return this.collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED
    }
  }
})
</script>

<template>
  <aside
    class="sticky top-0 flex h-svh shrink-0 flex-col overflow-hidden border-r bg-card text-card-foreground transition-[width] duration-200 ease-linear"
    :style="{ width }"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 p-2">
      <div class="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span class="text-xl font-bold">S</span>
      </div>
      <span class="truncate whitespace-nowrap text-sm font-semibold">Servitor</span>
    </div>

    <!-- Navigation -->
    <nav class="flex min-h-0 flex-1 flex-col p-2">
      <div
        class="flex h-8 shrink-0 items-center whitespace-nowrap px-2 text-xs font-medium text-muted-foreground transition-[margin,opacity] duration-200 ease-linear"
        :class="{ '-mt-8 opacity-0': collapsed }"
      >
        Application
      </div>
      <ul class="flex flex-col gap-1">
        <li v-for="item in items" :key="item.title">
          <router-link
            :to="item.url"
            :title="collapsed ? item.title : undefined"
            class="flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            active-class="bg-accent font-medium text-accent-foreground"
          >
            <Icon :name="item.icon" class="size-4 shrink-0" />
            <span class="truncate whitespace-nowrap">{{ item.title }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
  </aside>
</template>
