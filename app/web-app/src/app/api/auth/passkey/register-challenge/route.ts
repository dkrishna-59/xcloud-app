import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
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

    const host = req.headers.get('host') || 'localhost';
    let rpID = host.split(':')[0];
    if (rpID === '127.0.0.1') rpID = 'localhost';

    const rpName = "XCloud Secure Vault";

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(userId),
      userName: email || 'user@xcloud.app',
      userDisplayName: displayName || email || 'XCloud User',
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // Store challenge in Firestore for verification
    if (db) {
      try {
        await setDoc(doc(db, 'passkey_challenges', options.challenge), {
          challenge: options.challenge,
          userId,
          createdAt: Date.now()
        });
      } catch (dbErr) {
        console.warn("Firestore challenge store warning:", dbErr);
      }
    }

    return NextResponse.json(options);
  } catch (err: any) {
    console.error("Register challenge error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate registration challenge" }, { status: 500 });
  }
}
