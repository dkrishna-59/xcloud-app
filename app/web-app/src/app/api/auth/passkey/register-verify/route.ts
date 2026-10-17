import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
    const { userId, credential } = await req.json();
    if (!userId || !credential) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const expectedRPID = "localhost";
    const expectedOrigin = "http://localhost:3000";

    const clientDataJSON = JSON.parse(Buffer.from(credential.response.clientDataJSON, 'base64').toString('utf8'));
    const challenge = clientDataJSON.challenge;

    const challengeRef = doc(db, 'passkey_challenges', challenge);
    const challengeSnap = await getDoc(challengeRef);
    if (!challengeSnap.exists()) {
      return NextResponse.json({ error: "Invalid or expired registration challenge" }, { status: 400 });
    }
    await deleteDoc(challengeRef);

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedRPID,
      expectedOrigin,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Passkey registration verification failed" }, { status: 400 });
    }

    const { credential: regCredential } = verification.registrationInfo;

    const passkeyRef = doc(db, 'users', userId, 'passkeys', credential.id);
    await setDoc(passkeyRef, {
      credentialId: credential.id,
      rawId: credential.rawId,
      publicKey: Buffer.from(regCredential.publicKey).toString('base64'),
      counter: regCredential.counter,
      transports: credential.response.transports || [],
      createdAt: Date.now(),
      lastUsed: Date.now(),
      deviceInfo: "WebAuthn Authenticator"
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Register verify error:", err);
    return NextResponse.json({ error: err.message || "Registration verification failed" }, { status: 500 });
  }
}
