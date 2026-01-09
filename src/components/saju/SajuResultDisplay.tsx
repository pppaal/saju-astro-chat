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
  // 프리미엄 상태
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
  // 고급 분석 데이터 (타입 정의 완료)
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

// 프리미엄 잠금 오버레이 컴포넌트 (reserved for future use)
const _PremiumLockOverlay: React.FC<{ isLoggedIn?: boolean; feature: string }> = ({ isLoggedIn, feature }) => (
  <div style={lockOverlayStyle}>
    <div style={lockContentStyle}>
      <div style={lockIconStyle}>🔒</div>
      <div style={lockTitleStyle}>{feature}</div>
      <p style={lockDescStyle}>
        {isLoggedIn
          ? '이 기능은 프리미엄 회원 전용입니다.'
          : '로그인 후 프리미엄 구독으로 이용 가능합니다.'}
      </p>
      <a href="/pricing" style={lockButtonStyle}>
        프리미엄 구독하기
      </a>
    </div>
  </div>
);

// 잠금 오버레이 스타일
const lockOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(22, 22, 37, 0.92)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  zIndex: 10,
};
const lockContentStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '2rem',
};
const lockIconStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  marginBottom: '0.75rem',
};
const lockTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#ffd479',
  marginBottom: '0.5rem',
};
const lockDescStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#a0a0a0',
  marginBottom: '1rem',
  lineHeight: 1.5,
};
const lockButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1.5rem',
  background: 'linear-gradient(135deg, #8aa4ff, #ffd479)',
  color: '#1a1a2e',
  fontWeight: 600,
  fontSize: '0.9rem',
  borderRadius: 8,
  textDecoration: 'none',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

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
          data={buildPillarView(result.table?.byPillar as any)}
        />

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '1rem', color: '#a0a0a0' }}>
          당신의 일간(日干)은{' '}
          <span style={{ color: '#f3a73f', fontWeight: 700 }}>
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
          {/* 격국/용신 분석 */}
          {(result.advancedAnalysis.geokguk || result.advancedAnalysis.yongsin) && (
            <Section title="격국 · 용신 분석">
              <div style={advancedAnalysisContainer}>
                {result.advancedAnalysis.geokguk && (
                  <AnalysisCard title="격국 (格局)" color="#8aa4ff">
                    <div style={cardRow}>
                      <span style={cardLabel}>격국:</span>
                      <span style={cardValue}>{result.advancedAnalysis.geokguk.primary || '미정'}</span>
                    </div>
                    {result.advancedAnalysis.geokguk.category && (
                      <div style={cardRow}>
                        <span style={cardLabel}>분류:</span>
                        <span style={cardValue}>{result.advancedAnalysis.geokguk.category}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.geokguk.confidence && (
                      <div style={cardRow}>
                        <span style={cardLabel}>확신도:</span>
                        <span style={cardValue}>{result.advancedAnalysis.geokguk.confidence}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.geokguk.description && (
                      <p style={cardDesc}>{result.advancedAnalysis.geokguk.description}</p>
                    )}
                  </AnalysisCard>
                )}
                {result.advancedAnalysis.yongsin && (
                  <AnalysisCard title="용신 (用神)" color="#ffd479">
                    <div style={cardRow}>
                      <span style={cardLabel}>용신:</span>
                      <span style={cardValue}>{result.advancedAnalysis.yongsin.primaryYongsin || '-'}</span>
                    </div>
                    {result.advancedAnalysis.yongsin.secondaryYongsin && (
                      <div style={cardRow}>
                        <span style={cardLabel}>희신:</span>
                        <span style={cardValue}>{result.advancedAnalysis.yongsin.secondaryYongsin}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.yongsin.kibsin && (
                      <div style={cardRow}>
                        <span style={cardLabel}>기신:</span>
                        <span style={cardValue}>{result.advancedAnalysis.yongsin.kibsin}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.yongsin.daymasterStrength && (
                      <div style={cardRow}>
                        <span style={cardLabel}>신강/신약:</span>
                        <span style={cardValue}>{result.advancedAnalysis.yongsin.daymasterStrength}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.yongsin.luckyColors && (
                      <div style={cardRow}>
                        <span style={cardLabel}>행운색:</span>
                        <span style={cardValue}>{result.advancedAnalysis.yongsin.luckyColors.join(', ')}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.yongsin.luckyDirection && (
                      <div style={cardRow}>
                        <span style={cardLabel}>행운방향:</span>
                        <span style={cardValue}>{result.advancedAnalysis.yongsin.luckyDirection}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.yongsin.luckyNumbers && (
                      <div style={cardRow}>
                        <span style={cardLabel}>행운숫자:</span>
                        <span style={cardValue}>{result.advancedAnalysis.yongsin.luckyNumbers.join(', ')}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.yongsin.description && (
                      <p style={cardDesc}>{result.advancedAnalysis.yongsin.description}</p>
                    )}
                    {result.advancedAnalysis.yongsin.reasoning && (
                      <p style={cardReasoning}>{result.advancedAnalysis.yongsin.reasoning}</p>
                    )}
                  </AnalysisCard>
                )}
              </div>
            </Section>
          )}

          {/* 통근/득령/조후용신 */}
          <Section title="통근 · 득령 · 조후용신">
            <div style={{ ...advancedAnalysisContainer, position: 'relative', minHeight: 200 }}>
              {(result.advancedAnalysis.tonggeun || result.advancedAnalysis.deukryeong || result.advancedAnalysis.johuYongsin) && (
                <>
                {result.advancedAnalysis.tonggeun && (
                  <AnalysisCard title="통근 (通根)" color="#2dbd7f">
                    <div style={cardRow}>
                      <span style={cardLabel}>통근 강도:</span>
                      <span style={cardValue}>{result.advancedAnalysis.tonggeun.totalStrength || 0}</span>
                    </div>
                    {result.advancedAnalysis.tonggeun.roots?.map((root, i) => (
                      <div key={i} style={cardRow}>
                        <span style={cardLabel}>{root.pillar}:</span>
                        <span style={cardValue}>{root.branch} ({root.type}, {root.strength})</span>
                      </div>
                    ))}
                  </AnalysisCard>
                )}
                {result.advancedAnalysis.deukryeong && (
                  <AnalysisCard title="득령 (得令)" color="#ff6b6b">
                    <div style={cardRow}>
                      <span style={cardLabel}>상태:</span>
                      <span style={cardValue}>{result.advancedAnalysis.deukryeong.status}</span>
                    </div>
                    <div style={cardRow}>
                      <span style={cardLabel}>점수:</span>
                      <span style={cardValue}>{result.advancedAnalysis.deukryeong.strength}</span>
                    </div>
                    {result.advancedAnalysis.deukryeong.description && (
                      <p style={cardDesc}>{result.advancedAnalysis.deukryeong.description}</p>
                    )}
                  </AnalysisCard>
                )}
                {result.advancedAnalysis.johuYongsin && (
                  <AnalysisCard title="조후용신 (調候用神)" color="#5b6bfa">
                    {result.advancedAnalysis.johuYongsin.primary && (
                      <div style={cardRow}>
                        <span style={cardLabel}>제1용신:</span>
                        <span style={cardValue}>{result.advancedAnalysis.johuYongsin.primary}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.johuYongsin.secondary && (
                      <div style={cardRow}>
                        <span style={cardLabel}>제2용신:</span>
                        <span style={cardValue}>{result.advancedAnalysis.johuYongsin.secondary}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.johuYongsin.seasonalNeed && (
                      <div style={cardRow}>
                        <span style={cardLabel}>계절적 필요:</span>
                        <span style={cardValue}>{result.advancedAnalysis.johuYongsin.seasonalNeed}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.johuYongsin.interpretation && (
                      <p style={cardDesc}>{result.advancedAnalysis.johuYongsin.interpretation}</p>
                    )}
                  </AnalysisCard>
                )}
                </>
              )}
            </div>
          </Section>

          {/* 십신 분석 */}
          <Section title="십신 분석">
            <div style={{ ...advancedAnalysisContainer, position: 'relative', minHeight: 200 }}>
              {result.advancedAnalysis.sibsin && (
                <>
                {result.advancedAnalysis.sibsin.count && (
                  <AnalysisCard title="십신 분포" color="#f3a73f">
                    <div style={sibsinGrid}>
                      {Object.entries(result.advancedAnalysis.sibsin.count).map(([name, cnt]) => (
                        cnt > 0 && (
                          <div key={name} style={sibsinItem}>
                            <span style={sibsinName}>{name}</span>
                            <span style={sibsinCount}>{cnt}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </AnalysisCard>
                )}
                {result.advancedAnalysis.sibsin.careerAptitude && result.advancedAnalysis.sibsin.careerAptitude.length > 0 && (
                  <AnalysisCard title="직업 적성" color="#4a90e2">
                    {result.advancedAnalysis.sibsin.careerAptitude.map((apt, i) => (
                      <div key={i} style={cardRow}>
                        <span style={cardLabel}>{apt.field}:</span>
                        <span style={cardValue}>{apt.score}점 - {apt.reason}</span>
                      </div>
                    ))}
                  </AnalysisCard>
                )}
                {result.advancedAnalysis.sibsin.personality && (
                  <AnalysisCard title="성격 분석" color="#9b59b6">
                    {result.advancedAnalysis.sibsin.personality.strengths && result.advancedAnalysis.sibsin.personality.strengths.length > 0 && (
                      <div style={cardRow}>
                        <span style={cardLabel}>강점:</span>
                        <span style={cardValue}>{result.advancedAnalysis.sibsin.personality.strengths.join(', ')}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.sibsin.personality.weaknesses && result.advancedAnalysis.sibsin.personality.weaknesses.length > 0 && (
                      <div style={cardRow}>
                        <span style={cardLabel}>약점:</span>
                        <span style={cardValue}>{result.advancedAnalysis.sibsin.personality.weaknesses.join(', ')}</span>
                      </div>
                    )}
                  </AnalysisCard>
                )}
                </>
              )}
            </div>
          </Section>

          {/* 건강/직업 분석 */}
          <Section title="건강 · 직업 분석">
            <div style={{ ...advancedAnalysisContainer, position: 'relative', minHeight: 200 }}>
              {(result.advancedAnalysis.health || result.advancedAnalysis.career) && (
                <>
                {result.advancedAnalysis.health && (
                  <AnalysisCard title="건강 분석" color="#e74c3c">
                    {result.advancedAnalysis.health.constitution && (
                      <div style={{ ...cardRow, marginBottom: '0.5rem' }}>
                        <span style={cardLabel}>체질:</span>
                        <span style={cardValue}>{result.advancedAnalysis.health.constitution}</span>
                      </div>
                    )}
                    {result.advancedAnalysis.health.organHealth?.map((org, i) => (
                      <div key={i} style={{ ...cardRow, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={cardLabel}>{org.organ} ({org.element}):</span>
                        <span style={{ ...cardValue, color: org.status === 'weak' || org.status === 'vulnerable' ? '#ff6b6b' : org.status === 'strong' ? '#2dbd7f' : '#a0a0a0' }}>
                          {org.status} (점수: {org.score})
                        </span>
                      </div>
                    ))}
                    {result.advancedAnalysis.health.preventionAdvice && result.advancedAnalysis.health.preventionAdvice.length > 0 && (
                      <p style={cardDesc}>{result.advancedAnalysis.health.preventionAdvice.join(', ')}</p>
                    )}
                  </AnalysisCard>
                )}
                {result.advancedAnalysis.career && (
                  <AnalysisCard title="직업 적성" color="#3498db">
                    {result.advancedAnalysis.career.primaryFields?.map((field, i) => (
                      <div key={i} style={cardRow}>
                        <span style={cardLabel}>{field.category}:</span>
                        <span style={cardValue}>{field.fitScore}점 - {field.jobs?.slice(0, 3).join(', ')}</span>
                      </div>
                    ))}
                    {result.advancedAnalysis.career.workStyle && (
                      <>
                        <div style={{ ...cardRow, marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                          <span style={cardLabel}>업무 스타일:</span>
                          <span style={cardValue}>{result.advancedAnalysis.career.workStyle.type || '-'}</span>
                        </div>
                        {result.advancedAnalysis.career.workStyle.description && (
                          <p style={{ ...cardDesc, marginTop: '0.25rem' }}>{result.advancedAnalysis.career.workStyle.description}</p>
                        )}
                        {result.advancedAnalysis.career.workStyle.strengths && result.advancedAnalysis.career.workStyle.strengths.length > 0 && (
                          <div style={cardRow}>
                            <span style={cardLabel}>강점:</span>
                            <span style={cardValue}>{result.advancedAnalysis.career.workStyle.strengths.join(', ')}</span>
                          </div>
                        )}
                        {result.advancedAnalysis.career.workStyle.idealEnvironment && result.advancedAnalysis.career.workStyle.idealEnvironment.length > 0 && (
                          <div style={cardRow}>
                            <span style={cardLabel}>이상적 환경:</span>
                            <span style={cardValue}>{result.advancedAnalysis.career.workStyle.idealEnvironment.join(', ')}</span>
                          </div>
                        )}
                      </>
                    )}
                    {result.advancedAnalysis.career.careerAdvice && result.advancedAnalysis.career.careerAdvice.length > 0 && (
                      <p style={cardDesc}>{result.advancedAnalysis.career.careerAdvice.join(' ')}</p>
                    )}
                  </AnalysisCard>
                )}
                </>
              )}
            </div>
          </Section>

          {/* 종합 점수 */}
          <Section title="종합 점수">
            <div style={{ ...scoreContainer, position: 'relative', minHeight: 200 }}>
              {result.advancedAnalysis.score && (
                <>
                <div style={scoreTotalBox}>
                  <div style={scoreTotalLabel}>종합 점수</div>
                  <div style={scoreTotalValue}>{result.advancedAnalysis.score.overall ?? '-'}</div>
                  {result.advancedAnalysis.score.grade && (
                    <div style={scoreTotalGrade}>{result.advancedAnalysis.score.grade}등급</div>
                  )}
                </div>
                <div style={scoreBreakdown}>
                  {result.advancedAnalysis.score.strength && (
                    <div style={scoreItem}>
                      <span style={scoreLabel}>신강/신약:</span>
                      <div style={scoreBar}>
                        <div style={{ ...scoreBarFill, width: `${Math.min(100, result.advancedAnalysis.score.strength.total || 0)}%` }} />
                      </div>
                      <span style={scoreNum}>{result.advancedAnalysis.score.strength.total} ({result.advancedAnalysis.score.strength.level})</span>
                    </div>
                  )}
                  {result.advancedAnalysis.score.geokguk && (
                    <>
                      <div style={scoreItem}>
                        <span style={scoreLabel}>격국 순수도:</span>
                        <div style={scoreBar}>
                          <div style={{ ...scoreBarFill, width: `${Math.min(100, result.advancedAnalysis.score.geokguk.purity || 0)}%` }} />
                        </div>
                        <span style={scoreNum}>{result.advancedAnalysis.score.geokguk.purity}</span>
                      </div>
                      <div style={scoreItem}>
                        <span style={scoreLabel}>격국 안정도:</span>
                        <div style={scoreBar}>
                          <div style={{ ...scoreBarFill, width: `${Math.min(100, result.advancedAnalysis.score.geokguk.stability || 0)}%` }} />
                        </div>
                        <span style={scoreNum}>{result.advancedAnalysis.score.geokguk.stability}</span>
                      </div>
                    </>
                  )}
                  {result.advancedAnalysis.score.yongsin && (
                    <div style={scoreItem}>
                      <span style={scoreLabel}>용신 적합도:</span>
                      <div style={scoreBar}>
                        <div style={{ ...scoreBarFill, width: `${Math.min(100, result.advancedAnalysis.score.yongsin.fitScore || 0)}%` }} />
                      </div>
                      <span style={scoreNum}>{result.advancedAnalysis.score.yongsin.fitScore}</span>
                    </div>
                  )}
                </div>
                {result.advancedAnalysis.score.summary && (
                  <p style={{ ...cardDesc, marginTop: '1rem' }}>{result.advancedAnalysis.score.summary}</p>
                )}
                {result.advancedAnalysis.score.strengths && result.advancedAnalysis.score.strengths.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <span style={{ ...cardLabel, display: 'block', marginBottom: '0.25rem' }}>강점:</span>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#2dbd7f', fontSize: '0.85rem' }}>
                      {result.advancedAnalysis.score.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.advancedAnalysis.score.weaknesses && result.advancedAnalysis.score.weaknesses.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ ...cardLabel, display: 'block', marginBottom: '0.25rem' }}>약점:</span>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
                      {result.advancedAnalysis.score.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.advancedAnalysis.score.recommendations && result.advancedAnalysis.score.recommendations.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ ...cardLabel, display: 'block', marginBottom: '0.25rem' }}>추천:</span>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#ffd479', fontSize: '0.85rem' }}>
                      {result.advancedAnalysis.score.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                </>
              )}
            </div>
          </Section>

          {/* 종합 리포트 */}
          <Section title="종합 리포트">
            <div style={{ ...reportContainer, position: 'relative', minHeight: 200 }}>
              {result.advancedAnalysis.report && (
                <>
                {result.advancedAnalysis.report.summary && (
                  <div style={reportSection}>
                    <h4 style={reportTitle}>요약</h4>
                    <p style={reportText}>{result.advancedAnalysis.report.summary}</p>
                  </div>
                )}
                {result.advancedAnalysis.report.sections?.map((sec, i) => (
                  <div key={i} style={reportSection}>
                    <h4 style={reportTitle}>{sec.title}</h4>
                    <p style={reportText}>{sec.content}</p>
                  </div>
                ))}
                </>
              )}
            </div>
          </Section>
        </>
      )}

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

/* ===== 고급 분석 스타일 & 컴포넌트 ===== */
const AnalysisCard: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <div style={{ background: '#1e1e2f', padding: '1rem', borderRadius: 12, border: `1px solid ${color}40`, flex: '1 1 300px', minWidth: 280 }}>
    <h4 style={{ color, fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${color}30` }}>
      {title}
    </h4>
    {children}
  </div>
);

const advancedAnalysisContainer: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '1rem',
};
const cardRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.85rem',
};
const cardLabel: React.CSSProperties = {
  color: '#a0a0a0', marginRight: '0.5rem',
};
const cardValue: React.CSSProperties = {
  color: '#e0e0e0', fontWeight: 500,
};
const cardDesc: React.CSSProperties = {
  fontSize: '0.8rem', color: '#9aa2c1', marginTop: '0.75rem', lineHeight: 1.5, padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6,
};
const cardReasoning: React.CSSProperties = {
  fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', fontStyle: 'italic',
};

// 십신 그리드 스타일
const sibsinGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem',
};
const sibsinItem: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8,
};
const sibsinName: React.CSSProperties = {
  fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.25rem',
};
const sibsinCount: React.CSSProperties = {
  fontSize: '1rem', fontWeight: 700, color: '#e0e0e0',
};

// 점수 스타일
const scoreContainer: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#1e1e2f', padding: '1.5rem', borderRadius: 12, border: '1px solid #4f4f7a',
};
const scoreTotalBox: React.CSSProperties = {
  textAlign: 'center', padding: '1rem', background: 'linear-gradient(135deg, rgba(138,164,255,0.15), rgba(255,212,121,0.15))', borderRadius: 12,
};
const scoreTotalLabel: React.CSSProperties = {
  fontSize: '0.9rem', color: '#a0a0a0', marginBottom: '0.5rem',
};
const scoreTotalValue: React.CSSProperties = {
  fontSize: '2.5rem', fontWeight: 800, color: '#ffd479',
};
const scoreTotalGrade: React.CSSProperties = {
  fontSize: '1rem', color: '#8aa4ff', marginTop: '0.25rem',
};
const scoreBreakdown: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.75rem',
};
const scoreItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
};
const scoreLabel: React.CSSProperties = {
  width: 100, fontSize: '0.8rem', color: '#a0a0a0', flexShrink: 0,
};
const scoreBar: React.CSSProperties = {
  flex: 1, height: 8, background: '#161625', borderRadius: 4, overflow: 'hidden',
};
const scoreBarFill: React.CSSProperties = {
  height: '100%', background: 'linear-gradient(90deg, #8aa4ff, #ffd479)', borderRadius: 4, transition: 'width 0.5s ease',
};
const scoreNum: React.CSSProperties = {
  minWidth: 80, textAlign: 'right', fontSize: '0.85rem', color: '#e0e0e0', flexShrink: 0,
};

// 리포트 스타일
const reportContainer: React.CSSProperties = {
  background: '#1e1e2f', padding: '1.5rem', borderRadius: 12, border: '1px solid #4f4f7a',
};
const reportSection: React.CSSProperties = {
  marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
};
const reportTitle: React.CSSProperties = {
  fontSize: '0.95rem', fontWeight: 600, color: '#ffd479', marginBottom: '0.5rem',
};
const reportText: React.CSSProperties = {
  fontSize: '0.85rem', color: '#c0c0c0', lineHeight: 1.6,
};

const PillarBox = ({
  title,
  heavenlyStem,
  earthlyBranch,
}: {
  title: string;
  heavenlyStem: PillarData['heavenlyStem'];
  earthlyBranch: PillarData['earthlyBranch'];
}) => {
  // 안전하게 문자열 추출
  const stemName = typeof heavenlyStem === 'string' ? heavenlyStem : (heavenlyStem?.name ?? '');
  const stemSibsin = typeof heavenlyStem === 'string' ? '' : (heavenlyStem?.sibsin ?? '');
  const branchName = typeof earthlyBranch === 'string' ? earthlyBranch : (earthlyBranch?.name ?? '');
  const branchSibsin = typeof earthlyBranch === 'string' ? '' : (earthlyBranch?.sibsin ?? '');

  const stemEl = getElementOfChar(stemName);
  const branchEl = getElementOfChar(branchName);
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '0.9rem', color: '#b8b8c7', marginBottom: 4 }}>{title}</div>
      <div style={sibsinTextStyle}>{String(stemSibsin)}</div>
      <div style={{ ...pillarCellStyle, backgroundColor: stemEl ? elementColors[stemEl] : '#4a80e2' }}>{String(stemName)}</div>
      <div style={{ height: 8 }} />
      <div style={{ ...pillarCellStyle, backgroundColor: branchEl ? elementColors[branchEl] : '#f3a73f' }}>{String(branchName)}</div>
      <div style={{ ...sibsinTextStyle, marginTop: 6 }}>{String(branchSibsin)}</div>
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
}: { topText: string; topSubText: string | object; cheon: string | object; ji: string | object; bottomSubText: string | object; onClick?: () => void; isSelected?: boolean }) => {
  // 안전하게 문자열 추출
  const cheonStr = typeof cheon === 'string' ? cheon : ((cheon as any)?.name ?? '');
  const jiStr = typeof ji === 'string' ? ji : ((ji as any)?.name ?? '');
  const topSubStr = typeof topSubText === 'string' ? topSubText : String(topSubText ?? '');
  const bottomSubStr = typeof bottomSubText === 'string' ? bottomSubText : String(bottomSubText ?? '');

  const topEl = getElementOfChar(cheonStr);
  const bottomEl = getElementOfChar(jiStr);
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
      <div style={sibsinTextStyle}>{topSubStr}</div>
      <div style={{ padding: '0.6rem 0', fontSize: '1.2rem', fontWeight: 'bold', background: topEl ? elementColors[topEl] : '#2a2a3e', borderRadius: 4, color: '#fff', borderBottom: '1px solid #161625' }}>{cheonStr}</div>
      <div style={{ padding: '0.6rem 0', fontSize: '1.2rem', fontWeight: 'bold', background: bottomEl ? elementColors[bottomEl] : '#2a2a3e', borderRadius: 4, color: '#fff' }}>{jiStr}</div>
      <div style={sibsinTextStyle}>{bottomSubStr}</div>
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
    // 안전하게 문자열 추출
    const stemStr = iljin ? (typeof iljin.heavenlyStem === 'string' ? iljin.heavenlyStem : ((iljin.heavenlyStem as any)?.name ?? '')) : '';
    const branchStr = iljin ? (typeof iljin.earthlyBranch === 'string' ? iljin.earthlyBranch : ((iljin.earthlyBranch as any)?.name ?? '')) : '';
    const ganjiStr = iljin ? `${stemStr}${branchStr}` : '—';
    const sibsinCheon = iljin?.sibsin?.cheon ? (typeof iljin.sibsin.cheon === 'string' ? iljin.sibsin.cheon : String(iljin.sibsin.cheon)) : '';
    const sibsinJi = iljin?.sibsin?.ji ? (typeof iljin.sibsin.ji === 'string' ? iljin.sibsin.ji : String(iljin.sibsin.ji)) : '';
    const sibsinStr = iljin ? `${sibsinCheon}/${sibsinJi}` : '';
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