// src/components/astrology/components/PaywallOverlay.tsx
import React from 'react';

interface PaywallOverlayProps {
  type: 'login' | 'premium';
  description?: string;
  labels: {
    loginRequired: string;
    loginDesc: string;
    loginBtn: string;
    premiumRequired: string;
    premiumDesc: string;
    premiumBtn: string;
  };
  signInUrl: string;
}

export default function PaywallOverlay({ type, description, labels, signInUrl }: PaywallOverlayProps) {
  return (
    <div className="relative">
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/60 to-gray-900/90 backdrop-blur-sm rounded-xl z-10" />

      {/* Lock message */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex items-center justify-center">
            {type === 'login' ? (
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {type === 'login' ? labels.loginRequired : labels.premiumRequired}
          </h3>
          <p className="text-white/70 text-sm mb-4">
            {description || (type === 'login' ? labels.loginDesc : labels.premiumDesc)}
          </p>
          <a
            href={type === 'login' ? signInUrl : '/pricing'}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              type === 'login'
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white'
            }`}
          >
            {type === 'login' ? labels.loginBtn : labels.premiumBtn}
          </a>
        </div>
      </div>

      {/* Dummy content for blur background */}
      <div className="opacity-30 pointer-events-none select-none p-4 min-h-[200px]">
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
          <div className="h-4 bg-white/10 rounded w-5/6" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-4 bg-white/10 rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}
