/**
 * Order Notification Sound & Web Notification Utility
 * 
 * STRICT PRIVACY RULE: Only the authenticated seller/admin can receive notifications!
 * Regular clients and visitors MUST NEVER receive notifications for orders.
 */

import { isAdminSessionActive } from '../services/authService';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a pleasant luxury double-chime bell notification (587Hz -> 880Hz)
 * EXCLUSIVELY for the authenticated seller.
 */
export function playNewOrderSound() {
  // ABSOLUTE SECURITY CHECK: Clients must NEVER hear order chimes!
  if (!isAdminSessionActive()) {
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1st Tone (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);

    // 2nd Tone (A5 - 880 Hz, higher harmonic sparkle)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.15);
    osc2.stop(now + 1.0);
  } catch (err) {
    console.warn('Could not play audio notification:', err);
  }
}

/**
 * Request notification permission from browser (seller only)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isAdminSessionActive()) {
    return 'denied';
  }
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'default';
  }
}

/**
 * Dispatch desktop / mobile browser notification (seller only)
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  // ABSOLUTE SECURITY CHECK: Clients must NEVER receive browser order notifications!
  if (!isAdminSessionActive()) {
    return;
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      ...options,
    } as any);
  } catch (err) {
    console.warn('Browser notification error:', err);
  }
}
