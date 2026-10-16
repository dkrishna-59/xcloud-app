import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // Fallback to standard firebaseapp domain if env var is missing
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "xcloud-291207.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "xcloud-291207",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only if config is present to avoid build-time crashes
const app = getApps().length > 0
  ? getApp()
  : (firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null);

// Initialize services with safety checks
export const auth = app ? getAuth(app) : null as any;

// Use existing Firestore instance if available, otherwise initialize with persistent cache
export const db = app
  ? (getApps().length > 0
      ? getFirestore(app)
      : initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        }))
  : null as any;

export const storage = app ? getStorage(app) : null as any;

const googleProvider = new GoogleAuthProvider();
// Explicitly using full userinfo URLs for maximum reliability plus Google Drive scopes.
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('openid');

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('user_birthday');
facebookProvider.addScope('public_profile');

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export { googleProvider, facebookProvider, appleProvider };
