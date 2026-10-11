import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCP_PROJECT || process.env.PROJECT_ID || 'peasants-running-kit',
    storageBucket: process.env.STORAGE_BUCKET || 'peasants-running-kit-holding-page',
  });
}

export const adminDb = admin.firestore();
adminDb.settings({ ignoreUndefinedProperties: true });
export const adminStorage = admin.storage();
export const adminAuth = admin.auth();
