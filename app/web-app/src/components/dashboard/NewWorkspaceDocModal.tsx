"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, FileSpreadsheet, Presentation, Loader2, ExternalLink } from 'lucide-react';
import { createGoogleWorkspaceFile } from '@/lib/google-drive-service';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { cn } from '@/lib/utils';

interface NewWorkspaceDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string;
  docType: 'document' | 'spreadsheet' | 'presentation' | null;
}

export const NewWorkspaceDocModal = ({ isOpen, onClose, currentFolderId, docType }: NewWorkspaceDocModalProps) => {
  const { user } = useAuth();
  const { showToast, hideToast } = useToast();
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !docType) return null;

  const mimeMap = {
    document: { mime: 'application/vnd.google-apps.document', label: 'Google Doc', icon: FileText, color: 'text-blue-400 bg-blue-500/20' },
    spreadsheet: { mime: 'application/vnd.google-apps.spreadsheet', label: 'Google Sheet', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/20' },
    presentation: { mime: 'application/vnd.google-apps.presentation', label: 'Google Slides', icon: Presentation, color: 'text-amber-400 bg-amber-500/20' },
  };

  const config = mimeMap[docType];
  const IconComp = config.icon;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setIsLoading(true);
    const toastId = showToast(`Creating ${config.label} on Google Drive...`, "loading");

    try {
      const { fileId, webViewLink } = await createGoogleWorkspaceFile(title.trim(), config.mime as any, currentFolderId);

      // Save shortcut pointer in XCloud
      const xcloudFileId = `ws_${Date.now()}`;
      const shortcutEntry = {
        fileId: xcloudFileId,
        fileName: `${title.trim()} (${config.label})`,
        fileType: 'Document',
        fileSize: 0,
        downloadUrl: webViewLink,
        uploadTimestamp: serverTimestamp(),
        ownerId: user.uid,
        storagePath: `workspace_shortcuts/${xcloudFileId}`,
        parentId: currentFolderId,
        isDeleted: false,
        isStarred: false,
        isWorkspaceShortcut: true,
        webViewLink,
        driveFileId: fileId
      };

      await setDoc(doc(db, 'users', user.uid, 'user_files', xcloudFileId), shortcutEntry);

      hideToast(toastId);
      showToast(`${config.label} created successfully! Opening...`, "success");
      window.open(webViewLink, '_blank');
      setIsLoading(false);
      setTitle('');
      onClose();
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Failed to create Google Workspace file", "error");
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", config.color)}>
                <IconComp size={24} />
              </div>
              <h3 className="text-lg font-black tracking-tight">New {config.label}</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">Document Title</label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`My new ${config.label}...`}
                className="w-full bg-[#111318] border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isLoading || !title.trim()} className="flex-1 py-3.5 bg-primary hover:bg-primary/90 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                Create & Open
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
