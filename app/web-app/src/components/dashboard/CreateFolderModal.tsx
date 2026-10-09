"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Loader2, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (folderName: string) => Promise<void> | void;
}

export const CreateFolderModal = ({ isOpen, onClose, onCreate }: CreateFolderModalProps) => {
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsLoading(true);
    try {
      await onCreate(folderName.trim());
      setFolderName('');
      onClose();
    } catch (error: any) {
      console.error("Failed to create folder:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-3xl p-8 shadow-2xl text-white">

          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                   <FolderPlus size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-bold">New Folder</h3>
                   <p className="text-xs text-neutral-400">Organize your files securely</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-xl transition-colors"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Folder Name</label>
                <div className="relative">
                   <Folder className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                   <input
                     autoFocus
                     type="text"
                     value={folderName}
                     onChange={(e) => setFolderName(e.target.value)}
                     placeholder="e.g., Project Workspace"
                     className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-medium"
                   />
                </div>
             </div>

             <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 font-bold rounded-xl transition-all text-xs uppercase tracking-wider"
                >
                   Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !folderName.trim()}
                  className="flex-1 py-3.5 bg-[#a5b4fc] hover:bg-[#93b4fd] text-neutral-900 font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Create Folder'}
                </button>
             </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
