<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p>Welcome to Servitor - Arduino Serial Monitor & Project Management</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Dashboard'
})
</script>

<style scoped>
.dashboard {
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
