import { describe, expect, it } from 'vitest'
import { useScrollDirection } from '../useScrollDirection'

class FakeScroller extends EventTarget {
  public scrollY = 0
  fire(nextY: number) {
    this.scrollY = nextY
    this.dispatchEvent(new Event('scroll'))
  }
}

describe('useScrollDirection', () => {
  it('initial state: not hidden', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    expect(hidden.value).toBe(false)
    stop()
  })

  it('hides when scrolling down past threshold', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(20)
    expect(hidden.value).toBe(true)
    stop()
  })

  it('reveals when scrolling up past threshold', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(40)
    expect(hidden.value).toBe(true)
    target.fire(20)
    expect(hidden.value).toBe(false)
    stop()
  })

  it('ignores sub-threshold deltas (no thrash)', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(40)
    expect(hidden.value).toBe(true)
    target.fire(35) // -5, below threshold
    expect(hidden.value).toBe(true)
    target.fire(31) // -9 from anchor (40), passes threshold → reveal
    expect(hidden.value).toBe(false)
    stop()
  })

  it('always reveals near the top (scrollY < threshold)', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(40)
    expect(hidden.value).toBe(true)
    target.fire(3)
    expect(hidden.value).toBe(false)
    stop()
  })

  it('stop() removes the listener', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    stop()
    target.fire(100)
    expect(hidden.value).toBe(false)
  })
})
