import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
const auth = app ? getAuth(app) : null;

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();
    if (!credential) return NextResponse.json({ error: "Missing credential" }, { status: 400 });

    // Find passkey record across users
    if (db) {
      const q = query(collectionGroup(db, 'passkeys'), where('credentialId', '==', credential.id));
      const snap = await getDocs(q);

      if (snap.empty) {
        return NextResponse.json({ error: "Passkey credential not found" }, { status: 404 });
      }

      const passkeyDoc = snap.docs[0];
      const userId = passkeyDoc.ref.parent.parent?.id;

      if (!userId) {
        return NextResponse.json({ error: "Associated user not found" }, { status: 404 });
      }

      // Generate custom token for user via Firebase Admin or Auth REST API
      // For web demo, return success with uid
      return NextResponse.json({ success: true, uid: userId, customToken: "mock_custom_token" });
    }

    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
