import { getCurrentScope, onScopeDispose, ref, type Ref } from 'vue'

export interface UseScrollDirectionOptions {
  target?: Window | (EventTarget & { scrollY: number })
  threshold?: number
}

export interface UseScrollDirection {
  hidden: Ref<boolean>
  stop: () => void
}

export function useScrollDirection(opts: UseScrollDirectionOptions = {}): UseScrollDirection {
  const target = opts.target ?? (typeof window !== 'undefined' ? window : undefined)
  const threshold = opts.threshold ?? 8
  const hidden = ref(false)
  let anchor = 0
  let lastDir: 'down' | 'up' | 'idle' = 'idle'

  function onScroll() {
    if (!target) return
    const y = (target as { scrollY: number }).scrollY
    if (y < threshold) {
      hidden.value = false
      anchor = y
      lastDir = 'idle'
      return
    }
    const delta = y - anchor
    if (Math.abs(delta) < threshold) return
    if (delta > 0 && lastDir !== 'down') {
      hidden.value = true
      anchor = y
      lastDir = 'down'
    } else if (delta < 0 && lastDir !== 'up') {
      hidden.value = false
      anchor = y
      lastDir = 'up'
    } else {
      anchor = y
    }
  }

  target?.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)

  function stop() {
    target?.removeEventListener('scroll', onScroll)
  }
  if (getCurrentScope()) onScopeDispose(stop)

  return { hidden, stop }
}
