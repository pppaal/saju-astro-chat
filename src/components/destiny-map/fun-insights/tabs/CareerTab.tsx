"use client";

import { memo } from 'react';
import { repairMojibakeDeep } from '@/lib/text/mojibake';
import { ensureMinSentenceText } from './shared/textDepth';
import { expandNarrativeDeep } from './shared/longForm';
import type { TabProps } from './types';
import { getCareerMatrixAnalysis, type CareerMatrixResult } from '../analyzers';
import { getCareerAdvancedAnalysis } from '../analyzers/matrixAnalyzer';
import type { CareerAdvancedResult } from '../analyzers/matrixAnalyzer';
import { PremiumReportCTA } from '../components';
import {
  type CareerAnalysis,
  type SajuWithGeokguk,
  getGeokgukCareer,
  CareerDestinyCard,
  GeokgukCareerCard,
  CareerAnalysisSection,
  WealthTimingSection,
  CareerMatrixSection,
  AdvancedCareerSections,
} from './career';

function CareerTab({ saju, astro, lang, isKo, data, destinyNarrative }: TabProps) {
  // Early return if data is null
  if (!data) {
    return <div className="text-gray-400 text-center p-6">Loading...</div>;
  }

  // TabData.careerAnalysis is Record<string, unknown> | null, cast to local interface
  const careerAnalysis = expandNarrativeDeep(
    repairMojibakeDeep(data.careerAnalysis as CareerAnalysis | null),
    { isKo, topic: 'career', minSentences: 5 }
  );
  const careerMatrix = expandNarrativeDeep(
    repairMojibakeDeep(
    getCareerMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang) as CareerMatrixResult | null
    ),
    { isKo, topic: 'career', minSentences: 4 }
  );
  // 고급 커리어 분석 (L2, L4, L7, L8, L10)
  const advancedCareer = expandNarrativeDeep(
    repairMojibakeDeep(
      getCareerAdvancedAnalysis(
        saju ?? undefined,
        astro ?? undefined,
        isKo ? 'ko' : 'en'
      ) as CareerAdvancedResult | null
    ),
    { isKo, topic: 'career', minSentences: 4 }
  );

  // 격국 정보 추출
  const sajuWithGeokguk = saju as SajuWithGeokguk | undefined;
  const geokguk = sajuWithGeokguk?.advancedAnalysis?.geokguk;
  const geokName = geokguk?.name ?? geokguk?.type ?? "";

  const geokCareer = geokName
    ? repairMojibakeDeep(getGeokgukCareer(geokName, isKo))
    : null;
  const expandedDestinyNarrative = destinyNarrative
    ? expandNarrativeDeep(destinyNarrative, { isKo, topic: 'career', minSentences: 4 })
    : destinyNarrative;

  return (
    <div className="space-y-6">
      {/* 커리어 운명 */}
      <CareerDestinyCard destinyNarrative={expandedDestinyNarrative} isKo={isKo} />

      {/* 격국 기반 커리어 */}
      {geokCareer && <GeokgukCareerCard geokCareer={geokCareer} isKo={isKo} />}

      {/* 커리어 분석 */}
      {careerAnalysis && <CareerAnalysisSection careerAnalysis={careerAnalysis} isKo={isKo} />}

      {/* 재물운 & 성공 시기 */}
      {careerAnalysis && <WealthTimingSection careerAnalysis={careerAnalysis} isKo={isKo} />}

      {/* 해외운 */}
      {careerAnalysis?.overseasFortune && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-sky-900/20 border border-sky-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✈️</span>
            <h3 className="text-lg font-bold text-sky-300">{isKo ? "해외운 & 확장 기회" : "Overseas Fortune & Expansion"}</h3>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {ensureMinSentenceText(careerAnalysis.overseasFortune, isKo, 'career', 4)}
          </p>
          <p className="text-gray-500 text-xs mt-3">
            {isKo ? "* 9하우스와 역마살 기반 분석" : "* Based on 9th house and travel indicators"}
          </p>
        </div>
      )}

      {/* 동서양 커리어 매트릭스 (Sibsin-House) */}
      <CareerMatrixSection careerMatrix={careerMatrix} isKo={isKo} />

      {/* 고급 분석 섹션들 */}
      <AdvancedCareerSections advancedCareer={advancedCareer} isKo={isKo} />

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="career"
        matrixData={{ careerMatrix, advancedCareer }}
      />
    </div>
  );
}

export default memo(CareerTab);
