"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Share2,
  RotateCw,
  Info,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Copy,
  Check
} from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { formatFileSize, cn } from '@/lib/utils';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';

interface MediaPreviewerProps {
  file: FileEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaPreviewer = ({ file, isOpen, onClose }: MediaPreviewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      setTextContent(null);
      setIsCopied(false);

      if (file.fileType === 'Text' || file.fileType === 'Code') {
        fetch(file.downloadUrl)
          .then(res => {
            if (!res.ok) throw new Error("Network response was not ok");
            return res.text();
          })
          .then(text => {
            setTextContent(text);
            setIsLoading(false);
          })
          .catch(err => {
            console.error("Failed to fetch text content:", err);
            setTextContent("Error: Could not load text content. The file might be too large or restricted by CORS.");
            setIsLoading(false);
          });
      }
    }
  }, [isOpen, file]);

  if (!file) return null;

  const browserSupportedImages = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'ico'];
  const ext = file.fileName.split('.').pop()?.toLowerCase() || '';

  const isImage = file.fileType === 'Image';
  const isBrowserImage = isImage && browserSupportedImages.includes(ext);
  const isVideo = file.fileType === 'Video';
  const isPDF = file.fileType === 'PDF';
  const isAudio = file.fileType === 'Audio';
  const isText = file.fileType === 'Text' || file.fileType === 'Code';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyTextContent = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-surface/95 backdrop-blur-3xl transition-all"
        >
          {/* M3 Navigation Bar */}
          <header className="h-20 flex items-center justify-between px-8 border-b border-outline/5 relative z-20">
            <div className="flex items-center gap-6">
               <button
                 onClick={onClose}
                 className="p-3 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all active:scale-90"
               >
                 <X size={24} />
               </button>
               <div className="min-w-0 max-w-md">
                 <div className="flex items-center gap-3">
                    <h2 className="text-on-surface font-black text-lg truncate leading-tight">{file.fileName}</h2>
                    {isVideo && (
                      <span className="text-[10px] font-black text-primary bg-primary-container/40 px-2 py-0.5 rounded border border-primary/20 uppercase tracking-widest shrink-0">4K ABR Node</span>
                    )}
                 </div>
                 <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-primary bg-primary-container px-2 py-0.5 rounded-md uppercase tracking-wider">{file.fileType}</span>
                    <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{formatFileSize(file.fileSize)}</p>
                 </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
              {isBrowserImage && (
                <>
                  <div className="flex items-center bg-surface-variant/30 rounded-2xl p-1.5 border border-outline/5">
                    <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-xl transition-all"><ZoomOut size={20} /></button>
                    <span className="text-[10px] font-black text-on-surface w-14 text-center uppercase tracking-tighter">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(prev => Math.min(5, prev + 0.25))} className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-xl transition-all"><ZoomIn size={20} /></button>
                  </div>
                  <button
                    onClick={() => setRotation(prev => prev + 90)}
                    className="p-3 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all"
                  >
                    <RotateCw size={20} />
                  </button>
                </>
              )}

              {isText && textContent && (
                <button
                  onClick={copyTextContent}
                  className="flex items-center gap-2 px-5 py-3 bg-surface-variant text-on-surface-variant font-bold rounded-2xl hover:bg-surface-variant/80 transition-all text-xs"
                >
                  {isCopied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
                  <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
                </button>
              )}

              <div className="h-8 w-px bg-outline/10 mx-2" />

              <button
                onClick={handleDownload}
                className="flex items-center gap-3 px-8 py-3.5 bg-primary text-on-primary font-black rounded-full hover:shadow-lg shadow-primary/20 transition-all active:scale-95 text-xs uppercase tracking-[0.15em]"
              >
                <Download size={20} />
                <span>Acquire</span>
              </button>
            </div>
          </header>

          {/* Media Viewport */}
          <main className="flex-1 relative flex items-center justify-center overflow-hidden px-12 py-4">
             <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[160px]" />
             </div>

             {isLoading && (
               <div className="absolute inset-0 flex items-center justify-center z-10 bg-surface/20">
                 <Loader2 className="animate-spin text-primary" size={48} />
               </div>
             )}

             <motion.div
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               transition={{ type: 'spring', damping: 30, stiffness: 200 }}
               className="relative w-full h-full max-h-[calc(100vh-theme(spacing.20)-theme(spacing.28)-2rem)] flex items-center justify-center z-10"
             >
                {isVideo ? (
                  <VideoPlayer file={file} onClose={onClose} />
                ) : isBrowserImage ? (
                  <motion.img
                    src={file.downloadUrl}
                    alt={file.fileName}
                    onLoad={() => setIsLoading(false)}
                    style={{
                        scale: zoom,
                        rotate: rotation
                    }}
                    className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] border border-outline/10 transition-transform duration-200"
                  />
                ) : isImage ? (
                  <div className="bg-surface-variant/20 backdrop-blur-xl p-24 rounded-[4rem] border border-outline/10 text-center space-y-6 shadow-2xl max-w-lg">
                    <div className="w-32 h-32 bg-primary-container text-primary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-primary/10">
                       <ImageIcon size={64} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-on-surface text-2xl font-black tracking-tight">Pro Image Format</h3>
                       <p className="text-on-surface-variant font-medium text-sm leading-relaxed">
                         This specialized {ext.toUpperCase()} node requires local professional tools for rendering.
                         Protocol: Secure Download & Process.
                       </p>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="px-10 py-4 bg-primary text-on-primary font-black rounded-3xl transition-all hover:shadow-xl shadow-primary/20 active:scale-95 uppercase tracking-widest text-xs"
                    >
                       Acquire Full Asset
                    </button>
                  </div>
                ) : null}

                {isAudio && (
                  <AudioPlayer file={file} onClose={onClose} />
                )}

                {isPDF && (
                  <iframe
                    src={file.downloadUrl}
                    onLoad={() => setIsLoading(false)}
                    className="w-[85vw] h-[75vh] rounded-[2rem] bg-white shadow-2xl border-8 border-surface-variant/30"
                  />
                )}

                {isText && (
                  <div className="w-[80vw] max-w-4xl h-[70vh] bg-surface rounded-[2rem] border border-outline/10 shadow-2xl overflow-hidden flex flex-col">
                     <div className="p-4 bg-surface-variant/30 border-b border-outline/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-outline">Raw Content View ({textContent ? textContent.split('\n').length : 0} lines)</span>
                     </div>
                     <pre className="flex-1 p-8 overflow-auto text-sm text-on-surface font-mono leading-relaxed custom-scrollbar">
                        {textContent || 'Loading content...'}
                     </pre>
                  </div>
                )}

                {!isImage && !isVideo && !isPDF && !isAudio && !isText && (
                  <div className="bg-surface-variant/20 backdrop-blur-xl p-24 rounded-[4rem] border border-outline/10 text-center space-y-6 shadow-2xl max-w-lg">
                     <div className="w-32 h-32 bg-primary-container text-primary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-primary/10">
                        <Maximize2 size={64} />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-on-surface text-2xl font-black tracking-tight">No Native Preview</h3>
                        <p className="text-on-surface-variant font-medium text-sm leading-relaxed">
                          The current file fragment requires a specialized local environment.
                          Protocol: Secure Download & Decrypt.
                        </p>
                     </div>
                     <button
                       onClick={handleDownload}
                       className="px-10 py-4 bg-primary text-on-primary font-black rounded-3xl transition-all hover:shadow-xl shadow-primary/20 active:scale-95 uppercase tracking-widest text-xs"
                     >
                        Download Fragment
                     </button>
                  </div>
                )}
             </motion.div>
          </main>

          {/* M3 Floating Footer */}
          <footer className="h-28 flex items-center justify-center p-8 z-10">
             <div className="flex items-center gap-8 bg-surface-variant/30 backdrop-blur-2xl border border-outline/10 px-10 py-5 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center gap-3 text-primary">
                   <ShieldCheck size={20} />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em]">AES-256 Verified Stream</span>
                </div>
                <div className="h-4 w-px bg-outline/20" />
                <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest">Global Node: {file.fileId.split('_').pop()}</p>
             </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
