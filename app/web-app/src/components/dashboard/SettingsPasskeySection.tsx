"use client";

import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { KeyRound, ShieldCheck, Trash2, Loader2, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Base64Url encode helper
const bufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const formatTimestamp = (ts: any): string => {
  if (!ts) return 'Recently';
  try {
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleDateString();
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleDateString();
    }
    if (typeof ts === 'number') {
      return new Date(ts).toLocaleDateString();
    }
  } catch (e) {
    console.error(e);
  }
  return 'Recently';
};

export const SettingsPasskeySection = () => {
  const { user } = useAuth();
  const { showToast, hideToast } = useToast();
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PublicKeyCredential) {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'passkeys'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPasskeys(list);
    });
    return () => unsub();
  }, [user]);

  const handleRegisterPasskey = async () => {
    if (!user) return;
    if (!isSupported) {
      showToast("Passkeys are not supported in this browser.", "error");
      return;
    }

    setIsRegistering(true);
    const toastId = showToast("Registering new passkey...", "loading");

    try {
      // 1. Create Challenge & User ID Buffers
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userIdBuffer = new Uint8Array(16);
      window.crypto.getRandomValues(userIdBuffer);

      // 2. Call navigator.credentials.create
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge.buffer,
          rp: {
            name: "XCloud Secure Vault",
            id: window.location.hostname
          },
          user: {
            id: userIdBuffer.buffer,
            name: user.email || "user@xcloud.app",
            displayName: user.displayName || "XCloud User"
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },   // ES256
            { type: "public-key", alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "preferred"
          },
          timeout: 60000,
          attestation: "none"
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Registration was cancelled or failed.");
      }

      // 3. Extract Credential ID and Attestation Data
      const credentialId = credential.id;
      const rawIdBase64 = bufferToBase64Url(credential.rawId);

      // 4. Save to Firestore under users/{userId}/passkeys/{credentialId}
      const passkeyRef = doc(db, 'users', user.uid, 'passkeys', credentialId);

      let authenticatorType = "Platform Authenticator (TouchID/Hello)";
      if (credential.authenticatorAttachment === 'cross-platform') {
          authenticatorType = "Security Key / Roaming Authenticator";
      }

      await setDoc(passkeyRef, {
        credentialId: credentialId,
        rawId: rawIdBase64,
        deviceInfo: authenticatorType,
        deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp()
      });

      hideToast(toastId);
      showToast("Passkey registered securely.", "success");
    } catch (err: any) {
      console.error(err);
      hideToast(toastId);
      showToast(err.message || "Passkey registration failed", "error");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRevokePasskey = async (passkeyId: string) => {
    if (!user) return;
    if (confirm("Revoke this passkey? You will no longer be able to use it for authentication.")) {
      const toastId = showToast("Revoking passkey...", "loading");
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'passkeys', passkeyId));
        hideToast(toastId);
        showToast("Passkey revoked successfully", "success");
      } catch (err: any) {
        hideToast(toastId);
        showToast(err.message, "error");
      }
    }
  };

  return (
    <div className="bg-[#FEF7FF] dark:bg-[#141218] border border-[#EADDFF]/50 dark:border-[#4A4458]/50 shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] rounded-[1.5rem] p-8 space-y-6 text-[#1D1B20] dark:text-[#E6E0E9]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#CAC4D0]/30 dark:border-[#49454F]/30 pb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1rem] flex items-center justify-center bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF]">
            <KeyRound size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-[#1D1B20] dark:text-[#E6E0E9]">Passkeys & Biometrics</h3>
            <p className="text-sm text-[#49454F] dark:text-[#CAC4D0] mt-1 font-medium">Passwordless sign-in via WebAuthn</p>
          </div>
        </div>

        <button
          onClick={handleRegisterPasskey}
          disabled={isRegistering || !isSupported}
          className="px-8 py-3.5 rounded-full font-bold text-sm bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] hover:shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isRegistering ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
          Register New Passkey
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-[#6750A4] dark:text-[#D0BCFF] uppercase tracking-[0.1em]">Registered Authenticators</h4>

        <AnimatePresence>
          {passkeys.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-10 text-center bg-[#F4EFF4] dark:bg-[#1D1B20] border-2 border-dashed border-[#CAC4D0] dark:border-[#49454F] rounded-[1rem] text-[#49454F] dark:text-[#CAC4D0] text-sm font-medium"
            >
              No passkeys registered. Register a biometric or hardware security key above.
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {passkeys.map(pk => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={pk.id}
                  className="p-5 bg-[#F3EDF7] dark:bg-[#2B2930] border border-[#EADDFF]/50 dark:border-[#4A4458]/50 rounded-[1rem] flex items-center justify-between gap-4 group hover:shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF]">
                      {pk.deviceType === 'mobile' ? <Smartphone size={24} /> : <Monitor size={24} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1D1B20] dark:text-[#E6E0E9] truncate">{pk.deviceInfo || 'Platform Authenticator'}</p>
                      <p className="text-xs font-medium text-[#49454F] dark:text-[#CAC4D0] mt-1">
                        ID: <span className="font-mono">{pk.credentialId.substring(0, 16)}...</span> • Added: {formatTimestamp(pk.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokePasskey(pk.id)}
                    className="px-4 py-2.5 bg-[#B3261E]/10 hover:bg-[#B3261E]/20 text-[#B3261E] dark:bg-[#F2B8B5]/10 dark:text-[#F2B8B5] dark:hover:bg-[#F2B8B5]/20 rounded-full text-xs font-bold transition-all active:scale-95 shrink-0"
                  >
                    <span className="flex items-center gap-2"><Trash2 size={14}/> Revoke</span>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
