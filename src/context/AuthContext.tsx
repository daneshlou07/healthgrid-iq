import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { mockUsers } from '../services/mockData';
import { getFirebaseAuth, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { createAuditLog } from '../services/dataService';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  loginAsUser: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('healthgrid_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // If Firebase is configured, also listen for auth state
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser && !savedUser) {
            // Map Firebase user to our User type
            const matchedUser = mockUsers.find((u) => u.email === firebaseUser.email);
            if (matchedUser) {
              setCurrentUser(matchedUser);
              localStorage.setItem('healthgrid_user', JSON.stringify(matchedUser));
            }
          }
          setIsLoading(false);
        });
        return unsubscribe;
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string) => {
    // Rate limiting: lock after 5 failed attempts
    const lockKey = 'healthgrid_login_lock';
    const attemptsKey = 'healthgrid_login_attempts';
    const lockUntil = localStorage.getItem(lockKey);
    if (lockUntil && Date.now() < parseInt(lockUntil)) {
      const remainingSec = Math.ceil((parseInt(lockUntil) - Date.now()) / 1000);
      throw new Error(`Account locked. Try again in ${remainingSec} seconds.`);
    }

    // Demo fallback: match by email to mock users
    const user = mockUsers.find((u) => u.email === email);
    if (!user) {
      const attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
      localStorage.setItem(attemptsKey, String(attempts));
      if (attempts >= 5) {
        localStorage.setItem(lockKey, String(Date.now() + 60000)); // Lock for 60 seconds
        localStorage.setItem(attemptsKey, '0');
        throw new Error('Too many failed attempts. Account locked for 60 seconds.');
      }
      throw new Error(`Invalid credentials. ${5 - attempts} attempts remaining.`);
    }

    // Successful login — reset attempts
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
  };

  const loginAsRole = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role);
    if (!user) return;
    setCurrentUser(user);
    localStorage.setItem('healthgrid_user', JSON.stringify(user));
    localStorage.setItem('healthgrid_last_login', new Date().toISOString());
    createAuditLog({
      userId: user.id, userName: user.name, userRole: user.role,
      action: 'USER_LOGIN', target: `users/${user.id}`,
      details: `${user.name} logged in via role selection`,
      timestamp: new Date().toISOString(),
    });
  };

  const loginAsUser = (userId: string) => {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return;
    setCurrentUser(user);
    localStorage.setItem('healthgrid_user', JSON.stringify(user));
    localStorage.setItem('healthgrid_last_login', new Date().toISOString());
    createAuditLog({
      userId: user.id, userName: user.name, userRole: user.role,
      action: 'USER_LOGIN', target: `users/${user.id}`,
      details: `${user.name} logged in via user selection`,
      timestamp: new Date().toISOString(),
    });
  };

  const logout = () => {
    if (currentUser) {
      createAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'USER_LOGOUT',
        target: `users/${currentUser.id}`,
        details: `${currentUser.name} logged out`,
        timestamp: new Date().toISOString(),
      });
    }
    setCurrentUser(null);
    localStorage.removeItem('healthgrid_user');
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
