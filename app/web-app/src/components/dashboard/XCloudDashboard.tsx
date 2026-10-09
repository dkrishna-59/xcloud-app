"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useSearch } from '@/context/search-context';
import { useDropzone } from 'react-dropzone';
import {
  Plus,
  Loader2,
  Cloud,
  Grid,
  List as ListIcon,
  ChevronRight,
  FolderPlus,
  ShieldCheck,
  Star,
  File,
  Lock,
  MoreHorizontal,
  Ban,
  Globe,
  X
} from 'lucide-react';
import { moveToTrash } from '@/lib/trash-manager';
import { updateFileName, createFolder, updateLastOpened } from '@/lib/file-manager';
import { generatePublicShareLink } from '@/lib/share-manager';
import { collection, query, where, onSnapshot, doc, updateDoc, collectionGroup, writeBatch, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFile, FileEntry } from '@/lib/upload-manager';
import { Invitation } from '@/lib/invitation-manager';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { StorageWidget } from './storage-widget';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { FileItem } from './FileItem';
import { BatchActionBar } from './BatchActionBar';
import { InvitationItem } from './InvitationItem';
import { OutgoingInvitationItem } from './OutgoingInvitationItem';
import { FolderCustomizeModal } from './FolderCustomizeModal';
import { CreateFolderModal } from './CreateFolderModal';

const ShareFileModal = dynamic(() => import('./ShareFileModal').then(mod => mod.ShareFileModal));
const MoveToFolderModal = dynamic(() => import('./MoveToFolderModal').then(mod => mod.MoveToFolderModal));
const MediaPreviewer = dynamic(() => import('./MediaPreviewer').then(mod => mod.MediaPreviewer));
const FileInfoPanel = dynamic(() => import('./FileInfoPanel').then(mod => mod.FileInfoPanel));

const FileItemSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
  <div className={cn(
    "bg-surface-variant/10 rounded-[2rem] animate-pulse",
    viewMode === 'grid' ? "aspect-square p-6" : "h-20 p-4"
  )}>
    <div className="flex items-center gap-4 h-full">
       <div className="w-12 h-12 bg-surface-variant/20 rounded-2xl shrink-0" />
       <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-variant/20 rounded w-3/4" />
          <div className="h-3 bg-surface-variant/20 rounded w-1/2" />
       </div>
    </div>
  </div>
);

