/**
 * Compatibility Fusion Engine
 * GraphRAG + AI를 결합한 종합 궁합 분석
 */

import {
  SajuProfile,
  AstrologyProfile,
  CompatibilityResult,
  calculateCosmicCompatibility,
} from './cosmicCompatibility';

import {
  buildCompatibilityGraph,
  analyzeCompatibilityGraph,
  GraphAnalysisResult,
} from './compatibilityGraph';

// ============================================================
// Fusion Result 타입
// ============================================================

export interface FusionCompatibilityResult extends CompatibilityResult {
  graphAnalysis: GraphAnalysisResult;
  aiInsights: AIInsights;
  recommendedActions: RecommendedAction[];
  relationshipDynamics: RelationshipDynamics;
  futureGuidance: FutureGuidance;
}

export interface AIInsights {
  deepAnalysis: string;
  hiddenPatterns: string[];
  synergySources: string[];
  growthOpportunities: string[];
}

export interface RecommendedAction {
  category: 'communication' | 'emotional' | 'practical' | 'spiritual';
  priority: 'high' | 'medium' | 'low';
  action: string;
  reasoning: string;
}

export interface RelationshipDynamics {
  powerBalance: number; // -100 to 100 (negative = person1 dominant, positive = person2 dominant)
  emotionalIntensity: number; // 0-100
  intellectualAlignment: number; // 0-100
  spiritualConnection: number; // 0-100
  conflictResolutionStyle: string;
}

export interface FutureGuidance {
  shortTerm: string; // 1-6개월
  mediumTerm: string; // 6개월-2년
  longTerm: string; // 2년+
  challenges: TimedChallenge[];
  opportunities: TimedOpportunity[];
}

export interface TimedChallenge {
  timeframe: 'short' | 'medium' | 'long';
  description: string;
  mitigation: string;
}

export interface TimedOpportunity {
  timeframe: 'short' | 'medium' | 'long';
  description: string;
  howToCapitalize: string;
}

// ============================================================
// 메인 Fusion 엔진
// ============================================================

export function calculateFusionCompatibility(
  person1Saju: SajuProfile,
  person1Astro: AstrologyProfile,
  person2Saju: SajuProfile,
  person2Astro: AstrologyProfile
): FusionCompatibilityResult {
  // 1. 기본 궁합 계산
  const baseCompatibility = calculateCosmicCompatibility(
    person1Saju,
    person1Astro,
    person2Saju,
    person2Astro
  );

  // 2. 그래프 구축 및 분석
  const graph = buildCompatibilityGraph(
    person1Saju,
    person1Astro,
    person2Saju,
    person2Astro
  );

  const graphAnalysis = analyzeCompatibilityGraph(graph);

  // 3. AI 인사이트 생성
  const aiInsights = generateAIInsights(
    baseCompatibility,
    graphAnalysis,
    person1Saju,
    person1Astro,
    person2Saju,
    person2Astro
  );

  // 4. 추천 행동 생성
  const recommendedActions = generateRecommendedActions(
    baseCompatibility,
    graphAnalysis,
    aiInsights
  );

  // 5. 관계 역학 분석
  const relationshipDynamics = analyzeRelationshipDynamics(
    person1Saju,
    person1Astro,
    person2Saju,
    person2Astro,
    graphAnalysis
  );

  // 6. 미래 가이던스 생성
  const futureGuidance = generateFutureGuidance(
    baseCompatibility,
    relationshipDynamics,
    graphAnalysis
  );

  return {
    ...baseCompatibility,
    graphAnalysis,
    aiInsights,
    recommendedActions,
    relationshipDynamics,
    futureGuidance,
  };
}

// ============================================================
// AI 인사이트 생성
// ============================================================

