// src/components/saju/SajuResultDisplay.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
  type DayMaster,
  type DaeunData,
  type YeonunData,
  type WolunData,
  type IljinData,
  type PillarData,
} from '../../lib/Saju';
import PillarSummaryTable from './PillarSummaryTable';
import { buildPillarView } from '../../adapters/map-12';

// API 응답 타입
export interface SajuApiResponse {
  birthYear: number;
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;
  daeun: { daeunsu: number; cycles: DaeunData[] };
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number };
  dayMaster: DayMaster;
  yeonun: YeonunData[];
  wolun: WolunData[];
  iljin: IljinData[];
  table?: {
    byPillar: {
      time?: { jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
      day?:  { jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
      month?:{ jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
      year?: { jijanggan?: { raw?: string } | string; twelveStage?: string; twelveShinsal?: string | string[]; lucky?: string[] };
    };
  };
  relations?: { kind: string; pillars: ('year'|'month'|'day'|'time')[]; detail?: string }[];
}

interface Props { result: SajuApiResponse; }

/* ===== 오행 5색 매핑 ===== */
type ElementEN = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';
const elementColors: Record<ElementEN, string> = {
  Wood: '#2dbd7f', Fire: '#ff6b6b', Earth: '#f3a73f', Metal: '#4a90e2', Water: '#5b6bfa',
};
const stemElement: Record<string, ElementEN> = {
  갑: 'Wood', 을: 'Wood', 병: 'Fire', 정: 'Fire', 무: 'Earth', 기: 'Earth', 경: 'Metal', 신: 'Metal', 임: 'Water', 계: 'Water',
  甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth', 己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water',
};
const branchElement: Record<string, ElementEN> = {
  자: 'Water', 축: 'Earth', 인: 'Wood', 묘: 'Wood', 진: 'Earth', 사: 'Fire', 오: 'Fire', 미: 'Earth', 신: 'Metal', 유: 'Metal', 술: 'Earth', 해: 'Water',
  子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water',
};
function getElementOfChar(ch: string): ElementEN | null {
  if (stemElement[ch]) return stemElement[ch];
  if (branchElement[ch]) return branchElement[ch];
  return null;
}

/* =========================================== */

export default function SajuResultDisplay({ result }: Props) {
  const [selectedDaeun, setSelectedDaeun] = useState<DaeunData | null>(null);
  const [selectedYeonun, setSelectedYeonun] = useState<YeonunData | undefined>();
  const [selectedWolun, setSelectedWolun] = useState<WolunData | undefined>();
  const [displayedYeonun, setDisplayedYeonun] = useState<YeonunData[]>([]);
  const [displayedWolun, setDisplayedWolun] = useState<WolunData[]>([]);
  const [displayedIljin, setDisplayedIljin] = useState<IljinData[]>([]);
  
  // 초기: 대운 선택
  useEffect(() => {
    if (result && result.daeun?.cycles?.length) {
      const currentYear = new Date().getFullYear();
      const currentAge = currentYear - result.birthYear + 1;
      const initialDaeun =
        result.daeun.cycles.find((d) => currentAge >= d.age && currentAge < d.age + 10) ||
        result.daeun.cycles[0];
      setSelectedDaeun(initialDaeun);
    }
  }, [result]);

  // 연운 계산
  useEffect(() => {
    if (!selectedDaeun) return;
    const daeunStartYear = result.birthYear + selectedDaeun.age - 1;
    const newYeonun = getAnnualCycles(daeunStartYear, 10, result.dayMaster);
    setDisplayedYeonun(newYeonun);
    setSelectedYeonun(
      newYeonun.find((y) => y.year === new Date().getFullYear()) || newYeonun[newYeonun.length - 1],
    );
  }, [selectedDaeun, result.birthYear, result.dayMaster]);

  // 월운 계산 (KST 현재 월)
  useEffect(() => {
    if (!selectedYeonun) return;
    const newWolun = getMonthlyCycles(selectedYeonun.year, result.dayMaster);
    setDisplayedWolun(newWolun);

    const now = new Date();
    const nowKst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -9, 0, 0, 0));
    const kstMonth = nowKst.getUTCMonth() + 1;
    setSelectedWolun(newWolun.find((m) => m.month === kstMonth) ?? newWolun[newWolun.length - 1]);
  }, [selectedYeonun, result.dayMaster]);

  // 일진 달력
  useEffect(() => {
    if (!selectedWolun) return;
    const y = selectedWolun.year;
    const m = selectedWolun.month;
    const newIljin = getIljinCalendar(y, m, result.dayMaster);
    const fixed = newIljin.filter((d) => d.year === y && d.month === m);
    setDisplayedIljin(fixed);
  }, [selectedWolun, result.dayMaster]);

  if (!result || !result.daeun?.cycles || !selectedDaeun) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>결과를 표시할 수 없습니다.</div>;
  }

  const { yearPillar, monthPillar, dayPillar, timePillar, fiveElements, daeun } = result;

  return (
    <div style={{ marginTop: '3rem', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
      <Section title="사주 명식 (Four Pillars)">
        <div style={pillarsCompactGrid}>
          <div style={railCompact}>
            <div style={railSpacerTop} />
            <div style={railChipStem}>Stem</div>
            <div style={railGap8} />
            <div style={railChipBranch}>Branch</div>
            <div style={railSpacerBottom} />
          </div>

          <div style={pillarsCompactRow}>
            <PillarBox title="시주" heavenlyStem={timePillar.heavenlyStem} earthlyBranch={timePillar.earthlyBranch} />
            <PillarBox title="일주" heavenlyStem={dayPillar.heavenlyStem} earthlyBranch={dayPillar.earthlyBranch} />
            <PillarBox title="월주" heavenlyStem={monthPillar.heavenlyStem} earthlyBranch={monthPillar.earthlyBranch} />
            <PillarBox title="연주" heavenlyStem={yearPillar.heavenlyStem} earthlyBranch={yearPillar.earthlyBranch} />
          </div>
        </div>

        {/* 표: 외부 컴포넌트 + 어댑터 정규화 */}
        <PillarSummaryTable
data={buildPillarView((result as any)?.table?.byPillar)}
/>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '1rem', color: '#a0a0a0' }}>
          당신의 일간(日干)은{' '}
          <span style={{ color: '#f3a73f', fontWeight: 700 }}>
            {dayPillar.heavenlyStem.name} ({dayPillar.heavenlyStem.element})
          </span>{' '}
          입니다.
        </p>
      </Section>

      <Section title="Five Elements">
        {fiveElements && <OhaengDistribution ohaengData={fiveElements} />}
      </Section>

      <Section title="합·충 관계">
        <RelationsPanel relations={result.relations} />
      </Section>

      <Section title={`대운 (대운수: ${daeun.daeunsu})`}>
        <UnseFlowContainer>
          {daeun.cycles.map((item) => (
            <UnsePillar
              key={`daeun-${item.age}`}
              topText={`${item.age}세`}
              topSubText={item.sibsin.cheon}
              cheon={item.heavenlyStem}
              ji={item.earthlyBranch}
              bottomSubText={item.sibsin.ji}
              onClick={() => setSelectedDaeun(item)}
              isSelected={selectedDaeun?.age === item.age}
            />
          ))}
        </UnseFlowContainer>
      </Section>

      <Section title="연운 (Annual Cycle)">
        <UnseFlowContainer>
          {displayedYeonun.map((item) => (
            <UnsePillar
              key={`yeonun-${item.year}`}
              topText={`${item.year}년`}
              topSubText={item.sibsin.cheon}
              cheon={item.heavenlyStem}
              ji={item.earthlyBranch}
              bottomSubText={item.sibsin.ji}
              onClick={() => setSelectedYeonun(item)}
              isSelected={selectedYeonun?.year === item.year}
            />
          ))}
        </UnseFlowContainer>
      </Section>

      <Section title="월운 (Monthly Cycle)">
        <UnseFlowContainer>
          {displayedWolun.map((item) => (
            <UnsePillar
              key={`wolun-${item.month}`}
              topText={`${item.month}월`}
              topSubText={item.sibsin.cheon}
              cheon={item.heavenlyStem}
              ji={item.earthlyBranch}
              bottomSubText={item.sibsin.ji}
              onClick={() => setSelectedWolun(item)}
              isSelected={selectedWolun?.month === item.month && selectedWolun?.year === item.year}
            />
          ))}
        </UnseFlowContainer>
      </Section>

      <Section title="일진 달력 (Daily Calendar)">
        <IljinCalendar iljinData={displayedIljin} year={selectedWolun?.year} month={selectedWolun?.month} />
      </Section>
    </div>
  );
}

