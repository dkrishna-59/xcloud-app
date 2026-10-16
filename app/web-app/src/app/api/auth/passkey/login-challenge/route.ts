import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "xcloud-291207.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "xcloud-291207",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length > 0 ? getApps()[0] : (firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null);
const db = app ? getFirestore(app) : null;

export async function POST(req: Request) {
  try {
    const rpID = "localhost"; // Update to domain in production (e.g. xchat.app)

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
    });

    // Store challenge ephemeral state
    if (db) {
      await setDoc(doc(db, 'passkey_challenges', options.challenge), {
        challenge: options.challenge,
        createdAt: Date.now()
      });
    }

    return NextResponse.json(options);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate login challenge" }, { status: 500 });
  }
}
