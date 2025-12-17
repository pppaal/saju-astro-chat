// src/lib/destiny-matrix/interpreter/report-generator.ts
// Destiny Fusion Matrix™ - Report Generation Engine
// 특허 핵심: 다층 융합 데이터 → 사용자 친화적 리포트 변환

import type { FiveElement, SibsinKind } from '../../Saju/types';
import type {
  MatrixCalculationInput,
  MatrixCell,
  GeokgukType,
  TransitCycle,
  ShinsalKind,
} from '../types';
import type {
  FusionReport,
  FusionInsight,
  ProfileSummary,
  OverallScore,
  DomainAnalysis,
  TimingAnalysis,
  VisualizationData,
  InsightDomain,
  InsightCategory,
  InterpreterConfig,
  ActiveTransit,
  RetrogradeAlert,
  SynergyNode,
  SynergyEdge,
} from './types';
import { InsightGenerator } from './insight-generator';
import { DynamicWeightCalculator } from './weight-calculator';
import { RETROGRADE_SCHEDULE } from '../data/layer4-timing-overlay';
import { GEOKGUK_INFO } from '../data/layer7-advanced-analysis';

// ===========================
// 기본 설정
// ===========================

const DEFAULT_CONFIG: InterpreterConfig = {
  lang: 'ko',
  maxTopInsights: 5,
  includeDetailedData: false,
  weightConfig: {
    baseWeights: {
      layer1_elementCore: 1.0,
      layer2_sibsinPlanet: 0.9,
      layer3_sibsinHouse: 0.85,
      layer4_timing: 0.95,
      layer5_relationAspect: 0.8,
      layer6_stageHouse: 0.75,
      layer7_advanced: 0.7,
      layer8_shinsal: 0.65,
      layer9_asteroid: 0.5,
      layer10_extraPoint: 0.55,
    },
    contextModifiers: [],
    temporalModifiers: [],
  },
  narrativeStyle: 'friendly',
  includeVisualizations: true,
};

// ===========================
// 리포트 생성 클래스
// ===========================

export class FusionReportGenerator {
  private insightGenerator: InsightGenerator;
  private weightCalculator: DynamicWeightCalculator;
  private config: InterpreterConfig;

  constructor(config: Partial<InterpreterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.insightGenerator = new InsightGenerator();
    this.weightCalculator = new DynamicWeightCalculator();
  }

  /**
   * 전체 리포트 생성
   * 특허 핵심: 원시 매트릭스 → 사용자 친화적 리포트 변환 프로세스
   */
  generateReport(
    input: MatrixCalculationInput,
    layerResults: Record<string, Record<string, MatrixCell>>,
    queryDomain?: InsightDomain
  ): FusionReport {
    const lang = input.lang || this.config.lang;

    // 1. 모든 인사이트 생성
    const allInsights = this.insightGenerator.generateInsights(input, layerResults, queryDomain);

    // 2. 상위 인사이트 추출
    const topInsights = this.insightGenerator.getTopInsights(allInsights, this.config.maxTopInsights);

    // 3. 프로필 요약 생성
    const profile = this.generateProfileSummary(input, lang);

    // 4. 종합 점수 계산
    const overallScore = this.calculateOverallScore(allInsights, lang);

    // 5. 도메인별 분석
    const domainAnalysis = this.generateDomainAnalysis(allInsights, lang);

    // 6. 타이밍 분석
    const timingAnalysis = this.generateTimingAnalysis(input, allInsights, lang);

    // 7. 시각화 데이터
    const visualizations = this.config.includeVisualizations
      ? this.generateVisualizations(allInsights, domainAnalysis)
      : this.getEmptyVisualizations();

    return {
      id: `report_${Date.now()}`,
      generatedAt: new Date(),
      version: '2.0.0',
      lang,
      profile,
      overallScore,
      topInsights,
      domainAnalysis,
      timingAnalysis,
      visualizations,
      detailedData: this.config.includeDetailedData ? { allInsights, layerData: layerResults, weightCalculationLog: [], narrativeGenerationLog: [] } : undefined,
    };
  }

