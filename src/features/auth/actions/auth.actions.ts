'use server';

import { runAction } from '@/core/actions/run-action';
import type { Result } from '@/core/domain/result';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { adminAuth } from '@/infrastructure/firebase/admin';
import { registerSchema, idTokenSchema, type RegisterInput } from '../schemas/auth.schemas';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { createAndSetSession, clearSession, type SessionUser } from '../infrastructure/session';

export async function registerAction(
  rawInput: RegisterInput
): Promise<Result<{ uid: string; username: string }>> {
  return runAction(async () => {
    const data = registerSchema.parse(rawInput);
    const profile = await userRepository.registerUser({
      displayName: data.displayName,
      username: data.username,
      phone: data.phone,
      password: data.password,
    });

    return {
      uid: profile.uid,
      username: profile.username,
    };
  });
}

export async function createSessionAction(
  idToken: string
): Promise<Result<SessionUser>> {
  return runAction(async () => {
    const validatedToken = idTokenSchema.parse(idToken);
    const decoded = await adminAuth().verifyIdToken(validatedToken);
    const userDoc = await userRepository.findById(decoded.uid);
    if (userDoc?.status === 'disabled') {
      throw new AppError(ErrorCode.ACCOUNT_DISABLED, {
        message: 'هذا الحساب معطّل. تواصل مع إدارة المتجر.',
      });
    }
    return await createAndSetSession(validatedToken);
  });
}

export async function logoutAction(): Promise<Result<{ loggedOut: boolean }>> {
  return runAction(async () => {
    await clearSession();
    return { loggedOut: true };
  });
}
