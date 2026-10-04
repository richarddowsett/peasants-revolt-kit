import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Peasants Running Kit | Peasants Revolt Running Club',
  description: 'Official kit and store for Peasants Revolt Running Club.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
