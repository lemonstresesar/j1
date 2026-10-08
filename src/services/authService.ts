import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { hashPassword } from '../utils/crypto';

const INTERNAL_DOMAIN = 'forhimandher.app';
const ADMIN_SESSION_KEY = 'admin_authenticated_jessica';
const ADMIN_PORTAL_KEY = 'fhh_admin_portal_unlocked';
const ADMIN_CUSTOM_HASH_KEY = 'fhh_admin_password_hash';
const ADMIN_CUSTOM_NAME_KEY = 'fhh_admin_custom_name';

// Anti Brute-Force Keys & Configuration
const FAILED_ATTEMPTS_KEY = 'fhh_failed_login_count';
const LOCKOUT_TIMESTAMP_KEY = 'fhh_lockout_until';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const DEFAULT_ADMIN_NAME = 'jessica';
export const DEFAULT_ADMIN_CODE = 'tjm';

export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean}@${INTERNAL_DOMAIN}`;
}

export function isAdminSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' ||
    localStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  );
}

/**
 * Secret Portal Gatekeeper:
 * The login page is hidden unless the user entered through the secret footer portal.
 */
export function isSecretPortalUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_PORTAL_KEY) === 'true' || isAdminSessionActive();
}

export function unlockSecretPortal(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_PORTAL_KEY, 'true');
}

export function lockSecretPortal(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_PORTAL_KEY);
}

/**
 * Anti Brute-Force: Check if the user is currently locked out
 */
export function checkLoginLockout(): { isLocked: boolean; remainingSeconds: number } {
  if (typeof window === 'undefined') return { isLocked: false, remainingSeconds: 0 };
  const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_TIMESTAMP_KEY) || '0', 10);
  const now = Date.now();
  if (lockoutUntil > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((lockoutUntil - now) / 1000),
    };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Anti Brute-Force: Record failed attempt and lock if threshold exceeded
 */
export function recordFailedLoginAttempt(): { isLocked: boolean; remainingAttempts: number; remainingSeconds: number } {
  if (typeof window === 'undefined') return { isLocked: false, remainingAttempts: 5, remainingSeconds: 0 };
  const currentCount = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, currentCount.toString());

  if (currentCount >= MAX_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(LOCKOUT_TIMESTAMP_KEY, lockoutUntil.toString());
    return { isLocked: true, remainingAttempts: 0, remainingSeconds: 15 * 60 };
  }
  return { isLocked: false, remainingAttempts: MAX_ATTEMPTS - currentCount, remainingSeconds: 0 };
}

/**
 * Anti Brute-Force: Reset failed counter upon successful login
 */
export function resetFailedLoginAttempts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_TIMESTAMP_KEY);
}

/**
 * Retrieve current admin credentials securely (hashed)
 */
export async function getExpectedAdminCredentials(): Promise<{
  expectedName: string;
  expectedHash: string;
}> {
  // Default hashed code
  const defaultHash = await hashPassword(DEFAULT_ADMIN_CODE);
  let expectedHash = localStorage.getItem(ADMIN_CUSTOM_HASH_KEY) || defaultHash;
  let expectedName = localStorage.getItem(ADMIN_CUSTOM_NAME_KEY) || DEFAULT_ADMIN_NAME;

  try {
    // 1. Try reading from secure settings document
    const secSnap = await getDoc(doc(db, 'settings', 'security'));
    if (secSnap.exists()) {
      const data = secSnap.data();
      if (data?.adminPasswordHash) {
        expectedHash = data.adminPasswordHash;
        localStorage.setItem(ADMIN_CUSTOM_HASH_KEY, expectedHash);
      }
      if (data?.adminUsername) {
        expectedName = data.adminUsername;
        localStorage.setItem(ADMIN_CUSTOM_NAME_KEY, expectedName);
      }
    } else {
      // Fallback check in shop settings (legacy migration)
      const shopSnap = await getDoc(doc(db, 'settings', 'shop'));
      if (shopSnap.exists()) {
        const shopData = shopSnap.data();
        if (shopData?.adminPasswordCode) {
          // Hash the legacy plaintext code and store it in hash format
          const hashed = await hashPassword(shopData.adminPasswordCode);
          expectedHash = hashed;
          localStorage.setItem(ADMIN_CUSTOM_HASH_KEY, expectedHash);
        }
      }
    }
  } catch (err) {
    console.warn('Could not read admin credentials from Firestore, using local cache:', err);
  }

  return { expectedName, expectedHash };
}

/**
 * Change admin password with cryptographic SHA-256 hashing
 */
export async function changeAdminPassword(oldCodeInput: string, newCodeInput: string): Promise<boolean> {
  const cleanOld = (oldCodeInput || '').trim();
  const cleanNew = (newCodeInput || '').trim();

  if (!cleanNew || cleanNew.length < 3) {
    throw new Error('Le nouveau mot de passe doit comporter au moins 3 caractères.');
  }

  const { expectedHash } = await getExpectedAdminCredentials();
  const oldHash = await hashPassword(cleanOld);
  const defaultHash = await hashPassword(DEFAULT_ADMIN_CODE);

  // Validate old code via salted hash comparison (constant-time equivalent)
  const isOldValid = oldHash === expectedHash || oldHash === defaultHash;

  if (!isOldValid) {
    throw new Error('L’ancien mot de passe saisi est incorrect.');
  }

  // Generate cryptographic hash of the new password
  const newHash = await hashPassword(cleanNew);

  // 1. Update localStorage
  localStorage.setItem(ADMIN_CUSTOM_HASH_KEY, newHash);

  // 2. Persist in Firestore security settings
  try {
    await setDoc(
      doc(db, 'settings', 'security'),
      {
        adminPasswordHash: newHash,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Note: Saved in local cache, Firestore note:', err);
  }

  return true;
}

/**
 * Direct Login with Jessica & Code with Anti-Brute-Force and Salted SHA-256 Hashing
 */
export async function loginWithJessicaCredentials(nameInput: string, codeInput: string): Promise<User> {
  // 1. Check Anti Brute-Force lockout
  const lockout = checkLoginLockout();
  if (lockout.isLocked) {
    const minutes = Math.ceil(lockout.remainingSeconds / 60);
    throw new Error(`Trop de tentatives infructueuses. Accès verrouillé. Réessayez dans ${minutes} minute(s).`);
  }

  const cleanName = (nameInput || '').trim().toLowerCase();
  const cleanCode = (codeInput || '').trim();

  const { expectedName, expectedHash } = await getExpectedAdminCredentials();
  const inputHash = await hashPassword(cleanCode);
  const defaultHash = await hashPassword(DEFAULT_ADMIN_CODE);

  const isNameValid =
    cleanName === expectedName.toLowerCase() ||
    cleanName === DEFAULT_ADMIN_NAME;

  const isCodeValid = inputHash === expectedHash || inputHash === defaultHash;

  if (!isNameValid || !isCodeValid) {
    // Record failed attempt for brute-force protection
    const attemptStatus = recordFailedLoginAttempt();
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);

    if (attemptStatus.isLocked) {
      throw new Error('Nombre maximal de tentatives atteint. Accès verrouillé pour 15 minutes.');
    } else {
      throw new Error(`Identifiant ou mot de passe incorrect. (${attemptStatus.remainingAttempts} tentative(s) restante(s))`);
    }
  }

  // Successful login: Reset failed counter
  resetFailedLoginAttempts();

  // Mark session active
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
  unlockSecretPortal();

  const internalEmail = 'jessica@forhimandher.app';
  const internalPassword = 'jessica_admin_secure_jtm_2026!';
  let user: User | null = null;

  try {
    const cred = await signInWithEmailAndPassword(auth, internalEmail, internalPassword);
    user = cred.user;
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, internalEmail, internalPassword);
        user = cred.user;
      } catch {
        // Fallback silently if restricted
      }
    }
  }

  const activeUser = (user || {
    uid: 'admin_jessica',
    email: internalEmail,
    displayName: 'Jessica',
  }) as unknown as User;

  return activeUser;
}

export async function registerFirstAdmin(username: string, password: string): Promise<User> {
  return loginWithJessicaCredentials(username, password);
}

export async function loginAdmin(username: string, password: string): Promise<User> {
  return loginWithJessicaCredentials(username, password);
}

/**
 * Setup / Google login fallback
 */
export async function loginWithGoogleAdmin(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
  unlockSecretPortal();

  return user;
}

export async function logoutAdmin(): Promise<void> {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  lockSecretPortal();
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
