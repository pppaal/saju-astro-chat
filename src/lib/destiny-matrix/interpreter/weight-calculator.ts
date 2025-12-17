// src/lib/destiny-matrix/interpreter/weight-calculator.ts
// Destiny Fusion Matrix™ - Dynamic Weight Calculator
// 특허 핵심: 컨텍스트 기반 동적 가중치 조정 알고리즘

import type { FiveElement } from '../../Saju/types';
import type { GeokgukType, TransitCycle, MatrixCalculationInput } from '../types';
import type {
  WeightConfig,
  LayerWeights,
  ContextModifier,
  TemporalModifier,
  InsightDomain,
  WeightCalculationLog,
} from './types';

// ===========================
// 기본 가중치 설정
// ===========================

export const DEFAULT_LAYER_WEIGHTS: LayerWeights = {
  layer1_elementCore: 1.0,       // 기본 성향 - 항상 중요
  layer2_sibsinPlanet: 0.9,      // 역할/에너지 - 매우 중요
  layer3_sibsinHouse: 0.85,      // 생활영역 - 중요
  layer4_timing: 0.95,           // 타이밍 - 매우 중요 (현재 시점 분석)
  layer5_relationAspect: 0.8,    // 상호작용 - 중요
  layer6_stageHouse: 0.75,       // 생명력 - 중간
  layer7_advanced: 0.7,          // 고급분석 - 전문가용
  layer8_shinsal: 0.65,          // 신살 - 부가정보
  layer9_asteroid: 0.5,          // 소행성 - 세부정보
  layer10_extraPoint: 0.55,      // 엑스트라포인트 - 심층정보
};

// ===========================
// 격국별 가중치 조정
// ===========================

const GEOKGUK_WEIGHT_MODIFIERS: Record<GeokgukType, Partial<LayerWeights>> = {
  // 정격 (Regular Patterns)
  jeonggwan: {
    layer2_sibsinPlanet: 1.1,
    layer7_advanced: 0.9,
  },
  pyeongwan: {
    layer2_sibsinPlanet: 1.15,
    layer5_relationAspect: 1.1,
  },
  jeongin: {
    layer6_stageHouse: 1.1,
    layer10_extraPoint: 0.8,
  },
  pyeongin: {
    layer8_shinsal: 0.9,
    layer10_extraPoint: 0.9,
  },
  siksin: {
    layer3_sibsinHouse: 1.1,
    layer9_asteroid: 0.7,
  },
  sanggwan: {
    layer3_sibsinHouse: 1.15,
    layer5_relationAspect: 1.1,
  },
  jeongjae: {
    layer3_sibsinHouse: 1.1,
    layer9_asteroid: 0.8,
  },
  pyeonjae: {
    layer3_sibsinHouse: 1.15,
    layer4_timing: 1.1,
  },

  // 특수격 (Special Patterns)
  geonrok: {
    layer1_elementCore: 1.2,
    layer6_stageHouse: 1.1,
  },
  yangin: {
    layer5_relationAspect: 1.2,
    layer8_shinsal: 1.1,
  },

  // 종격 (Following Patterns)
  jonga: {
    layer2_sibsinPlanet: 1.2,
    layer7_advanced: 1.0,
  },
  jongjae: {
    layer3_sibsinHouse: 1.2,
    layer4_timing: 1.1,
  },
  jongsal: {
    layer2_sibsinPlanet: 1.2,
    layer5_relationAspect: 1.1,
  },
  jonggang: {
    layer1_elementCore: 1.3,
    layer6_stageHouse: 1.1,
  },

  // 외격 (External Patterns)
  gokjik: { layer1_elementCore: 1.3, layer6_stageHouse: 1.1 },
  yeomsang: { layer1_elementCore: 1.3, layer4_timing: 1.1 },
  gasaek: { layer1_elementCore: 1.3, layer3_sibsinHouse: 1.1 },
  jonghyeok: { layer1_elementCore: 1.3, layer5_relationAspect: 1.1 },
  yunha: { layer1_elementCore: 1.3, layer10_extraPoint: 0.9 },
};

// ===========================
// 용신 오행별 가중치 조정
// ===========================

const YONGSIN_WEIGHT_MODIFIERS: Record<FiveElement, Partial<LayerWeights>> = {
  '목': {
    layer1_elementCore: 1.15,
    layer6_stageHouse: 1.1,
    layer9_asteroid: 0.8,
  },
  '화': {
    layer1_elementCore: 1.15,
    layer4_timing: 1.15,
    layer5_relationAspect: 1.1,
  },
  '토': {
    layer1_elementCore: 1.2,
    layer3_sibsinHouse: 1.1,
    layer6_stageHouse: 1.1,
  },
  '금': {
    layer1_elementCore: 1.15,
    layer5_relationAspect: 1.15,
    layer8_shinsal: 0.9,
  },
  '수': {
    layer1_elementCore: 1.15,
    layer10_extraPoint: 1.1,
    layer8_shinsal: 1.0,
  },
};

