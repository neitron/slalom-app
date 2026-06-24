import { onBeforeUnmount, watch, type Ref } from 'vue'

export function useSheetViewport(
  panelRef: Ref<HTMLElement | null>,
  open: Ref<boolean>,
): void {
  if (typeof window === 'undefined' || !('visualViewport' in window) || !window.visualViewport) {
    return
  }
  const vv = window.visualViewport

  let attached = false
  let panel: HTMLElement | null = null

  const handler = (): void => {
    if (!panel) return
    const ae = document.activeElement
    const isEditable =
      !!ae &&
      (ae.tagName === 'INPUT' ||
        ae.tagName === 'TEXTAREA' ||
        (ae as HTMLElement).isContentEditable)
    const diff = window.innerHeight - vv.height
    if (isEditable && diff > 60) {
      panel.style.bottom = diff + 'px'
      panel.style.height = vv.height + 'px'
      panel.classList.add('kb-open')
    } else {
      panel.style.bottom = ''
      panel.style.height = ''
      panel.classList.remove('kb-open')
    }
  }

  const attach = (el: HTMLElement): void => {
    panel = el
    if (!attached) {
      vv.addEventListener('resize', handler)
      attached = true
    }
    handler()
  }

  const detach = (): void => {
    if (attached) {
      vv.removeEventListener('resize', handler)
      attached = false
    }
    if (panel) {
      panel.style.bottom = ''
      panel.style.height = ''
      panel.classList.remove('kb-open')
    }
    panel = null
  }

  watch(
    [open, panelRef],
    ([isOpen, el]) => {
      if (isOpen && el) {
        attach(el)
      } else {
        detach()
      }
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => {
    detach()
  })
}
