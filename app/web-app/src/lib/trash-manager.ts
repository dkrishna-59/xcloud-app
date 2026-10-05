import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, writeBatch } from "firebase/firestore";
import { supabase } from "./supabase";
import { db } from "./firebase";
import { FileEntry } from "./upload-manager";
import { logActivity } from "./activity-manager";
import { updateParentFolderSizes } from "./file-manager";

/**
 * Soft-delete: Moves file metadata from active collection to trash collection
 */
export const moveToTrash = async (userId: string, fileId: string) => {
  const activeDocRef = doc(db, 'users', userId, 'user_files', fileId);
  const trashDocRef = doc(db, 'users', userId, 'trash_files', fileId);

  const snap = await getDoc(activeDocRef);
  if (!snap.exists()) throw new Error("File not found");

  const fileData = snap.data() as FileEntry;

  const batch = writeBatch(db);
  batch.set(trashDocRef, {
    ...fileData,
    isDeleted: true,
    deletedAt: Date.now(),
  });
  batch.delete(activeDocRef);

  await batch.commit();

  // Decrement parent folder sizes
  if (fileData.parentId && fileData.parentId !== 'root') {
    await updateParentFolderSizes(userId, fileData.parentId, -fileData.fileSize);
  }

  // Log Activity
  await logActivity(userId, 'DELETE', `Moved to trash`, fileData.fileName);
};

/**
 * Restore: Moves file metadata from trash collection back to active collection
 */
export const restoreFromTrash = async (userId: string, fileId: string) => {
  const activeDocRef = doc(db, 'users', userId, 'user_files', fileId);
  const trashDocRef = doc(db, 'users', userId, 'trash_files', fileId);

  const snap = await getDoc(trashDocRef);
  if (!snap.exists()) throw new Error("File not found in trash");

  const fileData = snap.data() as FileEntry;

  const batch = writeBatch(db);
  batch.set(activeDocRef, {
    ...fileData,
    isDeleted: false,
    deletedAt: null,
  });
  batch.delete(trashDocRef);

  await batch.commit();

  // Increment parent folder sizes again
  if (fileData.parentId && fileData.parentId !== 'root') {
    await updateParentFolderSizes(userId, fileData.parentId, fileData.fileSize);
  }

  // Log Activity
  await logActivity(userId, 'RESTORE', `Restored from trash`, fileData.fileName);
};

/**
 * Permanent Purge: Removes binary from Supabase Storage and document from Firestore
 */
export const permanentlyDeleteFile = async (userId: string, file: FileEntry) => {
  // 1. Delete from Supabase Storage
  const { error } = await supabase.storage
    .from('files')
    .remove([file.storagePath]);

  if (error) console.error("[SYS] Supabase deletion error:", error);

  // 2. Delete from Firestore Trash Collection
  const trashDocRef = doc(db, 'users', userId, 'trash_files', file.fileId);
  await deleteDoc(trashDocRef);

  // 3. Update User Storage Usage
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    storageUsed: increment(-file.fileSize),
  });
};

/**
 * Permanently purge all files in trash
 */
export const emptyTrash = async (userId: string, files: FileEntry[]) => {
  if (files.length === 0) return;

  let totalSizeFreed = 0;
  const storagePaths: string[] = [];

  for (const file of files) {
    if (file.storagePath) {
      storagePaths.push(file.storagePath);
    }
    totalSizeFreed += file.fileSize || 0;

    const trashDocRef = doc(db, 'users', userId, 'trash_files', file.fileId);
    await deleteDoc(trashDocRef);
  }

  if (storagePaths.length > 0) {
    const { error } = await supabase.storage
      .from('files')
      .remove(storagePaths);
    if (error) console.error("[SYS] Supabase batch deletion error:", error);
  }

  if (totalSizeFreed > 0) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      storageUsed: increment(-totalSizeFreed),
    });
  }

  await logActivity(userId, 'PURGE', `Emptied trash bin (${files.length} items)`, 'Trash');
};

