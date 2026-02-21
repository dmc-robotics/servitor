<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { ProjectData } from '../../shared/types/dashboard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  Hammer, Upload, RefreshCw, Pencil, Loader2,
  CheckCircle2, XCircle, AlertTriangle
} from 'lucide-vue-next'

type BadgeState = 'ok' | 'fail'

interface StatusBadgeConfig {
  label: string
  state: BadgeState
  reason: string
}

export default defineComponent({
  name: 'ProjectCard',

  components: {
    Card, CardContent, CardHeader,
    Button, Badge, Separator,
    HoverCard, HoverCardContent, HoverCardTrigger,
    Hammer, Upload, RefreshCw, Pencil, Loader2,
    CheckCircle2, XCircle, AlertTriangle
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
      return this.project.grotConfig?.port || 'not set'
    },

    baudDisplay(): string | number {
      return this.project.grotConfig?.baudRate ?? ''
    },

    // --- Status badges ---

    configBadgeState(): BadgeState {
      if (!this.project.hasGrotConfig) return 'fail'
      // undefined means validation hasn't completed yet — treat as ok until we know otherwise
      if (this.configValid === undefined) return 'ok'
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
          reason: this.portBadgeReason
        }
      ]
    },

    portBadgeState(): BadgeState {
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
    }
  }
})
</script>

<template>
  <Card class="flex flex-col">
    <!-- Zone 1: Identity -->
    <CardHeader class="pb-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-base font-semibold truncate">{{ project.config.title }}</h3>
          <p class="text-xs text-muted-foreground font-mono truncate mt-0.5" :title="project.config.path">
            {{ project.config.path }}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          class="shrink-0"
          @click="$emit('edit', project)"
          :disabled="isAnyBusy"
          title="Edit project"
        >
          <Pencil class="h-3.5 w-3.5" />
        </Button>
      </div>
      <p v-if="project.config.description" class="text-sm text-muted-foreground line-clamp-2 mt-1">
        {{ project.config.description }}
      </p>
    </CardHeader>

    <Separator />

    <!-- Zone 2: Config details + status badges -->
    <CardContent class="flex-1 py-3 space-y-3">
      <div v-if="project.grotConfig" class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div>
          <span class="text-muted-foreground">Board</span>
          <p class="font-medium">{{ boardName }}</p>
        </div>
        <div v-if="coreName">
          <span class="text-muted-foreground">Core</span>
          <p class="font-medium">{{ coreName }}</p>
        </div>
        <div>
          <span class="text-muted-foreground">Port</span>
          <p class="font-medium flex items-center gap-1">
            {{ portDisplay }}
            <Button
              variant="ghost"
              size="icon-sm"
              :disabled="isAnyBusy || !project.hasGrotConfig"
              @click="handleUpdatePort"
              title="Scan for Arduino and update port"
            >
              <Loader2 v-if="operationState.updatingPort" class="h-3 w-3 animate-spin" />
              <RefreshCw v-else class="h-3 w-3" />
            </Button>
          </p>
        </div>
        <div>
          <span class="text-muted-foreground">Baud</span>
          <p class="font-medium">{{ baudDisplay }}</p>
        </div>
        <div v-if="sketchDisplay">
          <span class="text-muted-foreground">Sketch</span>
          <p class="font-medium truncate" :title="sketchDisplay">{{ sketchDisplay }}</p>
        </div>
      </div>
      <div v-else class="text-xs text-muted-foreground">
        No configuration available
      </div>

      <!-- Status badge row -->
      <div class="flex items-center gap-2 pt-1">

        <!-- Directory not accessible: show warning instead of badges -->
        <template v-if="!project.directoryAccessible">
          <AlertTriangle class="h-3.5 w-3.5 text-destructive shrink-0" />
          <span class="text-xs text-destructive font-medium">Project files not found</span>
        </template>

        <!-- Badge row -->
        <template v-else>
          <template v-for="badge in statusBadges" :key="badge.label">
            <HoverCard v-if="badge.state === 'fail'" :open-delay="300">
              <HoverCardTrigger as-child>
                <Badge variant="danger" class="cursor-default gap-1 text-xs">
                  <XCircle class="h-3 w-3" />
                  {{ badge.label }}
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent class="w-64 text-xs">
                {{ badge.reason }}
              </HoverCardContent>
            </HoverCard>
            <Badge v-else variant="success" class="cursor-default gap-1 text-xs">
              <CheckCircle2 class="h-3 w-3" />
              {{ badge.label }}
            </Badge>
          </template>
        </template>
      </div>
    </CardContent>

    <Separator />

    <!-- Zone 3: Actions -->
    <CardContent class="py-3">
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          class="flex-1"
          :disabled="isAnyBusy || !project.hasGrotConfig"
          @click="handleBuild"
          title="Build with grot"
        >
          <Loader2 v-if="operationState.building" class="h-4 w-4 mr-1.5 animate-spin" />
          <Hammer v-else class="h-4 w-4 mr-1.5" />
          Build
        </Button>

        <Button
          size="sm"
          class="flex-1"
          :disabled="isAnyBusy || !project.hasGrotConfig"
          @click="handleLoad"
          title="Load onto board with grot"
        >
          <Loader2 v-if="operationState.loading" class="h-4 w-4 mr-1.5 animate-spin" />
          <Upload v-else class="h-4 w-4 mr-1.5" />
          Load
        </Button>

      </div>
    </CardContent>
  </Card>
</template>
