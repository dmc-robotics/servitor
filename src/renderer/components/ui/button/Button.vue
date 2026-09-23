<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

const BASE_CLASSES = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all shrink-0 outline-none active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
  outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
  link: 'text-primary underline-offset-4 hover:underline'
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  'default': 'h-9 px-4 py-2 text-sm has-[>svg]:px-3',
  'xs': 'h-6 gap-1 px-2 text-xs',
  'sm': 'h-8 gap-1.5 px-3 text-sm has-[>svg]:px-2.5',
  'lg': 'h-10 px-6 text-sm has-[>svg]:px-4',
  'icon': 'size-9 text-sm',
  'icon-xs': 'size-6 text-sm',
  'icon-sm': 'size-8 text-sm',
  'icon-lg': 'size-10 text-sm'
}

export default defineComponent({
  name: 'Button',
  props: {
    variant: {
      type: String as PropType<ButtonVariant>,
      default: 'default'
    },
    size: {
      type: String as PropType<ButtonSize>,
      default: 'default'
    }
  },
  computed: {
    classes(): string[] {
      return [BASE_CLASSES, VARIANT_CLASSES[this.variant], SIZE_CLASSES[this.size]]
    }
  }
})
</script>

<template>
  <button :class="classes">
    <slot />
  </button>
</template>
