'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logoutAction } from '@/features/auth/actions/auth.actions';
import { LogOut, Loader2 } from 'lucide-react';
import { toast } from '@/shared/ui/toast';

interface LogoutButtonProps {
  variant?: 'icon' | 'full' | 'menu-item';
  className?: string;
  onSuccess?: () => void;
}

export function LogoutButton({
  variant = 'icon',
  className,
  onSuccess,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);

      // Sign out from client SDK if loaded
      try {
        const { clientAuth } = await import('@/infrastructure/firebase/client');
        const { signOut } = await import('firebase/auth');
        await signOut(clientAuth());
      } catch (e) {
        // Ignore if client SDK was not initialized
      }

      const res = await logoutAction();
      if (res.ok) {
        onSuccess?.();
        toast.success('تم تسجيل الخروج بنجاح');
        router.push('/');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('فشل تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={
          className ||
          'w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50'
        }
        title="تسجيل الخروج"
        aria-label="تسجيل الخروج"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span>{loading ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
      </button>
    );
  }

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={
          className ||
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-sm font-bold text-right cursor-pointer disabled:opacity-50'
        }
        title="تسجيل الخروج"
        aria-label="تسجيل الخروج"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
        ) : (
          <LogOut className="w-4 h-4 text-rose-500" />
        )}
        <span>{loading ? 'جاري الخروج...' : 'تسجيل الخروج من الحساب'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={
        className ||
        'p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer'
      }
      title="تسجيل الخروج"
      aria-label="تسجيل الخروج"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
    </button>
  );
}
