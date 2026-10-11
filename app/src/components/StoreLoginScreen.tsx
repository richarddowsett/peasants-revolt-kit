'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Lock, Mail, UserPlus, LogIn, AlertCircle, User as UserIcon } from 'lucide-react';

export default function StoreLoginScreen() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      setError('Please provide your first and last name.');
      return;
    }

    if (!auth) {
      setError('Firebase authentication service is not initialized.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: `${firstName.trim()} ${lastName.trim()}`,
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = 'Invalid email or password. If you do not have an account yet, click Register below.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[rgb(78,88,60)] via-[rgb(55,64,42)] to-slate-900 text-white p-8 text-center bg-[radial-gradient(circle_at_20%_20%,rgba(155,165,130,0.25)_0%,transparent_50%)]">
          <div className="w-16 h-16 rounded-full border-2 border-[rgb(155,165,130)] bg-white p-1 mx-auto mb-3 shadow-md">
            <img src="/logo.png" alt="PRRC Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <span className="inline-block bg-[rgb(155,165,130)] text-slate-900 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2 shadow-sm">
            Club Member Portal
          </span>
          <h2 className="text-2xl font-black tracking-tight">Peasants Revolt Store</h2>
          <p className="text-xs text-slate-200 mt-1">
            {isSignUp ? 'Create a club member account to browse & order kit' : 'Sign in to access official club kit & orders'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl mb-6 flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required={isSignUp}
                      placeholder="Alex"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required={isSignUp}
                      placeholder="Runner"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="runner@peasants.store"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={16} />
                  <span>Register & Access Store</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In to Store</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs font-semibold text-slate-600 hover:text-[rgb(82,94,62)] transition block w-full"
            >
              {isSignUp ? (
                <span>Already have an account? <strong className="text-[rgb(82,94,62)] underline font-bold">Sign In</strong></span>
              ) : (
                <span>Don't have an account? <strong className="text-[rgb(82,94,62)] underline font-bold">Register now</strong></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
