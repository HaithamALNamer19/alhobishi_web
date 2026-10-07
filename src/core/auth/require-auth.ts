import 'server-only';
import { AppError } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { can, parseRole, type Permission, type Role } from '@/core/auth/roles';
import { getSession, type SessionUser } from '@/features/auth/infrastructure/session';

export async function getCurrentSession(): Promise<SessionUser | null> {
  try {
    const decoded = await getSession(false);
    if (!decoded) return null;

    return {
      uid: decoded.uid,
      role: parseRole(decoded.role),
      email: decoded.email,
      phone_number: decoded.phone_number,
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

  return {
    uid: decoded.uid,
    role: parseRole(decoded.role),
    email: decoded.email,
    phone_number: decoded.phone_number,
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
