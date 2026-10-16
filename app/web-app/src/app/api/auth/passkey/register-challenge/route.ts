import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
    const { userId, email, displayName } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const challengeBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const challenge = Buffer.from(challengeBytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Store challenge in Firestore for verification
    if (db) {
      await setDoc(doc(db, 'users', userId, 'passkey_sessions', 'reg_challenge'), {
        challenge,
        createdAt: Date.now()
      });
    }

    const options = {
      challenge,
      rp: { name: "XCloud Secure Vault", id: "localhost" },
      user: {
        id: Buffer.from(userId).toString('base64'),
        name: email,
        displayName: displayName || email
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      timeout: 60000,
      attestation: "direct",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred"
      }
    };

    return NextResponse.json(options);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
