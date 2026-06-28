<script setup lang="ts">
import { computed } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { edgeMatches } from '../domain/edges'
import { displayName } from '../domain/display'
import type { Side, Trick } from '../domain/types'
import { IconArrowRight } from '../icons'

type Step = { trickId: string; side: Side }

const props = defineProps<{ steps: Step[] }>()

const tricks = useTricksStore()
const transitions = useTransitionsStore()

function lookup(idOrName: string): Trick | undefined {
  return tricks.byId(idOrName) ?? tricks.tricks.find((t) => t.name === idOrName)
}

type Chip = { key: string; id: string; name: string; icon: string | null; side: Side }
const chips = computed<Chip[]>(() =>
  props.steps.map((s, i) => {
    const t = lookup(s.trickId)
    return {
      key: `${i}-${s.trickId}`,
      id: t?.id ?? s.trickId,
      name: t ? displayName(t) : s.trickId,
      icon: t?.icon ?? null,
      side: s.side,
    }
  }),
)

function shortName(n: string): string {
  return n.length > 18 ? `${n.slice(0, 17)}…` : n
}

function sideColor(s: Side): string {
  if (s === 'L') return 'var(--side-l)'
  if (s === 'R') return 'var(--side-r)'
  return 'var(--side-none)'
}

function hasEdge(a: Chip, b: Chip): boolean {
  return transitions.edges.some((e) =>
    edgeMatches(e, a.id, a.side, b.id, b.side),
  )
}

function warnBetween(i: number): boolean {
  const a = chips.value[i]
  const b = chips.value[i + 1]
  if (!a || !b) return false
  return !hasEdge(a, b)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <template
      v-for="(c, i) in chips"
      :key="c.key"
    >
      <span
        class="chain-chip inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card-2 border border-border-2 text-xs"
        :style="{ animationDelay: (i * 50) + 'ms' }"
      >
        <span
          v-if="c.icon"
          class="leading-none"
        >{{ c.icon }}</span>
        <span class="text-fg">{{ shortName(c.name) }}</span>
        <span
          class="font-bold text-[10px]"
          :style="{ color: sideColor(c.side) }"
        >{{ c.side ?? '·' }}</span>
      </span>
      <template v-if="i < chips.length - 1">
        <span
          v-if="warnBetween(i)"
          class="chain-arrow text-xs font-bold"
          style="color: var(--rate-bad)"
          title="No matching learned transition"
          :style="{ animationDelay: (i * 50 + 25) + 'ms' }"
        >⚠</span>
        <IconArrowRight
          :size="14"
          stroke="1.75"
          class="chain-arrow text-muted"
          :style="{ animationDelay: (i * 50 + 25) + 'ms' }"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.chain-chip {
  animation: chain-reveal var(--motion-g-base) cubic-bezier(0.32, 0.72, 0, 1) backwards;
}
.chain-arrow {
  animation: chain-arrow-reveal var(--motion-g-fast) var(--ease-g-out) backwards;
}

@keyframes chain-reveal {
  from { opacity: 0; transform: translateX(-8px) scale(0.92); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes chain-arrow-reveal {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .chain-chip,
  .chain-arrow { animation: none; }
}
</style>
