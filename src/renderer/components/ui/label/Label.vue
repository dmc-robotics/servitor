<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Label'
})
</script>

<template>
  <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
    <slot />
  </label>
</template>