/* ---------- 하위 컴포넌트 & 스타일 ---------- */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '3rem' }}>
    <h2 style={{ fontSize: '1.1rem', fontWeight: 500, borderBottom: '1px solid #4f4f7a', paddingBottom: '0.8rem', marginBottom: '1.5rem', color: '#c0c0c0' }}>
      {title}
    </h2>
    {children}
  </div>
);

const PillarBox = ({
  title,
  heavenlyStem,
  earthlyBranch,
}: {
  title: string;
  heavenlyStem: PillarData['heavenlyStem'];
  earthlyBranch: PillarData['earthlyBranch'];
}) => {
  const stemEl = getElementOfChar(heavenlyStem.name);
  const branchEl = getElementOfChar(earthlyBranch.name);
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '0.9rem', color: '#b8b8c7', marginBottom: 4 }}>{title}</div>
      <div style={sibsinTextStyle}>{heavenlyStem.sibsin}</div>
      <div style={{ ...pillarCellStyle, backgroundColor: stemEl ? elementColors[stemEl] : '#4a80e2' }}>{heavenlyStem.name}</div>
      <div style={{ height: 8 }} />
      <div style={{ ...pillarCellStyle, backgroundColor: branchEl ? elementColors[branchEl] : '#f3a73f' }}>{earthlyBranch.name}</div>
      <div style={{ ...sibsinTextStyle, marginTop: 6 }}>{earthlyBranch.sibsin}</div>
    </div>
  );
};

const sibsinTextStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: '#888', height: '1.3em', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const pillarCellStyle: React.CSSProperties = {
  width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1.6rem', fontWeight: 800, color: '#fff', borderRadius: 12, boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
};

const OhaengDistribution = ({ ohaengData }: { ohaengData: { [k in 'wood'|'fire'|'earth'|'metal'|'water']: number } }) => {
  const elements = [
    { name: '목', key: 'wood' as const, color: '#2dbd7f' },
    { name: '화', key: 'fire' as const, color: '#ff6b6b' },
    { name: '토', key: 'earth' as const, color: '#f3a73f' },
    { name: '금', key: 'metal' as const, color: '#4a90e2' },
    { name: '수', key: 'water' as const, color: '#5b6bfa' },
  ];
  const total = Object.values(ohaengData).reduce((s, c) => s + c, 0);
  return (
    <div style={{ background: '#1e1e2f', padding: '1.5rem', borderRadius: 12, border: '1px solid #4f4f7a' }}>
      {elements.map((el) => {
        const count = ohaengData[el.key] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={el.name} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ width: 40 }}>{el.name}</span>
            <div style={{ flex: 1, background: '#161625', borderRadius: 4, height: 20, marginRight: '1rem' }}>
              <div style={{ width: `${percentage}%`, background: el.color, height: '100%', borderRadius: 4, transition: 'width 0.5s ease-in-out' }} />
            </div>
            <span style={{ width: 20, textAlign: 'right' }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
};

const UnseFlowContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', overflowX: 'auto', padding: '1rem 0.5rem', background: '#1e1e2f', borderRadius: 12, border: '1px solid #4f4f7a' }}>
    {children}
  </div>
);

const UnsePillar = ({
  topText, topSubText, cheon, ji, bottomSubText, onClick, isSelected,
}: { topText: string; topSubText: string; cheon: string; ji: string; bottomSubText: string; onClick?: () => void; isSelected?: boolean }) => {
  const topEl = getElementOfChar(cheon);
  const bottomEl = getElementOfChar(ji);
  return (
    <div
      style={{
        flex: '0 0 65px', textAlign: 'center', padding: '0 4px', cursor: onClick ? 'pointer' : 'default',
        background: isSelected ? 'rgba(58,109,240,0.2)' : 'transparent', borderRadius: 8,
        border: isSelected ? '1px solid #3a6df0' : '1px solid transparent', transition: 'all 0.2s ease-in-out',
        paddingTop: 5, paddingBottom: 5,
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '0.8rem', color: '#a0a0a0', whiteSpace: 'nowrap' }}>{topText}</div>
      <div style={sibsinTextStyle}>{topSubText}</div>
      <div style={{ padding: '0.6rem 0', fontSize: '1.2rem', fontWeight: 'bold', background: topEl ? elementColors[topEl] : '#2a2a3e', borderRadius: 4, color: '#fff', borderBottom: '1px solid #161625' }}>{cheon}</div>
      <div style={{ padding: '0.6rem 0', fontSize: '1.2rem', fontWeight: 'bold', background: bottomEl ? elementColors[bottomEl] : '#2a2a3e', borderRadius: 4, color: '#fff' }}>{ji}</div>
      <div style={sibsinTextStyle}>{bottomSubText}</div>
    </div>
  );
};

const RelationsPanel: React.FC<{ relations?: { kind: string; pillars: ('year'|'month'|'day'|'time')[]; detail?: string }[] }> = ({ relations }) => {
  if (!relations || relations.length === 0) return <div style={{ color: '#9aa2c1' }}>표시할 합·충 정보가 없습니다.</div>;
  const labelMap: Record<'year'|'month'|'day'|'time', string> = { time: '시지', day: '일지', month: '월지', year: '연지' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, background: '#1e1e2f', border: '1px solid #4f4f7a', borderRadius: 12, padding: 12 }}>
      {relations.map((r, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, color: '#ffd479', marginBottom: 6 }}>{r.kind}</div>
          <div style={{ fontSize: 13, color: '#cfd3e6' }}>{r.pillars.map((p) => labelMap[p]).join(' · ')}</div>
          {r.detail && <div style={{ marginTop: 6, fontSize: 12, color: '#9aa2c1' }}>{r.detail}</div>}
        </div>
      ))}
    </div>
  );
};

