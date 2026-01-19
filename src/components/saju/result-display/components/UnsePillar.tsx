// src/components/saju/result-display/components/UnsePillar.tsx

import React from 'react';
import type { GanjiValue } from '../types';
import { elementColors } from '../constants';
import { getGanjiName, getElementOfChar } from '../utils';
import { sibsinTextStyle } from '../styles';

interface UnsePillarProps {
  topText: string;
  topSubText: string | object;
  cheon: GanjiValue;
  ji: GanjiValue;
  bottomSubText: string | object;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function UnsePillar({
  topText,
  topSubText,
  cheon,
  ji,
  bottomSubText,
  onClick,
  isSelected
}: UnsePillarProps) {
  const cheonStr = getGanjiName(cheon);
  const jiStr = getGanjiName(ji);
  const topSubStr = typeof topSubText === 'string' ? topSubText : String(topSubText ?? '');
  const bottomSubStr = typeof bottomSubText === 'string' ? bottomSubText : String(bottomSubText ?? '');

  const topEl = getElementOfChar(cheonStr);
  const bottomEl = getElementOfChar(jiStr);

  return (
    <div
      style={{
        flex: '0 0 65px',
        textAlign: 'center',
        padding: '0 4px',
        cursor: onClick ? 'pointer' : 'default',
        background: isSelected ? 'rgba(58,109,240,0.2)' : 'transparent',
        borderRadius: 8,
        border: isSelected ? '1px solid #3a6df0' : '1px solid transparent',
        transition: 'all 0.2s ease-in-out',
        paddingTop: 5,
        paddingBottom: 5,
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '0.8rem', color: '#a0a0a0', whiteSpace: 'nowrap' }}>{topText}</div>
      <div style={sibsinTextStyle}>{topSubStr}</div>
      <div style={{
        padding: '0.6rem 0',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        background: topEl ? elementColors[topEl] : '#2a2a3e',
        borderRadius: 4,
        color: '#fff',
        borderBottom: '1px solid #161625'
      }}>
        {cheonStr}
      </div>
      <div style={{
        padding: '0.6rem 0',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        background: bottomEl ? elementColors[bottomEl] : '#2a2a3e',
        borderRadius: 4,
        color: '#fff'
      }}>
        {jiStr}
      </div>
      <div style={sibsinTextStyle}>{bottomSubStr}</div>
    </div>
  );
}
