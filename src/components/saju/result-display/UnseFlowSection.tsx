import React from 'react';
import type { DaeunData, YeonunData, WolunData } from '@/lib/Saju';
import { getElementOfChar, getGanjiName, ELEMENT_COLORS } from '@/lib/Saju/stemBranchUtils';
import type { GanjiValue } from '@/lib/Saju/saju-result.types';

interface UnseFlowContainerProps {
  children: React.ReactNode;
}

export function UnseFlowContainer({ children }: UnseFlowContainerProps) {
  return (
    <div
      style={{
        display: 'flex',
        overflowX: 'auto',
        padding: '1rem 0.5rem',
        background: '#1e1e2f',
        borderRadius: 12,
        border: '1px solid #4f4f7a',
      }}
    >
      {children}
    </div>
  );
}

interface UnsePillarProps {
  topText: string;
  topSubText: string | object;
  cheon: GanjiValue;
  ji: GanjiValue;
  bottomSubText: string | object;
  onClick?: () => void;
  isSelected?: boolean;
}

export function UnsePillar({
  topText,
  topSubText,
  cheon,
  ji,
  bottomSubText,
  onClick,
  isSelected,
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
      <div
        style={{
          padding: '0.6rem 0',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          background: topEl ? ELEMENT_COLORS[topEl] : '#2a2a3e',
          borderRadius: 4,
          color: '#fff',
          borderBottom: '1px solid #161625',
        }}
      >
        {cheonStr}
      </div>
      <div
        style={{
          padding: '0.6rem 0',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          background: bottomEl ? ELEMENT_COLORS[bottomEl] : '#2a2a3e',
          borderRadius: 4,
          color: '#fff',
        }}
      >
        {jiStr}
      </div>
      <div style={sibsinTextStyle}>{bottomSubStr}</div>
    </div>
  );
}

const sibsinTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#888',
  height: '1.3em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Typed wrappers for different cycle types
interface DaeunSectionProps {
  cycles: DaeunData[];
  selected: DaeunData | null;
  onSelect: (cycle: DaeunData) => void;
}

export function DaeunSection({ cycles, selected, onSelect }: DaeunSectionProps) {
  return (
    <UnseFlowContainer>
      {cycles.map((item) => (
        <UnsePillar
          key={`daeun-${item.age}`}
          topText={`${item.age}세`}
          topSubText={item.sibsin.cheon}
          cheon={item.heavenlyStem}
          ji={item.earthlyBranch}
          bottomSubText={item.sibsin.ji}
          onClick={() => onSelect(item)}
          isSelected={selected?.age === item.age}
        />
      ))}
    </UnseFlowContainer>
  );
}

interface YeonunSectionProps {
  cycles: YeonunData[];
  selected: YeonunData | undefined;
  onSelect: (cycle: YeonunData) => void;
}

export function YeonunSection({ cycles, selected, onSelect }: YeonunSectionProps) {
  return (
    <UnseFlowContainer>
      {cycles.map((item) => (
        <UnsePillar
          key={`yeonun-${item.year}`}
          topText={`${item.year}년`}
          topSubText={item.sibsin.cheon}
          cheon={item.heavenlyStem}
          ji={item.earthlyBranch}
          bottomSubText={item.sibsin.ji}
          onClick={() => onSelect(item)}
          isSelected={selected?.year === item.year}
        />
      ))}
    </UnseFlowContainer>
  );
}

interface WolunSectionProps {
  cycles: WolunData[];
  selected: WolunData | undefined;
  onSelect: (cycle: WolunData) => void;
}

export function WolunSection({ cycles, selected, onSelect }: WolunSectionProps) {
  return (
    <UnseFlowContainer>
      {cycles.map((item) => (
        <UnsePillar
          key={`wolun-${item.month}`}
          topText={`${item.month}월`}
          topSubText={item.sibsin.cheon}
          cheon={item.heavenlyStem}
          ji={item.earthlyBranch}
          bottomSubText={item.sibsin.ji}
          onClick={() => onSelect(item)}
          isSelected={selected?.month === item.month && selected?.year === item.year}
        />
      ))}
    </UnseFlowContainer>
  );
}
