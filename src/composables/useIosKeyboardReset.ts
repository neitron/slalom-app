import { onBeforeUnmount, onMounted } from 'vue'

/**
 * iOS Safari (PWA + tab) leaves the layout viewport drifted past its
 * natural bounds after the software keyboard collapses. The fix involves
 * three steps: (1) save scrollY before the keyboard opens, (2) wait long
 * enough after focusout for iOS to finish its keyboard-collapse
 * animation, and (3) kick iOS into recomputing the viewport before
 * restoring scroll — `window.scrollTo` alone is silently clamped to the
 * pre-keyboard scroll range and may land at the drift offset.
 */

const isTextInput = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return type === 'text' || type === 'search' || type === 'email' ||
           type === 'tel' || type === 'url' || type === 'password' ||
           type === 'number'
  }
  return false
}

const isIos = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = window.navigator?.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return /Mac/.test(ua) && window.navigator.maxTouchPoints > 1
}

function kickViewportRecompute(): void {
  // Forcing height on the root element causes iOS to re-evaluate the
  // visual viewport. The actual height doesn't matter — only the change
  // triggers the recompute. Reverting next frame keeps the effect silent.
  const html = document.documentElement
  const prev = html.style.height
  html.style.height = `${window.innerHeight}px`
  // Reading offsetHeight forces a synchronous layout pass.
  void html.offsetHeight
  html.style.height = prev
}

export function useIosKeyboardReset(): void {
  if (typeof window === 'undefined' || !isIos()) return

  let savedScrollY = 0
  let hadFocus = false
  let pendingTimer: number | null = null

  const onFocusIn = (e: FocusEvent) => {
    if (!isTextInput(e.target)) return
    if (!hadFocus) {
      savedScrollY = window.scrollY
    }
    hadFocus = true
    if (pendingTimer != null) {
      window.clearTimeout(pendingTimer)
      pendingTimer = null
    }
  }

  const onFocusOut = (e: FocusEvent) => {
    if (!isTextInput(e.target)) return
    if (pendingTimer != null) window.clearTimeout(pendingTimer)
    pendingTimer = window.setTimeout(() => {
      pendingTimer = null
      if (isTextInput(document.activeElement)) return
      hadFocus = false

      // Skip if a sheet currently holds the body lock — its own release
      // logic will restore scroll cleanly via window.scrollTo.
      if (document.body.style.position === 'fixed') return

      kickViewportRecompute()
      requestAnimationFrame(() => {
        const max = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        )
        const target = Math.min(savedScrollY, max)
        // Reset all three iOS scroll surfaces.
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        requestAnimationFrame(() => {
          window.scrollTo(0, target)
          document.documentElement.scrollTop = target
          document.body.scrollTop = target
        })
      })
    }, 350)
  }

  onMounted(() => {
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('focusin', onFocusIn, true)
    document.removeEventListener('focusout', onFocusOut, true)
    if (pendingTimer != null) {
      window.clearTimeout(pendingTimer)
      pendingTimer = null
    }
  })
}
