"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, File, Folder, Star, Globe, X, ArrowRight, CornerDownLeft, Sparkles, Filter } from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { formatFileSize, cn } from '@/lib/utils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: FileEntry) => void;
}

export const GlobalSearchModal = ({ isOpen, onClose, onSelectFile }: GlobalSearchModalProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchAllFiles = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'users', user.uid, 'user_files'),
          where('isDeleted', '==', false)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => d.data() as FileEntry);
        setAllFiles(docs);
      } catch (err) {
        console.error("Global search index error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllFiles();
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setSearchQuery('');
    setSelectedIndex(0);
  }, [isOpen, user]);

  // Keyboard shortcut Ctrl+K / Cmd+K or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter logic with modifiers: type:video, type:pdf, type:code, starred:true, shared:true
  const filteredFiles = useMemo(() => {
    let list = [...allFiles];
    const q = searchQuery.trim().toLowerCase();

    if (!q) return list.slice(0, 15); // Show top 15 recent when empty

    let typeFilter = '';
    let starredFilter = false;
    let sharedFilter = false;
    let textQuery = q;

    // Parse modifiers
    if (q.includes('type:')) {
      const match = q.match(/type:([a-z]+)/);
      if (match) {
        typeFilter = match[1];
        textQuery = textQuery.replace(`type:${typeFilter}`, '').trim();
      }
    }
    if (q.includes('starred:true')) {
      starredFilter = true;
      textQuery = textQuery.replace('starred:true', '').trim();
    }
    if (q.includes('shared:true')) {
      sharedFilter = true;
      textQuery = textQuery.replace('shared:true', '').trim();
    }

    return list.filter(file => {
      const nameMatch = file.fileName.toLowerCase().includes(textQuery);
      const typeMatch = typeFilter ? file.fileType.toLowerCase().includes(typeFilter) || file.fileName.toLowerCase().endsWith(typeFilter) : true;
      const starredMatch = starredFilter ? file.isStarred : true;
      const sharedMatch = sharedFilter ? file.isShared || file.isPubliclyShared : true;

      return nameMatch && typeMatch && starredMatch && sharedMatch;
    }).slice(0, 20);
  }, [allFiles, searchQuery]);

  // Keyboard navigation inside modal
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen || filteredFiles.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredFiles.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          onSelectFile(filteredFiles[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, filteredFiles, selectedIndex, onSelectFile, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-start justify-center pt-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          className="relative w-full max-w-2xl bg-[#161922] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col text-white"
        >
          {/* Search Input Bar */}
          <div className="relative flex items-center px-6 py-4 border-b border-white/10 bg-[#111318]">
            <Search size={22} className="text-primary mr-4 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search files, folders, tags (e.g. type:video, starred:true)..."
              className="w-full bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none"
            />
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded-md text-white/60">ESC</span>
            </div>
          </div>

          {/* Quick Modifier Chips */}
          <div className="px-6 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center gap-2 overflow-x-auto text-[11px] text-white/60">
            <span className="flex items-center gap-1 font-bold text-white/40"><Filter size={12} /> Filters:</span>
            <button onClick={() => setSearchQuery('type:video ')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full font-medium transition-all">type:video</button>
            <button onClick={() => setSearchQuery('type:pdf ')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full font-medium transition-all">type:pdf</button>
            <button onClick={() => setSearchQuery('type:code ')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full font-medium transition-all">type:code</button>
            <button onClick={() => setSearchQuery('starred:true ')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full font-medium transition-all">starred:true</button>
            <button onClick={() => setSearchQuery('shared:true ')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full font-medium transition-all">shared:true</button>
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-3 space-y-1">
            {isLoading ? (
              <div className="py-16 text-center text-white/40 text-sm font-medium">Indexing secure workspace...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-16 text-center text-white/40">
                <Search size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-white/75">No matching files found</p>
                <p className="text-xs mt-1">Try adjusting your search query or modifier filters.</p>
              </div>
            ) : (
              filteredFiles.map((file, idx) => (
                <div
                  key={file.fileId}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "px-4 py-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all",
                    selectedIndex === idx ? "bg-primary/20 text-white border border-primary/30 shadow-md" : "hover:bg-white/5 text-white/80"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 text-primary">
                      {file.fileType === 'Folder' ? <Folder size={20} /> : <File size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{file.fileName}</p>
                      <div className="flex items-center gap-3 text-[10px] text-white/40 font-medium">
                        <span className="uppercase tracking-wider font-bold text-primary/80">{file.fileType}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.fileSize)}</span>
                        {file.isStarred && <span className="text-amber-400 font-bold">★ Starred</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedIndex === idx && (
                      <span className="text-[10px] font-mono bg-primary text-on-primary px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                        Open <CornerDownLeft size={10} />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer instruction */}
          <div className="px-6 py-3 bg-[#111318] border-t border-white/5 flex items-center justify-between text-[11px] text-white/40 font-mono">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>•</span>
              <span>↵ Select</span>
              <span>•</span>
              <span>Esc Close</span>
            </div>
            <div className="text-primary font-bold">XCloud Instant Search</div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
