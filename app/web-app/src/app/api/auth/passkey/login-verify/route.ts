import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs, query, where, doc, getDoc, deleteDoc } from 'firebase/firestore';

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
    const body = await req.json();
    const { id: credentialId } = body;

    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    // 1. Find passkey record across all users
    const q = query(collectionGroup(db, 'passkeys'), where('credentialId', '==', credentialId));
    const snap = await getDocs(q);

    if (snap.empty) {
      return NextResponse.json({ error: "Passkey credential not registered" }, { status: 404 });
    }

    const passkeyDoc = snap.docs[0];
    const passkeyData = passkeyDoc.data();
    const userId = passkeyDoc.ref.parent.parent?.id;

    if (!userId) {
      return NextResponse.json({ error: "Associated user not found" }, { status: 404 });
    }

    const expectedRPID = "localhost";
    const expectedOrigin = "http://localhost:3000";

    const authenticator = {
      credentialPublicKey: new Uint8Array(Buffer.from(passkeyData.publicKey, 'base64')),
      credentialID: new Uint8Array(Buffer.from(passkeyData.credentialId)),
      counter: passkeyData.counter || 0,
      transports: passkeyData.transports || []
    };

    const clientDataJSON = JSON.parse(Buffer.from(body.response.clientDataJSON, 'base64').toString('utf8'));
    const challenge = clientDataJSON.challenge;

    const challengeRef = doc(db, 'passkey_challenges', challenge);
    const challengeSnap = await getDoc(challengeRef);
    if (!challengeSnap.exists()) {
      return NextResponse.json({ error: "Invalid or expired authentication challenge" }, { status: 400 });
    }
    await deleteDoc(challengeRef); // Single-use challenge

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedRPID,
      expectedOrigin,
      authenticator,
    } as any);

    if (!verification.verified) {
      return NextResponse.json({ error: "Passkey signature verification failed" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      uid: userId,
      customToken: "mock_custom_token_" + userId
    });
  } catch (err: any) {
    console.error("Passkey verification error:", err);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}
