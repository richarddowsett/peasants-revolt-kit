'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock } from 'lucide-react';

export default function HoldingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<number>(0);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const HOLD_DURATION_MS = 1500; // 1.5 seconds hold to unlock beta store

  const startHold = () => {
    setIsPressing(true);
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setProgress(currentProgress);

      if (currentProgress < 100) {
        animationRef.current = requestAnimationFrame(updateProgress);
      } else {
        // Complete! Redirect to beta store
        setIsPressing(false);
        router.push('/store');
      }
    };

    animationRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelHold = () => {
    setIsPressing(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    startTimeRef.current = null;
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // SVG Ring calculation
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-[rgb(202,88,46)] flex flex-col justify-between items-center p-6 text-white select-none bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.12)_0%,transparent_45%),radial-gradient(circle_at_85%_85%,rgba(0,0,0,0.15)_0%,transparent_45%)]">
      {/* Top Header / Secret Indicator */}
      <header className="w-full max-w-lg flex justify-end">
        <button
          onClick={() => router.push('/admin')}
          className="text-xs text-white/70 hover:text-white flex items-center gap-1 bg-black/10 px-3 py-1.5 rounded-full backdrop-blur-sm transition"
        >
          <Lock size={12} /> Admin
        </button>
      </header>

      {/* Main Content Card */}
      <main className="w-full max-w-md my-auto">
        <div className="bg-white/95 text-slate-900 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-md">
          {/* Logo with Animated Progress Ring on Long-Press */}
          <div
            className="relative w-44 h-44 mx-auto mb-6 cursor-pointer group"
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
          >
            {/* SVG Ring */}
            <svg
              className="absolute -inset-2 w-[192px] h-[192px] pointer-events-none -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-200"
                strokeWidth="4"
                fill="transparent"
              />
              {/* Animated Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-[rgb(202,88,46)] transition-all duration-75 ease-linear"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Logo Image Badge */}
            <div className="w-full h-full rounded-full bg-white p-2 shadow-lg group-active:scale-95 transition-transform duration-150">
              <img
                src="/logo.png"
                alt="Peasants Revolt Running Club Logo"
                className="w-full h-full object-contain rounded-full"
                draggable={false}
              />
            </div>

            {/* Micro hint overlay when pressing */}
            {isPressing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white text-xs font-bold animate-pulse">
                Unlocking...
              </div>
            )}
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[rgba(202,88,46,0.1)] text-[rgb(202,88,46)] text-xs font-extrabold uppercase tracking-wider px-4 py-1.5 rounded-full mb-4">
            <span className="w-2 h-2 rounded-full bg-[rgb(202,88,46)] animate-ping" />
            Store Coming Soon
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
            Peasants Running Kit
          </h1>
          <p className="text-sm font-bold text-[rgb(202,88,46)] mb-4">
            Peasants Revolt Running Club
          </p>

          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            We are preparing our official club store! Soon you'll be able to order running tops, kit, and gear right here.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-white/80 font-medium">
        &copy; Peasants Revolt Running Club
      </footer>
    </div>
  );
}
