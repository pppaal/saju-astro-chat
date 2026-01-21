import React from 'react';

// Color class mapping for dynamic border/text colors
const colorClassMap: Record<string, { border: string; text: string; borderLight: string }> = {
  '#8aa4ff': { border: 'border-blue-400/40', text: 'text-blue-400', borderLight: 'border-blue-400/30' },
  '#ffd479': { border: 'border-yellow-400/40', text: 'text-yellow-400', borderLight: 'border-yellow-400/30' },
  '#2dbd7f': { border: 'border-emerald-400/40', text: 'text-emerald-400', borderLight: 'border-emerald-400/30' },
  '#ff6b6b': { border: 'border-red-400/40', text: 'text-red-400', borderLight: 'border-red-400/30' },
  '#5b6bfa': { border: 'border-indigo-400/40', text: 'text-indigo-400', borderLight: 'border-indigo-400/30' },
  '#f3a73f': { border: 'border-amber-400/40', text: 'text-amber-400', borderLight: 'border-amber-400/30' },
  '#4a90e2': { border: 'border-blue-500/40', text: 'text-blue-500', borderLight: 'border-blue-500/30' },
  '#9b59b6': { border: 'border-purple-400/40', text: 'text-purple-400', borderLight: 'border-purple-400/30' },
  '#e74c3c': { border: 'border-red-500/40', text: 'text-red-500', borderLight: 'border-red-500/30' },
  '#3498db': { border: 'border-sky-500/40', text: 'text-sky-500', borderLight: 'border-sky-500/30' },
};

interface AnalysisCardProps {
  title: string;
  color: string;
  children: React.ReactNode;
}

export function AnalysisCard({ title, color, children }: AnalysisCardProps) {
  const colorClasses = colorClassMap[color] || { border: 'border-slate-600', text: 'text-gray-300', borderLight: 'border-slate-700' };

  return (
    <div
      className={`bg-slate-800 p-4 rounded-xl border flex-1 min-w-[280px] ${colorClasses.border}`}
      role="region"
      aria-labelledby={`card-title-${title.replace(/\s/g, '-')}`}
    >
      <h4
        id={`card-title-${title.replace(/\s/g, '-')}`}
        className={`text-base font-semibold mb-3 pb-2 border-b ${colorClasses.borderLight} ${colorClasses.text}`}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

// Reusable sub-components for card content
export function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 text-sm">
      <span className="text-gray-400 mr-2">{label}:</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}

export function CardDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-slate-400 mt-3 leading-relaxed p-2 bg-white/[0.03] rounded-md">
      {children}
    </p>
  );
}

// Legacy exports for backward compatibility (deprecated - use components instead)
export const cardRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.25rem 0',
  fontSize: '0.85rem',
};

export const cardLabel: React.CSSProperties = {
  color: '#a0a0a0',
  marginRight: '0.5rem',
};

export const cardValue: React.CSSProperties = {
  color: '#e0e0e0',
  fontWeight: 500,
};

export const cardDesc: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#9aa2c1',
  marginTop: '0.75rem',
  lineHeight: 1.5,
  padding: '0.5rem',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 6,
};
