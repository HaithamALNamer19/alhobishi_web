'use client';

import React, { useState, useEffect } from 'react';
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
  RotateCcw,
  Truck,
  Receipt,
  Boxes,
  History,
  Undo2,
  Building2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

interface AdminSidebarProps {
  session: {
    uid: string;
    role: Role;
    email?: string | null;
  };
  isAdmin: boolean;
}

interface NavItem {
  href: string;
  label: string;
  fullLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  items: NavItem[];
}

type NavEntry =
  | { type: 'item'; item: NavItem }
  | { type: 'group'; group: NavGroup };

export function AdminSidebar({ session, isAdmin }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // هيكل القائمة الجانبية: مجموعات منسدلة وأزرار مباشرة
  const navEntries: NavEntry[] = [
    // 1. زر رئيسي مباشر: لوحة المؤشرات
    {
      type: 'item',
      item: {
        href: '/admin',
        label: 'المؤشرات',
        fullLabel: 'لوحة المؤشرات',
        icon: LayoutDashboard,
        adminOnly: false,
      },
    },
    // 2. قائمة منسدلة: إدارة المبيعات والطلبات
    {
      type: 'group',
      group: {
        id: 'sales',
        label: 'إدارة المبيعات والطلبات',
        icon: ShoppingBag,
        adminOnly: false,
        items: [
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
            href: '/admin/returns',
            label: 'مردود المبيعات',
            fullLabel: 'فواتير مردود المبيعات',
            icon: RotateCcw,
            adminOnly: true,
          },
        ],
      },
    },
    // 3. قائمة منسدلة: المنتجات والمخزون
    {
      type: 'group',
      group: {
        id: 'inventory',
        label: 'المنتجات والمخزون',
        icon: Boxes,
        adminOnly: true,
        items: [
          {
            href: '/admin/products',
            label: 'المنتجات والأسعار',
            fullLabel: 'المنتجات والأسعار',
            icon: PackageSearch,
            adminOnly: true,
          },
          {
            href: '/admin/categories',
            label: 'أقسام المتجر',
            fullLabel: 'أقسام المتجر',
            icon: FolderTree,
            adminOnly: true,
          },
          {
            href: '/admin/inventory/movements',
            label: 'حركات وجرد المخزون',
            fullLabel: 'حركات وجرد المخزون',
            icon: History,
            adminOnly: true,
          },
        ],
      },
    },
    // 4. قائمة منسدلة: المشتريات والموردين (قسم جديد بالكامل)
    {
      type: 'group',
      group: {
        id: 'purchasing',
        label: 'المشتريات والموردين',
        icon: Truck,
        adminOnly: true,
        items: [
          {
            href: '/admin/purchases',
            label: 'فواتير الشراء',
            fullLabel: 'فواتير الشراء',
            icon: Receipt,
            adminOnly: true,
          },
          {
            href: '/admin/purchases/returns',
            label: 'مردود المشتريات',
            fullLabel: 'فواتير مردود المشتريات',
            icon: Undo2,
            adminOnly: true,
          },
          {
            href: '/admin/suppliers',
            label: 'إدارة الموردين',
            fullLabel: 'إدارة الموردين',
            icon: Building2,
            adminOnly: true,
          },
        ],
      },
    },
    // 5. زر مباشر: العملاء والتجار
    {
      type: 'item',
      item: {
        href: '/admin/customers',
        label: 'العملاء',
        fullLabel: 'العملاء والتجار',
        icon: Users,
        adminOnly: true,
      },
    },
    // 6. قائمة منسدلة: المالية والحسابات
    {
      type: 'group',
      group: {
        id: 'finance',
        label: 'المالية والحسابات',
        icon: CreditCard,
        adminOnly: true,
        items: [
          {
            href: '/admin/payments',
            label: 'المدفوعات',
            fullLabel: 'المدفوعات وسندات القبض',
            icon: CreditCard,
            adminOnly: true,
          },
        ],
      },
    },
    // 7. قائمة منسدلة: التسويق والإعدادات
    {
      type: 'group',
      group: {
        id: 'marketing',
        label: 'التسويق والإعدادات',
        icon: Sparkles,
        adminOnly: false,
        items: [
          {
            href: '/admin/banners',
            label: 'الإعلانات',
            fullLabel: 'الإعلانات والبنرات',
            icon: ImageIcon,
            adminOnly: true,
          },
          {
            href: '/account/notifications',
            label: 'الإشعارات',
            fullLabel: 'التنبيهات والإشعارات',
            icon: Bell,
            adminOnly: false,
          },
        ],
      },
    },
  ];

  const isLinkActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  // حالة فتح وإغلاق المجموعات (Accordion State)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navEntries.forEach((entry) => {
      if (entry.type === 'group') {
        const hasActive = entry.group.items.some((item) => isLinkActive(item.href));
        if (hasActive) initial[entry.group.id] = true;
      }
    });
    return initial;
  });

  // فتح المجموعة التي ينتمي إليها المسار الحالي تلقائياً
  useEffect(() => {
    navEntries.forEach((entry) => {
      if (entry.type === 'group') {
        const hasActive = entry.group.items.some((item) => isLinkActive(item.href));
        if (hasActive) {
          setOpenGroups((prev) => (prev[entry.group.id] ? prev : { ...prev, [entry.group.id]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // تصفية العناصر المعروضة بحسب الصلاحيات
  const visibleEntries = navEntries
    .filter((entry) => {
      if (entry.type === 'item') {
        return !entry.item.adminOnly || isAdmin;
      }
      if (entry.group.adminOnly && !isAdmin) return false;
      const visibleItems = entry.group.items.filter((item) => !item.adminOnly || isAdmin);
      return visibleItems.length > 0;
    })
    .map((entry) => {
      if (entry.type === 'group') {
        return {
          ...entry,
          group: {
            ...entry.group,
            items: entry.group.items.filter((item) => !item.adminOnly || isAdmin),
          },
        };
      }
      return entry;
    });

  // قائمة العناصر المسطحة للـ Mobile Quick Bar
  const flatMobileItems: NavItem[] = [];
  visibleEntries.forEach((entry) => {
    if (entry.type === 'item') {
      flatMobileItems.push(entry.item);
    } else {
      flatMobileItems.push(...entry.group.items);
    }
  });

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
          {flatMobileItems.map((item) => {
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
            className="p-3 border-t-2 border-slate-700 bg-slate-900 shadow-2xl space-y-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto"
          >
            {visibleEntries.map((entry) => {
              if (entry.type === 'item') {
                const active = isLinkActive(entry.item.href);
                const Icon = entry.item.icon;
                return (
                  <Link
                    key={entry.item.href}
                    href={entry.item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                      active
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{entry.item.fullLabel}</span>
                    </div>
                    {entry.item.badge && (
                      <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                        {entry.item.badge}
                      </span>
                    )}
                  </Link>
                );
              }

              const group = entry.group;
              const hasActive = group.items.some((i) => isLinkActive(i.href));
              const isOpen = Boolean(openGroups[group.id]);
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-right ${
                      hasActive
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon className={`w-4 h-4 ${hasActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{group.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mr-3 pr-3 border-r border-slate-800 space-y-1 pt-1">
                      {group.items.map((subItem) => {
                        const subActive = isLinkActive(subItem.href);
                        const SubIcon = subItem.icon;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                              subActive
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <SubIcon className="w-3.5 h-3.5" />
                              <span>{subItem.fullLabel}</span>
                            </div>
                            {subItem.badge && (
                              <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                                {subItem.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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

          {/* Navigation Links with Accordion / Dropdown */}
          <nav className="p-3 space-y-1.5 text-sm font-medium">
            {visibleEntries.map((entry) => {
              if (entry.type === 'item') {
                const active = isLinkActive(entry.item.href);
                const Icon = entry.item.icon;
                return (
                  <Link
                    key={entry.item.href}
                    href={entry.item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                      active
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{entry.item.fullLabel}</span>
                    </div>
                    {entry.item.badge && (
                      <span className="text-[10px] bg-blue-500 text-white font-black px-2 py-0.5 rounded-full">
                        {entry.item.badge}
                      </span>
                    )}
                  </Link>
                );
              }

              const group = entry.group;
              const hasActive = group.items.some((i) => isLinkActive(i.href));
              const isOpen = Boolean(openGroups[group.id]);
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-right select-none cursor-pointer ${
                      hasActive
                        ? 'text-white font-bold bg-slate-800/80 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon
                        className={`w-4 h-4 ${
                          hasActive ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-sm font-bold">{group.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    />
                  </button>

                  {/* Group Sub-Items */}
                  {isOpen && (
                    <div className="mr-3.5 pr-3 border-r border-slate-800 space-y-1 pt-0.5 pb-1">
                      {group.items.map((subItem) => {
                        const subActive = isLinkActive(subItem.href);
                        const SubIcon = subItem.icon;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                              subActive
                                ? 'bg-blue-600 text-white font-bold shadow-xs'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <SubIcon
                                className={`w-3.5 h-3.5 ${
                                  subActive ? 'text-white' : 'text-slate-400'
                                }`}
                              />
                              <span>{subItem.fullLabel}</span>
                            </div>
                            {subItem.badge && (
                              <span className="text-[9px] bg-blue-500 text-white font-black px-1.5 py-0.5 rounded-full">
                                {subItem.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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
