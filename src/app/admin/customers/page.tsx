import React from 'react';
import { connection } from 'next/server';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { CustomerManager } from '@/features/users/components/customer-manager';
import { getCurrentSession } from '@/core/auth/require-auth';

export const metadata = {
  title: 'العملاء والموظفون والتجار | إدارة المتجر',
};

export const instant = false;

export default async function AdminCustomersPage() {
  await connection();
  const session = await getCurrentSession();
  const users = await userRepository.listUsers(undefined, 100);

  return <CustomerManager initialUsers={users} currentUserId={session?.uid} />;
}

