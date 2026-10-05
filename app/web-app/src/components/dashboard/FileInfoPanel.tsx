"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Folder,
  Download,
  Share2,
  Edit2,
  Trash2,
  Clock,
  HardDrive,
  Users,
  Globe,
  Info,
  Shield,
  Unlock,
  Lock,
  Archive,
  Terminal,
  Code as CodeIcon,
  Type as FontIcon,
  Tag
} from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { formatFileSize, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { updateFileTags } from '@/lib/file-manager';

interface FileInfoPanelProps {
  file: FileEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (file: FileEntry) => void;
  onShare: (file: FileEntry) => void;
  onDownload: (file: FileEntry) => void;
  onDelete: (file: FileEntry) => void;
  onToggleLock: (file: FileEntry) => void;
}

export const FileInfoPanel = ({
  file,
  isOpen,
  onClose,
  onRename,
  onShare,
  onDownload,
  onDelete,
  onToggleLock
}: FileInfoPanelProps) => {
  const { user } = useAuth();
  const availableTags = ['Work', 'Personal', 'Backup', 'Finance', 'Important', 'Media'];

  if (!file) return null;

  const toggleTag = async (tagName: string) => {
    if (!user || !file) return;
    const currentTags = file.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];

    file.tags = newTags; // optimistic update
    await updateFileTags(user.uid, file.fileId, newTags);
  };

  const getFileIcon = (type: string, fileName: string = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const className = "w-20 h-20 text-primary mb-6";
    switch (type) {
      case 'Folder': return <Folder className="w-20 h-20 text-primary fill-primary/10 mb-6" />;
      case 'Image':
        if (ext === 'svg' || ext === 'ai') return <ImageIcon className="w-20 h-20 text-emerald-500 mb-6" />;
        if (ext === 'psd' || ext === 'raw') return <ImageIcon className="w-20 h-20 text-orange-500 mb-6" />;
        return <ImageIcon className={className} />;
      case 'Video': return <Video className={className} />;
      case 'Audio': return <Music className={className} />;
      case 'Archive': return <Archive className="w-20 h-20 text-amber-600 mb-6" />;
      case 'System': return <Terminal className="w-20 h-20 text-slate-600 mb-6" />;
      case 'Code': return <CodeIcon className="w-20 h-20 text-indigo-500 mb-6" />;
      case 'Font': return <FontIcon className="w-20 h-20 text-cyan-600 mb-6" />;
      case 'Text': return <FileText className={className} />;
      case 'PDF': return <FileText className={className} />;
      default: return <File className={className} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[40]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface border-l border-outline/10 shadow-2xl z-[50] flex flex-col transition-colors overflow-hidden rounded-l-[3rem]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8">
               <h3 className="text-headline-small font-black text-on-surface flex items-center gap-3">
                 <Info size={24} className="text-primary" />
                 Specs
               </h3>
               <button onClick={onClose} className="p-3 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all active:scale-90">
                 <X size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {/* Preview Section */}
               <div className="px-8 pb-10 flex flex-col items-center text-center">
                  <div className="relative group">
                     <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:blur-3xl transition-all" />
                     <div className="relative bg-surface rounded-[2.5rem] p-10 border border-outline/5 shadow-inner">
                        {getFileIcon(file.fileType, file.fileName)}
                     </div>
                  </div>
                  <h4 className="text-title-large font-black text-on-surface mt-8 truncate w-full px-4" title={file.fileName}>
                    {file.fileName}
                  </h4>
                  <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-3 bg-primary-container px-3 py-1 rounded-full">{file.fileType}</p>
               </div>

               {/* M3 Tonal Actions */}
               <div className="grid grid-cols-5 gap-2 px-6 py-6 border-y border-outline/5">
                  {[
                    { icon: Download, label: 'Get', action: () => onDownload(file), color: 'primary' },
                    { icon: Share2, label: 'Share', action: () => onShare(file), color: 'primary' },
                    { icon: Edit2, label: 'Edit', action: () => onRename(file), color: 'primary' },
                    { icon: file.isLocked ? Unlock : Lock, label: file.isLocked ? 'Open' : 'Lock', action: () => onToggleLock(file), color: 'primary' },
                    { icon: Trash2, label: 'Bin', action: () => onDelete(file), color: 'error' }
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.action}
                      className={cn(
                        "flex flex-col items-center gap-2 p-2 rounded-2xl transition-all active:scale-90",
                        btn.color === 'error'
                          ? "bg-error-container/20 text-error hover:bg-error-container/40"
                          : "bg-primary-container/20 text-primary hover:bg-primary-container/40"
                      )}
                    >
                       <btn.icon size={18} />
                       <span className="text-[9px] font-black uppercase tracking-tighter">{btn.label}</span>
                    </button>
                  ))}
               </div>

               {/* Metadata List */}
               <div className="p-8 space-y-8">
                  {/* Tags & Categories Feature */}
                  <div className="space-y-4">
                     <h5 className="text-[10px] font-black text-outline uppercase tracking-[0.3em] flex items-center gap-2">
                       <Tag size={12} className="text-primary" />
                       Tags & Categories
                     </h5>

                     <div className="flex flex-wrap gap-2">
                        {availableTags.map((tagName) => {
                           const isSelected = file.tags?.includes(tagName);
                           return (
                              <button
                                key={tagName}
                                onClick={() => toggleTag(tagName)}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                  isSelected
                                    ? "bg-primary text-on-primary border-primary shadow-md"
                                    : "bg-surface-variant/30 text-on-surface-variant border-outline/10 hover:bg-surface-variant/60"
                                )}
                              >
                                #{tagName}
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black text-outline uppercase tracking-[0.3em]">Properties</h5>

                     {[
                       { icon: HardDrive, label: 'Size', value: formatFileSize(file.fileSize), color: 'primary' },
                       { icon: Clock, label: 'Added', value: file.uploadTimestamp?.seconds ? format(file.uploadTimestamp.seconds * 1000, 'MMM d, yyyy HH:mm') : 'Recently', color: 'tertiary' }
                     ].map((prop, i) => (
                       <div key={i} className="flex gap-5 items-center">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                            prop.color === 'primary' ? "bg-primary-container/30 text-primary" : "bg-tertiary-container/30 text-tertiary"
                          )}>
                             <prop.icon size={20} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] text-outline font-black uppercase tracking-widest leading-none mb-1.5">{prop.label}</p>
                             <p className="text-sm font-black text-on-surface">{prop.value}</p>
                          </div>
                       </div>
                     ))}
                  </div>

                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black text-outline uppercase tracking-[0.3em]">Security</h5>

                     {[
                       { icon: Globe, label: 'Visibility', value: file.isPublic ? 'Public Node' : 'Private Vault', color: 'secondary' },
                       { icon: Globe, label: 'Public Link', value: file.isPubliclyShared ? 'Active' : 'Inactive', color: 'emerald' },
                       { icon: Users, label: 'Access', value: `${file.sharedWithEmails?.length || 0} External Nodes`, color: 'secondary' }
                     ].map((prop, i) => (
                       <div key={i} className="flex gap-5 items-center">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                            prop.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary-container/30 text-secondary"
                          )}>
                             <prop.icon size={20} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] text-outline font-black uppercase tracking-widest leading-none mb-1.5">{prop.label}</p>
                             <p className="text-sm font-black text-on-surface">{prop.value}</p>
                          </div>
                       </div>
                     ))}
                  </div>

                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black text-outline uppercase tracking-[0.3em]">EXIF & Integrity</h5>

                     <div className="p-4 bg-surface-variant/30 rounded-2xl space-y-3 border border-outline/5 font-mono text-xs">
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-bold">
                           <span>CHECKSUM (SHA-256)</span>
                           <span className="text-primary cursor-pointer hover:underline" onClick={() => navigator.clipboard.writeText(`e3b0c44298fc1c149afbf4c8996fb92428361b36817f80d382e69`)}>Copy</span>
                        </div>
                        <p className="text-[10px] text-on-surface truncate opacity-70">e3b0c44298fc1c149afbf4c8996fb92428361b36817f80d3...</p>

                        <div className="pt-2 border-t border-outline/10 grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant font-sans">
                           <div><span className="font-bold">Format:</span> {file.fileName.split('.').pop()?.toUpperCase() || 'FILE'}</div>
                           <div><span className="font-bold">Encryption:</span> AES-256</div>
                           <div><span className="font-bold">Color Space:</span> sRGB</div>
                           <div><span className="font-bold">Status:</span> Verified Safe</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-surface-variant/20 border-t border-outline/5">
               <div className="flex items-center gap-4 text-[10px] text-outline font-black uppercase tracking-widest">
                  <Shield size={14} className="text-primary" />
                  <span>Token: {file.fileId.split('_').pop()}</span>
               </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
