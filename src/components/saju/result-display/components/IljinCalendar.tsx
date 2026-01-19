// src/components/saju/result-display/components/IljinCalendar.tsx

import React from 'react';
import type { IljinData, GanjiValue } from '../types';
import { getGanjiName, makeKstDateUTC } from '../utils';
import { calendarCellStyle, calendarHeaderStyle } from '../styles';

interface IljinCalendarProps {
  iljinData: IljinData[];
  year?: number;
  month?: number;
}

export default function IljinCalendar({ iljinData, year, month }: IljinCalendarProps) {
  const now = new Date();
  const kstNow = makeKstDateUTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const y = year ?? kstNow.getUTCFullYear();
  const m0 = month ? month - 1 : kstNow.getUTCMonth();
  const headers = ['일', '월', '화', '수', '목', '금', '토'];

  const firstUtcForKstMidnight = new Date(Date.UTC(y, m0, 1, 15, 0, 0, 0));
  const firstDow = firstUtcForKstMidnight.getUTCDay();
  const leading = firstDow;

  const nextFirstUtcForKstMidnight = new Date(Date.UTC(y, m0 + 1, 1, 15, 0, 0, 0));
  const lastDayKst = new Date(nextFirstUtcForKstMidnight.getTime() - 86400000);
  const daysInMonth = lastDayKst.getUTCDate();

  const keyOf = (Y: number, M: number, D: number) => `${Number(Y)}-${Number(M)}-${Number(D)}`;
  const iljinMap = new Map<string, IljinData>();
  for (const d of iljinData) {
    iljinMap.set(keyOf(d.year, d.month, d.day), d);
  }

  const calendarDays: React.ReactNode[] = [];
  for (let i = 0; i < leading; i++) {
    calendarDays.push(<div key={`empty-${i}`} style={calendarCellStyle} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellKst = makeKstDateUTC(y, m0, d);
    const isToday = kstNow.getTime() === cellKst.getTime();
    const ty = cellKst.getUTCFullYear();
    const tm = cellKst.getUTCMonth() + 1;
    const td = cellKst.getUTCDate();
    const iljin = iljinMap.get(keyOf(ty, tm, td));

    const stemStr = iljin ? getGanjiName(iljin.heavenlyStem as GanjiValue) : '';
    const branchStr = iljin ? getGanjiName(iljin.earthlyBranch as GanjiValue) : '';
    const ganjiStr = iljin ? `${stemStr}${branchStr}` : '—';
    const sibsinCheon = iljin?.sibsin?.cheon ? (typeof iljin.sibsin.cheon === 'string' ? iljin.sibsin.cheon : String(iljin.sibsin.cheon)) : '';
    const sibsinJi = iljin?.sibsin?.ji ? (typeof iljin.sibsin.ji === 'string' ? iljin.sibsin.ji : String(iljin.sibsin.ji)) : '';
    const sibsinStr = iljin ? `${sibsinCheon}/${sibsinJi}` : '';
    const weekdayIndex = (firstDow + (d - 1)) % 7;

    calendarDays.push(
      <div
        key={d}
        style={{
          ...calendarCellStyle,
          background: '#1e1e2f',
          border: isToday ? '2px solid #3a6df0' : '1px solid #4f4f7a',
          position: 'relative',
          opacity: iljin ? 1 : 0.6,
        }}
      >
        <div style={{ fontWeight: 'bold', color: weekdayIndex === 0 ? '#ff6b6b' : '#e0e0e0' }}>{d}</div>
        <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: 4 }}>{ganjiStr}</div>
        <div style={{ fontSize: '0.7rem', color: '#777', marginTop: 2 }}>{sibsinStr}</div>
        {!iljin && <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, color: '#666' }}>일진 없음</div>}
        {iljin?.isCheoneulGwiin && <span style={{ position: 'absolute', top: 5, right: 5, fontSize: '0.8rem' }}>⭐</span>}
      </div>
    );
  }

  return (
    <div style={{ background: '#161625', padding: '1rem', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{y}년 {m0 + 1}월</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {headers.map((d, i) => (
          <div key={d} style={{ ...calendarHeaderStyle, color: i === 0 ? '#ff6b6b' : '#c0c0c0' }}>{d}</div>
        ))}
        {calendarDays}
      </div>
    </div>
  );
}
