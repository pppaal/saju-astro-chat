import React from 'react';

interface AnalysisCardProps {
  title: string;
  color: string;
  children: React.ReactNode;
}

export function AnalysisCard({ title, color, children }: AnalysisCardProps) {
  return (
    <div
      style={{
        background: '#1e1e2f',
        padding: '1rem',
        borderRadius: 12,
        border: `1px solid ${color}40`,
        flex: '1 1 300px',
        minWidth: 280,
      }}
    >
      <h4
        style={{
          color,
          fontSize: '0.95rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: `1px solid ${color}30`,
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

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
