<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { ProjectData } from '../../shared/types/dashboard'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Icon from '@/components/Icon.vue'

export default defineComponent({
  name: 'EditProjectDialog',

  components: {
    Dialog,
    Button,
    Input,
    Label,
    Textarea,
    Icon
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
      removing: false,
      confirmRemoveOpen: false,
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
    ...mapActions(useDashboardStore, ['updateProject', 'removeProject']),

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
    },

    async handleRemove(): Promise<void> {
      if (!this.project || this.removing) return

      this.confirmRemoveOpen = false
      this.removing = true
      try {
        const success = await this.removeProject(this.project.config.id)
        if (success) {
          this.$emit('close')
        } else {
          this.error = 'Failed to remove project.'
        }
      } finally {
        this.removing = false
      }
    }
  }
})
</script>

<template>
  <Dialog :open="open" title="Edit Project" @update:open="(val) => !val && handleClose()">
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

    <template #footer>
      <!-- mr-auto pushes Remove left, Cancel/Save right. `!` overrides the ghost variant's hover color -->
      <Button
        variant="ghost"
        class="mr-auto text-destructive hover:text-destructive!"
        :disabled="removing || submitting"
        @click="confirmRemoveOpen = true"
      >
        <Icon name="Trash2" class="h-4 w-4 mr-1.5" />
        {{ removing ? 'Removing...' : 'Remove' }}
      </Button>
      <Button variant="outline" @click="handleClose">Cancel</Button>
      <Button @click="handleSubmit" :disabled="!canSubmit || submitting">
        {{ submitting ? 'Saving...' : 'Save' }}
      </Button>
    </template>

    <!-- Remove confirmation (nested native dialog stacks above this one) -->
    <Dialog
      v-model:open="confirmRemoveOpen"
      title="Remove project?"
      :description="`This will remove &quot;${project?.config.title}&quot; from the list. Files on disk will not be deleted.`"
    >
      <template #footer>
        <Button variant="outline" @click="confirmRemoveOpen = false">Cancel</Button>
        <Button variant="destructive" @click="handleRemove">Remove</Button>
      </template>
    </Dialog>
  </Dialog>
</template>
