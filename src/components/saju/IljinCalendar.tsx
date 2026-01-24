'use client';

import React from 'react';
import type { IljinData } from '@/lib/Saju';

type GanjiValue = string | { name: string } | null | undefined;

function getGanjiName(val: GanjiValue): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'name' in val) return val.name;
  return '';
}

interface IljinCalendarProps {
  iljinData: IljinData[];
  year?: number;
  month?: number;
}

export default function IljinCalendar({ iljinData, year, month }: IljinCalendarProps) {
  const makeKstDateUTC = (y: number, m0: number, d: number) => new Date(Date.UTC(y, m0, d, 15, 0, 0, 0));
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
  for (const d of iljinData) iljinMap.set(keyOf(d.year, d.month, d.day), d);

  const calendarDays: React.ReactNode[] = [];
  for (let i = 0; i < leading; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="border border-slate-600 p-2 min-h-[80px]" aria-hidden="true" />
    );
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
        className={`bg-slate-800 p-2 min-h-[80px] text-left relative
          ${isToday ? 'border-2 border-blue-500' : 'border border-slate-600'}
          ${iljin ? 'opacity-100' : 'opacity-60'}
        `}
        role="gridcell"
        aria-label={`${d}일 ${ganjiStr}`}
      >
        <div className={`font-bold ${weekdayIndex === 0 ? 'text-red-400' : 'text-gray-200'}`}>{d}</div>
        <div className="text-xs text-gray-400 mt-1">{ganjiStr}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">{sibsinStr}</div>
        {!iljin && (
          <div className="absolute bottom-1.5 right-2 text-[11px] text-gray-600">일진 없음</div>
        )}
        {iljin?.isCheoneulGwiin && (
          <span className="absolute top-1 right-1 text-xs" aria-label="천을귀인">⭐</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-4 rounded-xl" role="grid" aria-label={`${y}년 ${m0 + 1}월 일진 달력`}>
      <div className="flex justify-center items-center mb-4">
        <h3 className="text-lg font-bold text-gray-200">{y}년 {m0 + 1}월</h3>
      </div>
      <div className="grid grid-cols-7" role="row">
        {headers.map((day, i) => (
          <div
            key={day}
            className={`border border-slate-600 p-2 text-center font-bold bg-slate-800 ${
              i === 0 ? 'text-red-400' : 'text-gray-400'
            }`}
            role="columnheader"
          >
            {day}
          </div>
        ))}
        {calendarDays}
      </div>
    </div>
  );
}
