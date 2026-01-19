// src/components/saju/result-display/components/RelationsPanel.tsx

import React from 'react';
import { pillarLabelMap } from '../constants';

interface RelationsPanelProps {
  relations?: { kind: string; pillars: ('year' | 'month' | 'day' | 'time')[]; detail?: string }[];
}

export default function RelationsPanel({ relations }: RelationsPanelProps) {
  if (!relations || relations.length === 0) {
    return <div style={{ color: '#9aa2c1' }}>표시할 합·충 정보가 없습니다.</div>;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 10,
      background: '#1e1e2f',
      border: '1px solid #4f4f7a',
      borderRadius: 12,
      padding: 12,
    }}>
      {relations.map((r, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ fontWeight: 800, color: '#ffd479', marginBottom: 6 }}>{r.kind}</div>
          <div style={{ fontSize: 13, color: '#cfd3e6' }}>
            {r.pillars.map((p) => pillarLabelMap[p]).join(' · ')}
          </div>
          {r.detail && <div style={{ marginTop: 6, fontSize: 12, color: '#9aa2c1' }}>{r.detail}</div>}
        </div>
      ))}
    </div>
  );
}
