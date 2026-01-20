import React from 'react';

interface FiveElementsData {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

interface FiveElementsChartProps {
  data: FiveElementsData;
}

export function FiveElementsChart({ data }: FiveElementsChartProps) {
  const elements = [
    { name: '목', key: 'wood' as const, color: '#2dbd7f' },
    { name: '화', key: 'fire' as const, color: '#ff6b6b' },
    { name: '토', key: 'earth' as const, color: '#f3a73f' },
    { name: '금', key: 'metal' as const, color: '#4a90e2' },
    { name: '수', key: 'water' as const, color: '#5b6bfa' },
  ];

  const total = Object.values(data).reduce((s, c) => s + c, 0);

  return (
    <div style={{ background: '#1e1e2f', padding: '1.5rem', borderRadius: 12, border: '1px solid #4f4f7a' }}>
      {elements.map((el) => {
        const count = data[el.key] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={el.name} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ width: 40 }}>{el.name}</span>
            <div style={{ flex: 1, background: '#161625', borderRadius: 4, height: 20, marginRight: '1rem' }}>
              <div
                style={{
                  width: `${percentage}%`,
                  background: el.color,
                  height: '100%',
                  borderRadius: 4,
                  transition: 'width 0.5s ease-in-out',
                }}
              />
            </div>
            <span style={{ width: 20, textAlign: 'right' }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}
