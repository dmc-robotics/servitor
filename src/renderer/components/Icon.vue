<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { ICONS, type IconName } from '@/constants/icons'

/**
 * Renders a 24x24 stroke icon from `@/constants/icons`.
 * Size and color come from the parent via class (e.g. `h-4 w-4 text-primary`).
 */
export default defineComponent({
  name: 'Icon',
  props: {
    name: {
      type: String as PropType<IconName>,
      required: true
    },
    strokeWidth: {
      type: [Number, String],
      default: 2
    }
  },
  computed: {
    markup(): string {
      return ICONS[this.name]
    }
  }
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="markup"
  />
</template>
