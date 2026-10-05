"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserMetadata {
  uid: string;
  displayId: string;
  email: string;
  name: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePictureUrl: string;
  storageAvailable: number;
  storageUsed: number;
  subscriptionPlan: string;
  provider: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      emailAlerts: boolean;
      pushToasts: boolean;
    };
    security: {
      passcodeEnabled: boolean;
      passcode?: string;
      loginAlerts: boolean;
    };
  };
}

interface AuthContextType {
  user: User | null;
  userMetadata: UserMetadata | null;
  loading: boolean;
  isAppLocked: boolean;
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  unlockApp: (passcode: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userMetadata: null,
  loading: true,
  isAppLocked: false,
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  unlockApp: () => false,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Track if session was already unlocked during this browser session
  const [sessionUnlocked, setSessionUnlocked] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    // If metadata changes and passcode is enabled, and we haven't unlocked yet, lock the app
    if (userMetadata?.preferences?.security?.passcodeEnabled && !sessionUnlocked) {
      setIsAppLocked(true);
    } else {
      setIsAppLocked(false);
    }
  }, [userMetadata, sessionUnlocked]);

  const unlockApp = (inputPasscode: string) => {
    if (inputPasscode === userMetadata?.preferences?.security?.passcode) {
      setSessionUnlocked(true);
      setIsAppLocked(false);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: 'light' | 'dark' | 'system') => {
      let active: 'light' | 'dark';
      if (t === 'system') {
        active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        active = t;
      }

      root.classList.toggle('dark', active === 'dark');
      setResolvedTheme(active);
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'preferences.theme': newTheme
      }).catch(err => console.warn("Failed to sync theme to cloud:", err));
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (!auth || !db) {
      setUser(null);
      setUserMetadata(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        // Check if metadata needs update/creation
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // New user setup with identity extraction from provider tokens
          const randomId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
          const newMetadata: UserMetadata = {
            uid: user.uid,
            displayId: randomId,
            email: user.email || '',
            name: user.displayName || 'XCloud User',
            phoneNumber: user.phoneNumber || '',
            dateOfBirth: '',
            profilePictureUrl: user.photoURL || '',
            storageAvailable: 5368709120, // 5GB
            storageUsed: 0,
            subscriptionPlan: 'Free',
            provider: user.providerData[0]?.providerId || 'password',
            preferences: {
              theme: 'system',
              notifications: {
                emailAlerts: true,
                pushToasts: true,
              },
              security: {
                passcodeEnabled: false,
                loginAlerts: true,
              }
            }
          };
          await setDoc(userDocRef, {
            ...newMetadata,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
        } else {
          // Sync social profile updates (if provider data changed and user hasn't set custom)
          const currentData = userDoc.data() as UserMetadata;
          const updates: any = { lastLogin: serverTimestamp() };

          if (!currentData.displayId) {
            updates.displayId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
          }
          if (!currentData.provider) {
            updates.provider = user.providerData[0]?.providerId || 'password';
          }
          if (user.displayName && currentData.name === 'XCloud User') {
            updates.name = user.displayName;
          }
          if (user.photoURL && !currentData.profilePictureUrl) {
            updates.profilePictureUrl = user.photoURL;
          }
          if (user.phoneNumber && !currentData.phoneNumber) {
            updates.phoneNumber = user.phoneNumber;
          }
          // If Firestore has phone but Auth object doesn't (common for social),
          // we keep what's in Firestore. The check above handles missing phone in FS.

          if (Object.keys(updates).length > 1 || updates.displayId) {
            await setDoc(userDocRef, updates, { merge: true });
          }
        }

        // Use onSnapshot for real-time metadata (storageUsed, etc.)
        const unsubscribeMetadata = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserMetadata;

            // Ensure preferences object exists for legacy users
            if (!data.preferences) {
              console.log("[AUTH] Initializing missing preferences for legacy user...");
              updateDoc(userDocRef, {
                preferences: {
                  theme: 'system',
                  notifications: { emailAlerts: true, pushToasts: true },
                  security: { passcodeEnabled: false, loginAlerts: true }
                }
              }).catch(err => console.error("[AUTH] Pref init failed:", err));
            }

            setUserMetadata(data);

            // Sync theme from cloud if it's different from local state
            if (data.preferences?.theme && data.preferences.theme !== theme) {
              setThemeState(data.preferences.theme as 'light' | 'dark' | 'system');
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("[AUTH] Metadata Snapshot Error:", error);
          setLoading(false);
        });

        return () => {
          unsubscribeMetadata();
        };
      } else {
        setUserMetadata(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setSessionUnlocked(false);
    if (auth) {
      await firebaseSignOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userMetadata, loading, isAppLocked, theme, resolvedTheme, setTheme, toggleTheme, unlockApp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
