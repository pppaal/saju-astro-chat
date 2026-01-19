// src/components/astrology/components/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  dir?: 'ltr' | 'rtl';
}

export default function Card({ children, dir = 'ltr' }: CardProps) {
  return (
    <div className="w-full mt-8 relative group" dir={dir}>
      {/* Outer glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Main card */}
      <div className="relative rounded-3xl border border-amber-200/20 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/90 backdrop-blur-xl p-8 md:p-10 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        {/* Top decorative line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* Corner decorations */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-400/30 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-400/30 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-400/30 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-400/30 rounded-br-lg" />

        {/* Background star decorations */}
        <div className="absolute top-6 right-12 text-amber-400/20 text-2xl">✦</div>
        <div className="absolute bottom-8 left-10 text-indigo-400/20 text-xl">✧</div>

        {children}
      </div>
    </div>
  );
}
