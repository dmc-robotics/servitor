<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import {
  BADGE_BASE_CLASSES,
  BADGE_VARIANT_CLASSES,
  BADGE_SIZE_CLASSES,
  type BadgeVariant,
  type BadgeSize
} from './variants'

export default defineComponent({
  name: 'Badge',
  props: {
    variant: {
      type: String as PropType<BadgeVariant>,
      default: 'default'
    },
    size: {
      type: String as PropType<BadgeSize>,
      default: 'default'
    }
  },
  computed: {
    classes(): string[] {
      return [BADGE_BASE_CLASSES, BADGE_VARIANT_CLASSES[this.variant], BADGE_SIZE_CLASSES[this.size]]
    }
  }
})
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
