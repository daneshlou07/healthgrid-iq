import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getAuth,
  Auth,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

/**
 * Demo data and account switching are intentionally available only while
 * developing locally. A production deployment without Firebase configuration
 * must fail closed instead of silently granting a mock administrator session.
 */
export function isDemoMode(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'false';
}

/**
 * Returns true if real Firebase environment variables are provided.
 * When false, the app refuses to connect and shows a config-error banner.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );
}

/**
 * Get the Firebase app instance (lazy initialization, singleton).
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;

  // Reuse existing app if already initialized
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}

/**
 * Get the Firestore database instance.
 * Ensures Firebase Auth is initialised first so the Firestore SDK has
 * access to the current user's token for security rule evaluation.
 */
export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  // Ensure auth instance exists so the Firestore SDK can attach the token.
  // getAuth() is synchronous and returns the existing instance if already created.
  if (!_authInstance) {
    _authInstance = getAuth(app);
  }
  return getFirestore(app);
}

/**
 * Get the Firebase Auth instance.
 * Sets session persistence so the user is logged out when the browser tab closes.
 * This is appropriate for a healthcare system where workstations may be shared.
 */
let _authInstance: Auth | null = null;
export async function getFirebaseAuth(): Promise<Auth | null> {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!_authInstance) {
    const auth = getAuth(app);
    try {
      // Session persistence: token is cleared when the browser tab/window closes.
      // Staff cannot accidentally leave a session open on a shared workstation.
      await setPersistence(auth, browserSessionPersistence);
    } catch (e) {
      console.warn('Failed to set session persistence:', e);
    }
    _authInstance = auth;
  }
  return _authInstance;
}

/**
 * Synchronous getter for Auth (use only where async is not possible).
 * Does NOT apply custom persistence — prefer getFirebaseAuth() instead.
 */
export function getFirebaseAuthSync(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return _authInstance ?? getAuth(app);
}

/**
 * Get the Firebase Storage instance.
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getStorage(app);
}

/**
 * Retrieve a fresh Firebase ID token for the currently signed-in user.
 * This is attached to every API request as: Authorization: Bearer <token>
 *
 * @param forceRefresh - Pass true to force a token refresh from Firebase servers.
 * @returns The ID token string, or null if no user is signed in.
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuthSync();
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
}

/**
 * Wait for Firebase Auth to restore the user's session.
 * Returns the current user, or null if not signed in.
 * This must be called before any Firestore write to ensure the auth
 * token is attached to the request.
 */
export function waitForAuthReady(): Promise<import('firebase/auth').User | null> {
  return new Promise((resolve) => {
    const app = getFirebaseApp();
    if (!app) { resolve(null); return; }
    const auth = _authInstance ?? getAuth(app);
    // onAuthStateChanged fires immediately with the current user
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Export config for debug purposes (never logs API key)
export function getFirebaseProjectId(): string {
  return firebaseConfig.projectId;
}
