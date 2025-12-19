"use client";

import React, { useState } from 'react';

interface HexagramLineProps {
  type: 'solid' | 'broken';
  isChanging?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  lineIndex?: number;
  locale?: string;
}

const HexagramLine: React.FC<HexagramLineProps> = ({
  type,
  isChanging,
  onClick,
  clickable = false,
  lineIndex,
  locale = 'ko'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const lineColor = isChanging
    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
    : 'linear-gradient(90deg, rgba(197, 166, 255, 0.9), #ffffff, rgba(197, 166, 255, 0.9))';

  // Hover effect - slightly brighter
  const hoverLineColor = isChanging
    ? 'linear-gradient(90deg, #fcd34d, #fbbf24)'
    : 'linear-gradient(90deg, rgba(220, 200, 255, 1), #ffffff, rgba(220, 200, 255, 1))';

  const currentLineColor = clickable && isHovered ? hoverLineColor : lineColor;

  const baseStyle: React.CSSProperties = {
    height: '8px',
    background: currentLineColor,
    margin: '6px 0',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    transition: 'all 0.2s ease-in-out',
    boxShadow: isChanging
      ? `0 0 ${isHovered ? '16px' : '12px'} rgba(251, 191, 36, ${isHovered ? '0.8' : '0.6'})`
      : `0 0 ${isHovered ? '12px' : '8px'} rgba(255, 255, 255, ${isHovered ? '0.5' : '0.3'})`,
    width: '80px',
    cursor: clickable ? 'pointer' : 'default',
    transform: clickable && isHovered ? 'scaleX(1.05)' : 'scaleX(1)',
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: clickable ? 'pointer' : 'default',
    padding: clickable ? '4px 8px' : '0',
    borderRadius: '8px',
    background: clickable && isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
    transition: 'all 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: isChanging ? 'rgba(251, 191, 36, 0.9)' : 'rgba(197, 166, 255, 0.6)',
    minWidth: '24px',
    textAlign: 'right',
    fontWeight: isChanging ? 600 : 400,
    transition: 'all 0.2s ease',
  };

  const changingIndicatorStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: '#fbbf24',
    marginLeft: '4px',
    minWidth: '16px',
    fontWeight: 600,
    opacity: isChanging ? 1 : (clickable && isHovered ? 0.3 : 0),
    transition: 'opacity 0.2s ease',
  };

  // Localized text
  const lineLabel = locale === 'ko' ? '효' : '';
  const changingLabel = locale === 'ko' ? '변' : '⟳';
  const tooltipText = locale === 'ko'
    ? '클릭하여 변효 설정/해제'
    : 'Click to toggle changing line';

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  const handleMouseEnter = () => {
    if (clickable) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  if (type === 'broken') {
    return (
      <div
        style={wrapperStyle}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={clickable ? tooltipText : undefined}
      >
        {clickable && lineIndex !== undefined && (
          <span style={labelStyle}>{lineIndex + 1}{lineLabel}</span>
        )}
        <div style={{ ...baseStyle, background: 'transparent', boxShadow: 'none' }}>
          <div style={{
            position: 'absolute',
            left: 0,
            width: '32px',
            height: '8px',
            background: currentLineColor,
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            boxShadow: isChanging
              ? `0 0 ${isHovered ? '16px' : '12px'} rgba(251, 191, 36, ${isHovered ? '0.8' : '0.6'})`
              : `0 0 ${isHovered ? '12px' : '8px'} rgba(255, 255, 255, ${isHovered ? '0.5' : '0.3'})`,
          }}></div>
          <div style={{
            position: 'absolute',
            right: 0,
            width: '32px',
            height: '8px',
            background: currentLineColor,
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            boxShadow: isChanging
              ? `0 0 ${isHovered ? '16px' : '12px'} rgba(251, 191, 36, ${isHovered ? '0.8' : '0.6'})`
              : `0 0 ${isHovered ? '12px' : '8px'} rgba(255, 255, 255, ${isHovered ? '0.5' : '0.3'})`,
          }}></div>
        </div>
        {clickable && <span style={changingIndicatorStyle}>{isChanging ? changingLabel : ''}</span>}
      </div>
    );
  }

  return (
    <div
      style={wrapperStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={clickable ? tooltipText : undefined}
    >
      {clickable && lineIndex !== undefined && (
        <span style={labelStyle}>{lineIndex + 1}{lineLabel}</span>
      )}
      <div style={baseStyle}></div>
      {clickable && <span style={changingIndicatorStyle}>{isChanging ? changingLabel : ''}</span>}
    </div>
  );
};

export default HexagramLine;
