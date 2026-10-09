"use client";

import React, { useState, memo } from 'react';
import {
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Folder as FolderIcon,
  FolderInput,
  Briefcase,
  Star,
  Heart,
  Archive,
  Code as CodeIcon,
  MoreVertical,
  MoreHorizontal,
  Download,
  Share2,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  X,
  Clock,
  Globe,
  Lock,
  Info,
  Terminal,
  Type as FontIcon,
  Palette
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { FileEntry } from '@/lib/upload-manager';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface FileItemProps {
  file: FileEntry;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  isActive: boolean;
  editingFile: string | null;
  newName: string;
  onNewNameChange: (name: string) => void;
  onRenameSubmit: (id: string) => void;
  onCancelRename: () => void;
  onStartRename: (file: FileEntry) => void;
  onMove: (file: FileEntry) => void;
  onCustomizeFolder: (file: FileEntry) => void;
  onToggleSelection: (e: React.MouseEvent, id: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onInfoClick: (file: FileEntry) => void;
  onToggleStar: (file: FileEntry) => void;
  onDownload: (file: FileEntry) => void;
  onShare: (file: FileEntry) => void;
  onDelete: (file: FileEntry) => void;
}

const getFileIcon = (type: string, fileName: string = '', folderColor?: string, folderIcon?: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (type === 'Folder') {
    let IconComp = FolderIcon;
    if (folderIcon === 'briefcase') IconComp = Briefcase;
    else if (folderIcon === 'star') IconComp = Star;
    else if (folderIcon === 'heart') IconComp = Heart;
    else if (folderIcon === 'archive') IconComp = Archive;
    else if (folderIcon === 'code') IconComp = CodeIcon;

    let colorClass = "text-amber-500";
    if (folderColor === 'blue') colorClass = "text-blue-500";
    else if (folderColor === 'indigo') colorClass = "text-indigo-500";
    else if (folderColor === 'emerald') colorClass = "text-emerald-500";
    else if (folderColor === 'purple') colorClass = "text-purple-500";
    else if (folderColor === 'rose') colorClass = "text-rose-500";

    return <IconComp className={cn(colorClass, "fill-current/20")} />;
  }

  switch (type) {
    case 'Image':
      if (ext === 'svg' || ext === 'ai') return <ImageIcon className="text-emerald-500" />;
      if (ext === 'psd' || ext === 'raw' || ext === 'dng') return <ImageIcon className="text-orange-500" />;
      return <ImageIcon className="text-blue-500" />;
    case 'Video': return <Video className="text-purple-500" />;
    case 'Audio': return <Music className="text-pink-500" />;
    case 'Archive': return <Archive className="text-amber-600" />;
    case 'System': return <Terminal className="text-slate-600" />;
    case 'Code': return <CodeIcon className="text-indigo-500" />;
    case 'Font': return <FontIcon className="text-cyan-600" />;
    case 'PDF': return <FileText className="text-red-500" />;
    case 'Text': return <FileText className="text-emerald-500" />;
    default: return <File className="text-gray-500" />;
  }
};

export const FileItem = memo(({
  file,
  viewMode,
  isSelected,
  isActive,
  editingFile,
  newName,
  onNewNameChange,
  onRenameSubmit,
  onCancelRename,
  onStartRename,
  onMove,
  onCustomizeFolder,
  onToggleSelection,
  onClick,
  onDoubleClick,
  onInfoClick,
  onToggleStar,
  onDownload,
  onShare,
  onDelete
}: FileItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "group bg-surface-variant/20 border border-outline/5 rounded-[2rem] p-6 hover:bg-surface-variant/40 hover:border-primary/20 hover:shadow-xl transition-all relative cursor-pointer",
        (isActive || isSelected) ? "ring-2 ring-primary bg-primary-container/10" : "",
        viewMode === 'list' && "flex items-center justify-between p-4 overflow-hidden"
      )}
    >
      {/* Selection Checkbox */}
      <div className={cn(
        "absolute top-6 left-6 z-10 transition-opacity",
        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
         <button
           onClick={(e) => onToggleSelection(e, file.fileId)}
           className={cn(
             "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90",
             isSelected ? "bg-primary border-primary text-on-primary shadow-lg" : "bg-surface border-outline/30"
           )}
         >
            {isSelected && <Check size={14} strokeWidth={4} />}
         </button>
      </div>

      {file.isPubliclyShared && (
        <div className={cn(
          "absolute z-10 animate-in fade-in slide-in-from-top-2 duration-500",
          viewMode === 'grid' ? "top-3 left-1/2 -translate-x-1/2" : "right-24"
        )}>
          <div className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
            <Globe size={10} />
            Shared
          </div>
        </div>
      )}

      {file.isLocked && (
        <div className={cn(
          "absolute z-10 animate-in fade-in zoom-in duration-500",
          viewMode === 'grid' ? "top-6 right-6" : "right-20"
        )}>
           <div className="bg-primary text-on-primary p-1.5 rounded-xl shadow-lg border border-white/10">
              <Lock size={12} fill="currentColor" fillOpacity={0.2} />
           </div>
        </div>
      )}

      <div className={cn("flex items-center gap-5", viewMode === 'grid' && "flex-col items-start mb-6")}>
        <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-primary-container/30 transition-colors shrink-0">
          {getFileIcon(file.fileType, file.fileName, file.folderColor, file.folderIcon)}
        </div>
        <div className={cn("min-w-0 flex-1 w-full", viewMode === 'grid' && "pr-8")}>
          {editingFile === file.fileId ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => onNewNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRenameSubmit(file.fileId)}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface border-primary rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary w-full font-bold"
              />
              <button onClick={(e) => { e.stopPropagation(); onRenameSubmit(file.fileId); }} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg"><CheckCircle2 size={18} /></button>
              <button onClick={(e) => { e.stopPropagation(); onCancelRename(); }} className="text-outline hover:bg-surface-variant p-1.5 rounded-lg"><X size={18} /></button>
            </div>
          ) : (
            <h3 className="text-title-small font-black text-on-surface truncate" title={file.fileName}>
              {file.fileName}
            </h3>
          )}
          <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest mt-1 flex items-center gap-2">
            <span>{file.fileType === 'Folder' ? (file.fileSize === 0 ? 'Empty' : formatFileSize(file.fileSize)) : formatFileSize(file.fileSize)}</span>
            <span className="w-1 h-1 bg-outline/20 rounded-full"></span>
            <span>{file.uploadTimestamp?.seconds ? format(file.uploadTimestamp.seconds * 1000, 'MMM d') : 'New'}</span>
          </p>
        </div>
      </div>

      {viewMode === 'grid' && (
         <div className="mt-auto pt-5 border-t border-outline/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">Verified Meta</span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(file); }}
              className={cn(
                "p-2 rounded-xl transition-all active:scale-75",
                file.isStarred ? "text-primary bg-primary-container" : "text-outline hover:bg-surface-variant"
              )}
            >
              <Star size={20} fill={file.isStarred ? 'currentColor' : 'none'} />
            </button>
         </div>
      )}

      <div className={cn("flex gap-2 items-center", viewMode === 'grid' && "absolute top-6 right-6")}>
        {viewMode === 'list' && (
           <button
             onClick={(e) => { e.stopPropagation(); onToggleStar(file); }}
             className={cn(
               "p-2 rounded-xl transition-all",
               file.isStarred ? "text-primary" : "text-outline hover:bg-surface-variant"
             )}
           >
             <Star size={18} fill={file.isStarred ? 'currentColor' : 'none'} />
           </button>
        )}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-2.5 text-on-surface-variant hover:bg-surface-variant rounded-xl transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-outline/10 shadow-2xl rounded-[1.5rem] py-2.5 z-[60] animate-in fade-in zoom-in duration-200">
                 {[
                   { icon: Edit2, label: 'Rename', action: () => { setIsMenuOpen(false); onStartRename(file); } },
                   { icon: FolderInput, label: 'Move to...', action: () => { setIsMenuOpen(false); onMove(file); } },
                   ...(file.fileType === 'Folder' ? [{ icon: Palette, label: 'Customize', action: () => { setIsMenuOpen(false); onCustomizeFolder(file); } }] : []),
                   { icon: Download, label: 'Download', action: () => { setIsMenuOpen(false); onDownload(file); } },
                   { icon: Share2, label: 'Share Link', action: () => { setIsMenuOpen(false); onShare(file); } },
                   { icon: Info, label: 'Properties', action: () => { setIsMenuOpen(false); onInfoClick(file); } }
                 ].map((item, i) => (
                   <button
                     key={i}
                     onClick={(e) => {
                       e.stopPropagation();
                       item.action();
                     }}
                     className="w-full text-left px-5 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-variant/50 flex items-center gap-4 transition-all"
                   >
                     <item.icon size={18} className="text-outline" /> {item.label}
                   </button>
                 ))}
                 <div className="h-px bg-outline/5 my-2 mx-3" />
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     setIsMenuOpen(false);
                     onDelete(file);
                   }}
                   className="w-full text-left px-5 py-3 text-sm font-bold text-error hover:bg-error-container/20 flex items-center gap-4 transition-all"
                 >
                   <Trash2 size={18} /> Move to Trash
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

FileItem.displayName = 'FileItem';
