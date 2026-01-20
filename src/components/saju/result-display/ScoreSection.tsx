import React from 'react';
import { cardLabel, cardDesc } from './AnalysisCard';
import type { ComprehensiveScore } from '@/lib/Saju/saju-result.types';

interface ScoreSectionProps {
  score: ComprehensiveScore;
}

export function ScoreSection({ score }: ScoreSectionProps) {
  return (
    <div style={scoreContainer}>
      <div style={scoreTotalBox}>
        <div style={scoreTotalLabel}>종합 점수</div>
        <div style={scoreTotalValue}>{score.overall ?? '-'}</div>
        {score.grade && <div style={scoreTotalGrade}>{score.grade}등급</div>}
      </div>

      <div style={scoreBreakdown}>
        {score.strength && (
          <div style={scoreItem}>
            <span style={scoreLabel}>신강/신약:</span>
            <div style={scoreBar}>
              <div style={{ ...scoreBarFill, width: `${Math.min(100, score.strength.total || 0)}%` }} />
            </div>
            <span style={scoreNum}>
              {score.strength.total} ({score.strength.level})
            </span>
          </div>
        )}

        {score.geokguk && (
          <>
            <div style={scoreItem}>
              <span style={scoreLabel}>격국 순수도:</span>
              <div style={scoreBar}>
                <div style={{ ...scoreBarFill, width: `${Math.min(100, score.geokguk.purity || 0)}%` }} />
              </div>
              <span style={scoreNum}>{score.geokguk.purity}</span>
            </div>
            <div style={scoreItem}>
              <span style={scoreLabel}>격국 안정도:</span>
              <div style={scoreBar}>
                <div style={{ ...scoreBarFill, width: `${Math.min(100, score.geokguk.stability || 0)}%` }} />
              </div>
              <span style={scoreNum}>{score.geokguk.stability}</span>
            </div>
          </>
        )}

        {score.yongsin && (
          <div style={scoreItem}>
            <span style={scoreLabel}>용신 적합도:</span>
            <div style={scoreBar}>
              <div style={{ ...scoreBarFill, width: `${Math.min(100, score.yongsin.fitScore || 0)}%` }} />
            </div>
            <span style={scoreNum}>{score.yongsin.fitScore}</span>
          </div>
        )}
      </div>

      {score.summary && <p style={{ ...cardDesc, marginTop: '1rem' }}>{score.summary}</p>}

      {score.strengths && score.strengths.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <span style={{ ...cardLabel, display: 'block', marginBottom: '0.25rem' }}>강점:</span>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#2dbd7f', fontSize: '0.85rem' }}>
            {score.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {score.weaknesses && score.weaknesses.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <span style={{ ...cardLabel, display: 'block', marginBottom: '0.25rem' }}>약점:</span>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
            {score.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {score.recommendations && score.recommendations.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <span style={{ ...cardLabel, display: 'block', marginBottom: '0.25rem' }}>추천:</span>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#ffd479', fontSize: '0.85rem' }}>
            {score.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const scoreContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  background: '#1e1e2f',
  padding: '1.5rem',
  borderRadius: 12,
  border: '1px solid #4f4f7a',
};

const scoreTotalBox: React.CSSProperties = {
  textAlign: 'center',
  padding: '1rem',
  background: 'linear-gradient(135deg, rgba(138,164,255,0.15), rgba(255,212,121,0.15))',
  borderRadius: 12,
};

const scoreTotalLabel: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#a0a0a0',
  marginBottom: '0.5rem',
};

const scoreTotalValue: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 800,
  color: '#ffd479',
};

const scoreTotalGrade: React.CSSProperties = {
  fontSize: '1rem',
  color: '#8aa4ff',
  marginTop: '0.25rem',
};

const scoreBreakdown: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const scoreItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const scoreLabel: React.CSSProperties = {
  width: 100,
  fontSize: '0.8rem',
  color: '#a0a0a0',
  flexShrink: 0,
};

const scoreBar: React.CSSProperties = {
  flex: 1,
  height: 8,
  background: '#161625',
  borderRadius: 4,
  overflow: 'hidden',
};

const scoreBarFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #8aa4ff, #ffd479)',
  borderRadius: 4,
  transition: 'width 0.5s ease',
};

const scoreNum: React.CSSProperties = {
  minWidth: 80,
  textAlign: 'right',
  fontSize: '0.85rem',
  color: '#e0e0e0',
  flexShrink: 0,
};
