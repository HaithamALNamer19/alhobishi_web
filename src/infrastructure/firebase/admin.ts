import 'server-only';
import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { serverEnv } from '@/core/config/server-env';

/**
 * Firebase Admin SDK singletons. Server-only: bypasses Security Rules, so it is
 * the ONLY path allowed to write business data (orders, stock, ledger, roles).
 */
function createApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const env = serverEnv();
  const usingEmulators = Boolean(env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST);

  if (usingEmulators) {
    return initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  }

  let credential;
  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      let parsed: any;
      if (raw.startsWith('{')) {
        parsed = JSON.parse(raw);
      } else if (raw.startsWith('"')) {
        parsed = JSON.parse(JSON.parse(raw));
      } else {
        try {
          const decoded = Buffer.from(raw, 'base64').toString('utf8');
          parsed = JSON.parse(decoded);
        } catch {
          parsed = raw;
        }
      }

      if (parsed && typeof parsed === 'object') {
        if (parsed.private_key && typeof parsed.private_key === 'string') {
          // Replace escaped literal \n with real newlines for RSA parser
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        credential = cert(parsed);
      } else {
        credential = cert(parsed);
      }
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err);
      try {
        credential = cert(env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } catch {
        try {
          credential = applicationDefault();
        } catch {
          // fallback
        }
      }
    }
  } else {
    try {
      const fs = require('fs');
      const path = require('path');
      const saPath = path.resolve(process.cwd(), 'service-account.json');
      if (fs.existsSync(saPath)) {
        credential = cert(saPath);
      } else {
        credential = applicationDefault();
      }
    } catch {
      try {
        credential = applicationDefault();
      } catch {
        // fallback
      }
    }
  }

  return initializeApp({
    credential,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });
}

let firestore: Firestore | null = null;

export function adminApp(): App {
  return createApp();
}

export function adminAuth(): Auth {
  return getAuth(createApp());
}

export function adminDb(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(createApp());
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}

