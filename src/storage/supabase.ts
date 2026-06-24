import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = (): boolean => !!(url && key);

let sbPromise: Promise<SupabaseClient | null> | null = null;

export function getSb(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return Promise.resolve(null);
  if (!sbPromise) {
    sbPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url!, key!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storageKey: 'slalom.sb.auth',
        },
      }),
    );
  }
  return sbPromise;
}

export function reportSyncError(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('slalom:error', { detail: { message } }));
}
