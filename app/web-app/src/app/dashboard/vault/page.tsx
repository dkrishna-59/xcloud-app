"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useVault } from '@/context/vault-context';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ShieldCheck, Lock, Unlock, Upload, File, Trash2, Download, Eye, Loader2, KeyRound } from 'lucide-react';
import { encryptFile, decryptFile } from '@/lib/vaultCrypto';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { VaultAuthModal } from '@/components/dashboard/VaultAuthModal';
import { formatFileSize, cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { registerPasskey, isPasskeySupported } from '@/lib/webauthnService';

interface VaultFileItem {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  iv: string;
  uploadTimestamp: any;
  downloadUrl?: string;
}

export default function VaultPage() {
  const { user } = useAuth();
  const { isUnlocked, masterKey, hasVaultSetup, lockVault, isVaultAuthModalOpen, setIsVaultAuthModalOpen } = useVault();
  const { showToast, hideToast } = useToast();
  const [vaultFiles, setVaultFiles] = useState<VaultFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [decryptingFileId, setDecryptingFileId] = useState<string | null>(null);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  const handleRegisterPasskey = async () => {
    if (!user) return;
    if (!isPasskeySupported()) {
      showToast("Passkeys are not supported in this browser.", "error");
      return;
    }

    setIsRegisteringPasskey(true);
    const toastId = showToast("Registering biometric passkey...", "loading");
    try {
      await registerPasskey(user.uid, user.email || 'user@xcloud.app', user.displayName || 'XCloud User');
      hideToast(toastId);
      showToast("Passkey successfully registered!", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Passkey registration failed", "error");
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  useEffect(() => {
    if (!user || !isUnlocked) {
      setVaultFiles([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'vault_files'), where('isDeleted', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => d.data() as VaultFileItem);
      setVaultFiles(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Vault files sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUnlocked]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !masterKey) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const toastId = showToast(`Encrypting & uploading ${file.name} (AES-256)...`, "loading");

      try {
        // 1. Client-side encryption
        const { encryptedBlob, iv } = await encryptFile(file, masterKey);

        // 2. Upload to storage
        const fileId = `vault_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const storagePath = `users/${user.uid}/vault/${fileId}.xenc`;
        const ref = storageRef(storage, storagePath);
        await uploadBytes(ref, encryptedBlob);
        const downloadUrl = await getDownloadURL(ref);

        // 3. Save metadata to Firestore
        const metadata: VaultFileItem = {
          fileId,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: encryptedBlob.size,
          storagePath,
          iv,
          uploadTimestamp: serverTimestamp(),
          downloadUrl
        };

        await setDoc(doc(db, 'users', user.uid, 'vault_files', fileId), metadata);

        hideToast(toastId);
        showToast(`Successfully encrypted & stored ${file.name}`, "success");
      } catch (err: any) {
        hideToast(toastId);
        showToast(`Encryption failed for ${file.name}: ${err.message}`, "error");
      }
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleDecryptAndOpen = async (file: VaultFileItem) => {
    if (!masterKey || !user) return;
    setDecryptingFileId(file.fileId);
    const toastId = showToast(`Decrypting ${file.fileName}...`, "loading");

    try {
      const res = await fetch(file.downloadUrl || '');
      const encryptedBlob = await res.blob();
      const decryptedFile = await decryptFile(encryptedBlob, file.iv, masterKey, file.fileType);

      const url = URL.createObjectURL(decryptedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      hideToast(toastId);
      showToast("File decrypted & downloaded successfully", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Decryption failed (Invalid master passcode)", "error");
    } finally {
      setDecryptingFileId(null);
    }
  };

  const handleDelete = async (file: VaultFileItem) => {
    if (!user) return;
    const toastId = showToast("Removing from vault...", "loading");
    try {
      await deleteObject(storageRef(storage, file.storagePath));
      await deleteDoc(doc(db, 'users', user.uid, 'vault_files', file.fileId));
      hideToast(toastId);
      showToast("Encrypted file deleted", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Delete failed", "error");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-primary/20 text-primary rounded-[2.5rem] flex items-center justify-center shadow-inner border border-primary/20 animate-pulse">
          <Lock size={48} />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-3xl font-black tracking-tight">Zero-Knowledge Encrypted Vault</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Your vault is locked. All files are client-side encrypted using AES-256-GCM. Passcodes never leave your browser.
          </p>
        </div>
        <button
          onClick={() => setIsVaultAuthModalOpen(true)}
          className="px-8 py-4 bg-primary text-on-primary font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-3"
        >
          <KeyRound size={18} /> {hasVaultSetup ? 'Unlock Vault' : 'Initialize Vault'}
        </button>
        <VaultAuthModal
          isOpen={isVaultAuthModalOpen || !isUnlocked}
          onClose={() => setIsVaultAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-surface border border-primary/30 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-primary text-on-primary rounded-3xl flex items-center justify-center shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight">Zero-Knowledge Vault</h1>
              <span className="bg-emerald-500/20 text-emerald-400 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/30">
                🔒 AES-256 E2EE Active
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              Client-side encrypted directory. Files are encrypted before upload and decrypted locally in RAM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-initial px-6 py-3.5 bg-primary hover:bg-primary/90 text-on-primary font-black rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
            <Upload size={16} />
            <span>{isUploading ? 'Encrypting...' : 'Encrypt & Upload'}</span>
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={lockVault}
            className="px-6 py-3.5 bg-surface-variant/50 hover:bg-surface-variant text-on-surface font-bold rounded-2xl transition-all text-xs uppercase tracking-widest"
          >
            Lock Vault Now
          </button>
        </div>
      </div>

      {/* Passkey Security Card */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm text-white">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
            <KeyRound size={28} />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">FIDO2 / WebAuthn Passkey Security</h3>
            <p className="text-xs text-white/50">Register biometric or hardware security key passkeys for passwordless vault access.</p>
          </div>
        </div>

        <button
          onClick={handleRegisterPasskey}
          disabled={isRegisteringPasskey}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          {isRegisteringPasskey ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          Register Passkey
        </button>
      </div>

      {/* Files List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.3em] px-1">Secured Vault Inventory</h3>

        {isLoading ? (
          <div className="py-20 text-center opacity-40"><Loader2 className="animate-spin mx-auto mb-2" size={32} /> Loading vault inventory...</div>
        ) : vaultFiles.length === 0 ? (
          <div className="p-20 text-center bg-surface-variant/10 border-2 border-dashed border-outline/10 rounded-[3rem] space-y-3">
            <Lock size={40} className="mx-auto opacity-30 text-primary" />
            <p className="font-bold text-sm text-on-surface">Vault is Empty</p>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">Upload files to encrypt them with zero-knowledge AES-256 protection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {vaultFiles.map(file => (
              <motion.div
                key={file.fileId}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-outline/10 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-primary-container text-primary rounded-2xl flex items-center justify-center shadow-inner">
                    <File size={24} />
                  </div>
                  <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-wider">
                    E2EE SECURE
                  </span>
                </div>

                <div className="space-y-1 my-4">
                  <h4 className="font-black text-sm text-on-surface truncate tracking-tight">{file.fileName}</h4>
                  <p className="text-xs text-on-surface-variant font-medium">{formatFileSize(file.fileSize)}</p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-outline/5">
                  <button
                    onClick={() => handleDecryptAndOpen(file)}
                    disabled={decryptingFileId === file.fileId}
                    className="flex-1 py-3 bg-primary text-on-primary rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wider"
                  >
                    {decryptingFileId === file.fileId ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                    Decrypt & Open
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-3 bg-surface-variant/50 hover:bg-error-container/20 text-on-surface-variant hover:text-error rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
