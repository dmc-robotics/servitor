<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { mapActions, mapState } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { useSettingsStore } from '@/stores/settings'
import { ProjectData } from '../../shared/types/dashboard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ClickableBadge from '@/components/ClickableBadge.vue'
import Icon from '@/components/Icon.vue'

type BadgeState = 'ok' | 'fail' | 'pending'

interface StatusBadgeConfig {
  label: string
  state: BadgeState
  reason: string
  disabled?: boolean
}

export default defineComponent({
  name: 'ProjectCard',

  components: {
    Card, Button, ClickableBadge, Icon
  },

  props: {
    project: {
      type: Object as PropType<ProjectData>,
      required: true
    },
    operationState: {
      type: Object as PropType<{ building: boolean; loading: boolean; updatingPort: boolean }>,
      required: true
    },
    portScanError: {
      type: String as PropType<string | undefined>,
      default: undefined
    },
    configValid: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined
    }
  },

  emits: ['edit'],

  computed: {
    ...mapState(useSettingsStore, ['terminalApp', 'editorApp']),

    id(): string {
      return this.project.config.id
    },

    isAnyBusy(): boolean {
      return this.operationState.building || this.operationState.loading || this.operationState.updatingPort
    },

    boardName(): string {
      return this.project.grotConfig?.fqbn || ''
    },

    coreName(): string | null {
      return this.project.grotConfig?.targetCore || null
    },

    coreMemoryPercent(): string | null {
      const split = this.project.grotConfig?.flashSplit
      if (split == null) return null
      return `${Math.round(split * 100)}%`
    },

    coreDisplay(): string | null {
      if (!this.coreName) return null
      return this.coreMemoryPercent
        ? `${this.coreName} ${this.coreMemoryPercent}`
        : this.coreName
    },

    projectDirName(): string {
      const parts = this.project.config.path.replace(/\/+$/, '').split('/')
      return parts[parts.length - 1] || ''
    },

    expectedInoFile(): string {
      return `${this.projectDirName}.ino`
    },

    sketchDisplay(): string {
      if (!this.project.grotConfig?.sketchPath) return ''
      return `${this.project.grotConfig.sketchPath}/${this.expectedInoFile}`
    },

    portDisplay(): string {
      if (this.isTeensyBoard) return '--'
      return this.project.grotConfig?.port || 'not set'
    },

    baudDisplay(): string {
      const rate = this.project.grotConfig?.baudRate
      return rate != null ? String(rate) : 'not set'
    },

    // --- Status badges ---

    configBadgeState(): BadgeState {
      if (!this.project.hasGrotConfig) return 'fail'
      // undefined means validation hasn't completed yet — show neutral state
      if (this.configValid === undefined) return 'pending'
      return this.configValid ? 'ok' : 'fail'
    },

    configBadgeReason(): string {
      if (!this.project.hasGrotConfig) {
        return `No .grotconfig file found in "${this.projectDirName}".`
      }
      return 'Config failed validation. See output panel for details.'
    },

    statusBadges(): StatusBadgeConfig[] {
      return [
        {
          label: 'Config',
          state: this.configBadgeState,
          reason: this.configBadgeReason
        },
        {
          label: 'Sketch',
          state: this.project.hasInoFile ? 'ok' : 'fail',
          reason: `Expected "${this.expectedInoFile}" not found in project directory.`
        },
        {
          label: 'Port',
          state: this.portBadgeState,
          reason: this.portBadgeReason,
          disabled: this.isTeensyBoard
        }
      ]
    },

    isTeensyBoard(): boolean {
      return (this.project.grotConfig?.fqbn ?? '').toLowerCase().startsWith('teensy:')
    },

    portBadgeState(): BadgeState {
      if (this.isTeensyBoard) return 'pending'
      if (!this.project.grotConfig?.port) return 'fail'
      if (!this.project.portAvailable) return 'fail'
      return 'ok'
    },

    portBadgeReason(): string {
      if (this.portScanError) return this.portScanError
      if (!this.project.grotConfig?.port) {
        return 'No port configured. Use "Scan Port" to detect your Arduino.'
      }
      return `Port "${this.project.grotConfig.port}" is not currently connected.`
    }
  },

  methods: {
    ...mapActions(useDashboardStore, ['buildProject', 'loadToBoard', 'updatePort']),

    async handleBuild(): Promise<void> {
      await this.buildProject(this.id)
    },

    async handleLoad(): Promise<void> {
      await this.loadToBoard(this.id)
    },

    async handleUpdatePort(): Promise<void> {
      await this.updatePort(this.id)
    },

    openInTerminal(): void {
      window.appAPI.openInTerminal(this.project.config.path, this.terminalApp)
    },

    openFileInEditor(filePath: string): void {
      window.appAPI.openInEditor(filePath, this.editorApp)
    },

    handleBadgeClick(label: string): void {
      const path = this.project.config.path
      if (label === 'Config') {
        this.openFileInEditor(`${path}/.grotconfig`)
      } else if (label === 'Sketch') {
        this.openFileInEditor(`${path}/${this.expectedInoFile}`)
      } else if (label === 'Port') {
        this.handleUpdatePort()
      }
    }
  }
})
</script>

