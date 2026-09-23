<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { ProjectData } from '../../shared/types/dashboard'
import { SplitPane } from '@/components/ui/split-pane'
import Icon from '@/components/Icon.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import AddProjectDialog from '@/components/AddProjectDialog.vue'
import EditProjectDialog from '@/components/EditProjectDialog.vue'
import OutputPanel from '@/components/OutputPanel.vue'

/** Initial / minimum height (%) of the projects area; the output panel gets the rest */
const PROJECTS_PANE_SIZE = 75
const PROJECTS_PANE_MIN = 30
const OUTPUT_PANE_MIN = 10

export default defineComponent({
  name: 'Projects',

  components: {
    SplitPane,
    Icon,
    ProjectCard,
    AddProjectDialog,
    EditProjectDialog,
    OutputPanel
  },

  data() {
    return {
      PROJECTS_PANE_SIZE,
      PROJECTS_PANE_MIN,
      OUTPUT_PANE_MIN,
      editingProject: null as ProjectData | null,
      unsubscribeProjectChanged: null as (() => void) | null
    }
  },

  computed: {
    ...mapState(useDashboardStore, ['projects', 'loading', 'portScanErrors', 'configValidation', 'getOperationState'])
  },

  methods: {
    ...mapActions(useDashboardStore, ['loadProjects', 'handleProjectChanged']),

    handleEdit(project: ProjectData): void {
      this.editingProject = project
    },

    handleEditClose(): void {
      this.editingProject = null
    }
  },

  async mounted() {
    await this.loadProjects()

    this.unsubscribeProjectChanged = window.dashboardAPI.onProjectChanged(
      (projectId, data) => this.handleProjectChanged(projectId, data)
    )
  },

  beforeUnmount() {
    this.unsubscribeProjectChanged?.()
  }
})
</script>

<template>
  <SplitPane
    :default-size="PROJECTS_PANE_SIZE"
    :min-top="PROJECTS_PANE_MIN"
    :min-bottom="OUTPUT_PANE_MIN"
  >
    <!-- Projects area -->
    <template #top>
      <div class="h-full overflow-y-auto space-y-6 p-4">
        <!-- Header -->
        <div class="flex items-center justify-end">
          <AddProjectDialog />
        </div>

        <!-- Loading skeletons -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="n in 4" :key="n" class="h-48 animate-pulse rounded-lg bg-muted" />
        </div>

        <!-- Empty state -->
        <div
          v-else-if="projects.length === 0"
          class="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground"
        >
          <Icon name="FolderOpen" class="h-12 w-12 opacity-40" />
          <p class="text-lg">No projects yet</p>
          <p class="text-sm">Click "Add Project" to add an Arduino project directory.</p>
        </div>

        <!-- Project grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProjectCard
            v-for="project in projects"
            :key="project.config.id"
            :project="project"
            :operation-state="getOperationState(project.config.id)"
            :port-scan-error="portScanErrors[project.config.id]"
            :config-valid="configValidation[project.config.id]?.valid"
            @edit="handleEdit"
          />
        </div>
      </div>
    </template>

    <!-- Output panel -->
    <template #bottom>
      <OutputPanel />
    </template>
  </SplitPane>

  <!-- Native <dialog> renders in the top layer, so placement in the tree doesn't matter -->
  <EditProjectDialog
    :project="editingProject"
    @close="handleEditClose"
  />
</template>
