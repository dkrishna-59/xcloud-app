import { doc, updateDoc, setDoc, getDoc, deleteDoc, increment, serverTimestamp, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { db, storage } from "./firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { FileEntry } from "./upload-manager";

/**
 * Recursively updates the size of parent folders.
 */
export const updateParentFolderSizes = async (userId: string, parentId: string, sizeDelta: number) => {
  if (!parentId || parentId === 'root') return;

  try {
    const parentRef = doc(db, 'users', userId, 'user_files', parentId);
    const parentSnap = await getDoc(parentRef);

    if (parentSnap.exists()) {
      const data = parentSnap.data();
      await updateDoc(parentRef, {
        fileSize: increment(sizeDelta)
      });

      // Continue recursion to next parent
      if (data.parentId && data.parentId !== 'root') {
        await updateParentFolderSizes(userId, data.parentId, sizeDelta);
      }
    }
  } catch (err) {
    console.error("[SYS] Folder size sync failed:", err);
  }
};

/**
 * Move multiple files/folders to a new target folder.
 */
export const moveFiles = async (userId: string, fileIds: string[], targetFolderId: string) => {
  const batch = writeBatch(db);

  const itemsToMove: FileEntry[] = [];
  for (const id of fileIds) {
    const ref = doc(db, 'users', userId, 'user_files', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      itemsToMove.push(snap.data() as FileEntry);
    }
  }

  for (const item of itemsToMove) {
    if (item.parentId === targetFolderId) continue;

    const ref = doc(db, 'users', userId, 'user_files', item.fileId);
    batch.update(ref, { parentId: targetFolderId });

    if (item.parentId && item.parentId !== 'root') {
        await updateParentFolderSizes(userId, item.parentId, -item.fileSize);
    }

    if (targetFolderId !== 'root') {
        await updateParentFolderSizes(userId, targetFolderId, item.fileSize);
    }
  }

  await batch.commit();
};

/**
 * Updates the file name in Firestore.
 */
export const updateFileName = async (userId: string, fileId: string, newName: string) => {
  if (!newName.trim()) throw new Error("Filename cannot be empty");

  const fileRef = doc(db, 'users', userId, 'user_files', fileId);
  await updateDoc(fileRef, {
    fileName: newName.trim()
  });
};

/**
 * Creates a new folder in Firestore.
 */
export const createFolder = async (userId: string, folderName: string, parentId: string = 'root') => {
  if (!folderName.trim()) throw new Error("Folder name cannot be empty");

  const folderId = `folder_${Date.now()}`;
  const folderRef = doc(db, 'users', userId, 'user_files', folderId);

  try {
    await setDoc(folderRef, {
      fileId: folderId,
      fileName: folderName.trim(),
      fileType: 'Folder',
      fileSize: 0,
      downloadUrl: '',
      uploadTimestamp: serverTimestamp(),
      ownerId: userId,
      storagePath: `users/${userId}/folders/${folderId}`,
      parentId,
      isDeleted: false,
      isStarred: false,
    });
  } catch (err: any) {
    throw new Error(err.message || "Failed to create folder");
  }

  return folderId;
};

/**
 * Updates the last opened timestamp for a file.
 */
export const updateLastOpened = async (userId: string, fileId: string) => {
  try {
    const fileRef = doc(db, 'users', userId, 'user_files', fileId);
    await updateDoc(fileRef, {
      lastOpenedTimestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("[SYS] Last opened update failed:", err);
  }
};

/**
 * Updates the tags for a file.
 */
export const updateFileTags = async (userId: string, fileId: string, tags: string[]) => {
  const fileRef = doc(db, 'users', userId, 'user_files', fileId);
  await updateDoc(fileRef, {
    tags
  });
};

/**
 * Updates folder customization (color and icon).
 */
export const updateFolderCustomization = async (userId: string, fileId: string, color: string, icon: string) => {
  const fileRef = doc(db, 'users', userId, 'user_files', fileId);
  await updateDoc(fileRef, {
    folderColor: color,
    folderIcon: icon
  });
};

// ==================== VERSION HISTORY & EDITING ====================

export interface FileVersion {
  versionId: string;
  versionNumber: number;
  storagePath: string;
  fileSize: number;
  modifiedBy: { uid: string; displayName: string; email: string };
  createdAt: any;
  changeSummary?: string;
  downloadUrl?: string;
}

export const getFileVersions = async (userId: string, fileId: string): Promise<FileVersion[]> => {
  const versionsRef = collection(db, 'users', userId, 'user_files', fileId, 'versions');
  const snap = await getDocs(versionsRef);
  const list = snap.docs.map(d => d.data() as FileVersion);
  return list.sort((a, b) => b.versionNumber - a.versionNumber);
};

export const saveFileContent = async (userId: string, file: FileEntry, newContent: string, changeSummary: string = "Updated via XCloud Code Editor") => {
  const fileRef = doc(db, 'users', userId, 'user_files', file.fileId);
  const fileSnap = await getDoc(fileRef);
  if (!fileSnap.exists()) throw new Error("File not found");
  const currentData = fileSnap.data() as FileEntry;

  const versionsRef = collection(db, 'users', userId, 'user_files', file.fileId, 'versions');
  const versionsSnap = await getDocs(versionsRef);
  const existingVersions = versionsSnap.docs.map(d => d.data() as FileVersion);
  const nextVersionNumber = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1 : 1;

  // Archive current state into a version before overwriting
  const versionId = `ver_${Date.now()}`;
  const versionStoragePath = `users/${userId}/versions/${file.fileId}/${versionId}_${file.fileName}`;

  const blob = new Blob([newContent], { type: 'text/plain' });
  const ref = storageRef(storage, versionStoragePath);
  await uploadBytes(ref, blob);
  const versionDownloadUrl = await getDownloadURL(ref);

  const newVersion: FileVersion = {
    versionId,
    versionNumber: nextVersionNumber,
    storagePath: versionStoragePath,
    fileSize: blob.size,
    modifiedBy: { uid: userId, displayName: currentData.ownerId || 'User', email: '' },
    createdAt: serverTimestamp(),
    changeSummary,
    downloadUrl: versionDownloadUrl
  };

  const newVersionRef = doc(versionsRef, versionId);
  await setDoc(newVersionRef, newVersion);

  // Retention: Keep max 10 versions
  if (existingVersions.length >= 10) {
    existingVersions.sort((a, b) => a.versionNumber - b.versionNumber);
    const oldest = existingVersions[0];
    const oldVerRef = doc(versionsRef, oldest.versionId);
    await deleteDoc(oldVerRef);
  }

  // Save new content to primary file path
  const newBlob = new Blob([newContent], { type: 'text/plain' });
  const primaryRef = storageRef(storage, currentData.storagePath || `users/${userId}/files/${file.fileId}_${file.fileName}`);
  await uploadBytes(primaryRef, newBlob);
  const newDownloadUrl = await getDownloadURL(primaryRef);

  await updateDoc(fileRef, {
    downloadUrl: newDownloadUrl,
    fileSize: newBlob.size,
    uploadTimestamp: serverTimestamp()
  });
};

export const restoreFileVersion = async (userId: string, fileId: string, version: FileVersion) => {
  const fileRef = doc(db, 'users', userId, 'user_files', fileId);
  const fileSnap = await getDoc(fileRef);
  if (!fileSnap.exists()) throw new Error("File not found");
  const currentData = fileSnap.data() as FileEntry;

  const res = await fetch(version.downloadUrl || '');
  const text = await res.text();

  await saveFileContent(userId, currentData, text, `Rollback to version v${version.versionNumber}`);
};
