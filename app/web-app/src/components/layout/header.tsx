"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, HelpCircle, LogOut, Settings, Trash2, User, Moon, Sun, CheckCircle2, Clock, Globe, Monitor, Check } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useSearch } from '@/context/search-context';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Activity, markAllAsRead } from '@/lib/activity-manager';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const Header = () => {
  const { user, userMetadata, logout, theme, resolvedTheme, setTheme, toggleTheme } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const router = useRouter();

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'activities')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];

      items.sort((a: any, b: any) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : Date.now());
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : Date.now());
        return tB - tA;
      });

      setActivities(items.slice(0, 10));
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = activities.filter(a => !a.isRead).length;

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0 && user) {
      await markAllAsRead(user.uid, activities);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setShowProfileMenu(false);
  };

  return (
    <header className="h-20 bg-surface/90 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-[100] border-b border-outline/5 shadow-sm transition-all duration-300">
      <div className="flex-1 max-w-3xl min-w-0">
        <div className="relative group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search your secure cloud..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-variant/40 text-on-surface border-none rounded-full py-3.5 pl-14 pr-6 focus:ring-2 focus:ring-primary/20 focus:bg-surface-variant transition-all outline-none text-sm font-medium truncate"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-8 shrink-0">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={handleNotificationClick}
            className="p-3 text-on-surface-variant hover:bg-on-surface-variant/10 rounded-full relative transition-all active:scale-90 min-w-[40px] min-h-[40px]"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-error text-on-error rounded-full border-2 border-surface text-[10px] flex items-center justify-center font-black">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)}></div>
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 w-80 bg-surface shadow-2xl border border-outline/10 rounded-[2rem] p-3 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-outline/5 flex justify-between items-center">
                    <h3 className="text-title-medium text-on-surface">Activity</h3>
                    <span className="text-[10px] font-black text-primary bg-primary-container px-2 py-0.5 rounded-full uppercase">Live</span>
                  </div>
                  <div className="max-h-[32rem] overflow-y-auto custom-scrollbar space-y-1 py-2">
                    {activities.length === 0 ? (
                      <div className="p-8 text-center opacity-40">
                         <Bell size={32} className="mx-auto mb-2" />
                         <p className="text-sm font-medium">No activity yet</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="p-4 hover:bg-surface-variant/40 rounded-2xl transition-colors flex gap-4">
                           <div className={cn(
                             "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                             activity.type === 'UPLOAD' && "bg-primary-container/30 text-primary",
                             activity.type === 'DELETE' && "bg-error-container/30 text-error",
                             activity.type === 'SHARE' && "bg-secondary-container/30 text-secondary",
                             activity.type === 'RESTORE' && "bg-tertiary-container/30 text-tertiary"
                           )}>
                              {activity.type === 'UPLOAD' && <CheckCircle2 size={20} />}
                              {activity.type === 'DELETE' && <Trash2 size={20} />}
                              {activity.type === 'SHARE' && <User size={20} />}
                              {activity.type === 'RESTORE' && <Clock size={20} />}
                           </div>
                           <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-on-surface truncate leading-none mb-1">
                                 {activity.fileName || activity.type}
                              </p>
                              <p className="text-xs text-on-surface-variant line-clamp-1 font-medium">{activity.details}</p>
                              <p className="text-[10px] text-outline mt-1.5 font-bold uppercase tracking-wider">
                                 {activity.timestamp?.seconds ? format(activity.timestamp.seconds * 1000, 'MMM d, HH:mm') : 'Just now'}
                              </p>
                           </div>
                           {!activity.isRead && <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Selector Dropdown (Light, Dark, System) */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Appearance Settings"
            className="p-3 text-on-surface-variant hover:bg-on-surface-variant/10 rounded-full transition-all active:scale-90 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            {theme === 'system' ? (
              <Monitor size={22} />
            ) : resolvedTheme === 'dark' ? (
              <Sun size={22} className="text-amber-400" />
            ) : (
              <Moon size={22} className="text-primary" />
            )}
          </button>

          <AnimatePresence>
            {showThemeMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowThemeMenu(false)}></div>
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 w-48 bg-surface shadow-2xl border border-outline/15 rounded-3xl p-2 z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-outline/5 mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Appearance</p>
                  </div>
                  <div className="space-y-1">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Monitor },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setTheme(item.id as 'light' | 'dark' | 'system');
                          setShowThemeMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold rounded-2xl transition-all",
                          theme === item.id
                            ? "bg-primary text-on-primary shadow-md"
                            : "text-on-surface hover:bg-surface-variant/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={16} />
                          <span>{item.label}</span>
                        </div>
                        {theme === item.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="ml-2 ring-2 ring-transparent hover:ring-primary/20 transition-all rounded-full p-0.5"
          >
            {userMetadata?.profilePictureUrl ? (
              <Image
                src={userMetadata.profilePictureUrl}
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border-2 border-surface shadow-sm"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-black text-lg">
                {userMetadata?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowProfileMenu(false)}></div>
              <div className="absolute right-0 top-full mt-3 w-80 bg-surface shadow-2xl border border-outline/10 rounded-[2.5rem] p-3 z-50 animate-in fade-in zoom-in duration-200">
                <div className="p-5 bg-surface-variant/30 rounded-3xl mb-2 text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full border-4 border-surface shadow-md overflow-hidden bg-primary-container flex items-center justify-center">
                     {userMetadata?.profilePictureUrl ? (
                        <Image
                          src={userMetadata.profilePictureUrl}
                          alt="Profile Large"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                     ) : (
                        <span className="text-2xl font-black text-on-primary-container">{userMetadata?.name?.charAt(0)}</span>
                     )}
                  </div>
                  <p className="font-black text-on-surface text-lg leading-tight">{userMetadata?.name}</p>
                  <p className="text-xs text-on-surface-variant font-medium mt-1 truncate">{user?.email}</p>
                  <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-on-primary">
                    ID: {userMetadata?.displayId || 'Generating...'}
                  </div>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => navigateTo('/settings')}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-bold text-on-surface-variant hover:bg-surface-variant/50 rounded-2xl transition-all group"
                  >
                    <User size={20} className="text-outline group-hover:text-primary transition-colors" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={() => navigateTo('/trash')}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-bold text-error hover:bg-error-container/20 rounded-2xl transition-all"
                  >
                    <Trash2 size={20} className="text-error" />
                    Bin
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-outline/5">
                  <button
                    onClick={() => { setShowSignOutModal(true); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-bold text-on-surface-variant hover:bg-surface-variant/50 rounded-2xl transition-all"
                  >
                    <LogOut size={20} className="text-outline" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      <AnimatePresence>
        {showSignOutModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignOutModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface rounded-[2.5rem] p-8 shadow-2xl transition-colors border border-outline/10"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-error-container text-error rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <LogOut size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-on-surface tracking-tighter">Terminate Session?</h3>
                  <p className="text-on-surface-variant font-medium text-sm mt-2 leading-relaxed">
                    You are about to disconnect from your secure vault. All active transfers will be suspended.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { logout(); setShowSignOutModal(false); }}
                    className="w-full py-4 bg-error text-on-error font-black rounded-2xl hover:bg-error/90 shadow-lg shadow-error/20 transition-all active:scale-95 uppercase tracking-widest text-xs"
                  >
                    Terminate Access
                  </button>
                  <button
                    onClick={() => setShowSignOutModal(false)}
                    className="w-full py-4 bg-surface-variant text-on-surface-variant font-black rounded-2xl hover:bg-surface-variant/70 transition-all active:scale-95 uppercase tracking-widest text-xs"
                  >
                    Maintain Connection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