// ===========================
// 쿼리 도메인별 가중치 조정
// ===========================

const DOMAIN_WEIGHT_MODIFIERS: Record<InsightDomain, Partial<LayerWeights>> = {
  personality: {
    layer1_elementCore: 1.3,
    layer2_sibsinPlanet: 1.2,
    layer6_stageHouse: 1.1,
  },
  career: {
    layer2_sibsinPlanet: 1.3,
    layer3_sibsinHouse: 1.2,
    layer7_advanced: 1.1,
  },
  relationship: {
    layer3_sibsinHouse: 1.2,
    layer5_relationAspect: 1.3,
    layer9_asteroid: 1.1,  // Juno 특히 중요
  },
  wealth: {
    layer3_sibsinHouse: 1.3,
    layer4_timing: 1.2,
    layer7_advanced: 1.0,
  },
  health: {
    layer6_stageHouse: 1.3,
    layer1_elementCore: 1.2,
    layer8_shinsal: 1.1,
  },
  spirituality: {
    layer10_extraPoint: 1.3,
    layer8_shinsal: 1.2,
    layer7_advanced: 1.1,
  },
  timing: {
    layer4_timing: 1.5,
    layer7_advanced: 1.2,
    layer5_relationAspect: 1.1,
  },
};

// ===========================
// 트랜짓/역행별 가중치 조정
// ===========================

const TRANSIT_WEIGHT_MODIFIERS: Record<TransitCycle, {
  weights: Partial<LayerWeights>;
  boostedDomains: InsightDomain[];
}> = {
  saturnReturn: {
    weights: { layer4_timing: 1.4, layer7_advanced: 1.2, layer6_stageHouse: 1.1 },
    boostedDomains: ['career', 'personality'],
  },
  jupiterReturn: {
    weights: { layer4_timing: 1.3, layer3_sibsinHouse: 1.2 },
    boostedDomains: ['wealth', 'spirituality'],
  },
  uranusSquare: {
    weights: { layer4_timing: 1.3, layer5_relationAspect: 1.2 },
    boostedDomains: ['personality', 'career'],
  },
  neptuneSquare: {
    weights: { layer4_timing: 1.2, layer10_extraPoint: 1.3 },
    boostedDomains: ['spirituality', 'health'],
  },
  plutoTransit: {
    weights: { layer4_timing: 1.5, layer7_advanced: 1.3 },
    boostedDomains: ['personality', 'career', 'relationship'],
  },
  nodeReturn: {
    weights: { layer4_timing: 1.3, layer10_extraPoint: 1.4 },
    boostedDomains: ['spirituality', 'relationship'],
  },
  eclipse: {
    weights: { layer4_timing: 1.4, layer5_relationAspect: 1.2 },
    boostedDomains: ['timing', 'relationship'],
  },
  mercuryRetrograde: {
    weights: { layer4_timing: 1.2, layer5_relationAspect: 1.1 },
    boostedDomains: ['career', 'relationship'],
  },
  venusRetrograde: {
    weights: { layer4_timing: 1.2, layer9_asteroid: 1.2 },
    boostedDomains: ['relationship', 'wealth'],
  },
  marsRetrograde: {
    weights: { layer4_timing: 1.2, layer5_relationAspect: 1.15 },
    boostedDomains: ['career', 'health'],
  },
  jupiterRetrograde: {
    weights: { layer4_timing: 1.15, layer7_advanced: 1.1 },
    boostedDomains: ['spirituality', 'wealth'],
  },
  saturnRetrograde: {
    weights: { layer4_timing: 1.2, layer6_stageHouse: 1.15 },
    boostedDomains: ['career', 'health'],
  },
};

// ===========================
// 동적 가중치 계산기 클래스
// ===========================

export class DynamicWeightCalculator {
  private logs: WeightCalculationLog[] = [];

  constructor(private baseWeights: LayerWeights = DEFAULT_LAYER_WEIGHTS) {}

