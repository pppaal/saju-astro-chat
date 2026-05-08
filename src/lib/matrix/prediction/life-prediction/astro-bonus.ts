/**
 * Astrology Bonus Calculation
 * 점성술 기반 보너스 점수 계산
 */

import type { EventType, LifePredictionInput, BonusResult } from './types';
import { ASTRO_EVENT_CONDITIONS, TRANSIT_EVENT_CONDITIONS, EVENT_HOUSES } from './constants';

// ============================================================
// TIER 3: 점성술 기반 스코어 보정 계산
// ============================================================

/**
 * 점성술 데이터를 기반으로 이벤트 타입별 보너스 계산
 */
export function calculateAstroBonus(
  input: LifePredictionInput,
  eventType: EventType,
  targetMonth?: { year: number; month: number }
): BonusResult {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const chart = input.astroChart;
  const advanced = input.advancedAstro;

  if (!chart && !advanced) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  const conditions = ASTRO_EVENT_CONDITIONS[eventType];

  // 1. 태양 별자리 체크
  if (chart?.sun?.sign && conditions.beneficSigns.includes(chart.sun.sign)) {
    bonus += 5;
    reasons.push(`태양 ${chart.sun.sign} - ${eventType}에 유리한 에너지`);
  }

  // 2. 길성(Venus, Jupiter) 위치 체크
  for (const planet of conditions.beneficPlanets) {
    const planetData = chart?.[planet.toLowerCase() as keyof typeof chart];
    if (planetData && typeof planetData === 'object' && 'sign' in planetData) {
      if (planetData.sign && conditions.beneficSigns.includes(planetData.sign)) {
        bonus += 6;
        reasons.push(`${planet} ${planetData.sign} - 조화로운 배치`);
      }
      // 역행 체크
      if ('isRetrograde' in planetData && planetData.isRetrograde) {
        if (conditions.maleficPlanets.includes(planet)) {
          bonus -= 4;
          penalties.push(`${planet} 역행 - 주의 필요`);
        }
      }
    }
  }

  // 3. 흉성 체크
  for (const planet of conditions.maleficPlanets) {
    const planetData = chart?.[planet.toLowerCase() as keyof typeof chart];
    if (planetData && typeof planetData === 'object' && 'sign' in planetData) {
      // 흉성이 민감한 별자리에 있으면 주의
      if (planetData.sign === 'Aries' || planetData.sign === 'Scorpio') {
        bonus -= 3;
        penalties.push(`${planet} ${planetData.sign} - 잠재적 도전`);
      }
    }
  }

  // 4. 달 위상 보너스
  if (advanced?.electional?.moonPhase?.phase) {
    const phase = advanced.electional.moonPhase.phase;
    const phaseBonus = conditions.moonPhaseBonus[phase] || 0;
    if (phaseBonus > 0) {
      bonus += phaseBonus;
      const phaseNames: Record<string, string> = {
        'new_moon': '새달', 'waxing_crescent': '초승달', 'first_quarter': '상현달',
        'waxing_gibbous': '차오르는달', 'full_moon': '보름달', 'waning_gibbous': '기우는달',
        'last_quarter': '하현달', 'waning_crescent': '그믐달',
      };
      reasons.push(`${phaseNames[phase] || phase} - ${eventType}에 좋은 시기`);
    }
  }

  // 5. Solar Return 테마 체크
  if (advanced?.solarReturn?.summary?.theme) {
    const theme = advanced.solarReturn.summary.theme.toLowerCase();
    const themeMatches: Record<EventType, string[]> = {
      marriage: ['love', 'partnership', 'relationship', 'commitment'],
      career: ['career', 'success', 'achievement', 'recognition'],
      investment: ['money', 'wealth', 'finance', 'growth'],
      move: ['travel', 'change', 'new beginnings', 'home'],
      study: ['learning', 'education', 'knowledge', 'growth'],
      health: ['health', 'vitality', 'healing', 'wellness'],
      relationship: ['love', 'connection', 'social', 'friendship'],
    };

    if (themeMatches[eventType]?.some(t => theme.includes(t))) {
      bonus += 10;
      reasons.push(`올해 Solar Return 테마: ${eventType}와 일치`);
    }
  }

  // 6. 일식/월식 영향
  if (advanced?.eclipses?.impact) {
    const impact = advanced.eclipses.impact;
    // 일식은 새 시작, 월식은 완성/종료에 유리
    if (impact.type === 'solar' && ['career', 'move', 'study'].includes(eventType)) {
      bonus += 5;
      reasons.push('일식 영향 - 새로운 시작에 유리');
    } else if (impact.type === 'lunar' && ['marriage', 'relationship'].includes(eventType)) {
      bonus += 5;
      reasons.push('월식 영향 - 관계 완성에 유리');
    }
  }

  return { bonus, reasons, penalties };
}

