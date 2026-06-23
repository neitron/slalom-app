import { defineStore } from 'pinia';
import type { Session, Subscription } from '@supabase/supabase-js';
import { getSb } from '../storage/supabase';

interface AuthState {
  session: Session | null;
  email: string | null;
  error: string | null;
  sending: boolean;
  syncing: boolean;
  lastSyncAt: number | null;
  online: boolean;
}

let authSub: Subscription | null = null;
let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;

async function dispatchSignedIn(): Promise<void> {
  try {
    const [{ useProfileStore }, { useFriendsStore }] = await Promise.all([
      import('./profile'),
      import('./friends'),
    ]);
    void useProfileStore().load();
    void useFriendsStore().loadAll();
  } catch (e) {
    console.warn('[auth] signed-in side-effects failed', e);
  }
}

async function dispatchSignedOut(): Promise<void> {
  try {
    const [{ onSignedOutCleanup }, { useProfileStore }, { useFriendsStore }, { useForeignProgressStore }] = await Promise.all([
      import('../storage/sync'),
      import('./profile'),
      import('./friends'),
      import('./foreignProgress'),
    ]);
    await onSignedOutCleanup();
    useProfileStore().$reset();
    useFriendsStore().$reset();
    useForeignProgressStore().$reset();
  } catch (e) {
    console.warn('[auth] signed-out cleanup failed', e);
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    session: null,
    email: null,
    error: null,
    sending: false,
    syncing: false,
    lastSyncAt: null,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  }),
  getters: {
    isSignedIn: (s): boolean => !!s.session,
    currentUserId: (s): string | null => s.session?.user.id ?? null,
  },
  actions: {
    async init(): Promise<void> {
      const sb = await getSb();
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      this.session = data.session;
      this.email = data.session?.user.email ?? null;
      if (this.session) void dispatchSignedIn();

      if (authSub) authSub.unsubscribe();
      const { data: subData } = sb.auth.onAuthStateChange((event, session) => {
        const prevId = this.session?.user.id ?? null;
        this.session = session;
        this.email = session?.user.email ?? null;
        const nextId = session?.user.id ?? null;
        if (event === 'SIGNED_IN' || (nextId && nextId !== prevId)) {
          void dispatchSignedIn();
        }
        if (event === 'SIGNED_OUT' || (!nextId && prevId)) {
          void dispatchSignedOut();
        }
      });
      authSub = subData.subscription;

      if (typeof window !== 'undefined') {
        if (onlineHandler) window.removeEventListener('online', onlineHandler);
        if (offlineHandler) window.removeEventListener('offline', offlineHandler);
        onlineHandler = (): void => {
          this.online = true;
        };
        offlineHandler = (): void => {
          this.online = false;
        };
        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);
      }
    },
    async sendMagicLink(email: string, redirectTo: string): Promise<void> {
      const sb = await getSb();
      if (!sb) {
        this.error = 'Supabase not configured';
        return;
      }
      this.sending = true;
      this.error = null;
      try {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) this.error = error.message;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Failed to send magic link';
      } finally {
        this.sending = false;
      }
    },
    async signInWithGoogle(redirectTo: string): Promise<void> {
      const sb = await getSb();
      if (!sb) {
        this.error = 'Supabase not configured';
        return;
      }
      this.sending = true;
      this.error = null;
      try {
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) this.error = error.message;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Google sign-in failed';
      } finally {
        this.sending = false;
      }
    },
    async signOut(): Promise<void> {
      const sb = await getSb();
      if (!sb) return;
      await sb.auth.signOut();
      this.session = null;
      this.email = null;
    },
    markSyncStart(): void {
      this.syncing = true;
    },
    markSyncEnd(): void {
      this.syncing = false;
      this.lastSyncAt = Date.now();
    },
  },
});
