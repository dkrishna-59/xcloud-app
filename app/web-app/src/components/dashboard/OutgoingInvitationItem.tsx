"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  File,
  Trash2,
  Copy,
  Key,
  Clock,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { Invitation, revokeInvitation } from '@/lib/invitation-manager';
import { formatFileSize, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/context/toast-context';

interface OutgoingInvitationItemProps {
  invitation: Invitation;
}

export const OutgoingInvitationItem = ({ invitation }: OutgoingInvitationItemProps) => {
  const { showToast, hideToast } = useToast();
  const [isRevoking, setIsRevoking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleRevoke = async () => {
    setIsRevoking(true);
    const toastId = showToast("Revoking access transmission...", "loading");
    try {
      await revokeInvitation(invitation);
      hideToast(toastId);
      showToast("Access successfully revoked", "success");
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || "Failed to revoke access", "error");
    } finally {
      setIsRevoking(false);
      setShowMenu(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/share/${invitation.fileId}`;
    navigator.clipboard.writeText(link);
    showToast("Share link copied to clipboard", "success");
    setShowMenu(false);
  };

  const handleCopyPasscode = () => {
    if (invitation.passcode) {
      navigator.clipboard.writeText(invitation.passcode);
      showToast("Security passcode copied", "success");
    }
    setShowMenu(false);
  };

  const isExpired = invitation.expiresAt && (invitation.expiresAt.seconds * 1000) < Date.now();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-outline/10 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all relative overflow-visible group"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 min-w-0">
          <div className="w-16 h-16 bg-primary-container text-primary rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <File size={32} />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black text-on-surface truncate tracking-tight">{invitation.fileName}</h3>
              <span className={cn(
                "text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest",
                invitation.status === 'ACCEPTED' ? "bg-emerald-500/10 text-emerald-600" :
                invitation.status === 'REJECTED' ? "bg-error-container text-error" : "bg-amber-500/10 text-amber-600"
              )}>
                {invitation.status === 'ACCEPTED' ? 'Active Access' :
                 invitation.status === 'REJECTED' ? 'Declined' : 'Pending Response'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant font-medium">
              <span>To: <strong className="text-on-surface">{invitation.recipientEmail || invitation.recipientPhone}</strong></span>
              <span>•</span>
              <span>Size: {formatFileSize(invitation.fileSize)}</span>
              {invitation.passcode && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold text-primary">
                    <Key size={12} /> Key: {invitation.passcode}
                  </span>
                </>
              )}
              {invitation.expiresAt && (
                <>
                  <span>•</span>
                  <span className={cn("flex items-center gap-1 font-bold", isExpired ? "text-error" : "text-amber-600")}>
                    <Clock size={12} /> {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(invitation.expiresAt.seconds * 1000, { addSuffix: true })}`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end relative" ref={menuRef}>
          <button
            onClick={handleCopyLink}
            className="px-4 py-3 bg-surface-variant/40 hover:bg-surface-variant text-on-surface rounded-2xl text-xs font-black flex items-center gap-2 transition-all active:scale-95"
          >
            <Copy size={16} /> Copy Link
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-3 bg-surface-variant/40 hover:bg-surface-variant text-on-surface rounded-2xl transition-all active:scale-95"
              aria-label="Manage Options"
            >
              <MoreVertical size={18} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-full mt-2 z-50 bg-[#18181b] border border-neutral-800 rounded-lg shadow-xl py-1 min-w-[180px]"
                >
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 text-sm text-left w-full flex items-center gap-2 text-neutral-200 hover:bg-neutral-800/80 transition-colors"
                  >
                    <Copy size={14} className="text-primary" /> Copy Share Link
                  </button>
                  {invitation.passcode && (
                    <button
                      onClick={handleCopyPasscode}
                      className="px-3 py-2 text-sm text-left w-full flex items-center gap-2 text-neutral-200 hover:bg-neutral-800/80 transition-colors"
                    >
                      <Key size={14} className="text-primary" /> Copy Security Key
                    </button>
                  )}
                  <div className="h-px bg-neutral-800 my-1" />
                  <button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="px-3 py-2 text-sm text-left w-full flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Cancel & Revoke Access
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            className="px-6 py-3 bg-error/10 hover:bg-error text-error hover:text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isRevoking ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /> Revoke</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
