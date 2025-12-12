/**
 * eventCorrelation.ts - 사주 사건 상관관계 분석 엔진 (1000% 레벨)
 *
 * 인생 사건과 사주 운의 상관관계 분석, 패턴 인식, 예측
 */

import { FiveElement, StemBranchInfo } from './types';
import { STEMS, BRANCHES, JIJANGGAN } from './constants';

// 간소화된 사주 결과 인터페이스 (이 모듈 내부용)
interface SimplePillar {
  stem: string;
  branch: string;
}

interface SimpleFourPillars {
  year: SimplePillar;
  month: SimplePillar;
  day: SimplePillar;
  hour: SimplePillar;
}

export interface SajuResult {
  fourPillars: SimpleFourPillars;
  dayMaster?: string;
  [key: string]: unknown;
}

// ============================================================================
// 타입 정의
// ============================================================================

export type EventCategory =
  | 'career'      // 직업/사업
  | 'finance'     // 재물/투자
  | 'relationship' // 인간관계/결혼
  | 'health'      // 건강
  | 'education'   // 학업/시험
  | 'travel'      // 이동/이사
  | 'legal'       // 법적/계약
  | 'family'      // 가족
  | 'spiritual';  // 영적/심리

export type EventNature = 'positive' | 'negative' | 'neutral' | 'transformative';

export interface LifeEvent {
  id: string;
  date: Date;
  category: EventCategory;
  nature: EventNature;
  description: string;
  significance: number; // 1-10
  outcome?: string;
}

export interface EventSajuCorrelation {
  event: LifeEvent;
  yearPillar: { stem: string; branch: string };
  monthPillar: { stem: string; branch: string };
  運: DaeunSeunInfo;
  correlationFactors: CorrelationFactor[];
  overallCorrelation: number; // 0-100
  insight: string;
}

export interface DaeunSeunInfo {
  대운천간: string;
  대운지지: string;
  세운천간: string;
  세운지지: string;
  월운천간: string;
  월운지지: string;
}

export interface CorrelationFactor {
  factor: string;
  type: '합' | '충' | '형' | '파' | '해' | '원진' | '삼합' | '방합' | '귀인' | '신살' | '오행';
  strength: number; // 0-100
  description: string;
  isPositive: boolean;
}

export interface PatternRecognition {
  pattern: string;
  events: LifeEvent[];
  astronomicalTrigger: string;
  frequency: string;
  nextPotentialDate?: Date;
  recommendation: string;
}

export interface PredictiveInsight {
  period: { start: Date; end: Date };
  favorableAreas: EventCategory[];
  cautionAreas: EventCategory[];
  keyDates: { date: Date; significance: string }[];
  overallEnergy: string;
  actionAdvice: string[];
}

export interface EventTimeline {
  events: EventSajuCorrelation[];
  majorPeriods: { start: Date; end: Date; theme: string }[];
  turningPoints: Date[];
  cyclicalPatterns: PatternRecognition[];
}

