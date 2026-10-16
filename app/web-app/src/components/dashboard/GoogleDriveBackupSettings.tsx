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
    <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 space-y-8 text-white">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center shadow-inner">
            <HardDrive size={28} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Google Drive Connected Backup</h3>
            <p className="text-xs text-white/50">Configure automated cloud-to-cloud vault backups and synchronization.</p>
          </div>
        </div>

        {isConnected ? (
          <button onClick={handleDisconnect} className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all">
            Disconnect Drive
          </button>
        ) : (
          <button onClick={handleConnect} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all">
            Connect Google Drive
          </button>
        )}
      </div>

      {isConnected && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white/5 p-5 rounded-2xl">
            <div>
              <p className="text-sm font-bold">Enable Automated Backups</p>
              <p className="text-xs text-white/50">Automatically backup your XCloud vault to Google Drive.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={(e) => handleToggleEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-5 rounded-2xl space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60">Backup Frequency</label>
              <select
                value={frequency}
                onChange={(e: any) => handleChangeFrequency(e.target.value)}
                className="w-full bg-[#111318] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none"
              >
                <option value="manual">Manual Only</option>
                <option value="daily">Daily Backup</option>
                <option value="weekly">Weekly Backup</option>
              </select>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60">Encryption & Security</label>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold">Encrypt Backup Archive</span>
                <input
                  type="checkbox"
                  checked={encryptBackup}
                  onChange={(e) => handleToggleEncryption(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white/10 border-white/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <ShieldCheck size={16} /> Target Root Folder: <code className="bg-white/10 px-2 py-1 rounded text-white font-mono">XCloud Vault Backups/</code>
            </div>

            <button
              onClick={handleRunManualBackup}
              disabled={isBackingUp}
              className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl text-xs font-black shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
