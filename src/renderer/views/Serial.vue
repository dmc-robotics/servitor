<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, type SelectOption } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog } from '@/components/ui/dialog'
import Icon from '@/components/Icon.vue'
import SerialMonitor from '@/components/SerialMonitor.vue'
import SerialPlotter from '@/components/SerialPlotter.vue'
import { VALID_BAUD_RATES, DEFAULT_BAUD_RATE } from '../../shared/types/serial'

type SerialTab = 'monitor' | 'plotter'

const TABS: { value: SerialTab; label: string }[] = [
  { value: 'monitor', label: 'Monitor' },
  { value: 'plotter', label: 'Plotter' }
]

export default defineComponent({
  name: 'Serial',
  components: {
    Card,
    Button,
    Select,
    SerialMonitor,
    SerialPlotter,
    Textarea,
    Switch,
    Dialog,
    Icon
  },
  data() {
    return {
      selectedPort: '',
      selectedBaudRate: String(DEFAULT_BAUD_RATE),
      baudRateOptions: VALID_BAUD_RATES.map((rate) => ({
        value: String(rate),
        label: `${rate} baud`
      })) as SelectOption[],
      tabs: TABS,
      activeTab: 'monitor' as SerialTab,
      helpOpen: false,
      inputText: '',
      showRaw: false,
      isToggling: false,
      connectionError: ''
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
    },

    sortedPorts(): typeof this.availablePorts {
      const ARDUINO_VENDORS = new Set(['2341', '0403', '1a86', '10c4', '067b', '04d8', '1b4f'])
      const ARDUINO_MANUFACTURERS = /arduino|ftdi|silicon labs|wch|prolific|ch340|ch341|cp210/i
      const ARDUINO_PATH = /usbmodem|usbserial/i

      const isLikelyArduino = (port: (typeof this.availablePorts)[number]): boolean => {
        if (port.vendorId && ARDUINO_VENDORS.has(port.vendorId.toLowerCase())) return true
        if (port.manufacturer && ARDUINO_MANUFACTURERS.test(port.manufacturer)) return true
        if (ARDUINO_PATH.test(port.path)) return true
        return false
      }

      return [...this.availablePorts].sort((a, b) => {
        const aLikely = isLikelyArduino(a) ? 0 : 1
        const bLikely = isLikelyArduino(b) ? 0 : 1
        return aLikely - bLikely
      })
    },

    portOptions(): SelectOption[] {
      return this.sortedPorts.map((port) => ({
        value: port.path,
        label: port.manufacturer ? `${port.path} - ${port.manufacturer}` : port.path
      }))
    }
  },
  methods: {
    ...mapActions(useSerialStore, ['loadPorts', 'connect', 'disconnect', 'clearData', 'send', 'updateStatus']),

    async handleConnect(): Promise<void> {
      if (!this.selectedPort || this.isToggling) {
        return
      }

      this.isToggling = true
      this.connectionError = ''
      try {
        const success = await this.connect(this.selectedPort, Number(this.selectedBaudRate))
        if (!success) {
          this.connectionError = 'Failed to connect to serial port.'
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
    // Sync connection status from main process (handles app reload while connected)
    await this.updateStatus()

    await this.loadPorts()

    if (this.connected && this.port) {
      // Restore selection from active connection
      this.selectedPort = this.port
      this.selectedBaudRate = String(this.baudRate)
    } else {
      // Use store baud rate (set by project load) if available
      this.selectedBaudRate = String(this.baudRate)
      if (this.sortedPorts.length > 0) {
        this.selectedPort = this.sortedPorts[0].path
      }
    }
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full p-4">
    <!-- Connection Controls -->
    <Card>
      <div class="px-4 py-3">
        <div class="flex items-center gap-2">
          <!-- Refresh button -->
          <Button
            @click="loadPorts"
            size="icon"
            :disabled="connected"
            class="shrink-0"
          >
            <Icon name="RefreshCw" class="h-4 w-4" />
          </Button>

          <!-- Port selector -->
          <Select
            v-model="selectedPort"
            :options="portOptions"
            placeholder="Select a port"
            :disabled="connected"
            class="flex-1"
          />

          <!-- Baud rate selector -->
          <Select
            v-model="selectedBaudRate"
            :options="baudRateOptions"
            :disabled="connected"
            class="w-36"
          />

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
        <p v-if="connectionError" class="text-sm text-destructive mt-2">{{ connectionError }}</p>
      </div>
    </Card>

    <!-- Monitor/Plotter Tabs -->
    <Card class="flex-1 flex flex-col min-h-0">
      <div class="p-6 flex-1 flex flex-col min-h-0">
        <div class="flex-1 flex flex-col gap-2 min-h-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Tabs: the inactive view is unmounted (v-if below) -->
              <div class="inline-flex h-9 items-center rounded-lg bg-muted p-[3px] text-muted-foreground" role="tablist">
                <button
                  v-for="tab in tabs"
                  :key="tab.value"
                  type="button"
                  role="tab"
                  :aria-selected="activeTab === tab.value"
                  class="h-full w-24 rounded-md px-2 text-sm font-medium transition-colors"
                  :class="activeTab === tab.value ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'"
                  @click="activeTab = tab.value"
                >
                  {{ tab.label }}
                </button>
              </div>
              <div class="flex items-center gap-2">
                <Switch v-model="showRaw" />
                <span class="text-xs text-muted-foreground">Raw</span>
                <button
                  class="rounded-full text-primary hover:opacity-70 transition-opacity focus:outline-none"
                  title="Serial data protocol"
                  @click="helpOpen = true"
                >
                  <Icon name="CircleHelp" class="h-5 w-5" />
                </button>
                <Dialog
                  v-model:open="helpOpen"
                  title="Serial Data Protocol"
                  description="How to format data sent from your Arduino over serial."
                >
                    <div class="space-y-4 text-sm">
                      <section>
                        <h3 class="font-semibold mb-1">Key/Value Pairs</h3>
                        <p class="text-muted-foreground mb-2">Send named values separated by a colon. Multiple pairs can be sent on one line, separated by commas.</p>
                        <pre class="bg-muted rounded px-3 py-2 font-mono text-xs">temperature:23.4
rpm:1200,voltage:4.97</pre>
                      </section>
                      <section>
                        <h3 class="font-semibold mb-1">Plain Text</h3>
                        <p class="text-muted-foreground mb-2">Any line without a colon is treated as plain text and shown as-is in the monitor.</p>
                        <pre class="bg-muted rounded px-3 py-2 font-mono text-xs">Setup complete.
Loop started.</pre>
                      </section>
                      <section>
                        <h3 class="font-semibold mb-1">Plotter Values</h3>
                        <p class="text-muted-foreground mb-2">Key/value pairs are automatically graphed in the Plotter tab. Use consistent key names across lines to build traces.</p>
                        <pre class="bg-muted rounded px-3 py-2 font-mono text-xs">x:0.00,y:1.00
x:0.10,y:0.99
x:0.20,y:0.98</pre>
                      </section>
                      <section>
                        <h3 class="font-semibold mb-1">Arduino Example</h3>
                        <p class="text-muted-foreground mb-2">Send key/value pairs from your sketch using <span class="font-mono">Serial.print()</span>:</p>
                        <pre class="bg-muted rounded px-3 py-2 font-mono text-xs">void setup() {
  Serial.begin(9600);
  Serial.println("Setup complete.");
}

void loop() {
  float temp = readTemperature();
  int rpm  = readRPM();

  Serial.print("temperature:");
  Serial.print(temp);
  Serial.print(",rpm:");
  Serial.println(rpm);   // println ends the line

  delay(100);
}</pre>
                      </section>
                      <section>
                        <h3 class="font-semibold mb-1">Raw Mode</h3>
                        <p class="text-muted-foreground">Enable <span class="font-mono">Raw</span> to see all bytes as received, bypassing parsing.</p>
                      </section>
                    </div>
                </Dialog>
              </div>
            </div>
            <div class="flex gap-1">
              <Button
                @click="handleSave"
                size="icon"
                :disabled="messages.length === 0"
              >
                <Icon name="Save" class="h-4 w-4" />
              </Button>
              <Button
                @click="clearData"
                size="icon"
              >
                <Icon name="Trash2" class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div class="flex-1 min-h-0 flex flex-col">
            <SerialMonitor v-if="activeTab === 'monitor'" :show-raw="showRaw" />
            <SerialPlotter v-else />
          </div>
        </div>

        <!-- Send command - always visible regardless of active tab -->
        <div class="shrink-0 mt-4">
          <div class="relative">
            <Textarea
              v-model="inputText"
              placeholder="Send to device (Enter to send)"
              rows="3"
              :disabled="!connected"
              @keydown="handleKeyDown"
              class="font-mono text-sm pr-10"
            />
            <Button
              @click="sendMessage"
              :disabled="!connected || !inputText.trim()"
              size="icon-sm"
              class="absolute bottom-2 right-2"
            >
              <Icon name="ArrowUp" :stroke-width="3" class="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
