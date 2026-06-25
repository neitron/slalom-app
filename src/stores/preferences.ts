import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type RateDotStyle = 'dots' | 'slashes' | 'bars'

const STORAGE_KEY = 'slalom.prefs.v1'

type Persisted = {
  rateDotStyle?: RateDotStyle
}

function load(): Persisted {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Persisted
    return parsed ?? {}
  } catch {
    return {}
  }
}

function save(p: Persisted): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* quota / disabled — swallow */
  }
}

const VALID_STYLES: RateDotStyle[] = ['dots', 'slashes', 'bars']

function coerceStyle(value: unknown): RateDotStyle {
  return VALID_STYLES.includes(value as RateDotStyle) ? (value as RateDotStyle) : 'dots'
}

export const usePreferencesStore = defineStore('preferences', () => {
  const initial = load()
  const rateDotStyle = ref<RateDotStyle>(coerceStyle(initial.rateDotStyle))

  watch(rateDotStyle, (v) => {
    save({ rateDotStyle: v })
  })

  function setRateDotStyle(style: RateDotStyle): void {
    rateDotStyle.value = coerceStyle(style)
  }

  return {
    rateDotStyle,
    setRateDotStyle,
  }
})
