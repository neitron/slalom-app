<script setup lang="ts">
export type TierOption = {
  tier: number
  name: string
  count?: number
}

type Props = {
  tiers: TierOption[]
  modelValue: number
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()
</script>

<template>
  <div class="flex gap-1 overflow-x-auto no-scrollbar border-b border-border -mx-3 px-3">
    <button
      v-for="t in tiers"
      :key="t.tier"
      type="button"
      class="shrink-0 px-3.5 py-2 text-[13px] whitespace-nowrap border-b-2 transition-colors"
      :class="
        modelValue === t.tier
          ? 'text-fg border-accent font-semibold'
          : 'text-muted border-transparent hover:text-fg'
      "
      @click="emit('update:modelValue', t.tier)"
    >
      {{ t.name }}<span
        v-if="t.count != null"
        class="ml-1 text-[11px] opacity-60"
      >{{ t.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
</style>
