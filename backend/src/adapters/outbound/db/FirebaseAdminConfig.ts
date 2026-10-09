import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCP_PROJECT || process.env.PROJECT_ID || 'peasants-running-kit',
    storageBucket: process.env.STORAGE_BUCKET || 'peasants-running-kit-holding-page',
  });
}

export const adminDb = admin.firestore();

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`[Firestore] Connected to local Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

export const adminStorage = admin.storage();
export const adminAuth = admin.auth();
