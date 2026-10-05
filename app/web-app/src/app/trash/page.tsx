"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
  File,
  RefreshCcw,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Video,
  Music
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileEntry } from '@/lib/upload-manager';
import { restoreFromTrash, permanentlyDeleteFile, emptyTrash } from '@/lib/trash-manager';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Trash() {
  const { user } = useAuth();
  const { showToast, hideToast } = useToast();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isPurgingAll, setIsPurgingAll] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'trash_files'),
      orderBy('deletedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as FileEntry);
      setFiles(docs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleRestore = async (file: FileEntry) => {
    if (!user) return;
    setActionLoading(file.fileId);
    const toastId = showToast(`Restoring ${file.fileName}...`, 'loading');
    try {
      await restoreFromTrash(user.uid, file.fileId);
      hideToast(toastId);
      showToast(`"${file.fileName}" restored`, 'success');
    } catch (error: any) {
      hideToast(toastId);
      showToast(error.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (file: FileEntry) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to permanently delete "${file.fileName}"? This action cannot be undone and will free up your storage.`)) return;

    setActionLoading(file.fileId);
    const toastId = showToast(`Deleting ${file.fileName}...`, 'loading');
    try {
      await permanentlyDeleteFile(user.uid, file);
      hideToast(toastId);
      showToast(`"${file.fileName}" permanently deleted`, 'success');
    } catch (error: any) {
      hideToast(toastId);
      showToast(error.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!user || files.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${files.length} items in the trash? This action cannot be undone and will free up your storage.`)) return;

    setIsPurgingAll(true);
    const toastId = showToast('Emptying trash bin...', 'loading');
    try {
      await emptyTrash(user.uid, files);
      hideToast(toastId);
      showToast('Trash bin emptied successfully', 'success');
    } catch (error: any) {
      hideToast(toastId);
      showToast(error.message, 'error');
    } finally {
      setIsPurgingAll(false);
    }
  };

  const getFileIcon = (type: string) => {
    const className = "text-primary";
    switch (type) {
      case 'Image': return <ImageIcon size={24} className={className} />;
      case 'Video': return <Video size={24} className={className} />;
      case 'Audio': return <Music size={24} className={className} />;
      case 'PDF': return <FileText size={24} className={className} />;
      default: return <File size={24} className={className} />;
    }
  };

  if (!user) return null;

  return (
    <div className="p-10 max-w-7xl mx-auto min-h-full flex flex-col gap-10 bg-surface transition-colors">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-display-small font-black text-on-surface flex items-center gap-4">
            <Trash2 className="text-error" size={48} />
            Trash Bin
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">
            Protocol: Scheduled for permanent scrub in 30 cycles.
          </p>
        </div>
        {files.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleEmptyTrash}
              disabled={isPurgingAll}
              className="px-6 py-3 bg-error text-on-error hover:opacity-90 rounded-2xl text-xs font-black uppercase tracking-[0.1em] shadow-lg shadow-error/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isPurgingAll ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              <span>Empty Trash ({files.length})</span>
            </button>
            <div className="hidden lg:flex items-center gap-3 text-error bg-error-container/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.1em] border border-error/10 backdrop-blur-md">
              <AlertCircle size={18} />
              <span>Storage footprint maintained until purge</span>
            </div>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      ) : files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-surface-variant/10 border-2 border-dashed border-outline/10 rounded-[4rem] transition-colors"
        >
           <div className="w-32 h-32 bg-surface-variant/30 rounded-[3rem] flex items-center justify-center mb-8 text-outline/40 shadow-inner">
              <Trash2 size={64} />
           </div>
           <h2 className="text-headline-medium font-black text-on-surface mb-3 tracking-tight">Empty Bin</h2>
           <p className="text-on-surface-variant font-medium max-w-sm mx-auto leading-relaxed opacity-60 text-sm">
             Your archive is clean. Deleted items are maintained here for 30 cycles before automatic hardware scrubbing.
           </p>
        </motion.div>
      ) : (
        <div className="bg-surface-variant/10 border border-outline/5 rounded-[3rem] overflow-hidden shadow-xl transition-colors">
           <div className="overflow-x-auto px-4 py-4">
             <table className="w-full text-left border-separate border-spacing-y-3">
               <thead>
                  <tr className="text-[10px] font-black text-outline uppercase tracking-[0.25em]">
                    <th className="px-10 py-4">Encrypted Fragment</th>
                    <th className="px-10 py-4">Decommissioned On</th>
                    <th className="px-10 py-4 text-right">Vault Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <AnimatePresence>
                    {files.map((file) => (
                      <motion.tr
                        key={file.fileId}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group bg-surface hover:bg-surface-variant/20 transition-all rounded-[2rem] shadow-sm hover:shadow-md"
                      >
                        <td className="px-10 py-6 first:rounded-l-[2rem]">
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 bg-surface-variant/30 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-primary-container/20 transition-colors">
                                {getFileIcon(file.fileType)}
                              </div>
                              <div className="min-w-0">
                                 <span className="text-title-small font-black text-on-surface truncate max-w-md block mb-1" title={file.fileName}>
                                   {file.fileName}
                                 </span>
                                 <p className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary-container/30 w-fit px-2 py-0.5 rounded-lg">{file.fileType}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6 text-sm text-on-surface-variant font-bold">
                           <div className="space-y-1">
                             <p className="opacity-60 text-xs">{(file as any).deletedAt ? format((file as any).deletedAt, 'MMM d, yyyy HH:mm') : 'Recently'}</p>
                             {(() => {
                               const deletedAt = (file as any).deletedAt || Date.now();
                               const daysElapsed = Math.floor((Date.now() - deletedAt) / (1000 * 60 * 60 * 24));
                               const daysRemaining = Math.max(0, 30 - daysElapsed);
                               return (
                                 <span className="text-[10px] font-black uppercase tracking-wider text-error bg-error-container/20 px-2 py-0.5 rounded-md inline-block">
                                   {daysRemaining} days until auto-scrub
                                 </span>
                               );
                             })()}
                           </div>
                        </td>
                        <td className="px-10 py-6 text-right last:rounded-r-[2rem]">
                           <div className="flex justify-end gap-4">
                              <button
                                onClick={() => handleRestore(file)}
                                disabled={!!actionLoading}
                                className="px-5 py-3 bg-primary-container/30 text-primary hover:bg-primary hover:text-on-primary rounded-2xl transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest active:scale-90 disabled:opacity-50"
                              >
                                {actionLoading === file.fileId ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                                <span>Recover</span>
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(file)}
                                disabled={!!actionLoading}
                                className="px-5 py-3 bg-error-container/20 text-error hover:bg-error hover:text-on-error rounded-2xl transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest active:scale-90 disabled:opacity-50 border border-error/10"
                              >
                                {actionLoading === file.fileId ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                <span>Scrub</span>
                              </button>
                           </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
}
