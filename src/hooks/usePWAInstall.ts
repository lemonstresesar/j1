import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const PWA_INSTALLED_STORAGE_KEY = 'fhh_pwa_installed';

function checkIsAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check if running in standalone display mode (PWA window)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // 2. Check if launched from Android TWA / app wrapper
  const isFromApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  // 3. Check persistent install flag saved upon installation
  const hasInstalledFlag = localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === 'true';

  return isStandalone || isFromApp || hasInstalledFlag;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsAppInstalled());
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Continuous check
    const updateInstallStatus = () => {
      const installed = checkIsAppInstalled();
      setIsInstalled(installed);
    };

    updateInstallStatus();

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
      }
    };
    mediaQuery.addEventListener?.('change', handleMediaChange);

    // Platform detection
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    setIsIOS(ios);
    setIsAndroid(android);

    // Listen to beforeinstallprompt (Chromium, Edge, Chrome Android, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      // If already installed, prevent prompt
      if (checkIsAppInstalled()) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
        return true;
      }
    } catch (err) {
      console.error('Failed to trigger PWA prompt:', err);
    }
    return false;
  };

  return {
    deferredPrompt,
    isInstallable: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS,
    isAndroid,
    install,
  };
}
