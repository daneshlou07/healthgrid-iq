import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { mockUsers } from '../services/mockData';
import { getFirebaseAuth, isFirebaseConfigured } from '../services/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestoreDb } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createAuditLog } from '../services/dataService';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  loginAsUser: (userId: string) => void;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured()) {
      // Real Firebase Auth listener
      const auth = getFirebaseAuth();
      if (!auth) {
        setIsLoading(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Fetch full user profile from Firestore
            const db = getFirestoreDb();
            if (db) {
              const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
              if (userDoc.exists()) {
                const userData = { id: userDoc.id, ...userDoc.data() } as User;
                setCurrentUser(userData);
                localStorage.setItem('healthgrid_user', JSON.stringify(userData));
              } else {
                // User exists in Auth but not in Firestore — map by email
                const matchedUser = mockUsers.find((u) => u.email === firebaseUser.email);
                if (matchedUser) {
                  setCurrentUser(matchedUser);
                  localStorage.setItem('healthgrid_user', JSON.stringify(matchedUser));
                } else {
                  setCurrentUser(null);
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // Restore from localStorage as fallback
            const savedUser = localStorage.getItem('healthgrid_user');
            if (savedUser) {
              setCurrentUser(JSON.parse(savedUser));
            }
          }
        } else {
          setCurrentUser(null);
          localStorage.removeItem('healthgrid_user');
        }
        setIsLoading(false);
      });

      return unsubscribe;
    } else {
      // Demo mode: restore from localStorage
      const savedUser = localStorage.getItem('healthgrid_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Rate limiting
    const lockKey = 'healthgrid_login_lock';
    const attemptsKey = 'healthgrid_login_attempts';
    const lockUntil = localStorage.getItem(lockKey);
    if (lockUntil && Date.now() < parseInt(lockUntil)) {
      const remainingSec = Math.ceil((parseInt(lockUntil) - Date.now()) / 1000);
      throw new Error(`Account locked. Try again in ${remainingSec} seconds.`);
    }

    try {
      if (isFirebaseConfigured()) {
        // Real Firebase Auth login
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Firebase Auth not available');
        
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle setting the user
        
        // Reset failed attempts on success
        localStorage.removeItem(attemptsKey);
        localStorage.removeItem(lockKey);
        localStorage.setItem('healthgrid_last_login', new Date().toISOString());
      } else {
        // Demo mode: match by email to mock users
        const user = mockUsers.find((u) => u.email === email);
        if (!user) {
          const attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
          localStorage.setItem(attemptsKey, String(attempts));
          if (attempts >= 5) {
            localStorage.setItem(lockKey, String(Date.now() + 60000));
            localStorage.setItem(attemptsKey, '0');
            throw new Error('Too many failed attempts. Account locked for 60 seconds.');
          }
          throw new Error(`Invalid credentials. ${5 - attempts} attempts remaining.`);
        }

        localStorage.removeItem(attemptsKey);
        localStorage.removeItem(lockKey);
        setCurrentUser(user);
        localStorage.setItem('healthgrid_user', JSON.stringify(user));
        localStorage.setItem('healthgrid_last_login', new Date().toISOString());
        
        await createAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'USER_LOGIN',
          target: `users/${user.id}`,
          details: `${user.name} logged in successfully`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Track failed attempts for rate limiting
      if ((error as Error).message?.includes('auth/') || (error as Error).message?.includes('Invalid')) {
        const attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
        localStorage.setItem(attemptsKey, String(attempts));
        if (attempts >= 5) {
          localStorage.setItem(lockKey, String(Date.now() + 60000));
          localStorage.setItem(attemptsKey, '0');
          throw new Error('Too many failed attempts. Account locked for 60 seconds.');
        }
      }
      throw error;
    }
  };

  const loginAsRole = (role: UserRole) => {
    // Only available in demo mode
    const user = mockUsers.find((u) => u.role === role);
    if (!user) return;
    setCurrentUser(user);
    localStorage.setItem('healthgrid_user', JSON.stringify(user));
    localStorage.setItem('healthgrid_last_login', new Date().toISOString());
    createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      target: `users/${user.id}`,
      details: `${user.name} logged in via role selection`,
      timestamp: new Date().toISOString(),
    });
  };

  const loginAsUser = (userId: string) => {
    // Only available in demo mode
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return;
    setCurrentUser(user);
    localStorage.setItem('healthgrid_user', JSON.stringify(user));
    localStorage.setItem('healthgrid_last_login', new Date().toISOString());
    createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      target: `users/${user.id}`,
      details: `${user.name} logged in via user selection`,
      timestamp: new Date().toISOString(),
    });
  };

  const logout = async () => {
    if (currentUser) {
      await createAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'USER_LOGOUT',
        target: `users/${currentUser.id}`,
        details: `${currentUser.name} logged out`,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth) {
        await signOut(auth);
      }
    }
    
    setCurrentUser(null);
    localStorage.removeItem('healthgrid_user');
  };

  const sendPasswordReset = async (email: string) => {
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase Auth not available');
      await sendPasswordResetEmail(auth, email);
    } else {
      // Demo mode: simulate email sent
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        loginAsRole,
        loginAsUser,
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