export interface TriggerAnalysis {
  trigger: string;
  triggerType: '천간' | '지지' | '복합';
  activatedBy: string;
  resultingEnergy: string;
  historicalOccurrences: Date[];
  futureOccurrences: Date[];
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

function getStemInfo(stemName: string): StemBranchInfo | undefined {
  return STEMS.find(s => s.name === stemName);
}

function getBranchInfo(branchName: string): StemBranchInfo | undefined {
  return BRANCHES.find(b => b.name === branchName);
}

function getStemElement(stemName: string): string {
  const stem = getStemInfo(stemName);
  return stem?.element || '토';
}

function getBranchElement(branchName: string): string {
  const branch = getBranchInfo(branchName);
  return branch?.element || '토';
}

// 천간 합
const CHEONGAN_HAP: Record<string, { partner: string; result: string }> = {
  '갑': { partner: '기', result: '토' },
  '을': { partner: '경', result: '금' },
  '병': { partner: '신', result: '수' },
  '정': { partner: '임', result: '목' },
  '무': { partner: '계', result: '화' },
  '기': { partner: '갑', result: '토' },
  '경': { partner: '을', result: '금' },
  '신': { partner: '병', result: '수' },
  '임': { partner: '정', result: '목' },
  '계': { partner: '무', result: '화' }
};

// 천간 충
const CHEONGAN_CHUNG: Record<string, string> = {
  '갑': '경', '을': '신', '병': '임', '정': '계', '무': '갑',
  '경': '갑', '신': '을', '임': '병', '계': '정'
};

// 지지 육합
const YUKAP: Record<string, { partner: string; result: string }> = {
  '자': { partner: '축', result: '토' },
  '축': { partner: '자', result: '토' },
  '인': { partner: '해', result: '목' },
  '해': { partner: '인', result: '목' },
  '묘': { partner: '술', result: '화' },
  '술': { partner: '묘', result: '화' },
  '진': { partner: '유', result: '금' },
  '유': { partner: '진', result: '금' },
  '사': { partner: '신', result: '수' },
  '신': { partner: '사', result: '수' },
  '오': { partner: '미', result: '토' },
  '미': { partner: '오', result: '토' }
};

// 지지 삼합
const SAMHAP: Record<string, { members: string[]; result: string }> = {
  '수국': { members: ['신', '자', '진'], result: '수' },
  '화국': { members: ['인', '오', '술'], result: '화' },
  '목국': { members: ['해', '묘', '미'], result: '목' },
  '금국': { members: ['사', '유', '축'], result: '금' }
};

// 지지 충
const CHUNG: Record<string, string> = {
  '자': '오', '오': '자', '축': '미', '미': '축',
  '인': '신', '신': '인', '묘': '유', '유': '묘',
  '진': '술', '술': '진', '사': '해', '해': '사'
};

// 지지 형
const HYEONG: Record<string, string[]> = {
  '인': ['사', '신'],
  '사': ['인', '신'],
  '신': ['인', '사'],
  '축': ['술', '미'],
  '술': ['축', '미'],
  '미': ['축', '술'],
  '자': ['묘'],
  '묘': ['자'],
  '진': ['진'],
  '오': ['오'],
  '유': ['유'],
  '해': ['해']
};

// 귀인
const GWIIN: Record<string, string[]> = {
  '갑': ['축', '미'],
  '을': ['자', '신'],
  '병': ['해', '유'],
  '정': ['해', '유'],
  '무': ['축', '미'],
  '기': ['자', '신'],
  '경': ['축', '미'],
  '신': ['인', '오'],
  '임': ['묘', '사'],
  '계': ['묘', '사']
};

// 역마
const YEOKMA: Record<string, string> = {
  '신자진': '인',
  '인오술': '신',
  '해묘미': '사',
  '사유축': '해'
};

// ============================================================================
// 핵심 분석 함수
// ============================================================================

/**
 * 특정 날짜의 세운/월운 계산
 */
export function calculatePeriodPillars(date: Date): DaeunSeunInfo {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // 세운 천간 (년도 마지막 자리 기준)
  const yearStemIndex = (year - 4) % 10;
  const yearBranchIndex = (year - 4) % 12;
  const 세운천간 = STEMS[yearStemIndex].name;
  const 세운지지 = BRANCHES[yearBranchIndex].name;

  // 월운 (간략 계산)
  const monthBranchIndex = (month + 1) % 12;
  const 월운지지 = BRANCHES[monthBranchIndex].name;
  // 월건 천간은 년간에 따라 결정
  const monthStemBase = (yearStemIndex % 5) * 2;
  const 월운천간 = STEMS[(monthStemBase + month - 1) % 10].name;

  return {
    대운천간: '', // 대운은 별도 계산 필요
    대운지지: '',
    세운천간,
    세운지지,
    월운천간,
    월운지지
  };
}

/**
 * 사건과 사주 상관관계 분석
 */
export function analyzeEventCorrelation(
  event: LifeEvent,
  saju: SajuResult
): EventSajuCorrelation {
  const periodPillars = calculatePeriodPillars(event.date);
  const correlationFactors: CorrelationFactor[] = [];

  const dayMaster = saju.fourPillars.day.stem;
  const dayBranch = saju.fourPillars.day.branch;

  // 세운과의 관계 분석
  // 천간 합 체크
  if (CHEONGAN_HAP[dayMaster]?.partner === periodPillars.세운천간) {
    correlationFactors.push({
      factor: `일간-세운 천간합 (${dayMaster}-${periodPillars.세운천간})`,
      type: '합',
      strength: 85,
      description: '중요한 인연이나 기회가 찾아오는 시기',
      isPositive: true
    });
  }

  // 천간 충 체크
  if (CHEONGAN_CHUNG[dayMaster] === periodPillars.세운천간) {
    correlationFactors.push({
      factor: `일간-세운 천간충 (${dayMaster}-${periodPillars.세운천간})`,
      type: '충',
      strength: 75,
      description: '변화와 도전의 시기',
      isPositive: false
    });
  }

  // 지지 육합 체크
  if (YUKAP[dayBranch]?.partner === periodPillars.세운지지) {
    correlationFactors.push({
      factor: `일지-세운 육합 (${dayBranch}-${periodPillars.세운지지})`,
      type: '합',
      strength: 80,
      description: '조화롭고 안정적인 시기',
      isPositive: true
    });
  }

  // 지지 충 체크
  if (CHUNG[dayBranch] === periodPillars.세운지지) {
    correlationFactors.push({
      factor: `일지-세운 충 (${dayBranch}-${periodPillars.세운지지})`,
      type: '충',
      strength: 80,
      description: '큰 변화와 이동수의 시기',
      isPositive: false
    });
  }

  // 지지 형 체크
  if (HYEONG[dayBranch]?.includes(periodPillars.세운지지)) {
    correlationFactors.push({
      factor: `일지-세운 형 (${dayBranch}-${periodPillars.세운지지})`,
      type: '형',
      strength: 70,
      description: '갈등과 시련의 시기',
      isPositive: false
    });
  }

  // 귀인 체크
  if (GWIIN[dayMaster]?.includes(periodPillars.세운지지)) {
    correlationFactors.push({
      factor: `천을귀인 (${dayMaster}의 귀인 ${periodPillars.세운지지})`,
      type: '귀인',
      strength: 85,
      description: '귀인의 도움을 받는 시기',
      isPositive: true
    });
  }

  // 삼합 체크
  for (const [name, info] of Object.entries(SAMHAP)) {
    if (info.members.includes(dayBranch) && info.members.includes(periodPillars.세운지지)) {
      correlationFactors.push({
        factor: `${name} 삼합 형성`,
        type: '삼합',
        strength: 75,
        description: `${info.result} 에너지 강화`,
        isPositive: true
      });
    }
  }

  // 오행 관계 분석
  const dayElement = getStemElement(dayMaster);
  const yearElement = getStemElement(periodPillars.세운천간);
  correlationFactors.push(...analyzeElementRelation(dayElement, yearElement, '세운'));

  // 상관관계 점수 계산
  let overallCorrelation = 50;
  for (const factor of correlationFactors) {
    if (factor.isPositive) {
      overallCorrelation += factor.strength * 0.3;
    } else {
      overallCorrelation -= factor.strength * 0.2;
    }
  }
  overallCorrelation = Math.max(0, Math.min(100, overallCorrelation));

  // 인사이트 생성
  const insight = generateEventInsight(event, correlationFactors);

  return {
    event,
    yearPillar: { stem: periodPillars.세운천간, branch: periodPillars.세운지지 },
    monthPillar: { stem: periodPillars.월운천간, branch: periodPillars.월운지지 },
    運: periodPillars,
    correlationFactors,
    overallCorrelation,
    insight
  };
}

function analyzeElementRelation(
  dayElement: string,
  periodElement: string,
  periodName: string
): CorrelationFactor[] {
  const factors: CorrelationFactor[] = [];
  const SANGSEANG: Record<string, string> = {
    '목': '화', '화': '토', '토': '금', '금': '수', '수': '목'
  };
  const SANGKEUK: Record<string, string> = {
    '목': '토', '화': '금', '토': '수', '금': '목', '수': '화'
  };

  if (dayElement === periodElement) {
    factors.push({
      factor: `${periodName} 비화`,
      type: '오행',
      strength: 65,
      description: '같은 기운으로 힘이 강해지나 과할 수 있음',
      isPositive: true
    });
  } else if (SANGSEANG[periodElement] === dayElement) {
    factors.push({
      factor: `${periodName}이 일간을 생함`,
      type: '오행',
      strength: 80,
      description: '도움과 지원을 받는 시기',
      isPositive: true
    });
  } else if (SANGSEANG[dayElement] === periodElement) {
    factors.push({
      factor: `일간이 ${periodName}을 생함`,
      type: '오행',
      strength: 60,
      description: '에너지 소모가 있으나 결실의 시기',
      isPositive: true
    });
  } else if (SANGKEUK[periodElement] === dayElement) {
    factors.push({
      factor: `${periodName}이 일간을 극함`,
      type: '오행',
      strength: 70,
      description: '압박과 도전의 시기',
      isPositive: false
    });
  } else if (SANGKEUK[dayElement] === periodElement) {
    factors.push({
      factor: `일간이 ${periodName}을 극함`,
      type: '오행',
      strength: 65,
      description: '통제력 발휘의 시기',
      isPositive: true
    });
  }

  return factors;
}

function generateEventInsight(
  event: LifeEvent,
  factors: CorrelationFactor[]
): string {
  const positiveFactors = factors.filter(f => f.isPositive);
  const negativeFactors = factors.filter(f => !f.isPositive);

  let insight = '';

  if (event.nature === 'positive' && positiveFactors.length > negativeFactors.length) {
    insight = `이 긍정적 사건은 ${positiveFactors[0]?.factor || '유리한 운'}의 영향으로 자연스럽게 발생했습니다. `;
  } else if (event.nature === 'negative' && negativeFactors.length > 0) {
    insight = `이 시기는 ${negativeFactors[0]?.factor || '도전적 운'}의 영향 아래 있었습니다. `;
  } else if (event.nature === 'transformative') {
    insight = '변화의 에너지가 강하게 작용한 시기입니다. ';
  } else {
    insight = '복합적인 에너지가 작용한 시기입니다. ';
  }

  if (positiveFactors.length > 0 && negativeFactors.length > 0) {
    insight += '긍정적 요소와 도전적 요소가 함께 작용하여 성장의 기회가 되었습니다.';
  }

  return insight;
}

/**
 * 인생 사건들의 패턴 인식
 */
export function recognizePatterns(
  events: LifeEvent[],
  saju: SajuResult
): PatternRecognition[] {
  const patterns: PatternRecognition[] = [];

  // 카테고리별 그룹화
  const categoryGroups: Record<EventCategory, LifeEvent[]> = {
    career: [], finance: [], relationship: [], health: [],
    education: [], travel: [], legal: [], family: [], spiritual: []
  };

  for (const event of events) {
    categoryGroups[event.category].push(event);
  }

  // 반복 패턴 찾기
  for (const [category, categoryEvents] of Object.entries(categoryGroups)) {
    if (categoryEvents.length >= 2) {
      const branches = categoryEvents.map(e => {
        const pillars = calculatePeriodPillars(e.date);
        return pillars.세운지지;
      });

      // 같은 지지에서 반복되는 사건
      const branchCounts: Record<string, number> = {};
      for (const b of branches) {
        branchCounts[b] = (branchCounts[b] || 0) + 1;
      }

      for (const [branch, count] of Object.entries(branchCounts)) {
        if (count >= 2) {
          const relatedEvents = categoryEvents.filter(e => {
            const p = calculatePeriodPillars(e.date);
            return p.세운지지 === branch;
          });

          patterns.push({
            pattern: `${category} 사건 ${branch}년 반복`,
            events: relatedEvents,
            astronomicalTrigger: `${branch}년 (12년 주기)`,
            frequency: '12년 주기',
            nextPotentialDate: calculateNextBranchYear(branch),
            recommendation: getPatternRecommendation(category as EventCategory, relatedEvents)
          });
        }
      }
    }
  }

  // 연속 사건 패턴
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const diff = sortedEvents[i + 1].date.getTime() - sortedEvents[i].date.getTime();
    const monthsDiff = diff / (1000 * 60 * 60 * 24 * 30);

    if (monthsDiff <= 3 && sortedEvents[i].category === sortedEvents[i + 1].category) {
      patterns.push({
        pattern: '연속 사건 클러스터',
        events: [sortedEvents[i], sortedEvents[i + 1]],
        astronomicalTrigger: '운의 집중 기간',
        frequency: '불규칙',
        recommendation: '집중된 에너지 활용 권장'
      });
    }
  }

