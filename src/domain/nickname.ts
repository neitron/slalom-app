export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 24;
const NICKNAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.\-]{1,22}[A-Za-z0-9_]$/;
const SEPARATOR_RUN_RE = /[._-]{3,}/;

export const RESERVED_NICKNAMES = new Set<string>([
  'admin','root','support','me','you','system','null',
  'settings','friends','people','profile','login','signup',
  'anonymous','public','auth','api','www','mail','help',
  'about','terms','privacy','undefined','user','users',
  'moderator','mod',
]);

export type NicknameError =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'bad_charset'
  | 'bad_edges'
  | 'separator_run'
  | 'reserved';

export function validateNickname(raw: string | null | undefined): NicknameError | null {
  const s = (raw ?? '').trim();
  if (!s) return 'empty';
  if (s.length < NICKNAME_MIN) return 'too_short';
  if (s.length > NICKNAME_MAX) return 'too_long';
  if (SEPARATOR_RUN_RE.test(s)) return 'separator_run';
  if (!NICKNAME_RE.test(s)) {
    if (/^[._-]/.test(s) || /[._-]$/.test(s)) return 'bad_edges';
    return 'bad_charset';
  }
  if (RESERVED_NICKNAMES.has(s.toLowerCase())) return 'reserved';
  return null;
}

export function nicknameErrorMessage(err: NicknameError): string {
  switch (err) {
    case 'empty':
      return 'Pick a nickname.';
    case 'too_short':
      return '3 or more characters.';
    case 'too_long':
      return '24 characters or fewer.';
    case 'bad_edges':
      return 'Cannot start or end with . or -.';
    case 'bad_charset':
      return 'Letters, numbers, _, . and - only.';
    case 'separator_run':
      return 'No three or more . _ - in a row.';
    case 'reserved':
      return 'This nickname is reserved.';
  }
}

export function suggestAlternatives(base: string): string[] {
  const seed = base.trim().toLowerCase().replace(/[^a-z0-9_.\-]/g, '').slice(0, NICKNAME_MAX - 2);
  const out: string[] = [];
  const digits = ['2', '_', 'x', 'pro', '1'];
  for (const d of digits) {
    const candidate = `${seed}${d}`.slice(0, NICKNAME_MAX);
    if (validateNickname(candidate) == null) out.push(candidate);
    if (out.length >= 3) break;
  }
  return out;
}
