import 'server-only';
import { z } from 'zod';

/**
 * Server-side environment, validated once at startup.
 * Provides a fallback 'matjar-dev' for build-time static page collection.
 */
const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1).default('matjar-dev'),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  SESSION_DAYS: z.coerce.number().int().min(1).max(14).default(5),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    FIREBASE_PROJECT_ID:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'matjar-dev',
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || undefined,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || undefined,
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || undefined,
    SESSION_DAYS: process.env.SESSION_DAYS || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
