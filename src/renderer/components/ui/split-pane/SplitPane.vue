<script lang="ts">
import { defineComponent } from 'vue'

/**
 * Vertical two-pane split with a draggable divider.
 * Sizes are percentages of the container height. Content goes in the `top` and `bottom` slots.
 */
export default defineComponent({
  name: 'SplitPane',
  props: {
    /** Initial top pane height (%) */
    defaultSize: {
      type: Number,
      default: 50
    },
    /** Minimum top pane height (%) */
    minTop: {
      type: Number,
      default: 10
    },
    /** Minimum bottom pane height (%) */
    minBottom: {
      type: Number,
      default: 10
    }
  },
  data() {
    return {
      topSize: this.defaultSize,
      dragging: false
    }
  },
  methods: {
    onPointerDown(event: PointerEvent): void {
      // Capture keeps move/up events coming to the handle even when the pointer leaves it
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      this.dragging = true
    },
    onPointerMove(event: PointerEvent): void {
      if (!this.dragging) return
      const rect = (this.$refs.container as HTMLElement).getBoundingClientRect()
      const percent = ((event.clientY - rect.top) / rect.height) * 100
      this.topSize = Math.min(100 - this.minBottom, Math.max(this.minTop, percent))
    },
    onPointerUp(event: PointerEvent): void {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
      this.dragging = false
    }
  }
})
</script>

<template>
  <div ref="container" class="flex h-full flex-col" :class="{ 'select-none': dragging }">
    <div class="min-h-0 overflow-hidden" :style="{ height: topSize + '%' }">
      <slot name="top" />
    </div>

    <!-- Divider: 1px line with a taller invisible hit area -->
    <div
      class="relative h-px shrink-0 cursor-row-resize bg-border after:absolute after:inset-x-0 after:-top-1 after:-bottom-1"
      role="separator"
      aria-orientation="horizontal"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    />

    <div class="min-h-0 flex-1 overflow-hidden">
      <slot name="bottom" />
    </div>
  </div>
</template>
