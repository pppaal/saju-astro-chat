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
  if (!data) {return null;}

  const toDisplayString = (v: unknown): string => {
    if (v == null) {return '';}
    if (typeof v === 'string') {return v.trim();}
    if (typeof v === 'number' || typeof v === 'boolean') {return String(v);}
    if (Array.isArray(v)) {return v.map(toDisplayString).filter(Boolean).join('\n');}
    if (typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      if (obj.name && typeof obj.name === 'string') {return obj.name;}
      if (obj.text && typeof obj.text === 'string') {return obj.text;}
      if (obj.display && typeof obj.display === 'string') {return obj.display;}
      if (obj.chogi || obj.junggi || obj.jeonggi) {
        const parts: string[] = [];
        if (obj.chogi && typeof (obj.chogi as Record<string, unknown>)?.name === 'string') {
          parts.push((obj.chogi as Record<string, unknown>).name as string);
        }
        if (obj.junggi && typeof (obj.junggi as Record<string, unknown>)?.name === 'string') {
          parts.push((obj.junggi as Record<string, unknown>).name as string);
        }
        if (obj.jeonggi && typeof (obj.jeonggi as Record<string, unknown>)?.name === 'string') {
          parts.push((obj.jeonggi as Record<string, unknown>).name as string);
        }
        return parts.join(' ');
      }
      try {
        return JSON.stringify(v);
      } catch {
        return '';
      }
    }
    return String(v);
  };

  const formatLucky = (k: 'time' | 'day' | 'month' | 'year'): string => {
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
    const lucky = (data)?.[k]?.lucky as string[] | undefined;
    return (lucky || []).map((s) => (s ?? '').toString().trim()).filter(Boolean).join('\n');
  };

  const Cell = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 py-2.5 border-l border-slate-700 whitespace-pre-wrap leading-relaxed text-gray-200">
      {children || '—'}
    </div>
  );

  return (
    <div
      className="mt-4 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden"
      role="table"
      aria-label="사주 요약 테이블"
    >
      {/* Header Row */}
      <div
        className="grid grid-cols-[140px_repeat(4,1fr)] border-b border-slate-600"
        role="row"
      >
        <div className="px-3 py-2.5 text-slate-400 font-bold" role="columnheader">구분</div>
        <div className="px-3 py-2.5 border-l border-slate-700 text-center font-extrabold text-blue-200" role="columnheader">시지</div>
        <div className="px-3 py-2.5 border-l border-slate-700 text-center font-extrabold text-blue-200" role="columnheader">일지</div>
        <div className="px-3 py-2.5 border-l border-slate-700 text-center font-extrabold text-blue-200" role="columnheader">월지</div>
        <div className="px-3 py-2.5 border-l border-slate-700 text-center font-extrabold text-blue-200" role="columnheader">연지</div>
      </div>

      {/* 지장간 Row */}
      <div className="grid grid-cols-[140px_repeat(4,1fr)] border-t border-slate-700" role="row">
        <div className="px-3 py-2.5 text-slate-400 font-semibold border-r border-slate-700" role="rowheader">지장간</div>
        <Cell>{toDisplayString(data?.time?.jijanggan)}</Cell>
        <Cell>{toDisplayString(data?.day?.jijanggan)}</Cell>
        <Cell>{toDisplayString(data?.month?.jijanggan)}</Cell>
        <Cell>{toDisplayString(data?.year?.jijanggan)}</Cell>
      </div>

      {/* 12운성 Row */}
      <div className="grid grid-cols-[140px_repeat(4,1fr)] border-t border-slate-700" role="row">
        <div className="px-3 py-2.5 text-slate-400 font-semibold border-r border-slate-700" role="rowheader">12운성</div>
        <Cell>{toDisplayString(data?.time?.twelveStage)}</Cell>
        <Cell>{toDisplayString(data?.day?.twelveStage)}</Cell>
        <Cell>{toDisplayString(data?.month?.twelveStage)}</Cell>
        <Cell>{toDisplayString(data?.year?.twelveStage)}</Cell>
      </div>

      {/* 12신살 Row */}
      <div className="grid grid-cols-[140px_repeat(4,1fr)] border-t border-slate-700" role="row">
        <div className="px-3 py-2.5 text-slate-400 font-semibold border-r border-slate-700" role="rowheader">12신살</div>
        <Cell>{toDisplayString(data?.time?.twelveShinsal)}</Cell>
        <Cell>{toDisplayString(data?.day?.twelveShinsal)}</Cell>
        <Cell>{toDisplayString(data?.month?.twelveShinsal)}</Cell>
        <Cell>{toDisplayString(data?.year?.twelveShinsal)}</Cell>
      </div>

      {/* 길성 Row */}
      <div className="grid grid-cols-[140px_repeat(4,1fr)] border-t border-slate-700" role="row">
        <div className="px-3 py-2.5 text-slate-400 font-semibold border-r border-slate-700" role="rowheader">길성</div>
        <Cell>{formatLucky('time')}</Cell>
        <Cell>{formatLucky('day')}</Cell>
        <Cell>{formatLucky('month')}</Cell>
        <Cell>{formatLucky('year')}</Cell>
      </div>
    </div>
  );
}
