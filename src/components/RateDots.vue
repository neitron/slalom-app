<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { gw } from '../design/tokens'
import { usePreferencesStore } from '../stores/preferences'
import { defineComponent, h, type PropType } from 'vue'

type StyleMode = 'dots' | 'slashes' | 'bars'

const RateRow = defineComponent({
  name: 'RateRow',
  props: {
    rate: { type: [Number, null] as PropType<number | null>, default: null },
    tint: { type: String, required: true },
    styleMode: { type: String as PropType<StyleMode>, required: true },
    size: { type: String as PropType<'sm' | 'md'>, default: 'sm' },
  },
  setup(props) {
    const isLit = (i: number) => props.rate != null && i <= Math.round(props.rate as number)

    // pulseSeq bumps whenever rate changes; embedded in the lit dot's :key so
    // Vue remounts the dot and the CSS keyframe replays. Skip mount-time
    // change (rate goes from null → value on first paint shouldn't pulse).
    const pulseSeq = ref(0)
    let isFirst = true
    watch(
      () => props.rate,
      () => {
        if (isFirst) { isFirst = false; return }
        pulseSeq.value++
      },
    )

    function renderDot(i: number) {
      const lit = isLit(i)
      if (lit) {
        return h(
          'div',
          {
            key: `lit-${i}-${pulseSeq.value}`,
            class: 'rd-dot rd-lit',
            style: {
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: props.tint,
              opacity: 1,
            },
          },
          [
            h('div', {
              style: {
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: props.tint,
                opacity: 0.3,
                filter: 'blur(2.5px)',
                position: 'relative',
                top: '-1px',
                left: '-1px',
              },
            }),
          ],
        )
      }
      return h('span', {
        key: `off-${i}`,
        style: {
          width: '3px',
          height: '3px',
          borderRadius: '50%',
          background: gw.fg,
          opacity: 0.08,
        },
      })
    }

    function renderSlash(i: number) {
      const lit = isLit(i)
      const base = {
        width: '1.5px',
        height: '12px',
        background: props.tint,
        transform: 'skewX(-20deg)',
        borderRadius: '1px',
      } as const
      if (lit) {
        return h(
          'div',
          {
            key: `lit-${i}-${pulseSeq.value}`,
            class: 'rd-slash rd-lit',
            style: { ...base, opacity: 1, position: 'relative' },
          },
          [
            h('div', {
              style: {
                position: 'absolute',
                width: '6px',
                height: '16px',
                left: '-2.25px',
                top: '-2px',
                background: props.tint,
                opacity: 0.3,
                filter: 'blur(3px)',
                borderRadius: '4px',
              },
            }),
          ],
        )
      }
      return h('span', {
        key: `off-${i}`,
        style: { ...base, background: gw.fg, opacity: 0.1 },
      })
    }

    function renderBar(i: number) {
      const lit = isLit(i)
      const base = {
        width: '8px',
        height: '2px',
        borderRadius: '999px',
        background: props.tint,
      } as const
      if (lit) {
        return h(
          'div',
          {
            key: `lit-${i}-${pulseSeq.value}`,
            class: 'rd-bar rd-lit',
            style: { ...base, opacity: 1, position: 'relative' },
          },
          [
            h('div', {
              style: {
                position: 'absolute',
                width: '10px',
                height: '4px',
                left: '-1px',
                top: '-1px',
                background: props.tint,
                opacity: 0.3,
                filter: 'blur(2.5px)',
                borderRadius: '999px',
              },
            }),
          ],
        )
      }
      return h('span', {
        key: `off-${i}`,
        style: { ...base, background: gw.fg, opacity: 0.1 },
      })
    }

    return () => {
      const indices = [1, 2, 3, 4, 5]
      let containerStyle: Record<string, string> = {}
      const children = indices.map((i) => {
        if (props.styleMode === 'slashes') return renderSlash(i)
        if (props.styleMode === 'bars') return renderBar(i)
        return renderDot(i)
      })

      if (props.styleMode === 'slashes') {
        containerStyle = { display: 'flex', alignItems: 'center', gap: '4px', height: '16px' }
      } else if (props.styleMode === 'bars') {
        containerStyle = { display: 'flex', alignItems: 'center', gap: '2px' }
      } else {
        containerStyle = { display: 'flex', gap: '5px' }
      }

      return h('div', { style: containerStyle }, children)
    }
  },
})

type Props = {
  rate?: number | null
  rateL?: number | null
  rateR?: number | null
  lr?: boolean
  size?: 'sm' | 'md'
  /** When set in lr=true mode, render only that side's row. */
  side?: 'L' | 'R' | null
}

const props = withDefaults(defineProps<Props>(), {
  rate: null,
  rateL: null,
  rateR: null,
  lr: false,
  size: 'sm',
  side: null,
})

const prefs = usePreferencesStore()
const style = computed(() => prefs.rateDotStyle)

function tintFor(side: 'single' | 'l' | 'r'): string {
  if (side === 'l') return gw.leg.l
  if (side === 'r') return gw.leg.r
  return gw.fg
}
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Single (no leg) -->
    <RateRow
      v-if="!props.lr"
      :rate="props.rate"
      :tint="tintFor('single')"
      :style-mode="style"
      :size="props.size"
      aria-label="Rate"
    />
    <!-- Per-leg L + R (filtered by `side` if provided) -->
    <template v-else>
      <RateRow
        v-if="props.side !== 'R'"
        :rate="props.rateL"
        :tint="tintFor('l')"
        :style-mode="style"
        :size="props.size"
        aria-label="Rate L"
      />
      <RateRow
        v-if="props.side !== 'L'"
        :rate="props.rateR"
        :tint="tintFor('r')"
        :style-mode="style"
        :size="props.size"
        aria-label="Rate R"
      />
    </template>
  </div>
</template>

<!-- NOT scoped — the .rd-* classes are applied inside <RateRow>'s render-fn
     children, which are deep descendants. Vue's scoped-CSS attribute would
     not propagate to those, so we use a global block. The class names are
     prefixed `rd-` to avoid collision. -->
<style>
.rd-lit {
  /* Subtle pulse when a dot transitions to lit. Vue remounts the lit element
     via a per-render key tied to the rate value, which retriggers this anim. */
  animation: rd-pulse var(--motion-g-base, 240ms) cubic-bezier(0.32, 0.72, 0, 1);
  transform-origin: center;
}

@keyframes rd-pulse {
  0%   { transform: scale(1.45); opacity: 0.55; }
  60%  { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .rd-lit { animation: none; }
}
</style>

