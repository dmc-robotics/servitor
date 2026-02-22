<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useDashboardStore, OutputLogEntry } from '@/stores/dashboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Terminal, ArrowUp, ArrowDown } from 'lucide-vue-next'
import { ansiToHtml } from '@/utils/grot-colorizer'

export default defineComponent({
  name: 'OutputPanel',

  components: {
    Button,
    Badge,
    Separator,
    ScrollArea,
    Trash2,
    Terminal,
    ArrowUp,
    ArrowDown
  },

  data() {
    return {
      currentEntryIndex: -1
    }
  },

  computed: {
    ...mapState(useDashboardStore, ['outputLog']),

    hasOutput(): boolean {
      return this.outputLog.length > 0
    }
  },

  watch: {
    // Pinia reactive arrays trigger watchers on push without deep watching
    'outputLog.length'() {
      const newIndex = this.outputLog.length - 1
      this.currentEntryIndex = newIndex
      if (newIndex >= 0) {
        this.$nextTick(() => {
          // Wait for browser to recalculate layout and scrollHeight
          requestAnimationFrame(() => {
            const el = this.$refs[`entry-${newIndex}`] as HTMLElement[] | HTMLElement | undefined
            const target = Array.isArray(el) ? el[0] : el
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          })
        })
      }
    }
  },

  methods: {
    ...mapActions(useDashboardStore, ['clearOutput']),

    formatTimestamp(ts: number): string {
      return new Date(ts).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      })
    },

    isSuccess(entry: OutputLogEntry): boolean {
      return entry.output.exitCode === 0
    },

    renderOutput(text: string): string {
      return ansiToHtml(text)
    },

    scrollToEntry(index: number): void {
      this.$nextTick(() => {
        const el = this.$refs[`entry-${index}`] as HTMLElement[] | HTMLElement | undefined
        const target = Array.isArray(el) ? el[0] : el
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },

    navigateUp(): void {
      if (this.currentEntryIndex > 0) {
        this.currentEntryIndex--
        this.scrollToEntry(this.currentEntryIndex)
      }
    },

    navigateDown(): void {
      if (this.currentEntryIndex < this.outputLog.length - 1) {
        this.currentEntryIndex++
        this.scrollToEntry(this.currentEntryIndex)
      }
    }
  }
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Panel header -->
    <div class="flex items-center justify-between px-4 py-2 border-t bg-background shrink-0">
      <div class="flex items-center gap-2">
        <Terminal class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm font-medium">Output</span>
        <Badge v-if="hasOutput" variant="secondary" class="text-[10px] px-1.5 py-0">
          {{ outputLog.length }}
        </Badge>
      </div>
      <div class="flex items-center gap-1">
        <Button
          v-if="hasOutput"
          variant="outline"
          size="icon-sm"
          :disabled="currentEntryIndex <= 0"
          @click="navigateUp"
          title="Previous entry"
        >
          <ArrowUp class="h-3.5 w-3.5" />
        </Button>
        <Button
          v-if="hasOutput"
          variant="outline"
          size="icon-sm"
          :disabled="currentEntryIndex >= outputLog.length - 1"
          @click="navigateDown"
          title="Next entry"
        >
          <ArrowDown class="h-3.5 w-3.5" />
        </Button>
        <Button
          v-if="hasOutput"
          variant="outline"
          size="icon-sm"
          @click="clearOutput"
          title="Clear output"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <!-- Output content -->
    <ScrollArea class="flex-1">
      <div class="p-4">
        <div v-if="!hasOutput" class="text-muted-foreground italic text-sm">
          No output yet. Run a build or load command.
        </div>

        <div v-for="(entry, index) in outputLog" :key="entry.id" :ref="`entry-${index}`">
          <Separator v-if="index > 0" class="my-3" />

          <div class="space-y-2">
            <!-- Entry header -->
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                :variant="isSuccess(entry) ? 'secondary' : 'danger'"
                class="uppercase text-[10px] px-1.5 py-0"
              >
                {{ entry.command }}
              </Badge>
              <span class="font-medium text-foreground">{{ entry.projectTitle }}</span>
              <span>{{ formatTimestamp(entry.timestamp) }}</span>
              <Badge
                :variant="isSuccess(entry) ? 'outline' : 'danger'"
                class="text-[10px] px-1.5 py-0"
              >
                exit {{ entry.output.exitCode }}
              </Badge>
            </div>

            <!-- stdout -->
            <div
              v-if="entry.output.stdout"
              class="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground/80"
              v-html="renderOutput(entry.output.stdout)"
            />

            <!-- stderr -->
            <div
              v-if="entry.output.stderr"
              class="rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap text-destructive"
              v-html="renderOutput(entry.output.stderr)"
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
