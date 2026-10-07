'use server';

import { getCurrentSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { notificationRepository } from '../infrastructure/firestore-notification.repository';
import type { AppNotification } from '../domain/notification';

export interface SerializedNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

function serialize(n: AppNotification): SerializedNotification {
  return {
    ...n,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function getUnreadNotificationsCountAction(): Promise<{
  ok: boolean;
  count: number;
}> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: true, count: 0 };

    const isBackOffice = isBackOfficeRole(session.role);
    const count = await notificationRepository.getUnreadCount(session.uid, isBackOffice);
    return { ok: true, count };
  } catch (err) {
    console.error('Failed to get unread count:', err);
    return { ok: false, count: 0 };
  }
}

export async function listUserNotificationsAction(limit = 20): Promise<{
  ok: boolean;
  notifications: SerializedNotification[];
}> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: true, notifications: [] };

    const isBackOffice = isBackOfficeRole(session.role);
    const notifs = await notificationRepository.listByUser(session.uid, isBackOffice, limit);
    return { ok: true, notifications: notifs.map(serialize) };
  } catch (err) {
    console.error('Failed to list notifications:', err);
    return { ok: false, notifications: [] };
  }
}

export async function markNotificationAsReadAction(notificationId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: 'غير مصرح' };

    await notificationRepository.markAsRead(notificationId);
    return { ok: true };
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    return { ok: false, error: 'فشل تحديث الإشعار' };
  }
}

export async function markAllNotificationsAsReadAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: 'غير مصرح' };

    const isBackOffice = isBackOfficeRole(session.role);
    await notificationRepository.markAllAsRead(session.uid, isBackOffice);
    return { ok: true };
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
    return { ok: false, error: 'فشل تحديث الإشعارات' };
  }
}

