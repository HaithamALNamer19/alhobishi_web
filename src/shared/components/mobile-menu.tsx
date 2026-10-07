'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  ShoppingBag,
  FolderTree,
  Search,
  User,
  ShieldCheck,
  LogIn,
  UserPlus,
  ChevronLeft,
} from 'lucide-react';
import { isBackOfficeRole, type Role } from '@/core/auth/roles';
import { RoleBadge } from '@/shared/ui/badge';
import { BrandLogo } from './brand-logo';
import { LogoutButton } from './logout-button';

interface MobileMenuProps {
  session: {
    uid: string;
    role: Role;
    email?: string | null;
  } | null;
}

export function MobileMenu({ session }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isStaffOrAdmin = session && isBackOfficeRole(session.role);

  return (
    <>
      {/* Hamburger Trigger Button on Mobile - Solid non-transparent background with active click feel */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-blue-50 active:scale-95 text-slate-700 hover:text-blue-700 border border-slate-200/90 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
        aria-label="فتح القائمة الرئيسية"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Render Drawer via React Portal directly into document.body */}
      {/* With smooth slide-in & fade animations */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] md:hidden transition-all duration-300 ease-in-out ${
              isOpen
                ? 'opacity-100 pointer-events-auto visible'
                : 'opacity-0 pointer-events-none invisible'
            }`}
          >
            {/* Backdrop overlay with fade animation */}
            <div
              className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
                isOpen ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-over Drawer Pane with smooth slide animation from right */}
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="قائمة المتجر"
              style={{
                backgroundColor: '#ffffff',
                background: '#ffffff',
                opacity: 1,
              }}
              className={`fixed inset-y-0 right-0 z-[10000] w-72 sm:w-80 max-w-[85vw] h-full h-dvh bg-white text-slate-900 shadow-2xl flex flex-col justify-between text-right border-l border-slate-200 transition-transform duration-300 ease-out transform ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Drawer Header */}
              <div
                style={{ backgroundColor: '#ffffff' }}
                className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0"
              >
                <BrandLogo size="sm" showSubtitle={false} href="/" />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-all cursor-pointer"
                  aria-label="إغلاق القائمة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Center Content */}
              <div
                style={{ backgroundColor: '#ffffff' }}
                className="flex-1 overflow-y-auto bg-white p-3 space-y-3"
              >
                {/* Admin Highlight Banner if logged in as Admin */}
                {isStaffOrAdmin && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white shadow-md border border-blue-900/40">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-300" />
                        <span className="text-xs font-bold text-white">منطقة الإدارة</span>
                      </div>
                      <RoleBadge role={session.role} />
                    </div>
                    <p className="text-[11px] text-blue-200/90 mb-3 leading-relaxed">
                      لديك صلاحيات إدارة المتجر، متابعة التجهيز، والمخزون.
                    </p>
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <span>الدخول للوحة الإدارة</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="space-y-1 text-sm font-bold text-slate-700">
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      pathname === '/'
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                        : 'hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>الرئيسية</span>
                  </Link>

                  <Link
                    href="/products"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      pathname.startsWith('/products')
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                        : 'hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    <span>كتالوج المنتجات</span>
                  </Link>

                  <Link
                    href="/categories"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      pathname.startsWith('/categories') || pathname.startsWith('/c/')
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                        : 'hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    <FolderTree className="w-4 h-4 text-slate-400" />
                    <span>أقسام المتجر</span>
                  </Link>

                  <Link
                    href="/search"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      pathname === '/search'
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                        : 'hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                    <span>البحث في البضائع</span>
                  </Link>

                  <Link
                    href="/cart"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      pathname === '/cart'
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                        : 'hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    <span>سلة المشتريات</span>
                  </Link>

                  {session && (
                    <Link
                      href="/account"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        pathname.startsWith('/account')
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                          : 'hover:bg-slate-50 hover:text-blue-700'
                      }`}
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>حسابي وكشف الحساب</span>
                    </Link>
                  )}
                </nav>
              </div>

              {/* Drawer Bottom Actions - Single clear logout button without duplication */}
              <div
                style={{ backgroundColor: '#ffffff' }}
                className="p-4 border-t border-slate-100 bg-white shrink-0"
              >
                {session ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/account"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors shadow-2xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>الملف الشخصي</span>
                    </Link>

                    <LogoutButton
                      variant="full"
                      onSuccess={() => setIsOpen(false)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                        pathname === '/login'
                          ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>دخول</span>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                        pathname === '/register'
                          ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                          : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>حساب جديد</span>
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
