/**
 * Scoring Adapter
 * 기존 분석 함수 결과를 새 점수 시스템 입력으로 변환
 */

import type { SajuScoreInput, AstroScoreInput } from './scoring';

// ============================================================
// 기존 분석 결과 타입 (destinyCalendar.ts에서 사용)
// ============================================================

export interface LegacyAnalysisResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}

export interface LegacyYongsinResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  matchType?: 'primary' | 'secondary' | 'branch' | 'support';
  kibsinMatch?: boolean;
}

export interface LegacyGeokgukResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
  favorMatch?: boolean;
  avoidMatch?: boolean;
}

export interface LegacyPlanetTransitsResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}

export interface LegacyBranchInteraction {
  type: string;  // 육합, 삼합, 충, 형, 해
  impact: 'positive' | 'negative' | 'neutral';
  element?: string;
}

export interface ShinsalHit {
  name: string;
  type: 'lucky' | 'unlucky' | 'special';
  affectedArea: string;
}

export interface ShinsalAnalysisResult {
  active: ShinsalHit[];
}

// ============================================================
// 어댑터 함수
// ============================================================

/**
 * 기존 대운 분석 결과 → 새 시스템 입력
 */
export function adaptDaeunResult(result: LegacyAnalysisResult): SajuScoreInput['daeun'] {
  const input: SajuScoreInput['daeun'] = {};

  for (const key of result.factorKeys) {
    if (key.includes('Inseong') || key.includes('인성')) input.sibsin = 'inseong';
    else if (key.includes('Jaeseong') || key.includes('재성')) input.sibsin = 'jaeseong';
    else if (key.includes('Bijeon') || key.includes('비견')) input.sibsin = 'bijeon';
    else if (key.includes('Siksang') || key.includes('식상')) input.sibsin = 'siksang';
    else if (key.includes('Gwansal') || key.includes('관살')) input.hasGwansal = true;
    else if (key.includes('yukhap') || key.includes('육합')) input.hasYukhap = true;
    else if (key.includes('samhap') && result.positive) input.hasSamhapPositive = true;
    else if (key.includes('samhap') && result.negative) input.hasSamhapNegative = true;
    else if (key.includes('chung') || key.includes('충')) input.hasChung = true;
  }

  return input;
}

/**
 * 기존 세운 분석 결과 → 새 시스템 입력
 * @param result - 레거시 분석 결과
 * @param isSamjaeYear - 삼재년 여부
 * @param hasGwiin - 귀인이 있는지 여부 (삼재 상쇄용)
 */
export function adaptSeunResult(
  result: LegacyAnalysisResult,
  isSamjaeYear?: boolean,
  hasGwiin?: boolean
): SajuScoreInput['seun'] {
  const input: SajuScoreInput['seun'] = { isSamjaeYear, hasGwiin };

  for (const key of result.factorKeys) {
    if (key.includes('Inseong') || key.includes('인성')) input.sibsin = 'inseong';
    else if (key.includes('Jaeseong') || key.includes('재성')) input.sibsin = 'jaeseong';
    else if (key.includes('Bijeon') || key.includes('비견')) input.sibsin = 'bijeon';
    else if (key.includes('Siksang') || key.includes('식상')) input.sibsin = 'siksang';
    else if (key.includes('Gwansal') || key.includes('관살')) input.hasGwansal = true;
    else if (key.includes('yukhap') || key.includes('육합')) input.hasYukhap = true;
    else if (key.includes('samhap') && result.positive) input.hasSamhapPositive = true;
    else if (key.includes('samhap') && result.negative) input.hasSamhapNegative = true;
    else if (key.includes('chung') || key.includes('충')) input.hasChung = true;
  }

  return input;
}

/**
 * 기존 월운 분석 결과 → 새 시스템 입력
 */
export function adaptWolunResult(result: LegacyAnalysisResult): SajuScoreInput['wolun'] {
  const input: SajuScoreInput['wolun'] = {};

  for (const key of result.factorKeys) {
    if (key.includes('Inseong') || key.includes('인성')) input.sibsin = 'inseong';
    else if (key.includes('Jaeseong') || key.includes('재성')) input.sibsin = 'jaeseong';
    else if (key.includes('Bijeon') || key.includes('비견')) input.sibsin = 'bijeon';
    else if (key.includes('Siksang') || key.includes('식상')) input.sibsin = 'siksang';
    else if (key.includes('Gwansal') || key.includes('관살')) input.hasGwansal = true;
    else if (key.includes('yukhap') || key.includes('육합')) input.hasYukhap = true;
    else if (key.includes('samhap') && result.positive) input.hasSamhapPositive = true;
    else if (key.includes('samhap') && result.negative) input.hasSamhapNegative = true;
    else if (key.includes('chung') || key.includes('충')) input.hasChung = true;
  }

  return input;
}

/**
 * 기존 일진 분석 결과 → 새 시스템 입력
 */
