import React, { Suspense } from 'react';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthPageContainer } from '@/features/auth/components/auth-page-container';
import { CardSkeleton } from '@/shared/ui/skeleton';

export const metadata = {
  title: 'تسجيل الدخول | متجر الحبيشي',
  description: 'سجّل دخولك للوصول إلى سلة التسوق وحجز المنتجات ومتابعة كشف الحساب والطلبات.',
};

export default function LoginPage() {
  return (
    <AuthPageContainer>
      <Suspense fallback={<CardSkeleton />}>
        <AuthCard initialMode="login" />
      </Suspense>
    </AuthPageContainer>
  );
}
