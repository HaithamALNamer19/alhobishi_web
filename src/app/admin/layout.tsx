import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/core/auth/require-auth';
import { isBackOfficeRole, can, Permission } from '@/core/auth/roles';
import { AdminSidebar } from '@/features/admin/components/admin-sidebar';

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session || !isBackOfficeRole(session.role)) {
    redirect('/login?from=/admin');
  }

  const isAdmin = can(session.role, Permission.USERS_MANAGE_ROLES);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-right">
      {/* Responsive Admin Sidebar (Desktop sidebar + Mobile Topbar & Quick Tabs) */}
      <AdminSidebar session={session} isAdmin={isAdmin} />

      {/* Main Admin Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
