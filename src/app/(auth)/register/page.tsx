import React, { Suspense } from 'react';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthPageContainer } from '@/features/auth/components/auth-page-container';
import { CardSkeleton } from '@/shared/ui/skeleton';

export const metadata = {
  title: 'إنشاء حساب جديد | متجر الحبيشي',
  description: 'أنشئ حسابك لبدء التسوق وحجز البضائع ومتابعة الطلبات وكشف الحساب.',
};

export default function RegisterPage() {
  return (
    <AuthPageContainer>
      <Suspense fallback={<CardSkeleton />}>
        <AuthCard initialMode="register" />
      </Suspense>
    </AuthPageContainer>
  );
}