  return patterns;
}

function calculateNextBranchYear(branch: string): Date {
  const branchIndex = BRANCHES.findIndex(b => b.name === branch);
  const currentYear = new Date().getFullYear();
  const currentBranchIndex = (currentYear - 4) % 12;

  let yearsUntil = branchIndex - currentBranchIndex;
  if (yearsUntil <= 0) yearsUntil += 12;

  return new Date(currentYear + yearsUntil, 0, 1);
}

function getPatternRecommendation(
  category: EventCategory,
  events: LifeEvent[]
): string {
  const positiveCount = events.filter(e => e.nature === 'positive').length;
  const negativeCount = events.filter(e => e.nature === 'negative').length;

  if (positiveCount > negativeCount) {
    return `이 시기에 ${category} 관련 기회가 많았습니다. 다음 주기에도 적극적으로 활용하세요.`;
  } else {
    return `이 시기에 ${category} 관련 주의가 필요했습니다. 다음 주기에는 미리 대비하세요.`;
  }
}

/**
 * 미래 예측적 인사이트 생성
 */
export function generatePredictiveInsight(
  saju: SajuResult,
  startDate: Date,
  endDate: Date
): PredictiveInsight {
  const favorableAreas: EventCategory[] = [];
  const cautionAreas: EventCategory[] = [];
  const keyDates: { date: Date; significance: string }[] = [];
  const actionAdvice: string[] = [];

  const dayMaster = saju.fourPillars.day.stem;
  const dayBranch = saju.fourPillars.day.branch;
  const dayElement = getStemElement(dayMaster);

  // 기간 내 주요 날짜 분석
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const pillars = calculatePeriodPillars(currentDate);

    // 귀인일 체크
    if (GWIIN[dayMaster]?.includes(pillars.세운지지)) {
      keyDates.push({
        date: new Date(currentDate),
        significance: '천을귀인 - 귀인의 도움, 중요한 만남'
      });
    }

    // 충일 체크
    if (CHUNG[dayBranch] === pillars.세운지지) {
      keyDates.push({
        date: new Date(currentDate),
        significance: '일지 충 - 변화와 이동'
      });
    }

    // 합일 체크
    if (YUKAP[dayBranch]?.partner === pillars.세운지지) {
      keyDates.push({
        date: new Date(currentDate),
        significance: '육합 - 조화와 결합'
      });
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // 오행에 따른 유리/불리 영역 분석
  const categoryElementMap: Record<string, EventCategory[]> = {
    '목': ['education', 'spiritual'],
    '화': ['career', 'relationship'],
    '토': ['finance', 'family'],
    '금': ['legal', 'career'],
    '수': ['travel', 'health']
  };

  const 생아 = Object.keys(categoryElementMap).find(el => {
    const SANGSEANG: Record<string, string> = {
      '목': '화', '화': '토', '토': '금', '금': '수', '수': '목'
    };
    return SANGSEANG[el] === dayElement;
  });

  if (생아) {
    favorableAreas.push(...(categoryElementMap[생아] || []));
  }

  const 극아 = Object.keys(categoryElementMap).find(el => {
    const SANGKEUK: Record<string, string> = {
      '목': '토', '화': '금', '토': '수', '금': '목', '수': '화'
    };
    return SANGKEUK[el] === dayElement;
  });

  if (극아) {
    cautionAreas.push(...(categoryElementMap[극아] || []));
  }

  // 전체 에너지
  const periodPillars = calculatePeriodPillars(startDate);
  const periodElement = getStemElement(periodPillars.세운천간);
  let overallEnergy: string;

  if (periodElement === dayElement) {
    overallEnergy = '비견의 기운 - 경쟁과 협력이 공존하는 시기';
    actionAdvice.push('동료와의 협력을 통한 시너지 창출');
    actionAdvice.push('과도한 경쟁심 자제');
  } else if (categoryElementMap[periodElement]) {
    overallEnergy = `${periodElement} 에너지 우세 시기`;
    actionAdvice.push(`${periodElement} 관련 활동에 집중`);
  } else {
    overallEnergy = '균형적 에너지 시기';
    actionAdvice.push('안정적인 기반 다지기');
  }

  return {
    period: { start: startDate, end: endDate },
    favorableAreas: Array.from(new Set(favorableAreas)),
    cautionAreas: Array.from(new Set(cautionAreas)),
    keyDates: keyDates.slice(0, 10), // 상위 10개
    overallEnergy,
    actionAdvice
  };
}

/**
 * 트리거 분석 - 어떤 조건이 사건을 촉발했는지
 */
export function analyzeTriggers(
  events: LifeEvent[],
  saju: SajuResult
): TriggerAnalysis[] {
  const triggers: TriggerAnalysis[] = [];
  const dayMaster = saju.fourPillars.day.stem;
  const dayBranch = saju.fourPillars.day.branch;

  // 각 사건의 트리거 분석
  for (const event of events) {
    const pillars = calculatePeriodPillars(event.date);

    // 천간 트리거
    if (CHEONGAN_HAP[dayMaster]?.partner === pillars.세운천간) {
      const existingTrigger = triggers.find(t => t.trigger === '천간합 트리거');
      if (existingTrigger) {
        existingTrigger.historicalOccurrences.push(event.date);
      } else {
        triggers.push({
          trigger: '천간합 트리거',
          triggerType: '천간',
          activatedBy: `${dayMaster}-${pillars.세운천간} 합`,
          resultingEnergy: CHEONGAN_HAP[dayMaster].result,
          historicalOccurrences: [event.date],
          futureOccurrences: calculateFutureStemCombination(dayMaster, 5)
        });
      }
    }

    // 지지 트리거
    if (CHUNG[dayBranch] === pillars.세운지지) {
      const existingTrigger = triggers.find(t => t.trigger === '지지충 트리거');
      if (existingTrigger) {
        existingTrigger.historicalOccurrences.push(event.date);
      } else {
        triggers.push({
          trigger: '지지충 트리거',
          triggerType: '지지',
          activatedBy: `${dayBranch}-${pillars.세운지지} 충`,
          resultingEnergy: '변화와 이동',
          historicalOccurrences: [event.date],
          futureOccurrences: calculateFutureBranchYear(pillars.세운지지, 3)
        });
      }
    }

    // 귀인 트리거
    if (GWIIN[dayMaster]?.includes(pillars.세운지지)) {
      const existingTrigger = triggers.find(t => t.trigger === '귀인 트리거');
      if (existingTrigger) {
        existingTrigger.historicalOccurrences.push(event.date);
      } else {
        triggers.push({
          trigger: '귀인 트리거',
          triggerType: '복합',
          activatedBy: `${dayMaster}의 귀인 ${pillars.세운지지}`,
          resultingEnergy: '도움과 기회',
          historicalOccurrences: [event.date],
          futureOccurrences: calculateFutureBranchYear(pillars.세운지지, 3)
        });
      }
    }
  }

  return triggers;
}

function calculateFutureStemCombination(stem: string, count: number): Date[] {
  const dates: Date[] = [];
  const partner = CHEONGAN_HAP[stem]?.partner;
  if (!partner) return dates;

  const partnerIndex = STEMS.findIndex(s => s.name === partner);
  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year < currentYear + 60 && dates.length < count; year++) {
    const yearStemIndex = (year - 4) % 10;
    if (yearStemIndex === partnerIndex) {
      dates.push(new Date(year, 0, 1));
    }
  }

  return dates;
}

