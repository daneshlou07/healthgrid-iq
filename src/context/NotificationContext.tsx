import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
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
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead }}
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
