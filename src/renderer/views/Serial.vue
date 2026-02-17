<script lang="ts">
import { defineComponent } from 'vue'
import { mapState, mapActions } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SerialMonitor from '@/components/SerialMonitor.vue'
import SerialPlotter from '@/components/SerialPlotter.vue'

export default defineComponent({
  name: 'Serial',
  components: {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
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
    SerialPlotter
  },
  data() {
    return {
      selectedPort: '',
      selectedBaudRate: 9600,
      baudRates: [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]
    }
  },
  computed: {
    ...mapState(useSerialStore, ['connected', 'port', 'baudRate', 'availablePorts']),

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
    ...mapActions(useSerialStore, ['loadPorts', 'connect', 'disconnect', 'clearData']),

    async handleRefresh(): Promise<void> {
      await this.loadPorts()
    },

    async handleConnect(): Promise<void> {
      if (!this.selectedPort) {
        return
      }

      const success = await this.connect(this.selectedPort, this.selectedBaudRate)
      if (!success) {
        // TODO: Show error toast
        console.error('Failed to connect')
      }
    },

    async handleDisconnect(): Promise<void> {
      await this.disconnect()
    },

    handleClear(): void {
      this.clearData()
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
      <CardHeader>
        <CardTitle>Connection</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-4 items-end">
          <!-- Port Selector -->
          <div class="flex-1 min-w-[200px]">
            <label class="text-sm font-medium mb-2 block">Serial Port</label>
            <Select v-model="selectedPort" :disabled="connected">
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
          </div>

          <!-- Baud Rate Selector -->
          <div class="w-[150px]">
            <label class="text-sm font-medium mb-2 block">Baud Rate</label>
            <Select v-model="selectedBaudRate" :disabled="connected">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="rate in baudRates"
                  :key="rate"
                  :value="rate"
                >
                  {{ rate }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <Button
              v-if="!connected"
              @click="handleConnect"
              :disabled="!canConnect"
            >
              Connect
            </Button>
            <Button
              v-else
              @click="handleDisconnect"
              variant="destructive"
            >
              Disconnect
            </Button>
            <Button
              @click="handleRefresh"
              variant="outline"
              :disabled="connected"
            >
              Refresh
            </Button>
            <Button
              @click="handleClear"
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </div>

        <!-- Status -->
        <div class="mt-4 flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full"
            :class="connected ? 'bg-green-500' : 'bg-gray-400'"
          />
          <span class="text-sm text-muted-foreground">{{ connectionStatus }}</span>
        </div>
      </CardContent>
    </Card>

    <!-- Monitor/Plotter Tabs -->
    <Card class="flex-1 flex flex-col min-h-0">
      <CardContent class="p-6 flex-1 flex flex-col min-h-0">
        <Tabs default-value="monitor" class="flex-1 flex flex-col min-h-0">
          <TabsList class="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="monitor">Monitor</TabsTrigger>
            <TabsTrigger value="plotter">Plotter</TabsTrigger>
          </TabsList>
          <TabsContent value="monitor" class="flex-1 min-h-0 flex flex-col">
            <SerialMonitor />
          </TabsContent>
          <TabsContent value="plotter" class="flex-1 min-h-0 flex flex-col">
            <SerialPlotter />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
</template>
