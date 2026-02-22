<script lang="ts">
import { defineComponent, PropType } from 'vue'
import type { HTMLAttributes } from 'vue'
import type { BadgeVariants } from '@/components/ui/badge'
import { badgeVariants } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default defineComponent({
  name: 'ClickableBadge',

  props: {
    variant: {
      type: String as PropType<BadgeVariants['variant']>,
      default: 'default'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    class: {
      type: String as PropType<HTMLAttributes['class']>,
      default: undefined
    }
  },

  emits: ['click'],

  computed: {
    classes(): string {
      return cn(
        badgeVariants({ variant: this.variant }),
        this.disabled ? 'cursor-default opacity-60' : 'cursor-pointer active:scale-95',
        this.class
      )
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
