"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CloudUpload, Loader2, FolderTree, ExternalLink } from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { openGooglePicker, uploadToGoogleDrive } from '@/lib/google-drive-service';
import { useToast } from '@/context/toast-context';
import JSZip from 'jszip';

interface ExportToDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileEntry[];
}

export const ExportToDriveModal = ({ isOpen, onClose, files }: ExportToDriveModalProps) => {
  const { showToast, hideToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen || files.length === 0) return null;

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = showToast("Select destination folder in Google Drive...", "loading");

    try {
      // 1. Open Google Picker in folder-selection mode
      let targetFolderId = 'root';
      await openGooglePicker((docs) => {
        if (docs && docs.length > 0) {
          targetFolderId = docs[0].id;
        }
      }, '', true);

      hideToast(toastId);
      const uploadToastId = showToast("Preparing files for export...", "loading");

      let exportBlob: Blob;
      let exportName = '';

      if (files.length === 1 && files[0].fileType !== 'Folder') {
        const res = await fetch(files[0].downloadUrl);
        exportBlob = await res.blob();
        exportName = files[0].fileName;
      } else {
        // Bundle multiple files or folder into a .zip
        const zip = new JSZip();
        for (const file of files) {
          if (file.downloadUrl) {
            const res = await fetch(file.downloadUrl);
            const blob = await res.blob();
            zip.file(file.fileName, blob);
          }
        }
        exportBlob = await zip.generateAsync({ type: 'blob' });
        exportName = `XCloud_Export_${Date.now()}.zip`;
      }

      setProgress(10);
      showToast("Uploading to Google Drive via resumable stream...", "loading");

      const driveFileId = await uploadToGoogleDrive(exportBlob, exportName, targetFolderId, (pct) => {
        setProgress(pct);
      });

      hideToast(uploadToastId);
      showToast(`Successfully exported ${exportName} to Google Drive!`, "success");
      setIsExporting(false);
      setProgress(0);
      onClose();
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Export to Google Drive failed", "error");
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-emerald-500/30">
            <CloudUpload size={40} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight">Export to Google Drive</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Export {files.length} selected item{files.length > 1 ? 's' : ''} directly to your Google Drive destination folder with resumable upload streaming.
            </p>
          </div>

          {isExporting && progress > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-left">
              <div className="flex justify-between text-xs font-bold">
                <span>Uploading stream...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={isExporting} className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all">
              Cancel
            </button>
            <button onClick={handleExport} disabled={isExporting} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2">
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FolderTree size={16} />}
              Select Folder & Export
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
