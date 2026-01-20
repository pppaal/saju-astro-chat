// src/components/saju/SajuResultDisplay.tsx
'use client';

import React from 'react';
import type { SajuApiResponse } from '@/lib/Saju/saju-result.types';
import { useSajuCycles } from '@/hooks/useSajuCycles';
import PillarSummaryTable from './PillarSummaryTable';
import { buildPillarView } from '@/adapters/map-12';
import { Section } from './result-display/Section';
import { PillarBox } from './result-display/PillarDisplay';
import { FiveElementsChart } from './result-display/FiveElementsChart';
import { RelationsPanel } from './result-display/RelationsPanel';
import { GeokgukYongsinSection } from './result-display/GeokgukYongsinSection';
import { ScoreSection } from './result-display/ScoreSection';
import { DaeunSection, YeonunSection, WolunSection } from './result-display/UnseFlowSection';
import { IljinCalendar } from './result-display/IljinCalendar';
import { AnalysisCard, cardRow, cardLabel, cardValue, cardDesc } from './result-display/AnalysisCard';

interface Props {
  result: SajuApiResponse;
}

export default function SajuResultDisplay({ result }: Props) {
  const cycles = useSajuCycles(result.birthYear, result.dayMaster, result.daeun?.cycles || []);

  if (!result || !result.daeun?.cycles || !cycles.selectedDaeun) {
    return (
      <div style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>
        결과를 표시할 수 없습니다.
      </div>
    );
  }

  const { yearPillar, monthPillar, dayPillar, timePillar, fiveElements, daeun } = result;

  return (
    <div style={{ marginTop: '3rem', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
      {/* 사주 명식 */}
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

        <PillarSummaryTable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={buildPillarView(result.table?.byPillar as unknown as Parameters<typeof buildPillarView>[0])}
        />

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '1rem', color: '#a0a0a0' }}>
          당신의 일간(日干)은{' '}
          <span style={{ color: '#f3a73f', fontWeight: 700 }}>
            {typeof dayPillar.heavenlyStem === 'string'
              ? dayPillar.heavenlyStem
              : dayPillar.heavenlyStem?.name ?? ''}{' '}
            ({typeof dayPillar.heavenlyStem === 'string' ? '' : dayPillar.heavenlyStem?.element ?? ''})
          </span>{' '}
          입니다.
        </p>
      </Section>

      {/* 오행 분포 */}
      <Section title="Five Elements">
        {fiveElements && <FiveElementsChart data={fiveElements} />}
      </Section>

      {/* 합충 관계 */}
      <Section title="합·충 관계">
        <RelationsPanel relations={result.relations} />
      </Section>

      {/* 고급 분석 */}
      {result.advancedAnalysis && (
        <>
          {/* 격국/용신 */}
          {(result.advancedAnalysis.geokguk || result.advancedAnalysis.yongsin) && (
            <Section title="격국 · 용신 분석">
              <GeokgukYongsinSection
                geokguk={result.advancedAnalysis.geokguk}
                yongsin={result.advancedAnalysis.yongsin}
              />
            </Section>
          )}

          {/* 통근/득령/조후용신 */}
          {(result.advancedAnalysis.tonggeun ||
            result.advancedAnalysis.deukryeong ||
            result.advancedAnalysis.johuYongsin) && (
            <Section title="통근 · 득령 · 조후용신">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {result.advancedAnalysis.tonggeun && (
                  <AnalysisCard title="통근 (通根)" color="#2dbd7f">
                    <div style={cardRow}>
                      <span style={cardLabel}>통근 강도:</span>
                      <span style={cardValue}>{result.advancedAnalysis.tonggeun.totalStrength || 0}</span>
                    </div>
                    {result.advancedAnalysis.tonggeun.roots?.map((root, i) => (
                      <div key={i} style={cardRow}>
                        <span style={cardLabel}>{root.pillar}:</span>
                        <span style={cardValue}>
                          {root.branch} ({root.type}, {root.strength})
                        </span>
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
              </div>
            </Section>
          )}

          {/* 십신 분석 */}
          {result.advancedAnalysis.sibsin && (
            <Section title="십신 분석">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {result.advancedAnalysis.sibsin.count && (
                  <AnalysisCard title="십신 분포" color="#f3a73f">
                    <div style={sibsinGrid}>
                      {Object.entries(result.advancedAnalysis.sibsin.count).map(
                        ([name, cnt]) =>
                          cnt > 0 && (
                            <div key={name} style={sibsinItem}>
                              <span style={sibsinName}>{name}</span>
                              <span style={sibsinCount}>{cnt}</span>
                            </div>
                          )
                      )}
                    </div>
                  </AnalysisCard>
                )}

                {result.advancedAnalysis.sibsin.careerAptitude &&
                  result.advancedAnalysis.sibsin.careerAptitude.length > 0 && (
                    <AnalysisCard title="직업 적성" color="#4a90e2">
                      {result.advancedAnalysis.sibsin.careerAptitude.map((apt, i) => (
                        <div key={i} style={cardRow}>
                          <span style={cardLabel}>{apt.field}:</span>
                          <span style={cardValue}>
                            {apt.score}점 - {apt.reason}
                          </span>
                        </div>
                      ))}
                    </AnalysisCard>
                  )}

                {result.advancedAnalysis.sibsin.personality && (
                  <AnalysisCard title="성격 분석" color="#9b59b6">
                    {result.advancedAnalysis.sibsin.personality.strengths &&
                      result.advancedAnalysis.sibsin.personality.strengths.length > 0 && (
                        <div style={cardRow}>
                          <span style={cardLabel}>강점:</span>
                          <span style={cardValue}>
                            {result.advancedAnalysis.sibsin.personality.strengths.join(', ')}
                          </span>
                        </div>
                      )}
                    {result.advancedAnalysis.sibsin.personality.weaknesses &&
                      result.advancedAnalysis.sibsin.personality.weaknesses.length > 0 && (
                        <div style={cardRow}>
                          <span style={cardLabel}>약점:</span>
                          <span style={cardValue}>
                            {result.advancedAnalysis.sibsin.personality.weaknesses.join(', ')}
                          </span>
                        </div>
                      )}
                  </AnalysisCard>
                )}
              </div>
            </Section>
          )}

          {/* 건강/직업 - 생략 (필요시 추가) */}

          {/* 종합 점수 */}
          {result.advancedAnalysis.score && (
            <Section title="종합 점수">
              <ScoreSection score={result.advancedAnalysis.score} />
            </Section>
          )}
        </>
      )}

      {/* 대운 */}
      <Section title={`대운 (대운수: ${daeun.daeunsu})`}>
        <DaeunSection cycles={daeun.cycles} selected={cycles.selectedDaeun} onSelect={cycles.setSelectedDaeun} />
      </Section>

      {/* 연운 */}
      <Section title="연운 (Annual Cycle)">
        <YeonunSection
          cycles={cycles.displayedYeonun}
          selected={cycles.selectedYeonun}
          onSelect={cycles.setSelectedYeonun}
        />
      </Section>

      {/* 월운 */}
      <Section title="월운 (Monthly Cycle)">
        <WolunSection
          cycles={cycles.displayedWolun}
          selected={cycles.selectedWolun}
          onSelect={cycles.setSelectedWolun}
        />
      </Section>

      {/* 일진 달력 */}
      <Section title="일진 달력 (Daily Calendar)">
        <IljinCalendar iljinData={cycles.displayedIljin} year={cycles.selectedWolun?.year} month={cycles.selectedWolun?.month} />
      </Section>
    </div>
  );
}

// Styles
const pillarsCompactGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '64px 1fr',
  columnGap: 12,
  background: '#1e1e2f',
  padding: 14,
  borderRadius: 12,
  border: '1px solid #4f4f7a',
};

const railCompact: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: '28px 56px 8px 56px 12px',
  alignItems: 'center',
  justifyItems: 'start',
};

const railChipBase: React.CSSProperties = {
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
};

const railChipStem: React.CSSProperties = { ...railChipBase, color: '#8da1ff' };
const railChipBranch: React.CSSProperties = { ...railChipBase, color: '#ffcf8a' };
const railSpacerTop: React.CSSProperties = { height: '100%' };
const railSpacerBottom: React.CSSProperties = { height: '100%' };
const railGap8: React.CSSProperties = { height: 8 };

const pillarsCompactRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(72px, 1fr))',
  justifyItems: 'center',
  alignItems: 'start',
  gap: 16,
};

const sibsinGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '0.5rem',
};

const sibsinItem: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0.5rem',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 8,
};

const sibsinName: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#a0a0a0',
  marginBottom: '0.25rem',
};

const sibsinCount: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#e0e0e0',
};
