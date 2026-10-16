"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, RotateCcw, Download, Eye, FileText, CheckCircle2, Clock, Loader2, User } from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { FileVersion, getFileVersions, restoreFileVersion } from '@/lib/file-manager';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { formatFileSize, cn, formatTimestamp } from '@/lib/utils';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileEntry | null;
}

export const VersionHistoryModal = ({ isOpen, onClose, file }: VersionHistoryModalProps) => {
  const { user } = useAuth();
  const { showToast, hideToast } = useToast();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<FileVersion | null>(null);

  useEffect(() => {
    if (!isOpen || !file || !user) return;

    const fetchVersions = async () => {
      setIsLoading(true);
      try {
        const list = await getFileVersions(user.uid, file.fileId);
        setVersions(list);
      } catch (err: any) {
        showToast(err.message || "Failed to load version history", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, file, user, showToast]);

  if (!isOpen || !file) return null;

  const handleRestore = async (version: FileVersion) => {
    if (!user) return;
    setActiveActionId(version.versionId);
    const toastId = showToast(`Restoring version v${version.versionNumber}...`, "loading");
    try {
      await restoreFileVersion(user.uid, file.fileId, version);
      hideToast(toastId);
      showToast(`Successfully rolled back to v${version.versionNumber}`, "success");
      onClose();
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Restore failed", "error");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDownload = (version: FileVersion) => {
    if (!version.downloadUrl) {
      showToast("Download URL not available for this snapshot", "error");
      return;
    }
    const a = document.createElement('a');
    a.href = version.downloadUrl;
    a.download = `${file.fileName}_v${version.versionNumber}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading v${version.versionNumber} snapshot`, "success");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white overflow-hidden max-h-[85vh] flex flex-col"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b border-white/5 relative z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                <History size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Version History</h2>
                <p className="text-xs text-white/50 truncate max-w-xs">{file.fileName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-6 space-y-4 relative z-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <Loader2 size={36} className="animate-spin mb-3 text-primary" />
                <p className="text-sm font-medium">Loading version timeline...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-white/40">
                <FileText size={48} className="mb-3 opacity-40" />
                <h3 className="text-base font-bold text-white/80">No Previous Versions</h3>
                <p className="text-xs max-w-xs mt-1">Snapshots are automatically archived whenever this file is updated or overwritten.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((ver, idx) => (
                  <div
                    key={ver.versionId}
                    className="bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                        v{ver.versionNumber}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">Version {ver.versionNumber}</span>
                          {idx === 0 && (
                            <span className="bg-primary/20 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Latest Snapshot
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 italic">
                          {ver.changeSummary || "Standard snapshot archive"}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] text-white/40 font-medium pt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {formatTimestamp(ver.createdAt, 'MMM d, yyyy HH:mm')}
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(ver.fileSize)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-white/60">
                            <User size={12} /> {ver.modifiedBy?.displayName || ver.modifiedBy?.email || 'Owner'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      {ver.downloadUrl && (
                        <button
                          onClick={() => setPreviewVersion(ver)}
                          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                          title="Preview version content"
                        >
                          <Eye size={14} /> Preview
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(ver)}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="Download snapshot"
                      >
                        <Download size={14} /> Download
                      </button>
                      <button
                        onClick={() => handleRestore(ver)}
                        disabled={activeActionId === ver.versionId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="Rollback to this version"
                      >
                        {activeActionId === ver.versionId ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        Rollback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview modal subview */}
          {previewVersion && (
            <div className="absolute inset-0 bg-[#0f1117] z-30 flex flex-col p-8">
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-base font-bold">Previewing v{previewVersion.versionNumber}</h3>
                  <p className="text-xs text-white/50">{file.fileName}</p>
                </div>
                <button
                  onClick={() => setPreviewVersion(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
              <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-6 overflow-auto font-mono text-xs text-white/80">
                <iframe
                  src={previewVersion.downloadUrl}
                  className="w-full h-full border-none rounded-xl"
                  title="Version Preview"
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
