"use client";

import React from 'react';

interface HexagramLineProps {
  type: 'solid' | 'broken';
  isChanging?: boolean;
}

const HexagramLine: React.FC<HexagramLineProps> = ({ type, isChanging }) => {
  const lineColor = isChanging
    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
    : 'linear-gradient(90deg, rgba(197, 166, 255, 0.9), #ffffff, rgba(197, 166, 255, 0.9))';

  const baseStyle: React.CSSProperties = {
    height: '8px',
    background: lineColor,
    margin: '6px 0',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    transition: 'all 0.3s ease-in-out',
    boxShadow: isChanging
      ? '0 0 12px rgba(251, 191, 36, 0.6)'
      : '0 0 8px rgba(255, 255, 255, 0.3)',
    width: '80px',
  };

  if (type === 'broken') {
    return (
      <div style={{ ...baseStyle, background: 'transparent', boxShadow: 'none' }}>
        <div style={{
          position: 'absolute',
          left: 0,
          width: '32px',
          height: '8px',
          background: lineColor,
          borderRadius: '4px',
          boxShadow: isChanging
            ? '0 0 12px rgba(251, 191, 36, 0.6)'
            : '0 0 8px rgba(255, 255, 255, 0.3)',
        }}></div>
        <div style={{
          position: 'absolute',
          right: 0,
          width: '32px',
          height: '8px',
          background: lineColor,
          borderRadius: '4px',
          boxShadow: isChanging
            ? '0 0 12px rgba(251, 191, 36, 0.6)'
            : '0 0 8px rgba(255, 255, 255, 0.3)',
        }}></div>
      </div>
    );
  }

  return <div style={baseStyle}></div>;
};

export default HexagramLine;
