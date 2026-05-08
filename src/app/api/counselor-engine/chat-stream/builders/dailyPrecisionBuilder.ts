/**
 * Daily Precision Builder
 *
 * 일진 정밀 분석 섹션 구성
 * TIER 1: 공망/신살/에너지/시간대 분석
 */

import {
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
  calculateDailyPillar,
} from '@/lib/matrix/prediction/ultraPrecisionEngine';
import type {
  ShinsalAnalysis,
  EnergyFlowAnalysis,
  ShinsalHit,
} from '@/lib/matrix/prediction/ultra-precision-types';
import { extractFilteredStemsAndBranches } from '../helpers/pillarExtractors';
import type { SajuDataStructure } from '../lib/types';
import { logger } from '@/lib/logger';

/**
 * 일진 정밀 분석 섹션 구성
 *
 * @param saju - Saju 데이터
 * @param theme - 테마
 * @param lang - 언어
 * @returns 일진 정밀 분석 프롬프트 섹션
 */
export function buildDailyPrecisionSection(
  saju: SajuDataStructure | undefined,
  theme: string,
  lang: string
): string {
  // 'today'와 'chat' 테마에서만 활성화
  if (theme !== 'today' && theme !== 'chat') {
    return '';
  }

  if (!saju?.dayMaster) {
    return '';
  }

  try {
    const dayStem = saju.dayMaster?.heavenlyStem || '甲';
    const dayBranch = saju?.pillars?.day?.earthlyBranch?.name || '子';

    // 천간/지지 배열 추출
    const { stems: allStemsArr, branches: allBranchesArr } =
      extractFilteredStemsAndBranches(saju);

    // 오늘 일진 계산
    const today = new Date();
    const dailyPillar = calculateDailyPillar(today);

    // 공망 분석
    const gongmangResult = analyzeGongmang(dayStem, dayBranch, dailyPillar.branch);

    // 신살 분석
    const shinsalResult = analyzeShinsal(dayBranch, dailyPillar.branch);

    // 에너지 흐름 분석
    const energyResult = analyzeEnergyFlow(dayStem, allStemsArr, allBranchesArr);

    // 시간대별 조언
    const hourlyResult = generateHourlyAdvice(dailyPillar.stem, dailyPillar.branch);
    const excellentHours = hourlyResult
      .filter((h) => h.quality === 'excellent')
      .map((h) => `${h.hour}시(${h.siGan})`);
    const goodHours = hourlyResult
      .filter((h) => h.quality === 'good')
      .map((h) => `${h.hour}시`);
    const cautionHours = hourlyResult
      .filter((h) => h.quality === 'caution')
      .map((h) => `${h.hour}시`);

    // 프롬프트 섹션 구성
    const enhancedParts: string[] = [
      '',
      '═══════════════════════════════════════════════════════════════',
      lang === 'ko'
        ? '[🔮 오늘의 정밀 분석 - 공망/신살/에너지/시간대]'
        : '[🔮 TODAY\'S PRECISION ANALYSIS - Gongmang/Shinsal/Energy/Hours]',
      '═══════════════════════════════════════════════════════════════',
      '',
      lang === 'ko'
        ? `📅 오늘 일진: ${dailyPillar.stem}${dailyPillar.branch}`
        : `📅 Today: ${dailyPillar.stem}${dailyPillar.branch}`,
    ];

    // 공망 상태
    if (gongmangResult.isToday空) {
      enhancedParts.push(
        lang === 'ko'
          ? `⚠️ 공망: ${gongmangResult.emptyBranches.join(', ')} 공망 - ${gongmangResult.affectedAreas.join(', ')} 관련 신중히`
          : `⚠️ Gongmang: ${gongmangResult.emptyBranches.join(', ')} empty - Be careful with ${gongmangResult.affectedAreas.join(', ')}`
      );
    } else {
      enhancedParts.push(
        lang === 'ko'
          ? `✅ 공망: 영향 없음 (${gongmangResult.emptyBranches.join(', ')}는 공망이나 오늘과 무관)`
          : `✅ Gongmang: No effect today`
      );
    }

    // 신살 분석
    const typedShinsalResult = shinsalResult as ShinsalAnalysis;
    if (typedShinsalResult.active?.length > 0) {
      const shinsalList = typedShinsalResult.active
        .map((s: ShinsalHit) => `${s.name}: ${s.description}`)
        .join(', ');
      enhancedParts.push(
        lang === 'ko'
          ? `🌟 신살: ${shinsalList}`
          : `🌟 Shinsal: ${shinsalList}`
      );
    } else {
      enhancedParts.push(
        lang === 'ko' ? `✨ 신살: 특별한 신살 없음` : `✨ Shinsal: None active`
      );
    }

    // 에너지 흐름
    const typedEnergyResult = energyResult as EnergyFlowAnalysis;
    enhancedParts.push(
      lang === 'ko'
        ? `💫 에너지: ${typedEnergyResult.energyStrength} - ${typedEnergyResult.dominantElement}`
        : `💫 Energy: ${typedEnergyResult.energyStrength} - ${typedEnergyResult.dominantElement}`
    );

    // 시간대 조언
    if (excellentHours.length > 0) {
      enhancedParts.push(
        lang === 'ko'
          ? `⭐ 최고 시간: ${excellentHours.join(', ')}`
          : `⭐ Excellent Hours: ${excellentHours.join(', ')}`
      );
    }
    if (goodHours.length > 0) {
      enhancedParts.push(
        lang === 'ko'
          ? `👍 좋은 시간: ${goodHours.join(', ')}`
          : `👍 Good Hours: ${goodHours.join(', ')}`
      );
    }
    if (cautionHours.length > 0) {
      enhancedParts.push(
        lang === 'ko'
          ? `⚠️ 주의 시간: ${cautionHours.join(', ')}`
          : `⚠️ Caution Hours: ${cautionHours.join(', ')}`
      );
    }

    enhancedParts.push(
      '',
      lang === 'ko'
        ? '위 정밀 분석을 바탕으로 오늘의 흐름을 읽어 구체적인 조언을 제공하세요.'
        : 'Based on the precision analysis above, provide specific advice for today.'
    );

    return enhancedParts.join('\n');
  } catch (e) {
    logger.error('[dailyPrecisionBuilder] Error:', e);
    return '';
  }
}
