import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { supabaseConfigured } from './storage/supabase'
import { runStartupSync, setupAutoFlush } from './storage/sync'
import { migrateNonUuidIds } from './storage/migrateIds'
import { useAuthStore } from './stores/auth'
import './style.css'

async function bootstrap(): Promise<void> {
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

  if (supabaseConfigured()) {
    try {
      await useAuthStore().init()
    } catch (e) {
      console.warn('[auth] init failed', e)
    }
    try {
      await runStartupSync()
    } catch (e) {
      console.warn('[sync] startup failed', e)
    }
    setupAutoFlush()
  }

  app.mount('#app')
}

void bootstrap()
