// src/lib/destiny-matrix/interpreter/insight-generator.ts
// Destiny Fusion Matrix™ - Insight Generation Engine
// 특허 핵심: 다층 매트릭스 데이터 → 사용자 친화적 인사이트 변환 알고리즘

import type { FiveElement, SibsinKind } from '../../Saju/types';
import type {
  MatrixCalculationInput,
  MatrixCell,
  InteractionCode,
  GeokgukType,
  ShinsalKind,
  PlanetName,
  HouseNumber,
} from '../types';
import type {
  FusionInsight,
  InsightCategory,
  InsightDomain,
  InsightPriority,
  InsightSource,
  ActionItem,
  LayerWeights,
} from './types';
import { DynamicWeightCalculator, getLayerDisplayName } from './weight-calculator';

// ===========================
// 인사이트 매핑 데이터
// ===========================

// 십신 → 도메인 매핑
const SIBSIN_DOMAIN_MAP: Record<SibsinKind, InsightDomain[]> = {
  '비견': ['personality', 'relationship'],
  '겁재': ['personality', 'wealth'],
  '식신': ['career', 'health'],
  '상관': ['career', 'relationship'],
  '편재': ['wealth', 'career'],
  '정재': ['wealth', 'relationship'],
  '편관': ['career', 'health'],
  '정관': ['career', 'relationship'],
  '편인': ['spirituality', 'health'],
  '정인': ['spirituality', 'relationship'],
};

// 행성 → 도메인 매핑
const PLANET_DOMAIN_MAP: Record<PlanetName, InsightDomain[]> = {
  Sun: ['personality', 'career'],
  Moon: ['personality', 'relationship'],
  Mercury: ['career', 'health'],
  Venus: ['relationship', 'wealth'],
  Mars: ['career', 'health'],
  Jupiter: ['wealth', 'spirituality'],
  Saturn: ['career', 'health'],
  Uranus: ['personality', 'career'],
  Neptune: ['spirituality', 'health'],
  Pluto: ['personality', 'spirituality'],
};

// 하우스 → 도메인 매핑
const HOUSE_DOMAIN_MAP: Record<HouseNumber, InsightDomain[]> = {
  1: ['personality'],
  2: ['wealth'],
  3: ['career', 'relationship'],
  4: ['relationship', 'health'],
  5: ['relationship', 'spirituality'],
  6: ['health', 'career'],
  7: ['relationship'],
  8: ['wealth', 'spirituality'],
  9: ['spirituality', 'career'],
  10: ['career'],
  11: ['relationship', 'career'],
  12: ['spirituality', 'health'],
};

// 인터랙션 레벨 → 카테고리 매핑
const LEVEL_CATEGORY_MAP: Record<InteractionCode['level'], InsightCategory> = {
  extreme: 'strength',
  amplify: 'opportunity',
  balance: 'balance',
  clash: 'caution',
  conflict: 'challenge',
};

// ===========================
// 인사이트 생성 클래스
// ===========================

export class InsightGenerator {
  private weightCalculator: DynamicWeightCalculator;
  private insightCounter = 0;

  constructor() {
    this.weightCalculator = new DynamicWeightCalculator();
  }

  /**
   * 전체 인사이트 생성
   * 특허 핵심: 다층 융합 → 통합 인사이트 변환
   */
  generateInsights(
    input: MatrixCalculationInput,
    layerResults: Record<string, Record<string, MatrixCell>>,
    queryDomain?: InsightDomain
  ): FusionInsight[] {
    // 1. 동적 가중치 계산
    const { weights } = this.weightCalculator.calculateWeights(input, queryDomain);

    // 2. 모든 셀에서 인사이트 추출
    const rawInsights: FusionInsight[] = [];

    for (const [layerKey, cells] of Object.entries(layerResults)) {
      const layerNum = this.extractLayerNumber(layerKey);
      const layerWeight = this.getLayerWeight(layerNum, weights);

      for (const [cellKey, cell] of Object.entries(cells)) {
        const insight = this.cellToInsight(
          cell,
          cellKey,
          layerNum,
          layerKey,
          layerWeight,
          input
        );
        if (insight) {
          rawInsights.push(insight);
        }
      }
    }

    // 3. 중복 제거 및 병합
    const mergedInsights = this.mergeRelatedInsights(rawInsights);

    // 4. 점수 정규화 (1-100)
    const normalizedInsights = this.normalizeScores(mergedInsights);

    // 5. 우선순위 정렬
    const sortedInsights = this.sortByPriority(normalizedInsights);

    return sortedInsights;
  }

