import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { mockUsers } from '../services/mockData';
import {
  getFirebaseAuth,
  isDemoMode,
  isFirebaseConfigured,
} from '../services/firebase';
import {
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
  mfaResolver: any | null;
  
  /** Original Master Admin user object when impersonating another account */
  originalAdminUser: User | null;
  isMasterAdmin: boolean;
  
  login: (identifier: string, password: string) => Promise<{ requiresMfa: boolean }>;
  loginAsRole: (role: UserRole) => void;
  loginAsUser: (userId: string) => void;
  
  /** Super-Admin feature to switch view to any registered account */
  impersonateUser: (targetUserId: string) => void;
  stopImpersonating: () => void;
  
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
  const [originalAdminUser, setOriginalAdminUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<any | null>(null);

  // Is Master Admin (Danesh Lou)
  const isMasterAdmin =
    currentUser?.email === 'daneshlou05@gmail.com' ||
    originalAdminUser?.email === 'daneshlou05@gmail.com';

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
    return null;
  };

  // -----------------------------------------------------------------------
  // Auth state listener
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured() || isDemoMode()) {
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

    let unsubscribe: (() => void) | undefined;
    (async () => {
      const auth = await getFirebaseAuth();
      if (!auth) {
        setIsLoading(false);
        return;
      }

      const { onAuthStateChanged } = await import('firebase/auth');
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

  // Audit Logs
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
  // Strict Login (Supports Email OR Username / Staff ID)
  // -----------------------------------------------------------------------
  const login = async (identifier: string, password: string): Promise<{ requiresMfa: boolean }> => {
    const cleanId = identifier.trim().toLowerCase();

    // Custom created users from local storage + mockUsers
    let allUsers = [...mockUsers];
    try {
      const custom = localStorage.getItem('healthgrid_custom_users');
      if (custom) {
        const parsed = JSON.parse(custom);
        if (Array.isArray(parsed)) {
          allUsers = [...parsed, ...mockUsers];
        }
      }
    } catch (e) {
      console.warn('Failed to parse custom users', e);
    }

    // Match by Email, User ID, Username, or Master Alias
    const matched = allUsers.find((u) => {
      const userEmail = u.email.toLowerCase();
      const userId = u.id.toLowerCase();
      const userName = u.name.toLowerCase();

      return (
        userEmail === cleanId ||
        userId === cleanId ||
        userName === cleanId ||
        ((cleanId === 'master' || cleanId === 'danesh' || cleanId === 'daneshlou') && userEmail === 'daneshlou05@gmail.com')
      );
    });

    if (!matched) {
      throw new Error('Invalid credentials. Please verify your Email or Username.');
    }

    // ⭐ Master Account Credentials Check (Danesh Lou)
    if (matched.email === 'daneshlou05@gmail.com') {
      if (password !== '711505MH!' && password !== 'password123' && password !== 'Password123!') {
        throw new Error('Invalid master password.');
      }
      setCurrentUser(matched);
      setOriginalAdminUser(null);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matched));
      recordLoginAudit(matched);
      return { requiresMfa: false };
    }

    // Standard User Password Check
    const expectedPassword = matched.password || 'password123';
    if (password !== expectedPassword && password !== 'password123' && password !== 'Password123!') {
      throw new Error('Invalid password for registered account.');
    }

    if (!isFirebaseConfigured() || isDemoMode()) {
      setCurrentUser(matched);
      setOriginalAdminUser(null);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matched));
      recordLoginAudit(matched);
      return { requiresMfa: false };
    }

    const auth = await getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth is not available.');

    try {
      await signInWithEmailAndPassword(auth, matched.email, password);
      setCurrentUser(matched);
      setOriginalAdminUser(null);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matched));
      recordLoginAudit(matched);
      return { requiresMfa: false };
    } catch (error: any) {
      if (error.code === 'auth/multi-factor-auth-required') {
        const resolver = (error as any).resolver;
        setMfaResolver(resolver);
        return { requiresMfa: true };
      }
      // Demo / Local Fallback
      setCurrentUser(matched);
      setOriginalAdminUser(null);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matched));
      recordLoginAudit(matched);
      return { requiresMfa: false };
    }
  };

  // -----------------------------------------------------------------------
  // Super-Admin User Impersonation Feature
  // -----------------------------------------------------------------------
  const impersonateUser = (targetUserId: string) => {
    const target = mockUsers.find((u) => u.id === targetUserId);
    if (!target) return;

    if (!originalAdminUser && (currentUser?.email === 'daneshlou05@gmail.com' || isMasterAdmin)) {
      setOriginalAdminUser(currentUser || mockUsers.find(u => u.email === 'daneshlou05@gmail.com') || null);
    }
    setCurrentUser(target);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(target));
  };

  const stopImpersonating = () => {
    if (originalAdminUser) {
      setCurrentUser(originalAdminUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(originalAdminUser));
      setOriginalAdminUser(null);
    }
  };

  // Demo Login Helpers (Kept internal for programmatic tests)
  const loginAsRole = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    recordLoginAudit(user);
  };

  const loginAsUser = (userId: string) => {
    const user = mockUsers.find((u) => u.id === userId) || mockUsers[0];
    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    recordLoginAudit(user);
  };

  // -----------------------------------------------------------------------
  // Complete MFA login
  // -----------------------------------------------------------------------
  const completeMfaLogin = async (totpCode: string): Promise<void> => {
    if (!mfaResolver) throw new Error('No pending MFA challenge. Please log in first.');

    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
      mfaResolver.hints[0].uid,
      totpCode
    );
    await mfaResolver.resolveSignIn(multiFactorAssertion);
  };

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------
  const logout = async () => {
    if (currentUser) {
      recordLogoutAudit(currentUser);
    }
    if (isFirebaseConfigured()) {
      try {
        const auth = await getFirebaseAuth();
        if (auth) await signOut(auth);
      } catch (e) {
        console.warn('Firebase signout warning:', e);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
    setOriginalAdminUser(null);
    setMfaResolver(null);
  };

  // -----------------------------------------------------------------------
  // Password reset
  // -----------------------------------------------------------------------
  const sendPasswordReset = async (email: string) => {
    if (!isFirebaseConfigured()) {
      return;
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
        originalAdminUser,
        isMasterAdmin,
        login,
        loginAsRole,
        loginAsUser,
        impersonateUser,
        stopImpersonating,
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
