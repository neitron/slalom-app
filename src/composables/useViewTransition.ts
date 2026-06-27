/**
 * Wraps document.startViewTransition with feature-detect + reduced-motion check.
 * Returns a function that takes a callback and runs it inside a View Transition
 * (or directly if VT API isn't supported or the user prefers reduced motion).
 *
 * Errors during the transition are swallowed — they typically indicate the user
 * navigated away mid-flight, which is expected behavior.
 *
 * The DOM type for startViewTransition varies across TS lib versions (some have
 * it required, some optional, some absent). We use a local structural type that
 * narrows what we actually consume, sidestepping cross-lib compatibility.
 */

type ViewTransitionLike = { finished: Promise<unknown> }
type StartViewTransition = (cb: () => void | Promise<void>) => ViewTransitionLike

export type ViewTransitionRunner = (cb: () => void | Promise<void>) => Promise<void>

export function useViewTransition(): ViewTransitionRunner {
  return async (cb) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition
    if (typeof start !== 'function' || reduce) {
      await cb()
      return
    }
    const transition = start.call(document, async () => {
      await cb()
    })
    try {
      await transition.finished
    } catch {
      /* user navigated away mid-transition — expected, swallow */
    }
  }
}
