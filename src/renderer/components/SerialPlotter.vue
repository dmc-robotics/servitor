<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import { VisXYContainer, VisLine, VisAxis, VisBulletLegend } from '@unovis/vue'
import { CurveType, BulletShape } from '@unovis/ts'

interface PlotDataPoint {
  timestamp: number
  [key: string]: number | null
}

export default defineComponent({
  name: 'SerialPlotter',
  components: {
    VisXYContainer,
    VisLine,
    VisAxis,
    VisBulletLegend
  },
  data() {
    return {
      containerHeight: 400,
      containerWidth: 0,
      resizeObserver: null as ResizeObserver | null,
      resizeRAF: 0,
      CurveType
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.measureContainer()

      const container = this.$el?.querySelector('.chart-container') as HTMLElement
      if (container) {
        this.resizeObserver = new ResizeObserver(() => {
          this.measureContainer()
        })
        this.resizeObserver.observe(container)
      }

      window.addEventListener('resize', this.handleWindowResize)
    })
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
    window.removeEventListener('resize', this.handleWindowResize)
    cancelAnimationFrame(this.resizeRAF)
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
    },

    legendItems(): { name: string; color: string; shape: BulletShape }[] {
      return this.dataKeys.map((key, index) => ({
        name: key,
        color: this.getSeriesColor(index),
        shape: BulletShape.Line
      }))
    }
  },
  methods: {
    /**
     * Get color for data series from theme chart CSS variables
     */
    getSeriesColor(index: number): string {
      const CHART_COLOR_COUNT = 5
      const colorIndex = (index % CHART_COLOR_COUNT) + 1
      const cssVar = `--chart-${colorIndex}`
      return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || 'currentColor'
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
    },

    /**
     * On window resize, temporarily shrink the SVG to 1px so the flex layout
     * can reflow to the new window size, then re-measure the actual container.
     * This breaks the deadlock where the Unovis SVG's fixed pixel width attribute
     * prevents the container from reporting a smaller clientWidth on shrink.
     */
    handleWindowResize() {
      cancelAnimationFrame(this.resizeRAF)
      this.resizeRAF = requestAnimationFrame(() => {
        this.containerWidth = 1
        this.$nextTick(() => {
          this.measureContainer()
        })
      })
    },

    measureContainer() {
      const container = this.$el?.querySelector('.chart-container') as HTMLElement
      if (container) {
        this.containerWidth = container.clientWidth
        this.containerHeight = Math.max(300, container.clientHeight - 20)
      }
    }
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 border rounded-md p-4 bg-muted/30 min-h-0 flex flex-col gap-2">
      <div v-if="!hasData" class="flex items-center justify-center flex-1 text-muted-foreground italic">
        No data to plot. Send numeric data in format: temp:25 or x:10,y:20,z:30
      </div>
      <template v-else>
        <div class="flex-1 min-h-0 chart-container">
          <VisXYContainer
            :data="chartData"
            :width="containerWidth || undefined"
            :height="containerHeight"
            :margin="{ top: 20, right: 20, bottom: 0, left: 10 }"
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
        <VisBulletLegend :items="legendItems" class="shrink-0 pl-5" />
      </template>
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
