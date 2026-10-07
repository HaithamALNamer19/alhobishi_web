try {
  (process as any).loadEnvFile?.('.env.local');
} catch {}

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Collections } from '../src/infrastructure/firebase/collections';

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'alhobishi-ecommerce';
  const serviceKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const isEmulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

  if (isEmulated) {
    initializeApp({ projectId });
  } else if (serviceKey) {
    initializeApp({
      credential: cert(JSON.parse(serviceKey)),
      projectId,
    });
  } else {
    try {
      const fs = require('fs');
      const path = require('path');
      const saPath = path.resolve(process.cwd(), 'service-account.json');
      if (fs.existsSync(saPath)) {
        initializeApp({
          credential: cert(saPath),
          projectId,
        });
      } else {
        initializeApp({
          credential: applicationDefault(),
          projectId,
        });
      }
    } catch {
      initializeApp({ projectId });
    }
  }
}

const db = getFirestore();
const auth = getAuth();

async function listAllUsers() {
  console.log('\n=================== مستخدمو النظام (قاعدة البيانات الحالية) ===================\n');

  // 1. Fetch from Firestore users collection
  const usersSnapshot = await db.collection(Collections.USERS).get();
  
  if (usersSnapshot.empty) {
    console.log('لم يتم العثور على أي مستخدمين في مجموعة Firestore users.');
  } else {
    console.log(`تم العثور على ${usersSnapshot.size} مستخدمين في Firestore:\n`);
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- المعرف (UID): ${doc.id}`);
      console.log(`  اسم المستخدم: @${data.username}`);
      console.log(`  الاسم المعروض: ${data.displayName}`);
      console.log(`  البريد الإلكتروني: ${data.email}`);
      console.log(`  رقم الهاتف: ${data.phone || 'غير مسجل'}`);
      console.log(`  الدور (Role): ${data.role}`);
      console.log(`  الحالة: ${data.status || 'active'}`);
      console.log(`  رصيد الحساب: ${data.account?.balance ?? 0} YER`);
      console.log('--------------------------------------------------');
    });
  }

  // 2. Fetch from Firebase Auth
  console.log('\n=================== حسابات Firebase Auth ===================\n');
  const authUsersResult = await auth.listUsers(100);
  console.log(`إجمالي المستخدمين في Firebase Auth: ${authUsersResult.users.length}\n`);
  for (const user of authUsersResult.users) {
    console.log(`- البريد: ${user.email} | الاسم: ${user.displayName || 'بدون'} | الصلاحيات (Claims): ${JSON.stringify(user.customClaims || {})}`);
  }
  console.log('\n============================================================\n');
}

listAllUsers().catch(console.error);