  /**
   * 상위 N개 인사이트 추출
   */
  getTopInsights(insights: FusionInsight[], count: number = 5): FusionInsight[] {
    return insights.slice(0, count);
  }

  /**
   * 카테고리별 인사이트 분류
   */
  groupByCategory(insights: FusionInsight[]): Record<InsightCategory, FusionInsight[]> {
    const groups: Record<InsightCategory, FusionInsight[]> = {
      strength: [],
      opportunity: [],
      balance: [],
      caution: [],
      challenge: [],
    };

    for (const insight of insights) {
      groups[insight.category].push(insight);
    }

    return groups;
  }

  /**
   * 도메인별 인사이트 분류
   */
  groupByDomain(insights: FusionInsight[]): Record<InsightDomain, FusionInsight[]> {
    const groups: Record<InsightDomain, FusionInsight[]> = {
      personality: [],
      career: [],
      relationship: [],
      wealth: [],
      health: [],
      spirituality: [],
      timing: [],
    };

    for (const insight of insights) {
      groups[insight.domain].push(insight);
    }

    return groups;
  }

  // ===========================
  // Private Methods
  // ===========================

  /**
   * 매트릭스 셀 → 인사이트 변환
   */
  private cellToInsight(
    cell: MatrixCell,
    cellKey: string,
    layerNum: number,
    layerKey: string,
    layerWeight: number,
    input: MatrixCalculationInput
  ): FusionInsight | null {
    const { interaction, sajuBasis, astroBasis } = cell;

    // 도메인 결정
    const domain = this.inferDomain(cellKey, sajuBasis, astroBasis);

    // 카테고리 결정
    const category = LEVEL_CATEGORY_MAP[interaction.level];

    // 우선순위 결정
    const priority = this.calculatePriority(interaction.score, layerWeight);

    // 가중치 적용 점수
    const weightedScore = interaction.score * layerWeight;

    // 액션 아이템 생성
    const actionItems = this.generateActionItems(category, domain, interaction);

    // 제목 및 설명 생성
    const { title, titleEn, description, descriptionEn } = this.generateTitleAndDescription(
      interaction,
      sajuBasis,
      astroBasis,
      domain,
      category
    );

    this.insightCounter++;

    return {
      id: `insight_${this.insightCounter}_${Date.now()}`,
      category,
      domain,
      priority,
      score: 0, // 나중에 정규화
      rawScore: interaction.score,
      weightedScore,
      sources: [{
        layer: layerNum,
        layerName: getLayerDisplayName(layerKey as keyof LayerWeights, 'ko'),
        sajuFactor: sajuBasis || '',
        astroFactor: astroBasis || '',
        interaction,
        contribution: 1,
      }],
      title,
      titleEn,
      description,
      descriptionEn,
      actionItems,
      icon: interaction.icon,
      colorCode: this.getColorHex(interaction.colorCode),
    };
  }

  /**
   * 도메인 추론
   */
  private inferDomain(cellKey: string, sajuBasis?: string, astroBasis?: string): InsightDomain {
    // 십신 기반 추론
    for (const [sibsin, domains] of Object.entries(SIBSIN_DOMAIN_MAP)) {
      if (cellKey.includes(sibsin) || sajuBasis?.includes(sibsin)) {
        return domains[0];
      }
    }

    // 행성 기반 추론
    for (const [planet, domains] of Object.entries(PLANET_DOMAIN_MAP)) {
      if (cellKey.includes(planet) || astroBasis?.includes(planet)) {
        return domains[0];
      }
    }

    // 하우스 기반 추론
    const houseMatch = astroBasis?.match(/H(\d+)/);
    if (houseMatch) {
      const houseNum = parseInt(houseMatch[1], 10) as HouseNumber;
      if (HOUSE_DOMAIN_MAP[houseNum]) {
        return HOUSE_DOMAIN_MAP[houseNum][0];
      }
    }

    // 기본값
    return 'personality';
  }

