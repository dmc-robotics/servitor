<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { ProjectData } from '../../shared/types/dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import ProjectCard from '@/components/ProjectCard.vue'
import AddProjectDialog from '@/components/AddProjectDialog.vue'
import EditProjectDialog from '@/components/EditProjectDialog.vue'
import OutputPanel from '@/components/OutputPanel.vue'
import { FolderOpen } from 'lucide-vue-next'

export default defineComponent({
  name: 'Projects',

  components: {
    Skeleton,
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
    ProjectCard,
    AddProjectDialog,
    EditProjectDialog,
    OutputPanel,
    FolderOpen
  },

  data() {
    return {
      editingProject: null as ProjectData | null,
      unsubscribeProjectChanged: null as (() => void) | null
    }
  },

  computed: {
    ...mapState(useDashboardStore, ['projects', 'loading', 'portScanErrors', 'configValidation'])
  },

  methods: {
    ...mapActions(useDashboardStore, ['loadProjects']),

    operationState(id: string) {
      return useDashboardStore().getOperationState(id)
    },

    handleEdit(project: ProjectData): void {
      this.editingProject = project
    },

    handleEditClose(): void {
      this.editingProject = null
    }
  },

  async mounted() {
    await this.loadProjects()

    const store = useDashboardStore()
    this.unsubscribeProjectChanged = window.dashboardAPI.onProjectChanged(
      (projectId, data) => store.handleProjectChanged(projectId, data)
    )
  },

  beforeUnmount() {
    this.unsubscribeProjectChanged?.()
  }
})
</script>

<template>
  <ResizablePanelGroup direction="vertical" class="h-full">
    <!-- Projects area -->
    <ResizablePanel :default-size="75" :min-size="30">
      <div class="h-full overflow-y-auto space-y-6 p-4">
        <!-- Header -->
        <div class="flex items-center justify-end">
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
            :config-valid="configValidation[project.config.id]?.valid"
            @edit="handleEdit"
          />
        </div>
      </div>
    </ResizablePanel>

    <!-- Drag handle -->
    <ResizableHandle />

    <!-- Output panel -->
    <ResizablePanel :default-size="25" :min-size="10">
      <OutputPanel />
    </ResizablePanel>

    <!-- Edit dialog (rendered outside panels to avoid layout issues) -->
    <EditProjectDialog
      :project="editingProject"
      @close="handleEditClose"
    />
  </ResizablePanelGroup>
</template>
