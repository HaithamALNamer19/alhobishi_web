import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '@/infrastructure/firebase/admin';
import { serverEnv } from '@/core/config/server-env';
import { parseRole, type Role } from '@/core/auth/roles';

/**
 * Firebase Hosting and App Hosting only preserve cookies named `__session`.
 * Using `__session` ensures compatibility across all Firebase environments.
 */
export const SESSION_COOKIE_NAME = '__session';

export interface SessionUser {
  uid: string;
  role: Role;
  email?: string;
  phone_number?: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function createAndSetSession(idToken: string): Promise<SessionUser> {
  const env = serverEnv();
  const expiresInMs = (env.SESSION_DAYS || 5) * ONE_DAY_MS;

  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: expiresInMs,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    maxAge: Math.floor(expiresInMs / 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
  return {
    uid: decoded.uid,
    role: parseRole(decoded.role),
    email: decoded.email,
    phone_number: decoded.phone_number,
  };
}

export async function getSession(checkRevoked = false): Promise<DecodedIdToken | null> {
  await connection();
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) return null;

    return await adminAuth().verifySessionCookie(cookie, checkRevoked);
  } catch (error) {
    // Expired or invalid session
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function revokeUserSessions(uid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(uid);
}
