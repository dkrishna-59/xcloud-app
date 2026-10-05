"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { HardDrive, PieChart, Image, Video, FileText, Music, MoreHorizontal, ChevronRight } from 'lucide-react';
import { formatFileSize, cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { StorageAnalyticsModal } from './StorageAnalyticsModal';

export const StorageWidget = () => {
  const { userMetadata } = useAuth();
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  if (!userMetadata) return null;

  const used = userMetadata.storageUsed || 0;
  const available = userMetadata.storageAvailable || 5368709120;
  const percentage = Math.min(100, Math.round((used / available) * 100));

  const usedMB = (used / (1024 * 1024)).toFixed(1);
  const totalGB = (available / (1024 * 1024 * 1024)).toFixed(0);

  // Simulated breakdown since we don't have it in FS yet
  const breakdown = [
    { label: 'Images', color: 'bg-blue-500', icon: Image, size: used * 0.45 },
    { label: 'Videos', color: 'bg-purple-500', icon: Video, size: used * 0.30 },
    { label: 'Docs', color: 'bg-emerald-500', icon: FileText, size: used * 0.15 },
    { label: 'Others', color: 'bg-amber-500', icon: MoreHorizontal, size: used * 0.10 },
  ];

  return (
    <>
      <div
        onClick={() => setIsAnalyticsOpen(true)}
        className="bg-surface-variant/20 border border-outline/10 rounded-[2.5rem] p-8 space-y-8 transition-all hover:border-primary/30 cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700" />

        <div className="flex items-center justify-between relative z-10">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-container text-on-primary-container rounded-2xl shadow-sm">
                 <HardDrive size={24} />
              </div>
              <div>
                 <h3 className="text-title-medium text-on-surface flex items-center gap-1">
                   Storage <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                 </h3>
                 <p className="text-body-small text-on-surface-variant font-medium">Safe & Encrypted</p>
              </div>
           </div>
           <span className="text-[10px] font-black text-primary bg-primary-container px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
              {userMetadata.subscriptionPlan}
           </span>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex justify-between items-end px-1">
            <div>
               <p className="text-3xl font-black text-on-surface tracking-tight">{usedMB} MB</p>
               <p className="text-body-small text-on-surface-variant font-bold uppercase tracking-tighter mt-1 opacity-60">Utilized of {totalGB} GB</p>
            </div>
            <div className="text-right">
               <span className="text-xl font-black text-primary">{percentage}%</span>
            </div>
          </div>
          <div className="relative h-4 w-full bg-surface-variant rounded-full overflow-hidden p-0.5 shadow-inner">
             <motion.div
               initial={{ width: 0 }}
               animate={{ width: `${percentage}%` }}
               className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(var(--md-sys-color-primary-rgb),0.4)]"
               transition={{ duration: 1.5, ease: "circOut" }}
             />
          </div>
        </div>

        <div className="space-y-3 relative z-10">
           <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-1 opacity-60">Breakdown Protocol</p>
           <div className="grid grid-cols-1 gap-2">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-surface/50 backdrop-blur-sm rounded-2xl border border-outline/5 hover:bg-surface transition-colors group/item">
                   <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl text-white shadow-sm transition-transform group-hover/item:scale-110", item.color)}>
                         <item.icon size={14} />
                      </div>
                      <span className="text-xs font-bold text-on-surface-variant">{item.label}</span>
                   </div>
                   <span className="text-xs font-black text-on-surface">{formatFileSize(item.size)}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <StorageAnalyticsModal isOpen={isAnalyticsOpen} onClose={() => setIsAnalyticsOpen(false)} />
    </>
  );
};
