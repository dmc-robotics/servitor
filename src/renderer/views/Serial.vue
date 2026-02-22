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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import SerialMonitor from '@/components/SerialMonitor.vue'
import SerialPlotter from '@/components/SerialPlotter.vue'
import { VALID_BAUD_RATES, DEFAULT_BAUD_RATE } from '../../shared/types/serial'
import { RefreshCw, Trash2, ArrowUp, Save, CircleHelp } from 'lucide-vue-next'

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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    RefreshCw,
    Trash2,
    ArrowUp,
    Save,
    CircleHelp
  },
  data() {
    return {
      selectedPort: '',
      selectedBaudRate: String(DEFAULT_BAUD_RATE),
      baudRates: [...VALID_BAUD_RATES],
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
    }
  },
  methods: {
    ...mapActions(useSerialStore, ['loadPorts', 'connect', 'disconnect', 'clearData', 'send']),

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
    const store = useSerialStore()
    await store.updateStatus()

    await this.loadPorts()

    if (this.connected && this.port) {
      // Restore selection from active connection
      this.selectedPort = this.port
      this.selectedBaudRate = String(this.baudRate)
    } else if (this.sortedPorts.length > 0) {
      // Pre-select first port (likely Arduino ports sorted to top)
      this.selectedPort = this.sortedPorts[0].path
    }
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full p-4">
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
                v-for="port in sortedPorts"
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
                :value="String(rate)"
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
        <p v-if="connectionError" class="text-sm text-destructive mt-2">{{ connectionError }}</p>
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
                <Dialog>
                  <DialogTrigger as-child>
                    <button class="rounded-full text-primary hover:opacity-70 transition-opacity focus:outline-none">
                      <CircleHelp class="h-5 w-5" :stroke-width="2" />
                    </button>
                  </DialogTrigger>
                  <DialogContent class="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Serial Data Protocol</DialogTitle>
                      <DialogDescription>
                        How to format data sent from your Arduino over serial.
                      </DialogDescription>
                    </DialogHeader>
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
                  </DialogContent>
                </Dialog>
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
              placeholder="Send to device (Enter to send)"
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
