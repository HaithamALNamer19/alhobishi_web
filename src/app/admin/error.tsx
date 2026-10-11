'use client';

import React, { useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin page runtime error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-xs">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">حدث خطأ غير متوقع أثناء عرض هذه الصفحة</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        تعذر تحميل بيانات الصفحة الحالية بشكل صحيح. يمكنك المحاولة مرة أخرى أو الانتقال إلى قسم آخر من القائمة الجانبية.
      </p>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة المحاولة</span>
        </Button>
      </div>
    </div>
  );
}

