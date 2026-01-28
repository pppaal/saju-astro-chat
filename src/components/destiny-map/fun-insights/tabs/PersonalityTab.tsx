"use client";

import { memo } from 'react';
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
  const personalityAnalysis = data.personalityAnalysis as PersonalityAnalysis | null;
  const strengthsWeaknesses = getStrengthsAndWeaknesses(saju ?? undefined, astro ?? undefined, lang);
  const personalizedAdvices = getPersonalizedAdvice(saju ?? undefined, astro ?? undefined, lang);
  const matrixAnalysis = getMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang);
  const shadowAnalysis = getShadowPersonalityAnalysis(saju ?? undefined, astro ?? undefined, isKo ? 'ko' : 'en') as ShadowPersonalityResult | null;

  return (
    <div className="space-y-6">
      {combinedLifeTheme && <LifeThemeCard combinedLifeTheme={combinedLifeTheme} isKo={isKo} />}

      {strengthsWeaknesses && <StrengthsWeaknessesSection strengthsWeaknesses={strengthsWeaknesses} isKo={isKo} />}

      {personalityAnalysis && <PersonalityAnalysisSection personalityAnalysis={personalityAnalysis} isKo={isKo} />}

      <EmotionPatternCard destinyNarrative={destinyNarrative} isKo={isKo} />

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
