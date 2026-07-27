/**
 * notificationService.ts — Firestore-backed notification service
 *
 * PURPOSE:
 *   This service provides real-time notification delivery backed by Firestore.
 *   It is used by NotificationContext when Firebase is configured.
 *   In demo mode (no Firebase), the context falls back to localStorage.
 *
 * COLLECTION SCHEMA (notifications/{notificationId}):
 *   - userId:    string  — the recipient's Firebase UID
 *   - title:     string  — short notification heading
 *   - message:   string  — full notification body
 *   - type:      'info' | 'success' | 'warning' | 'error'
 *   - read:      boolean — true once the user has seen it
 *   - link:      string? — optional deep-link to the related entity
 *   - createdAt: Timestamp — Firestore server timestamp
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import type { Notification } from '../types';

/**
 * Subscribe to the current user's notifications in real time.
 *
 * @param db        - Firestore instance
 * @param userId    - Firebase UID of the current user
 * @param onUpdate  - called whenever the notification list changes
 * @returns         - unsubscribe function (call on component unmount)
 */
export function subscribeToNotifications(
  db: Firestore,
  userId: string,
  onUpdate: (notifications: Notification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type as Notification['type'],
          read: data.read ?? false,
          // Convert Firestore Timestamp to ISO string for consistency
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ??
            data.createdAt ??
            new Date().toISOString(),
          link: data.link,
        } as Notification;
      });
      onUpdate(notifications);
    },
    (error) => {
      console.error('Notifications listener error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Mark a single notification as read in Firestore.
 *
 * @param db             - Firestore instance
 * @param notificationId - document ID of the notification
 */
export async function markNotificationReadInFirestore(
  db: Firestore,
  notificationId: string
): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

/**
 * Mark all of a user's unread notifications as read in a single Firestore batch.
 *
 * @param db          - Firestore instance
 * @param unreadIds   - array of document IDs to mark as read
 */
export async function markAllNotificationsReadInFirestore(
  db: Firestore,
  unreadIds: string[]
): Promise<void> {
  if (unreadIds.length === 0) return;

  // Firestore batch limit is 500 operations
  const BATCH_SIZE = 500;
  for (let i = 0; i < unreadIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = unreadIds.slice(i, i + BATCH_SIZE);
    chunk.forEach((id) => {
      batch.update(doc(db, 'notifications', id), { read: true });
    });
    await batch.commit();
  }
}
