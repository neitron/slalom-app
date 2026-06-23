import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import AllTricks from './pages/AllTricks.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'all', component: AllTricks },
  { path: '/learning', name: 'learning', component: () => import('./pages/Learning.vue') },
  { path: '/graph', name: 'graph', component: () => import('./pages/Graph.vue') },
  { path: '/transitions', name: 'transitions', component: () => import('./pages/Transitions.vue') },
  { path: '/sequences', name: 'sequences', component: () => import('./pages/Sequences.vue') },
  { path: '/people', name: 'people', component: () => import('./pages/People.vue') },
  { path: '/u/:nickname', name: 'foreign-profile', component: () => import('./pages/ForeignProfile.vue') },
  { path: '/onboarding/nickname', name: 'nickname-onboarding', component: () => import('./pages/NicknameOnboarding.vue'), meta: { hideTabs: true } },
  { path: '/settings', name: 'settings', component: () => import('./pages/Settings.vue') },
  { path: '/install', name: 'install', component: () => import('./pages/Install.vue'), meta: { hideTabs: true } },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.afterEach(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})

export function prefetchRoutes(): void {
  for (const r of routes) {
    const c = r.component as unknown
    if (typeof c === 'function') {
      try { void (c as () => Promise<unknown>)() } catch { /* ignore */ }
    }
  }
}
