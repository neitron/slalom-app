<script setup lang="ts">
import { computed } from 'vue'
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

    function renderDot(i: number) {
      const lit = isLit(i)
      if (lit) {
        return h(
          'div',
          {
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
                mixBlendMode: 'color-dodge' as const,
                position: 'relative',
                top: '-1px',
                left: '-1px',
              },
            }),
          ],
        )
      }
      return h('span', {
        style: {
          width: '3px',
          height: '3px',
          borderRadius: '50%',
          background: props.tint,
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
                mixBlendMode: 'color-dodge' as const,
                borderRadius: '4px',
              },
            }),
          ],
        )
      }
      return h('span', {
        style: { ...base, opacity: 0.1 },
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
                mixBlendMode: 'color-dodge' as const,
                borderRadius: '999px',
              },
            }),
          ],
        )
      }
      return h('span', {
        style: { ...base, opacity: 0.1 },
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
}

const props = withDefaults(defineProps<Props>(), {
  rate: null,
  rateL: null,
  rateR: null,
  lr: false,
  size: 'sm',
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
    <!-- Per-leg L + R -->
    <template v-else>
      <RateRow
        :rate="props.rateL"
        :tint="tintFor('l')"
        :style-mode="style"
        :size="props.size"
        aria-label="Rate L"
      />
      <RateRow
        :rate="props.rateR"
        :tint="tintFor('r')"
        :style-mode="style"
        :size="props.size"
        aria-label="Rate R"
      />
    </template>
  </div>
</template>
