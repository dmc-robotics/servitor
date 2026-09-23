<script lang="ts">
import { defineComponent } from 'vue'

/**
 * Text input with v-model. Width is set by the parent (e.g. `class="w-48"`).
 */
export default defineComponent({
  name: 'Input',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    }
  },
  emits: ['update:modelValue'],
  methods: {
    onInput(event: Event): void {
      this.$emit('update:modelValue', (event.target as HTMLInputElement).value)
    }
  }
})
</script>

<template>
  <input
    :value="modelValue"
    class="h-9 min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
    @input="onInput"
  >
</template>
