# src/icons

Semantic icon module for the Glasswork redesign (Phase 6).

## Rule
Consumers import only from `'../icons'`. Never import directly from
`@tabler/icons-vue` — call sites must use the semantic re-exports below.

## Adding an icon

1. Pick the Tabler icon at https://tabler.io/icons.
2. Re-export it from `index.ts` under a semantic project-local name
   (`IconClose`, not `IconX`). If the Tabler name already reads
   semantically (`IconSearch`, `IconCheck`), keep it.
3. Use it: `import { IconYourName } from '../icons'`.
4. Pass `:stroke="1.75"` and `:size="16|18|20|24"` to match TabBar
   cohesion and the sizing convention.

## Bespoke
- `leg/LegL.vue`, `leg/LegR.vue`, `leg/LegBoth.vue`, `leg/LegNone.vue` —
  typography-based stance glyphs. No library has these.
