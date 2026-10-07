'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

/**
 * Firebase Client SDK. Import this module ONLY via dynamic `import()` from
 * interactive components (login, notifications listener) so public store
 * pages never ship the Firebase SDK to anonymous visitors.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

function app(): FirebaseApp {
  if (getApps().length) return getApp();
  const safeConfig = {
    apiKey: config.apiKey || 'placeholder-api-key',
    authDomain: config.authDomain || 'placeholder.firebaseapp.com',
    projectId: config.projectId || 'alhobishi-ecommerce',
    storageBucket: config.storageBucket || '',
    messagingSenderId: config.messagingSenderId || '000000000000',
    appId: config.appId || '1:000000000000:web:placeholder',
  };
  return initializeApp(safeConfig);
}

let auth: Auth | null = null;

export function clientAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(app());
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return auth;
}

export function clientApp(): FirebaseApp {
  return app();
}

