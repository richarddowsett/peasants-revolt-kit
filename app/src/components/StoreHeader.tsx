'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, User as UserIcon, LogOut, PackageCheck, Lock } from 'lucide-react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailLink, sendSignInLinkToEmail, isSignInWithEmailLink } from 'firebase/auth';

interface StoreHeaderProps {
  cartItemCount: number;
  onOpenCart: () => void;
}

export default function StoreHeader({ cartItemCount, onOpenCart }: StoreHeaderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // Check for email magic link callback
    if (typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
          })
          .catch((err) => setAuthError(err.message));
      }
    }

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthError('');
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleEmailMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    try {
      setAuthError('');
      const actionCodeSettings = {
        url: window.location.origin + '/store',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, emailInput, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', emailInput);
      setEmailSent(true);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send login link');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <Link href="/store" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full border-2 border-[rgb(202,88,46)] p-0.5 bg-white shadow-sm group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="PRRC Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg leading-tight block">
              Peasants Running Kit
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[rgb(202,88,46)] block">
              Beta Store
            </span>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* My Orders Link */}
          <Link
            href="/store/orders"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[rgb(202,88,46)] bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition"
          >
            <PackageCheck size={16} />
            <span className="hidden sm:inline">My Orders</span>
          </Link>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-1.5 text-xs font-semibold bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <ShoppingBag size={16} />
            <span>Basket</span>
            {cartItemCount > 0 && (
              <span className="ml-1 bg-white text-[rgb(202,88,46)] font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>

          {/* User Auth Pill */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-xl transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-3 py-2 rounded-xl transition"
            >
              <UserIcon size={16} />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Admin Link */}
          <Link
            href="/admin"
            title="Admin CMS"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <Lock size={16} />
          </Link>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              &times;
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1 text-center">
              Sign In to Your Account
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              No passwords required! Sign in with Google or an instant email magic link.
            </p>

            {authError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 font-medium">
                {authError}
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-[10px] uppercase font-bold text-slate-400">or Magic Link</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Email Magic Link Form */}
            {emailSent ? (
              <div className="bg-emerald-50 text-emerald-700 text-xs p-4 rounded-xl text-center font-medium">
                ✨ Check your email inbox ({emailInput}) for your instant sign-in link!
              </div>
            ) : (
              <form onSubmit={handleEmailMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                />
                <button
                  type="submit"
                  className="w-full bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white font-bold text-xs py-3 rounded-xl transition"
                >
                  Send Passwordless Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
