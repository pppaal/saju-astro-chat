// src/components/saju/PillarSummaryTable.tsx

'use client';
import React from 'react';
import type { PillarView } from '@/adapters/map-12';

export default function PillarSummaryTable({
  data,
  timeLuckyOverride,
  dayLuckyOverride,
  monthLuckyOverride,
  yearLuckyOverride,
}: {
  data?: PillarView;
  timeLuckyOverride?: string[];
  dayLuckyOverride?: string[];
  monthLuckyOverride?: string[];
  yearLuckyOverride?: string[];
}) {
  if (!data) return null;

  const cellBase: React.CSSProperties = {
    padding: '10px 12px',
    borderLeft: '1px solid #2a2a3e',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  };
  const headerCell: React.CSSProperties = {
    ...cellBase,
    textAlign: 'center',
    fontWeight: 800,
    color: '#cfd6ff',
  };
  const rowLabel: React.CSSProperties = {
    padding: '10px 12px',
    color: '#9aa2c1',
    fontWeight: 600,
    borderRight: '1px solid #2a2a3e',
  };

  const toDisplayString = (v: unknown): string => {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.map(toDisplayString).filter(Boolean).join('\n');
    // Handle objects (like pillar data) - extract name/text properties
    if (typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      // Try common text properties
      if (obj.name && typeof obj.name === 'string') return obj.name;
      if (obj.text && typeof obj.text === 'string') return obj.text;
      if (obj.display && typeof obj.display === 'string') return obj.display;
      // For jijanggan object structure
      if (obj.chogi || obj.junggi || obj.jeonggi) {
        const parts: string[] = [];
        if (obj.chogi && typeof (obj.chogi as any)?.name === 'string') parts.push((obj.chogi as any).name);
        if (obj.junggi && typeof (obj.junggi as any)?.name === 'string') parts.push((obj.junggi as any).name);
        if (obj.jeonggi && typeof (obj.jeonggi as any)?.name === 'string') parts.push((obj.jeonggi as any).name);
        return parts.join(' ');
      }
      // Fallback: try to stringify or return empty
      try {
        return JSON.stringify(v);
      } catch {
        return '';
      }
    }
    return String(v);
  };
  const val = (v?: unknown) => <div style={cellBase}>{toDisplayString(v) || '—'}</div>;

  // 어댑터에서 최종 선별된 길성(lucky)만 그대로 출력하도록 간소화
  const formatLucky = (k: 'time' | 'day' | 'month' | 'year'): string => {
    // 1) 칸별 오버라이드 우선 적용
    const overrides = {
      time: timeLuckyOverride,
      day: dayLuckyOverride,
      month: monthLuckyOverride,
      year: yearLuckyOverride,
    } as const;
    const override = overrides[k];
    if (override && override.length) {
      return override.map((s) => (s ?? '').toString().trim()).filter(Boolean).join('\n');
    }
    // 2) 어댑터가 필터링 완료한 lucky를 그대로 출력
    const lucky = (data as any)?.[k]?.lucky as string[] | undefined;
    return (lucky || []).map((s) => (s ?? '').toString().trim()).filter(Boolean).join('\n');
  };

  return (
    <div
      style={{
        marginTop: 16,
        background: '#1e1e2f',
        border: '1px solid #4f4f7a',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px repeat(4, 1fr)',
          borderBottom: '1px solid #4f4f7a',
        }}
      >
        <div style={{ padding: '10px 12px', color: '#9aa2c1', fontWeight: 700 }}>구분</div>
        <div style={headerCell}>시지</div>
        <div style={headerCell}>일지</div>
        <div style={headerCell}>월지</div>
        <div style={headerCell}>연지</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px repeat(4, 1fr)',
          borderTop: '1px solid #2a2a3e',
        }}
      >
        <div style={rowLabel}>지장간</div>
        {val(data?.time?.jijanggan)}
        {val(data?.day?.jijanggan)}
        {val(data?.month?.jijanggan)}
        {val(data?.year?.jijanggan)}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px repeat(4, 1fr)',
          borderTop: '1px solid #2a2a3e',
        }}
      >
        <div style={rowLabel}>12운성</div>
        {val(data?.time?.twelveStage)}
        {val(data?.day?.twelveStage)}
        {val(data?.month?.twelveStage)}
        {val(data?.year?.twelveStage)}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px repeat(4, 1fr)',
          borderTop: '1px solid #2a2a3e',
        }}
      >
        <div style={rowLabel}>12신살</div>
        {val(data?.time?.twelveShinsal)}
        {val(data?.day?.twelveShinsal)}
        {val(data?.month?.twelveShinsal)}
        {val(data?.year?.twelveShinsal)}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px repeat(4, 1fr)',
          borderTop: '1px solid #2a2a3e',
        }}
      >
        <div style={rowLabel}>길성</div>
        {val(formatLucky('time'))}
        {val(formatLucky('day'))}
        {val(formatLucky('month'))}
        {val(formatLucky('year'))}
      </div>
    </div>
  );
}