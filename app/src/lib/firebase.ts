import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "peasants-running-kit.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "peasants-running-kit",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "peasants-running-kit.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "98587359280",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

const app = firebaseConfig.apiKey
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

const db: Firestore | null = app ? getFirestore(app) : null;
const auth: Auth | null = app ? getAuth(app) : null;
const storage: FirebaseStorage | null = app ? getStorage(app) : null;
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, storage, googleProvider };
