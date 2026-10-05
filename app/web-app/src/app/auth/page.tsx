"use client";

import React, { useState } from 'react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  getAdditionalUserInfo
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider, appleProvider, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Cloud, ArrowRight, ShieldCheck, Zap, Globe, Mail, Lock, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSocialAuth = async (provider: any) => {
    if (isLoading) return; // Prevent double-clicks which cancel popups
    if (!auth || !db) {
      setError("Firebase authentication is not configured. Please provide valid Firebase environment variables.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);

      if (additionalInfo?.profile) {
        const profile = additionalInfo.profile as any;
        console.log("[AUTH] Provider Profile Data:", profile);

        // Extract Birthday and Phone if provided by the OAuth token
        const updates: any = {};

        // Comprehensive extraction from various providers
        const bday = profile.birthday || profile.birthdate || profile.user_birthday;
        if (bday) updates.dateOfBirth = bday;

        const phone = profile.phone_number || profile.phoneNumber || profile.phone || result.user.phoneNumber;
        if (phone) updates.phoneNumber = phone;

        // Also check providerData as a fallback
        if (!updates.phoneNumber && result.user.providerData) {
          for (const provider of result.user.providerData) {
            if (provider.phoneNumber) {
              updates.phoneNumber = provider.phoneNumber;
              break;
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          console.log("[AUTH] Saving extracted identity data:", updates);
          const userRef = doc(db, 'users', result.user.uid);
          await setDoc(userRef, updates, { merge: true });
        }
      }
    } catch (err: any) {
      console.error("[AUTH] Social Login Error:", err);

      if (err.code === 'auth/popup-closed-by-user') {
        setIsLoading(false);
        return;
      }

      if (err.code === 'auth/cancelled-popup-request') {
        return; // Ignore as another attempt is starting
      }

      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase authentication is not configured. Please provide valid Firebase environment variables.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase authentication is not configured. Please provide valid Firebase environment variables.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess("Reset link sent! Check your inbox.");
      setShowResetModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex overflow-hidden transition-colors">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
           <div className="absolute bottom-20 right-20 w-[30rem] h-[30rem] bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-on-primary font-black text-4xl tracking-tighter">
          <Cloud size={56} fill="currentColor" fillOpacity={0.2} />
          <span>XCloud</span>
        </div>

        <div className="relative z-10 space-y-10">
           <motion.h1
             key={isLogin ? 'login' : 'signup'}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-display-large font-black text-on-primary leading-[1.1] tracking-tighter"
           >
             {isLogin ? (
               <>Securing your <br /> digital legacy, <br /> one byte at a time.</>
             ) : (
               <>Your multi-region <br /> encrypted vault <br /> starts here.</>
             )}
           </motion.h1>
           <div className="grid grid-cols-2 gap-8 text-on-primary/80">
              <div className="flex gap-5">
                 <div className="w-14 h-14 rounded-[1.5rem] bg-on-primary/10 flex items-center justify-center shrink-0 border border-on-primary/10 shadow-lg">
                    <ShieldCheck size={28} className="text-on-primary" />
                 </div>
                 <div>
                    <p className="font-black text-on-primary text-lg">Zero Knowledge</p>
                    <p className="text-sm font-medium opacity-60">We never see your data.</p>
                 </div>
              </div>
              <div className="flex gap-5">
                 <div className="w-14 h-14 rounded-[1.5rem] bg-on-primary/10 flex items-center justify-center shrink-0 border border-on-primary/10 shadow-lg">
                    <Zap size={28} className="text-on-primary" />
                 </div>
                 <div>
                    <p className="font-black text-on-primary text-lg">Warp Speed</p>
                    <p className="text-sm font-medium opacity-60">Global edge CDN storage.</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-on-primary/50 text-xs font-black uppercase tracking-[0.2em]">
           <Globe size={16} />
           <span>Secure Global Infrastructure Online</span>
        </div>
      </div>

      {/* Right: Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-12 bg-surface relative">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-3">
            <h2 className="text-display-small font-black text-on-surface tracking-tighter">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-on-surface-variant font-medium">
              {isLogin ? 'Authorized access to your encrypted vault.' : 'Provision your 1TB multi-region storage.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-5 rounded-2xl text-sm font-bold border flex items-center gap-3",
                  error ? 'bg-error-container text-on-error-container border-error/10' :
                          'bg-primary-container text-on-primary-container border-primary/10'
                )}
              >
                {error ? <X size={18} /> : <ShieldCheck size={18} />}
                {error || success}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={20} />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email Address"
                  className="w-full pl-14 pr-6 py-5 bg-surface-variant/30 border border-outline/10 rounded-[1.25rem] focus:ring-2 focus:ring-primary/20 focus:bg-surface outline-none transition-all text-on-surface font-medium"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={20} />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full pl-14 pr-6 py-5 bg-surface-variant/30 border border-outline/10 rounded-[1.25rem] focus:ring-2 focus:ring-primary/20 focus:bg-surface outline-none transition-all text-on-surface font-medium"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-sm font-black text-primary hover:underline underline-offset-4"
                >
                  Forgot Key?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-primary text-on-primary font-black rounded-3xl hover:shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Initialize Access' : 'Create Vault')}
              {!isLoading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="relative flex items-center gap-6 py-2">
            <div className="h-px bg-outline/10 flex-1"></div>
            <span className="text-[10px] font-black text-outline uppercase tracking-[0.3em]">Social Identity</span>
            <div className="h-px bg-outline/10 flex-1"></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'google', provider: googleProvider, color: '#4285F4', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )},
              { id: 'facebook', provider: facebookProvider, color: '#1877F2', icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )},
              { id: 'apple', provider: appleProvider, color: 'currentColor', icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.039 2.48-4.5 2.597-4.571-1.428-2.09-3.663-2.325-4.442-2.377-1.818-.142-2.857.948-3.852.948zm2.351-4.87c.818-.987 1.364-2.364 1.221-3.74-1.183.052-2.61.792-3.467 1.792-.766.896-1.442 2.286-1.26 3.623 1.312.104 2.662-.675 3.506-1.675z"/>
                </svg>
              )}
            ].map((social) => (
              <button
                key={social.id}
                onClick={() => handleSocialAuth(social.provider)}
                disabled={isLoading}
                style={{ color: social.id === 'apple' ? undefined : social.color }}
                className="flex items-center justify-center p-5 bg-surface-variant/30 border border-outline/10 rounded-[1.5rem] hover:bg-surface-variant/50 transition-all active:scale-90"
              >
                {social.icon}
              </button>
            ))}
          </div>

          <div className="pt-8 border-t border-outline/5 text-center">
             <p className="text-sm font-bold text-on-surface-variant">
               {isLogin ? "Need a secure vault?" : "Already provisioned?"} {' '}
               <button
                 onClick={() => setIsLogin(!isLogin)}
                 className="text-primary font-black hover:underline underline-offset-4 ml-1"
               >
                 {isLogin ? 'Generate One' : 'Access Now'}
               </button>
             </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl transition-colors"
            >
              <button
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X size={20} />
              </button>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                  <Mail size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Reset Password</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
