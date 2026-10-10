/**
 * Audio and Web Notifications exclusively for Admin / Seller Space
 */
import { Order } from '../types';
import { formatFCFA } from './formatters';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('Web Audio API not supported or blocked:', e);
    return null;
  }
}

/**
 * Play a crystal-clear melodic bell chime (Ding-Dong) for incoming seller orders
 */
export function playOrderNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: High crisp chime (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.65);

    // Tone 2: Harmonic rich chime (B5 - 987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.95);

    // Tone 3: Sparkling high tone (E6 - 1318.51 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.51, now + 0.25);
    gain3.gain.setValueAtTime(0, now + 0.25);
    gain3.gain.linearRampToValueAtTime(0.28, now + 0.28);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.25);
    osc3.stop(now + 1.25);
  } catch (err) {
    console.warn('Error playing order notification sound:', err);
  }
}

/**
 * Play an order acceptance success sound
 */
export function playOrderAcceptedSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18); // C6
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch (err) {
    console.warn('Error playing order accepted sound:', err);
  }
}

/**
 * Request notification permission from the seller's browser/PWA
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return 'denied';
  }
}

/**
 * Trigger a native system push/desktop notification for incoming order
 */
export function showOrderPushNotification(order: Order): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const ref = order.id.slice(-6).toUpperCase();
    const clientName = `${order.clientFirstName} ${order.clientLastName}`;
    const amount = formatFCFA(order.total);
    const title = `🔔 Nouvelle commande #${ref} !`;
    const body = `${clientName} • ${amount} (${order.items.length} article${order.items.length > 1 ? 's' : ''})\nLieu : ${order.deliveryLocation}`;

    const notif = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      tag: `order-${order.id}`,
      requireInteraction: true,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.warn('Error displaying native notification:', err);
  }
}
