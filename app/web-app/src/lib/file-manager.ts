import { doc, updateDoc, setDoc, getDoc, increment, serverTimestamp, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
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
 * Updates the parent sizes for both source and destination folders.
 */
export const moveFiles = async (userId: string, fileIds: string[], targetFolderId: string) => {
  const batch = writeBatch(db);

  // 1. Fetch metadata for all items to be moved to know their sizes and current parents
  const itemsToMove: FileEntry[] = [];
  for (const id of fileIds) {
    const ref = doc(db, 'users', userId, 'user_files', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      itemsToMove.push(snap.data() as FileEntry);
    }
  }

  // 2. Perform the move and schedule size updates
  for (const item of itemsToMove) {
    if (item.parentId === targetFolderId) continue; // Skip if already there

    const ref = doc(db, 'users', userId, 'user_files', item.fileId);
    batch.update(ref, { parentId: targetFolderId });

    // Handle Folder Size Re-sync
    // Subtract from old parent tree
    if (item.parentId && item.parentId !== 'root') {
        await updateParentFolderSizes(userId, item.parentId, -item.fileSize);
    }

    // Add to new parent tree
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

  await setDoc(folderRef, {
    fileId: folderId,
    fileName: folderName.trim(),
    fileType: 'Folder',
    fileSize: 0,
    downloadUrl: '',
    uploadTimestamp: serverTimestamp(),
    ownerId: userId,
    parentId,
    isDeleted: false,
    isStarred: false,
  });

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
