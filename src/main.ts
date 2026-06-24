import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router, prefetchRoutes } from './router'
import { supabaseConfigured } from './storage/supabase'
import { migrateNonUuidIds } from './storage/migrateIds'
import { setupInstallPromptCapture } from './utils/installPrompt'
import './style.css'

function setupAppHeight(): void {
  if (typeof window === 'undefined') return
  const update = (): void => {
    document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`)
  }
  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', update)
  }
}

async function bootstrap(): Promise<void> {
  setupAppHeight()
  setupInstallPromptCapture()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)

  try {
    const report = await migrateNonUuidIds()
    const total = report.tricks + report.transitions + report.sequences + report.practice_log
    if (total > 0) console.log('[migrate] id→uuid', report)
  } catch (e) {
    console.warn('[migrate] failed', e)
  }

  app.mount('#app')

  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
  const schedule = (cb: () => void): void => {
    if (typeof idle === 'function') idle(cb)
    else window.setTimeout(cb, 50)
  }
  schedule(() => prefetchRoutes())

  if (supabaseConfigured()) {
    const initCloud = async (): Promise<void> => {
      const [{ useAuthStore }, sync] = await Promise.all([
        import('./stores/auth'),
        import('./storage/sync'),
      ])
      try {
        await useAuthStore().init()
      } catch (e) {
        console.warn('[auth] init failed', e)
      }
      try {
        await sync.runStartupSync()
      } catch (e) {
        console.warn('[sync] startup failed', e)
      }
      await sync.setupAutoFlush()
    }
    const params = new URLSearchParams(window.location.search)
    const isOAuthCallback = params.has('code') || params.has('error')
    if (isOAuthCallback) {
      void initCloud()
    } else {
      schedule(() => { void initCloud() })
    }
  }
}

void bootstrap()
