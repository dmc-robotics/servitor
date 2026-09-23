<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { useSerialStore } from '@/stores/serial'
import LineChart from '@/components/charts/LineChart.vue'
import { CHART_CONFIG } from '@/constants/chart'
import type { ChartSeries } from '@/utils/chart'

interface PlotDataPoint {
  /** Seconds since the oldest buffered sample */
  elapsed: number
  values: Record<string, number | null>
}

export default defineComponent({
  name: 'SerialPlotter',
  components: {
    LineChart
  },
  computed: {
    ...mapState(useSerialStore, ['plotData', 'timestamps']),

    /**
     * One point per buffered sample. Timestamps are normalized to elapsed
     * seconds from the first retained sample
     */
    chartData(): PlotDataPoint[] {
      if (this.timestamps.length === 0) {
        return []
      }

      const t0 = this.timestamps[0]
      return this.timestamps.map((timestamp, i) => {
        const values: Record<string, number | null> = {}
        for (const key of this.dataKeys) {
          values[key] = this.plotData[key][i] ?? null
        }
        return { elapsed: (timestamp - t0) / 1000, values }
      })
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

    /**
     * One line per data key, colored by cycling through the theme chart colors
     */
    series(): ChartSeries<PlotDataPoint>[] {
      return this.dataKeys.map((key, index) => ({
        name: key,
        y: (d: PlotDataPoint) => d.values[key],
        color: `var(--chart-${(index % CHART_CONFIG.COLOR_COUNT) + 1})`
      }))
    }
  },
  methods: {
    x(d: PlotDataPoint): number {
      return d.elapsed
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
        <div class="flex-1 min-h-0">
          <LineChart
            :data="chartData"
            :series="series"
            :x="x"
            x-label="Elapsed time (s)"
            y-label="Value"
          />
        </div>

        <!-- Legend -->
        <div class="flex shrink-0 flex-wrap gap-x-4 gap-y-1 pl-5 text-xs">
          <span v-for="s in series" :key="s.name" class="flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-3 rounded" :style="{ backgroundColor: s.color }" />
            {{ s.name }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
