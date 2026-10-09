import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDemoKeyForPeasantsRunningKit",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "peasants-running-kit.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "peasants-running-kit",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "peasants-running-kit.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "98587359280",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:98587359280:web:demo"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Connect to Auth emulator when explicitly enabled
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  } catch {
    // Ignore if emulator is already connected or unavailable
  }
}

export { app, db, auth, storage, googleProvider };
