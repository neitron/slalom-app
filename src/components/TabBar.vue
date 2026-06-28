<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, type NavigationFailure } from 'vue-router'
import { useFriendsStore } from '../stores/friends'
import { useKeyboardOpen } from '../composables/useKeyboardOpen'

type Tab = { to: string; label: string; icon: 'home' | 'tricks' | 'graph' | 'sequences' }

const tabs: Tab[] = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/tricks', icon: 'tricks', label: 'Tricks' },
  { to: '/graph', icon: 'graph', label: 'Graph' },
  { to: '/sequences', icon: 'sequences', label: 'Sequences' },
]

const TAB_PATHS = tabs.map((t) => t.to)

const friends = useFriendsStore()
const incomingCount = computed<number>(() => friends.incomingCount)

const route = useRoute()
const hideTabs = computed<boolean>(() => !!route.meta.hideTabs)
const kbOpen = useKeyboardOpen()

/**
 * Match the route to a tab by longest-prefix.
 * /tricks/library should match the /tricks tab; / matches only itself.
 */
function pathToActiveIdx(path: string): number {
  let best = -1
  let bestLen = 0
  for (let i = 0; i < TAB_PATHS.length; i++) {
    const p = TAB_PATHS[i]
    if (p === '/') {
      if (path === '/' && 1 > bestLen) { best = i; bestLen = 1 }
    } else if (path === p || path.startsWith(p + '/')) {
      if (p.length > bestLen) { best = i; bestLen = p.length }
    }
  }
  return best >= 0 ? best : 0
}

const activeIdx = computed(() => pathToActiveIdx(route.path))

/**
 * Indicator border-radius mirrors the legacy per-position shape: outer
 * corners follow the nav's radius (var(--radius-g-panel) ≈ 26px, slightly
 * inset to ~22px to leave room for the nav padding), inner corners are 14px.
 */
const indicatorRadius = computed<string>(() => {
  const idx = activeIdx.value
  if (idx === 0) return '22px 14px 14px 22px'
  if (idx === tabs.length - 1) return '14px 22px 22px 14px'
  return '14px'
})

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

/**
 * Touch-position ripple — keyed per tab so re-tapping the same tab restarts
 * the animation (Vue re-renders the <span> when `key` changes).
 */
interface RippleState { x: number; y: number; key: number }
const ripples = ref<Record<number, RippleState>>({})
let rippleSeq = 0

function onTouchStart(idx: number, e: TouchEvent): void {
  const touch = e.touches[0]
  if (!touch) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  ripples.value = {
    ...ripples.value,
    [idx]: { x: touch.clientX - rect.left, y: touch.clientY - rect.top, key: ++rippleSeq },
  }
}

/**
 * Plain navigation. The morphing indicator IS the transition — no View
 * Transitions API call here (the page-slide approach caused frost-glass
 * jitter that the indicator approach sidesteps entirely).
 */
async function onTabClick(
  navigate: (e?: MouseEvent) => Promise<void | NavigationFailure | undefined>,
): Promise<void> {
  await navigate()
}
</script>

