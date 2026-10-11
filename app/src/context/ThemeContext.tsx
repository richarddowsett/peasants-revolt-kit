'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ColorTheme = 'orange' | 'green';

export interface ThemeTokens {
  name: ColorTheme;
  label: string;
  badgeLabel: string;
  primary: string;
  darker: string;
  soft: string;
  pillBg: string;
  pillText: string;
  btnBg: string;
  btnHover: string;
  btnPrimary: string;
  heroGradient: string;
  heroGlow: string;
  ring: string;
  focusRing: string;
  subtle: string;
  border: string;
  borderAccent: string;
  textAccent: string;
  activePill: string;
  tableSelectedRow: string;
  badgeBg: string;
  spinnerBorder: string;
}

export const THEME_CONFIGS: Record<ColorTheme, ThemeTokens> = {
  orange: {
    name: 'orange',
    label: 'Classic Orange',
    badgeLabel: 'Iconic',
    primary: 'rgb(202, 88, 46)',
    darker: 'rgb(165, 68, 32)',
    soft: 'rgb(255, 247, 237)',
    pillBg: 'rgb(202, 88, 46)',
    pillText: '#ffffff',
    btnBg: 'bg-[rgb(202,88,46)]',
    btnHover: 'hover:bg-[rgb(165,68,32)]',
    btnPrimary: 'bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white',
    heroGradient: 'bg-gradient-to-br from-[rgb(165,68,32)] via-[rgb(125,48,20)] to-slate-900',
    heroGlow: 'rgba(202,88,46,0.3)',
    ring: 'focus:ring-[rgb(202,88,46)]',
    focusRing: 'focus:ring-[rgb(202,88,46)]',
    subtle: 'rgba(202, 88, 46, 0.12)',
    border: 'border-[rgb(202,88,46)]',
    borderAccent: 'border-[rgb(202,88,46)]',
    textAccent: 'text-[rgb(202,88,46)]',
    activePill: 'bg-[rgb(202,88,46)] text-white border-[rgb(202,88,46)] shadow-sm',
    tableSelectedRow: 'bg-[rgb(255,247,237)] font-bold text-[rgb(165,68,32)]',
    badgeBg: 'bg-[rgb(202,88,46)] text-white',
    spinnerBorder: 'border-[rgb(202,88,46)]',
  },
  green: {
    name: 'green',
    label: 'Trendy Green',
    badgeLabel: 'Sneak Peek',
    primary: 'rgb(155, 165, 130)',
    darker: 'rgb(82, 94, 62)',
    soft: 'rgb(242, 245, 236)',
    pillBg: 'rgb(155, 165, 130)',
    pillText: '#0f172a',
    btnBg: 'bg-[rgb(82,94,62)]',
    btnHover: 'hover:bg-[rgb(68,78,50)]',
    btnPrimary: 'bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white',
    heroGradient: 'bg-gradient-to-br from-[rgb(78,88,60)] via-[rgb(55,64,42)] to-slate-900',
    heroGlow: 'rgba(155,165,130,0.25)',
    ring: 'focus:ring-[rgb(155,165,130)]',
    focusRing: 'focus:ring-[rgb(155,165,130)]',
    subtle: 'rgba(155, 165, 130, 0.15)',
    border: 'border-[rgb(155,165,130)]',
    borderAccent: 'border-[rgb(155,165,130)]',
    textAccent: 'text-[rgb(82,94,62)]',
    activePill: 'bg-[rgb(82,94,62)] text-white border-[rgb(82,94,62)] shadow-sm',
    tableSelectedRow: 'bg-[rgb(242,245,236)] font-bold text-[rgb(82,94,62)]',
    badgeBg: 'bg-[rgb(155,165,130)] text-slate-900',
    spinnerBorder: 'border-[rgb(155,165,130)]',
  },
};

interface ThemeContextType {
  theme: ColorTheme;
  tokens: ThemeTokens;
  setTheme: (theme: ColorTheme) => void;
  toggleTheme: () => void;
  isGreen: boolean;
  isOrange: boolean;
}

const defaultContextValue: ThemeContextType = {
  theme: 'orange',
  tokens: THEME_CONFIGS.orange,
  setTheme: () => {},
  toggleTheme: () => {},
  isGreen: false,
  isOrange: true,
};

const ThemeContext = createContext<ThemeContextType>(defaultContextValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always default to 'orange' as requested by the user
  const [theme, setThemeState] = useState<ColorTheme>('orange');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('prrc_theme') as ColorTheme | null;
      if (saved === 'green' || saved === 'orange') {
        setThemeState(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        document.documentElement.setAttribute('data-theme', 'orange');
      }
    } catch {
      // In case localStorage is blocked
      document.documentElement.setAttribute('data-theme', 'orange');
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ColorTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('prrc_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'orange' ? 'green' : 'orange');
  };

  const currentTheme = mounted ? theme : 'orange';
  const tokens = THEME_CONFIGS[currentTheme];

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        tokens,
        setTheme,
        toggleTheme,
        isGreen: currentTheme === 'green',
        isOrange: currentTheme === 'orange',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context || defaultContextValue;
}
