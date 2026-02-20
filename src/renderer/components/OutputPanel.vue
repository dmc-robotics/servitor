<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useDashboardStore, OutputLogEntry } from '@/stores/dashboard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, ChevronDown, ChevronUp, Terminal } from 'lucide-vue-next'
import { ansiToHtml } from '@/utils/grot-colorizer'

export default defineComponent({
  name: 'OutputPanel',

  components: {
    Card,
    Button,
    Badge,
    Separator,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    ScrollArea,
    Trash2,
    ChevronDown,
    ChevronUp,
    Terminal
  },

  computed: {
    ...mapState(useDashboardStore, ['outputLog', 'outputPanelOpen']),

    hasOutput(): boolean {
      return this.outputLog.length > 0
    }
  },

  watch: {
    outputLog: {
      handler() {
        if (this.outputPanelOpen) {
          this.$nextTick(() => {
            const viewport = this.$el?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | undefined
            if (viewport) viewport.scrollTop = viewport.scrollHeight
          })
        }
      },
      deep: true
    }
  },

  methods: {
    ...mapActions(useDashboardStore, ['clearOutput', 'toggleOutputPanel']),

    formatTimestamp(ts: number): string {
      return new Date(ts).toLocaleTimeString()
    },

    isSuccess(entry: OutputLogEntry): boolean {
      return entry.output.exitCode === 0
    },

    renderOutput(text: string): string {
      return ansiToHtml(text)
    }
  }
})
</script>

<template>
  <Card class="overflow-hidden">
    <Collapsible :open="outputPanelOpen">
      <!-- Panel header -->
      <CollapsibleTrigger as-child>
        <div
          class="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/50 transition-colors"
          @click="toggleOutputPanel"
        >
          <div class="flex items-center gap-2">
            <Terminal class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm font-medium">Output</span>
            <Badge v-if="hasOutput" variant="secondary" class="text-[10px] px-1.5 py-0">
              {{ outputLog.length }}
            </Badge>
          </div>
          <div class="flex items-center gap-1">
            <Button
              v-if="hasOutput && outputPanelOpen"
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              @click.stop="clearOutput"
              title="Clear output"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
            <ChevronUp v-if="outputPanelOpen" class="h-4 w-4 text-muted-foreground" />
            <ChevronDown v-else class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CollapsibleTrigger>

      <!-- Output content -->
      <CollapsibleContent>
        <Separator />
        <ScrollArea class="h-56">
          <div class="p-4">
            <div v-if="!hasOutput" class="text-muted-foreground italic text-sm">
              No output yet. Run a build or load command.
            </div>

            <div v-for="(entry, index) in outputLog" :key="entry.id">
              <Separator v-if="index > 0" class="my-3" />

              <div class="space-y-2">
                <!-- Entry header -->
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    :variant="isSuccess(entry) ? 'secondary' : 'destructive'"
                    class="uppercase text-[10px] px-1.5 py-0"
                  >
                    {{ entry.command }}
                  </Badge>
                  <span class="font-medium text-foreground">{{ entry.projectTitle }}</span>
                  <span>{{ formatTimestamp(entry.timestamp) }}</span>
                  <Badge
                    :variant="isSuccess(entry) ? 'outline' : 'destructive'"
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
      </CollapsibleContent>
    </Collapsible>
  </Card>
</template>