function generateAIInsights(
  compatibility: CompatibilityResult,
  graphAnalysis: GraphAnalysisResult,
  _p1Saju: SajuProfile,
  _p1Astro: AstrologyProfile,
  _p2Saju: SajuProfile,
  _p2Astro: AstrologyProfile
): AIInsights {
  const hiddenPatterns: string[] = [];
  const synergySources: string[] = [];
  const growthOpportunities: string[] = [];

  // 숨겨진 패턴 분석
  if (graphAnalysis.harmonyIndex > 0.7 && compatibility.overallScore < 70) {
    hiddenPatterns.push(
      '표면적으로는 차이가 있어 보이지만, 깊은 수준에서는 강한 조화를 이룹니다'
    );
  }

  if (graphAnalysis.clusterScore > 0.6) {
    hiddenPatterns.push(
      '사주와 점성학이 복잡하게 얽혀있어 운명적 인연의 가능성이 높습니다'
    );
  }

  // 음양과 오행 교차 분석
  const yinYangDiff = _p1Saju.dayMaster.yin_yang !== _p2Saju.dayMaster.yin_yang;
  const elementCompat = compatibility.breakdown.elementalHarmony;

  if (yinYangDiff && elementCompat > 70) {
    hiddenPatterns.push(
      '음양의 균형과 오행의 조화가 완벽하게 맞아떨어지는 희귀한 조합입니다'
    );
  }

  // 시너지 소스 분석
  const resonances = graphAnalysis.strongestPaths.filter(
    p => p.type === 'positive' && p.score > 0.7
  );

  if (resonances.length > 0) {
    synergySources.push(
      `${resonances.length}개의 강력한 공명 포인트가 서로를 증폭시킵니다`
    );
  }

  if (compatibility.details.sajuAnalysis.dayMasterHarmony >= 85) {
    synergySources.push(
      '사주 일간의 완벽한 조화로 서로의 본질을 직관적으로 이해합니다'
    );
  }

  if (compatibility.details.astrologyAnalysis.venusMarsSynergy >= 80) {
    synergySources.push(
      '금성-화성의 강력한 끌림으로 로맨틱한 화학반응이 지속됩니다'
    );
  }

  // 성장 기회 분석
  const challenges = compatibility.challenges;

  if (challenges.length > 0) {
    growthOpportunities.push(
      '서로의 차이점을 통해 새로운 관점을 배우고 성장할 수 있습니다'
    );
  }

  if (compatibility.details.sajuAnalysis.elementBalance < 60) {
    growthOpportunities.push(
      '오행 균형을 맞추는 과정에서 서로를 완전하게 만들어갑니다'
    );
  }

  const sunMoonHarmony = compatibility.details.astrologyAnalysis.sunMoonHarmony;
  if (sunMoonHarmony >= 60 && sunMoonHarmony < 80) {
    growthOpportunities.push(
      '가치관의 작은 차이가 관계에 깊이와 다양성을 더해줍니다'
    );
  }

  // Deep Analysis 종합
  const deepAnalysis = generateDeepAnalysis(
    compatibility,
    graphAnalysis,
    hiddenPatterns,
    synergySources
  );

  return {
    deepAnalysis,
    hiddenPatterns,
    synergySources,
    growthOpportunities,
  };
}

