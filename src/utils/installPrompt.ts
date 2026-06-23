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
  isSafari: boolean;        // real Safari (iOS or macOS)
  isIOSChrome: boolean;     // Chrome on iOS (CriOS)
  isIOSFirefox: boolean;
  isIOSEdge: boolean;
  isChromium: boolean;      // Chromium-family desktop / Android
  isFirefox: boolean;
  isStandalone: boolean;
  isMobile: boolean;
  isInAppBrowser: boolean;
  inAppName: string | null;
}

export function detectPlatform(): PlatformInfo {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return {
      isIOS: false, isAndroid: false, isSafari: false,
      isIOSChrome: false, isIOSFirefox: false, isIOSEdge: false,
      isChromium: false, isFirefox: false,
      isStandalone: false, isMobile: false,
      isInAppBrowser: false, inAppName: null,
    };
  }
  const ua = navigator.userAgent;

  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);

  const isIOSChrome = isIOS && /CriOS/.test(ua);
  const isIOSFirefox = isIOS && /FxiOS/.test(ua);
  const isIOSEdge = isIOS && /EdgiOS/.test(ua);

  const isSafari = isIOS
    ? !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua) && /Safari/.test(ua)
    : /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);

  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isChromium = !isFirefox && (/Chrome|Chromium|Edg/.test(ua) && !isIOS || /Edg\//.test(ua));

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;

  // In-app browser detection. Most embeds advertise themselves in UA;
  // those that don't (Telegram, WhatsApp on iOS) look like Safari but
  // lack navigator.standalone — we use that as a soft signal too.
  const inAppMatches: Array<[RegExp, string]> = [
    [/FBAN|FBAV|FBIOS|FB_IAB/, 'Facebook'],
    [/Instagram/, 'Instagram'],
    [/Line\//, 'LINE'],
    [/Twitter|TwitterAndroid/, 'X / Twitter'],
    [/LinkedInApp/, 'LinkedIn'],
    [/TikTok|musical_ly|Bytedance|Aweme/, 'TikTok'],
    [/WeChat|MicroMessenger/, 'WeChat'],
    [/Snapchat/, 'Snapchat'],
    [/Pinterest/, 'Pinterest'],
    [/Telegram/, 'Telegram'],
    [/Discord/, 'Discord'],
    [/Slack/, 'Slack'],
  ];
  let inAppName: string | null = null;
  for (const [re, name] of inAppMatches) {
    if (re.test(ua)) { inAppName = name; break; }
  }
  // Soft signal for iOS WKWebView embeds with stripped UA (Telegram, some others)
  if (!inAppName && isIOS && !isStandalone) {
    const std = (navigator as Navigator & { standalone?: boolean }).standalone;
    if (std === undefined) inAppName = 'In-app browser';
  }
  const isInAppBrowser = inAppName !== null;

  return {
    isIOS, isAndroid, isSafari,
    isIOSChrome, isIOSFirefox, isIOSEdge,
    isChromium, isFirefox,
    isStandalone, isMobile: isIOS || isAndroid,
    isInAppBrowser, inAppName,
  };
}
