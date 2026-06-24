export function setupIosKeyboardReset(): void {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const nav = window.navigator
    if (!nav) return
    const ua = nav.userAgent || ''
    const msStream = (window as unknown as { MSStream?: unknown }).MSStream
    const isIos =
      /iP(ad|hone|od)/.test(ua) ||
      (nav.maxTouchPoints > 1 && /Mac/.test(ua) && !msStream)
    if (!isIos) return

    const vv = window.visualViewport
    const isEditable = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }

    const runNudge = (): void => {
      requestAnimationFrame(() => {
        window.scrollBy(0, -1)
        window.scrollBy(0, 1)
        requestAnimationFrame(() => {
          const offset = window.visualViewport?.offsetTop ?? 0
          if (offset > 0) {
            window.scrollBy(0, -2)
            window.scrollBy(0, 2)
            if (import.meta.env?.DEV) {
              requestAnimationFrame(() => {
                const after = window.visualViewport?.offsetTop ?? 0
                if (after > 0) {
                  // eslint-disable-next-line no-console
                  console.warn('[ios-keyboard-reset] offsetTop still >0 after fallback nudge:', after)
                }
              })
            }
          }
        })
      })
    }

    document.addEventListener(
      'focusout',
      (e) => {
        if (!isEditable(e.target)) return
        if (!vv) {
          runNudge()
          return
        }
        const onResize = (): void => {
          if (window.innerHeight - vv.height < 60) {
            vv.removeEventListener('resize', onResize)
            runNudge()
          }
        }
        vv.addEventListener('resize', onResize)
        window.setTimeout(() => {
          vv.removeEventListener('resize', onResize)
        }, 2000)
      },
      true,
    )

    window.addEventListener('pageshow', () => runNudge())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') runNudge()
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[ios-keyboard-reset] setup failed', e)
  }
}
