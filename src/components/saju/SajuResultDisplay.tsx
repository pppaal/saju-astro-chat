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

// 천간/지지 값에서 이름 추출 헬퍼 (string | { name: string } 처리)
type GanjiValue = string | { name: string } | null | undefined;
function getGanjiName(val: GanjiValue): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'name' in val) return val.name;
  return '';
}

// 고급 분석 세부 타입 정의
interface GeokgukAnalysis {
  primary?: string;
  category?: string;
  confidence?: string;
  description?: string;
}

interface YongsinAnalysis {
  primaryYongsin?: string;
  secondaryYongsin?: string;
  kibsin?: string;
  daymasterStrength?: string;
  luckyColors?: string[];
  luckyDirection?: string;
  luckyNumbers?: number[];
  description?: string;
  reasoning?: string;
}

interface HyeongchungAnalysis {
  relations?: { type: string; branches: string[]; description?: string }[];
}

interface TonggeunRoot {
  pillar: string;
  branch: string;
  type: string;
  strength: number;
}

interface TonggeunAnalysis {
  totalStrength?: number;
  roots?: TonggeunRoot[];
}

interface DeukryeongAnalysis {
  status?: string;
  strength?: number;
  description?: string;
}

interface JohuYongsinAnalysis {
  primary?: string;
  secondary?: string;
  seasonalNeed?: string;
  interpretation?: string;
}

interface CareerAptitude {
  field: string;
  score: number;
  reason: string;
}

interface SibsinAnalysis {
  count?: Record<string, number>;
  careerAptitude?: CareerAptitude[];
  personality?: {
    strengths?: string[];
    weaknesses?: string[];
  };
}

interface OrganHealth {
  organ: string;
  element: string;
  status: string;
  score: number;
}

interface HealthAnalysis {
  constitution?: string;
  organHealth?: OrganHealth[];
  preventionAdvice?: string[];
}

interface CareerField {
  category: string;
  fitScore: number;
  jobs?: string[];
}

interface CareerAnalysis {
  primaryFields?: CareerField[];
  workStyle?: {
    type?: string;
    description?: string;
    strengths?: string[];
    idealEnvironment?: string[];
  };
  careerAdvice?: string[];
}

interface StrengthScore {
  total?: number;
  level?: string;
}

interface GeokgukScore {
  purity?: number;
  stability?: number;
}

interface YongsinScore {
  fitScore?: number;
}

