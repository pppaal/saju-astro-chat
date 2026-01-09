/**
 * Score Calculator
 * 점수 계산 로직을 중앙화하여 투명하고 일관된 계산 제공
 */

import type { SajuData, AstroData } from '../types';
import type { BilingualText } from '../types/core';
import { CHARM_SCORE_CONFIG, WEALTH_SCORE_CONFIG, KARMA_SCORE_CONFIG, getScoreGrade } from './config';
import { getPlanetSign } from '../utils/planets';
import { hasHarmoniousAspect } from '../utils/aspects';
import { getPlanetHouse, getPlanetsInHouse } from '../utils/houses';
import { getGeokgukType } from '../utils/geokguk';

/**
 * Score component for breakdown
 */
export interface ScoreComponent {
  source: 'saju' | 'astrology' | 'synergy';
  item: string;
  value: number;
  description: BilingualText;
}

/**
 * Score calculation result
 */
export interface ScoreResult {
  score: number;
  components: ScoreComponent[];
  grade: BilingualText;
  emoji: string;
}

/**
 * 매력 점수 계산
 */
export function calculateCharmScore(
  saju: SajuData | undefined,
  astro: AstroData | undefined
): ScoreResult {
  const config = CHARM_SCORE_CONFIG;
  let score = config.baseScore;
  const components: ScoreComponent[] = [];
  let sajuBonus = 0;
  let astroBonus = 0;
  let synergyBonus = 0;

  // === 사주 요소 ===
  const sinsal = saju?.sinsal || saju?.advancedAnalysis?.sinsal;
  const luckyList = (sinsal as { luckyList?: Array<{ name?: string } | string> } | undefined)?.luckyList || [];
  const unluckyList = (sinsal as { unluckyList?: Array<{ name?: string } | string> } | undefined)?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];

  // 도화살
  const hasDohwa = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('도화');
  });
  if (hasDohwa) {
    const bonus = config.components.saju.items.dohwa.weight;
    sajuBonus += bonus;
    components.push({
      source: 'saju',
      item: 'dohwa',
      value: bonus,
      description: config.components.saju.items.dohwa.description,
    });
  }

  // 홍염살
  const hasHongyeom = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('홍염');
  });
  if (hasHongyeom) {
    const bonus = config.components.saju.items.hongyeom.weight;
    sajuBonus += bonus;
    components.push({
      source: 'saju',
      item: 'hongyeom',
      value: bonus,
      description: config.components.saju.items.hongyeom.description,
    });
  }

  // 일간 매력 (병/정/계)
  const dayMaster = saju?.dayMaster?.heavenlyStem || saju?.dayMaster?.name;
  const charmingDayMasters = ['병', '정', '계', '丙', '丁', '癸'];
  if (dayMaster && charmingDayMasters.includes(dayMaster)) {
    const bonus = config.components.saju.items.dayMasterCharm.weight;
    sajuBonus += bonus;
    components.push({
      source: 'saju',
      item: 'dayMasterCharm',
      value: bonus,
      description: config.components.saju.items.dayMasterCharm.description,
    });
  }

  // 사주 보너스 캡 적용
  sajuBonus = Math.min(sajuBonus, config.components.saju.maxBonus);

  // === 점성학 요소 ===
  let venusDignityGood = false;
  if (astro) {
    // 금성 본좌/고양 (황소/천칭/물고기)
    const venusSign = getPlanetSign(astro, 'venus');
    venusDignityGood = ['taurus', 'libra', 'pisces'].includes(venusSign || '');
    if (venusDignityGood) {
      const bonus = config.components.astrology.items.venusDignity.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'venusDignity',
        value: bonus,
        description: config.components.astrology.items.venusDignity.description,
      });
    }

    // 금성 1/5/7하우스
    const venusHouse = getPlanetHouse(astro, 'venus');
    if (venusHouse && [1, 5, 7].includes(venusHouse)) {
      const bonus = config.components.astrology.items.venusHouse.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'venusHouse',
        value: bonus,
        description: config.components.astrology.items.venusHouse.description,
      });
    }

    // 금성-화성 조화 애스펙트
    if (hasHarmoniousAspect(astro, 'venus', 'mars')) {
      const bonus = config.components.astrology.items.venusMarsAspect.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'venusMarsAspect',
        value: bonus,
        description: config.components.astrology.items.venusMarsAspect.description,
      });
    }

    // 7하우스 행성 있음
    const house7Planets = getPlanetsInHouse(astro, 7);
    if (house7Planets.length > 0) {
      const bonus = config.components.astrology.items.house7Planets.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'house7Planets',
        value: bonus,
        description: config.components.astrology.items.house7Planets.description,
      });
    }

    // 점성학 보너스 캡 적용
    astroBonus = Math.min(astroBonus, config.components.astrology.maxBonus);

    // === 조합 보너스 ===
    // 도화 + 금성 좋음
    if (hasDohwa && venusDignityGood) {
      const bonus = config.components.synergy.items.dohwaVenus.weight;
      synergyBonus += bonus;
      components.push({
        source: 'synergy',
        item: 'dohwaVenus',
        value: bonus,
        description: config.components.synergy.items.dohwaVenus.description,
      });
    }

    // 달-금성 조화
    if (hasHarmoniousAspect(astro, 'moon', 'venus')) {
      const bonus = config.components.synergy.items.moonVenus.weight;
      synergyBonus += bonus;
      components.push({
        source: 'synergy',
        item: 'moonVenus',
        value: bonus,
        description: config.components.synergy.items.moonVenus.description,
      });
    }

    // 시너지 보너스 캡 적용
    synergyBonus = Math.min(synergyBonus, config.components.synergy.maxBonus);
  }

  // 최종 점수 계산
  score += sajuBonus + astroBonus + synergyBonus;
  score = Math.min(score, config.maxScore);

  const grade = getScoreGrade(score);

  return {
    score,
    components,
    grade: grade.label,
    emoji: grade.emoji,
  };
}