<template>
  <Card class="flex flex-col min-w-[280px]">
    <!-- Zone 1: Identity -->
    <div class="flex flex-col gap-y-1.5 px-6 pt-6 pb-3">
      <div class="min-w-0">
        <div class="flex items-center gap-1">
          <h3 class="text-base font-semibold truncate">{{ project.config.title }}</h3>
          <Button
            variant="ghost"
            size="icon-sm"
            class="shrink-0"
            @click="$emit('edit', project)"
            :disabled="isAnyBusy"
            title="Edit project"
          >
            <Icon name="Pencil" class="h-3.5 w-3.5" />
          </Button>
        </div>
        <button
          class="flex items-center text-xs text-muted-foreground font-mono mt-0.5 hover:text-foreground hover:underline cursor-pointer group w-full min-w-0 overflow-hidden"
          :title="`Open in terminal: ${project.config.path}`"
          @click="openInTerminal"
        >
          <span class="truncate">{{ project.config.path }}</span>
        </button>
      </div>
      <p v-if="project.config.description" class="text-sm text-muted-foreground line-clamp-2 mt-1">
        {{ project.config.description }}
      </p>
    </div>

    <div class="border-t" />

    <!-- Zone 2: Config details + status badges -->
    <div class="flex-1 px-6 py-3 space-y-3">
      <div v-if="project.grotConfig" class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div class="min-w-0">
          <span class="text-muted-foreground">Board</span>
          <p class="font-medium truncate" :title="boardName">{{ boardName }}</p>
        </div>
        <div v-if="coreDisplay" class="min-w-0">
          <span class="text-muted-foreground">Core</span>
          <p class="font-medium truncate" :title="coreDisplay">{{ coreDisplay }}</p>
        </div>
        <div class="min-w-0">
          <span class="text-muted-foreground">Port</span>
          <p class="font-medium truncate" :title="portDisplay">{{ portDisplay }}</p>
        </div>
        <div class="min-w-0">
          <span class="text-muted-foreground">Baud</span>
          <p class="font-medium truncate" :title="baudDisplay">{{ baudDisplay }}</p>
        </div>

      </div>
      <div v-else class="text-xs text-muted-foreground">
        No configuration available
      </div>

      <!-- Status badge row -->
      <div class="flex items-center gap-2 pt-1">

        <!-- Directory not accessible: show warning instead of badges -->
        <template v-if="!project.directoryAccessible">
          <Icon name="TriangleAlert" class="h-3.5 w-3.5 text-destructive shrink-0" />
          <span class="text-xs text-destructive font-medium">Project files not found</span>
        </template>

        <!-- Badge row -->
        <template v-else>
          <template v-for="badge in statusBadges" :key="badge.label">
            <!-- Disabled badge (e.g. Port on Teensy — no port needed) -->
            <ClickableBadge
              v-if="badge.disabled"
              variant="secondary"
              :disabled="true"
            >
              <Icon name="CircleCheck" class="h-3 w-3" />
              {{ badge.label }}
            </ClickableBadge>
            <!-- Failure reason shows as a native tooltip on hover -->
            <ClickableBadge
              v-else-if="badge.state === 'fail'"
              variant="danger"
              :title="badge.reason"
              :disabled="badge.label === 'Port' && operationState.updatingPort"
              @click="handleBadgeClick(badge.label)"
            >
              <Icon v-if="badge.label === 'Port' && operationState.updatingPort" name="LoaderCircle" class="h-3 w-3 animate-spin" />
              <Icon v-else name="CircleX" class="h-3 w-3" />
              {{ badge.label }}
            </ClickableBadge>
            <ClickableBadge
              v-else
              :variant="badge.state === 'pending' ? 'secondary' : 'success'"
              :disabled="badge.label === 'Port' && operationState.updatingPort"
              @click="handleBadgeClick(badge.label)"
            >
              <Icon v-if="badge.label === 'Port' && operationState.updatingPort" name="LoaderCircle" class="h-3 w-3 animate-spin" />
              <Icon v-else name="CircleCheck" class="h-3 w-3" />
              {{ badge.label }}
            </ClickableBadge>
          </template>
        </template>
      </div>
    </div>

    <div class="border-t" />

    <!-- Zone 3: Actions -->
    <div class="px-6 py-3">
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          class="flex-1"
          :disabled="isAnyBusy || !project.hasGrotConfig || !project.directoryAccessible"
          @click="handleBuild"
          title="Build with grot"
        >
          <Icon v-if="operationState.building" name="LoaderCircle" class="h-4 w-4 mr-1.5 animate-spin" />
          <Icon v-else name="Hammer" class="h-4 w-4 mr-1.5" />
          Build
        </Button>

        <Button
          size="sm"
          class="flex-1"
          :disabled="isAnyBusy || !project.hasGrotConfig || !project.directoryAccessible"
          @click="handleLoad"
          title="Load onto board with grot"
        >
          <Icon v-if="operationState.loading" name="LoaderCircle" class="h-4 w-4 mr-1.5 animate-spin" />
          <Icon v-else name="Upload" class="h-4 w-4 mr-1.5" />
          Load
        </Button>

      </div>
    </div>
  </Card>
</template>
