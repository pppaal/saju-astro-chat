/**
 * 생애 예측 엔진 점성술 보정 함수
 * lifePredictionEngine.ts에서 분리된 점성술 관련 계산 로직
 */

import type {
  EventType,
  LifePredictionInput,
  BonusResult,
} from './life-prediction-types';

import {
  ASTRO_EVENT_CONDITIONS,
  TRANSIT_EVENT_CONDITIONS,
  EVENT_HOUSES,
  MOON_PHASE_NAMES,
} from './life-prediction-constants';

// ============================================================
// 점성 데이터 기반 스코어 보정
// ============================================================

/**
 * 점성 데이터 기반 스코어 보정 계산
 */
export function calculateAstroBonus(
  input: LifePredictionInput,
  eventType: EventType
): BonusResult {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  if (!input.astroChart && !input.advancedAstro) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  const conditions = ASTRO_EVENT_CONDITIONS[eventType];
  const astro = input.astroChart;
  const advanced = input.advancedAstro;

  // 1. 주요 행성 별자리 체크
  if (astro) {
    // 금성 체크 (결혼/연애)
    if (astro.venus?.sign && conditions.favorableSigns.includes(astro.venus.sign)) {
      bonus += 8;
      reasons.push(`금성 ${astro.venus.sign} - ${eventType}에 유리`);
    }

    // 목성 체크 (확장/행운)
    if (astro.jupiter?.sign && conditions.favorableSigns.includes(astro.jupiter.sign)) {
      bonus += 6;
      reasons.push(`목성 ${astro.jupiter.sign} - 행운 지원`);
    }

    // 태양 하우스 체크
    if (astro.sun?.house && conditions.favorableHouses.includes(astro.sun.house)) {
      bonus += 7;
      reasons.push(`태양 ${astro.sun.house}하우스 - 에너지 집중`);
    }

    // 달 하우스 체크
    if (astro.moon?.house && conditions.favorableHouses.includes(astro.moon.house)) {
      bonus += 5;
      reasons.push(`달 ${astro.moon.house}하우스 - 감정 지원`);
    }

    // Part of Fortune 체크
    if (advanced?.extraPoints?.partOfFortune?.house &&
        conditions.favorableHouses.includes(advanced.extraPoints.partOfFortune.house)) {
      bonus += 6;
      reasons.push(`행운점 ${advanced.extraPoints.partOfFortune.house}하우스 - 길운`);
    }
  }

  // 2. 역행 체크
  if (advanced?.electional?.retrograde) {
    for (const retroPlanet of advanced.electional.retrograde) {
      if (conditions.avoidRetrogrades.includes(retroPlanet)) {
        bonus -= 10;
        penalties.push(`${retroPlanet} 역행 - ${eventType} 주의`);
      }
    }
  } else if (astro?.planets) {
    // 기본 차트에서 역행 체크
    for (const planet of astro.planets) {
      if (planet.isRetrograde && conditions.avoidRetrogrades.includes(planet.name)) {
        bonus -= 10;
        penalties.push(`${planet.name} 역행 - ${eventType} 주의`);
      }
    }
  }

  // 3. Void of Course 체크
  if (advanced?.electional?.voidOfCourse?.isVoid) {
    bonus -= 8;
    penalties.push('달 공전 (Void of Course) - 중요 결정 보류 권장');
  }

  // 4. 달 위상 보너스
  if (advanced?.electional?.moonPhase?.phase) {
    const phase = advanced.electional.moonPhase.phase;
    const phaseBonus = conditions.moonPhaseBonus[phase] || 0;
    if (phaseBonus > 0) {
      bonus += phaseBonus;
      reasons.push(`${MOON_PHASE_NAMES[phase] || phase} - ${eventType}에 좋은 시기`);
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
// 트랜짓 기반 스코어 보정
// ============================================================

/**
 * TIER 4: 트랜짓 기반 스코어 보정 계산
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

    if (isBeneficPlanet && isKeyNatalPoint && isBeneficAspect) {
      const baseScore = 12;
      bonus += Math.round(baseScore * applyingMultiplier);
      reasons.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - 길운`);
    } else if (isMaleficPlanet && isKeyNatalPoint && isMaleficAspect) {
      const baseScore = -10;
      bonus += Math.round(baseScore * applyingMultiplier);
      penalties.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - 주의`);
    } else if (isBeneficPlanet && isBeneficAspect) {
      bonus += Math.round(6 * applyingMultiplier);
    } else if (isMaleficPlanet && isMaleficAspect && isKeyNatalPoint) {
      bonus -= Math.round(8 * applyingMultiplier);
    }
  }

  // 2. 트랜짓 테마 분석
  if (transits.themes) {
    for (const theme of transits.themes) {
      if (conditions.beneficPlanets.includes(theme.transitPlanet) &&
          conditions.keyNatalPoints.includes(theme.natalPoint)) {
        bonus += 5;
        reasons.push(`${theme.theme} 테마 활성`);
      }
    }
  }

  // 3. 활성 트랜짓 요약 분석
  if (transits.summary) {
    if (transits.summary.majorCount >= 3) {
      // 많은 주요 트랜짓은 변화의 시기
      if (['move', 'career'].includes(eventType)) {
        bonus += 5;
        reasons.push('다중 주요 트랜짓 - 변화의 시기');
      } else if (['marriage', 'investment'].includes(eventType)) {
        bonus -= 3;
        penalties.push('다중 트랜짓 - 신중한 결정 필요');
      }
    }
  }

  return {
    bonus: Math.max(-25, Math.min(25, bonus)),
    reasons: reasons.slice(0, 4),
    penalties: penalties.slice(0, 3),
  };
}

// ============================================================
// 트랜짓 하우스 오버레이 분석
// ============================================================

/**
 * TIER 5+: 트랜짓 하우스 오버레이 분석
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

  for (const planet of transits.outerPlanets) {
    const house = planet.house;

    // 목성이 중요 하우스에 있으면 큰 보너스
    if (planet.name === 'Jupiter') {
      if (houseConfig.primary.includes(house)) {
        bonus += 15;
        reasons.push(`목성 ${house}하우스 트랜짓 - ${eventType} 최적 위치`);
      } else if (houseConfig.secondary.includes(house)) {
        bonus += 8;
        reasons.push(`목성 ${house}하우스 - 지원 에너지`);
      }
    }

    // 토성이 중요 하우스에 있으면
    if (planet.name === 'Saturn') {
      if (houseConfig.primary.includes(house)) {
        // 토성은 구조화, 책임 - 커리어에는 긍정적
        if (eventType === 'career') {
          bonus += 6;
          reasons.push(`토성 ${house}하우스 - 커리어 구조화`);
        } else {
          bonus -= 5;
        }
      } else if (houseConfig.avoid.includes(house)) {
        bonus -= 8;
        reasons.push(`토성 ${house}하우스 - 제한/지연`);
      }
    }

    // 천왕성 (갑작스러운 변화)
    if (planet.name === 'Uranus') {
      if (houseConfig.primary.includes(house)) {
        if (eventType === 'move' || eventType === 'career') {
          bonus += 5; // 변화에 유리한 이벤트
        } else {
          bonus -= 3; // 안정이 필요한 이벤트에는 불리
        }
      }
    }

    // 명왕성 (변형)
    if (planet.name === 'Pluto') {
      if (houseConfig.primary.includes(house)) {
        bonus += 4; // 심오한 변화
        reasons.push(`명왕성 ${house}하우스 - 근본적 변화`);
      }
    }

    // 해왕성 (환상, 혼란)
    if (planet.name === 'Neptune') {
      if (houseConfig.primary.includes(house)) {
        if (eventType === 'relationship' || eventType === 'marriage') {
          bonus -= 5; // 환상에 빠질 수 있음
        }
      }
    }
  }

  return { bonus: Math.max(-20, Math.min(20, bonus)), reasons: reasons.slice(0, 3) };
}

// ============================================================
// 월별 트랜짓 예상 점수
// ============================================================

/**
 * 미래 월의 트랜짓 점수 추정
 */
export function estimateMonthlyTransitScore(
  input: LifePredictionInput,
  eventType: EventType,
  year: number,
  month: number
): { bonus: number; reasons: string[] } {
  let bonus = 0;
  const reasons: string[] = [];

  // 점성 차트가 없으면 기본값 반환
  if (!input.astroChart) {
    return { bonus: 0, reasons: [] };
  }

  // 외행성 이동 추정 (대략적인 연간 이동)
  // 목성: ~30도/년, 토성: ~12도/년
  const monthsFromNow = (year - new Date().getFullYear()) * 12 + (month - new Date().getMonth() - 1);

  // 목성 위치 추정
  if (input.astroChart.jupiter?.longitude !== undefined) {
    const estimatedJupiterLong = (input.astroChart.jupiter.longitude + (monthsFromNow * 2.5)) % 360;
    const estimatedJupiterHouse = Math.floor(estimatedJupiterLong / 30) + 1;

    const houseConfig = EVENT_HOUSES[eventType];
    if (houseConfig.primary.includes(estimatedJupiterHouse)) {
      bonus += 10;
      reasons.push(`목성 ${estimatedJupiterHouse}하우스 예상 - 유리`);
    }
  }

  // 토성 위치 추정
  if (input.astroChart.saturn?.longitude !== undefined) {
    const estimatedSaturnLong = (input.astroChart.saturn.longitude + (monthsFromNow * 1)) % 360;
    const estimatedSaturnHouse = Math.floor(estimatedSaturnLong / 30) + 1;

    const houseConfig = EVENT_HOUSES[eventType];
    if (houseConfig.avoid.includes(estimatedSaturnHouse)) {
      bonus -= 5;
      reasons.push(`토성 ${estimatedSaturnHouse}하우스 예상 - 주의`);
    }
  }

  return { bonus: Math.max(-15, Math.min(15, bonus)), reasons };
}
