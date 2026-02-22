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
    meta: { title: 'Projects' },
    component: () => import('../views/Projects.vue')
  },
  {
    path: '/serial',
    name: 'Serial',
    meta: { title: 'Serial Monitor' },
    component: () => import('../views/Serial.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    meta: { title: 'Settings' },
    component: () => import('../views/Settings.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/projects'
  }
]

const router = createRouter({
  history: createWebHashHistory(), // CRITICAL: Hash mode required for Electron
  routes
})

export default router
