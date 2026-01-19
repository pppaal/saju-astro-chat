// src/components/saju/result-display/components/PillarBox.tsx

import React from 'react';
import type { PillarData } from '../types';
import { elementColors } from '../constants';
import { getElementOfChar } from '../utils';
import { sibsinTextStyle, pillarCellStyle } from '../styles';

interface PillarBoxProps {
  title: string;
  heavenlyStem: PillarData['heavenlyStem'];
  earthlyBranch: PillarData['earthlyBranch'];
}

export default function PillarBox({ title, heavenlyStem, earthlyBranch }: PillarBoxProps) {
  const stemName = typeof heavenlyStem === 'string' ? heavenlyStem : (heavenlyStem?.name ?? '');
  const stemSibsin = typeof heavenlyStem === 'string' ? '' : (heavenlyStem?.sibsin ?? '');
  const branchName = typeof earthlyBranch === 'string' ? earthlyBranch : (earthlyBranch?.name ?? '');
  const branchSibsin = typeof earthlyBranch === 'string' ? '' : (earthlyBranch?.sibsin ?? '');

  const stemEl = getElementOfChar(stemName);
  const branchEl = getElementOfChar(branchName);

  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '0.9rem', color: '#b8b8c7', marginBottom: 4 }}>{title}</div>
      <div style={sibsinTextStyle}>{String(stemSibsin)}</div>
      <div style={{ ...pillarCellStyle, backgroundColor: stemEl ? elementColors[stemEl] : '#4a80e2' }}>
        {String(stemName)}
      </div>
      <div style={{ height: 8 }} />
      <div style={{ ...pillarCellStyle, backgroundColor: branchEl ? elementColors[branchEl] : '#f3a73f' }}>
        {String(branchName)}
      </div>
      <div style={{ ...sibsinTextStyle, marginTop: 6 }}>{String(branchSibsin)}</div>
    </div>
  );
}
