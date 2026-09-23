<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { CHART_CONFIG } from '@/constants/chart'
import {
  formatTick,
  linearScale,
  niceDomain,
  niceTicks,
  type ChartAccessor,
  type ChartSeries
} from '@/utils/chart'

/** Space around the plot area for tick labels and axis titles, in pixels */
const MARGIN = { top: 8, right: 12, bottom: 40, left: 60 }
/** Gap between the plot area and tick labels */
const TICK_LABEL_GAP = 8
/** Distance of the x axis title below the plot area */
const X_LABEL_OFFSET = 34
/** Distance of the y axis title from the left edge */
const Y_LABEL_OFFSET = 12

interface TickMark {
  value: number
  position: number
  label: string
}

interface SeriesPath {
  d: string
  color: string
}

/**
 * Multi-series line chart drawn as plain SVG.
 * Fills its container (the parent sets the size); redraws on resize.
 * Non-finite y values (e.g. `null`) break the line instead of being drawn through.
 */
export default defineComponent({
  name: 'LineChart',
  props: {
    data: {
      type: Array as PropType<unknown[]>,
      required: true
    },
    series: {
      type: Array as PropType<ChartSeries[]>,
      required: true
    },
    /** X value of each point. Defaults to the point's index */
    x: {
      type: Function as PropType<ChartAccessor>,
      default: (_d: unknown, i: number) => i
    },
    xLabel: {
      type: String,
      default: ''
    },
    yLabel: {
      type: String,
      default: ''
    },
    xNumTicks: {
      type: Number,
      default: CHART_CONFIG.X_AXIS_TICKS
    },
    yNumTicks: {
      type: Number,
      default: CHART_CONFIG.Y_AXIS_TICKS
    },
    lineWidth: {
      type: Number,
      default: CHART_CONFIG.LINE_WIDTH
    }
  },
  data() {
    return {
      width: 0,
      height: 0,
      resizeObserver: null as ResizeObserver | null,
      tickLabelGap: TICK_LABEL_GAP
    }
  },
  computed: {
    plotLeft(): number {
      return MARGIN.left
    },
    plotRight(): number {
      return Math.max(MARGIN.left, this.width - MARGIN.right)
    },
    plotTop(): number {
      return MARGIN.top
    },
    plotBottom(): number {
      return Math.max(MARGIN.top, this.height - MARGIN.bottom)
    },
    xValues(): number[] {
      return this.data.map((d, i) => this.x(d, i) ?? i)
    },
    xDomain(): [number, number] {
      if (this.xValues.length === 0) return [0, 1]
      const min = Math.min(...this.xValues)
      const max = Math.max(...this.xValues)
      return max > min ? [min, max] : [min - 1, max + 1]
    },
    yDomain(): [number, number] {
      let min = Infinity
      let max = -Infinity
      for (const s of this.series) {
        this.data.forEach((d, i) => {
          const value = s.y(d, i)
          if (!Number.isFinite(value)) return
          if (value < min) min = value
          if (value > max) max = value
        })
      }
      if (min === Infinity) return [0, 1]
      return niceDomain(min, max, this.yNumTicks)
    },
    xScale(): (value: number) => number {
      return linearScale(this.xDomain, [this.plotLeft, this.plotRight])
    },
    yScale(): (value: number) => number {
      return linearScale(this.yDomain, [this.plotBottom, this.plotTop])
    },
    xTicks(): TickMark[] {
      const ticks = niceTicks(this.xDomain[0], this.xDomain[1], this.xNumTicks)
      return ticks.values.map(value => ({
        value,
        position: this.xScale(value),
        label: formatTick(value, ticks.step)
      }))
    },
    yTicks(): TickMark[] {
      const ticks = niceTicks(this.yDomain[0], this.yDomain[1], this.yNumTicks)
      return ticks.values.map(value => ({
        value,
        position: this.yScale(value),
        label: formatTick(value, ticks.step)
      }))
    },
    paths(): SeriesPath[] {
      return this.series.map(s => {
        let d = ''
        let penDown = false
        this.data.forEach((point, i) => {
          const value = s.y(point, i)
          if (!Number.isFinite(value)) {
            // Gap: lift the pen so the next point starts a new segment
            penDown = false
            return
          }
          const command = penDown ? 'L' : 'M'
          d += `${command}${this.xScale(this.xValues[i]).toFixed(1)},${this.yScale(value).toFixed(1)}`
          penDown = true
        })
        return { d, color: s.color }
      })
    },
    plotCenterX(): number {
      return (this.plotLeft + this.plotRight) / 2
    },
    plotCenterY(): number {
      return (this.plotTop + this.plotBottom) / 2
    },
    xLabelY(): number {
      return this.plotBottom + X_LABEL_OFFSET
    },
    yLabelX(): number {
      return Y_LABEL_OFFSET
    }
  },
  mounted() {
    const root = this.$refs.root as HTMLElement
    this.width = root.clientWidth
    this.height = root.clientHeight
    this.resizeObserver = new ResizeObserver(entries => {
      this.width = entries[0].contentRect.width
      this.height = entries[0].contentRect.height
    })
    this.resizeObserver.observe(root)
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
  }
})
</script>

<template>
  <!-- relative + absolute svg: the svg's size never feeds back into the container's size -->
  <div ref="root" class="relative h-full w-full">
    <svg v-if="width > 0 && height > 0" :width="width" :height="height" class="absolute inset-0 block overflow-visible">
      <!-- Horizontal grid lines at each y tick -->
      <line
        v-for="tick in yTicks"
        :key="`grid-${tick.value}`"
        class="grid-line"
        :x1="plotLeft"
        :x2="plotRight"
        :y1="tick.position"
        :y2="tick.position"
      />

      <path
        v-for="(path, index) in paths"
        :key="`line-${index}`"
        :d="path.d"
        fill="none"
        :stroke="path.color"
        :stroke-width="lineWidth"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- Tick labels -->
      <text
        v-for="tick in yTicks"
        :key="`y-${tick.value}`"
        class="tick-label"
        :x="plotLeft - tickLabelGap"
        :y="tick.position"
        text-anchor="end"
        dominant-baseline="middle"
      >{{ tick.label }}</text>
      <text
        v-for="tick in xTicks"
        :key="`x-${tick.value}`"
        class="tick-label"
        :x="tick.position"
        :y="plotBottom + tickLabelGap"
        text-anchor="middle"
        dominant-baseline="hanging"
      >{{ tick.label }}</text>

      <!-- Axis titles -->
      <text
        v-if="xLabel"
        class="axis-label"
        :x="plotCenterX"
        :y="xLabelY"
        text-anchor="middle"
      >{{ xLabel }}</text>
      <text
        v-if="yLabel"
        class="axis-label"
        :transform="`translate(${yLabelX}, ${plotCenterY}) rotate(-90)`"
        text-anchor="middle"
        dominant-baseline="hanging"
      >{{ yLabel }}</text>
    </svg>
  </div>
</template>

<style scoped>
.grid-line {
  stroke: var(--border);
  stroke-width: 1px;
  shape-rendering: crispEdges;
}

.tick-label {
  fill: var(--muted-foreground);
  font-size: 12px;
}

.axis-label {
  fill: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}
</style>
