import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import AllTricks from './pages/AllTricks.vue'
import Learning from './pages/Learning.vue'
import Graph from './pages/Graph.vue'
import Sequences from './pages/Sequences.vue'
import Settings from './pages/Settings.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'all', component: AllTricks },
  { path: '/learning', name: 'learning', component: Learning },
  { path: '/graph', name: 'graph', component: Graph },
  { path: '/transitions', name: 'transitions', component: () => import('./pages/Transitions.vue') },
  { path: '/sequences', name: 'sequences', component: Sequences },
  { path: '/settings', name: 'settings', component: Settings },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
