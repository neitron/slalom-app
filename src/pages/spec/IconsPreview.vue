<script setup lang="ts">
import {
  IconClose,
  IconSearch,
  IconFavOn,
  IconFavOff,
  IconTransition,
  IconBidi,
  IconBack,
  IconArrowRight,
  IconTrendUp,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconMenuH,
  IconMenuV,
  IconCheck,
  IconPlus,
  IconGenerate,
  IconResetView,
  IconMoveMode,
  IconPeople,
  IconProfile,
  IconSettings,
  IconSyncUp,
  IconSyncDown,
  IconCalendar,
  IconShare,
  IconFilter,
  IconEye,
  IconVideo,
  IconBrandYoutube,
  LegL,
  LegR,
  LegBoth,
  LegNone,
} from '../../icons'

type IconEntry = { name: string; component: any }

const tablerIcons: IconEntry[] = [
  { name: 'IconClose', component: IconClose },
  { name: 'IconSearch', component: IconSearch },
  { name: 'IconFavOn', component: IconFavOn },
  { name: 'IconFavOff', component: IconFavOff },
  { name: 'IconTransition', component: IconTransition },
  { name: 'IconBidi', component: IconBidi },
  { name: 'IconBack', component: IconBack },
  { name: 'IconArrowRight', component: IconArrowRight },
  { name: 'IconTrendUp', component: IconTrendUp },
  { name: 'IconChevronDown', component: IconChevronDown },
  { name: 'IconChevronRight', component: IconChevronRight },
  { name: 'IconChevronLeft', component: IconChevronLeft },
  { name: 'IconMenuH', component: IconMenuH },
  { name: 'IconMenuV', component: IconMenuV },
  { name: 'IconCheck', component: IconCheck },
  { name: 'IconPlus', component: IconPlus },
  { name: 'IconGenerate', component: IconGenerate },
  { name: 'IconResetView', component: IconResetView },
  { name: 'IconMoveMode', component: IconMoveMode },
  { name: 'IconPeople', component: IconPeople },
  { name: 'IconProfile', component: IconProfile },
  { name: 'IconSettings', component: IconSettings },
  { name: 'IconSyncUp', component: IconSyncUp },
  { name: 'IconSyncDown', component: IconSyncDown },
  { name: 'IconCalendar', component: IconCalendar },
  { name: 'IconShare', component: IconShare },
  { name: 'IconFilter', component: IconFilter },
  { name: 'IconEye', component: IconEye },
  { name: 'IconVideo', component: IconVideo },
  { name: 'IconBrandYoutube', component: IconBrandYoutube },
]

const legIcons: IconEntry[] = [
  { name: 'LegL', component: LegL },
  { name: 'LegR', component: LegR },
  { name: 'LegBoth', component: LegBoth },
  { name: 'LegNone', component: LegNone },
]

const sizes = [16, 18, 20, 24]
</script>

<template>
  <main class="min-h-screen p-4" style="background: var(--color-g-base); color: var(--color-g-fg);">
    <h1 class="text-lg font-semibold mb-1">Phase 6 icon preview</h1>
    <p class="text-xs opacity-60 mb-4">All icons at 16 / 18 / 20 / 24. Default and accent color.</p>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">TabBar (kept as-is, for cohesion check)</h2>
      <div class="flex gap-4 items-center p-3 rounded-lg" style="background: var(--color-g-glass);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h14V10.5"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6.5 7.5L11 16.5M17.5 7.5L13 16.5M6.5 6h11"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5"/><path d="M14 11a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5"/></svg>
      </div>
    </section>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">Tabler (default color)</h2>
      <div class="grid grid-cols-1 gap-1">
        <div
          v-for="icon in tablerIcons"
          :key="icon.name"
          class="flex items-center gap-4 px-2 py-1.5 rounded"
          style="background: var(--color-g-glass);"
        >
          <span class="text-[11px] font-mono opacity-70 w-36 truncate">{{ icon.name }}</span>
          <component
            v-for="s in sizes"
            :key="s"
            :is="icon.component"
            :size="s"
            :stroke="1.75"
          />
        </div>
      </div>
    </section>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">Tabler (accent color)</h2>
      <div class="grid grid-cols-1 gap-1" style="color: var(--color-g-brand);">
        <div
          v-for="icon in tablerIcons.slice(0, 6)"
          :key="icon.name + '-acc'"
          class="flex items-center gap-4 px-2 py-1.5 rounded"
          style="background: var(--color-g-glass);"
        >
          <span class="text-[11px] font-mono opacity-70 w-36 truncate">{{ icon.name }}</span>
          <component
            v-for="s in sizes"
            :key="s"
            :is="icon.component"
            :size="s"
            :stroke="1.75"
          />
        </div>
      </div>
    </section>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">Bespoke leg glyphs</h2>
      <div class="grid grid-cols-1 gap-1">
        <div
          v-for="icon in legIcons"
          :key="icon.name"
          class="flex items-center gap-4 px-2 py-1.5 rounded"
          style="background: var(--color-g-glass);"
        >
          <span class="text-[11px] font-mono opacity-70 w-36 truncate">{{ icon.name }}</span>
          <component
            v-for="s in sizes"
            :key="s"
            :is="icon.component"
            :size="s"
          />
        </div>
      </div>
    </section>
  </main>
</template>
