<template>
  <SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span class="text-xl font-bold">S</span>
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">Servitor</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton as-child>
                  <router-link to="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </router-link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton as-child>
                  <router-link to="/serial">
                    <Radio />
                    <span>Serial Monitor</span>
                  </router-link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton as-child>
                  <router-link to="/settings">
                    <Settings />
                    <span>Settings</span>
                  </router-link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
    <SidebarInset class="flex flex-col h-screen">
      <header class="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <div class="flex flex-1 items-center justify-between">
          <h2 class="text-lg font-semibold">{{ pageTitle }}</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">●</span>
          </div>
        </div>
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4 min-h-0">
        <router-view />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { LayoutDashboard, Radio, Settings } from 'lucide-vue-next'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'

export default defineComponent({
  name: 'Layout',
  components: {
    LayoutDashboard,
    Radio,
    Settings,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger
  },
  computed: {
    pageTitle(): string {
      const route = this.$route
      if (route.name === 'Dashboard') return 'Dashboard'
      if (route.name === 'Serial') return 'Serial Monitor'
      if (route.name === 'Settings') return 'Settings'
      return 'Servitor'
    }
  }
})
</script>

<style scoped>
/* Additional styles if needed */
</style>
