// src/lib/counselor/calendar/scoring-factory.ts
/**
 * Generic score calculator factory
 * Eliminates code duplication in scoring functions
 */

import { calculateAdjustedScore } from './scoring-config';

export interface ScorerInput {
  sibsin?: string;
  isSamjaeYear?: boolean;
  hasGwiin?: boolean;
  hasChung?: boolean;
  // 정통 강약/용신 분기를 위한 컨텍스트 (선택)
  strength?: 'very_strong' | 'strong' | 'balanced' | 'weak' | 'very_weak';
  cycleStemElement?: string;
  yongsinPrimary?: string;
  yongsinSecondary?: string;
  kibsinElements?: string[];
  // Phase 1 cycleAnalysis 결과 (점수 보강)
  geokgukShift?: 'strengthen' | 'break' | 'protect' | 'shake' | 'neutral';
  geokgukShiftIntensity?: number;
  hasGongmangResolution?: boolean;
  hasGongmangLock?: boolean;
  hasHwaCompletion?: boolean;
  hasSamgiCompletion?: boolean;
  samjaePhase?: 'enter' | 'middle' | 'exit';
}

/**
 * 십신 → 5대 그룹 매핑 (대운/세운/월운의 sibsin + 일진의 sipsin 통합)
 */
function getSibsinGroup(
  sibsin: string
): 'inseong' | 'jaeseong' | 'siksang' | 'bijeon' | 'gwansal' | null {
  if (sibsin === 'inseong' || sibsin === 'jeongyin' || sibsin === 'pyeonyin') return 'inseong';
  if (sibsin === 'jaeseong' || sibsin === 'jeongchaae' || sibsin === 'pyeonchaae') return 'jaeseong';
  if (sibsin === 'siksang' || sibsin === 'sikshin' || sibsin === 'sanggwan') return 'siksang';
  if (sibsin === 'bijeon' || sibsin === 'gyeobjae') return 'bijeon';
  if (sibsin === 'gwansal' || sibsin === 'jeongwan' || sibsin === 'pyeonwan') return 'gwansal';
  return null;
}

/**
 * 강약 분기에 따른 십신 극성 조정
 *
 * 신강 → 식상·재성·관살 길성 (배출/통제), 인성·비견 흉성 (과부조)
 * 신약 → 인성·비견 길성 (생부),       식상·재성·관살 흉성 (설기/재극일/제압)
 * 균형 → 그대로
 */
function applyStrengthPolarity(
  group: ReturnType<typeof getSibsinGroup>,
  baseScore: number,
  strength?: string
): number {
  if (!group || !strength) return baseScore;
  const isStrong = strength === 'strong' || strength === 'very_strong';
  const isWeak = strength === 'weak' || strength === 'very_weak';
  if (!isStrong && !isWeak) return baseScore;

  const drain = group === 'siksang' || group === 'jaeseong' || group === 'gwansal';
  const support = group === 'inseong' || group === 'bijeon';
  const mag = Math.abs(baseScore);

  if (isStrong && drain) return mag;
  if (isStrong && support) return -mag;
  if (isWeak && support) return mag;
  if (isWeak && drain) return -mag;
  return baseScore;
}

export interface ScorerConfig<T extends ScorerInput> {
  categoryName: string;
  maxScore: number;
  maxRaw: number;

  // Scoring configurations
  sibsinScores?: {
    positive?: Record<string, number>;
    negative?: Record<string, number>;
  };

  sipsinScores?: Record<string, number>;
  branchScores?: Record<string, number>;
  specialScores?: Record<string, number>;
  negativeScores?: Record<string, number>;

  // Property mappings for boolean checks
  booleanPropertyMap: {
    positive?: string[];
    negative?: string[];
    branch?: string[];
    special?: string[];
  };

  // Special conditional logic
  samjaeConfig?: {
    base: number;
    withChung: number;
    withGwiin: number;
  };
}

/**
 * Generic factory function that creates a score calculator
 *
 * @param config - Configuration object with scoring rules
 * @returns Score calculator function
 */
