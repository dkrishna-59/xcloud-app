"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, ShieldCheck, Lock, KeyRound, Eye, EyeOff, Loader2, AlertTriangle, Check } from 'lucide-react';
import { useVault } from '@/context/vault-context';
import { useToast } from '@/context/toast-context';

interface VaultAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VaultAuthModal = ({ isOpen, onClose }: VaultAuthModalProps) => {
  const { hasVaultSetup, setupVault, unlockVault, setIsVaultAuthModalOpen } = useVault();
  const { showToast } = useToast();
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShake, setIsShake] = useState(false);

  if (!isOpen) return null;

  const handleCancel = () => {
    setIsVaultAuthModalOpen(false);
    onClose();
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    if (!hasVaultSetup && passphrase !== confirmPassphrase) {
      showToast("Passphrases do not match", "error");
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      return;
    }

    setIsLoading(true);
    try {
      let success = false;
      if (hasVaultSetup) {
        success = await unlockVault(passphrase);
        if (!success) {
          showToast("Incorrect Master Passcode", "error");
          setIsShake(true);
          setTimeout(() => setIsShake(false), 500);
        } else {
          showToast("Vault successfully unlocked", "success");
          setPassphrase('');
          setIsVaultAuthModalOpen(false);
          onClose();
        }
      } else {
        success = await setupVault(passphrase);
        if (success) {
          showToast("Zero-Knowledge Vault initialized with AES-256-GCM", "success");
          setPassphrase('');
          setConfirmPassphrase('');
          setIsVaultAuthModalOpen(false);
          onClose();
        } else {
          showToast("Failed to initialize vault", "error");
        }
      }
    } catch (err: any) {
      showToast(err.message || "Authentication error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCancel} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        <motion.div
          animate={isShake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-md bg-gradient-to-b from-[#181c27] to-[#11131a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-6"
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">{hasVaultSetup ? 'Unlock E2EE Vault' : 'Initialize Secure Vault'}</h3>
                <p className="text-xs text-white/50">Zero-Knowledge AES-256 Encryption</p>
              </div>
            </div>
            <button onClick={handleCancel} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>

          {!hasVaultSetup && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-300">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Warning:</strong> Your Master Passcode is never sent to XCloud servers. If you lose this passcode, your encrypted files cannot be recovered by anyone.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">Master Passcode</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter strong master passcode..."
                  className="w-full bg-[#111318] border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-bold text-white outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!hasVaultSetup && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">Confirm Passcode</label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Confirm master passcode..."
                    className="w-full bg-[#111318] border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleCancel} className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold">Cancel</button>
              <button type="submit" disabled={isLoading || !passphrase.trim()} className="flex-1 py-3.5 bg-primary hover:bg-primary/90 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {hasVaultSetup ? 'Unlock Vault' : 'Create Vault'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
