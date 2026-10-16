import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

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
const storage = app ? getStorage(app) : null;

export async function POST(req: Request) {
  try {
    const { driveFileId, userId, parentId, fileName, accessToken, mimeType } = await req.json();

    if (!driveFileId || !userId || !accessToken) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Fetch stream from Google Drive
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!driveRes.ok || !driveRes.body) {
      return NextResponse.json({ error: "Failed to stream file from Google Drive" }, { status: 502 });
    }

    // 2. Read arrayBuffer for storage upload
    const arrayBuffer = await driveRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileId = `gdrive_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const storagePath = `users/${userId}/files/${fileId}_${fileName}`;

    if (!storage || !db) {
      return NextResponse.json({ error: "Firebase not initialized on server" }, { status: 500 });
    }

    // 3. Upload buffer to Firebase Storage
    const fileRef = storageRef(storage, storagePath);
    await uploadBytes(fileRef, buffer, { contentType: mimeType || 'application/octet-stream' });
    const downloadUrl = await getDownloadURL(fileRef);

    // 4. Create Firestore metadata record
    const fileEntry = {
      fileId,
      fileName,
      fileType: 'Document',
      fileSize: buffer.length,
      downloadUrl,
      uploadTimestamp: serverTimestamp(),
      ownerId: userId,
      storagePath,
      isDeleted: false,
      isStarred: false,
      parentId: parentId || 'root',
    };

    const userFileRef = doc(db, 'users', userId, 'user_files', fileId);
    await setDoc(userFileRef, fileEntry);

    return NextResponse.json({ success: true, fileId, downloadUrl });
  } catch (err: any) {
    console.error("Stream transfer server error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