export function adaptIljinResult(
  result: LegacyAnalysisResult,
  options: {
    hasCheoneulGwiin?: boolean;
    hasGeonrok?: boolean;
    hasSonEomneun?: boolean;
    hasYeokma?: boolean;
    hasDohwa?: boolean;
    branchInteractions?: LegacyBranchInteraction[];
    shinsalResult?: ShinsalAnalysisResult;
  } = {}
): SajuScoreInput['iljin'] {
  const input: SajuScoreInput['iljin'] = {
    hasCheoneulGwiin: options.hasCheoneulGwiin,
    hasGeonrok: options.hasGeonrok,
    hasSonEomneun: options.hasSonEomneun,
    hasYeokma: options.hasYeokma,
    hasDohwa: options.hasDohwa,
  };

  // 신살 분석 결과 반영
  if (options.shinsalResult?.active) {
    for (const shinsal of options.shinsalResult.active) {
      const name = shinsal.name;
      // 길신
      if (name === '태극귀인') input.hasTaegukGwiin = true;
      else if (name === '천덕귀인' || name === '천덕') input.hasCheondeokGwiin = true;
      else if (name === '월덕귀인' || name === '월덕') input.hasWoldeokGwiin = true;
      else if (name === '화개') input.hasHwagae = true;
      // 흉신
      else if (name === '공망') input.hasGongmang = true;
      else if (name === '원진') input.hasWonjin = true;
      else if (name === '양인') input.hasYangin = true;
      else if (name === '괴강') input.hasGoegang = true;
      else if (name === '백호') input.hasBackho = true;
      else if (name === '귀문관') input.hasGuimungwan = true;
    }
  }

  // 십신 분석
  for (const key of result.factorKeys) {
    // 십신 매칭
    if (key.includes('jeongyin') || key.includes('정인')) input.sibsin = 'jeongyin';
    else if (key.includes('pyeonyin') || key.includes('편인')) input.sibsin = 'pyeonyin';
    else if (key.includes('jeongchaae') || key.includes('정재')) input.sibsin = 'jeongchaae';
    else if (key.includes('pyeonchaae') || key.includes('편재')) input.sibsin = 'pyeonchaae';
    else if (key.includes('sikshin') || key.includes('식신')) input.sibsin = 'sikshin';
    else if (key.includes('sanggwan') || key.includes('상관')) input.sibsin = 'sanggwan';
    else if (key.includes('jeongwan') || key.includes('정관')) input.sibsin = 'jeongwan';
    else if (key.includes('pyeonwan') || key.includes('편관')) input.sibsin = 'pyeonwan';
    else if (key.includes('bijeon') || key.includes('비견')) input.sibsin = 'bijeon';
    else if (key.includes('gyeobjae') || key.includes('겁재')) input.sibsin = 'gyeobjae';
    // 인성/재성 등 상위 카테고리도 매칭
    else if (key.includes('Inseong') || key.includes('인성')) input.sibsin = 'jeongyin';
    else if (key.includes('Jaeseong') || key.includes('재성')) input.sibsin = 'jeongchaae';
    else if (key.includes('Gwansal') || key.includes('관살')) input.sibsin = 'pyeonwan';
  }

  // 지지 상호작용
  if (options.branchInteractions) {
    for (const inter of options.branchInteractions) {
      if (inter.type === '육합') input.hasYukhap = true;
      else if (inter.type === '삼합' && inter.impact === 'positive') input.hasSamhapPositive = true;
      else if (inter.type === '삼합' && inter.impact === 'negative') input.hasSamhapNegative = true;
      else if (inter.type === '충') input.hasChung = true;
      else if (inter.type === '형') input.hasXing = true;
      else if (inter.type === '해') input.hasHai = true;
    }
  }

  // factorKeys에서도 지지 관계 추출
  for (const key of result.factorKeys) {
    if (key.includes('yukhap') || key.includes('육합')) input.hasYukhap = true;
    else if (key.includes('samhap') && result.positive) input.hasSamhapPositive = true;
    else if (key.includes('samhap') && result.negative) input.hasSamhapNegative = true;
    else if (key.includes('chung') || key.includes('충')) input.hasChung = true;
    else if (key.includes('xing') || key.includes('형')) input.hasXing = true;
    else if (key.includes('hai') || key.includes('해')) input.hasHai = true;
  }

  return input;
}

/**
 * 기존 용신 분석 결과 → 새 시스템 입력
 */
export function adaptYongsinResult(
  yongsinResult: LegacyYongsinResult,
  geokgukResult: LegacyGeokgukResult
): SajuScoreInput['yongsin'] {
  const input: SajuScoreInput['yongsin'] = {};

  // Yongsin factors
  for (const key of yongsinResult.factorKeys) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('primarymatch') || lowerKey.includes('yongsinmatch')) {
      input.hasPrimaryMatch = true;
    } else if (lowerKey.includes('secondarymatch')) {
      input.hasSecondaryMatch = true;
    } else if (lowerKey.includes('branchmatch')) {
      input.hasBranchMatch = true;
    } else if (lowerKey.includes('support')) {
      input.hasSupport = true;
    } else if (lowerKey.includes('kibsin') || key.includes('?,??<?')) {
      if (lowerKey.includes('branch')) {
        input.hasKibsinBranch = true;
      } else {
        input.hasKibsinMatch = true;
      }
    } else if (lowerKey.includes('harm')) {
      input.hasHarm = true;
    }
  }

  // Geokguk factors
  for (const key of geokgukResult.factorKeys) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('favor')) {
      input.geokgukFavor = true;
    } else if (lowerKey.includes('avoid')) {
      input.geokgukAvoid = true;
    } else if (lowerKey.includes('imbalance') || lowerKey.includes('excess')) {
      input.strengthImbalance = true;
    } else if (lowerKey.includes('balance')) {
      input.strengthBalance = true;
    }
  }

  return input;
}

