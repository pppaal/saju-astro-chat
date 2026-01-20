import React from 'react';
import { AnalysisCard, cardRow, cardLabel, cardValue, cardDesc } from './AnalysisCard';
import type { GeokgukAnalysis, YongsinAnalysis } from '@/lib/Saju/saju-result.types';

interface GeokgukYongsinSectionProps {
  geokguk?: GeokgukAnalysis;
  yongsin?: YongsinAnalysis;
}

export function GeokgukYongsinSection({ geokguk, yongsin }: GeokgukYongsinSectionProps) {
  if (!geokguk && !yongsin) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      {geokguk && (
        <AnalysisCard title="격국 (格局)" color="#8aa4ff">
          <div style={cardRow}>
            <span style={cardLabel}>격국:</span>
            <span style={cardValue}>{geokguk.primary || '미정'}</span>
          </div>
          {geokguk.category && (
            <div style={cardRow}>
              <span style={cardLabel}>분류:</span>
              <span style={cardValue}>{geokguk.category}</span>
            </div>
          )}
          {geokguk.confidence && (
            <div style={cardRow}>
              <span style={cardLabel}>확신도:</span>
              <span style={cardValue}>{geokguk.confidence}</span>
            </div>
          )}
          {geokguk.description && <p style={cardDesc}>{geokguk.description}</p>}
        </AnalysisCard>
      )}

      {yongsin && (
        <AnalysisCard title="용신 (用神)" color="#ffd479">
          <div style={cardRow}>
            <span style={cardLabel}>용신:</span>
            <span style={cardValue}>{yongsin.primaryYongsin || '-'}</span>
          </div>
          {yongsin.secondaryYongsin && (
            <div style={cardRow}>
              <span style={cardLabel}>희신:</span>
              <span style={cardValue}>{yongsin.secondaryYongsin}</span>
            </div>
          )}
          {yongsin.kibsin && (
            <div style={cardRow}>
              <span style={cardLabel}>기신:</span>
              <span style={cardValue}>{yongsin.kibsin}</span>
            </div>
          )}
          {yongsin.daymasterStrength && (
            <div style={cardRow}>
              <span style={cardLabel}>신강/신약:</span>
              <span style={cardValue}>{yongsin.daymasterStrength}</span>
            </div>
          )}
          {yongsin.luckyColors && yongsin.luckyColors.length > 0 && (
            <div style={cardRow}>
              <span style={cardLabel}>행운색:</span>
              <span style={cardValue}>{yongsin.luckyColors.join(', ')}</span>
            </div>
          )}
          {yongsin.luckyDirection && (
            <div style={cardRow}>
              <span style={cardLabel}>행운방향:</span>
              <span style={cardValue}>{yongsin.luckyDirection}</span>
            </div>
          )}
          {yongsin.luckyNumbers && yongsin.luckyNumbers.length > 0 && (
            <div style={cardRow}>
              <span style={cardLabel}>행운숫자:</span>
              <span style={cardValue}>{yongsin.luckyNumbers.join(', ')}</span>
            </div>
          )}
          {yongsin.description && <p style={cardDesc}>{yongsin.description}</p>}
        </AnalysisCard>
      )}
    </div>
  );
}
