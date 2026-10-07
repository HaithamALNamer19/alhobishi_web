import { ErrorCode } from './error-codes';
import { errorMessagesAr } from './messages.ar';

export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Domain/application error carrying a stable code.
 * Thrown inside use cases and transactions; converted to a `Result` at the
 * Server Action boundary (see core/actions/run-action.ts).
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  readonly fieldErrors?: FieldErrors;

  constructor(
    code: ErrorCode,
    options: {
      message?: string;
      details?: Record<string, unknown>;
      fieldErrors?: FieldErrors;
      cause?: unknown;
    } = {},
  ) {
    super(options.message ?? errorMessagesAr[code], { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.details = options.details;
    this.fieldErrors = options.fieldErrors;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Throws `AppError(code)` when `condition` is falsy. Narrowing helper. */
export function ensure(condition: unknown, code: ErrorCode, message?: string): asserts condition {
  if (!condition) throw new AppError(code, { message });
}

