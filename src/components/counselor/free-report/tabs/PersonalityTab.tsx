"use client";

import { memo } from 'react';
import { repairMojibakeDeep } from '@/lib/text/mojibake';
import { expandNarrativeDeep } from './shared/longForm';
import type { TabProps } from './types';
import { getStrengthsAndWeaknesses, getMatrixAnalysis } from '../analyzers';
import { getShadowPersonalityAnalysis } from '../analyzers/matrixAnalyzer';
import type { ShadowPersonalityResult } from '../analyzers/matrixAnalyzer';
import { getPersonalizedAdvice } from '../generators';
import PentagonChart from './PentagonChart';
import { PremiumReportCTA } from '../components';
import {
  type PersonalityAnalysis,
  LifeThemeCard,
  StrengthsWeaknessesSection,
  PersonalityAnalysisSection,
  EmotionPatternCard,
  PersonalizedAdviceSection,
  EnergyBalanceSection,
  EastWestHarmonySection,
  ShadowSelfSection,
} from './personality';

function PersonalityTab({ saju, astro, lang, isKo, data, destinyNarrative, combinedLifeTheme }: TabProps) {
  // Early return if data is null
  if (!data) {
    return <div className="text-gray-400 text-center p-6">Loading...</div>;
  }

  // TabData.personalityAnalysis is Record<string, unknown> | null, cast to local interface
  const personalityAnalysis = repairMojibakeDeep(
    data.personalityAnalysis as PersonalityAnalysis | null
  );
  const strengthsWeaknesses = expandNarrativeDeep(
    repairMojibakeDeep(getStrengthsAndWeaknesses(saju ?? undefined, astro ?? undefined, lang)),
    { isKo, topic: 'personality', minSentences: 4 }
  );
  const personalizedAdvices = expandNarrativeDeep(
    repairMojibakeDeep(getPersonalizedAdvice(saju ?? undefined, astro ?? undefined, lang)),
    { isKo, topic: 'personality', minSentences: 4 }
  );
  const matrixAnalysis = expandNarrativeDeep(
    repairMojibakeDeep(getMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang)),
    { isKo, topic: 'personality', minSentences: 4 }
  );
  const shadowAnalysis = expandNarrativeDeep(
    repairMojibakeDeep(
    getShadowPersonalityAnalysis(
      saju ?? undefined,
      astro ?? undefined,
      isKo ? 'ko' : 'en'
    ) as ShadowPersonalityResult | null
    ),
    { isKo, topic: 'hidden', minSentences: 4 }
  );
  const expandedPersonalityAnalysis = expandNarrativeDeep(personalityAnalysis, {
    isKo,
    topic: 'personality',
    minSentences: 5,
  });
  const expandedDestinyNarrative = destinyNarrative
    ? expandNarrativeDeep(destinyNarrative, { isKo, topic: 'personality', minSentences: 4 })
    : destinyNarrative;

  return (
    <div className="space-y-6">
      {combinedLifeTheme && <LifeThemeCard combinedLifeTheme={combinedLifeTheme} isKo={isKo} />}

      {strengthsWeaknesses && <StrengthsWeaknessesSection strengthsWeaknesses={strengthsWeaknesses} isKo={isKo} />}

      {expandedPersonalityAnalysis && (
        <PersonalityAnalysisSection personalityAnalysis={expandedPersonalityAnalysis} isKo={isKo} />
      )}

      <EmotionPatternCard destinyNarrative={expandedDestinyNarrative} isKo={isKo} />

      {personalizedAdvices.length > 0 && <PersonalizedAdviceSection personalizedAdvices={personalizedAdvices} isKo={isKo} />}

      <EnergyBalanceSection data={data} isKo={isKo} />

      {matrixAnalysis && <EastWestHarmonySection matrixAnalysis={matrixAnalysis} isKo={isKo} />}

      {shadowAnalysis && <ShadowSelfSection shadowAnalysis={shadowAnalysis} isKo={isKo} />}

      {/* 종합 운세 점수 - 오각형 레이더 차트 */}
      <PentagonChart saju={saju} astro={astro} lang={lang} isKo={isKo} data={data} />

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="personality"
        matrixData={{ shadowAnalysis, matrixAnalysis }}
      />
    </div>
  );
}

export default memo(PersonalityTab);
