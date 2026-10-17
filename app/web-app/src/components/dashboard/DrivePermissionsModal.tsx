"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Shield, UserPlus, Trash2, Globe, Lock, Loader2, Check } from 'lucide-react';
import { FileEntry } from '@/lib/upload-manager';
import { getGoogleAccessToken } from '@/lib/google-drive-service';
import { useToast } from '@/context/toast-context';

interface DrivePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileEntry | null;
}

export const DrivePermissionsModal = ({ isOpen, onClose, file }: DrivePermissionsModalProps) => {
  const { showToast, hideToast } = useToast();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'reader' | 'writer' | 'commenter'>('reader');
  const [linkAccess, setLinkAccess] = useState<'restricted' | 'anyone'>('restricted');
  const [isUpdating, setIsUpdating] = useState(false);

  const driveFileId = (file as any)?.driveFileId;

  useEffect(() => {
    if (!isOpen || !driveFileId) return;

    const fetchPermissions = async () => {
      setIsLoading(true);
      try {
        const token = await getGoogleAccessToken();
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions?supportsAllDrives=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch Google Drive permissions");
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setPermissions(data.permissions || []);
      } catch (err: any) {
        showToast(err.message || "Failed to load permissions", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [isOpen, driveFileId, showToast]);

  if (!isOpen || !file) return null;

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveFileId || !newEmail.trim()) return;

    setIsUpdating(true);
    const toastId = showToast("Adding collaborator...", "loading");

    try {
      const token = await getGoogleAccessToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: newRole,
          type: 'user',
          emailAddress: newEmail.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to add permission");
      const text = await res.text();
      const newPerm = text ? JSON.parse(text) : {};
      setPermissions(prev => [...prev, newPerm]);
      setNewEmail('');
      hideToast(toastId);
      showToast("Collaborator added successfully", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Failed to add collaborator", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePermission = async (permId: string) => {
    const toastId = showToast("Removing collaborator...", "loading");
    try {
      const token = await getGoogleAccessToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions/${permId}?supportsAllDrives=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to remove permission");
      setPermissions(prev => prev.filter(p => p.id !== permId));
      hideToast(toastId);
      showToast("Collaborator removed", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Failed to remove permission", "error");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-gradient-to-b from-[#161922] to-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Google Drive Access & Sharing</h3>
                <p className="text-xs text-white/50 truncate max-w-xs">{file.fileName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>

          {/* Add Collaborator Form */}
          <form onSubmit={handleAddPermission} className="space-y-4 bg-white/5 p-5 rounded-2xl">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">Invite Collaborator</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="colleague@company.com..."
                className="flex-1 bg-[#111318] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-primary"
              />
              <select
                value={newRole}
                onChange={(e: any) => setNewRole(e.target.value)}
                className="bg-[#111318] border border-white/10 rounded-xl px-3 py-3 text-xs font-bold text-white outline-none"
              >
                <option value="reader">Viewer</option>
                <option value="commenter">Commenter</option>
                <option value="writer">Editor</option>
              </select>
              <button type="submit" disabled={isUpdating || !newEmail.trim()} className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black text-white flex items-center gap-1.5 disabled:opacity-50">
                <UserPlus size={16} /> Add
              </button>
            </div>
          </form>

          {/* Collaborators List */}
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">Current Collaborators</label>
            {isLoading ? (
              <div className="py-10 text-center text-white/40"><Loader2 className="animate-spin mx-auto mb-2" size={24} /> Loading permissions...</div>
            ) : permissions.length === 0 ? (
              <div className="py-10 text-center text-white/40 text-xs italic">No explicit permissions found.</div>
            ) : (
              permissions.map(perm => (
                <div key={perm.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                  <div>
                    <p className="text-sm font-bold">{perm.displayName || perm.emailAddress || 'External User'}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{perm.role} • {perm.type}</p>
                  </div>
                  {perm.role !== 'owner' && (
                    <button onClick={() => handleDeletePermission(perm.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
