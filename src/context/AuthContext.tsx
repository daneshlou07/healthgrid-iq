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
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
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
  impersonateUser: (targetUserId: string, targetUserObj?: User) => void;
  stopImpersonating: () => void;
  
  completeMfaLogin: (totpCode: string) => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  registerMarketplaceUser: (data: {
    name: string;
    email: string;
    organization: string;
    phone: string;
    password: string;
  }) => Promise<User>;
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

  // Is Master Admin (Danesh Lou / Super Admin / Administrator)
  const isMasterAdmin =
    currentUser?.email === 'daneshlou05@gmail.com' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Administrator' ||
    originalAdminUser?.email === 'daneshlou05@gmail.com' ||
    originalAdminUser?.role === 'Super Admin' ||
    originalAdminUser?.role === 'Administrator';

  // -----------------------------------------------------------------------
  // Map a Firebase user → HealthGrid User profile by reading Firestore
  // -----------------------------------------------------------------------
  const loadUserProfile = async (uid: string, email: string | null): Promise<User | null> => {
    const db = getFirestoreDb();
    if (!db) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
    } catch (err) {
      console.warn('loadUserProfile failed:', err);
    }
    return null;
  };

  // Helper to persist user session securely without storing password
  const saveUserSession = (user: User | null) => {
    if (!user) {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      setCurrentUser(null);
      return;
    }
    const safeUser = { ...user };
    delete safeUser.password;
    setCurrentUser(safeUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(safeUser));
  };

  // -----------------------------------------------------------------------
  // Auth state initialization
  // -----------------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      try {
        const userObj = JSON.parse(saved);
        if (userObj?.password) delete userObj.password;
        setCurrentUser(userObj);
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        setCurrentUser(null);
      }
    }
    setIsLoading(false);
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
  // Production Login (Direct Real-time Firestore Database Query)
  // -----------------------------------------------------------------------
  const login = async (identifier: string, password: string): Promise<{ requiresMfa: boolean }> => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      throw new Error('Please enter your Email, Staff ID, or Username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    let matched: User | null = null;
    const db = getFirestoreDb();

    const matchUser = (u: User) => {
      const email = (u.email || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      const emailPrefix = email.split('@')[0];

      return (
        email === cleanId ||
        id === cleanId ||
        name === cleanId ||
        emailPrefix === cleanId ||
        // BEMS aliases
        ((cleanId === 'bems' || cleanId === 'bemz' || cleanId === 'khairul') && (u.role === 'BEMS Officer' || u.role === 'BEMZ' || u.id === 'bemz-001')) ||
        // Public Hospital Admin aliases
        ((cleanId === 'publicadmin' || cleanId === 'pubadmin' || cleanId === 'hkladmin' || cleanId === 'hkl' || cleanId === 'public.admin') && (u.role === 'Public Hospital Admin' || u.id === 'pub-admin-001')) ||
        // Private Hospital Admin aliases
        ((cleanId === 'private' || cleanId === 'priv' || cleanId === 'privateadmin' || cleanId === 'privadmin' || cleanId === 'kpj' || cleanId === 'sarah') && (u.role === 'Private Hospital Admin' || u.id === 'priv-admin-001')) ||
        // Public Hospital Radiographer aliases
        ((cleanId === 'public' || cleanId === 'pub' || cleanId === 'publicrad' || cleanId === 'pubrad' || cleanId === 'noraini') && (u.role === 'Public Hospital Radiographer' || u.id === 'pub-rad-001')) ||
        // Private Hospital Radiographer aliases
        ((cleanId === 'privaterad' || cleanId === 'privrad' || cleanId === 'david') && (u.role === 'Private Hospital Radiographer' || u.id === 'priv-rad-001')) ||
        // Medical Officer aliases
        ((cleanId === 'mo' || cleanId === 'doctor' || cleanId === 'michelle') && (u.role === 'Medical Officer' || u.id === 'mo-001')) ||
        // Radiographer aliases
        ((cleanId === 'rad' || cleanId === 'radiographer' || cleanId === 'ahmad') && (u.role === 'Radiographer' || u.id === 'rad-001')) ||
        // Radiologist aliases
        ((cleanId === 'radiologist' || cleanId === 'amira') && (u.role === 'Radiologist' || u.id === 'rologist-001')) ||
        // Admin aliases
        ((cleanId === 'admin' || cleanId === 'noraishah') && (u.role === 'Administrator' || u.id === 'admin-001')) ||
        // Super Admin aliases
        ((cleanId === 'master' || cleanId === 'danesh' || cleanId === 'daneshlou') && email === 'daneshlou05@gmail.com') ||
        ((cleanId === 'superadmin' || cleanId === 'theta' || cleanId === 'thetaadmin') && u.role === 'Super Admin') ||
        ((cleanId === 'marketplace' || cleanId === 'procurement' || cleanId === 'farid') && u.role === 'Equipment Marketplace')
      );
    };

    // 1. Check Live Firestore Database in Real Time
    if (db && isFirebaseConfigured()) {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const firestoreUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
        matched = firestoreUsers.find(matchUser) || null;

        // If not in Firestore yet, find in base pool and write directly to Firestore database
        if (!matched) {
          const fallbackMatch = mockUsers.find(matchUser);
          if (fallbackMatch) {
            matched = fallbackMatch;
            await setDoc(doc(db, 'users', matched.id), matched, { merge: true });
          }
        }
      } catch (err) {
        console.warn('Firestore user fetch during login failed, checking fallback pool:', err);
      }
    }

    // 2. Local Persistent Cache Fallback
    if (!matched) {
      let localPool = [...mockUsers];
      try {
        const custom = localStorage.getItem('healthgrid_custom_users');
        if (custom) {
          const parsed = JSON.parse(custom);
          if (Array.isArray(parsed)) {
            localPool = [...parsed, ...mockUsers];
          }
        }
      } catch (e) {
        console.warn('Failed to parse local pool users:', e);
      }

      matched = localPool.find(matchUser) || null;
    }

    if (!matched) {
      throw new Error('Invalid credentials. User account not found in system directory.');
    }

    if (matched.status === 'inactive') {
      throw new Error('This account has been deactivated. Please contact your System Administrator.');
    }

    // ⭐ Master Account Credentials Check (Danesh Lou)
    if (matched.email === 'daneshlou05@gmail.com') {
      const isMasterValid =
        password === '711505MH!' ||
        password === 'password123' ||
        password === 'Password123!' ||
        password === (matched.password || '');

      if (!isMasterValid) {
        throw new Error('Invalid master password.');
      }
      setOriginalAdminUser(null);
      saveUserSession(matched);
      recordLoginAudit(matched);
      return { requiresMfa: false };
    }

    // Standard Database Password Verification (Allows master password bypass for Master Admin)
    const expectedPassword = matched.password || 'password123';
    const isPasswordValid =
      password === expectedPassword ||
      password === '711505MH!' ||
      (password === 'password123' && !matched.password) ||
      (password === 'Password123!' && !matched.password);

    if (!isPasswordValid) {
      throw new Error('Invalid password for registered account.');
    }

    setOriginalAdminUser(null);
    saveUserSession(matched);
    recordLoginAudit(matched);
    return { requiresMfa: false };
  };

  // -----------------------------------------------------------------------
  // Super-Admin User Impersonation Feature
  // -----------------------------------------------------------------------
  const impersonateUser = (targetUserId: string, targetUserObj?: User) => {
    let target = targetUserObj || mockUsers.find((u) => u.id === targetUserId);
    if (!target) {
      try {
        const custom = localStorage.getItem('healthgrid_custom_users');
        if (custom) {
          const list: User[] = JSON.parse(custom);
          target = list.find((u) => u.id === targetUserId);
        }
      } catch {}
    }
    if (!target) return;

    if (!originalAdminUser && (currentUser?.email === 'daneshlou05@gmail.com' || isMasterAdmin)) {
      setOriginalAdminUser(currentUser || mockUsers.find(u => u.email === 'daneshlou05@gmail.com') || null);
    }
    saveUserSession(target);
  };

  const stopImpersonating = () => {
    if (originalAdminUser) {
      saveUserSession(originalAdminUser);
      setOriginalAdminUser(null);
    }
  };

  // Demo Login Helpers (Kept internal for programmatic tests)
  const loginAsRole = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    saveUserSession(user);
    recordLoginAudit(user);
  };

  const loginAsUser = (userId: string) => {
    const user = mockUsers.find((u) => u.id === userId) || mockUsers[0];
    saveUserSession(user);
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
    saveUserSession(null);
    setOriginalAdminUser(null);
    setMfaResolver(null);
  };

  // -----------------------------------------------------------------------
  // Update Current User in Session and Local Storage
  // -----------------------------------------------------------------------
  const updateCurrentUser = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    saveUserSession(updated);
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

  // -----------------------------------------------------------------------
  // Self-Service Registration for Equipment Marketplace Users
  // -----------------------------------------------------------------------
  const registerMarketplaceUser = async (data: {
    name: string;
    email: string;
    organization: string;
    phone: string;
    password: string;
  }): Promise<User> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    if (!cleanName || !cleanEmail || !data.password) {
      throw new Error('Please fill in all required fields.');
    }

    const newUserId = `mkt-${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      role: 'Equipment Marketplace',
      status: 'active',
      phone: data.phone.trim() || undefined,
      specialty: data.organization.trim() || 'Institutional Procurement',
      password: data.password,
      createdAt: new Date().toISOString(),
    };

    // 1. Save to local storage custom users
    try {
      const existing = localStorage.getItem('healthgrid_custom_users');
      const list: User[] = existing ? JSON.parse(existing) : [];
      const updated = [newUser, ...list.filter((u) => u.email.toLowerCase() !== cleanEmail)];
      localStorage.setItem('healthgrid_custom_users', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save to local custom users pool:', err);
    }

    // 2. Save to Firestore if available
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await setDoc(doc(db, 'users', newUserId), newUser, { merge: true });
      } catch (err) {
        console.warn('Failed to persist registered marketplace user to Firestore:', err);
      }
    }

    // Auto-login newly registered user
    saveUserSession(newUser);
    recordLoginAudit(newUser);

    return newUser;
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
        updateCurrentUser,
        logout,
        sendPasswordReset,
        registerMarketplaceUser,
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
