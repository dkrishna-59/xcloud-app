"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CloudDownload, Loader2, HardDrive, Users, Share2, FolderOpen, FileText } from 'lucide-react';
import { openGooglePicker, downloadDriveFile, listSharedDrives, fetchNativeDriveFiles, SharedDrive } from '@/lib/google-drive-service';
import { uploadFile } from '@/lib/upload-manager';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { cn, formatFileSize } from '@/lib/utils';

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string;
}

export const GoogleDriveImportModal = ({ isOpen, onClose, currentFolderId }: GoogleDriveImportModalProps) => {
  const { user, userMetadata } = useAuth();
  const { showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState<'my_drive' | 'shared_drives' | 'native_browser'>('my_drive');
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([]);
  const [nativeFiles, setNativeFiles] = useState<any[]>([]);
  const [isLoadingDrives, setIsLoadingDrives] = useState(false);
  const [isLoadingNative, setIsLoadingNative] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ name: string; percent: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'shared_drives') {
      setIsLoadingDrives(true);
      listSharedDrives()
        .then(drives => {
          setSharedDrives(drives);
          setIsLoadingDrives(false);
        })
        .catch(err => {
          console.error("Failed to load shared drives:", err);
          setIsLoadingDrives(false);
        });
    } else if (activeTab === 'native_browser') {
      setIsLoadingNative(true);
      fetchNativeDriveFiles()
        .then(files => {
          setNativeFiles(files);
          setIsLoadingNative(false);
        })
        .catch(err => {
          console.error("Failed to fetch native drive files:", err);
          showToast(err.message || "Failed to fetch Drive files", "error");
          setIsLoadingNative(false);
        });
    }
  }, [isOpen, activeTab, showToast]);

  if (!isOpen) return null;

  const handleStartImport = async () => {
    if (!user) return;

    try {
      await openGooglePicker(async (documents) => {
        if (!documents || documents.length === 0) return;
        await processImport(documents);
      });
    } catch (err: any) {
      console.warn("Picker failed, switching to native browser:", err);
      setActiveTab('native_browser');
    }
  };

  const processImport = async (documents: any[]) => {
    if (!user) return;
    setIsImporting(true);

    for (const doc of documents) {
      const fileId = doc.id;
      const fileName = doc.name;
      const mimeType = doc.mimeType;

      setImportProgress({ name: fileName, percent: 10 });
      const toastId = showToast(`Streaming ${fileName} from Google Drive...`, "loading");

      try {
        const { blob, fileName: finalName, mimeType: finalMime } = await downloadDriveFile(fileId, mimeType);
        setImportProgress({ name: finalName, percent: 50 });

        const fileObj = new File([blob], finalName, { type: finalMime });

        await uploadFile(
          user.uid,
          fileObj,
          userMetadata?.storageUsed || 0,
          userMetadata?.storageAvailable || 5368709120,
          (prog: number) => setImportProgress({ name: finalName, percent: 50 + Math.round(prog * 0.5) }),
          currentFolderId,
          new AbortController().signal
        );

        hideToast(toastId);
        showToast(`Successfully imported ${finalName} to XCloud`, "success");
      } catch (err: any) {
        hideToast(toastId);
        showToast(`Failed to import ${fileName}: ${err.message}`, "error");
      }
    }

    setIsImporting(false);
    setImportProgress(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center">
                <CloudDownload size={24} />
              </div>
              <h3 className="text-lg font-black tracking-tight">Google Drive Import Hub</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>

          {/* Segment Tabs */}
          <div className="flex bg-white/5 p-1 rounded-2xl">
            {[
              { id: 'my_drive', label: 'Google Picker', icon: HardDrive },
              { id: 'native_browser', label: 'Drive Files', icon: FileText },
              { id: 'shared_drives', label: 'Shared Drives', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
                  activeTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'shared_drives' ? (
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar py-2">
              {isLoadingDrives ? (
                <div className="py-12 text-center text-white/40"><Loader2 className="animate-spin mx-auto mb-2" size={24} /> Loading organization drives...</div>
              ) : sharedDrives.length === 0 ? (
                <div className="py-12 text-center text-white/40">No organizational Shared Drives found.</div>
              ) : (
                sharedDrives.map(drive => (
                  <div key={drive.id} onClick={() => handleStartImport()} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border border-white/5">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-blue-400" />
                      <div>
                        <p className="text-sm font-bold">{drive.name}</p>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">Team Drive</span>
                      </div>
                    </div>
                    <FolderOpen size={18} className="text-white/60" />
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'native_browser' ? (
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar py-2">
              {isLoadingNative ? (
                <div className="py-12 text-center text-white/40"><Loader2 className="animate-spin mx-auto mb-2" size={24} /> Fetching Google Drive files...</div>
              ) : nativeFiles.length === 0 ? (
                <div className="py-12 text-center text-white/40">No files found in Google Drive.</div>
              ) : (
                nativeFiles.map(file => (
                  <div key={file.id} onClick={() => processImport([file])} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={20} className="text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{file.name}</p>
                        <span className="text-[10px] text-white/40">{file.size ? formatFileSize(parseInt(file.size)) : 'File'}</span>
                      </div>
                    </div>
                    <CloudDownload size={18} className="text-white/60 shrink-0" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                Launch the official Google Picker modal to browse and select files from your Google Drive.
              </p>
              <button onClick={handleStartImport} disabled={isImporting} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2">
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                Open Google Picker Modal
              </button>
            </div>
          )}

          {isImporting && importProgress && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="truncate max-w-[260px]">{importProgress.name}</span>
                <span>{importProgress.percent}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${importProgress.percent}%` }} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
