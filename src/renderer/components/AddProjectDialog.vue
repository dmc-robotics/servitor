<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CirclePlus, FolderOpen } from 'lucide-vue-next'

export default defineComponent({
  name: 'AddProjectDialog',

  components: {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
    Button,
    Input,
    Label,
    Textarea,
    CirclePlus,
    FolderOpen
  },

  data() {
    return {
      open: false,
      path: '',
      title: '',
      description: '',
      submitting: false,
      error: ''
    }
  },

  computed: {
    canSubmit(): boolean {
      return this.path.trim().length > 0 && this.title.trim().length > 0
    }
  },

  methods: {
    ...mapActions(useDashboardStore, ['addProject']),

    async handleBrowse(): Promise<void> {
      const result = await window.dashboardAPI.selectDirectory()
      if (result.success && result.data) {
        this.path = result.data
        // Auto-fill title from directory name if title is empty
        if (!this.title) {
          const parts = result.data.split('/')
          this.title = parts[parts.length - 1]
        }
      }
    },

    async handleSubmit(): Promise<void> {
      if (!this.canSubmit || this.submitting) return

      this.submitting = true
      this.error = ''

      try {
        const success = await this.addProject(this.path, this.title, this.description)
        if (success) {
          this.reset()
          this.open = false
        } else {
          this.error = 'Failed to add project. Check the directory path.'
        }
      } finally {
        this.submitting = false
      }
    },

    reset(): void {
      this.path = ''
      this.title = ''
      this.description = ''
      this.error = ''
    },

    handleOpenChange(val: boolean): void {
      this.open = val
      if (!val) this.reset()
    }
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogTrigger as-child>
      <Button @click="open = true">
        <CirclePlus class="h-4 w-4" />
        Add Project
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Add Arduino Project</DialogTitle>
        <DialogDescription class="sr-only">Add an Arduino project directory</DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Directory path -->
        <div class="grid gap-1.5">
          <Label for="project-path">Directory</Label>
          <div class="flex gap-2">
            <Input
              id="project-path"
              v-model="path"
              placeholder="/path/to/project"
              class="flex-1 font-mono text-sm"
            />
            <Button variant="outline" size="icon" @click="handleBrowse" title="Browse">
              <FolderOpen class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <!-- Title -->
        <div class="grid gap-1.5">
          <Label for="project-title">Name</Label>
          <Input
            id="project-title"
            v-model="title"
            placeholder="My Arduino Project"
          />
        </div>

        <!-- Description -->
        <div class="grid gap-1.5">
          <Label for="project-description">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="project-description"
            v-model="description"
            placeholder="What does this project do?"
            rows="2"
          />
        </div>

        <!-- Error message -->
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleOpenChange(false)">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || submitting">
          {{ submitting ? 'Adding...' : 'Add Project' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
