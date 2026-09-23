<script lang="ts">
import { defineComponent } from 'vue'

/**
 * Bordered surface for grouping content. Has no padding of its own —
 * sections inside set their own (e.g. `<div class="px-6 py-3">`).
 */
export default defineComponent({
  name: 'Card'
})
</script>

<template>
  <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
    <slot />
  </div>
</template>
