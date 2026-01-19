// src/components/saju/result-display/components/Section.tsx

import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{
        fontSize: '1.1rem',
        fontWeight: 500,
        borderBottom: '1px solid #4f4f7a',
        paddingBottom: '0.8rem',
        marginBottom: '1.5rem',
        color: '#c0c0c0',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
