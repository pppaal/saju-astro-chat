import React from 'react'
import type { PillarData } from '@/lib/Saju'
import { getElementOfChar, ELEMENT_COLORS } from '@/lib/Saju/stemBranchUtils'

interface PillarBoxProps {
  title: string
  heavenlyStem: PillarData['heavenlyStem']
  earthlyBranch: PillarData['earthlyBranch']
}

export function PillarBox({ title, heavenlyStem, earthlyBranch }: PillarBoxProps) {
  const stemName = typeof heavenlyStem === 'string' ? heavenlyStem : (heavenlyStem?.name ?? '')
  const stemSibsin = typeof heavenlyStem === 'string' ? '' : (heavenlyStem?.sibsin ?? '')
  const branchName = typeof earthlyBranch === 'string' ? earthlyBranch : (earthlyBranch?.name ?? '')
  const branchSibsin = typeof earthlyBranch === 'string' ? '' : (earthlyBranch?.sibsin ?? '')

  const stemEl = getElementOfChar(stemName)
  const branchEl = getElementOfChar(branchName)

  return (
    <div
      style={{
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: '0.9rem', color: '#b8b8c7', marginBottom: 4 }}>{title}</div>
      <div style={sibsinTextStyle}>{String(stemSibsin)}</div>
      <div
        style={{ ...pillarCellStyle, backgroundColor: stemEl ? ELEMENT_COLORS[stemEl] : '#4a80e2' }}
      >
        {String(stemName)}
      </div>
      <div style={{ height: 8 }} />
      <div
        style={{
          ...pillarCellStyle,
          backgroundColor: branchEl ? ELEMENT_COLORS[branchEl] : '#f3a73f',
        }}
      >
        {String(branchName)}
      </div>
      <div style={{ ...sibsinTextStyle, marginTop: 6 }}>{String(branchSibsin)}</div>
    </div>
  )
}

const sibsinTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#888',
  height: '1.3em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const pillarCellStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.6rem',
  fontWeight: 800,
  color: '#fff',
  borderRadius: 12,
  boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
}
