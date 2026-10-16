"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, FolderTree, Loader2, CheckCircle2, Shield } from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { openGooglePicker } from '@/lib/google-drive-service';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

interface DriveFolderSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FileEntry | null;
}

export const DriveFolderSyncModal = ({ isOpen, onClose, folder }: DriveFolderSyncModalProps) => {
  const { user } = useAuth();
  const { showToast, hideToast } = useToast();
  const [targetDriveFolder, setTargetDriveFolder] = useState<{ id: string; name: string } | null>(null);
  const [direction, setDirection] = useState<'XCLOUD_TO_DRIVE' | 'DRIVE_TO_XCLOUD' | 'BIDIRECTIONAL'>('BIDIRECTIONAL');
  const [syncInterval, setSyncInterval] = useState<'MANUAL' | 'REALTIME' | 'DAILY'>('REALTIME');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !folder) return null;

  const handleSelectDriveFolder = async () => {
    try {
      await openGooglePicker((docs) => {
        if (docs && docs.length > 0) {
          setTargetDriveFolder({ id: docs[0].id, name: docs[0].name });
        }
      }, '', true);
    } catch (err: any) {
      showToast(err.message || "Failed to select Google Drive folder", "error");
    }
  };

  const handleSaveSyncRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetDriveFolder) return;

    setIsSaving(true);
    const toastId = showToast("Configuring Google Drive sync mirror...", "loading");

    try {
      const ruleId = `sync_${folder.fileId}_${Date.now()}`;
      const syncRule = {
        ruleId,
        xcloudFolderId: folder.fileId,
        xcloudFolderName: folder.fileName,
        googleDriveFolderId: targetDriveFolder.id,
        googleDriveFolderName: targetDriveFolder.name,
        direction,
        syncInterval,
        lastSyncTimestamp: serverTimestamp(),
        status: 'IDLE',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid, 'folder_sync_rules', ruleId), syncRule);

      hideToast(toastId);
      showToast(`Folder successfully synced with Google Drive (${targetDriveFolder.name})`, "success");
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Failed to save sync rule", "error");
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center">
                <RefreshCw size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Mirror & Auto-Sync Folder</h3>
                <p className="text-xs text-white/50">{folder.fileName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>

          <form onSubmit={handleSaveSyncRule} className="space-y-6">
            <div className="bg-white/5 p-5 rounded-2xl space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">Target Google Drive Folder</label>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold truncate max-w-[260px]">{targetDriveFolder ? targetDriveFolder.name : 'No folder selected'}</span>
                <button type="button" onClick={handleSelectDriveFolder} className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-black flex items-center gap-2">
                  <FolderTree size={14} /> {targetDriveFolder ? 'Change' : 'Select Folder'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/60">Sync Direction</label>
                <select
                  value={direction}
                  onChange={(e: any) => setDirection(e.target.value)}
                  className="w-full bg-[#111318] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
                >
                  <option value="BIDIRECTIONAL">Bidirectional (2-way)</option>
                  <option value="XCLOUD_TO_DRIVE">XCloud ➔ Google Drive</option>
                  <option value="DRIVE_TO_XCLOUD">Google Drive ➔ XCloud</option>
                </select>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/60">Sync Frequency</label>
                <select
                  value={syncInterval}
                  onChange={(e: any) => setSyncInterval(e.target.value)}
                  className="w-full bg-[#111318] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
                >
                  <option value="REALTIME">Real-time / Instant</option>
                  <option value="DAILY">Daily Batch</option>
                  <option value="MANUAL">Manual Trigger</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isSaving || !targetDriveFolder} className="flex-1 py-3.5 bg-primary hover:bg-primary/90 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Enable Mirror Sync
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
