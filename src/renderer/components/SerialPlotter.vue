<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import { VisXYContainer, VisLine, VisAxis } from '@unovis/vue'

interface PlotDataPoint {
  timestamp: number
  [key: string]: number
}

export default defineComponent({
  name: 'SerialPlotter',
  components: {
    VisXYContainer,
    VisLine,
    VisAxis
  },
  computed: {
    ...mapState(useSerialStore, ['plotData', 'timestamps']),

    /**
     * Transform plot data into format for Unovis
     */
    chartData(): PlotDataPoint[] {
      if (this.timestamps.length === 0) {
        return []
      }

      // Create array of data points
      const data: PlotDataPoint[] = []

      for (let i = 0; i < this.timestamps.length; i++) {
        const point: PlotDataPoint = {
          timestamp: this.timestamps[i]
        }

        // Add each data series value at this timestamp
        for (const key in this.plotData) {
          point[key] = this.plotData[key][i] ?? 0
        }

        data.push(point)
      }

      return data
    },

    /**
     * Get list of data keys being plotted
     */
    dataKeys(): string[] {
      return Object.keys(this.plotData)
    },

    /**
     * Check if there's any data to plot
     */
    hasData(): boolean {
      return this.dataKeys.length > 0 && this.timestamps.length > 0
    }
  },
  methods: {
    /**
     * Get color for data series (uses theme chart colors)
     */
    getSeriesColor(index: number): string {
      const colors = [
        'var(--chart-1)',
        'var(--chart-2)',
        'var(--chart-3)',
        'var(--chart-4)',
        'var(--chart-5)'
      ]
      return colors[index % colors.length]
    },

    /**
     * X accessor for timestamp
     */
    x(d: PlotDataPoint): number {
      return d.timestamp
    },

    /**
     * Create Y accessor for a specific data key
     */
    createYAccessor(key: string): (d: PlotDataPoint) => number {
      return (d: PlotDataPoint) => d[key]
    }
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Chart area -->
    <div class="flex-1 border rounded-md p-4 bg-muted/30 min-h-0">
      <div v-if="!hasData" class="flex items-center justify-center h-full text-muted-foreground italic">
        No data to plot. Send numeric data in format: temp:25 or x:10,y:20,z:30
      </div>
      <div v-else class="h-full">
        <VisXYContainer
          :data="chartData"
          :height="400"
        >
          <VisLine
            v-for="(key, index) in dataKeys"
            :key="key"
            :x="x"
            :y="createYAccessor(key)"
            :color="getSeriesColor(index)"
          />
          <VisAxis type="x" label="Time" />
          <VisAxis type="y" label="Value" />
        </VisXYContainer>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="hasData" class="mt-4 flex flex-wrap gap-4">
      <div
        v-for="(key, index) in dataKeys"
        :key="key"
        class="flex items-center gap-2"
      >
        <div
          class="w-4 h-4 rounded"
          :style="{ backgroundColor: getSeriesColor(index) }"
        />
        <span class="text-sm font-medium">{{ key }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.unovis-xy-container) {
  --vis-color-main: var(--foreground);
  --vis-color-secondary: var(--muted-foreground);
  --vis-axis-grid-color: var(--border);
  --vis-axis-tick-color: var(--border);
}

:deep(.unovis-axis) {
  color: var(--muted-foreground);
}

:deep(.unovis-axis-label) {
  fill: var(--foreground);
}
</style>
