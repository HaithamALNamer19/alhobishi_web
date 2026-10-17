import React from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/core/auth/require-auth';
import { can, Permission } from '@/core/auth/roles';
import { storeSettingsRepository } from '@/features/settings/infrastructure/firestore-store-settings.repository';
import { AdminStoreSettingsView } from '@/features/settings/components/admin-store-settings-view';

export const metadata = {
  title: 'إعدادات المتجر والهوية الرسمية | لوحة الإدارة',
  description: 'إدارة اسم المتجر التجاري، الشعار، أرقام التواصل، ترويسات وملاحظات الفواتير، وحالة استقبال الطلبات.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminSettingsPage() {
  await connection();
  const session = await getCurrentSession();

  const hasPermission =
    can(session?.role, Permission.SETTINGS_MANAGE) ||
    can(session?.role, Permission.USERS_MANAGE_ROLES);

  if (!hasPermission) {
    redirect('/admin');
  }

  const settings = await storeSettingsRepository.getSettings();

  return <AdminStoreSettingsView initialSettings={settings} />;
}
