"use client";

import { memo } from 'react';
import { repairMojibakeDeep } from '@/lib/text/mojibake';
import { ensureMinSentenceText } from './shared/textDepth';
import { expandNarrativeDeep } from './shared/longForm';
import type { TabProps } from './types';
import {
  getStrengthsAndWeaknesses,
  getMatrixAnalysis,
} from '../analyzers';
import { getShadowPersonalityAnalysis } from '../analyzers/matrixAnalyzer';
import type { ShadowPersonalityResult } from '../analyzers/matrixAnalyzer';
import { getPersonalizedAdvice } from '../generators';
import PentagonChart from './PentagonChart';
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
import {
  getHiddenSelfAnalysis,
  ShadowEnergyScore,
  LilithShadowCard,
  ChironHealingCard,
  HiddenFortuneCard,
  VertexFateCard,
  SpecialShinsalSection,
  UnconsciousPatternCard,
} from './hidden-self';
import KarmaTab from './KarmaTab';

/**
 * 통합 성장 탭. 옛 PersonalityTab / KarmaTab / HiddenSelfTab을 하나로
 * 머지. 캘린더 엔진의 5테마(love/money/career/health/growth) 중 growth에
 * 해당하는 영역 — 성격 · 그림자 · 숨겨진 나 · 카르마를 한 페이지에서 다룸.
 *
 * 옛 분리:
 *  - PersonalityTab  → '나는 어떤 사람인가' (강약점·매트릭스·5행 균형)
 *  - HiddenSelfTab   → '숨겨진 나' (Lilith·Chiron·Vertex·12궁 그림자)
 *  - KarmaTab        → 카르마·노드·생애 주제 (이건 KarmaTab의 핵심을 같이
 *                       PersonalityTab의 destinyNarrative 흐름에 흡수)
 *
 * 사용자 피드백 "테마는 줄이고 5개" 반영.
 */
function GrowthTab({
  saju,
  astro,
  lang,
  isKo,
  data,
  destinyNarrative,
  combinedLifeTheme,
}: TabProps) {
  if (!data) {
    return <div className="text-gray-400 text-center p-6">Loading...</div>;
  }

  // ─── 성격(나) 섹션 ────────────────────────────────────────────────
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

  // ─── 숨겨진 나 섹션 ────────────────────────────────────────────────
  const hiddenSelf = expandNarrativeDeep(
    repairMojibakeDeep(getHiddenSelfAnalysis(saju, astro, isKo)),
    { isKo, topic: 'hidden', minSentences: 4 }
  );
  const enrich = (text: string, topic: 'hidden' | 'warning' = 'hidden', min = 4) =>
    ensureMinSentenceText(text, isKo, topic, min);

  return (
    <div className="space-y-6">
      {/* ──── 1. 성격 · 나 자신 ──── */}
      {combinedLifeTheme && <LifeThemeCard combinedLifeTheme={combinedLifeTheme} isKo={isKo} />}

      {strengthsWeaknesses && (
        <StrengthsWeaknessesSection strengthsWeaknesses={strengthsWeaknesses} isKo={isKo} />
      )}

      {expandedPersonalityAnalysis && (
        <PersonalityAnalysisSection personalityAnalysis={expandedPersonalityAnalysis} isKo={isKo} />
      )}

      <EmotionPatternCard destinyNarrative={expandedDestinyNarrative} isKo={isKo} />

      {personalizedAdvices.length > 0 && (
        <PersonalizedAdviceSection personalizedAdvices={personalizedAdvices} isKo={isKo} />
      )}

      <EnergyBalanceSection data={data} isKo={isKo} />

      {matrixAnalysis && <EastWestHarmonySection matrixAnalysis={matrixAnalysis} isKo={isKo} />}

      {shadowAnalysis && <ShadowSelfSection shadowAnalysis={shadowAnalysis} isKo={isKo} />}

      <PentagonChart saju={saju} astro={astro} lang={lang} isKo={isKo} data={data} />

      {/* ──── 2. 숨겨진 나 (그림자 · 카르마 · 무의식) ──── */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🌑</span>
          <div>
            <h3 className="text-lg font-bold text-gray-300">
              {isKo ? '숨겨진 나 (Hidden Self)' : 'Hidden Self'}
            </h3>
            <p className="text-gray-500 text-xs">
              {isKo
                ? '무의식과 그림자 속 숨겨진 에너지'
                : 'Hidden energy in the unconscious and shadow'}
            </p>
          </div>
        </div>
        {hiddenSelf && <ShadowEnergyScore hiddenSelf={hiddenSelf} isKo={isKo} />}
      </div>

      {hiddenSelf?.lilithShadow && (
        <LilithShadowCard lilithShadow={hiddenSelf.lilithShadow} isKo={isKo} />
      )}
      {hiddenSelf?.chiron && <ChironHealingCard chiron={hiddenSelf.chiron} isKo={isKo} />}
      {hiddenSelf?.hiddenPotential && (
        <HiddenFortuneCard hiddenPotential={hiddenSelf.hiddenPotential} isKo={isKo} />
      )}
      {hiddenSelf?.vertex && <VertexFateCard vertex={hiddenSelf.vertex} isKo={isKo} />}
      {hiddenSelf?.specialShinsal && hiddenSelf.specialShinsal.length > 0 && (
        <SpecialShinsalSection specialShinsal={hiddenSelf.specialShinsal} isKo={isKo} />
      )}
      {hiddenSelf?.twelfthHouse && (
        <UnconsciousPatternCard twelfthHouse={hiddenSelf.twelfthHouse} isKo={isKo} />
      )}

      {!hiddenSelf && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6 text-center">
          <span className="text-4xl mb-4 block">🌑</span>
          <h3 className="text-lg font-bold text-gray-300 mb-2">
            {isKo
              ? '숨겨진 자아 분석을 위해 더 많은 정보가 필요해요'
              : 'More info needed for hidden self analysis'}
          </h3>
          <p className="text-gray-500 text-sm">
            {enrich(
              isKo
                ? '사주와 점성 정보가 있으면 릴리스, 카이론, 버텍스 등 심층 분석을 제공해드려요.'
                : 'With saju and astrology data, we can provide deep analysis of Lilith, Chiron, Vertex, and more.',
              'warning',
              4
            )}
          </p>
        </div>
      )}

      {hiddenSelf && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 text-sm text-center">
            {enrich(
              isKo
                ? '💜 그림자 자아를 인정하고 통합하면, 당신은 더욱 완전한 존재가 됩니다.'
                : '💜 By acknowledging and integrating your shadow self, you become a more complete being.',
              'hidden',
              4
            )}
          </p>
        </div>
      )}

      {/* ──── 3. 카르마 · 영혼의 주제 (CTA는 KarmaTab 내부에서 렌더) ──── */}
      <KarmaTab
        saju={saju}
        astro={astro}
        lang={lang}
        isKo={isKo}
        data={data}
        destinyNarrative={destinyNarrative}
      />
    </div>
  );
}

export default memo(GrowthTab);