  /**
   * 컨텍스트 기반 동적 가중치 계산
   * 특허 핵심 알고리즘: 다중 컨텍스트 레이어 융합
   */
  calculateWeights(
    input: MatrixCalculationInput,
    queryDomain?: InsightDomain
  ): { weights: LayerWeights; logs: WeightCalculationLog[] } {
    this.logs = [];

    // Step 1: 기본 가중치로 시작
    let weights = { ...this.baseWeights };
    this.log('초기화', { baseWeights: this.baseWeights }, weights, '기본 가중치 설정');

    // Step 2: 격국 기반 조정
    if (input.geokguk) {
      const modifier = GEOKGUK_WEIGHT_MODIFIERS[input.geokguk];
      if (modifier) {
        weights = this.applyModifier(weights, modifier);
        this.log('격국 조정', { geokguk: input.geokguk, modifier }, weights, `${input.geokguk} 격국 가중치 적용`);
      }
    }

    // Step 3: 용신 기반 조정
    if (input.yongsin) {
      const modifier = YONGSIN_WEIGHT_MODIFIERS[input.yongsin];
      if (modifier) {
        weights = this.applyModifier(weights, modifier);
        this.log('용신 조정', { yongsin: input.yongsin, modifier }, weights, `${input.yongsin} 용신 가중치 적용`);
      }
    }

    // Step 4: 쿼리 도메인 기반 조정
    if (queryDomain) {
      const modifier = DOMAIN_WEIGHT_MODIFIERS[queryDomain];
      if (modifier) {
        weights = this.applyModifier(weights, modifier);
        this.log('도메인 조정', { domain: queryDomain, modifier }, weights, `${queryDomain} 도메인 가중치 적용`);
      }
    }

    // Step 5: 활성 트랜짓/역행 기반 조정
    if (input.activeTransits && input.activeTransits.length > 0) {
      for (const transit of input.activeTransits) {
        const transitConfig = TRANSIT_WEIGHT_MODIFIERS[transit];
        if (transitConfig) {
          weights = this.applyModifier(weights, transitConfig.weights);
          this.log('트랜짓 조정', { transit, modifier: transitConfig.weights }, weights, `${transit} 가중치 적용`);
        }
      }
    }

    // Step 6: 가중치 정규화 (0.3 ~ 1.5 범위로 제한)
    weights = this.normalizeWeights(weights);
    this.log('정규화', { minWeight: 0.3, maxWeight: 1.5 }, weights, '가중치 범위 정규화');

    return { weights, logs: this.logs };
  }

  /**
   * 부스트된 도메인 목록 가져오기
   */
  getBoostedDomains(activeTransits: TransitCycle[]): InsightDomain[] {
    const domains = new Set<InsightDomain>();

    for (const transit of activeTransits) {
      const config = TRANSIT_WEIGHT_MODIFIERS[transit];
      if (config) {
        config.boostedDomains.forEach(d => domains.add(d));
      }
    }

    return Array.from(domains);
  }

  /**
   * 가중치 수정자 적용
   */
  private applyModifier(
    weights: LayerWeights,
    modifier: Partial<LayerWeights>
  ): LayerWeights {
    const result = { ...weights };

    for (const [key, value] of Object.entries(modifier)) {
      const layerKey = key as keyof LayerWeights;
      if (result[layerKey] !== undefined && value !== undefined) {
        // 곱셈으로 조정 (누적 효과)
        result[layerKey] = result[layerKey] * value;
      }
    }

    return result;
  }

  /**
   * 가중치 정규화
   */
  private normalizeWeights(weights: LayerWeights): LayerWeights {
    const MIN_WEIGHT = 0.3;
    const MAX_WEIGHT = 1.5;

    const result = { ...weights };

    for (const key of Object.keys(result) as (keyof LayerWeights)[]) {
      result[key] = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, result[key]));
    }

    return result;
  }

  /**
   * 로그 기록
   */
  private log(step: string, input: unknown, output: unknown, reason: string): void {
    this.logs.push({ step, input, output: JSON.parse(JSON.stringify(output)), reason });
  }

  /**
   * 가중치 요약 정보
   */
  getWeightSummary(weights: LayerWeights): {
    topLayers: string[];
    bottomLayers: string[];
    totalWeight: number;
  } {
    const entries = Object.entries(weights) as [keyof LayerWeights, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);

    return {
      topLayers: sorted.slice(0, 3).map(([k]) => k),
      bottomLayers: sorted.slice(-3).map(([k]) => k),
      totalWeight: entries.reduce((sum, [, v]) => sum + v, 0),
    };
  }
}

// ===========================
// 유틸리티 함수
// ===========================

/**
 * 레이어 이름을 사용자 친화적으로 변환
 */
export function getLayerDisplayName(
  layerKey: keyof LayerWeights,
  lang: 'ko' | 'en' = 'ko'
): string {
  const names: Record<keyof LayerWeights, { ko: string; en: string }> = {
    layer1_elementCore: { ko: '기운 핵심', en: 'Element Core' },
    layer2_sibsinPlanet: { ko: '십신-행성', en: 'Sibsin-Planet' },
    layer3_sibsinHouse: { ko: '생활 영역', en: 'Life Domain' },
    layer4_timing: { ko: '타이밍', en: 'Timing' },
    layer5_relationAspect: { ko: '관계 역학', en: 'Relationship Dynamics' },
    layer6_stageHouse: { ko: '생명력 주기', en: 'Vitality Cycle' },
    layer7_advanced: { ko: '고급 분석', en: 'Advanced Analysis' },
    layer8_shinsal: { ko: '신살 에너지', en: 'Shinsal Energy' },
    layer9_asteroid: { ko: '소행성 영향', en: 'Asteroid Influence' },
    layer10_extraPoint: { ko: '심층 포인트', en: 'Deep Points' },
  };

  return names[layerKey]?.[lang] || layerKey;
}

/**
 * 가중치를 퍼센트로 변환
 */
export function weightToPercent(weight: number): number {
  return Math.round(weight * 100);
}

// 기본 인스턴스 내보내기
export const defaultWeightCalculator = new DynamicWeightCalculator();
