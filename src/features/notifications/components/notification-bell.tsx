'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
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
  Loader2,
} from 'lucide-react';
import {
  getUnreadNotificationsCountAction,
  listUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  type SerializedNotification,
} from '../actions/notification.actions';

interface NotificationBellProps {
  className?: string;
  isBackOffice?: boolean;
}

export function NotificationBell({ className = '', isBackOffice = false }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<SerializedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const res = await getUnreadNotificationsCountAction();
      if (res.ok) {
        setUnreadCount(res.count);
      }
    } catch {
      // silently fail count polling
    }
  };

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const res = await listUserNotificationsAction(8);
      if (res.ok) {
        setNotifications(res.notifications);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 25000); // 25s poll
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchList();
      fetchCount();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
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
    return isBackOffice ? '/admin' : '/account/notifications';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER_PLACED':
      case 'ORDER_PREPARING':
      case 'ORDER_READY':
      case 'ORDER_CONFIRMED':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'PAYMENT_RECORDED':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'ROLE_UPDATED':
        return <UserCheck className="w-4 h-4 text-amber-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 sm:p-2.5 text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 rounded-xl transition-all cursor-pointer focus:outline-none"
        aria-label="الإشعارات والتنبيهات"
        title="مركز الإشعارات"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-rose-600 text-white font-mono font-bold text-[10px] shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-50/80 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">الإشعارات والتنبيهات</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>قراءة الكل</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-xs">جاري تحميل الإشعارات...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">لا توجد إشعارات حتى الآن</p>
                <p className="text-[11px] text-slate-400">ستصلك تنبيهات فورية بكل جديد في طلباتك وحسابك.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const targetHref = getTargetHref(n);
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id);
                      setIsOpen(false);
                      router.push(targetHref);
                    }}
                    className={`p-3.5 flex items-start gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                      !n.isRead ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            !n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                          }`}
                        >
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(n.createdAt).toLocaleDateString('ar-YE', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    {!n.isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center"
                        title="غير مقروء"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
            <Link
              href="/account/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 py-1 transition-colors"
            >
              <span>مركز الإشعارات الكامل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
