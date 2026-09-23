/**
 * Chart configuration constants
 * Used by `@/components/charts/LineChart.vue` and the serial plotter
 */

export const CHART_CONFIG = {
  /** Line stroke width in pixels */
  LINE_WIDTH: 2,
  /** Approximate number of ticks on the X axis */
  X_AXIS_TICKS: 6,
  /** Approximate number of ticks on the Y axis */
  Y_AXIS_TICKS: 8,
  /** Number of theme chart colors (`--chart-1` .. `--chart-5`), cycled per series */
  COLOR_COUNT: 5
} as const
