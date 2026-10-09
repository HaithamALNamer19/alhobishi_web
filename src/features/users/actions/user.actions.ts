'use server';

import { z } from 'zod';
import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { requireRole, requireSession } from '@/core/auth/require-auth';
import { Role, ROLES, type Role as RoleType } from '@/core/auth/roles';
import { userRepository } from '../infrastructure/firestore-user.repository';
import type { UserProfile } from '../domain/user';

const roleUpdateSchema = z.object({
  targetUid: z.string().min(1),
  newRole: z.enum(ROLES as [RoleType, ...RoleType[]]),
});

const statusUpdateSchema = z.object({
  targetUid: z.string().min(1),
  newStatus: z.enum(['active', 'disabled'] as const),
});

export async function updateUserRoleAction(
  targetUid: string,
  newRole: RoleType
): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    const adminUser = await requireRole([Role.ADMIN]);
    const input = roleUpdateSchema.parse({ targetUid, newRole });

    await userRepository.updateUserRole(
      input.targetUid,
      input.newRole,
      adminUser.uid,
      adminUser.email || 'Admin'
    );

    const { notificationRepository } = await import('@/features/notifications/infrastructure/firestore-notification.repository');
    await notificationRepository.create({
      userId: input.targetUid,
      title: 'تحديث بيانات الحساب',
      message: 'تم تحديث وتفعيل صلاحيات حسابك بنجاح من قبل إدارة المتجر.',
      type: 'ROLE_UPDATED',
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/customers');
    revalidatePath('/account');

    return { success: true };
  });
}

export async function updateUserStatusAction(
  targetUid: string,
  newStatus: 'active' | 'disabled'
): Promise<Result<{ success: boolean }>> {
  return runAction(async () => {
    const adminUser = await requireRole([Role.ADMIN]);
    const input = statusUpdateSchema.parse({ targetUid, newStatus });

    await userRepository.updateUserStatus(
      input.targetUid,
      input.newStatus,
      adminUser.uid,
      adminUser.email || 'Admin'
    );

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/customers');
    revalidatePath('/account');
    revalidatePath('/cart');
    revalidatePath('/checkout');
    revalidatePath('/');

    return { success: true };
  });
}

export async function getCurrentUserProfileAction(): Promise<Result<UserProfile | null>> {
  return runAction(async () => {
    const session = await requireSession();
    return await userRepository.findById(session.uid);
  });
}
