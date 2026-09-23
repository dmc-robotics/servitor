<script lang="ts">
import { defineComponent, PropType } from 'vue'
import {
  BADGE_BASE_CLASSES,
  BADGE_VARIANT_CLASSES,
  BADGE_SIZE_CLASSES,
  type BadgeVariant
} from '@/components/ui/badge'

export default defineComponent({
  name: 'ClickableBadge',

  props: {
    variant: {
      type: String as PropType<BadgeVariant>,
      default: 'default'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  emits: ['click'],

  computed: {
    classes(): string[] {
      return [
        BADGE_BASE_CLASSES,
        BADGE_VARIANT_CLASSES[this.variant],
        BADGE_SIZE_CLASSES.default,
        this.disabled ? 'cursor-default opacity-60' : 'cursor-pointer active:scale-95'
      ]
    }
  }
})
</script>

<template>
  <button
    type="button"
    :class="classes"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
