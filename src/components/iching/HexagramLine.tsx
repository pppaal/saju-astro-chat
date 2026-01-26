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

  // Gradient colors need to stay as inline styles (dynamic gradients)
  const lineColor = isChanging
    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
    : 'linear-gradient(90deg, rgba(197, 166, 255, 0.9), #ffffff, rgba(197, 166, 255, 0.9))';

  const hoverLineColor = isChanging
    ? 'linear-gradient(90deg, #fcd34d, #fbbf24)'
    : 'linear-gradient(90deg, rgba(220, 200, 255, 1), #ffffff, rgba(220, 200, 255, 1))';

  const currentLineColor = clickable && isHovered ? hoverLineColor : lineColor;

  // Dynamic box-shadow values
  const getBoxShadow = () => {
    if (isChanging) {
      return isHovered
        ? '0 0 16px rgba(251, 191, 36, 0.8)'
        : '0 0 12px rgba(251, 191, 36, 0.6)';
    }
    return isHovered
      ? '0 0 12px rgba(255, 255, 255, 0.5)'
      : '0 0 8px rgba(255, 255, 255, 0.3)';
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
    if (clickable) {setIsHovered(true);}
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Line segment style (for broken lines)
  const lineSegmentStyle = {
    background: currentLineColor,
    boxShadow: getBoxShadow(),
  };

  if (type === 'broken') {
    return (
      <div
        className={`flex items-center gap-2 transition-all duration-200 rounded-lg
          ${clickable ? 'cursor-pointer p-1 px-2' : 'p-0'}
          ${clickable && isHovered ? 'bg-white/5' : 'bg-transparent'}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={clickable ? tooltipText : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => e.key === 'Enter' && handleClick() : undefined}
        aria-pressed={clickable ? isChanging : undefined}
        aria-label={clickable ? `${lineIndex !== undefined ? lineIndex + 1 : ''}효 ${type === 'broken' ? '음' : '양'}효${isChanging ? ' (변효)' : ''}` : undefined}
      >
        {/* Line number label */}
        {clickable && lineIndex !== undefined && (
          <span className={`text-xs min-w-[24px] text-right transition-all duration-200
            ${isChanging ? 'text-amber-400 font-semibold' : 'text-violet-300/60 font-normal'}`}>
            {lineIndex + 1}{lineLabel}
          </span>
        )}

        {/* Broken line container */}
        <div className="relative h-2 w-20 flex justify-center items-center my-1.5">
          {/* Left segment */}
          <div
            className="absolute left-0 w-8 h-2 rounded transition-all duration-200"
            style={lineSegmentStyle}
          />
          {/* Right segment */}
          <div
            className="absolute right-0 w-8 h-2 rounded transition-all duration-200"
            style={lineSegmentStyle}
          />
        </div>

        {/* Changing indicator */}
        {clickable && (
          <span className={`text-xs text-amber-400 ml-1 min-w-[16px] font-semibold transition-opacity duration-200
            ${isChanging ? 'opacity-100' : (isHovered ? 'opacity-30' : 'opacity-0')}`}>
            {isChanging ? changingLabel : ''}
          </span>
        )}
      </div>
    );
  }

  // Solid line
  return (
    <div
      className={`flex items-center gap-2 transition-all duration-200 rounded-lg
        ${clickable ? 'cursor-pointer p-1 px-2' : 'p-0'}
        ${clickable && isHovered ? 'bg-white/5' : 'bg-transparent'}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={clickable ? tooltipText : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => e.key === 'Enter' && handleClick() : undefined}
      aria-pressed={clickable ? isChanging : undefined}
      aria-label={clickable ? `${lineIndex !== undefined ? lineIndex + 1 : ''}효 양효${isChanging ? ' (변효)' : ''}` : undefined}
    >
      {/* Line number label */}
      {clickable && lineIndex !== undefined && (
        <span className={`text-xs min-w-[24px] text-right transition-all duration-200
          ${isChanging ? 'text-amber-400 font-semibold' : 'text-violet-300/60 font-normal'}`}>
          {lineIndex + 1}{lineLabel}
        </span>
      )}

      {/* Solid line */}
      <div
        className={`h-2 w-20 rounded my-1.5 flex justify-center items-center relative transition-all duration-200
          ${clickable && isHovered ? 'scale-x-105' : 'scale-x-100'}`}
        style={{
          background: currentLineColor,
          boxShadow: getBoxShadow(),
        }}
      />

      {/* Changing indicator */}
      {clickable && (
        <span className={`text-xs text-amber-400 ml-1 min-w-[16px] font-semibold transition-opacity duration-200
          ${isChanging ? 'opacity-100' : (isHovered ? 'opacity-30' : 'opacity-0')}`}>
          {isChanging ? changingLabel : ''}
        </span>
      )}
    </div>
  );
};

export default HexagramLine;
