import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { requireAuth } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { notificationRepository } from '@/features/notifications/infrastructure/firestore-notification.repository';
import { NotificationsManager } from '@/features/notifications/components/notifications-manager';
import { Bell, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'الإشعارات | حسابي',
};

export const instant = false;

export default async function CustomerNotificationsPage() {
  await connection();
  const session = await requireAuth();
  const isBackOffice = isBackOfficeRole(session.role);
  const notifications = await notificationRepository.listByUser(session.uid, isBackOffice, 50);

  const serialized = notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    referenceId: n.referenceId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-700" />
              <span>مركز الإشعارات والتنبيهات</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تنبيهات حالة طلباتك، جهوزية البضاعة، ترقية الحساب، وسندات القبض
            </p>
          </div>
        </div>
      </div>

      {/* Notifications Manager Component */}
      <NotificationsManager
        initialNotifications={serialized}
        isBackOffice={isBackOffice}
      />
    </div>
  );
}
