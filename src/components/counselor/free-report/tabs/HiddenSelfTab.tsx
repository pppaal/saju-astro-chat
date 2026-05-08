"use client";

import { repairMojibakeDeep } from '@/lib/text/mojibake';
import { ensureMinSentenceText } from './shared/textDepth';
import { expandNarrativeDeep } from './shared/longForm';
import type { TabProps } from './types';
import UnifiedSection from './shared/UnifiedSection';
import type { UnifiedSlice } from '../analyzers/unifiedAdapter';
import { PremiumReportCTA } from '../components';
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

export default function HiddenSelfTab({ isKo, saju, astro, data }: TabProps) {
  const unified = (data as { unified?: UnifiedSlice | null } | null)?.unified ?? null;
  const hiddenSelf = expandNarrativeDeep(
    repairMojibakeDeep(getHiddenSelfAnalysis(saju, astro, isKo)),
    { isKo, topic: 'hidden', minSentences: 4 }
  );
  const enrich = (text: string, topic: 'hidden' | 'warning' = 'hidden', min = 4) =>
    ensureMinSentenceText(text, isKo, topic, min);

  return (
    <div className="space-y-6">
      <UnifiedSection unified={unified} variant="cycle" isKo={isKo} />
      {/* 숨겨진 자아 소개 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🌑</span>
          <div>
            <h3 className="text-lg font-bold text-gray-300">{isKo ? '숨겨진 나 (Hidden Self)' : 'Hidden Self'}</h3>
            <p className="text-gray-500 text-xs">{isKo ? '무의식과 그림자 속 숨겨진 에너지' : 'Hidden energy in the unconscious and shadow'}</p>
          </div>
        </div>

        {hiddenSelf && <ShadowEnergyScore hiddenSelf={hiddenSelf} isKo={isKo} />}
      </div>

      {hiddenSelf?.lilithShadow && <LilithShadowCard lilithShadow={hiddenSelf.lilithShadow} isKo={isKo} />}

      {hiddenSelf?.chiron && <ChironHealingCard chiron={hiddenSelf.chiron} isKo={isKo} />}

      {hiddenSelf?.hiddenPotential && <HiddenFortuneCard hiddenPotential={hiddenSelf.hiddenPotential} isKo={isKo} />}

      {hiddenSelf?.vertex && <VertexFateCard vertex={hiddenSelf.vertex} isKo={isKo} />}

      {hiddenSelf?.specialShinsal && hiddenSelf.specialShinsal.length > 0 && (
        <SpecialShinsalSection specialShinsal={hiddenSelf.specialShinsal} isKo={isKo} />
      )}

      {hiddenSelf?.twelfthHouse && <UnconsciousPatternCard twelfthHouse={hiddenSelf.twelfthHouse} isKo={isKo} />}

      {/* 데이터 없을 때 */}
      {!hiddenSelf && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6 text-center">
          <span className="text-4xl mb-4 block">🌑</span>
          <h3 className="text-lg font-bold text-gray-300 mb-2">
            {isKo ? '숨겨진 자아 분석을 위해 더 많은 정보가 필요해요' : 'More info needed for hidden self analysis'}
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

      {/* 마무리 팁 */}
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

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="hidden"
        matrixData={{ hiddenSelf }}
      />
    </div>
  );
}
