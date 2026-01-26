// Layer 4: Timing Overlay Analysis
// Analyzes the fusion between Saju timing cycles and Western transits

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { TIMING_OVERLAY_MATRIX } from '@/lib/destiny-matrix/data/layer4-timing-overlay';
import type { TransitCycle, TimingCycleRow, InteractionCode } from '@/lib/destiny-matrix/types';
import type { SajuData } from '../../../types';
import { mapSajuElementToKo } from '../../utils';
import type { TimingOverlayResult } from '../../types';

// Timing cycle localized names
const TIMING_CYCLE_NAMES: Record<string, { ko: string; en: string }> = {
  daeunTransition: { ko: '대운 전환기', en: 'Major Luck Transition' },
  '목': { ko: '목(木) 세운', en: 'Wood Year' },
  '화': { ko: '화(火) 세운', en: 'Fire Year' },
  '토': { ko: '토(土) 세운', en: 'Earth Year' },
  '금': { ko: '금(金) 세운', en: 'Metal Year' },
  '수': { ko: '수(水) 세운', en: 'Water Year' },
  shortTerm: { ko: '단기운', en: 'Short-term' },
  wolun: { ko: '월운', en: 'Monthly Luck' },
  ilun: { ko: '일운', en: 'Daily Luck' },
};

// Transit cycle localized names
const TRANSIT_CYCLE_NAMES: Record<string, { ko: string; en: string }> = {
  saturnReturn: { ko: '토성회귀', en: 'Saturn Return' },
  jupiterReturn: { ko: '목성회귀', en: 'Jupiter Return' },
  uranusSquare: { ko: '천왕성스퀘어', en: 'Uranus Square' },
  neptuneSquare: { ko: '해왕성스퀘어', en: 'Neptune Square' },
  plutoTransit: { ko: '명왕성트랜짓', en: 'Pluto Transit' },
  nodeReturn: { ko: '노드회귀', en: 'Node Return' },
  eclipse: { ko: '일식/월식', en: 'Eclipse' },
  mercuryRetrograde: { ko: '수성역행', en: 'Mercury Retrograde' },
  venusRetrograde: { ko: '금성역행', en: 'Venus Retrograde' },
  marsRetrograde: { ko: '화성역행', en: 'Mars Retrograde' },
  jupiterRetrograde: { ko: '목성역행', en: 'Jupiter Retrograde' },
  saturnRetrograde: { ko: '토성역행', en: 'Saturn Retrograde' },
};

// Extended Saju data type for internal use
interface ExtendedSajuData {
  dayMaster?: { element?: string; name?: string; heavenlyStem?: string };
  sibsin?: Record<string, unknown>;
  twelveStages?: Record<string, unknown>;
  shinsal?: Array<{ name?: string; shinsal?: string } | string> | Record<string, unknown>;
  sinsal?: {
    luckyList?: Array<{ name?: string } | string>;
    unluckyList?: Array<{ name?: string } | string>;
    twelveAll?: Array<{ name?: string }>;
  };
}

/**
 * Analyzes timing overlays between Saju timing cycles and Western transits
 * @param saju - Saju birth data
 * @param astro - Western astrology data
 * @param lang - Language code ('ko' or 'en')
 * @returns Array of timing overlay analysis results (max 6)
 */
export function getTimingOverlayAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: unknown,
  lang: string
): TimingOverlayResult[] {
  const isKo = lang === 'ko';
  const results: TimingOverlayResult[] = [];

  if (!saju && !astro) {return results;}

  const extSaju = saju as ExtendedSajuData | undefined;

  // 일간 오행으로 세운 결정
  const dayElement = extSaju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 주요 트랜짓 주기 분석 (Saturn Return, Jupiter Return, Eclipse 중심)
  const mainTransits: TransitCycle[] = ['saturnReturn', 'jupiterReturn', 'eclipse', 'mercuryRetrograde'];

  for (const transit of mainTransits) {
    // 세운 오행과 트랜짓의 조합 분석
    const timingData = TIMING_OVERLAY_MATRIX[sajuEl as TimingCycleRow];
    if (timingData && timingData[transit]) {
      const interaction = timingData[transit];
      const timingInfo = TIMING_CYCLE_NAMES[sajuEl] || { ko: sajuEl, en: sajuEl };
      const transitInfo = TRANSIT_CYCLE_NAMES[transit] || { ko: transit, en: transit };

      results.push({
        timingCycle: sajuEl,
        transitCycle: transit,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: `${timingInfo.ko} × ${transitInfo.ko} = ${interaction.keyword}`,
            en: `${timingInfo.en} × ${transitInfo.en} = ${interaction.keywordEn}`,
          },
        },
        timingInfo,
        transitInfo,
        advice: (interaction as InteractionCode & { advice?: string }).advice,
      });
    }
  }

  return results.slice(0, 6); // 최대 6개
}
