import type { Trick } from './types';

export function displayName(t: { name: string; mainAlias?: string | null; aliases?: string[] }): string {
  const main = t.mainAlias?.trim();
  if (main && (t.aliases?.includes(main) ?? false)) return main;
  return t.name;
}

export function trickDisplayName(t: Trick | undefined | null): string {
  if (!t) return '';
  return displayName(t);
}
