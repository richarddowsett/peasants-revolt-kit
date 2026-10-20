'use client';

import React from 'react';
import Link from 'next/link';
import { Instagram, Package, Lock, ExternalLink, Clock } from 'lucide-react';

export default function StoreHoldingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-[rgb(155,165,130)] selection:text-slate-900">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Peasants Revolt Running Club Logo"
              className="w-10 h-10 object-contain rounded-full bg-white/10 p-1"
            />
            <div>
              <span className="font-extrabold text-sm sm:text-base block leading-tight">
                Peasants Revolt Running Club
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[rgb(155,165,130)] block">
                Official Kit Store
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/christmas-party"
              className="text-slate-300 hover:text-white transition flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-800"
            >
              <span>Christmas Party</span>
            </Link>
            <Link
              href="/store/orders"
              className="text-slate-300 hover:text-white transition flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-800"
            >
              <Package size={14} className="text-[rgb(155,165,130)]" />
              <span className="hidden sm:inline">Track</span> Orders
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 sm:p-12 relative">
          {/* Subtle Sage Gradient Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[rgb(78,88,60)] via-[rgb(155,165,130)] to-[rgb(82,94,62)]" />

          {/* Logo Badge */}
          <div className="mx-auto w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 p-2 shadow-inner flex items-center justify-center">
            <img
              src="/logo.png"
              alt="PRRC Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-4">
            <Clock size={13} className="text-amber-600 animate-pulse" />
            <span>Store Temporarily Closed</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            The Store Is Currently Closed
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 max-w-md mx-auto">
            The store is currently closed but check back again soon for further updates. Follow our official club Instagram page for kit drop announcements, club runs, and race updates!
          </p>

          {/* Actions */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 justify-center items-center">
            {/* Instagram Link CTA */}
            <a
              href="https://www.instagram.com/prrcbrentwood/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-xs sm:text-sm font-bold px-6 py-3.5 rounded-2xl shadow transition transform hover:-translate-y-0.5"
            >
              <Instagram size={18} />
              <span>Follow @prrcbrentwood</span>
              <ExternalLink size={14} className="opacity-80" />
            </a>

            {/* Track Orders Link */}
            <Link
              href="/store/orders"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold px-5 py-3.5 rounded-2xl transition"
            >
              <Package size={16} />
              <span>Track Existing Order</span>
            </Link>
          </div>

          {/* Additional note for existing buyers */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500">
            Already ordered club kit? Your order is being processed and you can continue tracking its progress via the order tracker.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Peasants Revolt Running Club. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/prrcbrentwood/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[rgb(82,94,62)] transition flex items-center gap-1 font-medium"
            >
              <Instagram size={14} /> Instagram
            </a>
            <Link
              href="/admin"
              className="hover:text-slate-900 transition flex items-center gap-1 text-slate-400 font-medium"
            >
              <Lock size={12} /> Organiser CMS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
