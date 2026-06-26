import { watch, onBeforeUnmount, type Ref } from 'vue'

/**
 * Body scroll lock for sheets and modals.
 *
 * Two locking modes:
 * - **Standalone PWA** — lock html+body with `overflow: hidden`,
 *   `overscroll-behavior: none`, and `touch-action: none`. We also attach a
 *   non-passive touchmove blocker on the document. The position-fixed trick
 *   causes a visible safe-area offset under `viewport-fit=cover` because the
 *   body detaches without the browser chrome to mask the shift.
 * - **Safari tab** — the position-fixed pattern is the only reliable lock
 *   because Safari's collapsing URL bar resizes the viewport mid-scroll and
 *   `overflow: hidden` alone is honored inconsistently.
 *
 * Multiple consumers safely stack via a module-level refcount: only the
 * first lock pins the body, only the last unlock restores.
 */
let lockCount = 0
let savedScrollY = 0
let lockedMode: 'pwa' | 'safari' | null = null

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const navAny = window.navigator as { standalone?: boolean }
  return navAny.standalone === true
}

function blockTouchMove(e: TouchEvent): void {
  // Allow scrolling INSIDE a scrollable descendant (e.g. the sheet's
  // own overflow-y-auto panel). Walk up from the target and let the
  // event through if any ancestor up to body is actually scrollable.
  let el = e.target as HTMLElement | null
  while (el && el !== document.body) {
    if (el.scrollHeight > el.clientHeight) {
      const style = window.getComputedStyle(el)
      const oy = style.overflowY
      if (oy === 'auto' || oy === 'scroll') return
    }
    el = el.parentElement
  }
  e.preventDefault()
}

function applyLock(): void {
  if (lockCount === 0) {
    const html = document.documentElement
    const body = document.body
    if (isStandalonePWA()) {
      lockedMode = 'pwa'
      html.style.overflow = 'hidden'
      html.style.overscrollBehavior = 'none'
      body.style.overflow = 'hidden'
      body.style.overscrollBehavior = 'none'
      document.addEventListener('touchmove', blockTouchMove, { passive: false })
    } else {
      lockedMode = 'safari'
      savedScrollY = window.scrollY
      body.style.position = 'fixed'
      body.style.top = `-${savedScrollY}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
    }
  }
  lockCount += 1
}

function releaseLock(): void {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    const html = document.documentElement
    const body = document.body
    if (lockedMode === 'pwa') {
      html.style.overflow = ''
      html.style.overscrollBehavior = ''
      body.style.overflow = ''
      body.style.overscrollBehavior = ''
      document.removeEventListener('touchmove', blockTouchMove)
    } else {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, savedScrollY)
    }
    lockedMode = null
  }
}

export function useBodyScrollLock(visible: Ref<boolean>): void {
  let holdingLock = false

  watch(
    visible,
    (v) => {
      if (v && !holdingLock) {
        applyLock()
        holdingLock = true
      } else if (!v && holdingLock) {
        releaseLock()
        holdingLock = false
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (holdingLock) {
      releaseLock()
      holdingLock = false
    }
  })
}
