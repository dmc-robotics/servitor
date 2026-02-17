<template>
  <div class="serial">
    <h1>Serial Monitor</h1>
    <p>Serial communication interface will be implemented here</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Serial'
})
</script>

<style scoped>
.serial {
  padding: 2rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--foreground);
}

p {
  color: var(--muted-foreground);
}
</style>