/**
 * 재물운 점수 계산
 */
export function calculateWealthScore(
  saju: SajuData | undefined,
  astro: AstroData | undefined
): ScoreResult {
  const config = WEALTH_SCORE_CONFIG;
  let score = config.baseScore;
  const components: ScoreComponent[] = [];
  let sajuBonus = 0;
  let astroBonus = 0;
  let synergyBonus = 0;

  // === 사주 요소 ===
  if (saju) {
    // 재성 강함
    const sibsinDist = saju.advancedAnalysis?.sibsin?.sibsinDistribution;
    if (sibsinDist) {
      const jaesung = (sibsinDist['정재'] || 0) + (sibsinDist['편재'] || 0) + (sibsinDist['재성'] || 0);
      if (jaesung >= 2) {
        const bonus = config.components.saju.items.jaeSung.weight;
        sajuBonus += bonus;
        components.push({
          source: 'saju',
          item: 'jaeSung',
          value: bonus,
          description: config.components.saju.items.jaeSung.description,
        });
      }
    }

    // 식상생재
    if (sibsinDist) {
      const siksang = (sibsinDist['식신'] || 0) + (sibsinDist['상관'] || 0) + (sibsinDist['식상'] || 0);
      const jaesung = (sibsinDist['정재'] || 0) + (sibsinDist['편재'] || 0) + (sibsinDist['재성'] || 0);
      if (siksang >= 1 && jaesung >= 1) {
        const bonus = config.components.saju.items.sikSang.weight;
        sajuBonus += bonus;
        components.push({
          source: 'saju',
          item: 'sikSang',
          value: bonus,
          description: config.components.saju.items.sikSang.description,
        });
      }
    }

    // 통근 점수
    const tonggeunScore = saju.advancedAnalysis?.tonggeun?.score || saju.advancedAnalysis?.tonggeun?.totalScore || 0;
    if (tonggeunScore >= 50) {
      const bonus = config.components.saju.items.tonggeun.weight;
      sajuBonus += bonus;
      components.push({
        source: 'saju',
        item: 'tonggeun',
        value: bonus,
        description: config.components.saju.items.tonggeun.description,
      });
    }

    sajuBonus = Math.min(sajuBonus, config.components.saju.maxBonus);
  }

  // === 점성학 요소 ===
  if (astro) {
    // 목성 2/8/10하우스
    const jupiterHouse = getPlanetHouse(astro, 'jupiter');
    if (jupiterHouse && [2, 8, 10].includes(jupiterHouse)) {
      const bonus = config.components.astrology.items.jupiterHouse.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'jupiterHouse',
        value: bonus,
        description: config.components.astrology.items.jupiterHouse.description,
      });
    }

    // 2하우스 행성
    const house2Planets = getPlanetsInHouse(astro, 2);
    if (house2Planets.length > 0) {
      const bonus = config.components.astrology.items.house2Planets.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'house2Planets',
        value: bonus,
        description: config.components.astrology.items.house2Planets.description,
      });
    }

    // 토성 조화 애스펙트
    if (hasHarmoniousAspect(astro, 'saturn', 'sun') || hasHarmoniousAspect(astro, 'saturn', 'jupiter')) {
      const bonus = config.components.astrology.items.saturnTrine.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'saturnTrine',
        value: bonus,
        description: config.components.astrology.items.saturnTrine.description,
      });
    }

    astroBonus = Math.min(astroBonus, config.components.astrology.maxBonus);

    // === 조합 보너스 ===
    const hasJaesung = sajuBonus > 0;
    const hasJupiterGood = getPlanetHouse(astro, 'jupiter') !== null;
    if (hasJaesung && hasJupiterGood) {
      const bonus = config.components.synergy.items.wealthCombo.weight;
      synergyBonus += bonus;
      components.push({
        source: 'synergy',
        item: 'wealthCombo',
        value: bonus,
        description: config.components.synergy.items.wealthCombo.description,
      });
    }

    synergyBonus = Math.min(synergyBonus, config.components.synergy.maxBonus);
  }

  score += sajuBonus + astroBonus + synergyBonus;
  score = Math.min(score, config.maxScore);

  const grade = getScoreGrade(score);

  return {
    score,
    components,
    grade: grade.label,
    emoji: grade.emoji,
  };
}