const calendarCellStyle: React.CSSProperties = { border: '1px solid #4f4f7a', padding: '0.5rem', minHeight: 80, textAlign: 'left' };
const calendarHeaderStyle: React.CSSProperties = { ...calendarCellStyle, textAlign: 'center', fontWeight: 'bold', background: '#1e1e2f' };

const pillarsCompactGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '64px 1fr', columnGap: 12, background: '#1e1e2f', padding: 14, borderRadius: 12, border: '1px solid #4f4f7a' };
const railCompact: React.CSSProperties = { display: 'grid', gridTemplateRows: '28px 56px 8px 56px 12px', alignItems: 'center', justifyItems: 'start' };
const railChipBase: React.CSSProperties = { height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 600, lineHeight: 1 };
const railChipStem: React.CSSProperties = { ...railChipBase, color: '#8da1ff' };
const railChipBranch: React.CSSProperties = { ...railChipBase, color: '#ffcf8a' };
const railSpacerTop: React.CSSProperties = { height: '100%' };
const railSpacerBottom: React.CSSProperties = { height: '100%' };
const railGap8: React.CSSProperties = { height: 8 };
const pillarsCompactRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(72px, 1fr))', justifyItems: 'center', alignItems: 'start', gap: 16 };

/* 달력 컴포넌트는 위에서 정의한 IljinCalendar를 그대로 사용 */
function IljinCalendar({ iljinData, year, month }: { iljinData: IljinData[]; year?: number; month?: number }) {
  const makeKstDateUTC = (y: number, m0: number, d: number) => new Date(Date.UTC(y, m0, d, 15, 0, 0, 0));
  const now = new Date(); const kstNow = makeKstDateUTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const y = year ?? kstNow.getUTCFullYear(); const m0 = month ? month - 1 : kstNow.getUTCMonth();
  const headers = ['일','월','화','수','목','금','토'];
  const firstUtcForKstMidnight = new Date(Date.UTC(y, m0, 1, 15, 0, 0, 0));
  const firstDow = firstUtcForKstMidnight.getUTCDay(); const leading = firstDow;
  const nextFirstUtcForKstMidnight = new Date(Date.UTC(y, m0 + 1, 1, 15, 0, 0, 0));
  const lastDayKst = new Date(nextFirstUtcForKstMidnight.getTime() - 86400000);
  const daysInMonth = lastDayKst.getUTCDate();
  const keyOf = (Y:number,M:number,D:number)=>`${Number(Y)}-${Number(M)}-${Number(D)}`;
  const iljinMap = new Map<string, IljinData>(); for (const d of iljinData) iljinMap.set(keyOf(d.year,d.month,d.day), d);
  const calendarDays: React.ReactNode[] = [];
  for (let i=0;i<leading;i++) calendarDays.push(<div key={`empty-${i}`} style={calendarCellStyle} />);
  for (let d=1; d<=daysInMonth; d++){
    const cellKst = makeKstDateUTC(y, m0, d); const isToday = kstNow.getTime() === cellKst.getTime();
    const ty=cellKst.getUTCFullYear(); const tm=cellKst.getUTCMonth()+1; const td=cellKst.getUTCDate();
    const iljin = iljinMap.get(keyOf(ty,tm,td));
    const ganjiStr = iljin ? `${iljin.heavenlyStem}${iljin.earthlyBranch}` : '—';
    const sibsinStr = iljin ? `${iljin.sibsin.cheon}/${iljin.sibsin.ji}` : '';
    const weekdayIndex = (firstDow + (d - 1)) % 7;
    calendarDays.push(
      <div key={d} style={{ ...calendarCellStyle, background: '#1e1e2f', border: isToday ? '2px solid #3a6df0' : '1px solid #4f4f7a', position: 'relative', opacity: iljin ? 1 : 0.6 }}>
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
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{y}년 {m0+1}월</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {headers.map((d, i) => <div key={d} style={{ ...calendarHeaderStyle, color: i===0 ? '#ff6b6b' : '#c0c0c0' }}>{d}</div>)}
        {calendarDays}
      </div>
    </div>
  );
}