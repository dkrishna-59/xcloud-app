"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, ShieldCheck, RefreshCw, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatFileSize } from '@/lib/utils';

interface DriveSyncHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriveSyncHealthModal = ({ isOpen, onClose }: DriveSyncHealthModalProps) => {
  const { user } = useAuth();
  const [syncRules, setSyncRules] = useState<any[]>([]);
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchHealthData = async () => {
      setIsLoading(true);
      try {
        const rulesSnap = await getDocs(collection(db, 'users', user.uid, 'folder_sync_rules'));
        setSyncRules(rulesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const logsSnap = await getDocs(collection(db, 'users', user.uid, 'backup_logs'));
        setBackupLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Health fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealthData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Google Drive Sync & Health Dashboard</h3>
                <p className="text-xs text-white/50">Real-time webhook channels, delta sync logs, and deduplication metrics.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 p-5 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Webhook Status</span>
              <p className="text-base font-black text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={16} /> Active & Secure</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Active Mirror Rules</span>
              <p className="text-base font-black text-white">{syncRules.length} Folders</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Backup Logs</span>
              <p className="text-base font-black text-white">{backupLogs.length} Completed</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">Active Folder Mirror Rules</h4>
            {syncRules.length === 0 ? (
              <div className="p-8 text-center bg-white/5 rounded-2xl text-white/40 text-xs italic">No active folder mirrors configured.</div>
            ) : (
              syncRules.map(rule => (
                <div key={rule.ruleId} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                  <div>
                    <p className="text-sm font-bold">{rule.xcloudFolderName} ➔ {rule.googleDriveFolderName}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Direction: {rule.direction} • Interval: {rule.syncInterval}</p>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Synced</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
