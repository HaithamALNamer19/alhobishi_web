'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/shared/components/brand-logo';
import { RoleBadge } from '@/shared/ui/badge';
import { LogoutButton } from '@/shared/components/logout-button';
import type { Role } from '@/core/auth/roles';
import {
  LayoutDashboard,
  CalendarCheck2,
  PackageSearch,
  FolderTree,
  Users,
  CreditCard,
  ClipboardList,
  Store,
  Image as ImageIcon,
  Menu,
  X,
  ChevronDown,
  Bell,
} from 'lucide-react';

interface AdminSidebarProps {
  session: {
    uid: string;
    role: Role;
    email?: string | null;
  };
  isAdmin: boolean;
}

export function AdminSidebar({ session, isAdmin }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      href: '/admin',
      label: 'المؤشرات',
      fullLabel: 'لوحة المؤشرات',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      href: '/admin/orders/today',
      label: 'طلبات اليوم',
      fullLabel: 'طلبات اليوم للتجهيز',
      icon: CalendarCheck2,
      badge: 'تجهيز',
      adminOnly: false,
    },
    {
      href: '/admin/orders',
      label: 'الطلبات',
      fullLabel: 'جميع الطلبات',
      icon: ClipboardList,
      adminOnly: false,
    },
    {
      href: '/admin/products',
      label: 'المنتجات',
      fullLabel: 'المنتجات والمخزون',
      icon: PackageSearch,
      adminOnly: true,
    },
    {
      href: '/admin/categories',
      label: 'الأقسام',
      fullLabel: 'أقسام المتجر',
      icon: FolderTree,
      adminOnly: true,
    },
    {
      href: '/admin/banners',
      label: 'الإعلانات',
      fullLabel: 'الإعلانات والبنرات',
      icon: ImageIcon,
      adminOnly: true,
    },
    {
      href: '/admin/customers',
      label: 'العملاء',
      fullLabel: 'العملاء والتجار',
      icon: Users,
      adminOnly: true,
    },
    {
      href: '/admin/payments',
      label: 'المدفوعات',
      fullLabel: 'المدفوعات وسندات القبض',
      icon: CreditCard,
      adminOnly: true,
    },
    {
      href: '/account/notifications',
      label: 'الإشعارات',
      fullLabel: 'التنبيهات والإشعارات',
      icon: Bell,
      adminOnly: false,
    },
  ];

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const isLinkActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 1. MOBILE TOP BAR & QUICK TABS (Visible only on mobile < md) */}
      <div className="md:hidden bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        {/* Top Header */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="تبديل القائمة"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <BrandLogo size="sm" showSubtitle={false} inverted href="/admin" />
            <span className="text-xs font-bold text-slate-400">لوحة الإدارة</span>
          </div>

          <div className="flex items-center gap-2">
            <RoleBadge role={session.role} />
            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 transition-colors"
              title="العودة للمتجر الرئيسي"
            >
              <Store className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Horizontal Scrollable Tabs Bar on Mobile */}
        <div
          style={{ backgroundColor: '#020617' }}
          className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-t border-slate-800 bg-slate-950 text-xs shadow-inner"
        >
          {visibleItems.map((item) => {
            const active = isLinkActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Collapsible Full Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div
            style={{ backgroundColor: '#0f172a', background: '#0f172a', opacity: 1 }}
            className="p-3 border-t-2 border-slate-700 bg-slate-900 shadow-2xl space-y-1 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {visibleItems.map((item) => {
              const active = isLinkActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    active
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.fullLabel}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-2 gap-2">
              <span className="text-slate-400 font-medium">حساب المشرف</span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-blue-400 hover:underline"
                >
                  حسابي
                </Link>
                <LogoutButton
                  variant="icon"
                  className="p-1.5 text-rose-400 hover:text-white rounded-lg hover:bg-rose-900/40 transition-colors"
                  onSuccess={() => setIsMobileMenuOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. DESKTOP PERMANENT SIDEBAR (Visible only on md+) */}
      <aside className="hidden md:flex w-68 bg-slate-900 text-white shrink-0 flex-col justify-between border-l border-slate-800 sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Backoffice Branding */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <BrandLogo size="sm" showSubtitle={false} inverted href="/admin" />
            <Link
              href="/"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="العودة للمتجر الرئيسي"
            >
              <Store className="w-4 h-4" />
            </Link>
          </div>

          <div className="px-4 py-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold">لوحة التحكم والإدارة</span>
            <RoleBadge role={session.role} />
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            {visibleItems.map((item) => {
              const active = isLinkActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    active
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.fullLabel}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-blue-500 text-white font-black px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info Bottom */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 font-medium">حساب المشرف</span>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/account" className="text-blue-400 hover:underline">
                حسابي
              </Link>
              <LogoutButton
                variant="icon"
                className="p-1.5 text-rose-400 hover:text-white rounded-lg hover:bg-rose-900/40 transition-colors"
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

