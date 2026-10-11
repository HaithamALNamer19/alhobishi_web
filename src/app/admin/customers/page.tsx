import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { CustomerManager } from '@/features/users/components/customer-manager';
import { getCurrentSession } from '@/core/auth/require-auth';

export const metadata = {
  title: 'العملاء والموظفون والتجار | إدارة المتجر',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminCustomersPage() {
  await connection();
  const session = await getCurrentSession();
  const users = await userRepository.listUsers(undefined, 100);

  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-400 text-sm">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p>جاري تحميل قائمة العملاء والمستخدمين...</p>
        </div>
      }
    >
      <CustomerManager initialUsers={users} currentUserId={session?.uid} />
    </Suspense>
  );
}
