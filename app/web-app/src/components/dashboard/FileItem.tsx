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
  Palette,
  History,
  FileCode,
  CloudUpload
} from 'lucide-react';
import { cn, formatFileSize, formatTimestamp } from '@/lib/utils';
import { FileEntry } from '@/lib/upload-manager';
import { motion } from 'framer-motion';

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
  onVersionHistory?: (file: FileEntry) => void;
  onEditCode?: (file: FileEntry) => void;
  onExportToDrive?: (file: FileEntry) => void;
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
  onDelete,
  onVersionHistory = () => {},
  onEditCode = () => {},
  onExportToDrive = () => {}
}: FileItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { icon: Edit2, label: 'Rename', action: () => { setIsMenuOpen(false); onStartRename(file); } },
    { icon: FolderInput, label: 'Move to...', action: () => { setIsMenuOpen(false); onMove(file); } },
    ...(file.fileType === 'Folder' ? [{ icon: Palette, label: 'Customize', action: () => { setIsMenuOpen(false); onCustomizeFolder(file); } }] : []),
    ...(file.fileType !== 'Folder' ? [
      { icon: History, label: 'Version History', action: () => { setIsMenuOpen(false); onVersionHistory(file); } },
      ...(file.fileType === 'Code' || file.fileType === 'Text' || file.fileName.match(/\.(txt|md|json|js|ts|py|html|css|jsx|tsx|csv|xml)$/i) ? [
        { icon: FileCode, label: 'Edit in XCloud', action: () => { setIsMenuOpen(false); onEditCode(file); } }
      ] : [])
    ] : []),
    { icon: CloudUpload, label: 'Export to Google Drive', action: () => { setIsMenuOpen(false); onExportToDrive(file); } },
    { icon: Download, label: 'Download', action: () => { setIsMenuOpen(false); onDownload(file); } },
    { icon: Share2, label: 'Share Link', action: () => { setIsMenuOpen(false); onShare(file); } },
    { icon: Info, label: 'Properties', action: () => { setIsMenuOpen(false); onInfoClick(file); } }
  ];

  return (
    <motion.div
      layout
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "group relative transition-all duration-300 cursor-pointer",
        viewMode === 'grid' ? (
          "bg-surface border border-outline/10 rounded-[2rem] p-5 flex flex-col justify-between hover:shadow-lg hover:border-primary/30 aspect-square"
        ) : (
          "bg-surface border border-outline/10 rounded-2xl px-6 py-4 flex items-center justify-between hover:shadow-md hover:border-primary/30"
        ),
        isSelected && "border-primary bg-primary-container/20 ring-2 ring-primary/20",
        isActive && "border-primary ring-2 ring-primary/40 shadow-md"
      )}
    >
      {/* Selection Checkbox */}
      <div className={cn(
        "absolute top-4 left-4 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
        isSelected ? "bg-primary border-primary text-on-primary scale-100 opacity-100" : "border-outline/40 bg-surface/80 opacity-0 group-hover:opacity-100 scale-90"
      )} onClick={(e) => onToggleSelection(e, file.fileId)}>
        {isSelected && <Check size={14} />}
      </div>

      {viewMode === 'grid' ? (
        <>
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 bg-surface-variant/40 rounded-2xl flex items-center justify-center shadow-inner text-2xl">
              {getFileIcon(file.fileType, file.fileName, file.folderColor, file.folderIcon)}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(file);
                }}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  file.isStarred ? "text-amber-400 bg-amber-400/10" : "text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-surface-variant"
                )}
              >
                <Star size={18} fill={file.isStarred ? "currentColor" : "none"} />
              </button>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-2 text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-surface-variant rounded-xl transition-colors"
                >
                  <MoreVertical size={18} />
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
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-outline/10 shadow-2xl rounded-[1.5rem] py-2.5 z-[60] animate-in fade-in zoom-in duration-200">
                       {menuItems.map((item, i) => (
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
          </div>

          <div className="space-y-1 mt-4">
            {editingFile === file.fileId ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => onNewNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onRenameSubmit(file.fileId)}
                  className="w-full bg-surface-variant text-on-surface px-3 py-1.5 rounded-xl text-xs font-bold outline-none border border-primary"
                />
                <button onClick={() => onRenameSubmit(file.fileId)} className="text-primary p-1 hover:bg-primary-container rounded-lg">
                  <Check size={16} />
                </button>
                <button onClick={onCancelRename} className="text-outline p-1 hover:bg-surface-variant rounded-lg">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h3 className="text-sm font-black text-on-surface truncate tracking-tight">{file.fileName}</h3>
            )}
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
              <span>{file.fileType === 'Folder' ? 'Folder' : formatFileSize(file.fileSize)}</span>
              <span className="opacity-60">{formatTimestamp(file.uploadTimestamp, 'MMM d, yyyy')}</span>
            </div>
          </div>
        </>
      ) : (
        /* List View */
        <>
          <div className="flex items-center gap-5 min-w-0 flex-1">
            <div className="w-12 h-12 bg-surface-variant/40 rounded-2xl flex items-center justify-center shadow-inner shrink-0 text-xl">
              {getFileIcon(file.fileType, file.fileName, file.folderColor, file.folderIcon)}
            </div>
            <div className="min-w-0 flex-1">
              {editingFile === file.fileId ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => onNewNameChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onRenameSubmit(file.fileId)}
                    className="w-full bg-surface-variant text-on-surface px-3 py-1.5 rounded-xl text-xs font-bold outline-none border border-primary"
                  />
                  <button onClick={() => onRenameSubmit(file.fileId)} className="text-primary p-1 hover:bg-primary-container rounded-lg">
                    <Check size={16} />
                  </button>
                  <button onClick={onCancelRename} className="text-outline p-1 hover:bg-surface-variant rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <h3 className="text-sm font-black text-on-surface truncate tracking-tight">{file.fileName}</h3>
              )}
              <div className="flex items-center gap-4 text-xs text-on-surface-variant font-medium mt-0.5">
                <span>{file.fileType === 'Folder' ? 'Folder' : formatFileSize(file.fileSize)}</span>
                <span>•</span>
                <span>{formatTimestamp(file.uploadTimestamp, 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(file);
              }}
              className={cn(
                "p-2.5 rounded-xl transition-colors",
                file.isStarred ? "text-amber-400 bg-amber-400/10" : "text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-surface-variant"
              )}
            >
              <Star size={18} fill={file.isStarred ? "currentColor" : "none"} />
            </button>

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
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-outline/10 shadow-2xl rounded-[1.5rem] py-2.5 z-[60] animate-in fade-in zoom-in duration-200">
                   {menuItems.map((item, i) => (
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
        </>
      )}
    </motion.div>
  );
});

FileItem.displayName = 'FileItem';