  /**
   * 우선순위 계산
   */
  private calculatePriority(score: number, weight: number): InsightPriority {
    const effectiveScore = score * weight;

    if (effectiveScore >= 8.5) return 'critical';
    if (effectiveScore >= 7) return 'high';
    if (effectiveScore >= 5) return 'medium';
    return 'low';
  }

  /**
   * 액션 아이템 생성
   */
  private generateActionItems(
    category: InsightCategory,
    domain: InsightDomain,
    interaction: InteractionCode
  ): ActionItem[] {
    const items: ActionItem[] = [];

    switch (category) {
      case 'strength':
        items.push({
          type: 'do',
          text: `이 강점을 적극 활용하세요. ${interaction.keyword}의 에너지가 최고조입니다.`,
          textEn: `Actively utilize this strength. The energy of ${interaction.keywordEn} is at its peak.`,
        });
        break;

      case 'opportunity':
        items.push({
          type: 'do',
          text: `기회를 잡을 때입니다. ${interaction.keyword} 관련 활동을 시작하기 좋습니다.`,
          textEn: `Time to seize opportunities. Good time to start activities related to ${interaction.keywordEn}.`,
        });
        break;

      case 'balance':
        items.push({
          type: 'consider',
          text: '현재 균형 잡힌 상태입니다. 안정을 유지하며 점진적으로 나아가세요.',
          textEn: 'Currently in a balanced state. Maintain stability and progress gradually.',
        });
        break;

      case 'caution':
        items.push({
          type: 'avoid',
          text: `${interaction.keyword} 관련하여 충동적인 결정은 피하세요.`,
          textEn: `Avoid impulsive decisions related to ${interaction.keywordEn}.`,
        });
        items.push({
          type: 'do',
          text: '신중하게 상황을 관찰하고, 필요시 전문가 조언을 구하세요.',
          textEn: 'Observe the situation carefully and seek expert advice if needed.',
        });
        break;

      case 'challenge':
        items.push({
          type: 'avoid',
          text: `${interaction.keyword} 관련 큰 변화나 결정은 미루는 것이 좋습니다.`,
          textEn: `Better to postpone major changes or decisions related to ${interaction.keywordEn}.`,
        });
        items.push({
          type: 'do',
          text: '내면의 성찰과 준비의 시간으로 활용하세요.',
          textEn: 'Use this as a time for inner reflection and preparation.',
        });
        break;
    }

    return items;
  }

  /**
   * 제목 및 설명 생성
   */
  private generateTitleAndDescription(
    interaction: InteractionCode,
    sajuBasis?: string,
    astroBasis?: string,
    domain?: InsightDomain,
    category?: InsightCategory
  ): { title: string; titleEn: string; description: string; descriptionEn: string } {
    const title = `${interaction.icon} ${interaction.keyword}`;
    const titleEn = `${interaction.icon} ${interaction.keywordEn}`;

    const sajuPart = sajuBasis ? `${sajuBasis}의 기운` : '당신의 사주';
    const astroPart = astroBasis ? `${astroBasis}의 영향` : '천체의 흐름';

    let description = '';
    let descriptionEn = '';

    switch (category) {
      case 'strength':
        description = `${sajuPart}과 ${astroPart}이 극강의 시너지를 이룹니다. ${interaction.keyword}의 에너지가 폭발적으로 작용합니다.`;
        descriptionEn = `${sajuBasis || 'Your chart'} and ${astroBasis || 'planetary influences'} create extreme synergy. The energy of ${interaction.keywordEn} works explosively.`;
        break;

      case 'opportunity':
        description = `${sajuPart}과 ${astroPart}이 상호 증폭됩니다. ${interaction.keyword}을 통해 성장의 기회가 열립니다.`;
        descriptionEn = `${sajuBasis || 'Your chart'} and ${astroBasis || 'planetary influences'} amplify each other. Opportunities for growth open through ${interaction.keywordEn}.`;
        break;

      case 'balance':
        description = `${sajuPart}과 ${astroPart}이 안정적 균형을 이룹니다. ${interaction.keyword}의 조화로운 상태입니다.`;
        descriptionEn = `${sajuBasis || 'Your chart'} and ${astroBasis || 'planetary influences'} form stable balance. A harmonious state of ${interaction.keywordEn}.`;
        break;

      case 'caution':
        description = `${sajuPart}과 ${astroPart} 사이에 긴장이 있습니다. ${interaction.keyword} 관련하여 주의가 필요합니다.`;
        descriptionEn = `There is tension between ${sajuBasis || 'your chart'} and ${astroBasis || 'planetary influences'}. Caution needed regarding ${interaction.keywordEn}.`;
        break;

      case 'challenge':
        description = `${sajuPart}과 ${astroPart}이 충돌합니다. ${interaction.keyword}은 현재 도전의 영역입니다. 내면 성찰의 기회로 삼으세요.`;
        descriptionEn = `${sajuBasis || 'Your chart'} and ${astroBasis || 'planetary influences'} clash. ${interaction.keywordEn} is currently a challenging area. Use it as an opportunity for inner reflection.`;
        break;

      default:
        description = `${sajuPart}과 ${astroPart}의 상호작용: ${interaction.keyword}`;
        descriptionEn = `Interaction between ${sajuBasis || 'your chart'} and ${astroBasis || 'planetary influences'}: ${interaction.keywordEn}`;
    }

    return { title, titleEn, description, descriptionEn };
  }

