<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { ProjectData } from '../../../shared/types/dashboard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Hammer, Upload, RefreshCw, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-vue-next'

export default defineComponent({
  name: 'ProjectCard',

  components: {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    Button,
    Hammer,
    Upload,
    RefreshCw,
    Pencil,
    Trash2,
    AlertTriangle,
    Loader2
  },

  props: {
    project: {
      type: Object as PropType<ProjectData>,
      required: true
    },
    operationState: {
      type: Object as PropType<{ building: boolean; loading: boolean; updatingPort: boolean }>,
      required: true
    }
  },

  emits: ['edit', 'remove'],

  computed: {
    id(): string {
      return this.project.config.id
    },

    isAnyBusy(): boolean {
      return this.operationState.building || this.operationState.loading || this.operationState.updatingPort
    },

    hasWarning(): boolean {
      return !this.project.hasInoFile || !this.project.hasGrotConfig
    },

    shortPath(): string {
      const path = this.project.config.path
      const parts = path.split('/')
      // Show last 2-3 segments
      return parts.slice(-2).join('/')
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
    <CardHeader class="pb-2">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <CardTitle class="text-base truncate">{{ project.config.title }}</CardTitle>
            <AlertTriangle
              v-if="hasWarning"
              class="h-4 w-4 text-yellow-500 shrink-0"
              title="Missing .ino or .grotconfig file"
            />
          </div>
          <CardDescription class="text-xs mt-0.5 truncate" :title="project.config.path">
            {{ shortPath }}
          </CardDescription>
        </div>
        <div class="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            @click="$emit('edit', project)"
            :disabled="isAnyBusy"
            title="Edit project"
          >
            <Pencil class="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 text-destructive hover:text-destructive"
            @click="$emit('remove', project)"
            :disabled="isAnyBusy"
            title="Remove project"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex-1 flex flex-col gap-3 pt-0">
      <!-- Description -->
      <p v-if="project.config.description" class="text-sm text-muted-foreground line-clamp-2">
        {{ project.config.description }}
      </p>

      <!-- Config info -->
      <div class="text-xs text-muted-foreground space-y-1">
        <div v-if="project.grotConfig" class="flex gap-4">
          <span>
            <span class="font-medium">Port:</span>
            {{ project.grotConfig.port || 'not set' }}
          </span>
          <span class="truncate">
            <span class="font-medium">Board:</span>
            {{ project.grotConfig.fqbn.split(':').slice(-1)[0] || project.grotConfig.fqbn }}
          </span>
        </div>
        <div v-if="!project.hasGrotConfig" class="text-yellow-600 dark:text-yellow-400">
          No .grotconfig found
        </div>
        <div v-if="!project.hasInoFile" class="text-yellow-600 dark:text-yellow-400">
          No .ino file found
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex gap-2 mt-auto pt-1">
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

        <Button
          size="sm"
          variant="secondary"
          :disabled="isAnyBusy || !project.hasGrotConfig"
          @click="handleUpdatePort"
          title="Scan for Arduino and update port in .grotconfig"
        >
          <Loader2 v-if="operationState.updatingPort" class="h-4 w-4 mr-1.5 animate-spin" />
          <RefreshCw v-else class="h-4 w-4 mr-1.5" />
          Update .grotconfig
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
