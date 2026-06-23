import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router, prefetchRoutes } from './router'
import { supabaseConfigured } from './storage/supabase'
import { migrateNonUuidIds } from './storage/migrateIds'
import { setupViewportInsetVar } from './utils/viewportInset'
import './style.css'

async function bootstrap(): Promise<void> {
  setupViewportInsetVar()

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
    schedule(() => { void initCloud() })
  }
}

void bootstrap()
