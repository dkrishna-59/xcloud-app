"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Star,
  Users,
  Files,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cloud,
  HardDrive,
  ShieldCheck
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const navItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Favorites', href: '/favorites', icon: Star },
  { name: 'Shared', href: '/shared', icon: Users },
  { name: 'Files', href: '/files', icon: Files },
  { name: 'Vault', href: '/dashboard/vault', icon: ShieldCheck },
  { name: 'Trash', href: '/trash', icon: Trash2 },
  { name: 'Storage', href: '/storage', icon: HardDrive },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, userMetadata } = useAuth();
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'invitations'),
      where('recipientEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInviteCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const used = userMetadata?.storageUsed || 0;
  const available = userMetadata?.storageAvailable || 5368709120;
  const percentage = Math.min(100, Math.round((used / available) * 100));

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#FEF7FF] dark:bg-[#141218] transition-all duration-300 ease-in-out h-screen sticky top-0 z-20 border-r border-[#CAC4D0]/30 dark:border-[#49454F]/30",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex h-20 items-center justify-between px-6">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl text-[#6750A4] dark:text-[#D0BCFF]">
            <Cloud size={32} fill="currentColor" fillOpacity={0.2} />
            <span className="tracking-tight">XCloud</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/dashboard">
            <Cloud size={32} className="text-[#6750A4] dark:text-[#D0BCFF] mx-auto" />
          </Link>
        )}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-[#EADDFF]/40 dark:hover:bg-[#4F378B]/40 rounded-full text-[#49454F] dark:text-[#CAC4D0] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mx-auto mb-4 p-2 hover:bg-[#EADDFF]/40 dark:hover:bg-[#4F378B]/40 rounded-full text-[#49454F] dark:text-[#CAC4D0] transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center gap-4 px-4 py-3 rounded-full transition-all duration-200 group",
                isActive
                  ? "bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF] font-bold"
                  : "text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#EADDFF]/30 dark:hover:bg-[#4F378B]/30",
                isCollapsed && "justify-center px-0 h-14 w-14 mx-auto"
              )}
            >
              {isActive && !isCollapsed && (
                 <motion.div
                   layoutId="active-pill"
                   className="absolute inset-0 bg-[#EADDFF] dark:bg-[#4F378B] rounded-full -z-10 shadow-[0_1px_3px_1px_rgba(0,0,0,0.15)]"
                   transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                 />
              )}
              <item.icon
                size={24}
                className={cn(
                  "transition-colors",
                  isActive ? "text-[#21005D] dark:text-[#EADDFF]" : "text-[#49454F] dark:text-[#CAC4D0]"
                )}
                fill={isActive ? "currentColor" : "none"}
                fillOpacity={0.2}
              />
              {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}

              {item.name === 'Shared' && inviteCount > 0 && (
                <div className={cn(
                  "absolute flex items-center justify-center bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] font-black rounded-full",
                  isCollapsed ? "top-1 right-1 w-5 h-5 text-[8px]" : "right-4 w-6 h-6 text-[10px] shadow-md"
                )}>
                  {inviteCount}
                </div>
              )}

              {isCollapsed && isActive && (
                 <motion.div
                   layoutId="active-pill-mini"
                   className="absolute inset-0 bg-[#EADDFF] dark:bg-[#4F378B] rounded-full -z-10"
                 />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
