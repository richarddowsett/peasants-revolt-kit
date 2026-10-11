import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.GCP_PROJECT || process.env.PROJECT_ID || 'peasants-running-kit';
  admin.initializeApp({
    projectId,
    storageBucket: process.env.STORAGE_BUCKET || `${projectId}-product-images`,
  });
}

export const adminDb = admin.firestore();

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`[Firestore] Connected to local Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

export const adminStorage = admin.storage();
export const adminAuth = admin.auth();
