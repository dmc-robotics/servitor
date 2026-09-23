<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Icon from '@/components/Icon.vue'

export interface SelectOption {
  value: string
  label: string
}

/**
 * Native <select> with v-model, styled to match the other inputs.
 * Width is set by the parent (e.g. `class="w-48"`).
 */
export default defineComponent({
  name: 'Select',
  components: {
    Icon
  },
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    options: {
      type: Array as PropType<SelectOption[]>,
      required: true
    },
    placeholder: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  computed: {
    /** Everything except class goes to the <select> (id, disabled, aria-*, ...); class sizes the wrapper */
    selectAttrs(): Record<string, unknown> {
      const { class: _class, ...rest } = this.$attrs
      return rest
    }
  },
  methods: {
    onChange(event: Event): void {
      this.$emit('update:modelValue', (event.target as HTMLSelectElement).value)
    }
  }
})
</script>

<template>
  <div class="relative" :class="$attrs.class">
    <select
      v-bind="selectAttrs"
      :value="modelValue"
      class="h-9 w-full appearance-none truncate rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:[color-scheme:dark]"
      @change="onChange"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <Icon name="ChevronDown" class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
  </div>
</template>
