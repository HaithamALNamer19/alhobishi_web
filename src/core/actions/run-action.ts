import { z } from 'zod';
import { AppError, isAppError, type FieldErrors } from '@/core/errors/app-error';
import { ErrorCode } from '@/core/errors/error-codes';
import { errorMessagesAr } from '@/core/errors/messages.ar';
import { fail, ok, type Result } from '@/core/domain/result';

function formatZodIssues(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path]?.push(issue.message);
  }
  return fieldErrors;
}

/**
 * Wrapper for Server Actions.
 * Catches known AppErrors, Zod validation errors, and unexpected errors,
 * converting them into safe, serializable `Result<T>` values.
 */
export async function runAction<T>(action: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await action();
    return ok(data);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return fail({
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
        details: error.details,
      });
    }

    if (error instanceof z.ZodError) {
      return fail({
        code: ErrorCode.VALIDATION_FAILED,
        message: errorMessagesAr[ErrorCode.VALIDATION_FAILED],
        fieldErrors: formatZodIssues(error),
      });
    }

    console.error('Unhandled action error:', error);
    return fail({
      code: ErrorCode.INTERNAL,
      message: errorMessagesAr[ErrorCode.INTERNAL],
    });
  }
}
