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
          className="relative w-full max-w-lg my-auto overflow-hidden rounded-3xl bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 shadow-2xl shadow-black/90 text-white z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Profile Settings</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Manage your personal details and account info</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
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
                <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-indigo-400/40 group-hover:ring-indigo-400 transition-all duration-300 bg-neutral-800 flex items-center justify-center shadow-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-900 to-purple-900 flex items-center justify-center text-2xl font-bold text-indigo-200">
                      {displayName.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Hover Overlay */}
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white">
                  <Camera className="w-6 h-6 mb-1 text-indigo-300" />
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
              <span className="text-xs text-neutral-400">Click avatar to upload photo (max 5MB)</span>
            </div>

            <div className="space-y-4">
              {/* USER ID (Read-only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  User ID
                </label>
                <div className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-2.5 text-neutral-400 text-sm select-all">
                  <span className="font-mono">{userIdDisplay}</span>
                  <Lock className="w-4 h-4 text-neutral-500" />
                </div>
              </div>

              {/* DISPLAY NAME */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Display Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Enter your display name"
                    className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Two-Column Row: PHONE & BIRTH DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PHONE */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Phone
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* BIRTH DATE */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Birth Date
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all text-sm [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* EMAIL (IMMUTABLE) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Email Address
                  </label>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                    Immutable
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={emailDisplay}
                    disabled
                    className="w-full bg-neutral-900/50 border border-neutral-800/80 rounded-xl pl-10 pr-4 py-2.5 text-neutral-400 text-sm cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] text-neutral-500">Your email address is linked to your authentication provider and cannot be altered.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-neutral-900 bg-[#a5b4fc] hover:bg-[#93b4fd] active:scale-[0.99] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-900" />
                    <span>Saving Changes...</span>
                  </>
                ) : successMessage ? (
                  <>
                    <Check className="w-5 h-5 text-neutral-900" />
                    <span>Profile Updated!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 text-neutral-900" />
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
