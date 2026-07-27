import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Notification } from '../types';
import { isFirebaseConfigured, getFirestoreDb } from '../services/firebase';
import {
  subscribeToNotifications,
  markNotificationReadInFirestore,
  markAllNotificationsReadInFirestore,
} from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NOTIF_STORAGE_KEY = 'healthgrid_notifications';

// ---------------------------------------------------------------------------
// Demo mode default notifications (used when Firebase is not configured)
// ---------------------------------------------------------------------------
const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    userId: 'all',
    title: 'Report Ready',
    message: 'Diagnostic report for case HG-2026-0001 has been finalized by Dr. Priya Nair.',
    read: false,
    createdAt: '2026-07-15T15:00:00Z',
    type: 'success',
  },
  {
    id: 'notif-002',
    userId: 'all',
    title: 'New Case Assigned',
    message: 'Case XR2026030008 has been scheduled at Klinik Kesihatan Bukit Cherakah.',
    read: false,
    createdAt: '2026-07-15T09:00:00Z',
    type: 'warning',
  },
  {
    id: 'notif-003',
    userId: 'all',
    title: 'Patient Request Pending',
    message: 'Radiology Department submitted a profile update request for Mohd Hafiz bin Ibrahim.',
    read: false,
    createdAt: '2026-07-14T16:30:00Z',
    type: 'info',
  },
  {
    id: 'notif-004',
    userId: 'all',
    title: 'Scheduled Maintenance',
    message: 'System maintenance window: 2026-07-20 02:00-04:00 MYT. Plan accordingly.',
    read: true,
    createdAt: '2026-07-14T08:00:00Z',
    type: 'error',
  },
  {
    id: 'notif-005',
    userId: 'all',
    title: 'New Equipment Deployed',
    message: 'PACS Charlie deployed to Hospital Tanjong Karang with X-Ray Unit.',
    read: true,
    createdAt: '2026-07-13T11:00:00Z',
    type: 'info',
  },
];

// ---------------------------------------------------------------------------
// localStorage helpers (demo mode only)
// ---------------------------------------------------------------------------
function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    const parsed = JSON.parse(raw) as Notification[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
  } catch { /* storage full — fail silently */ }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(
    isFirebaseConfigured() ? [] : loadNotifications()
  );
  const [firestoreMode, setFirestoreMode] = useState(false);

  // -------------------------------------------------------------------------
  // When Firebase is configured and a user is logged in, subscribe to
  // their Firestore notifications collection in real time.
  // Falls back to localStorage when Firebase is not configured (demo mode).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured() || !currentUser) {
      setFirestoreMode(false);
      return;
    }

    const db = getFirestoreDb();
    if (!db) {
      setFirestoreMode(false);
      return;
    }

    setFirestoreMode(true);

    const unsubscribe = subscribeToNotifications(
      db,
      currentUser.id,
      (firestoreNotifications) => {
        setNotifications(firestoreNotifications);
      },
      (error) => {
        console.warn('Notifications Firestore listener failed, falling back to localStorage:', error);
        setFirestoreMode(false);
        setNotifications(loadNotifications());
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Persist to localStorage in demo mode only
  useEffect(() => {
    if (!firestoreMode) {
      saveNotifications(notifications);
    }
  }, [notifications, firestoreMode]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // -------------------------------------------------------------------------
  // addNotification — only used in demo / local mode.
  // In Firebase mode, notifications are created server-side by Cloud Functions.
  // -------------------------------------------------------------------------
  const addNotification = (
    notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ) => {
    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = async (id: string) => {
    // Optimistic local update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Persist to Firestore if in live mode
    if (firestoreMode) {
      const db = getFirestoreDb();
      if (db) {
        try {
          await markNotificationReadInFirestore(db, id);
        } catch (error) {
          console.error('Failed to mark notification as read in Firestore:', error);
          // Revert optimistic update on failure
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: false } : n))
          );
        }
      }
    }
  };

  const markAllAsRead = async () => {
    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Persist to Firestore if in live mode
    if (firestoreMode) {
      const db = getFirestoreDb();
      if (db) {
        const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
        try {
          await markAllNotificationsReadInFirestore(db, unreadIds);
        } catch (error) {
          console.error('Failed to mark all notifications read in Firestore:', error);
        }
      }
    }
  };

  const clearAll = () => {
    // In demo mode: clear localStorage
    // In Firebase mode: we don't permanently delete — just mark all read
    if (firestoreMode) {
      markAllAsRead();
    } else {
      setNotifications([]);
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