function generateDeepAnalysis(
  compatibility: CompatibilityResult,
  graphAnalysis: GraphAnalysisResult,
  hiddenPatterns: string[],
  synergySources: string[]
): string {
  const score = compatibility.overallScore;

  if (score >= 85) {
    return `이 관계는 사주와 점성학 양쪽에서 매우 드문 조화를 보입니다. ${
      synergySources.length
    }개의 강력한 시너지 포인트와 ${
      graphAnalysis.harmonyIndex * 100
    }%의 조화 지수는 두 사람이 우주적 차원에서 완벽하게 맞물려있음을 시사합니다. ${
      hiddenPatterns[0] || '깊은 영혼의 연결'
    }이 관계의 핵심입니다.`;
  } else if (score >= 70) {
    return `두 사람의 에너지는 전반적으로 조화롭게 흐릅니다. 그래프 분석 결과 ${
      graphAnalysis.criticalNodes.length
    }개의 핵심 연결점이 관계를 지탱하고 있으며, 이는 안정적이면서도 성장 가능한 관계임을 보여줍니다. 서로의 강점을 존중하며 함께 발전할 수 있는 좋은 조합입니다.`;
  } else if (score >= 55) {
    return `이 관계는 노력과 이해가 필요한 도전적인 조합입니다. 하지만 ${
      synergySources.length
    }개의 잠재적 시너지와 ${
      hiddenPatterns.length
    }개의 숨겨진 조화 패턴이 발견되었습니다. 서로의 차이를 배움의 기회로 삼는다면 매우 의미있는 성장을 경험할 수 있습니다.`;
  } else {
    return `사주와 점성학 분석에서 상당한 차이가 보입니다. 그러나 이는 반드시 부정적인 것만은 아닙니다. ${
      graphAnalysis.clusterScore * 100
    }%의 연결성은 서로에게서 배울 점이 많다는 의미이기도 합니다. 인내심과 열린 마음으로 접근한다면 독특하고 변화무쌍한 관계를 만들 수 있습니다.`;
  }
}

// ============================================================
// 추천 행동 생성
// ============================================================

