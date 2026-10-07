/**
 * Username rules (pure domain logic, shared by client and server).
 * Firebase Auth has no native username login, so each username maps to an
 * internal, non-deliverable email. Auth guarantees email uniqueness atomically,
 * which gives us race-free username uniqueness for free.
 */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;
export const INTERNAL_EMAIL_DOMAIN = 'users.matjar.internal';

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username) && !username.endsWith('_') && !username.includes('__');
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  return domain === INTERNAL_EMAIL_DOMAIN ? (local ?? null) : null;
}

