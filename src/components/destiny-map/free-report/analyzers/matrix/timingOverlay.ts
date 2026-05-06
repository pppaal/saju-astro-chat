/**
 * Layer 4: Timing Overlay Analysis
 * 타이밍 오버레이 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { TIMING_OVERLAY_MATRIX } from '@/lib/destiny-matrix/data/layer4-timing-overlay';
import type { TimingCycleRow, TransitCycle, InteractionCode } from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import type { SajuData } from '../../types';
import type { TimingOverlayResult } from './types';

// 타이밍 주기 한글/영어명
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

// 트랜짓 주기 한글/영어명
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

function mapSajuElementToKo(el: string): FiveElement {
  const map: Record<string, FiveElement> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  };
  return map[el] || '토';
}

/**
 * 타이밍 오버레이 분석
 */
export function analyzeTimingOverlay(
  saju: SajuData | undefined,
  lang: string
): TimingOverlayResult[] {
  const _isKo = lang === 'ko';
  const results: TimingOverlayResult[] = [];

  if (!saju) {return results;}

  // 일간 오행으로 세운 결정
  const dayElement = saju?.dayMaster?.element || 'wood';
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
