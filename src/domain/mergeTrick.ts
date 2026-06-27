import type { CanonicalTrick, Trick, TrickOverlay } from './types'

/**
 * Merge a canonical trick (catalog row) with an optional per-user overlay row
 * into the single `Trick` shape consumed by Vue components.
 *
 * Rules:
 * - Canonical fields (name, tier, category, entry, exit, lr, createdBy, visibility)
 *   always come from canonical.
 * - aliases/tags: overlay value wins if non-empty array; otherwise canonical defaults.
 * - icon/video: overlay value wins if non-null; otherwise canonical defaults.
 * - mainAlias, fav, node_x/y, rate/rateL/rateR/last/status: overlay-only (no
 *   canonical fallback — these are pure per-user fields).
 */
export function mergeTrick(canonical: CanonicalTrick, overlay: TrickOverlay | null): Trick {
  return {
    id: canonical.id,
    createdBy: canonical.createdBy,
    visibility: canonical.visibility,
    name: canonical.name,
    tier: canonical.tier,
    category: canonical.category,
    entry: canonical.entry,
    exit: canonical.exit,
    lr: canonical.lr,
    aliases: overlay && overlay.aliases.length > 0 ? overlay.aliases : canonical.defaultAliases,
    tags: overlay && overlay.tags.length > 0 ? overlay.tags : canonical.defaultTags,
    mainAlias: overlay?.mainAlias ?? null,
    icon: overlay?.iconOverride ?? canonical.defaultIcon,
    video: overlay?.videoOverride ?? canonical.defaultVideo,
    node_x: overlay?.nodeX ?? null,
    node_y: overlay?.nodeY ?? null,
    fav: overlay?.fav ?? false,
    rate: overlay?.rate ?? null,
    rateL: overlay?.rateL ?? null,
    rateR: overlay?.rateR ?? null,
    last: overlay?.last ?? null,
    status: overlay?.status ?? 'Not Started',
  }
}
