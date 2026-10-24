"use client";

import React, { useState, useRef } from 'react';
import { Save, Camera, X, Lock, User, Phone, Calendar, Mail, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: {
    userId: string;
    displayName: string;
    email: string;
    phone?: string;
    birthDate?: string;
    avatarUrl?: string;
  };
  onSave?: (data: {
    displayName: string;
    phone: string;
    birthDate: string;
    avatarFile?: File;
  }) => Promise<void> | void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  userData,
  onSave,
}: ProfileSettingsModalProps) {
  const [displayName, setDisplayName] = useState(userData?.displayName || 'Alex Morgan');
  const [phone, setPhone] = useState(userData?.phone || '+1 (555) 234-5678');
  const [birthDate, setBirthDate] = useState(userData?.birthDate || '1995-06-15');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userData?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(false);

    try {
      if (onSave) {
        await onSave({
          displayName,
          phone,
          birthDate,
          avatarFile: avatarFile || undefined,
        });
      }
      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
        onClose();
      }, 1200);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const userIdDisplay = userData?.userId || 'usr_998273641029384';
  const emailDisplay = userData?.email || 'alex.morgan@xcloud.io';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-screen">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 backdrop-blur-md bg-black/70 transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg my-auto overflow-hidden rounded-[1.5rem] bg-[#FEF7FF] dark:bg-[#141218] border border-[#EADDFF]/50 dark:border-[#4A4458]/50 shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] text-[#1D1B20] dark:text-[#E6E0E9] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#CAC4D0]/30 dark:border-[#49454F]/30">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1D1B20] dark:text-[#E6E0E9]">Profile Settings</h2>
              <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] mt-0.5">Manage your personal details and account info</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#EADDFF]/30 dark:hover:bg-[#4A4458]/30 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 pt-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Avatar Section */}
            <div className="flex flex-col items-center justify-center space-y-3 pt-2">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-[1rem] overflow-hidden ring-2 ring-[#6750A4]/40 group-hover:ring-[#6750A4] transition-all duration-300 bg-[#EADDFF] dark:bg-[#4F378B] flex items-center justify-center shadow-md">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#EADDFF] dark:bg-[#4F378B] flex items-center justify-center text-2xl font-bold text-[#21005D] dark:text-[#EADDFF]">
                      {displayName.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Hover Overlay */}
                <div className="absolute inset-0 rounded-[1rem] bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white">
                  <Camera className="w-6 h-6 mb-1 text-[#D0BCFF]" />
                  <span className="text-[10px] font-medium tracking-wide">Change</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-xs text-[#49454F] dark:text-[#CAC4D0]">Click avatar to upload photo (max 5MB)</span>
            </div>

            <div className="space-y-4">
              {/* USER ID (Read-only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-[#6750A4] dark:text-[#D0BCFF] uppercase">
                  User ID
                </label>
                <div className="flex items-center justify-between bg-[#F4EFF4] dark:bg-[#1D1B20] border border-[#CAC4D0]/30 dark:border-[#49454F]/30 rounded-xl px-4 py-2.5 text-[#49454F] dark:text-[#CAC4D0] text-sm select-all">
                  <span className="font-mono">{userIdDisplay}</span>
                  <Lock className="w-4 h-4 text-neutral-500" />
                </div>
              </div>

              {/* DISPLAY NAME */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-[#6750A4] dark:text-[#D0BCFF] uppercase">
                  Display Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#49454F] dark:text-[#CAC4D0]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Enter your display name"
                    className="w-full bg-[#F3EDF7] dark:bg-[#2B2930] border border-[#CAC4D0]/30 dark:border-[#4A4458]/30 rounded-xl pl-10 pr-4 py-2.5 text-[#1D1B20] dark:text-[#E6E0E9] placeholder-[#49454F] dark:placeholder-[#CAC4D0] focus:ring-2 focus:ring-[#6750A4] focus:outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Two-Column Row: PHONE & BIRTH DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PHONE */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold tracking-wider text-[#6750A4] dark:text-[#D0BCFF] uppercase">
                    Phone
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#49454F] dark:text-[#CAC4D0]">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-[#F3EDF7] dark:bg-[#2B2930] border border-[#CAC4D0]/30 dark:border-[#4A4458]/30 rounded-xl pl-10 pr-4 py-2.5 text-[#1D1B20] dark:text-[#E6E0E9] placeholder-[#49454F] dark:placeholder-[#CAC4D0] focus:ring-2 focus:ring-[#6750A4] focus:outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                {/* BIRTH DATE */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold tracking-wider text-[#6750A4] dark:text-[#D0BCFF] uppercase">
                    Birth Date
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#49454F] dark:text-[#CAC4D0]">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-[#F3EDF7] dark:bg-[#2B2930] border border-[#CAC4D0]/30 dark:border-[#4A4458]/30 rounded-xl pl-10 pr-4 py-2.5 text-[#1D1B20] dark:text-[#E6E0E9] placeholder-[#49454F] dark:placeholder-[#CAC4D0] focus:ring-2 focus:ring-[#6750A4] focus:outline-none transition-all text-sm font-medium [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* EMAIL (IMMUTABLE) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold tracking-wider text-[#6750A4] dark:text-[#D0BCFF] uppercase">
                    Email Address
                  </label>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF]">
                    Immutable
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#49454F] dark:text-[#CAC4D0]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={emailDisplay}
                    disabled
                    className="w-full bg-[#F4EFF4] dark:bg-[#1D1B20] border border-[#CAC4D0]/30 dark:border-[#4A4458]/30 rounded-xl pl-10 pr-4 py-2.5 text-[#49454F] dark:text-[#CAC4D0] text-sm cursor-not-allowed select-none font-medium"
                  />
                </div>
                <p className="text-[11px] text-[#49454F] dark:text-[#CAC4D0]">Your email address is linked to your authentication provider and cannot be altered.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-full font-bold text-white dark:text-[#381E72] bg-[#6750A4] dark:bg-[#D0BCFF] hover:opacity-90 active:scale-[0.99] transition-all shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-[0.1em]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white dark:text-[#381E72]" />
                    <span>Saving Changes...</span>
                  </>
                ) : successMessage ? (
                  <>
                    <Check className="w-5 h-5 text-white dark:text-[#381E72]" />
                    <span>Profile Updated!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 text-white dark:text-[#381E72]" />
                    <span>Update Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
