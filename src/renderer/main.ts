import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useThemeStore } from 'theminator'
import 'theminator/styles'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// Install Pinia first
app.use(pinia)

// Install router
app.use(router)

// Initialize theminator AFTER Pinia is installed
useThemeStore().initialize()

app.mount('#app')
