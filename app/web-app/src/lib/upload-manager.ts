import { supabase } from "./supabase";
import { storage, db } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, collection, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { logActivity } from "./activity-manager";
import { updateParentFolderSizes } from "./file-manager";

export interface FileEntry {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  uploadTimestamp: any;
  ownerId: string;
  storagePath: string;
  isDeleted: boolean;
  isStarred: boolean;
  parentId?: string;
  sharedWith?: { email: string, role: 'viewer' | 'editor' }[];
  sharedWithEmails?: string[];
  isPublic?: boolean;
  shareToken?: string;
  isPubliclyShared?: boolean;
  lastOpenedTimestamp?: any;
  isLocked?: boolean;
  playbackPosition?: number; // Last viewed position in seconds
  tags?: string[];
}

export type UploadProgressCallback = (progress: number) => void;

/**
 * Robust upload handler using Supabase Storage or Firebase Storage fallback for binary data
 * and Firebase Firestore for metadata.
 */
export const uploadFile = async (
  userId: string,
  file: File,
  storageUsed: number,
  storageAvailable: number,
  onProgress: UploadProgressCallback,
  parentId: string = 'root'
): Promise<FileEntry> => {

  console.log(`[SYS] Initializing secure upload for: ${file.name}`);

  if (!userId) throw new Error("Auth State Error: No User ID");

  // 1. Project Global Limit Validation
  const MAX_FILE_SIZE = 450 * 1024 * 1024; // 450MB Global Project Limit
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File exceeds the 450MB project limit.");
  }

  // 2. Quota Validation
  if (storageUsed + file.size > storageAvailable) {
    throw new Error("Storage limit exceeded. Please upgrade your plan.");
  }

  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const storagePath = `users/${userId}/${fileId}-${file.name}`;

  console.log(`[SYS] Uploading to storage path: ${storagePath}`);

  try {
    let publicUrl = "";

    // Check if Supabase has valid configuration (not placeholder)
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const isSupabaseValid = supabase && supabaseKey && !supabaseKey.includes('your_supabase_');

    if (isSupabaseValid) {
      try {
        console.log("[SYS] Attempting Supabase Storage upload...");
        const uploadPromise = supabase.storage
          .from('files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            // @ts-ignore
            onUploadProgress: (progress) => {
              const percent = (progress.loaded / progress.total) * 100;
              onProgress(Math.max(1, Math.min(percent, 95)));
            }
          });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Supabase Upload Timeout")), 15000)
        );

        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;
        if (!error) {
          const { data: { publicUrl: url } } = supabase.storage.from('files').getPublicUrl(storagePath);
          publicUrl = url;
          console.log("[SYS] Supabase upload successful.");
        }
      } catch (err) {
        console.warn("[SYS] Supabase upload failed or timed out, falling back to Firebase Storage...", err);
      }
    }

    // Fallback to Firebase Storage if Supabase failed or is unconfigured
    if (!publicUrl && storage) {
      console.log("[SYS] Uploading via Firebase Storage fallback...");
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(Math.max(1, Math.min(progress, 95)));
          },
          (error) => reject(error),
          () => resolve(uploadTask.snapshot)
        );
      });

      publicUrl = await getDownloadURL(storageRef);
      console.log("[SYS] Firebase Storage fallback upload successful.");
    }

    if (!publicUrl) {
      throw new Error("Upload failed: No storage provider available or configured.");
    }

    onProgress(90);

    // 3. Sync metadata to Firestore
    const fileEntry: FileEntry = {
      fileId,
      fileName: file.name,
      fileType: categorizeMimeType(file.type, file.name),
      fileSize: file.size,
      downloadUrl: publicUrl,
      uploadTimestamp: serverTimestamp(),
      ownerId: userId,
      storagePath,
      isDeleted: false,
      isStarred: false,
      parentId,
    };

    const userDocRef = doc(db, "users", userId);
    const fileDocRef = doc(collection(userDocRef, "user_files"), fileId);

    await setDoc(fileDocRef, fileEntry);
    await updateDoc(userDocRef, {
      storageUsed: increment(file.size),
    });

    // Update parent folder sizes recursively
    if (parentId !== 'root') {
      await updateParentFolderSizes(userId, parentId, file.size);
    }

    // Log Activity
    await logActivity(userId, 'UPLOAD', `Successfully uploaded ${file.name}`, file.name);

    console.log(`[SYS] Upload complete: ${file.name}`);
    onProgress(100);
    return fileEntry;

  } catch (error: any) {
    console.error("[SYS] Upload Error:", error);
    throw new Error(`Upload failed: ${error.message || 'Check connection'}`);
  }
};

const categorizeMimeType = (mimeType: string, fileName: string = ''): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  // 1. Image Categories
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'ai', 'psd', 'heic', 'heif', 'raw', 'dng', 'cr2', 'nef', 'tiff', 'tif', 'bmp', 'ico'];
  if (mimeType.startsWith("image/") || (ext && imageExts.includes(ext))) return "Image";

  // 2. Video Categories
  const videoExts = ['mp4', 'webm', 'm4v', 'mkv', 'ts', 'm2ts', 'mov', 'avi', 'wmv', 'flv', 'f4v', '3gp', '3g2', 'vob'];
  if (mimeType.startsWith("video/") || (ext && videoExts.includes(ext))) return "Video";

  // 3. Audio Categories
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'm4r', 'amr', 'opus'];
  if (mimeType.startsWith("audio/") || (ext && audioExts.includes(ext))) return "Audio";

  // 4. Archive Categories
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'iso', 'bz2', 'xz'];
  if (mimeType.includes("zip") || (ext && archiveExts.includes(ext))) return "Archive";

  // 5. Executable & System
  const exeExts = ['exe', 'msi', 'apk', 'aab', 'dmg', 'deb', 'rpm', 'bat', 'cmd', 'sh', 'bash', 'env', 'yaml', 'yml'];
  if (ext && exeExts.includes(ext)) return "System";

  // 6. Code & Web
  const codeExts = ['html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'sql', 'php', 'py', 'kt', 'java', 'cpp', 'c', 'cs'];
  if (mimeType.startsWith("text/") || (ext && codeExts.includes(ext))) return "Code";

  // 7. Font Categories
  const fontExts = ['ttf', 'otf', 'woff', 'woff2', 'eot'];
  if (mimeType.includes("font") || (ext && fontExts.includes(ext))) return "Font";

  if (mimeType === "application/pdf" || ext === 'pdf') return "PDF";

  // 8. Document Categories
  const docExts = ['docx', 'doc', 'odt', 'rtf', 'pages', 'xlsx', 'xls', 'csv', 'ods', 'tsv', 'pptx', 'ppt', 'odp', 'key', 'epub', 'mobi', 'azw', 'azw3'];
  if (ext && docExts.includes(ext)) return "Document";

  return "Document";
};
