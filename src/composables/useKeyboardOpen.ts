import { ref, type Ref } from 'vue'

let shared: Ref<boolean> | null = null

export function useKeyboardOpen(): Ref<boolean> {
  if (shared) return shared
  const state = ref(false)
  shared = state

  if (typeof window === 'undefined' || !('visualViewport' in window) || !window.visualViewport) {
    return state
  }

  const ua = window.navigator?.userAgent || ''
  const isIpad =
    (window.navigator.maxTouchPoints > 1 && /Mac/.test(ua)) || /iPad/.test(ua)
  const threshold = isIpad ? 250 : 60
  const vv = window.visualViewport

  let raf = 0
  const update = (): void => {
    raf = 0
    const diff = window.innerHeight - vv.height
    const next = diff > threshold
    if (state.value !== next) state.value = next
  }

  vv.addEventListener('resize', () => {
    if (raf) return
    raf = requestAnimationFrame(update)
  })

  return state
}