function calculateFutureBranchYear(branch: string, count: number): Date[] {
  const dates: Date[] = [];
  const branchIndex = BRANCHES.findIndex(b => b.name === branch);
  const currentYear = new Date().getFullYear();

  for (let i = 1; i <= count; i++) {
    const year = currentYear + ((branchIndex - ((currentYear - 4) % 12) + 12) % 12) + (i - 1) * 12;
    dates.push(new Date(year, 0, 1));
  }

  return dates;
}

/**
 * 이벤트 타임라인 구축
 */
export function buildEventTimeline(
  events: LifeEvent[],
  saju: SajuResult
): EventTimeline {
  // 각 이벤트 상관관계 분석
  const correlatedEvents = events.map(e => analyzeEventCorrelation(e, saju));

  // 정렬
  correlatedEvents.sort((a, b) => a.event.date.getTime() - b.event.date.getTime());

  // 주요 기간 식별
  const majorPeriods: { start: Date; end: Date; theme: string }[] = [];
  let currentPeriodEvents: EventSajuCorrelation[] = [];

  for (const event of correlatedEvents) {
    if (currentPeriodEvents.length === 0) {
      currentPeriodEvents.push(event);
    } else {
      const lastEvent = currentPeriodEvents[currentPeriodEvents.length - 1];
      const daysDiff = (event.event.date.getTime() - lastEvent.event.date.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 180) { // 6개월 이내면 같은 기간
        currentPeriodEvents.push(event);
      } else {
        // 기간 저장
        if (currentPeriodEvents.length >= 2) {
          majorPeriods.push({
            start: currentPeriodEvents[0].event.date,
            end: currentPeriodEvents[currentPeriodEvents.length - 1].event.date,
            theme: determinePeriodTheme(currentPeriodEvents)
          });
        }
        currentPeriodEvents = [event];
      }
    }
  }

  // 마지막 기간 처리
  if (currentPeriodEvents.length >= 2) {
    majorPeriods.push({
      start: currentPeriodEvents[0].event.date,
      end: currentPeriodEvents[currentPeriodEvents.length - 1].event.date,
      theme: determinePeriodTheme(currentPeriodEvents)
    });
  }

  // 전환점 식별
  const turningPoints = correlatedEvents
    .filter(e => e.event.significance >= 8 || e.event.nature === 'transformative')
    .map(e => e.event.date);

  // 주기적 패턴
  const cyclicalPatterns = recognizePatterns(events, saju);

  return {
    events: correlatedEvents,
    majorPeriods,
    turningPoints,
    cyclicalPatterns
  };
}

