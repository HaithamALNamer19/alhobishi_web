import 'server-only';
import { cache } from 'react';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { can, parseRole, type Permission, type Role } from '@/core/auth/roles';
import { getSession, clearSession, type SessionUser } from '@/features/auth/infrastructure/session';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';

// Request-scoped memoization for user profile lookups in server components
const getCachedUserProfile = cache(async (uid: string) => {
  try {
    return await userRepository.findById(uid);
  } catch {
    return null;
  }
});

export async function getCurrentSession(): Promise<SessionUser | null> {
  try {
    const decoded = await getSession(false);
    if (!decoded) return null;

    const user = await getCachedUserProfile(decoded.uid);
    if (!user || user.status === 'disabled') {
      try {
        await clearSession();
      } catch {
        // Ignored if executed in read-only render context
      }
      return null;
    }

    return {
      uid: decoded.uid,
      role: parseRole(user.role ?? decoded.role),
      email: decoded.email,
      phone_number: user.phone || decoded.phone_number,
    };
  } catch (error: any) {
    if (error?.digest === 'HANGING_PROMISE_REJECTION' || error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    return null;
  }
}

export async function requireSession(checkRevoked = false): Promise<SessionUser> {
  const decoded = await getSession(checkRevoked);
  if (!decoded) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const user = await getCachedUserProfile(decoded.uid);
  if (!user || user.status === 'disabled') {
    try {
      await clearSession();
    } catch {
      // Ignored if executed in read-only render context
    }
    throw new AppError(ErrorCode.ACCOUNT_DISABLED, {
      message: 'هذا الحساب معطّل. تواصل مع إدارة المتجر.',
    });
  }

  return {
    uid: decoded.uid,
    role: parseRole(user.role ?? decoded.role),
    email: decoded.email,
    phone_number: user.phone || decoded.phone_number,
  };
}

export const requireAuth = requireSession;

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireSession(true);
  if (!allowedRoles.includes(user.role)) {
    throw new AppError(ErrorCode.FORBIDDEN);
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireSession(true);
  if (!can(user.role, permission)) {
    throw new AppError(ErrorCode.FORBIDDEN);
  }
  return user;
}
