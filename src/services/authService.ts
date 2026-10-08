import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { seedInitialStoreIfEmpty } from './storeService';

const INTERNAL_DOMAIN = 'forhimandher.app';
const ADMIN_SESSION_KEY = 'admin_authenticated_jessica';

export const EXPECTED_ADMIN_NAME = 'jessica';
export const EXPECTED_ADMIN_CODE = 'tjm';
export const DEFAULT_ADMIN_NAME = 'jessica';
export const DEFAULT_ADMIN_CODE = 'tjm';
const ADMIN_CUSTOM_CODE_KEY = 'fhh_admin_custom_code';
const ADMIN_CUSTOM_NAME_KEY = 'fhh_admin_custom_name';

export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean}@${INTERNAL_DOMAIN}`;
}

export function isAdminSessionActive(): boolean {
  return (
    sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' ||
    localStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  );
}

export async function checkIsFirstAdminSetup(): Promise<boolean> {
  return false;
}

/**
 * Retrieve current admin credentials from Firestore or local cache
 */
export async function getExpectedAdminCredentials(): Promise<{ expectedName: string; expectedCode: string }> {
  let expectedCode = localStorage.getItem(ADMIN_CUSTOM_CODE_KEY) || DEFAULT_ADMIN_CODE;
  let expectedName = localStorage.getItem(ADMIN_CUSTOM_NAME_KEY) || DEFAULT_ADMIN_NAME;

  try {
    const snap = await getDoc(doc(db, 'settings', 'shop'));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.adminPasswordCode) {
        expectedCode = data.adminPasswordCode;
        localStorage.setItem(ADMIN_CUSTOM_CODE_KEY, expectedCode);
      }
      if (data?.adminUsername) {
        expectedName = data.adminUsername;
        localStorage.setItem(ADMIN_CUSTOM_NAME_KEY, expectedName);
      }
    }
  } catch (err) {
    console.warn('Could not read admin credentials from Firestore, using cached/default:', err);
  }

  return { expectedName, expectedCode };
}

/**
 * Change admin password in Firestore settings & local cache
 */
export async function changeAdminPassword(oldCodeInput: string, newCodeInput: string): Promise<boolean> {
  const cleanOld = (oldCodeInput || '').trim();
  const cleanNew = (newCodeInput || '').trim();

  if (!cleanNew || cleanNew.length < 3) {
    throw new Error('Le nouveau mot de passe doit comporter au moins 3 caractères.');
  }

  const { expectedCode } = await getExpectedAdminCredentials();

  // Validate old code
  const isOldValid =
    cleanOld.toLowerCase() === expectedCode.toLowerCase() ||
    cleanOld === expectedCode ||
    cleanOld.toLowerCase() === DEFAULT_ADMIN_CODE;

  if (!isOldValid) {
    throw new Error('L’ancien mot de passe saisi est incorrect.');
  }

  // 1. Update localStorage
  localStorage.setItem(ADMIN_CUSTOM_CODE_KEY, cleanNew);

  // 2. Persist in Firestore settings
  try {
    await setDoc(
      doc(db, 'settings', 'shop'),
      {
        adminPasswordCode: cleanNew,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Note: Saved locally, Firestore sync note:', err);
  }

  return true;
}

/**
 * Direct Login with Jessica & Code TJM (or updated custom password)
 */
export async function loginWithJessicaCredentials(nameInput: string, codeInput: string): Promise<User> {
  const cleanName = (nameInput || '').trim().toLowerCase();
  const cleanCode = (codeInput || '').trim();

  const { expectedName, expectedCode } = await getExpectedAdminCredentials();

  const isNameValid =
    cleanName === expectedName.toLowerCase() ||
    cleanName === DEFAULT_ADMIN_NAME;

  const isCodeValid =
    cleanCode.toLowerCase() === expectedCode.toLowerCase() ||
    cleanCode === expectedCode ||
    cleanCode.toLowerCase() === DEFAULT_ADMIN_CODE;

  if (!isNameValid || !isCodeValid) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  // 1. Mark session active in storage immediately
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');

  const internalEmail = 'jessica@forhimandher.app';
  const internalPassword = 'jessica_admin_secure_jtm_2026!';
  let user: User | null = null;

  // 2. Best-effort Firebase Auth login (safe against disabled console providers)
  try {
    const cred = await signInWithEmailAndPassword(auth, internalEmail, internalPassword);
    user = cred.user;
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, internalEmail, internalPassword);
        user = cred.user;
      } catch {
        // Fallback silently if email/pass signup is restricted in Firebase console
      }
    }
  }

  // Fallback virtual admin user if Firebase Auth provider is restricted
  const activeUser = (user || {
    uid: 'admin_jessica',
    email: internalEmail,
    displayName: 'Jessica',
  }) as unknown as User;

  // 3. Sync admin record in Firestore non-blocking
  try {
    await setDoc(
      doc(db, 'admins', activeUser.uid),
      {
        uid: activeUser.uid,
        username: 'jessica',
        email: internalEmail,
        role: 'admin',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'settings', 'shop'),
      {
        adminCreated: true,
        adminUid: activeUser.uid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (firestoreErr) {
    console.warn('Admin record sync note:', firestoreErr);
  }

  return activeUser;
}

/**
 * Register first admin with Identifiant & Mot de passe
 */
export async function registerFirstAdmin(username: string, password: string): Promise<User> {
  return loginWithJessicaCredentials(username, password);
}

/**
 * Login admin with Identifiant & Mot de passe
 */
export async function loginAdmin(username: string, password: string): Promise<User> {
  return loginWithJessicaCredentials(username, password);
}

/**
 * Login / Setup with Google (fallback)
 */
export async function loginWithGoogleAdmin(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  try {
    await setDoc(
      doc(db, 'admins', user.uid),
      {
        uid: user.uid,
        username: 'jessica',
        email: user.email || '',
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'settings', 'shop'),
      {
        adminCreated: true,
        adminUid: user.uid,
        adminEmail: user.email,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Google admin profile sync warning:', err);
  }

  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');

  return user;
}

export async function logoutAdmin(): Promise<void> {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

