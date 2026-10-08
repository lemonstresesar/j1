/**
 * Cryptographic security utilities
 * Secure SHA-256 hashing with salt for admin authentication
 */

const AUTH_SALT = 'FHH_SECURE_SALT_DOUALA_2026_JESSICA_TJM_V1';

/**
 * Computes a salted SHA-256 hash of a string using the native Web Crypto API
 */
export async function hashPassword(input: string): Promise<string> {
  const normalized = (input || '').trim().toLowerCase();
  const salted = `${AUTH_SALT}::${normalized}::${AUTH_SALT}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(salted);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitizes user input to prevent XSS / script injection
 */
export function sanitizeInput(input: string, maxLength: number = 200): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip javascript protocol
    .replace(/on\w+=/gi, '') // Strip inline event handlers
    .slice(0, maxLength);
}
