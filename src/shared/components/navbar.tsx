import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { RoleBadge } from '@/shared/ui/badge';
import { isBackOfficeRole } from '@/core/auth/roles';
import { User, ShoppingBag, ShieldCheck, LogIn, UserPlus, Search } from 'lucide-react';
import { LogoutButton } from './logout-button';
import { BrandLogo } from './brand-logo';
import { MobileMenu } from './mobile-menu';
import { NotificationBell } from '@/features/notifications/components/notification-bell';

export async function Navbar() {
  await connection();
  const session = await getCurrentSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full">
        {/* Brand / Logo & Main Nav */}
        <div className="flex items-center gap-6 lg:gap-8 shrink-0">
          <BrandLogo size="md" href="/" />

          {/* Quick Nav */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-700">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl hover:text-blue-700 hover:bg-blue-50/70 transition-all"
            >
              الرئيسية
            </Link>
            <Link
              href="/products"
              className="px-3 py-1.5 rounded-xl hover:text-blue-700 hover:bg-blue-50/70 transition-all"
            >
              المنتجات
            </Link>
            <Link
              href="/categories"
              className="px-3 py-1.5 rounded-xl hover:text-blue-700 hover:bg-blue-50/70 transition-all"
            >
              الأقسام
            </Link>
          </nav>
        </div>

        {/* Center Search Shortcut on Desktop */}
        <div className="hidden lg:flex items-center flex-1 max-w-xs mx-4">
          <Link
            href="/search"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-100/80 hover:bg-white border border-slate-200/80 text-slate-400 hover:text-slate-600 hover:shadow-xs transition-all text-xs"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>ابحث عن صنف أو لعبة...</span>
            </span>
            <kbd className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-md font-mono text-slate-400">
              بحث
            </kbd>
          </Link>
        </div>

        {/* User actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {session ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Backoffice link for admin / staff (visible on tablet and up; accessible via mobile menu drawer on mobile) */}
              {isBackOfficeRole(session.role) && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white transition-all shadow-xs shrink-0"
                  title="لوحة الإدارة"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-300" />
                  <span>الإدارة</span>
                </Link>
              )}

              {/* Notifications bell */}
              <NotificationBell isBackOffice={isBackOfficeRole(session.role)} />

              {/* Cart link */}
              <Link
                href="/cart"
                className="relative p-2 sm:p-2.5 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
                aria-label="السلة"
              >
                <ShoppingBag className="w-5 h-5" />
              </Link>

              {/* Account profile link (visible on tablet and up; accessible via mobile menu drawer on mobile) */}
              <Link
                href="/account"
                className="hidden sm:flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-100 transition-all text-right shrink-0"
                title="حسابي"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4 text-blue-700" />
                </div>
                <div className="hidden md:block text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">حسابي</span>
                    {isBackOfficeRole(session.role) && <RoleBadge role={session.role} />}
                  </div>
                </div>
              </Link>

              {/* Logout button */}
              <div className="hidden md:block">
                <LogoutButton />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/cart"
                className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/90 shadow-2xs transition-all"
                aria-label="السلة"
              >
                <ShoppingBag className="w-5 h-5" />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/90 shadow-2xs transition-all"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" />
                <span>دخول</span>
              </Link>

              <Link
                href="/register"
                className="hidden xs:inline-flex items-center gap-1 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>حساب جديد</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger menu drawer */}
          <MobileMenu session={session} />
        </div>
      </div>
    </header>
  );
}
