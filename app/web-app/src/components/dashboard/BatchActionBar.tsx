"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Folder as FolderIcon, Trash2, Download } from 'lucide-react';

interface BatchActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchStar: () => void;
  onBatchMove: () => void;
  onBatchDelete: () => void;
  onBatchDownload: () => void;
}

export const BatchActionBar = ({
  selectedCount,
  onClearSelection,
  onBatchStar,
  onBatchMove,
  onBatchDelete,
  onBatchDownload
}: BatchActionBarProps) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-secondary-container text-on-secondary-container px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 border border-outline/10"
        >
          <div className="flex items-center gap-4 pr-6 border-r border-on-secondary-container/10">
             <button onClick={onClearSelection} className="p-2 hover:bg-on-secondary-container/10 rounded-full transition-colors"><X size={20} /></button>
             <span className="text-sm font-black whitespace-nowrap">{selectedCount} Selected</span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={onBatchDownload} className="flex items-center gap-2 px-5 py-3 hover:bg-on-secondary-container/10 rounded-2xl transition-all text-sm font-bold active:scale-90">
                <Download size={20} /> Download
             </button>
             <button onClick={onBatchStar} className="flex items-center gap-2 px-5 py-3 hover:bg-on-secondary-container/10 rounded-2xl transition-all text-sm font-bold active:scale-90">
                <Star size={20} /> Star
             </button>
             <button onClick={onBatchMove} className="flex items-center gap-2 px-5 py-3 hover:bg-on-secondary-container/10 rounded-2xl transition-all text-sm font-bold active:scale-90">
                <FolderIcon size={20} /> Move
             </button>
             <button onClick={onBatchDelete} className="flex items-center gap-2 px-5 py-3 text-error hover:bg-error/10 rounded-2xl transition-all text-sm font-bold active:scale-90">
                <Trash2 size={20} /> Delete
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
