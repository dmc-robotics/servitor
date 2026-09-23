<script lang="ts">
import { defineComponent } from 'vue'
import Icon from '@/components/Icon.vue'

/**
 * Modal dialog built on the native <dialog> element.
 * Controlled with `v-model:open` (or `:open` + `@update:open`). Closes on Esc,
 * backdrop click, or the X button. Native dialogs render in the top layer, so a
 * Dialog can be nested inside another (e.g. a delete confirmation).
 */
export default defineComponent({
  name: 'Dialog',
  components: {
    Icon
  },
  props: {
    open: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  },
  emits: ['update:open'],
  watch: {
    open(isOpen: boolean): void {
      this.sync(isOpen)
    }
  },
  mounted() {
    this.sync(this.open)
  },
  methods: {
    sync(isOpen: boolean): void {
      const dialog = this.$refs.dialog as HTMLDialogElement
      if (isOpen && !dialog.open) dialog.showModal()
      else if (!isOpen && dialog.open) dialog.close()
    },
    /** Fired for Esc and for close() calls; only report closes the parent didn't ask for */
    onClose(): void {
      if (this.open) this.$emit('update:open', false)
    },
    /** A click on the <dialog> element itself (not its content) is a backdrop click */
    onClick(event: MouseEvent): void {
      if (event.target === this.$refs.dialog) this.$emit('update:open', false)
    }
  }
})
</script>

<template>
  <!--
    m-auto restores native centering (the global reset in main.css zeroes margins).
    Backdrop uses a literal color: in Electron 28 (Chromium 120) ::backdrop does not
    inherit CSS variables, so `backdrop:bg-black/50` (which reads var(--color-black)) renders nothing.
  -->
  <dialog
    ref="dialog"
    class="m-auto w-full max-w-lg rounded-lg border bg-background p-0 text-foreground shadow-lg backdrop:bg-[rgb(0_0_0/0.5)]"
    @close="onClose"
    @click="onClick"
  >
    <div class="relative grid gap-4 p-6">
      <div class="flex flex-col gap-2 pr-6">
        <h2 class="text-lg leading-none font-semibold">{{ title }}</h2>
        <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
      </div>

      <slot />

      <div v-if="$slots.footer" class="flex items-center justify-end gap-2">
        <slot name="footer" />
      </div>

      <!-- Last in DOM order so showModal() focuses the first field, not this button -->
      <button
        type="button"
        class="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="$emit('update:open', false)"
      >
        <Icon name="X" class="size-4" />
        <span class="sr-only">Close</span>
      </button>
    </div>
  </dialog>
</template>
