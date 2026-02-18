<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import SerialMonitor from '@/components/SerialMonitor.vue'
import SerialPlotter from '@/components/SerialPlotter.vue'
import { VALID_BAUD_RATES, DEFAULT_BAUD_RATE } from '../../shared/types/serial'
import { RefreshCw, Trash2, ArrowUp, Save } from 'lucide-vue-next'

export default defineComponent({
  name: 'Serial',
  components: {
    Card,
    CardContent,
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    SerialMonitor,
    SerialPlotter,
    Textarea,
    Switch,
    RefreshCw,
    Trash2,
    ArrowUp,
    Save
  },
  data() {
    return {
      selectedPort: '',
      selectedBaudRate: DEFAULT_BAUD_RATE,
      baudRates: VALID_BAUD_RATES as unknown as number[],
      inputText: '',
      showRaw: false,
      isToggling: false
    }
  },
  computed: {
    ...mapState(useSerialStore, ['connected', 'port', 'baudRate', 'availablePorts', 'messages']),

    connectionStatus(): string {
      if (this.connected && this.port) {
        return `Connected to ${this.port} at ${this.baudRate} baud`
      }
      return 'Not connected'
    },

    canConnect(): boolean {
      return !this.connected && !!this.selectedPort
    }
  },
  methods: {
    ...mapActions(useSerialStore, ['loadPorts', 'connect', 'disconnect', 'clearData', 'send']),

    async handleConnect(): Promise<void> {
      if (!this.selectedPort || this.isToggling) {
        return
      }

      this.isToggling = true
      try {
        const success = await this.connect(this.selectedPort, this.selectedBaudRate)
        if (!success) {
          console.error('Failed to connect')
        }
      } finally {
        this.isToggling = false
      }
    },

    async handleDisconnect(): Promise<void> {
      if (this.isToggling) {
        return
      }

      this.isToggling = true
      try {
        await this.disconnect()
      } finally {
        this.isToggling = false
      }
    },

    handleSave(): void {
      const text = this.messages.map((m) => m.data).join('\n')
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const a = document.createElement('a')
      a.href = url
      a.download = `serial-${timestamp}.txt`
      a.click()
      URL.revokeObjectURL(url)
    },

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
    }
  },
  async mounted() {
    // Load available ports on mount
    await this.loadPorts()

    // Pre-select first port if available
    if (this.availablePorts.length > 0) {
      this.selectedPort = this.availablePorts[0].path
    }
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <!-- Connection Controls -->
    <Card>
      <CardContent class="px-4 py-3">
        <div class="flex items-center gap-2">
          <!-- Refresh button -->
          <Button
            @click="loadPorts"
            size="icon"
            :disabled="connected"
            class="shrink-0"
          >
            <RefreshCw class="h-4 w-4" />
          </Button>

          <!-- Port selector -->
          <Select v-model="selectedPort" :disabled="connected" class="flex-1">
            <SelectTrigger>
              <SelectValue placeholder="Select a port" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="port in availablePorts"
                :key="port.path"
                :value="port.path"
              >
                {{ port.path }}
                <span v-if="port.manufacturer" class="text-muted-foreground">
                  - {{ port.manufacturer }}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- Baud rate selector -->
          <Select v-model="selectedBaudRate" :disabled="connected" class="w-36">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="rate in baudRates"
                :key="rate"
                :value="rate"
              >
                {{ rate }} baud
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- Connection toggle -->
          <Button
            @click="connected ? handleDisconnect() : handleConnect()"
            :disabled="isToggling || (!connected && !selectedPort)"
            :variant="connected ? 'destructive' : 'default'"
            class="ml-auto"
          >
            {{ connected ? 'Disconnect' : 'Connect' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Monitor/Plotter Tabs -->
    <Card class="flex-1 flex flex-col min-h-0">
      <CardContent class="p-6 flex-1 flex flex-col min-h-0">
        <Tabs default-value="monitor" class="flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <TabsList class="grid grid-cols-2 max-w-[400px]">
                <TabsTrigger value="monitor">Monitor</TabsTrigger>
                <TabsTrigger value="plotter">Plotter</TabsTrigger>
              </TabsList>
              <div class="flex items-center gap-2">
                <Switch v-model="showRaw" />
                <span class="text-xs text-muted-foreground">Raw</span>
              </div>
            </div>
            <div class="flex gap-1">
              <Button
                @click="handleSave"
                size="icon"
                :disabled="messages.length === 0"
              >
                <Save class="h-4 w-4" />
              </Button>
              <Button
                @click="clearData"
                size="icon"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="monitor" class="flex-1 min-h-0 flex flex-col">
            <SerialMonitor :show-raw="showRaw" />
          </TabsContent>
          <TabsContent value="plotter" class="flex-1 min-h-0 flex flex-col">
            <SerialPlotter />
          </TabsContent>
        </Tabs>

        <!-- Send command - always visible regardless of active tab -->
        <div class="shrink-0 mt-4">
          <div class="relative">
            <Textarea
              v-model="inputText"
              placeholder=""
              rows="3"
              :disabled="!connected"
              @keydown="handleKeyDown"
              class="font-mono text-sm pr-10"
            />
            <Button
              @click="sendMessage"
              :disabled="!connected || !inputText.trim()"
              size="icon"
              class="absolute bottom-2 right-2 h-7 w-7"
            >
              <ArrowUp :stroke-width="3" class="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