<template>
  <Teleport to="body">
    <nav
      v-if="!hideTabs"
      class="tabbar-fixed gw-glass-strong"
      :class="{ 'is-hidden': kbOpen }"
      :style="{ '--active-idx': activeIdx }"
      role="tablist"
      aria-label="Primary navigation"
    >
      <div class="tab-grid">
        <!-- Morphing selection pill — absolute, sits BEHIND tab buttons. -->
        <span
          class="tab-indicator"
          :style="{ borderRadius: indicatorRadius }"
          aria-hidden="true"
        />

        <RouterLink
          v-for="(t, idx) in tabs"
          :key="t.to"
          :to="t.to"
          custom
          v-slot="{ href, navigate }"
        >
          <a
            :href="href"
            role="tab"
            :aria-selected="isActive(t.to)"
            class="tab-button"
            :class="{ active: isActive(t.to) }"
            @click.prevent="onTabClick(navigate)"
            @touchstart.passive="onTouchStart(idx, $event)"
          >
            <!-- Touch ripple from tap position (re-keyed per tap to restart anim). -->
            <span
              v-if="ripples[idx]"
              :key="ripples[idx].key"
              class="tab-ripple"
              :style="{ left: ripples[idx].x + 'px', top: ripples[idx].y + 'px' }"
              aria-hidden="true"
            />
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              class="tab-icon"
            >
              <template v-if="t.icon === 'home'">
                <path d="M3 11.5L12 4l9 7.5" />
                <path d="M5 10.5V20h14V10.5" />
              </template>
              <template v-else-if="t.icon === 'tricks'">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </template>
              <template v-else-if="t.icon === 'graph'">
                <circle cx="5" cy="6" r="2" />
                <circle cx="19" cy="6" r="2" />
                <circle cx="12" cy="18" r="2" />
                <path d="M6.5 7.5L11 16.5M17.5 7.5L13 16.5M6.5 6h11" />
              </template>
              <template v-else-if="t.icon === 'sequences'">
                <path d="M10 13a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5" />
                <path d="M14 11a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5" />
              </template>
            </svg>
            <span class="tab-label">{{ t.label }}</span>
            <span
              v-if="t.icon === 'home' && incomingCount > 0"
              class="tab-badge"
              :style="{ background: 'var(--color-g-danger)' }"
              aria-hidden="true"
            />
          </a>
        </RouterLink>
      </div>
    </nav>
  </Teleport>
</template>

<style scoped>
/* Grid container — relative so the indicator can absolute-position over its cells. */
.tab-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
  padding: 0.25rem;
}

/* Morphing selection pill. Slides horizontally between tab cells.
   Position math (matches .tab-grid's padding 0.25rem + gap 0.25rem):
     per-tab width = (100% - 1.25rem) / 4
                     where 1.25rem = 2 * padding (0.5rem) + 3 * gap (0.75rem)
     tab N's left = padding + N * (perTabWidth + gap) */
.tab-indicator {
  position: absolute;
  top: 0.25rem;
  bottom: 0.25rem;
  width: calc((100% - 1.25rem) / 4);
  left: calc(
    0.25rem + var(--active-idx, 0) * (((100% - 1.25rem) / 4) + 0.25rem)
  );
  background: var(--color-g-fg);
  z-index: 0;
  /* Apple's iOS tab-switch curve. Spring-like settling without overshoot. */
  transition:
    left var(--motion-g-slow) cubic-bezier(0.32, 0.72, 0, 1),
    border-radius var(--motion-g-slow) cubic-bezier(0.32, 0.72, 0, 1),
    transform var(--motion-g-fast) var(--ease-g-out);
  will-change: left, transform;
  pointer-events: none;
}

/* Tactile press: indicator squashes slightly when ANY tab is being pressed. */
.tab-grid:active .tab-indicator {
  transform: scale(0.97);
}

.tab-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
  color: var(--color-g-fg-muted);
  z-index: 1;
  overflow: hidden;
  border-radius: 14px;
  -webkit-tap-highlight-color: transparent;
  transition:
    color var(--motion-g-slow) cubic-bezier(0.32, 0.72, 0, 1),
    transform var(--motion-g-fast) var(--ease-g-out);
}
.tab-button.active {
  color: var(--color-g-base);
  font-weight: 600;
}
.tab-button:active {
  transform: scale(0.96);
}

.tab-icon { width: 22px; height: 22px; }
.tab-label {
  margin-top: 0.125rem;
  font-size: 10px;
  line-height: 1.1;
}
.tab-badge {
  position: absolute;
  top: 0.125rem;
  right: 0.5rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Touch-position light ripple. Subtle, fades quickly. */
.tab-ripple {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: tab-ripple-out 520ms ease-out forwards;
}

@keyframes tab-ripple-out {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(10); opacity: 0; }
}

.tabbar-active {
  /* Legacy global class — kept for any external consumer; current TabBar
     uses .tab-button.active instead. */
  background: var(--color-g-fg);
  color: var(--color-g-base);
}

@media (prefers-reduced-motion: reduce) {
  .tab-indicator,
  .tab-button { transition: none; }
  .tab-ripple { animation: none; opacity: 0; }
  .tab-grid:active .tab-indicator,
  .tab-button:active { transform: none; }
}
</style>
