'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { verifyAdminPassword } from '@/lib/api';
import DoorQrScanner from '@/components/DoorQrScanner';

function ScannerPageContent() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isValid = await verifyAdminPassword(passwordInput);
      if (isValid) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
        setAuthError('');
      } else {
        setAuthError('Incorrect admin password.');
      }
    } catch {
      setAuthError('Failed to verify admin password.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#f2f5ec] text-[#525e3e] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Door QR Scanner Login
            </h1>
            <p className="text-sm text-slate-500">
              Enter the organiser password to access the event door check-in scanner.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#9ba582]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <p className="text-xs font-bold text-red-600 text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#525e3e] hover:bg-[#414b31] text-white font-extrabold text-sm shadow-sm transition-all"
            >
              Unlock Door Scanner
            </button>
          </form>

          <div className="text-center">
            <Link
              href="/admin/events"
              className="inline-flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Organiser CMS</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-3 px-3 sm:py-6 sm:px-6 flex flex-col justify-center">
      <div className="w-full max-w-4xl mx-auto">
        <DoorQrScanner initialEventId={eventIdParam} />
      </div>
    </div>
  );
}

export default function AdminDoorScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-sm font-bold text-slate-600">
          Loading Door QR Scanner...
        </div>
      }
    >
      <ScannerPageContent />
    </Suspense>
  );
}
