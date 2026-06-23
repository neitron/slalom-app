import { defineStore } from 'pinia';
import type { Session, Subscription } from '@supabase/supabase-js';
import { sb } from '../storage/supabase';

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
  },
  actions: {
    async init(): Promise<void> {
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      this.session = data.session;
      this.email = data.session?.user.email ?? null;

      if (authSub) authSub.unsubscribe();
      const { data: subData } = sb.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        this.email = session?.user.email ?? null;
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
    async signOut(): Promise<void> {
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
