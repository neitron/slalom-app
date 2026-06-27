import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Tricks from './pages/Tricks.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./pages/Home.vue') },
  { path: '/tricks', name: 'tricks', component: Tricks },
  { path: '/tricks/library', name: 'tricks-library', component: Tricks, meta: { subTab: 'library' } },
  { path: '/learning', name: 'learning', component: () => import('./pages/Learning.vue') },
  { path: '/graph', name: 'graph', component: () => import('./pages/Graph.vue'), meta: { fullViewport: true } },
  { path: '/sequences', name: 'sequences', component: () => import('./pages/Sequences.vue') },
  { path: '/sequences/transitions', name: 'sequences-transitions', component: () => import('./pages/Sequences.vue'), meta: { subTab: 'transitions' } },
  { path: '/transitions', name: 'transitions-legacy', redirect: '/sequences/transitions' },
  { path: '/people', name: 'people', component: () => import('./pages/People.vue') },
  { path: '/u/:nickname', name: 'foreign-profile', component: () => import('./pages/ForeignProfile.vue') },
  { path: '/onboarding/nickname', name: 'nickname-onboarding', component: () => import('./pages/NicknameOnboarding.vue'), meta: { hideTabs: true } },
  { path: '/settings', name: 'settings', component: () => import('./pages/Settings.vue') },
  { path: '/diagnostics', name: 'diagnostics', component: () => import('./pages/Diagnostics.vue') },
  { path: '/install', name: 'install', component: () => import('./pages/Install.vue'), meta: { hideTabs: true } },
  ...(import.meta.env.DEV
    ? [
        {
          path: '/spec/tokens',
          name: 'spec-tokens',
          component: () => import('./pages/spec/Tokens.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/rate-options',
          name: 'spec-rate-options',
          component: () => import('./pages/spec/RateOptions.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/node-options',
          name: 'spec-node-options',
          component: () => import('./pages/spec/NodeOptions.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/edge-options',
          name: 'spec-edge-options',
          component: () => import('./pages/spec/EdgeOptions.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/selection-options',
          name: 'spec-selection-options',
          component: () => import('./pages/spec/SelectionOptions.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/icons',
          name: 'spec-icons',
          component: () => import('./pages/spec/IconsPreview.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/fab-options',
          name: 'spec-fab-options',
          component: () => import('./pages/spec/FabOptions.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/graph-mode-options',
          name: 'spec-graph-mode-options',
          component: () => import('./pages/spec/GraphModeOptions.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
      ]
    : []),
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
