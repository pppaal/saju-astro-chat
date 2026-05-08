"use client";

import { memo } from 'react';
import { repairMojibakeDeep } from '@/lib/text/mojibake';
import { expandNarrativeDeep } from './shared/longForm';
import type { TabProps } from './types';
import { getLoveMatrixAnalysis, type LoveMatrixResult } from '../analyzers';
import { getLoveTimingAnalysis } from '../analyzers/matrixAnalyzer';
import type { LoveTimingResult } from '../analyzers/matrixAnalyzer';
import { PremiumReportCTA } from '../components';
import {
  type LoveAnalysis,
  RelationshipStyleCard,
  LoveAnalysisSection,
  CharmTimingSection,
  MarriageFateSection,
  LilithDesireCard,
  LoveMatrixSection,
  LoveTimingSection,
} from './love';

function LoveTab({ isKo, data, destinyNarrative, saju, astro, lang }: TabProps) {
  // Early return if data is null
  if (!data) {
    return <div className="text-gray-400 text-center p-6">Loading...</div>;
  }

  // TabData.loveAnalysis is Record<string, unknown> | null, cast to local interface
  const loveAnalysis = expandNarrativeDeep(
    repairMojibakeDeep(data.loveAnalysis as LoveAnalysis | null),
    { isKo, topic: 'personality', minSentences: 5 }
  );
  const loveMatrix = expandNarrativeDeep(
    repairMojibakeDeep(
      getLoveMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang) as LoveMatrixResult | null
    ),
    { isKo, topic: 'timing', minSentences: 4 }
  );
  const loveTiming = expandNarrativeDeep(
    repairMojibakeDeep(
      getLoveTimingAnalysis(
        saju ?? undefined,
        astro ?? undefined,
        isKo ? 'ko' : 'en'
      ) as LoveTimingResult | null
    ),
    { isKo, topic: 'timing', minSentences: 4 }
  );
  const expandedDestinyNarrative = destinyNarrative
    ? expandNarrativeDeep(destinyNarrative, { isKo, topic: 'personality', minSentences: 4 })
    : destinyNarrative;

  return (
    <div className="space-y-6">
      {/* 관계 스타일 */}
      {expandedDestinyNarrative && (
        <RelationshipStyleCard destinyNarrative={expandedDestinyNarrative} isKo={isKo} />
      )}

      {/* 사랑 분석 */}
      {loveAnalysis && <LoveAnalysisSection loveAnalysis={loveAnalysis} isKo={isKo} />}

      {/* 연애 매력도 & 타이밍 */}
      {loveAnalysis && (loveAnalysis.charmScore || loveAnalysis.romanceTiming) && (
        <CharmTimingSection loveAnalysis={loveAnalysis} isKo={isKo} />
      )}

      {/* 결혼 & 운명적 만남 */}
      {loveAnalysis && (loveAnalysis.junoPartner || loveAnalysis.vertexMeeting) && (
        <MarriageFateSection loveAnalysis={loveAnalysis} isKo={isKo} />
      )}

      {/* 숨겨진 욕망 (Lilith) */}
      {loveAnalysis?.lilithDesire && (
        <LilithDesireCard lilithDesire={loveAnalysis.lilithDesire} isKo={isKo} />
      )}

      {/* 동서양 사랑 매트릭스 */}
      {loveMatrix && (loveMatrix.shinsalLove.length > 0 || loveMatrix.asteroidLove.length > 0) && (
        <LoveMatrixSection loveMatrix={loveMatrix} isKo={isKo} />
      )}

      {/* 연애 타이밍 매트릭스 */}
      {loveTiming && <LoveTimingSection loveTiming={loveTiming} isKo={isKo} />}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="love"
        matrixData={{ loveMatrix, loveTiming }}
      />
    </div>
  );
}

export default memo(LoveTab);
