<script lang="ts">
import { defineComponent } from 'vue'

/**
 * Multi-line text input with v-model. Width is set by the parent.
 */
export default defineComponent({
  name: 'Textarea',
  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  methods: {
    onInput(event: Event): void {
      this.$emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
    }
  }
})
</script>

<template>
  <textarea
    :value="modelValue"
    class="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
    @input="onInput"
  />
</template>
