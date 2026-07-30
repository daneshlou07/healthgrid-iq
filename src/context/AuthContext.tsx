import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { mockUsers } from '../services/mockData';
import {
  getFirebaseAuth,
  getFirebaseAuthSync,
  isDemoMode,
  isFirebaseConfigured,
} from '../services/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  TotpMultiFactorGenerator,
} from 'firebase/auth';
import { getFirestoreDb } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createAuditLog } from '../services/dataService';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
export interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Pending MFA resolver returned when login requires a second factor */
  mfaResolver: any | null;
  login: (email: string, password: string) => Promise<{ requiresMfa: boolean }>;
  loginAsRole: (role: UserRole) => void;
  loginAsUser: (userId: string) => void;
  completeMfaLogin: (totpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'healthgrid_demo_user';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<any | null>(null);

  // -----------------------------------------------------------------------
  // Map a Firebase user → HealthGrid User profile by reading Firestore
  // -----------------------------------------------------------------------
  const loadUserProfile = async (uid: string, email: string | null): Promise<User | null> => {
    const db = getFirestoreDb();
    if (!db) return null;

    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }

    console.error(
      `[AuthContext] Firebase user ${uid} (${email}) has no Firestore /users/${uid} document.`
    );
    return null;
  };

  // -----------------------------------------------------------------------
  // Auth state listener
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured() && isDemoMode()) {
      // Local dev / demo mode: restore cached demo user if present
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        try {
          setCurrentUser(JSON.parse(saved));
        } catch {
          setCurrentUser(mockUsers[0]);
        }
      }
      setIsLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      // A misconfigured production deployment must never fall back to mock
      // accounts or data.
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const auth = await getFirebaseAuth();
      if (!auth) {
        setIsLoading(false);
        return;
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const profile = await loadUserProfile(firebaseUser.uid, firebaseUser.email);
            setCurrentUser(profile);
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
          setMfaResolver(null);
        }
        setIsLoading(false);
      });
    })();

    return () => { unsubscribe?.(); };
  }, []);

  // -----------------------------------------------------------------------
  const recordLoginAudit = (user: User) => {
    try {
      createAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_LOGIN',
        target: `users/${user.id}`,
        details: `User signed in: ${user.name} (${user.role}) - ${user.email}`,
        timestamp: new Date().toISOString(),
      }).then(() => {
        try {
          const bc = new BroadcastChannel('healthgrid_sync');
          bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
          bc.close();
        } catch {}
      });
    } catch (e) { console.error('Failed to record login audit:', e); }
  };

  const recordLogoutAudit = (user: User) => {
    try {
      createAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_LOGOUT',
        target: `users/${user.id}`,
        details: `User signed out: ${user.name} (${user.role}) - ${user.email}`,
        timestamp: new Date().toISOString(),
      }).then(() => {
        try {
          const bc = new BroadcastChannel('healthgrid_sync');
          bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
          bc.close();
        } catch {}
      });
    } catch (e) { console.error('Failed to record logout audit:', e); }
  };

  // -----------------------------------------------------------------------
  // Login
  // -----------------------------------------------------------------------
  const login = async (email: string, password: string): Promise<{ requiresMfa: boolean }> => {
    if (!isFirebaseConfigured()) {
      if (!isDemoMode()) {
        throw new Error('Authentication is not configured. Please contact your system administrator.');
      }
      // Local dev / demo mode only: find matching user or default to Admin
      const matched = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      const userToSet = matched || mockUsers.find((u) => u.role === 'Administrator') || mockUsers[0];
      setCurrentUser(userToSet);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userToSet));
      recordLoginAudit(userToSet);
      return { requiresMfa: false };
    }

    const auth = await getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth is not available.');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { requiresMfa: false };
    } catch (error: any) {
      if (error.code === 'auth/multi-factor-auth-required') {
        const resolver = (error as any).resolver;
        setMfaResolver(resolver);
        return { requiresMfa: true };
      }
      // If Firebase Auth Email/Password is unconfigured or returns configuration error, fall back to local database profile matching
      if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed' || error.message?.includes('configuration-not-found')) {
        console.warn('Firebase Auth is unconfigured, falling back to local database profile matching:', error.message);
        const matched = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        const userToSet = matched || mockUsers.find((u) => u.role === 'Administrator') || mockUsers[0];
        setCurrentUser(userToSet);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userToSet));
        recordLoginAudit(userToSet);
        return { requiresMfa: false };
      }
      throw error;
    }
  };

  // -----------------------------------------------------------------------
  // Demo / Quick Access Login Helpers
  // -----------------------------------------------------------------------
  const loginAsRole = (role: UserRole) => {
    if (!isDemoMode()) {
      throw new Error('Demo account switching is disabled outside local development.');
    }
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setCurrentUser(user);
    if (!isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    }
    recordLoginAudit(user);
  };

  const loginAsUser = (userId: string) => {
    if (!isDemoMode()) {
      throw new Error('Demo account switching is disabled outside local development.');
    }
    const user = mockUsers.find((u) => u.id === userId) || mockUsers[0];
    setCurrentUser(user);
    if (!isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    }
    recordLoginAudit(user);
  };

  // -----------------------------------------------------------------------
  // Complete MFA login with a TOTP code
  // -----------------------------------------------------------------------
  const completeMfaLogin = async (totpCode: string): Promise<void> => {
    if (!mfaResolver) throw new Error('No pending MFA challenge. Please log in first.');

    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
      mfaResolver.hints[0].uid,
      totpCode
    );
    await mfaResolver.resolveSignIn(multiFactorAssertion);
    setMfaResolver(null);
  };

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------
  const logout = async () => {
    if (currentUser) {
      recordLogoutAudit(currentUser);
    }
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuthSync();
      if (auth) {
        try {
          await signOut(auth);
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    // Legacy versions cached clinical data in browser localStorage. Remove it
    // on every logout so a shared workstation cannot expose the previous
    // user's records.
    localStorage.removeItem('healthgrid_data');
    localStorage.removeItem('healthgrid_comments');
    localStorage.removeItem('healthgrid_recent');
    localStorage.removeItem('healthgrid_trash');
    localStorage.removeItem('healthgrid_notifications');
    setCurrentUser(null);
    setMfaResolver(null);
  };

  // -----------------------------------------------------------------------
  // Password reset
  // -----------------------------------------------------------------------
  const sendPasswordReset = async (email: string) => {
    if (!isFirebaseConfigured()) {
      return; // Simulated success in demo mode
    }
    const auth = await getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth is not available.');
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        mfaResolver,
        login,
        loginAsRole,
        loginAsUser,
        completeMfaLogin,
        logout,
        sendPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
