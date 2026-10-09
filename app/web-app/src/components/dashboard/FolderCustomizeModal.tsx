"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Briefcase, Star, Heart, Archive, Code, Check, Palette } from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { updateFolderCustomization } from '@/lib/file-manager';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { cn } from '@/lib/utils';

interface FolderCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FileEntry | null;
}

const COLORS = [
  { name: 'Amber', value: 'amber', bg: 'bg-amber-500', text: 'text-amber-500' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500', text: 'text-blue-500' },
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500' },
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', text: 'text-purple-500' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-500', text: 'text-rose-500' },
];

const ICONS = [
  { name: 'Folder', value: 'folder', icon: Folder },
  { name: 'Briefcase', value: 'briefcase', icon: Briefcase },
  { name: 'Star', value: 'star', icon: Star },
  { name: 'Heart', value: 'heart', icon: Heart },
  { name: 'Archive', value: 'archive', icon: Archive },
  { name: 'Code', value: 'code', icon: Code },
];

export const FolderCustomizeModal = ({ isOpen, onClose, folder }: FolderCustomizeModalProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedColor, setSelectedColor] = useState(folder?.folderColor || 'amber');
  const [selectedIcon, setSelectedIcon] = useState(folder?.folderIcon || 'folder');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !folder) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await updateFolderCustomization(user.uid, folder.fileId, selectedColor, selectedIcon);
      showToast("Folder customized successfully", "success");
      onClose();
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const activeColorObj = COLORS.find(c => c.value === selectedColor) || COLORS[0];
  const ActiveIconComp = ICONS.find(i => i.value === selectedIcon)?.icon || Folder;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-3xl p-8 shadow-2xl text-white">

          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                   <Palette size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-bold">Customize Folder</h3>
                   <p className="text-xs text-neutral-400 truncate max-w-[200px]">{folder.fileName}</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-xl transition-colors"><X size={20} /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
             {/* Preview */}
             <div className="flex flex-col items-center justify-center py-4 bg-neutral-900/60 rounded-2xl border border-white/5">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all", activeColorObj.bg, "text-white")}>
                   <ActiveIconComp size={32} />
                </div>
                <span className="text-xs font-bold mt-3 text-neutral-300">{folder.fileName}</span>
             </div>

             {/* Color Selection */}
             <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Folder Color</label>
                <div className="grid grid-cols-6 gap-3">
                   {COLORS.map(color => (
                     <button
                       key={color.value}
                       type="button"
                       onClick={() => setSelectedColor(color.value)}
                       className={cn(
                         "h-10 rounded-xl flex items-center justify-center transition-all",
                         color.bg,
                         selectedColor === color.value ? "ring-2 ring-white scale-105 shadow-lg" : "opacity-70 hover:opacity-100"
                       )}
                     >
                        {selectedColor === color.value && <Check size={16} className="text-white" />}
                     </button>
                   ))}
                </div>
             </div>

             {/* Icon Selection */}
             <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Folder Icon</label>
                <div className="grid grid-cols-6 gap-3">
                   {ICONS.map(item => {
                     const IconComp = item.icon;
                     return (
                       <button
                         key={item.value}
                         type="button"
                         onClick={() => setSelectedIcon(item.value)}
                         className={cn(
                           "h-12 rounded-xl flex items-center justify-center transition-all bg-neutral-800/80 border",
                           selectedIcon === item.value ? "border-indigo-400 bg-indigo-500/20 text-indigo-300 shadow-md" : "border-neutral-700/60 text-neutral-400 hover:text-white"
                         )}
                       >
                          <IconComp size={20} />
                       </button>
                     );
                   })}
                </div>
             </div>

             <button
               type="submit"
               disabled={isLoading}
               className="w-full py-3.5 bg-[#a5b4fc] hover:bg-[#93b4fd] text-neutral-900 font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-wider text-xs flex items-center justify-center gap-2"
             >
                {isLoading ? 'Saving...' : 'Save Customization'}
             </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
