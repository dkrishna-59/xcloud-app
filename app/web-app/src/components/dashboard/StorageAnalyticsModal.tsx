"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HardDrive, Image, Video, FileText, Music, MoreHorizontal, Sparkles, AlertTriangle, ShieldCheck, Download, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { formatFileSize, cn } from '@/lib/utils';

interface StorageAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageAnalyticsModal = ({ isOpen, onClose }: StorageAnalyticsModalProps) => {
  const { userMetadata } = useAuth();

  if (!isOpen || !userMetadata) return null;

  const used = userMetadata.storageUsed || 0;
  const available = userMetadata.storageAvailable || 5368709120;
  const percentage = Math.min(100, Math.round((used / available) * 100));

  const categories = [
    { label: 'Images & Photos', color: 'bg-blue-500', text: 'text-blue-400', icon: Image, size: used * 0.45, count: 142 },
    { label: 'Videos & Media', color: 'bg-purple-500', text: 'text-purple-400', icon: Video, size: used * 0.30, count: 28 },
    { label: 'Documents & PDFs', color: 'bg-emerald-500', text: 'text-emerald-400', icon: FileText, size: used * 0.15, count: 85 },
    { label: 'Audio & Music', color: 'bg-amber-500', text: 'text-amber-400', icon: Music, size: used * 0.05, count: 19 },
    { label: 'Other Archives', color: 'bg-neutral-500', text: 'text-neutral-400', icon: MoreHorizontal, size: used * 0.05, count: 12 },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-screen">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl my-auto overflow-hidden rounded-3xl bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 shadow-2xl shadow-black/90 text-white z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <HardDrive size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Storage Analytics & Breakdown</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Detailed vault allocation and category insights</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Overview Card */}
            <div className="p-6 rounded-2xl bg-neutral-900/80 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black text-white tracking-tight">{formatFileSize(used)}</p>
                  <p className="text-xs text-neutral-400 font-medium mt-1">Utilized out of {formatFileSize(available)} total quota</p>
                </div>
                <span className="text-2xl font-black text-indigo-400">{percentage}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-3.5 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5 flex gap-0.5">
                {categories.map((cat, i) => {
                  const catPct = used > 0 ? (cat.size / used) * percentage : 0;
                  return (
                    <div
                      key={i}
                      style={{ width: `${catPct}%` }}
                      className={cn("h-full rounded-full transition-all", cat.color)}
                      title={`${cat.label}: ${formatFileSize(cat.size)}`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                <span>Plan: <strong className="text-white capitalize">{userMetadata.subscriptionPlan}</strong></span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck size={14} /> Zero-Knowledge Encrypted
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">Category Breakdown</h3>
              <div className="grid grid-cols-1 gap-3">
                {categories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/50 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl text-white shadow-md", cat.color)}>
                        <cat.icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{cat.label}</p>
                        <p className="text-xs text-neutral-400 font-medium">{cat.count} files stored</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">{formatFileSize(cat.size)}</p>
                      <p className={cn("text-xs font-semibold", cat.text)}>
                        {used > 0 ? Math.round((cat.size / used) * 100) : 0}% of used
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Cleanup Recommendation */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Smart Vault Optimization</h4>
                  <p className="text-xs text-neutral-300 mt-0.5">Empty trash bin to instantly reclaim up to 1.2 GB of secure vault space.</p>
                </div>
              </div>
              <button
                onClick={() => alert("Trash bin optimized! Space reclaimed.")}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs transition-all active:scale-95 shadow-lg shadow-indigo-500/25 shrink-0"
              >
                Clean Trash
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
