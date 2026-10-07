'use client';

import React from 'react';
import {
  PackageCheck,
  ShieldCheck,
  Receipt,
  Sparkles,
  Layers,
  Zap,
  ShoppingBag,
  CheckCircle2,
  Lock,
  Boxes,
  Truck,
} from 'lucide-react';

interface AuthPageContainerProps {
  children: React.ReactNode;
}

export function AuthPageContainer({ children }: AuthPageContainerProps) {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-slate-100 via-blue-50/25 to-slate-100">
      {/* Background Layer 1: Dot Matrix Blueprint Grid */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#94a3b8_1.25px,transparent_1.25px)] [background-size:26px_26px] opacity-45 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
        aria-hidden="true"
      />

      {/* Background Layer 2: Decorative Subtle Concentric Ambient Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full border border-blue-200/40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full border border-slate-200/30 pointer-events-none" />

      {/* Background Layer 3: Vibrant Glowing Ambient Orbs */}
      <div className="absolute -top-24 right-10 sm:right-1/4 w-[520px] h-[520px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 left-10 sm:left-1/4 w-[520px] h-[520px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-amber-400/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Top Floating Badge */}
        <div className="hidden sm:flex items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-blue-600 -mr-4" />
            <span>بوابة التسوق والحجز الإلكتروني المباشر</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-700 font-bold">متجر الحبيشي</span>
          </div>
        </div>

        {/* 3-Column Responsive Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Right Flanking Wing (in RTL: visible on right side of desktop) */}
          <div className="hidden xl:flex xl:col-span-3 flex-col gap-5 text-right">
            {/* Feature Card 1 */}
            <div className="group p-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-white/90 shadow-xl shadow-blue-950/5 hover:shadow-2xl hover:border-blue-200/80 transition-all duration-300 transform -rotate-1 hover:rotate-0">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-blue-600" />
                  حجز فوري
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                  <PackageCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                حجز البضائع من المستودع
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                تثبيت كميات طلباتك مباشرة من المخزون بمجرد تأكيد الفاتورة، دون انتظار أو خوف من نفاذ الكمية.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group p-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-white/90 shadow-xl shadow-blue-950/5 hover:shadow-2xl hover:border-amber-200/80 transition-all duration-300 transform rotate-1 hover:rotate-0">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  أقسام متنوعة
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                أحدث الأصناف والتشكيلات
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                تجدد مستمر في الألعاب، الإكسسوارات، الأدوات، والأواني المنزلية مع متغيرات الألوان والمقاسات.
              </p>
            </div>

            {/* Mini Trust Pill */}
            <div className="p-3.5 rounded-2xl bg-blue-950/5 backdrop-blur-md border border-blue-900/10 flex items-center gap-2.5 text-xs text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">تحديث فوري للكميات المتاحة</span>
            </div>
          </div>

          {/* Center Column: The Unified Centered Card */}
          <div className="col-span-1 lg:col-span-12 xl:col-span-6 flex justify-center w-full">
            <div className="w-full max-w-lg">
              {children}
            </div>
          </div>

          {/* Left Flanking Wing (in RTL: visible on left side of desktop) */}
          <div className="hidden xl:flex xl:col-span-3 flex-col gap-5 text-right">
            {/* Feature Card 3 */}
            <div className="group p-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-white/90 shadow-xl shadow-blue-950/5 hover:shadow-2xl hover:border-emerald-200/80 transition-all duration-300 transform rotate-1 hover:rotate-0">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-emerald-600" />
                  توثيق مالي
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                كشف حساب ومتابعة لحظية
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                سجل واضح يوضح جميع مسحوباتك وسندات القبض ومطابقات الرصيد المالي بدقة متناهية.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="group p-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-white/90 shadow-xl shadow-blue-950/5 hover:shadow-2xl hover:border-indigo-200/80 transition-all duration-300 transform -rotate-1 hover:rotate-0">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  فحص وتجهيز
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                مرونة وسرعة في التجهيز
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                مراجعة وتغليف دقيق لكل صنف قبل التسليم مع إمكانية تعديل الفاتورة بحرية قبل اعتماد التجهيز.
              </p>
            </div>

            {/* Mini Trust Pill */}
            <div className="p-3.5 rounded-2xl bg-blue-950/5 backdrop-blur-md border border-blue-900/10 flex items-center gap-2.5 text-xs text-slate-700">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium">بيانات محمية ومعاملات موثوقة</span>
            </div>
          </div>
        </div>

        {/* Bottom Wide Trust Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
            <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>حجز كميات فوري من المستودع</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
            <Layers className="w-4 h-4 text-amber-600 shrink-0" />
            <span>مرونة تعديل الفاتورة قبل التجهيز</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
            <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>كشف حساب مالي لحظي ومفصل</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>أمان وحماية كاملة للبيانات</span>
          </div>
        </div>
      </div>
    </div>
  );
}

