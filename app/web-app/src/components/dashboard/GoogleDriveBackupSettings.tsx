"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Loader2, HardDrive } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { openGooglePicker, uploadToGoogleDrive, getGoogleAccessToken, disconnectGoogleDrive } from '@/lib/google-drive-service';
import { collection, query, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileEntry } from '@/lib/upload-manager';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/utils';

export const GoogleDriveBackupSettings = () => {
  const { user } = useAuth();
  const { showToast, hideToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'manual' | 'daily' | 'weekly'>('daily');
  const [encryptBackup, setEncryptBackup] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    if (!user) return;
    const isGoogleUser = user.providerData?.some(p => p.providerId === 'google.com');
    if (isGoogleUser) {
      setIsConnected(true);
    } else {
      getGoogleAccessToken().then(() => {
        setIsConnected(true);
      }).catch(() => {
        setIsConnected(false);
      });
    }
  }, [user]);

  // Load settings from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'google_drive_backup');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.enabled !== undefined) setEnabled(data.enabled);
          if (data.frequency) setFrequency(data.frequency);
          if (data.encryptBackup !== undefined) setEncryptBackup(data.encryptBackup);
        }
      } catch (err) {
        console.error("Failed to load backup settings:", err);
      }
    };
    fetchSettings();
  }, [user]);

  const saveSettingsToFirestore = async (newValues: { enabled?: boolean; frequency?: string; encryptBackup?: boolean }) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'google_drive_backup');
      await setDoc(docRef, {
        enabled: newValues.enabled !== undefined ? newValues.enabled : enabled,
        frequency: newValues.frequency !== undefined ? newValues.frequency : frequency,
        encryptBackup: newValues.encryptBackup !== undefined ? newValues.encryptBackup : encryptBackup,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to sync backup settings to Firestore:", err);
    }
  };

  const handleToggleEnabled = (val: boolean) => {
    setEnabled(val);
    saveSettingsToFirestore({ enabled: val });
    showToast(val ? "Automated backups enabled" : "Automated backups disabled", "info");
  };

  const handleChangeFrequency = (val: 'manual' | 'daily' | 'weekly') => {
    setFrequency(val);
    saveSettingsToFirestore({ frequency: val });
    showToast(`Backup frequency updated to ${val}`, "success");
  };

  const handleToggleEncryption = (val: boolean) => {
    setEncryptBackup(val);
    saveSettingsToFirestore({ encryptBackup: val });
    showToast(val ? "Backup encryption enabled" : "Backup encryption disabled", "info");
  };

  const handleConnect = async () => {
    const toastId = showToast("Connecting to Google Drive...", "loading");
    try {
      await getGoogleAccessToken();
      setIsConnected(true);
      hideToast(toastId);
      showToast("Google Drive successfully connected!", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Connection failed. Please check your credentials.", "error");
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleDrive();
    setIsConnected(false);
    setEnabled(false);
    saveSettingsToFirestore({ enabled: false });
    showToast("Google Drive disconnected", "info");
  };

  const handleRunManualBackup = async () => {
    if (!user) return;
    setIsBackingUp(true);
    const toastId = showToast("Preparing secure vault backup archive...", "loading");

    try {
      const q = query(collection(db, 'users', user.uid, 'user_files'));
      const snap = await getDocs(q);
      const files = snap.docs.map(d => d.data() as FileEntry);

      const zip = new JSZip();
      for (const file of files) {
        if (file.downloadUrl && !file.isDeleted) {
          try {
            const res = await fetch(file.downloadUrl);
            const blob = await res.blob();
            zip.file(file.fileName, blob);
          } catch (e) {
            console.error("Failed to fetch file for backup:", file.fileName);
          }
        }
      }

      const archiveBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      const backupFileName = `XCloud_Vault_Backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.zip`;

      showToast("Uploading backup archive to Google Drive...", "loading");
      const driveFileId = await uploadToGoogleDrive(archiveBlob, backupFileName);

      const logEntry = {
        id: `backup_${Date.now()}`,
        timestamp: serverTimestamp(),
        fileName: backupFileName,
        fileSize: archiveBlob.size,
        status: 'Success',
        driveFileId
      };

      await setDoc(doc(db, 'users', user.uid, 'backup_logs', logEntry.id), logEntry);

      hideToast(toastId);
      showToast("Automated Google Drive backup completed successfully!", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Backup failed", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="bg-[#FEF7FF] dark:bg-[#141218] border border-[#EADDFF]/50 dark:border-[#4A4458]/50 shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] rounded-[1.5rem] p-8 space-y-8 text-[#1D1B20] dark:text-[#E6E0E9]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#CAC4D0]/30 dark:border-[#49454F]/30 pb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF] rounded-[1rem] flex items-center justify-center shadow-inner shrink-0">
            <HardDrive size={28} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-[#1D1B20] dark:text-[#E6E0E9] truncate">Google Drive Connected Backup</h3>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] font-medium mt-0.5 truncate">Configure automated cloud-to-cloud vault backups and synchronization.</p>
          </div>
        </div>

        {isConnected ? (
          <button onClick={handleDisconnect} className="px-5 py-2.5 bg-[#B3261E]/10 hover:bg-[#B3261E]/20 text-[#B3261E] dark:bg-[#F2B8B5]/10 dark:text-[#F2B8B5] rounded-full text-xs font-bold transition-all shrink-0">
            Disconnect Drive
          </button>
        ) : (
          <button onClick={handleConnect} className="px-6 py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] rounded-full text-xs font-bold shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] transition-all shrink-0">
            Connect Google Drive
          </button>
        )}
      </div>

      {isConnected && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#F3EDF7] dark:bg-[#2B2930] p-5 rounded-[1rem] border border-[#EADDFF]/40 dark:border-[#4A4458]/40">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1D1B20] dark:text-[#E6E0E9]">Enable Automated Backups</p>
              <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] font-medium mt-0.5">Automatically backup your XCloud vault to Google Drive.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" checked={enabled} onChange={(e) => handleToggleEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-[#CAC4D0] dark:bg-[#49454F] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6750A4]"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#F3EDF7] dark:bg-[#2B2930] p-5 rounded-[1rem] border border-[#EADDFF]/40 dark:border-[#4A4458]/40 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6750A4] dark:text-[#D0BCFF]">Backup Frequency</label>
              <select
                value={frequency}
                onChange={(e: any) => handleChangeFrequency(e.target.value)}
                className="w-full bg-[#FEF7FF] dark:bg-[#141218] border border-[#CAC4D0]/30 dark:border-[#49454F]/30 rounded-xl px-4 py-3 text-sm font-bold text-[#1D1B20] dark:text-[#E6E0E9] outline-none focus:ring-2 focus:ring-[#6750A4]"
              >
                <option value="manual">Manual Only</option>
                <option value="daily">Daily Backup</option>
                <option value="weekly">Weekly Backup</option>
              </select>
            </div>

            <div className="bg-[#F3EDF7] dark:bg-[#2B2930] p-5 rounded-[1rem] border border-[#EADDFF]/40 dark:border-[#4A4458]/40 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6750A4] dark:text-[#D0BCFF]">Encryption & Security</label>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-[#1D1B20] dark:text-[#E6E0E9]">Encrypt Backup Archive</span>
                <input
                  type="checkbox"
                  checked={encryptBackup}
                  onChange={(e) => handleToggleEncryption(e.target.checked)}
                  className="w-4 h-4 rounded text-[#6750A4] focus:ring-[#6750A4] bg-surface border-[#CAC4D0]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-[#F3EDF7] dark:bg-[#2B2930] px-4 py-3 rounded-[1rem] border border-[#EADDFF]/40 dark:border-[#4A4458]/40 min-w-0">
              <ShieldCheck size={16} className="shrink-0" />
              <span className="text-[#1D1B20] dark:text-[#E6E0E9]">Target Root Folder:</span>
              <code className="bg-[#FEF7FF] dark:bg-[#141218] px-2.5 py-1 rounded-lg text-[#1D1B20] dark:text-[#E6E0E9] font-mono border border-[#CAC4D0]/30 truncate">XCloud Vault Backups/</code>
            </div>

            <button
              onClick={handleRunManualBackup}
              disabled={isBackingUp}
              className="px-8 py-3.5 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] hover:opacity-90 rounded-full text-xs font-bold shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Run Backup Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
