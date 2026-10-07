'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Package,
  CreditCard,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  type SerializedNotification,
} from '../actions/notification.actions';

interface NotificationsManagerProps {
  initialNotifications: SerializedNotification[];
  isBackOffice?: boolean;
}

export function NotificationsManager({
  initialNotifications,
  isBackOffice = false,
}: NotificationsManagerProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<SerializedNotification[]>(initialNotifications);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    });
  };

  const getTargetHref = (n: SerializedNotification) => {
    if (n.type.startsWith('ORDER') && n.referenceId) {
      return isBackOffice
        ? `/admin/orders/${n.referenceId}`
        : `/account/orders/${n.referenceId}`;
    }
    if (n.type === 'PAYMENT_RECORDED') {
      return isBackOffice ? '/admin/payments' : '/account/statement';
    }
    if (n.type === 'ROLE_UPDATED') {
      return '/account';
    }
    return null;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER_PLACED':
      case 'ORDER_PREPARING':
      case 'ORDER_READY':
      case 'ORDER_CONFIRMED':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'PAYMENT_RECORDED':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'ROLE_UPDATED':
        return <UserCheck className="w-5 h-5 text-amber-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع الإشعارات ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UNREAD')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'UNREAD'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            غير المقروءة ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-xs flex items-center gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            <CheckCheck className="w-4 h-4" />
            <span>تحديد الكل كمقروء</span>
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
            <Bell className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">
              {filter === 'UNREAD'
                ? 'لا توجد إشعارات غير مقروءة'
                : 'لا توجد إشعارات حاليًا'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ستصلك هنا إشعارات فورية عند بدء تجهيز طلبك أو تأكيد جهوزيته وسندات القبض.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const targetHref = getTargetHref(n);

            return (
              <div
                key={n.id}
                className={`p-5 rounded-3xl border transition-all text-right space-y-2 relative overflow-hidden ${
                  !n.isRead
                    ? 'bg-blue-50/40 border-blue-200 shadow-xs ring-1 ring-blue-500/10'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {!n.isRead && (
                  <span className="absolute top-0 right-0 w-2 h-full bg-blue-600" />
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      {getIcon(n.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <Badge variant="sky" size="sm" className="text-[10px]">
                            جديد
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString('ar-YE', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(n.id)}
                      disabled={isPending}
                      className="text-xs text-slate-500 hover:text-blue-700 flex items-center gap-1 font-bold p-1 rounded-lg hover:bg-white transition-all cursor-pointer"
                      title="تحديد كمقروء"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">مقروء</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pr-12">
                  {n.message}
                </p>

                {targetHref && (
                  <div className="pr-12 pt-1">
                    <Link
                      href={targetHref}
                      onClick={() => {
                        if (!n.isRead) handleMarkAsRead(n.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      <span>عرض التفاصيل الكاملة</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
