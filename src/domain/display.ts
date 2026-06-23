import type { Profile, Trick } from './types';

export function displayName(t: { name: string; mainAlias?: string | null; aliases?: string[] }): string {
  const main = t.mainAlias?.trim();
  if (main && (t.aliases?.includes(main) ?? false)) return main;
  return t.name;
}

export function trickDisplayName(t: Trick | undefined | null): string {
  if (!t) return '';
  return displayName(t);
}

export function nicknameDisplay(p: Profile | null | undefined): string {
  if (!p) return '';
  if (p.displayName && p.displayName.trim()) return p.displayName.trim();
  if (p.nickname && p.nickname.trim()) return p.nickname.trim();
  return `user_${p.id.slice(0, 6)}`;
}

export function avatarMonogram(p: Profile | null | undefined): string {
  if (!p) return '?';
  const base = (p.displayName?.trim() || p.nickname?.trim() || p.id).slice(0, 2);
  return base.toUpperCase();
}

const HASH_COLORS = [
  '#5b8def', '#e879f9', '#fbbf24', '#34d399', '#f87171',
  '#a78bfa', '#22d3ee', '#fb923c', '#84cc16', '#ec4899',
];

export function avatarBgColor(id: string | null | undefined): string {
  if (!id) return HASH_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
}