function generateRecommendedActions(
  compatibility: CompatibilityResult,
  graphAnalysis: GraphAnalysisResult,
  _aiInsights: AIInsights
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // Communication
  if (compatibility.details.astrologyAnalysis.sunMoonHarmony < 60) {
    actions.push({
      category: 'communication',
      priority: 'high',
      action: '정기적으로 서로의 가치관과 감정을 공유하는 시간을 가지세요',
      reasoning: '태양-달 조화도가 낮아 가치관과 감정 표현의 차이를 좁혀야 합니다',
    });
  }

  if (graphAnalysis.harmonyIndex < 0.5) {
    actions.push({
      category: 'communication',
      priority: 'high',
      action: '갈등 상황에서 먼저 경청하고, 이해하려는 노력을 기울이세요',
      reasoning: '관계 그래프에서 조화 지수가 낮아 적극적인 소통이 필요합니다',
    });
  }

  // Emotional
  if (compatibility.details.astrologyAnalysis.venusMarsSynergy >= 70) {
    actions.push({
      category: 'emotional',
      priority: 'medium',
      action: '로맨틱한 순간을 자주 만들고 감정적 유대를 지속적으로 강화하세요',
      reasoning: '금성-화성 시너지가 강해 감정적 연결을 잘 활용할 수 있습니다',
    });
  }

  if (compatibility.breakdown.yinYangBalance < 70) {
    actions.push({
      category: 'emotional',
      priority: 'medium',
      action: '서로의 에너지 리듬을 존중하고 개인 시간도 확보하세요',
      reasoning: '음양 균형이 필요하므로 함께 있는 시간과 혼자 있는 시간의 밸런스가 중요합니다',
    });
  }

  // Practical
  if (compatibility.details.sajuAnalysis.elementBalance < 50) {
    actions.push({
      category: 'practical',
      priority: 'high',
      action: '역할 분담을 명확히 하고 서로의 강점을 활용한 협력 시스템을 만드세요',
      reasoning: '오행 균형이 낮아 실질적인 역할 분담으로 보완이 필요합니다',
    });
  }

  // Spiritual
  if (graphAnalysis.clusterScore > 0.6) {
    actions.push({
      category: 'spiritual',
      priority: 'low',
      action: '함께 명상하거나 영적 성장을 위한 활동을 공유하세요',
      reasoning: '깊은 영적 연결 가능성이 높아 함께 성장할 수 있습니다',
    });
  }

  if (compatibility.overallScore >= 80) {
    actions.push({
      category: 'spiritual',
      priority: 'medium',
      action: '이 특별한 인연에 감사하며 서로의 성장을 응원하세요',
      reasoning: '우주적 조화가 뛰어난 관계이므로 감사와 존중을 유지하세요',
    });
  }

  return actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============================================================
// 관계 역학 분석
// ============================================================

function analyzeRelationshipDynamics(
  p1Saju: SajuProfile,
  p1Astro: AstrologyProfile,
  p2Saju: SajuProfile,
  p2Astro: AstrologyProfile,
  graphAnalysis: GraphAnalysisResult
): RelationshipDynamics {
  // Power Balance
  const p1ElementStrength = Object.values(p1Saju.elements).reduce((a, b) => a + b, 0);
  const p2ElementStrength = Object.values(p2Saju.elements).reduce((a, b) => a + b, 0);
  const powerBalance = ((p2ElementStrength - p1ElementStrength) / Math.max(p1ElementStrength, p2ElementStrength)) * 100;

  // Emotional Intensity (Venus-Mars)
  const p1VenusElement = p1Astro.venus.element;
  const p2MarsElement = p2Astro.mars.element;
  const p2VenusElement = p2Astro.venus.element;
  const p1MarsElement = p1Astro.mars.element;

  let emotionalIntensity = 50;
  if (p1VenusElement === p2MarsElement) {emotionalIntensity += 25;}
  if (p2VenusElement === p1MarsElement) {emotionalIntensity += 25;}

  // Intellectual Alignment (Sun-Moon)
  const sunSignMatch = p1Astro.sun.sign === p2Astro.sun.sign;
  const moonSignMatch = p1Astro.moon.sign === p2Astro.moon.sign;

  let intellectualAlignment = 50;
  if (sunSignMatch) {intellectualAlignment += 30;}
  if (moonSignMatch) {intellectualAlignment += 20;}

  // Spiritual Connection (graph clustering)
  const spiritualConnection = Math.min(100, graphAnalysis.clusterScore * 150);

  // Conflict Resolution Style
  let conflictResolutionStyle = '균형잡힌 협상';
  if (p1Saju.dayMaster.yin_yang === p2Saju.dayMaster.yin_yang) {
    conflictResolutionStyle = p1Saju.dayMaster.yin_yang === 'yang'
      ? '직접적이고 솔직한 대화'
      : '조용하고 사려깊은 대화';
  } else {
    conflictResolutionStyle = '서로 다른 접근방식을 조율하는 협력적 해결';
  }

  return {
    powerBalance: Math.round(powerBalance),
    emotionalIntensity: Math.round(emotionalIntensity),
    intellectualAlignment: Math.round(intellectualAlignment),
    spiritualConnection: Math.round(spiritualConnection),
    conflictResolutionStyle,
  };
}

// ============================================================
// 미래 가이던스 생성
// ============================================================

function generateFutureGuidance(
  compatibility: CompatibilityResult,
  dynamics: RelationshipDynamics,
  graphAnalysis: GraphAnalysisResult
): FutureGuidance {
  const challenges: TimedChallenge[] = [];
  const opportunities: TimedOpportunity[] = [];

  // Short-term (1-6 months)
  let shortTerm = '';
  if (compatibility.overallScore >= 70) {
    shortTerm = '초기 조화가 좋으므로 자연스럽게 서로를 알아가는 시기입니다. 신뢰를 쌓는데 집중하세요.';
  } else {
    shortTerm = '처음에는 차이점이 부각될 수 있습니다. 서두르지 말고 천천히 서로를 이해하는 시간을 가지세요.';
    challenges.push({
      timeframe: 'short',
      description: '초기 적응기의 긴장감',
      mitigation: '정기적인 대화와 작은 성공 경험 쌓기',
    });
  }

  if (dynamics.emotionalIntensity > 75) {
    opportunities.push({
      timeframe: 'short',
      description: '강한 감정적 끌림',
      howToCapitalize: '이 에너지를 활용해 깊은 유대감을 빠르게 형성하세요',
    });
  }

  // Medium-term (6 months - 2 years)
  let mediumTerm = '';
  if (graphAnalysis.harmonyIndex > 0.6) {
    mediumTerm = '관계가 안정화되며 서로의 리듬을 찾아가는 시기입니다. 함께 하는 일상을 만들어가세요.';

    opportunities.push({
      timeframe: 'medium',
      description: '안정적인 패턴 형성',
      howToCapitalize: '공동의 목표와 루틴을 만들어 관계를 공고히 하세요',
    });
  } else {
    mediumTerm = '조율이 필요한 시기입니다. 갈등을 피하지 말고 건설적으로 해결하는 법을 배우세요.';

    challenges.push({
      timeframe: 'medium',
      description: '가치관과 생활방식의 차이',
      mitigation: '타협점을 찾고 서로의 경계를 존중하는 규칙 만들기',
    });
  }

  // Long-term (2+ years)
  let longTerm = '';
  if (compatibility.overallScore >= 75) {
    longTerm = '깊고 성숙한 관계로 발전할 가능성이 높습니다. 서로의 성장을 지속적으로 지원하세요.';

    opportunities.push({
      timeframe: 'long',
      description: '영적 동반자 관계로의 성장',
      howToCapitalize: '함께 더 큰 목표를 향해 나아가며 서로를 고양시키세요',
    });
  } else if (compatibility.overallScore >= 55) {
    longTerm = '관계를 지속하려면 계속된 노력이 필요합니다. 성장 기회로 삼으면 의미있는 관계가 됩니다.';

    challenges.push({
      timeframe: 'long',
      description: '지속적인 조율의 필요성',
      mitigation: '관계에 투자하는 시간과 상담/대화를 통한 지속적 개선',
    });
  } else {
    longTerm = '장기적으로는 각자의 길을 가는 것이 나을 수 있습니다. 하지만 배움은 언제나 가치있습니다.';
  }

  if (dynamics.spiritualConnection > 70) {
    opportunities.push({
      timeframe: 'long',
      description: '영혼 수준의 깊은 연결',
      howToCapitalize: '명상, 영적 수행 등을 함께 하며 초월적 경험을 공유하세요',
    });
  }

  return {
    shortTerm,
    mediumTerm,
    longTerm,
    challenges,
    opportunities,
  };
}

// ============================================================
// 궁합 점수 해석 헬퍼
// ============================================================

export function interpretCompatibilityScore(score: number): {
  grade: string;
  emoji: string;
  title: string;
  description: string;
} {
  if (score >= 90) {
    return {
      grade: 'S+',
      emoji: '✨',
      title: '천상의 인연',
      description: '우주가 맺어준 완벽한 조화. 전생의 인연일 가능성이 높습니다.',
    };
  } else if (score >= 85) {
    return {
      grade: 'S',
      emoji: '💫',
      title: '천생연분',
      description: '사주와 점성학 모두에서 드문 조화를 보이는 최상의 궁합입니다.',
    };
  } else if (score >= 75) {
    return {
      grade: 'A',
      emoji: '🌟',
      title: '매우 좋은 궁합',
      description: '자연스럽게 조화를 이루며 함께 성장할 수 있는 관계입니다.',
    };
  } else if (score >= 65) {
    return {
      grade: 'B',
      emoji: '⭐',
      title: '좋은 궁합',
      description: '서로를 이해하고 존중한다면 안정적인 관계를 만들 수 있습니다.',
    };
  } else if (score >= 55) {
    return {
      grade: 'C',
      emoji: '💫',
      title: '노력이 필요한 궁합',
      description: '차이를 인정하고 소통하며 관계를 발전시켜나가야 합니다.',
    };
  } else if (score >= 45) {
    return {
      grade: 'D',
      emoji: '🌙',
      title: '도전적인 궁합',
      description: '많은 이해와 인내가 필요하지만 배움의 기회가 될 수 있습니다.',
    };
  } else {
    return {
      grade: 'F',
      emoji: '⚠️',
      title: '어려운 궁합',
      description: '근본적인 차이가 크므로 신중한 접근이 필요합니다.',
    };
  }
}
