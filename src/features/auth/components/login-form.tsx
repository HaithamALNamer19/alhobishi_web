'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';
import { createSessionAction } from '../actions/auth.actions';
import { usernameToEmail } from '../domain/username';
import { isBackOfficeRole } from '@/core/auth/roles';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';
  const errorParam = searchParams.get('error');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'disabled'
      ? 'تم إيقاف هذا الحساب من قبل إدارة المتجر. يرجى التواصل مع الإدارة.'
      : null
  );

  const fillDemoAccount = (u: string, p: string, label: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    toast.success(`تم تعبئة بيانات: ${label}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim().toLowerCase();
    if (!trimmedUser || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    try {
      setLoading(true);

      // 1. Dynamic import of client Firebase Auth
      const { clientAuth } = await import('@/infrastructure/firebase/client');
      const { signInWithEmailAndPassword } = await import('firebase/auth');

      // 2. Map username to internal non-deliverable email
      const internalEmail = usernameToEmail(trimmedUser);

      // 3. Authenticate with Firebase Auth
      let credential;
      try {
        credential = await signInWithEmailAndPassword(clientAuth(), internalEmail, password);
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/wrong-password' ||
          authErr.code === 'auth/invalid-email'
        ) {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
          return;
        }
        if (authErr.code === 'auth/user-disabled') {
          setError('هذا الحساب معطّل. تواصل مع إدارة المتجر.');
          return;
        }
        if (authErr.code === 'auth/too-many-requests') {
          setError('تم إيقاف المحاولات مؤقتًا لكثرتها. الرجاء الانتظار دقيقة.');
          return;
        }
        setError(`خطأ أثناء تسجيل الدخول: ${authErr.message}`);
        return;
      }

      // 4. Extract ID token
      const idToken = await credential.user.getIdToken();

      // 5. Establish secure session cookie
      const sessionRes = await createSessionAction(idToken);

      if (!sessionRes.ok) {
        setError(sessionRes.error.message || 'فشل إنشاء جلسة الدخول');
        return;
      }

      const isBackOffice = isBackOfficeRole(sessionRes.data.role);
      const targetPath = isBackOffice && (!from || from === '/') ? '/admin' : (from || '/');

      toast.success(isBackOffice ? 'مرحبًا بك! جاري تحويلك للوحة الإدارة...' : 'مرحبًا بك! تم تسجيل الدخول بنجاح');
      router.push(targetPath);
      router.refresh();
    } catch (err: any) {
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl p-7 sm:p-9 space-y-6">
      {/* Header with Greeting */}
      <div className="text-right space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
          <span>مرحبًا بك مجددًا 👋</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          تسجيل الدخول
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          أدخل اسم المستخدم وكلمة المرور للوصول إلى سلتك وطلباتك
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Username Field */}
        <div className="space-y-1.5 text-right">
          <label className="block text-xs font-bold text-slate-700">
            اسم المستخدم <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              autoComplete="username"
              dir="ltr"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5 text-right">
          <label className="block text-xs font-bold text-slate-700">
            كلمة المرور <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              dir="ltr"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit CTA */}
        <Button
          type="submit"
          variant="primary"
          className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all"
          size="lg"
          isLoading={loading}
        >
          <span>تسجيل الدخول</span>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {/* Register Link */}
        <div className="pt-2 text-center text-xs text-slate-500">
          ليس لديك حساب بعد؟{' '}
          <Link
            href={`/register?from=${encodeURIComponent(from)}`}
            className="text-blue-700 font-bold hover:text-blue-900 transition-colors"
          >
            إنشاء حساب جديد ←
          </Link>
        </div>
      </form>

      {/* Quick Demo Credentials Helper */}
      <div className="pt-5 border-t border-slate-100 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>حسابات تجريبية سريعة (للتجربة بنقرة واحدة):</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillDemoAccount('admin', 'AdminPassword123!', 'مدير المتجر')}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 text-[11px] font-bold transition-all text-center cursor-pointer"
          >
            مدير المتجر
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('trader_ali', 'TraderPassword123!', 'التاجر علي')}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-700 text-[11px] font-bold transition-all text-center cursor-pointer"
          >
            تاجر معتمد
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('salem_customer', 'CustomerPassword123!', 'عميل عادي')}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 text-[11px] font-bold transition-all text-center cursor-pointer"
          >
            عميل عادي
          </button>
        </div>
      </div>
    </div>
  );
}
