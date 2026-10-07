'use client';

import React from 'react';
import { PackageCheck, FileText, Sparkles, Layers, ShieldCheck, Zap } from 'lucide-react';

interface AuthShowcasePanelProps {
  mode: 'login' | 'register';
}

export function AuthShowcasePanel({ mode }: AuthShowcasePanelProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 p-8 sm:p-12 text-white flex flex-col justify-between shadow-2xl border border-blue-800/40 min-h-[580px]">
      {/* Ambient background glow orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top Header / Branding */}
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white p-0.5 shadow-md border border-white/20 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="شعار المتجر"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <span className="font-black text-lg text-white block tracking-tight">
              متجر الحبيشي
            </span>
            <span className="text-xs text-blue-300 font-medium">
              للألعاب والإكسسوارات والخردوات
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>{mode === 'login' ? 'أهلاً بعودتك مجددًا' : 'ابدأ رحلة التسوق الذكية'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug">
            {mode === 'login'
              ? 'تسوق، احجز، وتابع طلبياتك وفواتيرك بكل ثقة'
              : 'أنشئ حسابك خلال ثوانٍ واحجز بضائعك فوراً'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
            منظومة متطورة تجمع بين سلاسة تصفح المنتجات، الحجز الفوري للمخزون، وتوثيق دقيق لكافة الحركات المالية.
          </p>
        </div>
      </div>

      {/* Middle Interactive / Glassmorphic Floating Cards */}
      <div className="relative z-10 space-y-3.5 my-8">
        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-start gap-3 shadow-lg transition-transform hover:scale-[1.02]">
          <div className="w-9 h-9 rounded-xl bg-blue-600/50 flex items-center justify-center shrink-0 border border-blue-400/30 text-blue-200">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="text-right">
            <h4 className="text-xs font-bold text-white">حجز فوري مباشر من المستودع</h4>
            <p className="text-[11px] text-blue-200/80 mt-0.5 leading-relaxed">
              يتم قفل الكميات المطلوبة في المخزون فورياً لمنع نفاذ الأصناف.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-start gap-3 shadow-lg transition-transform hover:scale-[1.02]">
          <div className="w-9 h-9 rounded-xl bg-amber-500/40 flex items-center justify-center shrink-0 border border-amber-300/30 text-amber-200">
            <Layers className="w-5 h-5" />
          </div>
          <div className="text-right">
            <h4 className="text-xs font-bold text-white">مرونة تعديل الفاتورة</h4>
            <p className="text-[11px] text-blue-200/80 mt-0.5 leading-relaxed">
              تحكم بزيادة أو تقليل الأصناف في فاتورتك بحرية قبل اعتماد التجهيز.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-start gap-3 shadow-lg transition-transform hover:scale-[1.02]">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/40 flex items-center justify-center shrink-0 border border-emerald-300/30 text-emerald-200">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-right">
            <h4 className="text-xs font-bold text-white">كشف حساب مالي لحظي</h4>
            <p className="text-[11px] text-blue-200/80 mt-0.5 leading-relaxed">
              سجل واضح يوضح مسحوباتك وسندات السداد ورصيدك بدقة متناهية.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Category Pills */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-300">
        <span className="font-semibold text-white/90">الأقسام المتوفرة:</span>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">ألعاب</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">إكسسوارات</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">أواني منزلية</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">أدوات وصيانة</span>
        </div>
      </div>
    </div>
  );
}

