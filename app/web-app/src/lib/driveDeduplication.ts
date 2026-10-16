/**
 * Cross-Cloud Deduplication & Storage Optimizer for XCloud
 * Detects MD5 checksum matches between Google Drive and XCloud storage.
 */

import { FileEntry } from './upload-manager';
import { collection, query, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface DeduplicationMatch {
  existingFile: FileEntry;
  matchType: 'EXACT_MD5' | 'SIZE_AND_NAME';
  bytesSaved: number;
}

/**
 * Checks if an imported Google Drive file with a given md5Checksum already exists in the user's XCloud vault.
 */
export const checkDriveDeduplication = async (
  userId: string,
  driveMd5Checksum: string,
  fileName: string,
  fileSize: number
): Promise<DeduplicationMatch | null> => {
  if (!userId) return null;

  try {
    const q = query(collection(db, 'users', userId, 'user_files'));
    const snap = await getDocs(q);
    const files = snap.docs.map(d => d.data() as FileEntry & { md5Checksum?: string });

    // 1. Check for exact MD5 hash match
    if (driveMd5Checksum) {
      const exactMatch = files.find(f => f.md5Checksum === driveMd5Checksum && !f.isDeleted);
      if (exactMatch) {
        return {
          existingFile: exactMatch,
          matchType: 'EXACT_MD5',
          bytesSaved: fileSize
        };
      }
    }

    // 2. Check for size and filename match as secondary heuristic
    const sizeNameMatch = files.find(f => f.fileName === fileName && f.fileSize === fileSize && !f.isDeleted);
    if (sizeNameMatch) {
      return {
        existingFile: sizeNameMatch,
        matchType: 'SIZE_AND_NAME',
        bytesSaved: fileSize
      };
    }

    return null;
  } catch (err) {
    console.error("Deduplication check error:", err);
    return null;
  }
};

/**
 * Creates a zero-byte pointer reference to an existing file instead of re-uploading binary data.
 */
export const createDeduplicatedPointer = async (
  userId: string,
  parentId: string,
  fileName: string,
  existingFile: FileEntry,
  driveMd5Checksum?: string
): Promise<FileEntry> => {
  const fileId = `dedup_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const pointerEntry: FileEntry & { isDeduplicatedPointer: boolean; originalFileId: string; md5Checksum?: string } = {
    fileId,
    fileName,
    fileType: existingFile.fileType,
    fileSize: existingFile.fileSize,
    downloadUrl: existingFile.downloadUrl,
    uploadTimestamp: serverTimestamp(),
    ownerId: userId,
    storagePath: existingFile.storagePath,
    parentId,
    isDeleted: false,
    isStarred: false,
    isDeduplicatedPointer: true,
    originalFileId: existingFile.fileId,
    md5Checksum: driveMd5Checksum || existingFile.md5Checksum
  };

  await setDoc(doc(db, 'users', userId, 'user_files', fileId), pointerEntry);
  return pointerEntry;
};
