"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { deriveMasterKey, verifyPassphraseCanary, base64ToArrayBuffer } from '@/lib/vaultCrypto';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import { usePathname } from 'next/navigation';

interface VaultContextType {
  isUnlocked: boolean;
  masterKey: CryptoKey | null;
  hasVaultSetup: boolean;
  isVaultAuthModalOpen: boolean;
  setIsVaultAuthModalOpen: (open: boolean) => void;
  setupVault: (passphrase: string) => Promise<boolean>;
  unlockVault: (passphrase: string) => Promise<boolean>;
  lockVault: () => void;
  autoLockTimeout: number;
  setAutoLockTimeout: (minutes: number) => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [hasVaultSetup, setHasVaultSetup] = useState(false);
  const [isVaultAuthModalOpen, setIsVaultAuthModalOpen] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(15); // minutes

  const isUnlocked = masterKey !== null;
  const pathname = usePathname();

  const lockVault = useCallback(() => {
    setMasterKey(null);
    console.log("[VAULT] Vault auto-locked for security.");
  }, []);

  useEffect(() => {
    if (isUnlocked && pathname && !pathname.includes('/dashboard/vault')) {
      lockVault();
    }
  }, [pathname, isUnlocked, lockVault]);

  // Check if user has vault setup in Firestore
  useEffect(() => {
    if (!user) {
      setMasterKey(null);
      setHasVaultSetup(false);
      return;
    }

    const checkVaultSetup = async () => {
      try {
        const ref = doc(db, 'users', user.uid, 'vault_settings', 'config');
        const snap = await getDoc(ref);
        setHasVaultSetup(snap.exists());
      } catch (err) {
        console.error("Vault config check error:", err);
      }
    };

    checkVaultSetup();
  }, [user]);

  // Auto-lock security timer & visibility change listener
  useEffect(() => {
    if (!isUnlocked) return;

    let timeoutId: any = null;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (autoLockTimeout > 0) {
        timeoutId = setTimeout(() => {
          lockVault();
        }, autoLockTimeout * 60 * 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lockVault();
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUnlocked, autoLockTimeout, lockVault]);

  const setupVault = async (passphrase: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveMasterKey(passphrase, salt);
      const canaryResult = await verifyPassphraseCanary(key);

      const vaultConfig = {
        salt: Array.from(salt),
        canary: canaryResult.newCanary,
        iv: canaryResult.newIv,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid, 'vault_settings', 'config'), vaultConfig);
      setMasterKey(key);
      setHasVaultSetup(true);
      return true;
    } catch (err) {
      console.error("Vault setup error:", err);
      return false;
    }
  };

  const unlockVault = async (passphrase: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const ref = doc(db, 'users', user.uid, 'vault_settings', 'config');
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;

      const data = snap.data();
      const salt = new Uint8Array(data.salt);
      const key = await deriveMasterKey(passphrase, salt);

      const verify = await verifyPassphraseCanary(key, data.canary, data.iv);
      if (verify.isValid) {
        setMasterKey(key);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Vault unlock error:", err);
      return false;
    }
  };

  return (
    <VaultContext.Provider
      value={{
        isUnlocked,
        masterKey,
        hasVaultSetup,
        isVaultAuthModalOpen,
        setIsVaultAuthModalOpen,
        setupVault,
        unlockVault,
        lockVault,
        autoLockTimeout,
        setAutoLockTimeout
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault must be used within VaultProvider");
  return context;
};
