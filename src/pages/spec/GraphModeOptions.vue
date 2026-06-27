<script setup lang="ts">
import { IconMoveMode } from '../../icons'

type Variant = {
  key: string
  label: string
  description: string
  positionClass: string
}

const variants: Variant[] = [
  { key: 'a', label: 'A · Top-center pill', description: 'Floats above where the old top-bar row was. Most discoverable.', positionClass: 'pos-top-center' },
  { key: 'b', label: 'B · Top-right corner', description: 'Tucked out of the way. Most graph canvas.', positionClass: 'pos-top-right' },
  { key: 'c', label: 'C · Bottom-center', description: 'Thumb-reachable. Competes with FAB area.', positionClass: 'pos-bottom-center' },
  { key: 'd', label: 'D · Bottom-left next to zoom', description: 'Mode + zoom as one cluster.', positionClass: 'pos-bottom-left' },
]
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />
    <div class="page-scroll p-3 flex flex-col gap-3">
      <h1 class="text-lg font-semibold">Graph mode switcher placement</h1>
      <p class="text-xs text-muted">Each card is a mock graph canvas with the floating switcher in one of four positions. Compare on device.</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="v in variants"
          :key="v.key"
          class="canvas gw-glass"
          :style="{ borderRadius: 'var(--radius-g-panel)' }"
        >
          <div class="canvas-label" :style="{ color: 'var(--color-g-brand)' }">{{ v.label }}</div>

          <!-- Mock graph nodes -->
          <div class="node" style="top: 60px; left: 32px;">CR</div>
          <div class="node" style="top: 110px; left: 110px;">CH</div>
          <div class="node" style="top: 60px; left: 190px;">7G</div>
          <div class="node" style="top: 180px; left: 60px;">EB</div>
          <div class="node" style="top: 200px; left: 170px;">SP</div>

          <!-- Mock zoom cluster bottom-left -->
          <div class="zoom-stack">
            <div class="zoom-btn">+</div>
            <div class="zoom-btn">−</div>
            <div class="zoom-btn">⌂</div>
          </div>

          <!-- The switcher -->
          <div :class="['switcher', v.positionClass]">
            <button class="seg active">View</button>
            <button class="seg with-icon">
              <IconMoveMode :size="12" stroke="1.75" />
              <span>Move</span>
            </button>
          </div>

          <div class="note">{{ v.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-shell { position: relative; }
.page-aurora {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.page-scroll { position: relative; z-index: 1; }

.canvas {
  position: relative;
  height: 320px;
  overflow: hidden;
}
.canvas-label {
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  z-index: 3;
}

.node {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  display: grid;
  place-items: center;
  font-size: 9px;
  color: rgba(255,255,255,0.7);
  pointer-events: none;
}

.zoom-stack {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
}
.zoom-btn {
  width: 28px;
  height: 28px;
  background: rgba(20,25,32,0.55);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.2);
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: rgba(255,255,255,0.7);
  font-size: 12px;
}

.note {
  position: absolute;
  bottom: 8px;
  left: 48px;
  right: 12px;
  font-size: 10px;
  line-height: 1.3;
  color: rgba(255,255,255,0.55);
  z-index: 2;
}

/* Switcher chrome — Apple glass pill with segments */
.switcher {
  position: absolute;
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 999px;
  background: rgba(20, 25, 32, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.10),
    0 4px 16px rgba(0, 0, 0, 0.25);
  z-index: 2;
}
.switcher .seg {
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 200ms ease;
}
.switcher .seg.active {
  background: rgba(255, 255, 255, 0.95);
  color: #0a0e14;
  font-weight: 600;
}

.pos-top-center { top: 8px; left: 50%; transform: translateX(-50%); }
.pos-top-right  { top: 8px; right: 12px; }
.pos-bottom-center { bottom: 48px; left: 50%; transform: translateX(-50%); }
.pos-bottom-left  { bottom: 12px; left: 52px; }
</style>