interface ComprehensiveScore {
  overall?: number;
  grade?: string;
  strength?: StrengthScore;
  geokguk?: GeokgukScore;
  yongsin?: YongsinScore;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

interface ReportSection {
  title: string;
  content: string;
}

interface ComprehensiveReport {
  summary?: string;
  sections?: ReportSection[];
}

interface Interpretations {
  twelveStages?: Record<string, string>;
  elements?: Record<string, string>;
}

// API 응답 타입
export interface SajuApiResponse {
  isPremium?: boolean;
  isLoggedIn?: boolean;
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
  advancedAnalysis?: {
    geokguk?: GeokgukAnalysis;
    yongsin?: YongsinAnalysis;
    hyeongchung?: HyeongchungAnalysis;
    tonggeun?: TonggeunAnalysis;
    deukryeong?: DeukryeongAnalysis;
    johuYongsin?: JohuYongsinAnalysis;
    sibsin?: SibsinAnalysis;
    health?: HealthAnalysis;
    career?: CareerAnalysis;
    score?: ComprehensiveScore;
    report?: ComprehensiveReport;
    interpretations?: Interpretations;
  };
}

interface Props { result: SajuApiResponse; }

/* ===== 오행 5색 매핑 ===== */
type ElementEN = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';
const elementColorClasses: Record<ElementEN, string> = {
  Wood: 'bg-emerald-500', Fire: 'bg-red-400', Earth: 'bg-amber-500', Metal: 'bg-blue-500', Water: 'bg-indigo-500',
};
const elementBarColors: Record<ElementEN, string> = {
  Wood: 'bg-emerald-500', Fire: 'bg-red-400', Earth: 'bg-amber-500', Metal: 'bg-blue-500', Water: 'bg-indigo-500',
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

  useEffect(() => {
    if (!selectedDaeun) return;
    const daeunStartYear = result.birthYear + selectedDaeun.age - 1;
    const newYeonun = getAnnualCycles(daeunStartYear, 10, result.dayMaster);
    setDisplayedYeonun(newYeonun);
    setSelectedYeonun(
      newYeonun.find((y) => y.year === new Date().getFullYear()) || newYeonun[newYeonun.length - 1],
    );
  }, [selectedDaeun, result.birthYear, result.dayMaster]);

  useEffect(() => {
    if (!selectedYeonun) return;
    const newWolun = getMonthlyCycles(selectedYeonun.year, result.dayMaster);
    setDisplayedWolun(newWolun);
    const now = new Date();
    const nowKst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -9, 0, 0, 0));
    const kstMonth = nowKst.getUTCMonth() + 1;
    setSelectedWolun(newWolun.find((m) => m.month === kstMonth) ?? newWolun[newWolun.length - 1]);
  }, [selectedYeonun, result.dayMaster]);

  useEffect(() => {
    if (!selectedWolun) return;
    const y = selectedWolun.year;
    const m = selectedWolun.month;
    const newIljin = getIljinCalendar(y, m, result.dayMaster);
    const fixed = newIljin.filter((d) => d.year === y && d.month === m);
    setDisplayedIljin(fixed);
  }, [selectedWolun, result.dayMaster]);

  if (!result || !result.daeun?.cycles || !selectedDaeun) {
    return (
      <div className="text-white text-center mt-8" role="status" aria-live="polite">
        결과를 표시할 수 없습니다.
      </div>
    );
  }

  const { yearPillar, monthPillar, dayPillar, timePillar, fiveElements, daeun } = result;

  return (
    <article className="mt-12 text-gray-200 font-sans" aria-label="사주 분석 결과">
      <Section title="사주 명식 (Four Pillars)">
        <div className="grid grid-cols-[64px_1fr] gap-x-3 bg-slate-800 p-3.5 rounded-xl border border-slate-600">
          {/* Rail labels */}
          <div className="grid grid-rows-[28px_56px_8px_56px_12px] items-center justify-items-start">
            <div className="h-full" />
            <span className="h-7 inline-flex items-center justify-center px-2.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-blue-300">
              Stem
            </span>
            <div className="h-2" />
            <span className="h-7 inline-flex items-center justify-center px-2.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-amber-300">
              Branch
            </span>
            <div className="h-full" />
          </div>

          {/* Pillars */}
          <div className="grid grid-cols-4 justify-items-center items-start gap-4">
            <PillarBox title="시주" heavenlyStem={timePillar.heavenlyStem} earthlyBranch={timePillar.earthlyBranch} />
            <PillarBox title="일주" heavenlyStem={dayPillar.heavenlyStem} earthlyBranch={dayPillar.earthlyBranch} />
            <PillarBox title="월주" heavenlyStem={monthPillar.heavenlyStem} earthlyBranch={monthPillar.earthlyBranch} />
            <PillarBox title="연주" heavenlyStem={yearPillar.heavenlyStem} earthlyBranch={yearPillar.earthlyBranch} />
          </div>
        </div>

        <PillarSummaryTable
          data={buildPillarView(result.table?.byPillar as unknown as Parameters<typeof buildPillarView>[0])}
        />

        <p className="text-center mt-4 text-base text-gray-400">
          당신의 일간(日干)은{' '}
          <span className="text-amber-500 font-bold">
            {typeof dayPillar.heavenlyStem === 'string'
              ? dayPillar.heavenlyStem
              : (dayPillar.heavenlyStem?.name ?? '')}{' '}
            ({typeof dayPillar.heavenlyStem === 'string'
              ? ''
              : (dayPillar.heavenlyStem?.element ?? '')})
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

      {/* ========== 고급 분석 섹션 ========== */}
      {result.advancedAnalysis && (
        <>
          {(result.advancedAnalysis.geokguk || result.advancedAnalysis.yongsin) && (
            <Section title="격국 · 용신 분석">
              <div className="flex flex-wrap gap-4">
                {result.advancedAnalysis.geokguk && (
                  <AnalysisCard title="격국 (格局)" colorClass="border-blue-400/40 text-blue-400">
                    <CardRow label="격국" value={result.advancedAnalysis.geokguk.primary || '미정'} />
                    {result.advancedAnalysis.geokguk.category && (
                      <CardRow label="분류" value={result.advancedAnalysis.geokguk.category} />
                    )}
                    {result.advancedAnalysis.geokguk.confidence && (
                      <CardRow label="확신도" value={result.advancedAnalysis.geokguk.confidence} />
                    )}
                    {result.advancedAnalysis.geokguk.description && (
                      <CardDesc>{result.advancedAnalysis.geokguk.description}</CardDesc>
                    )}
                  </AnalysisCard>
                )}
                {result.advancedAnalysis.yongsin && (
                  <AnalysisCard title="용신 (用神)" colorClass="border-yellow-400/40 text-yellow-400">
                    <CardRow label="용신" value={result.advancedAnalysis.yongsin.primaryYongsin || '-'} />
                    {result.advancedAnalysis.yongsin.secondaryYongsin && (
                      <CardRow label="희신" value={result.advancedAnalysis.yongsin.secondaryYongsin} />
                    )}
                    {result.advancedAnalysis.yongsin.kibsin && (
                      <CardRow label="기신" value={result.advancedAnalysis.yongsin.kibsin} />
                    )}
                    {result.advancedAnalysis.yongsin.daymasterStrength && (
                      <CardRow label="신강/신약" value={result.advancedAnalysis.yongsin.daymasterStrength} />
                    )}
                    {result.advancedAnalysis.yongsin.luckyColors && (
                      <CardRow label="행운색" value={result.advancedAnalysis.yongsin.luckyColors.join(', ')} />
                    )}
                    {result.advancedAnalysis.yongsin.luckyDirection && (
                      <CardRow label="행운방향" value={result.advancedAnalysis.yongsin.luckyDirection} />
                    )}
                    {result.advancedAnalysis.yongsin.luckyNumbers && (
                      <CardRow label="행운숫자" value={result.advancedAnalysis.yongsin.luckyNumbers.join(', ')} />
                    )}
                    {result.advancedAnalysis.yongsin.description && (
                      <CardDesc>{result.advancedAnalysis.yongsin.description}</CardDesc>
                    )}
                    {result.advancedAnalysis.yongsin.reasoning && (
                      <p className="text-xs text-gray-500 mt-2 italic">{result.advancedAnalysis.yongsin.reasoning}</p>
                    )}
                  </AnalysisCard>
                )}
              </div>
            </Section>
          )}

          <Section title="통근 · 득령 · 조후용신">
            <div className="flex flex-wrap gap-4 relative min-h-[200px]">
              {result.advancedAnalysis.tonggeun && (
                <AnalysisCard title="통근 (通根)" colorClass="border-emerald-400/40 text-emerald-400">
                  <CardRow label="통근 강도" value={String(result.advancedAnalysis.tonggeun.totalStrength || 0)} />
                  {result.advancedAnalysis.tonggeun.roots?.map((root, i) => (
                    <CardRow key={i} label={root.pillar} value={`${root.branch} (${root.type}, ${root.strength})`} />
                  ))}
                </AnalysisCard>
              )}
              {result.advancedAnalysis.deukryeong && (
                <AnalysisCard title="득령 (得令)" colorClass="border-red-400/40 text-red-400">
                  <CardRow label="상태" value={result.advancedAnalysis.deukryeong.status || '-'} />
                  <CardRow label="점수" value={String(result.advancedAnalysis.deukryeong.strength || 0)} />
                  {result.advancedAnalysis.deukryeong.description && (
                    <CardDesc>{result.advancedAnalysis.deukryeong.description}</CardDesc>
                  )}
                </AnalysisCard>
              )}
              {result.advancedAnalysis.johuYongsin && (
                <AnalysisCard title="조후용신 (調候用神)" colorClass="border-indigo-400/40 text-indigo-400">
                  {result.advancedAnalysis.johuYongsin.primary && (
                    <CardRow label="제1용신" value={result.advancedAnalysis.johuYongsin.primary} />
                  )}
                  {result.advancedAnalysis.johuYongsin.secondary && (
                    <CardRow label="제2용신" value={result.advancedAnalysis.johuYongsin.secondary} />
                  )}
                  {result.advancedAnalysis.johuYongsin.seasonalNeed && (
                    <CardRow label="계절적 필요" value={result.advancedAnalysis.johuYongsin.seasonalNeed} />
                  )}
                  {result.advancedAnalysis.johuYongsin.interpretation && (
                    <CardDesc>{result.advancedAnalysis.johuYongsin.interpretation}</CardDesc>
                  )}
                </AnalysisCard>
              )}
            </div>
          </Section>

          <Section title="십신 분석">
            <div className="flex flex-wrap gap-4 relative min-h-[200px]">
              {result.advancedAnalysis.sibsin && (
                <>
                  {result.advancedAnalysis.sibsin.count && (
                    <AnalysisCard title="십신 분포" colorClass="border-amber-400/40 text-amber-400">
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(result.advancedAnalysis.sibsin.count).map(([name, cnt]) => (
                          cnt > 0 && (
                            <div key={name} className="flex flex-col items-center p-2 bg-white/5 rounded-lg">
                              <span className="text-xs text-gray-400 mb-1">{name}</span>
                              <span className="text-base font-bold text-gray-200">{cnt}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </AnalysisCard>
                  )}
                  {result.advancedAnalysis.sibsin.careerAptitude && result.advancedAnalysis.sibsin.careerAptitude.length > 0 && (
                    <AnalysisCard title="직업 적성" colorClass="border-blue-400/40 text-blue-400">
                      {result.advancedAnalysis.sibsin.careerAptitude.map((apt, i) => (
                        <CardRow key={i} label={apt.field} value={`${apt.score}점 - ${apt.reason}`} />
                      ))}
                    </AnalysisCard>
                  )}
                  {result.advancedAnalysis.sibsin.personality && (
                    <AnalysisCard title="성격 분석" colorClass="border-purple-400/40 text-purple-400">
                      {result.advancedAnalysis.sibsin.personality.strengths?.length ? (
                        <CardRow label="강점" value={result.advancedAnalysis.sibsin.personality.strengths.join(', ')} />
                      ) : null}
                      {result.advancedAnalysis.sibsin.personality.weaknesses?.length ? (
                        <CardRow label="약점" value={result.advancedAnalysis.sibsin.personality.weaknesses.join(', ')} />
                      ) : null}
                    </AnalysisCard>
                  )}
                </>
              )}
            </div>
          </Section>

          <Section title="건강 · 직업 분석">
            <div className="flex flex-wrap gap-4 relative min-h-[200px]">
              {result.advancedAnalysis.health && (
                <AnalysisCard title="건강 분석" colorClass="border-red-500/40 text-red-500">
                  {result.advancedAnalysis.health.constitution && (
                    <CardRow label="체질" value={result.advancedAnalysis.health.constitution} />
                  )}
                  {result.advancedAnalysis.health.organHealth?.map((org, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-white/10 text-sm">
                      <span className="text-gray-400">{org.organ} ({org.element}):</span>
                      <span className={`font-medium ${
                        org.status === 'weak' || org.status === 'vulnerable' ? 'text-red-400' :
                        org.status === 'strong' ? 'text-emerald-400' : 'text-gray-400'
                      }`}>
                        {org.status} (점수: {org.score})
                      </span>
                    </div>
                  ))}
                  {result.advancedAnalysis.health.preventionAdvice?.length ? (
                    <CardDesc>{result.advancedAnalysis.health.preventionAdvice.join(', ')}</CardDesc>
                  ) : null}
                </AnalysisCard>
              )}
              {result.advancedAnalysis.career && (
                <AnalysisCard title="직업 적성" colorClass="border-sky-500/40 text-sky-500">
                  {result.advancedAnalysis.career.primaryFields?.map((field, i) => (
                    <CardRow key={i} label={field.category} value={`${field.fitScore}점 - ${field.jobs?.slice(0, 3).join(', ')}`} />
                  ))}
                  {result.advancedAnalysis.career.workStyle && (
                    <>
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <CardRow label="업무 스타일" value={result.advancedAnalysis.career.workStyle.type || '-'} />
                      </div>
                      {result.advancedAnalysis.career.workStyle.description && (
                        <p className="text-xs text-slate-400 mt-1">{result.advancedAnalysis.career.workStyle.description}</p>
                      )}
                      {result.advancedAnalysis.career.workStyle.strengths?.length ? (
                        <CardRow label="강점" value={result.advancedAnalysis.career.workStyle.strengths.join(', ')} />
                      ) : null}
                      {result.advancedAnalysis.career.workStyle.idealEnvironment?.length ? (
                        <CardRow label="이상적 환경" value={result.advancedAnalysis.career.workStyle.idealEnvironment.join(', ')} />
                      ) : null}
                    </>
                  )}
                  {result.advancedAnalysis.career.careerAdvice?.length ? (
                    <CardDesc>{result.advancedAnalysis.career.careerAdvice.join(' ')}</CardDesc>
                  ) : null}
                </AnalysisCard>
              )}
            </div>
          </Section>

          <Section title="종합 점수">
            {result.advancedAnalysis.score && (
              <div className="flex flex-col gap-6 bg-slate-800 p-6 rounded-xl border border-slate-600 relative min-h-[200px]">
                {/* Total Score */}
                <div className="text-center p-4 bg-gradient-to-br from-blue-500/15 to-yellow-500/15 rounded-xl">
                  <div className="text-sm text-gray-400 mb-2">종합 점수</div>
                  <div className="text-4xl font-extrabold text-yellow-400">{result.advancedAnalysis.score.overall ?? '-'}</div>
                  {result.advancedAnalysis.score.grade && (
                    <div className="text-base text-blue-400 mt-1">{result.advancedAnalysis.score.grade}등급</div>
                  )}
                </div>

                {/* Score Breakdown */}
                <div className="flex flex-col gap-3">
                  {result.advancedAnalysis.score.strength && (
                    <ScoreBar
                      label="신강/신약"
                      value={result.advancedAnalysis.score.strength.total || 0}
                      suffix={result.advancedAnalysis.score.strength.level}
                    />
                  )}
                  {result.advancedAnalysis.score.geokguk && (
                    <>
                      <ScoreBar label="격국 순수도" value={result.advancedAnalysis.score.geokguk.purity || 0} />
                      <ScoreBar label="격국 안정도" value={result.advancedAnalysis.score.geokguk.stability || 0} />
                    </>
                  )}
                  {result.advancedAnalysis.score.yongsin && (
                    <ScoreBar label="용신 적합도" value={result.advancedAnalysis.score.yongsin.fitScore || 0} />
                  )}
                </div>

                {result.advancedAnalysis.score.summary && (
                  <CardDesc>{result.advancedAnalysis.score.summary}</CardDesc>
                )}

                {result.advancedAnalysis.score.strengths?.length ? (
                  <div className="mt-3">
                    <span className="block text-gray-400 text-sm mb-1">강점:</span>
                    <ul className="list-disc pl-5 text-emerald-400 text-sm">
                      {result.advancedAnalysis.score.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                ) : null}
                {result.advancedAnalysis.score.weaknesses?.length ? (
                  <div className="mt-2">
                    <span className="block text-gray-400 text-sm mb-1">약점:</span>
                    <ul className="list-disc pl-5 text-red-400 text-sm">
                      {result.advancedAnalysis.score.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                ) : null}
                {result.advancedAnalysis.score.recommendations?.length ? (
                  <div className="mt-2">
                    <span className="block text-gray-400 text-sm mb-1">추천:</span>
                    <ul className="list-disc pl-5 text-yellow-400 text-sm">
                      {result.advancedAnalysis.score.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Section>

          <Section title="종합 리포트">
            {result.advancedAnalysis.report && (
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 relative min-h-[200px]">
                {result.advancedAnalysis.report.summary && (
                  <div className="mb-5 pb-4 border-b border-white/10">
                    <h4 className="text-base font-semibold text-yellow-400 mb-2">요약</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{result.advancedAnalysis.report.summary}</p>
                  </div>
                )}
                {result.advancedAnalysis.report.sections?.map((sec, i) => (
                  <div key={i} className="mb-5 pb-4 border-b border-white/10 last:border-b-0">
                    <h4 className="text-base font-semibold text-yellow-400 mb-2">{sec.title}</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{sec.content}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      <Section title={`대운 (대운수: ${daeun.daeunsu})`}>
        <UnseFlowContainer aria-label="대운 목록">
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
        <UnseFlowContainer aria-label="연운 목록">
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
        <UnseFlowContainer aria-label="월운 목록">
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
    </article>
  );
}

/* ---------- 하위 컴포넌트 ---------- */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-12" aria-labelledby={`section-${title.replace(/\s/g, '-')}`}>
    <h2
      id={`section-${title.replace(/\s/g, '-')}`}
      className="text-lg font-medium border-b border-slate-600 pb-3 mb-6 text-gray-400"
    >
      {title}
    </h2>
    {children}
  </section>
);

const AnalysisCard: React.FC<{ title: string; colorClass: string; children: React.ReactNode }> = ({ title, colorClass, children }) => (
  <div className={`bg-slate-800 p-4 rounded-xl border flex-1 min-w-[280px] ${colorClass.split(' ')[0]}`}>
    <h4 className={`text-base font-semibold mb-3 pb-2 border-b border-current/30 ${colorClass.split(' ')[1] || colorClass}`}>
      {title}
    </h4>
    {children}
  </div>
);

const CardRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1 text-sm">
    <span className="text-gray-400 mr-2">{label}:</span>
    <span className="text-gray-200 font-medium">{value}</span>
  </div>
);

const CardDesc: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-slate-400 mt-3 leading-relaxed p-2 bg-white/[0.03] rounded-md">
    {children}
  </p>
);

const ScoreBar: React.FC<{ label: string; value: number; suffix?: string }> = ({ label, value, suffix }) => (
  <div className="flex items-center gap-2">
    <span className="w-24 text-xs text-gray-400 shrink-0">{label}:</span>
    <div className="flex-1 h-2 bg-slate-700 rounded overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-400 to-yellow-400 rounded transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
    <span className="min-w-[80px] text-right text-sm text-gray-200 shrink-0">
      {value}{suffix ? ` (${suffix})` : ''}
    </span>
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
  const stemName = typeof heavenlyStem === 'string' ? heavenlyStem : (heavenlyStem?.name ?? '');
  const stemSibsin = typeof heavenlyStem === 'string' ? '' : (heavenlyStem?.sibsin ?? '');
  const branchName = typeof earthlyBranch === 'string' ? earthlyBranch : (earthlyBranch?.name ?? '');
  const branchSibsin = typeof earthlyBranch === 'string' ? '' : (earthlyBranch?.sibsin ?? '');

  const stemEl = getElementOfChar(stemName);
  const branchEl = getElementOfChar(branchName);

  return (
    <div className="text-center flex flex-col items-center" role="group" aria-label={`${title} 기둥`}>
      <div className="text-sm text-slate-400 mb-1">{title}</div>
      <div className="text-xs text-gray-500 h-5 flex items-center justify-center">{String(stemSibsin)}</div>
      <div
        className={`w-14 h-14 flex items-center justify-center text-2xl font-extrabold text-white rounded-xl shadow-lg ${
          stemEl ? elementColorClasses[stemEl] : 'bg-blue-500'
        }`}
        aria-label={`천간: ${stemName}`}
      >
        {String(stemName)}
      </div>
      <div className="h-2" />
      <div
        className={`w-14 h-14 flex items-center justify-center text-2xl font-extrabold text-white rounded-xl shadow-lg ${
          branchEl ? elementColorClasses[branchEl] : 'bg-amber-500'
        }`}
        aria-label={`지지: ${branchName}`}
      >
        {String(branchName)}
      </div>
      <div className="text-xs text-gray-500 mt-1.5 h-5 flex items-center justify-center">{String(branchSibsin)}</div>
    </div>
  );
};

const OhaengDistribution = ({ ohaengData }: { ohaengData: { [k in 'wood'|'fire'|'earth'|'metal'|'water']: number } }) => {
  const elements = [
    { name: '목', key: 'wood' as const, colorClass: elementBarColors.Wood },
    { name: '화', key: 'fire' as const, colorClass: elementBarColors.Fire },
    { name: '토', key: 'earth' as const, colorClass: elementBarColors.Earth },
    { name: '금', key: 'metal' as const, colorClass: elementBarColors.Metal },
    { name: '수', key: 'water' as const, colorClass: elementBarColors.Water },
  ];
  const total = Object.values(ohaengData).reduce((s, c) => s + c, 0);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-600" role="img" aria-label="오행 분포 차트">
      {elements.map((el) => {
        const count = ohaengData[el.key] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={el.name} className="flex items-center mb-4 last:mb-0">
            <span className="w-10 text-gray-300">{el.name}</span>
            <div className="flex-1 bg-slate-700 rounded h-5 mr-4 overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${el.colorClass}`}
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={total}
              />
            </div>
            <span className="w-5 text-right text-gray-300">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

const UnseFlowContainer: React.FC<{ children: React.ReactNode; 'aria-label'?: string }> = ({ children, 'aria-label': ariaLabel }) => (
  <div
    className="flex overflow-x-auto py-4 px-2 bg-slate-800 rounded-xl border border-slate-600"
    role="listbox"
    aria-label={ariaLabel}
  >
    {children}
  </div>
);

const UnsePillar = ({
  topText, topSubText, cheon, ji, bottomSubText, onClick, isSelected,
}: {
  topText: string;
  topSubText: string | object;
  cheon: GanjiValue;
  ji: GanjiValue;
  bottomSubText: string | object;
  onClick?: () => void;
  isSelected?: boolean
}) => {
  const cheonStr = getGanjiName(cheon);
  const jiStr = getGanjiName(ji);
  const topSubStr = typeof topSubText === 'string' ? topSubText : String(topSubText ?? '');
  const bottomSubStr = typeof bottomSubText === 'string' ? bottomSubText : String(bottomSubText ?? '');

  const topEl = getElementOfChar(cheonStr);
  const bottomEl = getElementOfChar(jiStr);

  return (
    <button
      type="button"
      className={`flex-none w-16 text-center px-1 py-1.5 rounded-lg transition-all duration-200
        ${isSelected
          ? 'bg-blue-500/20 border border-blue-500'
          : 'border border-transparent hover:bg-white/5'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
      aria-label={`${topText} ${cheonStr}${jiStr}`}
    >
      <div className="text-xs text-gray-400 whitespace-nowrap">{topText}</div>
      <div className="text-xs text-gray-500 h-5 flex items-center justify-center">{topSubStr}</div>
      <div
        className={`py-2.5 text-lg font-bold rounded text-white border-b border-slate-700 ${
          topEl ? elementColorClasses[topEl] : 'bg-slate-700'
        }`}
      >
        {cheonStr}
      </div>
      <div
        className={`py-2.5 text-lg font-bold rounded text-white ${
          bottomEl ? elementColorClasses[bottomEl] : 'bg-slate-700'
        }`}
      >
        {jiStr}
      </div>
      <div className="text-xs text-gray-500 h-5 flex items-center justify-center">{bottomSubStr}</div>
    </button>
  );
};

const RelationsPanel: React.FC<{ relations?: { kind: string; pillars: ('year'|'month'|'day'|'time')[]; detail?: string }[] }> = ({ relations }) => {
  if (!relations || relations.length === 0) {
    return <div className="text-slate-400">표시할 합·충 정보가 없습니다.</div>;
  }

  const labelMap: Record<'year'|'month'|'day'|'time', string> = {
    time: '시지', day: '일지', month: '월지', year: '연지'
  };

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-800 border border-slate-600 rounded-xl p-3"
      role="list"
      aria-label="합충 관계 목록"
    >
      {relations.map((r, i) => (
        <div
          key={i}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5"
          role="listitem"
        >
          <div className="font-extrabold text-yellow-400 mb-1.5">{r.kind}</div>
          <div className="text-sm text-slate-300">{r.pillars.map((p) => labelMap[p]).join(' · ')}</div>
          {r.detail && <div className="mt-1.5 text-xs text-slate-400">{r.detail}</div>}
        </div>
      ))}
    </div>
  );
};

function IljinCalendar({ iljinData, year, month }: { iljinData: IljinData[]; year?: number; month?: number }) {
  const makeKstDateUTC = (y: number, m0: number, d: number) => new Date(Date.UTC(y, m0, d, 15, 0, 0, 0));
  const now = new Date();
  const kstNow = makeKstDateUTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const y = year ?? kstNow.getUTCFullYear();
  const m0 = month ? month - 1 : kstNow.getUTCMonth();
  const headers = ['일','월','화','수','목','금','토'];
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
