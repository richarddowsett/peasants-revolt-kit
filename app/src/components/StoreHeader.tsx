import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, LogOut, PackageCheck, Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';

interface StoreHeaderProps {
  cartItemCount: number;
  onOpenCart: () => void;
}

export default function StoreHeader({ cartItemCount, onOpenCart }: StoreHeaderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <Link href="/store" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full border-2 border-[rgb(155,165,130)] p-0.5 bg-white shadow-sm group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="PRRC Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg leading-tight block">
              Peasants Running Kit
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[rgb(82,94,62)] block">
              Beta Store
            </span>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* My Orders Link */}
          <Link
            href="/store/orders"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[rgb(82,94,62)] bg-slate-100 hover:bg-[rgb(242,245,236)] px-3 py-2 rounded-xl transition"
          >
            <PackageCheck size={16} />
            <span className="hidden sm:inline">My Orders</span>
          </Link>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-1.5 text-xs font-bold bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <ShoppingBag size={16} />
            <span>Basket</span>
            {cartItemCount > 0 && (
              <span className="ml-1 bg-[rgb(155,165,130)] text-slate-900 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>

          {/* User Auth Pill */}
          {currentUser && (
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
    </header>
  );
}

