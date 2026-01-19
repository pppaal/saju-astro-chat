// src/components/saju/result-display/components/UnseFlowContainer.tsx

import React from 'react';

interface UnseFlowContainerProps {
  children: React.ReactNode;
}

export default function UnseFlowContainer({ children }: UnseFlowContainerProps) {
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      padding: '1rem 0.5rem',
      background: '#1e1e2f',
      borderRadius: 12,
      border: '1px solid #4f4f7a'
    }}>
      {children}
    </div>
  );
}
