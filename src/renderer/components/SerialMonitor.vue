<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { ParsedSerialData } from '@/utils/serial-parser'

export default defineComponent({
  name: 'SerialMonitor',
  components: {
    Textarea,
    Button
  },
  data() {
    return {
      inputText: '',
      monitorHeight: 0
    }
  },
  mounted() {
    this.calculateMonitorHeight()
    window.addEventListener('resize', this.calculateMonitorHeight)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.calculateMonitorHeight)
  },
  computed: {
    ...mapState(useSerialStore, ['messages', 'connected'])
  },
  methods: {
    ...mapActions(useSerialStore, ['send']),

    handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },

    async sendMessage(): Promise<void> {
      if (!this.inputText.trim() || !this.connected) {
        return
      }

      const success = await this.send(this.inputText + '\n')
      if (success) {
        this.inputText = ''
      }
    },

    getMessageClass(message: ParsedSerialData): string {
      switch (message.type) {
        case 'error':
          return 'text-destructive'
        case 'warn':
          return 'text-yellow-600 dark:text-yellow-500'
        case 'info':
          return 'text-blue-600 dark:text-blue-400'
        case 'debug':
          return 'text-muted-foreground'
        case 'data':
          return 'text-foreground font-medium'
        default:
          return 'text-foreground'
      }
    },

    formatTime(timestamp: number): string {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      })
    },

    calculateMonitorHeight(): void {
      this.$nextTick(() => {
        const root = this.$el as HTMLElement
        const inputArea = root.querySelector('.shrink-0') as HTMLElement

        if (root && inputArea) {
          const LINE_HEIGHT = 24 // leading-6 is 24px
          const PADDING = 32 // p-4 is 16px top + 16px bottom
          const GAP = 16 // gap-4 is 16px
          const BORDER = 2 // border width

          // Total available height
          const totalHeight = root.clientHeight

          // Height used by input area
          const inputHeight = inputArea.clientHeight

          // Available height for monitor
          const availableHeight = totalHeight - inputHeight - GAP

          // Calculate usable height (excluding padding and border)
          const usableHeight = availableHeight - PADDING - BORDER

          // Round down to nearest multiple of line height
          const lines = Math.floor(usableHeight / LINE_HEIGHT)
          const snappedHeight = (lines * LINE_HEIGHT) + PADDING + BORDER

          this.monitorHeight = snappedHeight
        }
      })
    }
  },
  watch: {
    // Watch messages array with deep option to detect when items are added
    // Bug fix: Without deep watching, array mutations may not trigger the watcher
    messages: {
      handler() {
        // Auto-scroll to bottom when new messages arrive
        this.$nextTick(() => {
          // Wait for browser to recalculate layout and scrollHeight
          requestAnimationFrame(() => {
            const container = this.$refs.messageContainer as HTMLElement
            if (container) {
              container.scrollTop = container.scrollHeight
            }
          })
        })
      },
      deep: true
    }
  }
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Message display area - outer container with padding that stays visible -->
    <div
      :class="[
        'border rounded-md p-4 bg-muted/30',
        monitorHeight === 0 ? 'flex-1 min-h-0 flex flex-col' : ''
      ]"
      :style="monitorHeight > 0 ? { height: `${monitorHeight}px`, display: 'flex', flexDirection: 'column' } : {}"
    >
      <!-- Inner scrollable area -->
      <div
        ref="messageContainer"
        class="overflow-y-auto font-mono text-sm leading-6 flex-1 min-h-0"
      >
        <div v-if="messages.length === 0" class="text-muted-foreground italic">
          No messages yet. Connect to a serial port to start receiving data.
        </div>
        <div v-else>
          <div v-for="(message, index) in messages" :key="index">
            <span class="text-muted-foreground">{{ formatTime(message.timestamp) }}</span>
            <span class="ml-2" :class="getMessageClass(message)">{{ message.data }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area - stays at bottom, doesn't shrink -->
    <div class="shrink-0 space-y-2">
      <Textarea
        v-model="inputText"
        placeholder="Type message and press Enter to send (Shift+Enter for new line)"
        rows="3"
        :disabled="!connected"
        @keydown="handleKeyDown"
        class="font-mono text-sm"
      />
      <Button
        @click="sendMessage"
        :disabled="!connected || !inputText.trim()"
      >
        Send
      </Button>
    </div>
  </div>
</template>