// ============================================================
// TIER 4: 트랜짓 기반 스코어 보정 계산
// ============================================================

/**
 * 외행성이 네이탈 차트에 미치는 영향을 분석
 */
export function calculateTransitBonus(
  input: LifePredictionInput,
  eventType: EventType,
  _targetMonth?: { year: number; month: number }
): BonusResult {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const transits = input.advancedAstro?.currentTransits;
  if (!transits) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  const conditions = TRANSIT_EVENT_CONDITIONS[eventType];

  // 1. 현재 활성 트랜짓 애스펙트 분석
  const majorTransits = transits.majorTransits || [];

  for (const aspect of majorTransits) {
    const isBeneficPlanet = conditions.beneficPlanets.includes(aspect.transitPlanet);
    const isMaleficPlanet = conditions.maleficPlanets.includes(aspect.transitPlanet);
    const isKeyNatalPoint = conditions.keyNatalPoints.includes(aspect.natalPoint);
    const isBeneficAspect = conditions.beneficAspects.includes(aspect.type);
    const isMaleficAspect = conditions.maleficAspects.includes(aspect.type);

    // 접근 중인 애스펙트는 영향력 증가
    const applyingMultiplier = aspect.isApplying ? 1.2 : 0.8;

    // 긍정적 행성의 긍정적 애스펙트
    if (isBeneficPlanet && isBeneficAspect && isKeyNatalPoint) {
      const pointBonus = Math.round(12 * applyingMultiplier);
      bonus += pointBonus;
      reasons.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - ${eventType}에 최적`);
    }
    // 긍정적 행성의 부정적 애스펙트 (도전적이지만 성장)
    else if (isBeneficPlanet && isMaleficAspect && isKeyNatalPoint) {
      const pointBonus = Math.round(4 * applyingMultiplier);
      bonus += pointBonus;
      reasons.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - 도전적 성장 기회`);
    }
    // 부정적 행성의 부정적 애스펙트
    else if (isMaleficPlanet && isMaleficAspect && isKeyNatalPoint) {
      const penalty = Math.round(-10 * applyingMultiplier);
      bonus += penalty;
      penalties.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - ${eventType} 도전기`);
    }
    // 부정적 행성의 긍정적 애스펙트 (완화된 영향)
    else if (isMaleficPlanet && isBeneficAspect && isKeyNatalPoint) {
      const pointBonus = Math.round(-2 * applyingMultiplier);
      bonus += pointBonus;
      // 약한 부정적 영향이라 별도 메시지 없음
    }
  }

  // 2. 외행성 하우스 위치 분석
  const outerPlanets = transits.outerPlanets || [];
  for (const planet of outerPlanets) {
    if (conditions.favorableHouses.includes(planet.house)) {
      if (conditions.beneficPlanets.includes(planet.name)) {
        bonus += 8;
        reasons.push(`${planet.name} ${planet.house}하우스 트랜짓 - ${eventType} 지원`);
      } else if (conditions.maleficPlanets.includes(planet.name)) {
        // 악성 행성이 유리한 하우스에 있어도 긴장감
        bonus -= 3;
        penalties.push(`${planet.name} ${planet.house}하우스 - 조심스러운 접근 필요`);
      }
    }

    // 역행 체크
    if (planet.retrograde) {
      if (conditions.beneficPlanets.includes(planet.name)) {
        bonus -= 4;
        penalties.push(`${planet.name} 역행 - 지연 가능`);
      }
    }
  }

  // 3. 트랜짓 테마 분석
  const themes = transits.themes || [];
  for (const themeInfo of themes) {
    const theme = themeInfo.theme.toLowerCase();
    const themeEventMatches: Record<EventType, string[]> = {
      marriage: ['love', 'commitment', 'partnership'],
      career: ['career', 'achievement', 'authority'],
      investment: ['wealth', 'resources', 'transformation'],
      move: ['home', 'roots', 'change'],
      study: ['learning', 'communication', 'expansion'],
      health: ['vitality', 'healing', 'energy'],
      relationship: ['social', 'connection', 'harmony'],
    };

    if (themeEventMatches[eventType]?.some(t => theme.includes(t))) {
      bonus += 6;
      reasons.push(`트랜짓 테마 "${themeInfo.theme}" - ${eventType}와 일치`);
      break; // 하나만 반영
    }
  }

  return { bonus, reasons, penalties };
}

// ============================================================
// TIER 5+: 트랜짓 하우스 오버레이 분석
// ============================================================

/**
 * 트랜짓 행성이 네이탈 하우스에 어떤 영향을 미치는지
 */
export function calculateTransitHouseOverlay(
  input: LifePredictionInput,
  eventType: EventType
): { bonus: number; reasons: string[] } {
  let bonus = 0;
  const reasons: string[] = [];

  const transits = input.advancedAstro?.currentTransits;
  if (!transits?.outerPlanets) {
    return { bonus: 0, reasons: [] };
  }

  const houseConfig = EVENT_HOUSES[eventType];
  const transitConditions = TRANSIT_EVENT_CONDITIONS[eventType];

  for (const planet of transits.outerPlanets) {
    // 주요 하우스
    if (houseConfig.primary.includes(planet.house)) {
      if (transitConditions.beneficPlanets.includes(planet.name)) {
        bonus += 12;
        reasons.push(`${planet.name} ${planet.house}하우스 (핵심) - ${eventType} 강력 지원`);
      } else if (transitConditions.maleficPlanets.includes(planet.name)) {
        bonus -= 8;
        reasons.push(`${planet.name} ${planet.house}하우스 (핵심) - 도전적 에너지`);
      }
    }
    // 부차적 하우스
    else if (houseConfig.secondary.includes(planet.house)) {
      if (transitConditions.beneficPlanets.includes(planet.name)) {
        bonus += 6;
        reasons.push(`${planet.name} ${planet.house}하우스 - 보조 지원`);
      }
    }
    // 피해야 할 하우스
    else if (houseConfig.avoid.includes(planet.house)) {
      if (transitConditions.maleficPlanets.includes(planet.name)) {
        bonus -= 10;
        reasons.push(`${planet.name} ${planet.house}하우스 - 숨겨진 장애물`);
      }
    }
  }

  return { bonus, reasons };
}

// ============================================================
// 종합 점성술 보너스 계산
// ============================================================

/**
 * 모든 점성술 관련 보너스를 종합 계산
 */
export function calculateCombinedAstroBonus(
  input: LifePredictionInput,
  eventType: EventType,
  targetMonth?: { year: number; month: number }
): BonusResult {
  const astroBonus = calculateAstroBonus(input, eventType, targetMonth);
  const transitBonus = calculateTransitBonus(input, eventType, targetMonth);
  const houseOverlay = calculateTransitHouseOverlay(input, eventType);

  return {
    bonus: astroBonus.bonus + transitBonus.bonus + houseOverlay.bonus,
    reasons: [...astroBonus.reasons, ...transitBonus.reasons, ...houseOverlay.reasons],
    penalties: [...astroBonus.penalties, ...transitBonus.penalties],
  };
}
