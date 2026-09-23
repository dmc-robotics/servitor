/**
 * Chart helpers - scales and axis ticks for `@/components/charts/LineChart.vue`
 */

/** Reads a numeric value from a data point. `null` marks a gap in the line */
export type ChartAccessor<T = unknown> = (d: T, i: number) => number | null

/** One plotted line */
export interface ChartSeries<T = unknown> {
  /** Series name, shown in the legend */
  name: string
  y: ChartAccessor<T>
  /** Line color, e.g. `var(--chart-1)` */
  color: string
}

export interface Ticks {
  values: number[]
  step: number
}

/**
 * Rounds a raw step to 1, 2, 5 or 10 times a power of ten
 * (same thresholds d3 uses, so tick spacing looks familiar).
 */
function niceStep(span: number, count: number): number {
  const rawStep = span / Math.max(1, count)
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const ratio = rawStep / magnitude
  if (ratio >= Math.sqrt(50)) return 10 * magnitude
  if (ratio >= Math.sqrt(10)) return 5 * magnitude
  if (ratio >= Math.sqrt(2)) return 2 * magnitude
  return magnitude
}

/** About `count` evenly spaced, round-numbered ticks within [min, max] */
export function niceTicks(min: number, max: number, count: number): Ticks {
  if (!(max > min)) return { values: [min], step: 1 }
  const step = niceStep(max - min, count)
  const values: number[] = []
  const first = Math.ceil(min / step)
  const last = Math.floor(max / step)
  for (let i = first; i <= last; i++) {
    // Multiply rather than accumulate to avoid floating point drift
    values.push(i * step)
  }
  return { values, step }
}

/** Expands [min, max] outward to whole tick steps so the axis starts and ends on a tick */
export function niceDomain(min: number, max: number, count: number): [number, number] {
  if (!(max > min)) return [min - 1, max + 1]
  const step = niceStep(max - min, count)
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step]
}

/** Maps a value in `domain` linearly onto `range` */
export function linearScale(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0)
}

/** Formats a tick value with just enough decimals for the tick step */
export function formatTick(value: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  return value.toFixed(decimals)
}