/**
 * 카르마 점수 계산
 */
export function calculateKarmaScore(
  saju: SajuData | undefined,
  astro: AstroData | undefined
): ScoreResult {
  const config = KARMA_SCORE_CONFIG;
  let score = config.baseScore;
  const components: ScoreComponent[] = [];
  let astroBonus = 0;
  let sajuBonus = 0;
  let synergyBonus = 0;

  // === 점성학 요소 ===
  if (astro) {
    // North Node 강함
    const northNodeHouse = getPlanetHouse(astro, 'northnode');
    if (northNodeHouse) {
      const bonus = config.components.astrology.items.northNode.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'northNode',
        value: bonus,
        description: config.components.astrology.items.northNode.description,
      });
    }

    // Chiron 치유 위치
    const chironSign = getPlanetSign(astro, 'chiron');
    if (chironSign) {
      const bonus = config.components.astrology.items.chiron.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'chiron',
        value: bonus,
        description: config.components.astrology.items.chiron.description,
      });
    }

    // Pluto 변환
    const plutoHouse = getPlanetHouse(astro, 'pluto');
    if (plutoHouse) {
      const bonus = config.components.astrology.items.pluto.weight;
      astroBonus += bonus;
      components.push({
        source: 'astrology',
        item: 'pluto',
        value: bonus,
        description: config.components.astrology.items.pluto.description,
      });
    }

    astroBonus = Math.min(astroBonus, config.components.astrology.maxBonus);
  }

  // === 사주 요소 ===
  if (saju) {
    // 격국 명확
    const geokgukName = (saju.advancedAnalysis?.geokguk?.name || saju.advancedAnalysis?.extended?.geokguk?.name) as string | undefined;
    const geokgukType = getGeokgukType(geokgukName);
    if (geokgukType) {
      const bonus = config.components.saju.items.geokguk.weight;
      sajuBonus += bonus;
      components.push({
        source: 'saju',
        item: 'geokguk',
        value: bonus,
        description: config.components.saju.items.geokguk.description,
      });
    }

    // 용신 명확
    const yongsin = saju.advancedAnalysis?.yongsin;
    if (yongsin?.element || yongsin?.name) {
      const bonus = config.components.saju.items.yongsin.weight;
      sajuBonus += bonus;
      components.push({
        source: 'saju',
        item: 'yongsin',
        value: bonus,
        description: config.components.saju.items.yongsin.description,
      });
    }

    sajuBonus = Math.min(sajuBonus, config.components.saju.maxBonus);
  }

  // === 조합 보너스 ===
  if (sajuBonus > 0 && astroBonus > 0) {
    const bonus = config.components.synergy.items.soulCombo.weight;
    synergyBonus += bonus;
    components.push({
      source: 'synergy',
      item: 'soulCombo',
      value: bonus,
      description: config.components.synergy.items.soulCombo.description,
    });
  }

  synergyBonus = Math.min(synergyBonus, config.components.synergy.maxBonus);

  score += astroBonus + sajuBonus + synergyBonus;
  score = Math.min(score, config.maxScore);

  const grade = getScoreGrade(score);

  return {
    score,
    components,
    grade: grade.label,
    emoji: grade.emoji,
  };
}

/**
 * 점수 요약 생성
 */
export function generateScoreSummary(result: ScoreResult, isKo: boolean): string {
  const gradeLabel = isKo ? result.grade.ko : result.grade.en;
  const breakdown = result.components
    .map(c => `+${c.value} ${isKo ? c.description.ko : c.description.en}`)
    .join(', ');

  return `${result.emoji} ${result.score}점 (${gradeLabel})${breakdown ? ` - ${breakdown}` : ''}`;
}
