import type { ErrorCode } from '@/core/errors/error-codes';
import type { FieldErrors } from '@/core/errors/app-error';

/**
 * Serializable result returned by every Server Action.
 * Next.js hides thrown error messages in production, so business failures are
 * returned as data instead of thrown across the network boundary.
 */
export type ActionError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  details?: Record<string, unknown>;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: ActionError): Result<never> => ({ ok: false, error });

