// src/components/saju/result-display/components/AnalysisCard.tsx

import React from 'react';

interface AnalysisCardProps {
  title: string;
  color: string;
  children: React.ReactNode;
}

export default function AnalysisCard({ title, color, children }: AnalysisCardProps) {
  return (
    <div style={{
      background: '#1e1e2f',
      padding: '1rem',
      borderRadius: 12,
      border: `1px solid ${color}40`,
      flex: '1 1 300px',
      minWidth: 280,
    }}>
      <h4 style={{
        color,
        fontSize: '0.95rem',
        fontWeight: 600,
        marginBottom: '0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: `1px solid ${color}30`,
      }}>
        {title}
      </h4>
      {children}
    </div>
  );
}