function determinePeriodTheme(events: EventSajuCorrelation[]): string {
  const categories = events.map(e => e.event.category);
  const categoryCount: Record<string, number> = {};

  for (const cat of categories) {
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  }

  const dominantCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0][0];

  const natures = events.map(e => e.event.nature);
  const positiveCount = natures.filter(n => n === 'positive').length;
  const negativeCount = natures.filter(n => n === 'negative').length;

  let tone: string;
  if (positiveCount > negativeCount) {
    tone = '성장과 발전의';
  } else if (negativeCount > positiveCount) {
    tone = '도전과 시련의';
  } else {
    tone = '변화와 전환의';
  }

  return `${tone} ${dominantCategory} 기간`;
}

/**
 * 종합 사건 상관관계 분석
 */
export function performComprehensiveEventAnalysis(
  events: LifeEvent[],
  saju: SajuResult,
  futureYears: number = 3
): {
  timeline: EventTimeline;
  triggers: TriggerAnalysis[];
  patterns: PatternRecognition[];
  futureInsight: PredictiveInsight;
  summary: string;
} {
  const timeline = buildEventTimeline(events, saju);
  const triggers = analyzeTriggers(events, saju);
  const patterns = recognizePatterns(events, saju);

  const now = new Date();
  const futureEnd = new Date(now.getFullYear() + futureYears, now.getMonth(), now.getDate());
  const futureInsight = generatePredictiveInsight(saju, now, futureEnd);

  // 요약 생성
  const positiveEvents = events.filter(e => e.nature === 'positive').length;
  const negativeEvents = events.filter(e => e.nature === 'negative').length;
  const totalEvents = events.length;

  let summary = `총 ${totalEvents}개의 인생 사건을 분석했습니다. `;
  summary += `긍정적 사건 ${positiveEvents}건, 도전적 사건 ${negativeEvents}건입니다. `;

  if (triggers.length > 0) {
    summary += `주요 트리거로 ${triggers.map(t => t.trigger).join(', ')}이(가) 발견되었습니다. `;
  }

  if (patterns.length > 0) {
    summary += `${patterns.length}개의 반복 패턴이 인식되었습니다.`;
  }

  return {
    timeline,
    triggers,
    patterns,
    futureInsight,
    summary
  };
}
