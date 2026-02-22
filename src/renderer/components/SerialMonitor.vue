<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import type { ParsedSerialData } from '@/utils/serial-parser'

export default defineComponent({
  name: 'SerialMonitor',
  props: {
    showRaw: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(useSerialStore, ['messages'])
  },
  methods: {
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
    }
  },
  watch: {
    // Pinia reactive arrays trigger watchers on push without deep watching
    'messages.length'() {
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
    }
  }
})
</script>

<template>
  <div class="border rounded-md p-4 bg-muted/30 flex-1 min-h-0 flex flex-col">
    <div
      ref="messageContainer"
      class="overflow-y-auto font-mono text-sm leading-6 flex-1 min-h-0"
    >
      <div v-if="messages.length === 0" class="text-muted-foreground italic">
        No messages yet. Connect to a serial port to start receiving data.
      </div>
      <div v-else-if="showRaw">
        <div v-for="message in messages" :key="message.id">{{ message.data }}</div>
      </div>
      <div v-else>
        <div v-for="message in messages" :key="message.id">
          <span class="text-muted-foreground">{{ formatTime(message.timestamp) }}</span>
          <span class="ml-2" :class="getMessageClass(message)">{{ message.data }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