/**
 * 오행 관계 결정
 */
export function getElementRelation(
  natalElement: string,
  transitElement: string,
  elementRelations: Record<string, { generates: string; controls: string; generatedBy: string; controlledBy: string }>
): 'same' | 'generatedBy' | 'generates' | 'controlledBy' | 'controls' | undefined {
  if (natalElement === transitElement) return 'same';

  const relations = elementRelations[natalElement];
  if (!relations) return undefined;

  if (transitElement === relations.generatedBy) return 'generatedBy';
  if (transitElement === relations.generates) return 'generates';
  if (transitElement === relations.controlledBy) return 'controlledBy';
  if (transitElement === relations.controls) return 'controls';

  return undefined;
}

/**
 * 기존 행성 트랜짓 → 새 시스템 입력
 */
export interface EclipseImpact {
  hasImpact: boolean;
  type: 'solar' | 'lunar' | null;
  intensity: 'strong' | 'medium' | 'weak' | null;
  daysFromEclipse: number | null;
}

export function adaptPlanetTransits(
  transitResult: LegacyPlanetTransitsResult,
  options: {
    retrogradePlanets?: string[];
    voidOfCourse?: boolean;
    lunarPhase?: string;
    daysFromBirthday?: number;
    natalSunElement?: string;
    transitSunElement?: string;
    transitMoonElement?: string;
    elementRelations?: Record<string, { generates: string; controls: string; generatedBy: string; controlledBy: string }>;
    eclipseImpact?: EclipseImpact;
  } = {}
): AstroScoreInput {
  const input: AstroScoreInput = {
    transitSun: {},
    transitMoon: { isVoidOfCourse: options.voidOfCourse },
    majorPlanets: {},
    solarReturn: { daysFromBirthday: options.daysFromBirthday ?? 365 },
  };

  // 태양 오행 관계
  if (options.natalSunElement && options.transitSunElement && options.elementRelations) {
    input.transitSun.elementRelation = getElementRelation(
      options.natalSunElement,
      options.transitSunElement,
      options.elementRelations
    );
  }

  // 달 오행 관계
  if (options.natalSunElement && options.transitMoonElement && options.elementRelations) {
    input.transitMoon.elementRelation = getElementRelation(
      options.natalSunElement,
      options.transitMoonElement,
      options.elementRelations
    );
  }

  // 역행 행성
  const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
  for (const planet of planets) {
    const isRetrograde = options.retrogradePlanets?.includes(planet);
    if (isRetrograde) {
      input.majorPlanets[planet] = { isRetrograde: true };
    }
  }

  // 어스펙트 추출 (factorKeys에서)
  for (const key of transitResult.factorKeys) {
    const lowerKey = key.toLowerCase();

    for (const planet of planets) {
      if (lowerKey.includes(planet)) {
        if (!input.majorPlanets[planet]) {
          input.majorPlanets[planet] = {};
        }

        if (lowerKey.includes('trine')) {
          input.majorPlanets[planet]!.aspect = 'trine';
        } else if (lowerKey.includes('sextile')) {
          input.majorPlanets[planet]!.aspect = 'sextile';
        } else if (lowerKey.includes('square')) {
          input.majorPlanets[planet]!.aspect = 'square';
        } else if (lowerKey.includes('opposition')) {
          input.majorPlanets[planet]!.aspect = 'opposition';
        } else if (lowerKey.includes('conjunct') || lowerKey.includes('conjunction')) {
          input.majorPlanets[planet]!.aspect = 'conjunction';
        }
      }
    }
  }

  // 달 위상
  if (options.lunarPhase) {
    const phaseMap: Record<string, AstroScoreInput['lunarPhase']> = {
      'new': 'newMoon',
      'newMoon': 'newMoon',
      'waxingCrescent': 'waxingCrescent',
      'firstQuarter': 'firstQuarter',
      'waxingGibbous': 'waxingGibbous',
      'full': 'fullMoon',
      'fullMoon': 'fullMoon',
      'waningGibbous': 'waningGibbous',
      'lastQuarter': 'lastQuarter',
      'waningCrescent': 'waningCrescent',
    };
    input.lunarPhase = phaseMap[options.lunarPhase];
  }

  // 일식/월식 영향
  if (options.eclipseImpact?.hasImpact) {
    input.eclipse = {
      isEclipseDay: options.eclipseImpact.intensity === 'strong',
      isNearEclipse: options.eclipseImpact.intensity === 'medium' || options.eclipseImpact.intensity === 'weak',
      eclipseType: options.eclipseImpact.type || undefined,
    };
  }

  return input;
}