  /**
   * 관련 인사이트 병합
   */
  private mergeRelatedInsights(insights: FusionInsight[]): FusionInsight[] {
    const merged: Map<string, FusionInsight> = new Map();

    for (const insight of insights) {
      const key = `${insight.category}_${insight.domain}_${insight.title}`;

      if (merged.has(key)) {
        const existing = merged.get(key)!;
        // 소스 병합
        existing.sources.push(...insight.sources);
        // 점수 합산
        existing.weightedScore += insight.weightedScore;
        // 기여도 재계산
        const totalContribution = existing.sources.length;
        existing.sources.forEach(s => s.contribution = 1 / totalContribution);
      } else {
        merged.set(key, { ...insight });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * 점수 정규화 (1-100)
   */
  private normalizeScores(insights: FusionInsight[]): FusionInsight[] {
    if (insights.length === 0) return insights;

    const maxWeighted = Math.max(...insights.map(i => i.weightedScore));
    const minWeighted = Math.min(...insights.map(i => i.weightedScore));
    const range = maxWeighted - minWeighted || 1;

    return insights.map(insight => ({
      ...insight,
      score: Math.round(((insight.weightedScore - minWeighted) / range) * 90 + 10), // 10-100 범위
    }));
  }

  /**
   * 우선순위로 정렬
   */
  private sortByPriority(insights: FusionInsight[]): FusionInsight[] {
    const priorityOrder: Record<InsightPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return insights.sort((a, b) => {
      // 우선순위로 먼저 정렬
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 같은 우선순위면 점수로 정렬
      return b.score - a.score;
    });
  }

  /**
   * 레이어 번호 추출
   */
  private extractLayerNumber(layerKey: string): number {
    const match = layerKey.match(/layer(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * 레이어 가중치 가져오기
   */
  private getLayerWeight(layerNum: number, weights: LayerWeights): number {
    const keyMap: Record<number, keyof LayerWeights> = {
      1: 'layer1_elementCore',
      2: 'layer2_sibsinPlanet',
      3: 'layer3_sibsinHouse',
      4: 'layer4_timing',
      5: 'layer5_relationAspect',
      6: 'layer6_stageHouse',
      7: 'layer7_advanced',
      8: 'layer8_shinsal',
      9: 'layer9_asteroid',
      10: 'layer10_extraPoint',
    };

    return weights[keyMap[layerNum]] || 1;
  }

  /**
   * 컬러 코드 → HEX 변환
   */
  private getColorHex(colorCode: InteractionCode['colorCode']): string {
    const colors: Record<InteractionCode['colorCode'], string> = {
      purple: '#9333ea',
      green: '#22c55e',
      blue: '#3b82f6',
      yellow: '#eab308',
      red: '#ef4444',
    };

    return colors[colorCode];
  }
}

// 기본 인스턴스
export const insightGenerator = new InsightGenerator();
