<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { ProjectData } from '../../shared/types/dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import ProjectCard from '@/components/ProjectCard.vue'
import AddProjectDialog from '@/components/AddProjectDialog.vue'
import EditProjectDialog from '@/components/EditProjectDialog.vue'
import OutputPanel from '@/components/OutputPanel.vue'
import { FolderOpen } from 'lucide-vue-next'

export default defineComponent({
  name: 'Dashboard',

  components: {
    Skeleton,
    ProjectCard,
    AddProjectDialog,
    EditProjectDialog,
    OutputPanel,
    FolderOpen
  },

  data() {
    return {
      editingProject: null as ProjectData | null
    }
  },

  computed: {
    ...mapState(useDashboardStore, ['projects', 'loading', 'portScanErrors']),

    operationState() {
      const store = useDashboardStore()
      return (id: string) => store.getOperationState(id)
    }
  },

  methods: {
    ...mapActions(useDashboardStore, ['loadProjects']),

    handleEdit(project: ProjectData): void {
      this.editingProject = project
    },

    handleEditClose(): void {
      this.editingProject = null
    }
  },

  async mounted() {
    await this.loadProjects()
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Scrollable content area -->
    <div class="flex-1 overflow-y-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Projects</h1>
        <AddProjectDialog />
      </div>

      <!-- Loading skeletons -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton v-for="n in 4" :key="n" class="h-48 rounded-lg" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="projects.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground"
      >
        <FolderOpen class="h-12 w-12 opacity-40" />
        <p class="text-lg">No projects yet</p>
        <p class="text-sm">Click "Add Project" to add an Arduino project directory.</p>
      </div>

      <!-- Project grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectCard
          v-for="project in projects"
          :key="project.config.id"
          :project="project"
          :operation-state="operationState(project.config.id)"
          :port-scan-error="portScanErrors[project.config.id]"
          @edit="handleEdit"
        />
      </div>
    </div>

    <!-- Output panel pinned to bottom -->
    <OutputPanel />

    <!-- Edit dialog (rendered outside grid to avoid layout issues) -->
    <EditProjectDialog
      :project="editingProject"
      @close="handleEditClose"
    />
  </div>
</template>
