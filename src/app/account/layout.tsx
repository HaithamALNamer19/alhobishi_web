import React from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login?from=/account');
  }

  const profile = await userRepository.findById(session.uid);
  if (!profile || profile.status === 'disabled') {
    redirect('/login?error=disabled');
  }

  return <>{children}</>;
}

