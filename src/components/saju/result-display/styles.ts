// src/components/saju/result-display/styles.ts

import type React from 'react';

// Premium Lock Overlay Styles
export const lockOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(22, 22, 37, 0.92)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  zIndex: 10,
};

export const lockContentStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '2rem',
};

export const lockIconStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  marginBottom: '0.75rem',
};

export const lockTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#ffd479',
  marginBottom: '0.5rem',
};

export const lockDescStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#a0a0a0',
  marginBottom: '1rem',
  lineHeight: 1.5,
};

export const lockButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1.5rem',
  background: 'linear-gradient(135deg, #8aa4ff, #ffd479)',
  color: '#1a1a2e',
  fontWeight: 600,
  fontSize: '0.9rem',
  borderRadius: 8,
  textDecoration: 'none',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

// Advanced Analysis Styles
export const advancedAnalysisContainer: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
};

export const cardRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.25rem 0',
  fontSize: '0.85rem',
};

export const cardLabel: React.CSSProperties = {
  color: '#a0a0a0',
  marginRight: '0.5rem',
};

export const cardValue: React.CSSProperties = {
  color: '#e0e0e0',
  fontWeight: 500,
};

export const cardDesc: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#9aa2c1',
  marginTop: '0.75rem',
  lineHeight: 1.5,
  padding: '0.5rem',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 6,
};

export const cardReasoning: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#888',
  marginTop: '0.5rem',
  fontStyle: 'italic',
};

// Sibsin Grid Styles
export const sibsinGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '0.5rem',
};

export const sibsinItem: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0.5rem',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 8,
};

export const sibsinName: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#a0a0a0',
  marginBottom: '0.25rem',
};

export const sibsinCount: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#e0e0e0',
};

// Score Styles
export const scoreContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  background: '#1e1e2f',
  padding: '1.5rem',
  borderRadius: 12,
  border: '1px solid #4f4f7a',
};

export const scoreTotalBox: React.CSSProperties = {
  textAlign: 'center',
  padding: '1rem',
  background: 'linear-gradient(135deg, rgba(138,164,255,0.15), rgba(255,212,121,0.15))',
  borderRadius: 12,
};

export const scoreTotalLabel: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#a0a0a0',
  marginBottom: '0.5rem',
};

export const scoreTotalValue: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 800,
  color: '#ffd479',
};

export const scoreTotalGrade: React.CSSProperties = {
  fontSize: '1rem',
  color: '#8aa4ff',
  marginTop: '0.25rem',
};

export const scoreBreakdown: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

export const scoreItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

export const scoreLabel: React.CSSProperties = {
  width: 100,
  fontSize: '0.8rem',
  color: '#a0a0a0',
  flexShrink: 0,
};

export const scoreBar: React.CSSProperties = {
  flex: 1,
  height: 8,
  background: '#161625',
  borderRadius: 4,
  overflow: 'hidden',
};

export const scoreBarFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #8aa4ff, #ffd479)',
  borderRadius: 4,
  transition: 'width 0.5s ease',
};

export const scoreNum: React.CSSProperties = {
  minWidth: 80,
  textAlign: 'right',
  fontSize: '0.85rem',
  color: '#e0e0e0',
  flexShrink: 0,
};

// Report Styles
export const reportContainer: React.CSSProperties = {
  background: '#1e1e2f',
  padding: '1.5rem',
  borderRadius: 12,
  border: '1px solid #4f4f7a',
};

export const reportSection: React.CSSProperties = {
  marginBottom: '1.25rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

export const reportTitle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#ffd479',
  marginBottom: '0.5rem',
};

export const reportText: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#c0c0c0',
  lineHeight: 1.6,
};

// Pillar Styles
export const sibsinTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#888',
  height: '1.3em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const pillarCellStyle: React.CSSProperties = {
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
};

// Calendar Styles
export const calendarCellStyle: React.CSSProperties = {
  border: '1px solid #4f4f7a',
  padding: '0.5rem',
  minHeight: 80,
  textAlign: 'left',
};

export const calendarHeaderStyle: React.CSSProperties = {
  border: '1px solid #4f4f7a',
  padding: '0.5rem',
  minHeight: 80,
  textAlign: 'center',
  fontWeight: 'bold',
  background: '#1e1e2f',
};

// Pillar Grid Styles
export const pillarsCompactGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '64px 1fr',
  columnGap: 12,
  background: '#1e1e2f',
  padding: 14,
  borderRadius: 12,
  border: '1px solid #4f4f7a',
};

export const railCompact: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: '28px 56px 8px 56px 12px',
  alignItems: 'center',
  justifyItems: 'start',
};

export const railChipBase: React.CSSProperties = {
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
};

export const railChipStem: React.CSSProperties = {
  ...railChipBase,
  color: '#8da1ff',
};

export const railChipBranch: React.CSSProperties = {
  ...railChipBase,
  color: '#ffcf8a',
};

export const railSpacerTop: React.CSSProperties = {
  height: '100%',
};

export const railSpacerBottom: React.CSSProperties = {
  height: '100%',
};

export const railGap8: React.CSSProperties = {
  height: 8,
};

export const pillarsCompactRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(72px, 1fr))',
  justifyItems: 'center',
  alignItems: 'start',
  gap: 16,
};
