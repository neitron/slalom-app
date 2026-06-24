<script setup lang="ts">
import { gw } from '../../design/tokens'

const swatchGroups = [
  {
    title: 'Base',
    items: [
      { name: 'base', hex: gw.base },
      { name: 'baseRaised', hex: gw.baseRaised },
      { name: 'fg', hex: gw.fg },
      { name: 'fgMuted', hex: gw.fgMuted },
      { name: 'fgFaint', hex: gw.fgFaint },
    ],
  },
  {
    title: 'Brand',
    items: [
      { name: 'brand', hex: gw.brand },
      { name: 'brandSoft', hex: gw.brandSoft },
      { name: 'brandPeach', hex: gw.brandPeach },
      { name: 'brandMint', hex: gw.brandMint },
      { name: 'brandSky', hex: gw.brandSky },
    ],
  },
  {
    title: 'Leg (categorical)',
    items: [
      { name: 'leg.l', hex: gw.leg.l },
      { name: 'leg.r', hex: gw.leg.r },
      { name: 'leg.both', hex: gw.leg.both },
      { name: 'leg.none', hex: gw.leg.none },
    ],
  },
  {
    title: 'Rate (ordinal — single ramp, off-hue)',
    items: [
      { name: 'rate.none', hex: gw.rate.none },
      { name: 'rate.bad', hex: gw.rate.bad },
      { name: 'rate.mid', hex: gw.rate.mid },
      { name: 'rate.good', hex: gw.rate.good },
    ],
  },
  {
    title: 'Signals',
    items: [{ name: 'danger', hex: gw.danger }],
  },
]
</script>

<template>
  <div
    class="gw-aurora-bg-lg min-h-screen px-4 py-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Glasswork tokens
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px', marginTop: '4px' }">
      Dev-only preview. Mirrors <code>src/design/tokens.ts</code>.
    </p>

    <section
      v-for="group in swatchGroups"
      :key="group.title"
      class="gw-glass"
      :style="{
        marginTop: '24px',
        padding: '16px',
        borderRadius: gw.radius.panel + 'px',
      }"
    >
      <h2 :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">{{ group.title }}</h2>
      <div
        :style="{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
        }"
      >
        <div
          v-for="item in group.items"
          :key="item.name"
          :style="{
            borderRadius: gw.radius.chip + 'px',
            overflow: 'hidden',
            background: gw.baseRaised,
            border: '1px solid rgba(255,255,255,0.08)',
          }"
        >
          <div :style="{ height: '60px', background: item.hex }" />
          <div :style="{ padding: '8px 10px' }">
            <div :style="{ fontSize: gw.type.micro + 'px', color: gw.fg }">{{ item.name }}</div>
            <div
              :style="{
                fontSize: '11px',
                color: gw.fgMuted,
                fontFamily: 'ui-monospace, monospace',
                marginTop: '2px',
              }"
            >
              {{ item.hex }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="gw-glass"
      :style="{
        marginTop: '24px',
        padding: '16px',
        borderRadius: gw.radius.panel + 'px',
      }"
    >
      <h2 :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">Type scale</h2>
      <div :style="{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }">
        <div :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
          Display · {{ gw.type.display }}px
        </div>
        <div :style="{ fontSize: gw.type.h1 + 'px', fontWeight: 600 }">
          Heading 1 · {{ gw.type.h1 }}px
        </div>
        <div :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">
          Heading 2 · {{ gw.type.h2 }}px
        </div>
        <div :style="{ fontSize: gw.type.body + 'px' }">
          Body · {{ gw.type.body }}px — Slalom is a niche freestyle inline-skating discipline.
        </div>
        <div :style="{ fontSize: gw.type.micro + 'px', color: gw.fgMuted }">
          Micro · {{ gw.type.micro }}px — system labels and metadata
        </div>
      </div>
    </section>

    <section
      class="gw-glass"
      :style="{
        marginTop: '24px',
        padding: '16px',
        borderRadius: gw.radius.panel + 'px',
      }"
    >
      <h2 :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">Surfaces &amp; patterns</h2>
      <div
        :style="{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
        }"
      >
        <div
          class="gw-glass"
          :style="{ height: '100px', borderRadius: gw.radius.chip + 'px', padding: '10px' }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-glass</div>
        </div>
        <div
          class="gw-glass-strong"
          :style="{ height: '100px', borderRadius: gw.radius.chip + 'px', padding: '10px' }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-glass-strong</div>
        </div>
        <div
          class="gw-hatch"
          :style="{
            height: '100px',
            borderRadius: gw.radius.chip + 'px',
            padding: '10px',
            background: gw.baseRaised,
          }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-hatch</div>
        </div>
        <div
          class="gw-halftone"
          :style="{
            height: '100px',
            borderRadius: gw.radius.chip + 'px',
            padding: '10px',
            background: gw.baseRaised,
          }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-halftone</div>
        </div>
      </div>
    </section>
  </div>
</template>
