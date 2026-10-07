import React from 'react';
import Link from 'next/link';
import { requireSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { RoleBadge } from '@/shared/ui/badge';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { formatMoney } from '@/core/domain/money';
import { formatYemeniPhone } from '@/core/domain/phone';
import {
  ShoppingBag,
  FileText,
  CreditCard,
  Bell,
  Clock,
  CheckCircle2,
  Package,
  User,
  Phone,
  Calendar,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import { formatDate } from '@/core/domain/dates';

export const metadata = {
  title: 'لوحة التحكم | حسابي',
};

export const instant = false;

export default async function AccountPage() {
  const session = await requireSession();
  const profile = await userRepository.findById(session.uid);

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        لم يتم العثور على ملف المستخدم.
      </div>
    );
  }

  const balance = profile.account.balance;
  const isWholesale = profile.role === 'wholesale';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Account Header */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl shadow-slate-900/5">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-black text-2xl shadow-md border border-white/20">
            {profile.displayName.charAt(0)}
          </div>
          <div className="space-y-1.5 text-right">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {profile.displayName}
              </h1>
              {isBackOfficeRole(profile.role) && <RoleBadge role={profile.role} />}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-mono" dir="ltr">
                <User className="w-3.5 h-3.5 text-slate-400" />
                @{profile.username}
              </span>
              <span className="flex items-center gap-1 font-mono" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {formatYemeniPhone(profile.phone)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                عضو منذ {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Quick Action Banner (Visible for Admin and Staff) */}
      {isBackOfficeRole(profile.role) && (
        <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-800/60 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10 text-right">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">لوحة التحكم والإدارة</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  صلاحيات خاصة
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                إدارة طلبات اليوم، تجهيز الأصناف، المنتجات، الأقسام، والإعلانات.
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="w-full sm:w-auto text-center px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer relative z-10"
          >
            <span>الدخول للوحة الإدارة</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Financial Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white p-7 sm:p-8 shadow-xl relative overflow-hidden border border-blue-900/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-blue-200">
              الرصيد المالي الحالي
            </span>
            <Link
              href="/account/statement"
              className="text-xs text-blue-300 hover:text-white font-bold flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-xl transition-all"
            >
              <span>كشف الحساب الكامل</span>
              <span>←</span>
            </Link>
          </div>
          <div className="relative z-10 text-3xl sm:text-4xl font-black tracking-tight mb-2 font-mono" dir="ltr">
            {formatMoney(balance)}
          </div>
          <p className="relative z-10 text-xs text-blue-200/80">
            {balance > 0
              ? 'الرصيد يمثل مديونية مستحقة عليك لصالح المتجر'
              : balance < 0
              ? 'لديك رصيد دائن فائض في حسابك'
              : 'حسابك خالص ولا توجد مديونية حالية'}
          </p>
        </div>

        <div className="rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-7 flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              إجمالي الطلبات
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono">
              {profile.stats.ordersCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              منها <span className="font-bold text-blue-700 font-mono">{profile.stats.openOrdersCount}</span> طلبات جارية قيد المعالجة
            </p>
          </div>
          <Link
            href="/account/orders"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 mt-4 block"
          >
            استعراض جميع الطلبات ←
          </Link>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Link href="/account/orders" className="group">
          <div className="p-6 h-full rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 transition-all duration-300 group-hover:border-blue-600 group-hover:shadow-xl group-hover:shadow-blue-950/5 group-hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3.5 border border-blue-100 shadow-2xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
              طلباتي وحجوزاتي
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              متابعة حالة الطلبات، وتعديل الأصناف قبل اعتماد الجهوزية
            </p>
          </div>
        </Link>

        <Link href="/account/statement" className="group">
          <div className="p-6 h-full rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 transition-all duration-300 group-hover:border-blue-600 group-hover:shadow-xl group-hover:shadow-blue-950/5 group-hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mb-3.5 border border-sky-100 shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
              كشف الحساب والفواتير
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              سجل تفصيلي بكافة فواتير المشتريات والسندات المالية
            </p>
          </div>
        </Link>

        <Link href="/account/payments" className="group">
          <div className="p-6 h-full rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 transition-all duration-300 group-hover:border-blue-600 group-hover:shadow-xl group-hover:shadow-blue-950/5 group-hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3.5 border border-indigo-100 shadow-2xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
              سندات القبض والدفع
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              سجل المبالغ المسددة لحسابك مع أرقام الحوالات وتواريخها
            </p>
          </div>
        </Link>

        <Link href="/account/notifications" className="group">
          <div className="p-6 h-full rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 transition-all duration-300 group-hover:border-blue-600 group-hover:shadow-xl group-hover:shadow-blue-950/5 group-hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3.5 border border-amber-100 shadow-2xs">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
              الإشعارات والتحديثات
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              تنبيهات فورية عند تغيير حالة طلبك أو تسجيل سند سداد جديد
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
