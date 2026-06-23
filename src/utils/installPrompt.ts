import { ref } from 'vue';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const deferred = ref<BeforeInstallPromptEvent | null>(null);
const installed = ref(false);

let wired = false;

export function setupInstallPromptCapture(): void {
  if (wired) return;
  if (typeof window === 'undefined') return;
  wired = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred.value = e as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    deferred.value = null;
    installed.value = true;
  });
}

export function useInstallPrompt(): {
  available: () => boolean;
  installed: () => boolean;
  prompt: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
} {
  return {
    available: () => deferred.value !== null,
    installed: () => installed.value,
    async prompt() {
      const ev = deferred.value;
      if (!ev) return 'unsupported';
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        deferred.value = null;
        return choice.outcome;
      } catch {
        return 'unsupported';
      }
    },
  };
}

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChromium: boolean;
  isFirefox: boolean;
  isStandalone: boolean;
  isMobile: boolean;
}

export function detectPlatform(): PlatformInfo {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return {
      isIOS: false, isAndroid: false, isSafari: false, isChromium: false,
      isFirefox: false, isStandalone: false, isMobile: false,
    };
  }
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isChromium = !isFirefox && /Chrome|Chromium|Edg|CriOS/.test(ua) && !/OPR\//.test(ua) || /Edg\//.test(ua);
  const isSafari = isIOS
    ? !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && /Safari/.test(ua)
    : /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    isIOS, isAndroid, isSafari, isChromium, isFirefox, isStandalone,
    isMobile: isIOS || isAndroid,
  };
}
