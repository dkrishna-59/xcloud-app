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
  HardDrive
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const navItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Favourites', href: '/favourites', icon: Star },
  { name: 'Shared', href: '/shared', icon: Users },
  { name: 'Files', href: '/files', icon: Files },
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
        "flex flex-col bg-surface transition-all duration-300 ease-in-out h-screen sticky top-0 z-20 border-r border-outline/10",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex h-20 items-center justify-between px-6">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl text-primary">
            <Cloud size={32} fill="currentColor" fillOpacity={0.2} />
            <span className="tracking-tight">XCloud</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/dashboard">
            <Cloud size={32} className="text-primary mx-auto" />
          </Link>
        )}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-surface-variant/50 rounded-full text-on-surface-variant transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mx-auto mb-4 p-2 hover:bg-surface-variant/50 rounded-full text-on-surface-variant transition-colors"
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
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-on-surface-variant/10",
                isCollapsed && "justify-center px-0 h-14 w-14 mx-auto"
              )}
            >
              {isActive && !isCollapsed && (
                 <motion.div
                   layoutId="active-pill"
                   className="absolute inset-0 bg-primary-container rounded-full -z-10"
                   transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                 />
              )}
              <item.icon
                size={24}
                className={cn(
                  "transition-colors",
                  isActive ? "text-on-primary-container" : "text-on-surface-variant"
                )}
                fill={isActive ? "currentColor" : "none"}
                fillOpacity={0.2}
              />
              {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}

              {item.name === 'Shared' && inviteCount > 0 && (
                <div className={cn(
                  "absolute flex items-center justify-center bg-primary text-on-primary font-black rounded-full",
                  isCollapsed ? "top-1 right-1 w-5 h-5 text-[8px]" : "right-4 w-6 h-6 text-[10px] shadow-lg shadow-primary/20"
                )}>
                  {inviteCount}
                </div>
              )}

              {isCollapsed && isActive && (
                 <motion.div
                   layoutId="active-pill-mini"
                   className="absolute inset-0 bg-primary-container rounded-3xl -z-10"
                 />
              )}
            </Link>
          );
        })}
      </nav>


    </aside>
  );
};