export function createScoreCalculator<T extends ScorerInput>(
  config: ScorerConfig<T>
): (input: T) => number {

  return (input: T): number => {
    const adjustments: number[] = [];
    const flags = input as Record<string, unknown>;

    // Step 1: Process sibsin (for Daeun/Seun/Wolun)
    if (config.sibsinScores && input.sibsin) {
      const sibsinValue = input.sibsin as string;
      let baseScore: number | undefined;
      if (config.sibsinScores.positive && sibsinValue in config.sibsinScores.positive) {
        baseScore = config.sibsinScores.positive[sibsinValue];
      } else if (config.sibsinScores.negative && sibsinValue in config.sibsinScores.negative) {
        baseScore = config.sibsinScores.negative[sibsinValue];
      }
      if (baseScore !== undefined) {
        const adjusted = applyStrengthPolarity(getSibsinGroup(sibsinValue), baseScore, input.strength);
        adjustments.push(adjusted);
      }
    }

    // Step 1b: Process sipsin (for Iljin - different structure)
    if (config.sipsinScores && input.sibsin) {
      const sipsinKey = input.sibsin as string;
      if (sipsinKey in config.sipsinScores) {
        const baseScore = config.sipsinScores[sipsinKey];
        const adjusted = applyStrengthPolarity(getSibsinGroup(sipsinKey), baseScore, input.strength);
        adjustments.push(adjusted);
      }
    }

    // Step 1c: Yongsin/Kibsin 오행 보너스 (cycleStemElement 기준)
    if (input.cycleStemElement) {
      if (input.yongsinPrimary && input.cycleStemElement === input.yongsinPrimary) {
        adjustments.push(0.12); // 용신 일치
      } else if (input.yongsinSecondary && input.cycleStemElement === input.yongsinSecondary) {
        adjustments.push(0.06); // 희신 일치
      } else if (input.kibsinElements?.includes(input.cycleStemElement)) {
        adjustments.push(-0.10); // 기신 일치
      }
    }

    // Step 2: Process positive boolean properties
    if (config.booleanPropertyMap.positive) {
      for (const propKey of config.booleanPropertyMap.positive) {
        if (flags[propKey]) {
          // Try to find score in sibsinScores.positive or branchScores
          const scoreValue = config.sibsinScores?.positive?.[propKey];
          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 3: Process negative boolean properties
    if (config.booleanPropertyMap.negative) {
      for (const propKey of config.booleanPropertyMap.negative) {
        if (flags[propKey]) {
          // Try to find score in sibsinScores.negative (keys have "has" prefix)
          let scoreValue = config.sibsinScores?.negative?.[propKey];

          // If not found, try negativeScores (keys DON'T have "has" prefix)
          if (scoreValue === undefined && config.negativeScores) {
            const scoreKey = propKey.startsWith('has')
              ? propKey.slice(3).charAt(0).toLowerCase() + propKey.slice(4)
              : propKey;
            scoreValue = config.negativeScores[scoreKey];
          }

          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 4: Process branch interaction properties
    if (config.booleanPropertyMap.branch && config.branchScores) {
      for (const propKey of config.booleanPropertyMap.branch) {
        if (flags[propKey]) {
          // Strip "has" prefix to match score keys (e.g., hasYukhap -> yukhap)
          const scoreKey = propKey.startsWith('has')
            ? propKey.slice(3).charAt(0).toLowerCase() + propKey.slice(4)
            : propKey;
          const scoreValue = config.branchScores[scoreKey];
          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 5: Process special properties (길일, special days)
    if (config.booleanPropertyMap.special && config.specialScores) {
      for (const propKey of config.booleanPropertyMap.special) {
        if (flags[propKey]) {
          // Strip "has" prefix to match score keys (e.g., hasCheoneulGwiin -> cheoneulGwiin)
          const scoreKey = propKey.startsWith('has')
            ? propKey.slice(3).charAt(0).toLowerCase() + propKey.slice(4)
            : propKey;
          const scoreValue = config.specialScores[scoreKey];
          if (scoreValue !== undefined) {
            adjustments.push(scoreValue);
          }
        }
      }
    }

    // Step 6: Handle samjae special case (only for Seun)
    //   정통: 1년차(enter) = 약, 2년차(middle) = 정점 흉, 3년차(exit) = 약함
    if (config.samjaeConfig && input.isSamjaeYear) {
      const phaseMultiplier = ((input as ScorerInput).samjaePhase === 'middle')
        ? 1.5
        : ((input as ScorerInput).samjaePhase === 'exit')
          ? 0.5
          : 1.0
      let base: number
      if (input.hasGwiin) {
        base = config.samjaeConfig.withGwiin
      } else if (input.hasChung) {
        base = config.samjaeConfig.withChung
      } else {
        base = config.samjaeConfig.base
      }
      adjustments.push(base * phaseMultiplier)
    }

    // Step 6b: Phase 1 cycleAnalysis 결과 반영
    //   격국 강화/파격, 공망풀림/묶임, 천간합 化, 삼기 완성
    if (input.geokgukShift) {
      const intensity = Math.min(3, input.geokgukShiftIntensity ?? 1)
      const ratio = intensity * 0.06 // intensity 1=0.06, 3=0.18
      if (input.geokgukShift === 'strengthen') adjustments.push(ratio)
      else if (input.geokgukShift === 'break') adjustments.push(-ratio)
      else if (input.geokgukShift === 'protect') adjustments.push(ratio * 0.5)
      else if (input.geokgukShift === 'shake') adjustments.push(-ratio * 0.5)
    }
    if (input.hasGongmangResolution) adjustments.push(0.10) // 沖空 = 길
    if (input.hasGongmangLock) adjustments.push(-0.08)       // 合空 = 흉
    if (input.hasHwaCompletion) adjustments.push(0.08)       // 진짜 化 = 변동기 (보통 길)
    if (input.hasSamgiCompletion) adjustments.push(0.15)     // 삼기 완성 = 큰 길

    // Step 7: Calculate final score
    return calculateAdjustedScore(config.maxScore, adjustments, config.maxRaw);
  };
}
