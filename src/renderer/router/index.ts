import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// CRITICAL: Must use createWebHashHistory() for Electron compatibility
// NEVER change to createWebHistory() - will break in production builds

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/projects'
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('../views/Projects.vue')
  },
  {
    path: '/serial',
    name: 'Serial',
    component: () => import('../views/Serial.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(), // CRITICAL: Hash mode required for Electron
  routes
})

export default router
