<script setup lang="ts">
import { IconGenerate, IconRoute } from '../../icons'

type Variant = {
  key: string
  label: string
  description: string
}

const variants: Variant[] = [
  { key: 'a', label: 'A · Pure glass', description: 'Frosted glass, white icon. Universal.' },
  { key: 'b', label: 'B · Brand-tinted', description: 'Whisper of mint wash + tinted icon.' },
  { key: 'c', label: 'C · White glass tablet', description: 'Almost-opaque white, black icon. iOS Photos.' },
  { key: 'd', label: 'D · Outlined ghost', description: 'Dark glass with hairline white border.' },
  { key: 'e', label: 'E · Squircle', description: 'Rounded square instead of circle.' },
  { key: 'f', label: 'F · Pill with label', description: 'Icon + word.' },
]
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />
    <div class="page-scroll p-3 flex flex-col gap-3">
      <h1 class="text-lg font-semibold">FAB options preview</h1>
      <p class="text-xs text-muted">Each block is a mock content area with a FAB rendered against the real Glasswork aurora background. Compare on device.</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="v in variants"
          :key="v.key"
          class="variant-card gw-glass"
          :style="{ borderRadius: 'var(--radius-g-panel)' }"
        >
          <div class="variant-label" :style="{ color: 'var(--color-g-brand)' }">{{ v.label }}</div>
          <div class="content-mock">
            <div class="row" />
            <div class="row" />
            <div class="row" />
          </div>
          <div class="note">{{ v.description }}</div>

          <!-- Generate variant -->
          <button :class="['fab', 'fab-gen', `v-${v.key}`]" aria-label="Generate (preview)">
            <IconGenerate v-if="v.key !== 'f'" :size="22" stroke="1.75" />
            <template v-else>
              <IconGenerate :size="18" stroke="1.75" />
              <span class="fab-text">Generate</span>
            </template>
          </button>

          <!-- Build variant (offset slightly so both visible) -->
          <button :class="['fab', 'fab-build', `v-${v.key}`]" aria-label="Build (preview)">
            <IconRoute v-if="v.key !== 'f'" :size="22" stroke="1.75" />
            <template v-else>
              <IconRoute :size="18" stroke="1.75" />
              <span class="fab-text">Build</span>
            </template>
          </button>
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

.variant-card {
  position: relative;
  padding: 16px;
  aspect-ratio: 0.9;
  overflow: hidden;
}
.variant-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.content-mock {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.content-mock .row {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 8px;
  height: 26px;
}
.note {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 130px;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(255,255,255,0.55);
}

.fab {
  position: absolute;
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  color: white;
  z-index: 2;
}
.fab-gen   { right: 14px; bottom: 14px; }
.fab-build { right: 14px; bottom: 74px; }

/* Pill variant breaks geometry — give it auto width */
.fab.v-f {
  width: auto;
  padding: 0 14px 0 12px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}
.fab.v-f.fab-build { bottom: 64px; }
.fab .fab-text { letter-spacing: 0.01em; }

/* A — Pure frosted glass, white icon */
.v-a {
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.18),
    0 4px 18px rgba(0, 0, 0, 0.35);
}

/* B — Brand-tinted glass */
.v-b {
  background: linear-gradient(135deg, rgba(110, 231, 183, 0.18), rgba(110, 231, 183, 0.06));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 50%;
  color: rgba(180, 255, 220, 1);
  box-shadow:
    inset 0 0 0 0.5px rgba(110, 231, 183, 0.25),
    0 4px 18px rgba(0, 0, 0, 0.35);
}

/* C — White glass tablet */
.v-c {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 50%;
  color: #0a0e14;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 1),
    0 6px 20px rgba(0, 0, 0, 0.4);
}

/* D — Outlined ghost */
.v-d {
  background: rgba(20, 25, 32, 0.45);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.20),
    0 2px 10px rgba(0, 0, 0, 0.25);
}

/* E — Squircle */
.v-e {
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 16px;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.18),
    0 4px 16px rgba(0, 0, 0, 0.30);
}

/* F — Pill with label */
.v-f {
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 999px;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.18),
    0 4px 16px rgba(0, 0, 0, 0.30);
  color: white;
}
</style>