  /**
   * 프로필 요약 생성
   */
  private generateProfileSummary(input: MatrixCalculationInput, lang: 'ko' | 'en'): ProfileSummary {
    const dayMasterDescriptions: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '성장과 발전을 추구하는 목(木) 기운', en: 'Wood energy pursuing growth and development' },
      '화': { ko: '열정과 표현을 즐기는 화(火) 기운', en: 'Fire energy enjoying passion and expression' },
      '토': { ko: '안정과 중재를 중시하는 토(土) 기운', en: 'Earth energy valuing stability and mediation' },
      '금': { ko: '결단과 정의를 추구하는 금(金) 기운', en: 'Metal energy pursuing decision and justice' },
      '수': { ko: '지혜와 흐름을 따르는 수(水) 기운', en: 'Water energy following wisdom and flow' },
    };

    // 주요 십신 추출
    const dominantSibsin = Object.entries(input.sibsinDistribution || {})
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .slice(0, 3)
      .map(([sibsin]) => sibsin as SibsinKind);

    // 격국 설명
    let geokgukDescription: string | undefined;
    if (input.geokguk && GEOKGUK_INFO[input.geokguk]) {
      const info = GEOKGUK_INFO[input.geokguk];
      geokgukDescription = lang === 'ko' ? info.ko : info.en;
    }

    return {
      dayMasterElement: input.dayMasterElement,
      dayMasterDescription: dayMasterDescriptions[input.dayMasterElement][lang],
      geokguk: input.geokguk,
      geokgukDescription,
      dominantSibsin,
      keyShinsals: input.shinsalList?.slice(0, 5) || [],
      westernSunSign: input.planetSigns?.Sun,
      westernMoonSign: input.planetSigns?.Moon,
    };
  }

  /**
   * 종합 점수 계산
   */
  private calculateOverallScore(insights: FusionInsight[], lang: 'ko' | 'en'): OverallScore {
    // 카테고리별 점수 계산
    const categoryScores = {
      strength: this.getCategoryAverage(insights, 'strength'),
      opportunity: this.getCategoryAverage(insights, 'opportunity'),
      balance: this.getCategoryAverage(insights, 'balance'),
      caution: 100 - this.getCategoryAverage(insights, 'caution'), // 역산
      challenge: 100 - this.getCategoryAverage(insights, 'challenge'), // 역산
    };

    // 가중 평균 계산
    const weights = { strength: 0.25, opportunity: 0.25, balance: 0.2, caution: 0.15, challenge: 0.15 };
    const total = Math.round(
      categoryScores.strength * weights.strength +
      categoryScores.opportunity * weights.opportunity +
      categoryScores.balance * weights.balance +
      categoryScores.caution * weights.caution +
      categoryScores.challenge * weights.challenge
    );

    // 등급 결정
    const { grade, gradeDescription, gradeDescriptionEn } = this.getGradeInfo(total);

    return {
      total,
      grade,
      gradeDescription: lang === 'ko' ? gradeDescription : gradeDescriptionEn,
      gradeDescriptionEn,
      categoryScores,
    };
  }

  /**
   * 카테고리 평균 점수
   */
  private getCategoryAverage(insights: FusionInsight[], category: InsightCategory): number {
    const filtered = insights.filter(i => i.category === category);
    if (filtered.length === 0) return 50; // 기본값

    const sum = filtered.reduce((acc, i) => acc + i.score, 0);
    return Math.round(sum / filtered.length);
  }

  /**
   * 등급 정보
   */
  private getGradeInfo(score: number): { grade: 'S' | 'A' | 'B' | 'C' | 'D'; gradeDescription: string; gradeDescriptionEn: string } {
    if (score >= 90) return { grade: 'S', gradeDescription: '최상의 조화! 운명의 시너지가 폭발합니다.', gradeDescriptionEn: 'Supreme harmony! Destiny synergy explodes.' };
    if (score >= 75) return { grade: 'A', gradeDescription: '훌륭한 조화! 성장의 기회가 열려 있습니다.', gradeDescriptionEn: 'Excellent harmony! Opportunities for growth are open.' };
    if (score >= 60) return { grade: 'B', gradeDescription: '좋은 균형. 안정적인 흐름입니다.', gradeDescriptionEn: 'Good balance. Stable flow.' };
    if (score >= 45) return { grade: 'C', gradeDescription: '주의가 필요한 영역이 있습니다. 신중하게 진행하세요.', gradeDescriptionEn: 'Some areas need attention. Proceed carefully.' };
    return { grade: 'D', gradeDescription: '도전의 시기입니다. 내면 성찰과 준비의 시간으로 삼으세요.', gradeDescriptionEn: 'A challenging period. Use it as a time for inner reflection and preparation.' };
  }

  /**
   * 도메인별 분석 생성
   */
  private generateDomainAnalysis(insights: FusionInsight[], lang: 'ko' | 'en'): DomainAnalysis[] {
    const domains: InsightDomain[] = ['personality', 'career', 'relationship', 'wealth', 'health', 'spirituality', 'timing'];
    const domainNames: Record<InsightDomain, { ko: string; en: string }> = {
      personality: { ko: '성격/정체성', en: 'Personality' },
      career: { ko: '직업/사업', en: 'Career' },
      relationship: { ko: '관계/연애', en: 'Relationships' },
      wealth: { ko: '재물/재정', en: 'Wealth' },
      health: { ko: '건강/활력', en: 'Health' },
      spirituality: { ko: '영성/성장', en: 'Spirituality' },
      timing: { ko: '타이밍', en: 'Timing' },
    };

    const grouped = this.insightGenerator.groupByDomain(insights);

    return domains.map(domain => {
      const domainInsights = grouped[domain];
      const score = domainInsights.length > 0
        ? Math.round(domainInsights.reduce((sum, i) => sum + i.score, 0) / domainInsights.length)
        : 50;

      const strengths = domainInsights
        .filter(i => i.category === 'strength' || i.category === 'opportunity')
        .slice(0, 3)
        .map(i => lang === 'ko' ? i.title : i.titleEn);

      const challenges = domainInsights
        .filter(i => i.category === 'caution' || i.category === 'challenge')
        .slice(0, 3)
        .map(i => lang === 'ko' ? i.title : i.titleEn);

      const { grade } = this.getGradeInfo(score);

      return {
        domain,
        score,
        grade,
        summary: this.generateDomainSummary(domain, score, lang),
        summaryEn: this.generateDomainSummary(domain, score, 'en'),
        strengths,
        strengthsEn: domainInsights
          .filter(i => i.category === 'strength' || i.category === 'opportunity')
          .slice(0, 3)
          .map(i => i.titleEn),
        challenges,
        challengesEn: domainInsights
          .filter(i => i.category === 'caution' || i.category === 'challenge')
          .slice(0, 3)
          .map(i => i.titleEn),
        insights: domainInsights.slice(0, 5),
      };
    });
  }

  /**
   * 도메인 요약 생성
   */
  private generateDomainSummary(domain: InsightDomain, score: number, lang: 'ko' | 'en'): string {
    const templates: Record<InsightDomain, Record<'high' | 'mid' | 'low', { ko: string; en: string }>> = {
      personality: {
        high: { ko: '자아 정체성이 강하게 빛나는 시기입니다.', en: 'A time when self-identity shines strongly.' },
        mid: { ko: '안정적인 자아 상태입니다.', en: 'Stable self state.' },
        low: { ko: '내면 탐구가 필요한 시기입니다.', en: 'A time for inner exploration.' },
      },
      career: {
        high: { ko: '직업적 성취가 기대되는 시기입니다.', en: 'A time when career achievement is expected.' },
        mid: { ko: '꾸준한 업무 진행이 가능합니다.', en: 'Steady work progress is possible.' },
        low: { ko: '직업적 전환을 신중히 고려하세요.', en: 'Carefully consider career transitions.' },
      },
      relationship: {
        high: { ko: '인간관계에서 행운이 따릅니다.', en: 'Luck follows in relationships.' },
        mid: { ko: '관계가 안정적으로 유지됩니다.', en: 'Relationships remain stable.' },
        low: { ko: '관계에서 인내가 필요합니다.', en: 'Patience is needed in relationships.' },
      },
      wealth: {
        high: { ko: '재물운이 상승하는 시기입니다.', en: 'A time when wealth fortune rises.' },
        mid: { ko: '재정이 안정적으로 유지됩니다.', en: 'Finances remain stable.' },
        low: { ko: '재정 관리에 주의가 필요합니다.', en: 'Careful financial management is needed.' },
      },
      health: {
        high: { ko: '건강과 활력이 넘치는 시기입니다.', en: 'A time full of health and vitality.' },
        mid: { ko: '건강이 안정적으로 유지됩니다.', en: 'Health remains stable.' },
        low: { ko: '건강 관리에 신경 써야 합니다.', en: 'Health management requires attention.' },
      },
      spirituality: {
        high: { ko: '영적 성장이 가속화됩니다.', en: 'Spiritual growth accelerates.' },
        mid: { ko: '영적으로 안정된 시기입니다.', en: 'A spiritually stable period.' },
        low: { ko: '내면의 목소리에 귀 기울여 보세요.', en: 'Listen to your inner voice.' },
      },
      timing: {
        high: { ko: '행동하기 최적의 시기입니다.', en: 'Optimal time for action.' },
        mid: { ko: '적절한 타이밍을 기다리세요.', en: 'Wait for the right timing.' },
        low: { ko: '큰 결정은 미루는 것이 좋습니다.', en: 'Better to postpone major decisions.' },
      },
    };

    const level = score >= 70 ? 'high' : score >= 50 ? 'mid' : 'low';
    return templates[domain][level][lang];
  }

  /**
   * 타이밍 분석 생성
   */
  private generateTimingAnalysis(
    input: MatrixCalculationInput,
    insights: FusionInsight[],
    lang: 'ko' | 'en'
  ): TimingAnalysis {
    const timingInsights = insights.filter(i => i.domain === 'timing');
    const avgScore = timingInsights.length > 0
      ? Math.round(timingInsights.reduce((sum, i) => sum + i.score, 0) / timingInsights.length)
      : 50;

    // 활성 트랜짓
    const activeTransits: ActiveTransit[] = (input.activeTransits || []).map(transit => ({
      cycle: transit,
      influence: this.getTransitInfluence(transit),
      description: this.getTransitDescription(transit, lang),
      descriptionEn: this.getTransitDescription(transit, 'en'),
    }));

    // 역행 알림
    const retrogradeAlerts = this.getRetrogradeAlerts(lang);

    return {
      currentPeriod: {
        name: lang === 'ko' ? '현재 운세' : 'Current Fortune',
        nameEn: 'Current Fortune',
        score: avgScore,
        description: this.getTimingDescription(avgScore, lang),
        descriptionEn: this.getTimingDescription(avgScore, 'en'),
      },
      activeTransits,
      upcomingPeriods: [], // 향후 구현
      retrogradeAlerts,
    };
  }

  /**
   * 트랜짓 영향 판단
   */
  private getTransitInfluence(transit: TransitCycle): 'positive' | 'neutral' | 'challenging' {
    const positiveTransits: TransitCycle[] = ['jupiterReturn', 'nodeReturn'];
    const challengingTransits: TransitCycle[] = ['saturnReturn', 'plutoTransit', 'mercuryRetrograde', 'marsRetrograde'];

    if (positiveTransits.includes(transit)) return 'positive';
    if (challengingTransits.includes(transit)) return 'challenging';
    return 'neutral';
  }

  /**
   * 트랜짓 설명
   */
  private getTransitDescription(transit: TransitCycle, lang: 'ko' | 'en'): string {
    const descriptions: Record<TransitCycle, { ko: string; en: string }> = {
      saturnReturn: { ko: '책임과 성숙의 시기', en: 'Time of responsibility and maturity' },
      jupiterReturn: { ko: '확장과 행운의 시기', en: 'Time of expansion and fortune' },
      uranusSquare: { ko: '각성과 변화의 시기', en: 'Time of awakening and change' },
      neptuneSquare: { ko: '영적 재정립의 시기', en: 'Time of spiritual realignment' },
      plutoTransit: { ko: '근본적 변혁의 시기', en: 'Time of fundamental transformation' },
      nodeReturn: { ko: '운명의 전환점', en: 'Destiny turning point' },
      eclipse: { ko: '급격한 변화의 시기', en: 'Time of rapid change' },
      mercuryRetrograde: { ko: '소통 재검토 시기', en: 'Communication review period' },
      venusRetrograde: { ko: '관계 재평가 시기', en: 'Relationship reassessment period' },
      marsRetrograde: { ko: '행동 재점검 시기', en: 'Action review period' },
      jupiterRetrograde: { ko: '내면 성장 시기', en: 'Inner growth period' },
      saturnRetrograde: { ko: '구조 재정비 시기', en: 'Structure reorganization period' },
    };

    return descriptions[transit][lang];
  }

  /**
   * 타이밍 설명
   */
  private getTimingDescription(score: number, lang: 'ko' | 'en'): string {
    if (score >= 70) {
      return lang === 'ko' ? '행동하기 좋은 시기입니다. 계획을 실행하세요.' : 'Good time for action. Execute your plans.';
    }
    if (score >= 50) {
      return lang === 'ko' ? '안정적인 흐름입니다. 꾸준히 진행하세요.' : 'Stable flow. Proceed steadily.';
    }
    return lang === 'ko' ? '신중한 접근이 필요합니다. 큰 결정은 미루세요.' : 'Careful approach needed. Postpone major decisions.';
  }

  /**
   * 역행 알림 생성
   */
  private getRetrogradeAlerts(lang: 'ko' | 'en'): RetrogradeAlert[] {
    const now = new Date();
    const year = now.getFullYear() as 2024 | 2025;
    const schedule = RETROGRADE_SCHEDULE[year];

    if (!schedule) return [];

    const alerts: RetrogradeAlert[] = [];

    // Mercury retrograde
    for (const period of schedule.mercury) {
      const start = new Date(period.start);
      const end = new Date(period.end);
      if (now >= start && now <= end) {
        alerts.push({
          planet: 'Mercury',
          startDate: start,
          endDate: end,
          affectedDomains: ['career', 'relationship'],
          advice: lang === 'ko' ? '계약, 여행, 중요 결정을 재검토하세요.' : 'Review contracts, travel, and important decisions.',
          adviceEn: 'Review contracts, travel, and important decisions.',
        });
      }
    }

    return alerts;
  }

  /**
   * 시각화 데이터 생성
   */
  private generateVisualizations(insights: FusionInsight[], domainAnalysis: DomainAnalysis[]): VisualizationData {
    // 레이더 차트 데이터
    const radarChart = {
      labels: domainAnalysis.map(d => d.domain),
      labelsEn: domainAnalysis.map(d => d.domain),
      values: domainAnalysis.map(d => d.score),
      maxValue: 100,
    };

    // 히트맵 데이터
    const categories: InsightCategory[] = ['strength', 'opportunity', 'balance', 'caution', 'challenge'];
    const domains: InsightDomain[] = ['personality', 'career', 'relationship', 'wealth', 'health', 'spirituality'];

    const grouped = this.insightGenerator.groupByCategory(insights);
    const heatmapValues = categories.map(cat =>
      domains.map(dom => {
        const matching = grouped[cat].filter(i => i.domain === dom);
        return matching.length > 0
          ? Math.round(matching.reduce((sum, i) => sum + i.score, 0) / matching.length)
          : 0;
      })
    );

    const heatmap = {
      rows: categories,
      cols: domains,
      values: heatmapValues,
      colorScale: ['#f3f4f6', '#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'],
    };

    // 시너지 네트워크
    const synergyNetwork = this.generateSynergyNetwork(insights);

    // 타임라인
    const timeline = { events: [] };

    return { radarChart, heatmap, synergyNetwork, timeline };
  }

  /**
   * 시너지 네트워크 생성
   */
  private generateSynergyNetwork(insights: FusionInsight[]): { nodes: SynergyNode[]; edges: SynergyEdge[] } {
    const nodes: SynergyNode[] = [];
    const edges: SynergyEdge[] = [];
    const nodeMap = new Map<string, SynergyNode>();

    for (const insight of insights.slice(0, 20)) {
      for (const source of insight.sources) {
        // 사주 노드
        if (source.sajuFactor && !nodeMap.has(source.sajuFactor)) {
          const node: SynergyNode = {
            id: source.sajuFactor,
            label: source.sajuFactor,
            type: 'saju',
            size: 10 + insight.score / 10,
            color: '#ef4444',
          };
          nodeMap.set(source.sajuFactor, node);
          nodes.push(node);
        }

        // 점성 노드
        if (source.astroFactor && !nodeMap.has(source.astroFactor)) {
          const node: SynergyNode = {
            id: source.astroFactor,
            label: source.astroFactor,
            type: 'astro',
            size: 10 + insight.score / 10,
            color: '#3b82f6',
          };
          nodeMap.set(source.astroFactor, node);
          nodes.push(node);
        }

        // 엣지
        if (source.sajuFactor && source.astroFactor) {
          edges.push({
            source: source.sajuFactor,
            target: source.astroFactor,
            weight: insight.score / 100,
            type: insight.category === 'strength' || insight.category === 'opportunity' ? 'synergy' : 'tension',
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * 빈 시각화 데이터
   */
  private getEmptyVisualizations(): VisualizationData {
    return {
      radarChart: { labels: [], labelsEn: [], values: [], maxValue: 100 },
      heatmap: { rows: [], cols: [], values: [], colorScale: [] },
      synergyNetwork: { nodes: [], edges: [] },
      timeline: { events: [] },
    };
  }
}

// 기본 인스턴스
export const reportGenerator = new FusionReportGenerator();
