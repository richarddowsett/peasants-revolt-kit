'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sparkles } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export default function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs ${className}`}
      role="group"
      aria-label="Color Theme Switcher"
    >
      {/* Classic Orange Option */}
      <button
        type="button"
        onClick={() => setTheme('orange')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
          theme === 'orange'
            ? 'bg-[rgb(202,88,46)] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
        title="Iconic Classic Orange (Current Club Kit)"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full border ${
            theme === 'orange' ? 'bg-amber-300 border-white' : 'bg-[rgb(202,88,46)] border-slate-300'
          }`}
        />
        <span>
          <span className="hidden sm:inline">Classic </span>Orange
        </span>
      </button>

      {/* Trendy Green Option */}
      <button
        type="button"
        onClick={() => setTheme('green')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
          theme === 'green'
            ? 'bg-[rgb(82,94,62)] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
        title="Sneak Peek: Trendy Green (Future Club Branding)"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full border ${
            theme === 'green' ? 'bg-[rgb(185,195,160)] border-white' : 'bg-[rgb(155,165,130)] border-slate-300'
          }`}
        />
        <span>
          <span className="hidden sm:inline">Trendy </span>Green
        </span>
        <span
          className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full hidden md:inline-flex items-center gap-0.5 ${
            theme === 'green' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          <Sparkles size={9} /> Sneak Peek
        </span>
      </button>
    </div>
  );
}
