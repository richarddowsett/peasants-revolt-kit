import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, PackageCheck, ShoppingBag, ArrowUpRight } from 'lucide-react';

export default function StoreFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-12 text-slate-600 text-xs">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Club Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[rgb(155,165,130)] p-0.5 bg-white shadow-sm">
                <img src="/logo.png" alt="PRRC Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">
                Peasants Revolt Running Club
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-md">
              Official kit store for Peasants Revolt Running Club members across the UK. High-performance, bespoke running apparel designed for rebels on the roads and trails.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-[11px] font-medium border border-emerald-200">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Zero Tracking Cookies • UK GDPR & PECR Compliant</span>
            </div>
          </div>

          {/* Col 2: Member Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Club Member Portal
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/store" className="hover:text-[rgb(82,94,62)] transition flex items-center gap-1.5">
                  <ShoppingBag size={13} /> Store Catalog
                </Link>
              </li>
              <li>
                <Link href="/store/orders" className="hover:text-[rgb(82,94,62)] transition flex items-center gap-1.5">
                  <PackageCheck size={13} /> My Orders
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-[rgb(82,94,62)] transition flex items-center gap-1.5">
                  <Lock size={13} /> Club Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Compliance & Legal */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Privacy & Legal
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-[rgb(82,94,62)] transition font-semibold text-slate-800 flex items-center gap-1"
                >
                  <span>Privacy & Cookies Policy</span>
                  <ArrowUpRight size={12} className="text-slate-400" />
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Payments via Monzo Bank</span>
              </li>
              <li>
                <span className="text-slate-400">UK PECR & DPA 2018 Compliant</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <p>© {new Date().getFullYear()} Peasants Revolt Running Club. All rights reserved.</p>
          <p className="text-center sm:text-right">
            This site uses strictly necessary browser storage for member sessions. No advertising or tracking cookies.
          </p>
        </div>
      </div>
    </footer>
  );
}
