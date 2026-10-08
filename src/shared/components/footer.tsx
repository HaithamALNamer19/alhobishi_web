import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/shared/components/brand-logo';
import {
  Phone,
  MessageCircle,
  ChevronLeft,
  ShoppingBag,
  Layers,
  Sparkles,
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-300 border-t border-slate-800/80 pt-12 sm:pt-16 pb-12 w-full max-w-full">
      {/* Ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 sm:right-1/4 w-72 h-72 sm:w-[500px] sm:h-[500px] bg-blue-500/10 rounded-full blur-3xl sm:blur-[140px]" />
        <div className="absolute bottom-0 left-0 sm:left-1/4 w-72 h-72 sm:w-[500px] sm:h-[500px] bg-indigo-500/10 rounded-full blur-3xl sm:blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 text-right">
          {/* Brand & Identity Column */}
          <div className="lg:col-span-5 space-y-5">
            <BrandLogo size="lg" inverted={true} href="/" />
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md font-normal">
              منصة متجر الحبيشي الإلكترونية الرائدة لتسوق وتوزيع الألعاب، الإكسسوارات، الخردوات والأدوات، والأواني المنزلية. تجربة حجز عصرية وسريعة مع تحديث فوري للمخزون وكشف حساب مالي متكامل.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 font-medium">
                🎯 جودة ومطابقة
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 font-medium">
                📦 بضائع متجددة
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 font-medium">
                ⚡ تثبيت فوري
              </span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              <span>روابط سريعة</span>
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>الرئيسية</span>
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>كتالوج المنتجات</span>
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>أقسام المتجر</span>
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>سلة المشتريات</span>
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>البحث في البضائع</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Portal Column */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>بوابة العميل</span>
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/login" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>تسجيل الدخول / إنشاء حساب</span>
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>متابعة الطلبيات والفواتير</span>
                </Link>
              </li>
              <li>
                <Link href="/account/statement" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>كشف الحساب والمديونية</span>
                </Link>
              </li>
              <li>
                <Link href="/account/payments" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>سجل المدفوعات وسندات القبض</span>
                </Link>
              </li>
              <li>
                <Link href="/account/notifications" className="hover:text-blue-300 transition-colors flex items-center gap-1.5 group">
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
                  <span>إشعارات الحساب والتجهيز</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support Column */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>التواصل والطلبيات</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              للاستفسارات الخاصة أو طلب كميات محددة، يسعدنا تواصلكم المباشر.
            </p>
            <div className="space-y-2">
              <a
                href="https://wa.me/967781836479"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>مراسلة واتساب المتجر</span>
                </div>
                <ChevronLeft className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                href="tel:781836479"
                className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>اتصال مباشر</span>
                </div>
                <span dir="ltr" className="font-mono text-[11px] font-bold">781836479</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Developer Credits */}
        <div className="border-t border-slate-800/80 pt-8 flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-slate-400">
          <div className="text-center md:text-right space-y-1">
            <p className="font-medium text-slate-300">
              © 2026 متجر الحبيشي. جميع الحقوق محفوظة.
            </p>
            <p className="text-[11px] text-slate-500">
              نظام إدارة المخزون، الطلبيات وكشوفات الحساب الإلكترونية المباشرة.
            </p>
          </div>

          {/* High-End Developer Credit Badge */}
          <div className="flex flex-wrap items-center justify-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800/90 shadow-xl shadow-black/30 hover:border-blue-500/50 transition-all duration-300 group">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 text-xs font-medium">تصميم وتطوير :</span>
              <span className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">
                م. هيثم النمر
              </span>
            </div>

            <span className="text-slate-700 hidden sm:inline">|</span>

            <div className="flex items-center gap-2">
              <a
                href="tel:774159901"
                dir="ltr"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-mono font-bold transition-all duration-200 cursor-pointer"
                title="اتصال هاتفي"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>774159901</span>
              </a>

              <a
                href="https://wa.me/967774159901"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-medium transition-all duration-200 cursor-pointer"
                title="مراسلة عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="text-[11px] font-sans font-bold">واتساب</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