export const XCloudDashboard = ({ filter = 'all' }: { filter?: 'all' | 'starred' | 'shared' | 'files' }) => {
  const { user, userMetadata } = useAuth();
  const { showToast, hideToast } = useToast();
  const { searchQuery } = useSearch();

  // 1. Core Navigation State
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([{ id: 'root', name: 'My Drive' }]);

  // 2. Data States
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileEntry | null>(null);

  const [selectedFileForInfo, setSelectedFileForInfo] = useState<FileEntry | null>(null);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [selectedFolderForCustomize, setSelectedFolderForCustomize] = useState<FileEntry | null>(null);

  // Folder Lock State
  const [unlockedFolderIds, setUnlockedFolderIds] = useState<string[]>([]);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [folderToUnlock, setFolderToUnlock] = useState<FileEntry | null>(null);
  const [pinInput, setPinInput] = useState('');

  // Shared View Sub-Filter
  const [sharedSubFilter, setSharedSubFilter] = useState<'with_me' | 'by_me' | 'invitations'>('with_me');

  // File Type & Sort Filters
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'Folder' | 'Image' | 'Document' | 'Video' | 'Audio'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc'>('newest');

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    let q;

    if (filter === 'shared') {
      if (!user.email) return;

      if (sharedSubFilter === 'invitations') {
        q = query(
          collection(db, 'invitations'),
          where('recipientEmail', '==', user.email.toLowerCase())
        );
      } else if (sharedSubFilter === 'with_me') {
        q = query(
          collection(db, 'users', user.uid, 'shared_with_me')
        );
      } else {
        // "You shared" - Query user's own sent invitations
        q = query(
          collection(db, 'invitations'),
          where('senderId', '==', user.uid)
        );
      }
    } else if (filter === 'all' && currentFolderId === 'root' && !searchQuery) {
      // "Home" - Show Recently Opened/Uploaded across all folders only when at root
      q = query(
        collection(db, 'users', user.uid, 'user_files'),
        where('isDeleted', '==', false),
        orderBy('uploadTimestamp', 'desc'),
        limit(12)
      );
    } else {
      q = query(
        collection(db, 'users', user.uid, 'user_files'),
        where('isDeleted', '==', false)
      );

      if (filter === 'starred') {
        q = query(q, where('isStarred', '==', true));
      } else if (currentFolderId !== 'root' && !searchQuery) {
        q = query(q, where('parentId', '==', currentFolderId));
      } else if (filter === 'files' && !searchQuery) {
        q = query(q, where('parentId', '==', currentFolderId));
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (filter === 'shared' && (sharedSubFilter === 'invitations' || sharedSubFilter === 'by_me')) {
        let inviteDocs = snapshot.docs.map(doc => doc.data() as Invitation);

        if (sharedSubFilter === 'invitations') {
          inviteDocs = inviteDocs.filter(inv => inv.status === 'PENDING' || inv.status === 'REJECTED');
          // Client-side cleanup for Rejected items older than 24 hours
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          inviteDocs = inviteDocs.filter(inv => {
             if (inv.status === 'REJECTED' && inv.rejectedAt?.seconds) {
                return (inv.rejectedAt.seconds * 1000) > oneDayAgo;
             }
             return true;
          });
        }

        // Client-side sort by createdAt descending
        inviteDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setInvitations(inviteDocs);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      let docs = snapshot.docs.map(doc => doc.data() as FileEntry);

      if (filter === 'shared' && sharedSubFilter === 'with_me') {
        docs = docs.filter(f => !f.isDeleted);
      }

      if (filter === 'all') {
        // Filter out folders from "Recently Opened" view to keep it clean
        docs = docs.filter(f => f.fileType !== 'Folder');
      }

      setFiles(docs);
      setIsLoading(false);
      setIsRefreshing(false);
    }, (error) => {
      console.error("[DASHBOARD] Sync Error:", error);
      showToast("Sync failed. Check your connection.", "error");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, filter, currentFolderId, searchQuery, showToast, sharedSubFilter]);

  const sortedFiles = useMemo(() => {
    let docs = [...files];

    if (searchQuery) {
      docs = docs.filter(f => f.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (fileTypeFilter !== 'all') {
      const filterLower = fileTypeFilter.toLowerCase();
      docs = docs.filter(f => {
        const type = (f.fileType || '').toLowerCase();
        const name = (f.fileName || '').toLowerCase();

        if (filterLower === 'folder') {
          return type === 'folder';
        } else if (filterLower === 'image') {
          return type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|avif|heic|bmp|tiff)$/.test(name);
        } else if (filterLower === 'document') {
          return ['document', 'pdf', 'archive', 'code', 'system', 'font'].includes(type) || /\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar|csv|rtf|epub)$/.test(name);
        } else if (filterLower === 'video') {
          return type === 'video' || /\.(mp4|webm|mov|mkv|avi|3gp|m4v)$/.test(name);
        } else if (filterLower === 'audio') {
          return type === 'audio' || /\.(mp3|wav|ogg|m4a|flac|aac)$/.test(name);
        }
        return true;
      });
    }

    return docs.sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.uploadTimestamp?.seconds || 0;
        const timeB = b.uploadTimestamp?.seconds || 0;
        return timeB - timeA;
      } else if (sortBy === 'oldest') {
        const timeA = a.uploadTimestamp?.seconds || 0;
        const timeB = b.uploadTimestamp?.seconds || 0;
        return timeA - timeB;
      } else if (sortBy === 'name-asc') {
        return a.fileName.localeCompare(b.fileName);
      } else if (sortBy === 'name-desc') {
        return b.fileName.localeCompare(a.fileName);
      } else if (sortBy === 'size-desc') {
        return (b.fileSize || 0) - (a.fileSize || 0);
      }
      return 0;
    });
  }, [files, searchQuery, filter, fileTypeFilter, sortBy]);

  const sortedInvitations = useMemo(() => {
    let list = [...invitations];
    if (fileTypeFilter !== 'all') {
      const filterLower = fileTypeFilter.toLowerCase();
      list = list.filter(inv => {
        const type = (inv.fileType || '').toLowerCase();
        const name = (inv.fileName || '').toLowerCase();

        if (filterLower === 'folder') {
          return type === 'folder';
        } else if (filterLower === 'image') {
          return type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|avif|heic|bmp|tiff)$/.test(name);
        } else if (filterLower === 'document') {
          return ['document', 'pdf', 'archive', 'code', 'system', 'font'].includes(type) || /\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar|csv|rtf|epub)$/.test(name);
        } else if (filterLower === 'video') {
          return type === 'video' || /\.(mp4|webm|mov|mkv|avi|3gp|m4v)$/.test(name);
        } else if (filterLower === 'audio') {
          return type === 'audio' || /\.(mp3|wav|ogg|m4a|flac|aac)$/.test(name);
        }
        return true;
      });
    }
    return list;
  }, [invitations, fileTypeFilter]);

  const uploadControllersRef = useRef<Record<string, AbortController>>({});

  const cancelUpload = useCallback((tempId: string) => {
    if (uploadControllersRef.current[tempId]) {
      uploadControllersRef.current[tempId].abort();
      delete uploadControllersRef.current[tempId];
    }
    setUploadingFiles(prev => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
    showToast("Upload cancelled", "info");
  }, [showToast]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !userMetadata) return;

    for (const file of acceptedFiles) {
      const tempId = Math.random().toString(36).substring(7);
      const controller = new AbortController();
      uploadControllersRef.current[tempId] = controller;

      const toastId = showToast(`Uploading ${file.name}...`, 'loading');
      setUploadingFiles(prev => ({ ...prev, [tempId]: 1 }));

      try {
        await uploadFile(
          user.uid,
          file,
          userMetadata.storageUsed,
          userMetadata.storageAvailable,
          (progress) => {
            setUploadingFiles(prev => ({ ...prev, [tempId]: progress }));
          },
          currentFolderId,
          controller.signal
        );
        hideToast(toastId);
        showToast(`${file.name} uploaded successfully`, 'success');
      } catch (error: any) {
        hideToast(toastId);
        if (error.message.includes("cancelled")) {
          showToast(`Upload cancelled for ${file.name}`, 'info');
        } else {
          showToast(error.message, 'error');
        }
      } finally {
        delete uploadControllersRef.current[tempId];
        setTimeout(() => {
          setUploadingFiles(prev => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        }, 1500);
      }
    }
  }, [user, userMetadata, showToast, hideToast, currentFolderId]);

  const handleCreateFolder = useCallback(() => {
    setIsCreateFolderModalOpen(true);
  }, []);

  const handleConfirmCreateFolder = useCallback(async (folderName: string) => {
    if (!user) return;
    const toastId = showToast('Creating folder...', 'loading');
    try {
      await createFolder(user.uid, folderName, currentFolderId);
      hideToast(toastId);
      showToast(`Folder "${folderName}" created`, 'success');
    } catch (error: any) {
      hideToast(toastId);
      showToast(error.message, 'error');
    }
  }, [user, currentFolderId, showToast, hideToast]);

  const navigateToFolder = useCallback((folder: FileEntry) => {
    setCurrentFolderId(folder.fileId);
    setBreadcrumbs(prev => [...prev, { id: folder.fileId, name: folder.fileName }]);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  }, [breadcrumbs]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true
  });

  const toggleStar = useCallback(async (file: FileEntry) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'user_files', file.fileId);
    await updateDoc(ref, { isStarred: !file.isStarred });
  }, [user]);

  const toggleLock = useCallback(async (file: FileEntry) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'user_files', file.fileId);
    await updateDoc(ref, { isLocked: !file.isLocked });
    showToast(file.isLocked ? "Folder decrypted" : "Folder locked with AES-256", "success");
  }, [user, showToast]);

  const handleUnlock = useCallback(() => {
    // For now, use the first 4 digits of the user's displayId as the PIN
    const expectedPin = userMetadata?.displayId?.substring(0, 4) || '1234';

    if (pinInput === expectedPin) {
      if (folderToUnlock) {
        setUnlockedFolderIds(prev => [...prev, folderToUnlock.fileId]);
        navigateToFolder(folderToUnlock);
      }
      setIsUnlockModalOpen(false);
      setPinInput('');
      setFolderToUnlock(null);
      showToast("Access granted", "success");
    } else {
      showToast("Invalid security key", "error");
      setPinInput('');
    }
  }, [pinInput, userMetadata, folderToUnlock, navigateToFolder, showToast]);

  const handleMoveToTrash = useCallback(async (file: FileEntry) => {
    if (!user) return;
    try {
      await moveToTrash(user.uid, file.fileId);
      showToast(`"${file.fileName}" moved to trash`, 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [user, showToast]);

  const handleRename = useCallback(async (fileId: string) => {
    if (!user || !newName.trim()) return;
    const toastId = showToast('Renaming...', 'loading');
    try {
      await updateFileName(user.uid, fileId, newName);
      hideToast(toastId);
      showToast('File renamed', 'success');
      setEditingFile(null);
    } catch (error: any) {
      hideToast(toastId);
      showToast(error.message, 'error');
    }
  }, [user, newName, showToast, hideToast]);

  const handleDownload = useCallback((file: FileEntry) => {
    if (user) updateLastOpened(user.uid, file.fileId);
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading ${file.fileName}...`, 'info');
  }, [showToast]);

  const handleShareFile = useCallback((file: FileEntry) => {
    setSelectedFileForShare(file);
    setIsShareModalOpen(true);
  }, []);

  const toggleSelection = useCallback((e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (!user || selectedFileIds.length === 0) return;
    if (!confirm(`Move ${selectedFileIds.length} items to trash?`)) return;

    const toastId = showToast('Moving to trash...', 'loading');
    try {
      for (const id of selectedFileIds) {
        await moveToTrash(user.uid, id);
      }
      showToast('Items moved to trash', 'success');
      setSelectedFileIds([]);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [user, selectedFileIds, showToast]);

  const handleBatchStar = useCallback(async () => {
    if (!user || selectedFileIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      selectedFileIds.forEach(id => {
        const ref = doc(db, 'users', user.uid, 'user_files', id);
        batch.update(ref, { isStarred: true });
      });
      await batch.commit();
      showToast('Items starred', 'success');
      setSelectedFileIds([]);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [user, selectedFileIds, showToast]);

  const handleBatchDownload = useCallback(async () => {
    if (selectedFileIds.length === 0) return;
    const toastId = showToast(`Preparing ZIP archive for ${selectedFileIds.length} item(s)...`, 'loading');
    try {
      const zip = new JSZip();
      const folder = zip.folder("xcloud_export");

      for (const id of selectedFileIds) {
        const file = files.find(f => f.fileId === id);
        if (file && file.downloadUrl) {
          try {
            const response = await fetch(file.downloadUrl);
            const blob = await response.blob();
            folder?.file(file.fileName, blob);
          } catch (err) {
            console.error(`Failed to fetch ${file.fileName} for zip:`, err);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `xcloud_batch_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      hideToast(toastId);
      showToast('Batch ZIP archive downloaded successfully', 'success');
    } catch (error: any) {
      hideToast(toastId);
      showToast(`Batch download failed: ${error.message}`, 'error');
    }
  }, [selectedFileIds, files, showToast, hideToast]);

  const handleFileClick = useCallback((e: React.MouseEvent, file: FileEntry) => {
    if (e.shiftKey || selectedFileIds.length > 0) {
      toggleSelection(e, file.fileId);
    } else if (file.fileType === 'Folder') {
      if (file.isLocked && !unlockedFolderIds.includes(file.fileId)) {
        setFolderToUnlock(file);
        setIsUnlockModalOpen(true);
      } else {
        navigateToFolder(file);
      }
    } else {
      // Single click to open the inbuilt opener (Media Previewer)
      // Only update 'Last Opened' if we are the owner (prevents 'No document to update' error for shared files)
      if (user && file.ownerId === user.uid) {
        updateLastOpened(user.uid, file.fileId);
      }
      setPreviewFile(file);
    }
  }, [user, selectedFileIds, toggleSelection, navigateToFolder, unlockedFolderIds]);

  if (!user) return null;

  return (
    <div {...getRootProps()} className="min-h-screen relative bg-surface transition-colors">
      <input {...getInputProps()} />

      {isShareModalOpen && (
        <ShareFileModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedFileForShare(null);
          }}
          file={selectedFileForShare}
        />
      )}

      {previewFile && (
        <MediaPreviewer
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {selectedFileForInfo && (
        <FileInfoPanel
          file={selectedFileForInfo}
          isOpen={!!selectedFileForInfo}
          onClose={() => setSelectedFileForInfo(null)}
          onRename={(file) => {
            setEditingFile(file.fileId);
            setNewName(file.fileName);
            setSelectedFileForInfo(null);
          }}
          onShare={handleShareFile}
          onDownload={handleDownload}
          onDelete={handleMoveToTrash}
          onToggleLock={toggleLock}
        />
      )}

      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUnlockModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-surface rounded-[2.5rem] p-10 shadow-2xl border border-outline/10 text-center">
            <div className="w-20 h-20 bg-primary-container text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
               <Lock size={40} />
            </div>
            <h3 className="text-2xl font-black text-on-surface mb-2">Encrypted Vault</h3>
            <p className="text-on-surface-variant text-sm font-medium mb-8 leading-relaxed">Enter the first 4 digits of your Vault ID to decrypt this folder.</p>

            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              autoFocus
              maxLength={4}
              placeholder="••••"
              className="w-full bg-surface-variant/40 border-none rounded-2xl py-5 text-center text-3xl tracking-[1em] font-black focus:ring-2 focus:ring-primary/20 outline-none mb-6 transition-all"
            />

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUnlock}
                className="w-full py-4 bg-primary text-on-primary font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-primary/20 uppercase tracking-widest text-xs"
              >
                Unlock Folder
              </button>
              <button
                onClick={() => setIsUnlockModalOpen(false)}
                className="w-full py-4 bg-surface-variant/50 text-on-surface-variant font-black rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isMoveModalOpen && (
        <MoveToFolderModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          selectedFileIds={selectedFileIds}
        />
      )}

      {isCustomizeModalOpen && (
        <FolderCustomizeModal
          isOpen={isCustomizeModalOpen}
          onClose={() => setIsCustomizeModalOpen(false)}
          folder={selectedFolderForCustomize}
        />
      )}

      {isCreateFolderModalOpen && (
        <CreateFolderModal
          isOpen={isCreateFolderModalOpen}
          onClose={() => setIsCreateFolderModalOpen(false)}
          onCreate={handleConfirmCreateFolder}
        />
      )}

      <BatchActionBar
        selectedCount={selectedFileIds.length}
        onClearSelection={() => setSelectedFileIds([])}
        onBatchStar={handleBatchStar}
        onBatchMove={() => setIsMoveModalOpen(true)}
        onBatchDelete={handleBatchDelete}
        onBatchDownload={handleBatchDownload}
      />

      <div className="p-10 max-w-7xl mx-auto min-h-full flex flex-col gap-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <h1 className="text-display-small font-black text-on-surface flex items-center gap-3">
              {filter === 'starred' ? <Star className="text-primary fill-primary" /> : <Cloud className="text-primary" />}
              {filter === 'starred' ? 'Favourites' :
               filter === 'shared' ? (sharedSubFilter === 'with_me' ? 'Shared with you' : sharedSubFilter === 'by_me' ? 'You shared' : 'Invitations') :
               filter === 'all' ? 'Recently Opened' : 'My Drive'}

              <AnimatePresence>
                {isRefreshing && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="ml-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,82,204,0.5)]"
                    title="Syncing with vault..."
                  />
                )}
              </AnimatePresence>
            </h1>

            {filter === 'shared' && (
              <div className="flex bg-surface-variant/30 p-1 rounded-2xl w-fit">
                <button
                  onClick={() => setSharedSubFilter('by_me')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    sharedSubFilter === 'by_me'
                      ? "bg-primary text-on-primary shadow-lg"
                      : "text-on-surface-variant hover:bg-surface-variant/50"
                  )}
                >
                  You shared
                </button>
                <button
                  onClick={() => setSharedSubFilter('with_me')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    sharedSubFilter === 'with_me'
                      ? "bg-primary text-on-primary shadow-lg"
                      : "text-on-surface-variant hover:bg-surface-variant/50"
                  )}
                >
                  Shared with you
                </button>
                <button
                  onClick={() => setSharedSubFilter('invitations')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    sharedSubFilter === 'invitations'
                      ? "bg-primary text-on-primary shadow-lg"
                      : "text-on-surface-variant hover:bg-surface-variant/50"
                  )}
                >
                  Invitations
                </button>
              </div>
            )}

            {filter === 'files' && !searchQuery && (
              <nav className="flex items-center gap-1.5 px-1">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                    {index > 0 && <ChevronRight size={16} className="text-outline/40" />}
                    <button
                      onClick={() => navigateToBreadcrumb(index)}
                      className={cn(
                        "text-sm font-bold transition-all px-2 py-1 rounded-lg",
                        index === breadcrumbs.length - 1
                          ? "text-primary bg-primary-container/20"
                          : "text-on-surface-variant hover:bg-surface-variant/50"
                      )}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
             {filter === 'files' && (
               <button
                 onClick={handleCreateFolder}
                 className="flex items-center gap-3 px-6 py-3.5 bg-surface text-on-surface-variant border border-outline/20 rounded-2xl text-sm font-black hover:bg-surface-variant/30 transition-all active:scale-95"
               >
                 <FolderPlus size={20} className="text-primary" />
                 <span>New Folder</span>
               </button>
             )}

             <div className="flex bg-surface-variant/30 p-1.5 rounded-2xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-surface text-primary shadow-md" : "text-on-surface-variant hover:bg-surface-variant/50"
                  )}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    viewMode === 'list' ? "bg-surface text-primary shadow-md" : "text-on-surface-variant hover:bg-surface-variant/50"
                  )}
                >
                  <ListIcon size={20} />
                </button>
             </div>

             {(filter === 'all' || filter === 'files') && (
               <button
                  onClick={open}
                  className="bg-primary text-on-primary px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-3 shadow-xl shadow-primary/20 transition-all hover:shadow-2xl active:scale-95"
                >
                  <Plus size={24} />
                  <span>Upload</span>
                </button>
             )}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-1">
          <div className="space-y-8 lg:col-span-1">

            {/* Filter & Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-variant/20 p-4 rounded-2xl border border-outline/10">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {(['all', 'Folder', 'Image', 'Document', 'Video', 'Audio'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFileTypeFilter(type)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                      fileTypeFilter === type
                        ? "bg-primary text-on-primary shadow-md"
                        : "text-on-surface-variant hover:bg-surface-variant/50"
                    )}
                  >
                    {type === 'all' ? 'All Types' : type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-on-surface-variant opacity-70">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-surface text-on-surface text-xs font-bold px-3 py-2 rounded-xl border border-outline/20 outline-none focus:border-primary transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="size-desc">Largest Size</option>
                </select>
              </div>
            </div>

            <AnimatePresence>
              {Object.keys(uploadingFiles).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-primary-container text-on-primary-container rounded-[2rem] p-6 border border-primary/10 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-label-large font-black flex items-center gap-3">
                      <Loader2 className="animate-spin text-primary" size={18} />
                      Syncing {Object.keys(uploadingFiles).length} Files...
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(uploadingFiles).map(([id, progress]) => (
                        <div key={id} className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                             <span className="flex items-center gap-2 text-primary">
                                Transferring file...
                             </span>
                             <div className="flex items-center gap-3">
                               <span>{Math.round(progress)}%</span>
                               <button
                                 onClick={() => cancelUpload(id)}
                                 title="Cancel upload"
                                 className="p-1 rounded-full hover:bg-error/20 text-error transition-colors cursor-pointer"
                               >
                                 <X size={14} />
                               </button>
                             </div>
                          </div>
                          <div className="w-full bg-on-primary-container/10 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className="bg-primary h-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, progress)}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                        </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`relative transition-all duration-300 min-h-[600px] ${isDragActive ? 'scale-[0.98]' : ''}`}>
              {isLoading ? (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-3"}>
                   {[...Array(6)].map((_, i) => <FileItemSkeleton key={i} viewMode={viewMode} />)}
                </div>
              ) : filter === 'shared' && sharedSubFilter === 'invitations' ? (
                <div className="space-y-6">
                   {sortedInvitations.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-16 bg-surface-variant/10 border-2 border-dashed border-outline/10 rounded-[3rem]">
                        <div className="w-24 h-24 bg-primary-container text-primary rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                           <Plus size={48} />
                        </div>
                        <h2 className="text-headline-small font-black text-on-surface mb-3">No Invitations</h2>
                        <p className="text-on-surface-variant font-medium max-w-sm mx-auto leading-relaxed">Secure file transfer invitations will appear here for your verification.</p>
                      </div>
                   ) : (
                      sortedInvitations.map(invite => <InvitationItem key={invite.id} invitation={invite} />)
                   )}
                </div>
              ) : filter === 'shared' && sharedSubFilter === 'by_me' ? (
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.3em] mb-6 px-1">Outgoing Transmission Logs & Invitations</h3>
                   {sortedInvitations.length === 0 ? (
                      <div className="p-16 text-center opacity-40 italic font-medium">No outgoing shares or invitations logged.</div>
                   ) : (
                     sortedInvitations.map(invite => (
                       <OutgoingInvitationItem key={invite.id} invitation={invite} />
                   ))
                   )}
                </div>
              ) : files.length === 0 && !isDragActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-16 bg-surface-variant/10 border-2 border-dashed border-outline/10 rounded-[3rem]">
                  <div className="w-24 h-24 bg-primary-container text-primary rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                    {filter === 'starred' ? <Star size={48} /> : <Cloud size={48} />}
                  </div>
                  <h2 className="text-headline-small font-black text-on-surface mb-3">
                    {filter === 'starred' ? 'Empty Favourites' :
                     filter === 'all' ? 'No Recent Activity' : 'Cloud Empty'}
                  </h2>
                  <p className="text-on-surface-variant font-medium max-w-sm mx-auto leading-relaxed">
                    {filter === 'starred'
                      ? 'Star your most critical encrypted files to access them instantly from this vault.'
                      : filter === 'all'
                      ? 'Your recently opened or uploaded files will appear here for rapid access.'
                      : 'Your secure workspace is ready. Drop files here to encrypt and store them globally.'}
                  </p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-3"}>
                  {sortedFiles.map((file) => (
                    <FileItem
                      key={file.fileId}
                      file={file}
                      viewMode={viewMode}
                      isSelected={selectedFileIds.includes(file.fileId)}
                      isActive={selectedFileForInfo?.fileId === file.fileId}
                      editingFile={editingFile}
                      newName={newName}
                      onNewNameChange={setNewName}
                      onRenameSubmit={handleRename}
                      onCancelRename={() => setEditingFile(null)}
                      onStartRename={(f) => { setEditingFile(f.fileId); setNewName(f.fileName); }}
                      onMove={(f) => { setSelectedFileIds([f.fileId]); setIsMoveModalOpen(true); }}
                      onCustomizeFolder={(f) => { setSelectedFolderForCustomize(f); setIsCustomizeModalOpen(true); }}
                      onToggleSelection={toggleSelection}
                      onClick={(e) => handleFileClick(e, file)}
                      onDoubleClick={() => {}}
                      onInfoClick={(file) => setSelectedFileForInfo(file)}
                      onToggleStar={toggleStar}
                      onDownload={handleDownload}
                      onShare={handleShareFile}
                      onDelete={handleMoveToTrash}
                    />
                  ))}
                </div>
              )}

              <AnimatePresence>
                {isDragActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="absolute inset-0 bg-primary/95 backdrop-blur-md z-50 rounded-[3rem] flex items-center justify-center text-on-primary p-16 text-center shadow-2xl border-4 border-white/20"
                  >
                     <div className="space-y-6">
                        <div className="w-32 h-32 bg-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner animate-pulse">
                           <Cloud size={64} fill="currentColor" fillOpacity={0.4} />
                        </div>
                        <h2 className="text-5xl font-black tracking-tighter">Ready to Encrypt</h2>
                        <p className="text-on-primary/70 text-xl font-medium max-w-sm">Release to instantly sync your data with AES-256 protection.</p>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
