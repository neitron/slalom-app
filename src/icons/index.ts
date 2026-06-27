// Phase 6 icon module — re-exports Tabler under semantic project-local names.
//
// Consumers MUST import from '../icons' (or '../../icons' from pages),
// never directly from '@tabler/icons-vue'. This insulates call sites from
// upstream renames and leaves a single edit-point for future bespoke swaps.
//
// Cohesion note: every consumer must pass :stroke="1.75" to match the
// existing TabBar SVGs (Tabler defaults to 2).

export {
  IconX as IconClose,
  IconSearch,
  IconStar as IconFavOff,
  IconStarFilled as IconFavOn,
  IconLink as IconTransition,
  IconArrowsRightLeft as IconBidi,
  IconArrowLeft as IconBack,
  IconArrowRight,
  IconArrowUpRight as IconTrendUp,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconDots as IconMenuH,
  IconDotsVertical as IconMenuV,
  IconCheck,
  IconPlus,
  IconPencil as IconEdit,
  IconRoute,
  IconDice5 as IconGenerate,
  IconFocusCentered as IconResetView,
  IconArrowsMove as IconMoveMode,
  IconUsers as IconPeople,
  IconUser as IconProfile,
  IconSettings,
  IconCloudUp as IconSyncUp,
  IconCloudDown as IconSyncDown,
  IconCalendar,
  IconShare2 as IconShare,
  IconAdjustmentsHorizontal as IconFilter,
  IconEye,
  IconVideo,
  IconBrandYoutube,
} from '@tabler/icons-vue'

export { default as LegL } from './leg/LegL.vue'
export { default as LegR } from './leg/LegR.vue'
export { default as LegBoth } from './leg/LegBoth.vue'
export { default as LegNone } from './leg/LegNone.vue'

export type IconSize = 16 | 18 | 20 | 24
