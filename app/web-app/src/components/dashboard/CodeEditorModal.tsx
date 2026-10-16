"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FileCode, Loader2, WrapText, Check, AlertCircle } from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { saveFileContent } from '@/lib/file-manager';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { cn } from '@/lib/utils';

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileEntry | null;
}

export const CodeEditorModal = ({ isOpen, onClose, file }: CodeEditorModalProps) => {
  const { user } = useAuth();
  const { showToast, hideToast } = useToast();
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = content !== initialContent;

  useEffect(() => {
    if (!isOpen || !file) return;

    const fetchContent = async () => {
      setIsLoading(true);
      try {
        if (!file.downloadUrl) {
          setContent('');
          setInitialContent('');
          setIsLoading(false);
          return;
        }
        const res = await fetch(file.downloadUrl);
        const text = await res.text();
        setContent(text);
        setInitialContent(text);
      } catch (err: any) {
        showToast("Failed to load file content", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [isOpen, file, showToast]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          handleSave();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDirty, isSaving, content]);

  if (!isOpen || !file) return null;

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const toastId = showToast("Saving changes and archiving version snapshot...", "loading");
    try {
      await saveFileContent(user.uid, file, content);
      setInitialContent(content);
      hideToast(toastId);
      showToast("File saved & version archived successfully", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Failed to save file", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleAttemptClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-5xl h-[90vh] bg-[#0d1117] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="h-16 px-6 bg-[#161b22] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center shrink-0">
                <FileCode size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black truncate tracking-tight">{file.fileName}</h3>
                  {isDirty && (
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" title="Unsaved changes" />
                  )}
                </div>
                <p className="text-[10px] text-white/50 font-mono">XCloud Code & Text Editor</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setWordWrap(!wordWrap)}
                className={cn(
                  "p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                  wordWrap ? "bg-primary/20 text-primary" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                )}
                title="Toggle Word Wrap"
              >
                <WrapText size={16} />
              </button>

              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes <span className="text-[10px] opacity-70 font-mono ml-1">(Ctrl+S)</span>
              </button>

              <button
                onClick={handleAttemptClose}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all ml-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 relative overflow-hidden bg-[#0d1117] flex">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
                <Loader2 size={36} className="animate-spin mb-3 text-primary" />
                <p className="text-sm font-medium">Loading editor content...</p>
              </div>
            ) : (
              <div className="flex-1 flex relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  placeholder="Start typing or editing your code/markdown..."
                  className={cn(
                    "w-full h-full p-6 bg-transparent text-white font-mono text-sm resize-none outline-none leading-relaxed custom-scrollbar",
                    wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
                  )}
                />
              </div>
            )}
          </div>

          {/* Footer Status Bar */}
          <div className="h-10 px-6 bg-[#161b22] border-t border-white/10 flex items-center justify-between text-[11px] text-white/40 font-mono shrink-0">
            <div className="flex items-center gap-4">
              <span>Encoding: UTF-8</span>
              <span>•</span>
              <span>Lines: {content.split('\n').length}</span>
              <span>•</span>
              <span>Chars: {content.length}</span>
            </div>
            <div>
              {isDirty ? <span className="text-amber-400 font-bold">Unsaved Modifications</span> : <span className="text-emerald-400 flex items-center gap-1"><Check size={12} /> All changes saved</span>}
            </div>
          </div>

          {/* Unsaved changes confirmation modal */}
          {showCloseConfirm && (
            <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center p-4">
              <div className="bg-[#161b22] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
                <div className="w-14 h-14 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-bold">Unsaved Changes</h3>
                <p className="text-xs text-white/60">You have unsaved edits. Are you sure you want to exit without saving?</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold"
                  >
                    Continue Editing
                  </button>
                  <button
                    onClick={() => {
                      setShowCloseConfirm(false);
                      onClose();
                    }}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-2xl text-xs font-black text-white"
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
