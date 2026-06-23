import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import AllTricks from './pages/AllTricks.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'all', component: AllTricks },
  { path: '/learning', name: 'learning', component: () => import('./pages/Learning.vue') },
  { path: '/graph', name: 'graph', component: () => import('./pages/Graph.vue') },
  { path: '/transitions', name: 'transitions', component: () => import('./pages/Transitions.vue') },
  { path: '/sequences', name: 'sequences', component: () => import('./pages/Sequences.vue') },
  { path: '/settings', name: 'settings', component: () => import('./pages/Settings.vue') },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
