<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { ProjectData } from '../../../shared/types/dashboard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default defineComponent({
  name: 'EditProjectDialog',

  components: {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Input,
    Label,
    Textarea
  },

  props: {
    project: {
      type: Object as PropType<ProjectData | null>,
      default: null
    }
  },

  emits: ['close'],

  data() {
    return {
      title: '',
      description: '',
      submitting: false,
      error: ''
    }
  },

  computed: {
    open(): boolean {
      return this.project !== null
    },

    canSubmit(): boolean {
      return this.title.trim().length > 0
    }
  },

  watch: {
    project(val: ProjectData | null) {
      if (val) {
        this.title = val.config.title
        this.description = val.config.description
        this.error = ''
      }
    }
  },

  methods: {
    ...mapActions(useDashboardStore, ['updateProject']),

    async handleSubmit(): Promise<void> {
      if (!this.canSubmit || !this.project || this.submitting) return

      this.submitting = true
      this.error = ''

      try {
        const success = await this.updateProject(this.project.config.id, {
          title: this.title,
          description: this.description
        })
        if (success) {
          this.$emit('close')
        } else {
          this.error = 'Failed to update project.'
        }
      } finally {
        this.submitting = false
      }
    },

    handleClose(): void {
      this.$emit('close')
    }
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="(val) => !val && handleClose()">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Edit Project</DialogTitle>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Path (read-only) -->
        <div class="grid gap-1.5">
          <Label class="text-muted-foreground">Directory</Label>
          <p class="text-sm font-mono text-muted-foreground truncate">
            {{ project?.config.path }}
          </p>
        </div>

        <!-- Title -->
        <div class="grid gap-1.5">
          <Label for="edit-title">Name</Label>
          <Input id="edit-title" v-model="title" placeholder="My Arduino Project" />
        </div>

        <!-- Description -->
        <div class="grid gap-1.5">
          <Label for="edit-description">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="edit-description"
            v-model="description"
            placeholder="What does this project do?"
            rows="2"
          />
        </div>

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || submitting">
          {{ submitting ? 'Saving...' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
