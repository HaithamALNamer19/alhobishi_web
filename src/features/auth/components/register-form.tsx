'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';
import { registerAction, createSessionAction } from '../actions/auth.actions';
import { usernameToEmail } from '../domain/username';
import {
  User,
  AtSign,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    try {
      setLoading(true);

      // 1. Call server action for atomic registration
      const res = await registerAction({
        displayName,
        username,
        phone,
        password,
        confirmPassword,
      });

      if (!res.ok) {
        setError(res.error.message);
        if (res.error.fieldErrors) {
          setFieldErrors(res.error.fieldErrors);
        }
        return;
      }

      // 2. Client logs in automatically
      const { clientAuth } = await import('@/infrastructure/firebase/client');
      const { signInWithEmailAndPassword } = await import('firebase/auth');

      const internalEmail = usernameToEmail(res.data.username);
      const credential = await signInWithEmailAndPassword(clientAuth(), internalEmail, password);
      const idToken = await credential.user.getIdToken();

      // 3. Establish session
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
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl p-7 sm:p-9 space-y-6">
      {/* Header */}
      <div className="text-right space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
          <span>انضم إلينا اليوم ✨</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          إنشاء حساب جديد
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          سجّل بياناتك لبدء تصفح البضائع وحجز طلباتك ومتابعتها
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

        {/* Display Name Field */}
        <div className="space-y-1.5 text-right">
          <label className="block text-xs font-bold text-slate-700">
            الاسم الكامل <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="مثال: محمد اليافعي"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.displayName && (
            <p className="text-xs text-rose-600 font-medium">{fieldErrors.displayName[0]}</p>
          )}
        </div>

        {/* Username Field */}
        <div className="space-y-1.5 text-right">
          <label className="block text-xs font-bold text-slate-700">
            اسم المستخدم بالإنجليزية <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              autoComplete="username"
              dir="ltr"
              placeholder="mohammed"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              required
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.username && (
            <p className="text-xs text-rose-600 font-medium">{fieldErrors.username[0]}</p>
          )}
        </div>

        {/* Phone Field */}
        <div className="space-y-1.5 text-right">
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.phone && (
            <p className="text-xs text-rose-600 font-medium">{fieldErrors.phone[0]}</p>
          )}
        </div>

        {/* Password Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 text-right">
            <label className="block text-xs font-bold text-slate-700">
              كلمة المرور <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-10 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-right">
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
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                dir="ltr"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className={`w-full rounded-2xl border bg-slate-50/50 px-4 py-3 pl-10 text-sm text-slate-900 placeholder-slate-400 font-mono transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                  passwordsMatch
                    ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                    : 'border-slate-200 focus:ring-blue-600 focus:border-blue-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Submit CTA */}
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

        {/* Login Link */}
        <div className="pt-2 text-center text-xs text-slate-500">
          لديك حساب مسجل بالفعل؟{' '}
          <Link
            href={`/login?from=${encodeURIComponent(from)}`}
            className="text-blue-700 font-bold hover:text-blue-900 transition-colors"
          >
            تسجيل الدخول هنا ←
          </Link>
        </div>
      </form>
    </div>
  );
}
