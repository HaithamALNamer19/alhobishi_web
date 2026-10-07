'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';
import { registerAction, createSessionAction } from '../actions/auth.actions';
import { usernameToEmail } from '../domain/username';
import { isBackOfficeRole } from '@/core/auth/roles';
import {
  User,
  AtSign,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  UserPlus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  PackageCheck,
  FileText,
} from 'lucide-react';

interface AuthCardProps {
  initialMode: 'login' | 'register';
}

export function AuthCard({ initialMode }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [displayName, setDisplayName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const passwordsMatch = confirmPassword.length > 0 && registerPassword === confirmPassword;

  // Demo account filler
  const fillDemoAccount = (u: string, p: string, label: string) => {
    setLoginUsername(u);
    setLoginPassword(p);
    setError(null);
    toast.success(`تم اختيار: ${label}`);
  };

  // Login submit handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = loginUsername.trim().toLowerCase();
    if (!trimmedUser || !loginPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    try {
      setLoading(true);

      const { clientAuth } = await import('@/infrastructure/firebase/client');
      const { signInWithEmailAndPassword } = await import('firebase/auth');

      const internalEmail = usernameToEmail(trimmedUser);

      let credential;
      try {
        credential = await signInWithEmailAndPassword(clientAuth(), internalEmail, loginPassword);
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

      const idToken = await credential.user.getIdToken();
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

  // Register submit handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (registerPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    try {
      setLoading(true);

      const res = await registerAction({
        displayName,
        username: registerUsername,
        phone,
        password: registerPassword,
        confirmPassword,
      });

      if (!res.ok) {
        setError(res.error.message);
        if (res.error.fieldErrors) {
          setFieldErrors(res.error.fieldErrors);
        }
        return;
      }

      const { clientAuth } = await import('@/infrastructure/firebase/client');
      const { signInWithEmailAndPassword } = await import('firebase/auth');

      const internalEmail = usernameToEmail(res.data.username);
      const credential = await signInWithEmailAndPassword(clientAuth(), internalEmail, registerPassword);
      const idToken = await credential.user.getIdToken();

      await createSessionAction(idToken);

      toast.success('تم إنشاء حسابك وتفعيله بنجاح! مرحبًا بك.');
      router.push(from);
      router.refresh();
    } catch (err: any) {
      setError('حدث خطأ غير متوقع أثناء إنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-4xl border border-slate-200/90 shadow-2xl shadow-blue-950/10 overflow-hidden">
      {/* Top Banner with Logo, Brand & Tabs */}
      <div className="relative bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white p-6 sm:p-8 text-center overflow-hidden border-b border-blue-900/40">
        {/* Ambient subtle glow blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Centered Circular Emblem */}
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto bg-white p-0.5 shadow-xl border-2 border-white/40 ring-4 ring-blue-500/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="شعار متجر الحبيشي"
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              متجر الحبيشي
            </h2>
            <p className="text-xs text-blue-200/90 font-medium">
              للألعاب والإكسسوارات والخردوات
            </p>
          </div>

          {/* Segmented Mode Switcher Tabs */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 max-w-xs w-full">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-md scale-[1.02]'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-md scale-[1.02]'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              حساب جديد
            </button>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 sm:p-8 space-y-5">
        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="text-right space-y-1 pb-1">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md inline-block">
                مرحبًا بك مجددًا 👋
              </span>
              <p className="text-xs text-slate-500">
                أدخل اسم المستخدم وكلمة المرور للمتابعة
              </p>
            </div>

            {/* Username Field */}
            <div className="space-y-1 text-right">
              <label className="block text-xs font-bold text-slate-700">
                اسم المستخدم <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="username"
                  dir="ltr"
                  placeholder="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1 text-right">
              <label className="block text-xs font-bold text-slate-700">
                كلمة المرور <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label={showLoginPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
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

            {/* One-Click Demo Helper */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
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
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="text-right space-y-1 pb-1">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md inline-block">
                انضم إلينا اليوم ✨
              </span>
              <p className="text-xs text-slate-500">
                سجّل بياناتك لبدء التسوق وحجز طلباتك ومتابعتها
              </p>
            </div>

            {/* Display Name Field */}
            <div className="space-y-1 text-right">
              <label className="block text-xs font-bold text-slate-700">
                الاسم الكامل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="محمد اليافعي"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 pl-11 text-sm text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {fieldErrors.displayName && (
                <p className="text-xs text-rose-600 font-medium">{fieldErrors.displayName[0]}</p>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-1 text-right">
              <label className="block text-xs font-bold text-slate-700">
                اسم المستخدم بالإنجليزية <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="username"
                  dir="ltr"
                  placeholder="mohammed"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {fieldErrors.username && (
                <p className="text-xs text-rose-600 font-medium">{fieldErrors.username[0]}</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-1 text-right">
              <label className="block text-xs font-bold text-slate-700">
                رقم الهاتف <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="770123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-rose-600 font-medium">{fieldErrors.phone[0]}</p>
              )}
            </div>

            {/* Password Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 text-right">
                <label className="block text-xs font-bold text-slate-700">
                  كلمة المرور <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    dir="ltr"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 pl-10 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    تأكيد الكلمة <span className="text-rose-500">*</span>
                  </label>
                  {passwordsMatch && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> متطابقة
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    dir="ltr"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-2.5 pl-10 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                      passwordsMatch
                        ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                        : 'border-slate-200 focus:ring-blue-600 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Register Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all mt-2"
              size="lg"
              isLoading={loading}
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء الحساب والبدء</span>
            </Button>
          </form>
        )}

        {/* Bottom Trust Indicators */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px] sm:text-[11px] text-slate-500 font-medium">
          <div className="flex items-center justify-center gap-1">
            <PackageCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>حجز فوري</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>فحص وتجهيز</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>كشف حساب</span>
          </div>
        </div>
      </div>
    </div>
  );
}

