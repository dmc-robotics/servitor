<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import { VisXYContainer, VisLine, VisAxis } from '@unovis/vue'
import { CurveType } from '@unovis/ts'

interface PlotDataPoint {
  timestamp: number
  [key: string]: number | null
}

export default defineComponent({
  name: 'SerialPlotter',
  components: {
    VisXYContainer,
    VisLine,
    VisAxis
  },
  data() {
    return {
      containerHeight: 400,
      CurveType
    }
  },
  mounted() {
    this.updateHeight()
    window.addEventListener('resize', this.updateHeight)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateHeight)
  },
  computed: {
    ...mapState(useSerialStore, ['plotData', 'timestamps']),

    /**
     * Transform plot data into format for Unovis
     * Timestamps are normalized to elapsed seconds from the first data point
     */
    chartData(): PlotDataPoint[] {
      if (this.timestamps.length === 0) {
        return []
      }

      const t0 = this.timestamps[0]
      const data: PlotDataPoint[] = []

      for (let i = 0; i < this.timestamps.length; i++) {
        const point: PlotDataPoint = {
          timestamp: (this.timestamps[i] - t0) / 1000  // Elapsed seconds
        }

        // Add each data series value at this timestamp (preserving nulls)
        for (const key in this.plotData) {
          const value = this.plotData[key][i]
          point[key] = value !== undefined ? value : null
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
     * Update container height based on available space
     */
    updateHeight(): void {
      this.$nextTick(() => {
        const container = this.$el?.querySelector('.chart-container') as HTMLElement
        if (container) {
          const availableHeight = container.clientHeight
          this.containerHeight = Math.max(300, availableHeight - 20)
        }
      })
    },

    /**
     * Get color for data series (uses theme chart colors)
     */
    getSeriesColor(index: number): string {
      const ROYGBIV = [
        '#00cc44', // Green
        '#ff2200', // Red
        '#0088ff', // Blue
        '#ffee00', // Yellow
        '#9900cc', // Violet
        '#ff8800', // Orange
        '#4400cc', // Indigo
        '#ffffff'  // White
      ]
      return ROYGBIV[index % ROYGBIV.length]
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
    createYAccessor(key: string): (d: PlotDataPoint) => number | null {
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
      <div v-else class="h-full chart-container">
        <VisXYContainer
          :data="chartData"
          :height="containerHeight"
          :margin="{ top: 20, right: 20, bottom: 60, left: 60 }"
          :duration="0"
        >
          <VisLine
            v-for="(key, index) in dataKeys"
            :key="key"
            :x="x"
            :y="createYAccessor(key)"
            :color="getSeriesColor(index)"
            :lineWidth="2"
            :duration="0"
            :curveType="CurveType.Linear"
          />
          <VisAxis
            type="x"
            label="Elapsed time (s)"
            :numTicks="6"
            :gridLine="true"
          />
          <VisAxis
            type="y"
            label="Value"
            :numTicks="8"
            :gridLine="true"
          />
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
/* Theme-aware chart styling */
:deep(.unovis-xy-container) {
  --vis-color-main: var(--foreground);
  --vis-color-secondary: var(--muted-foreground);
  --vis-axis-grid-color: var(--border);
  --vis-axis-tick-color: var(--muted-foreground);
}

/* Axis styling */
:deep(.unovis-axis) {
  color: var(--muted-foreground);
  font-size: 12px;
}

/* Axis labels */
:deep(.unovis-axis-label) {
  fill: var(--foreground);
  font-size: 14px;
  font-weight: 500;
}

/* Grid lines */
:deep(.unovis-axis-grid line) {
  stroke: var(--border);
  stroke-opacity: 0.5;
}

/* Tick lines */
:deep(.unovis-axis-tick line) {
  stroke: var(--muted-foreground);
  stroke-opacity: 0.5;
}

/* Tick text */
:deep(.unovis-axis-tick text) {
  fill: var(--muted-foreground);
}
</style>
