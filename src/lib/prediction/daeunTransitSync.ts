// src/lib/prediction/daeunTransitSync.ts
// 대운-트랜짓 동기화 분석 모듈
// 동양 대운과 서양 트랜짓 주기를 교차 분석하여 시너지 시점 발견
// TIER 5: 절기월 + Secondary Progressions + 강화된 동서양 통합

import type { FiveElement } from './timingScore';

// TIER 5: 초정밀 분석 엔진 임포트
import {
  PrecisionEngine,
  getSolarTermForDate,
  calculateSecondaryProgression,
  type SolarTerm,
} from './precisionEngine';

// ============================================================
// 타입 정의
// ============================================================

export interface DaeunInfo {
  startAge: number;
  endAge: number;
  stem: string;
  branch: string;
  element: FiveElement;
  yinYang?: '양' | '음';  // Optional for backward compatibility with test data
}

export interface TransitInfo {
  type: 'jupiterReturn' | 'saturnReturn' | 'uranusSquare' | 'neptuneSquare' | 'plutoTransit' | 'nodeReturn';
  triggerAge: number;
  duration: number; // in years
  intensity: 'high' | 'medium' | 'low';
  theme: string;
}

export interface SyncPoint {
  age: number;
  year: number;
  daeun: DaeunInfo;
  transits: TransitInfo[];
  synergyScore: number;         // 0-100
  synergyType: 'amplify' | 'clash' | 'balance' | 'neutral';
  themes: string[];
  opportunities: string[];
  challenges: string[];
  advice: string;
  confidence: number;           // 0-100

  // TIER 5: 강화된 동서양 통합 분석
  tier5Analysis?: {
    solarTermElement: FiveElement;        // 절기월 오행
    solarTermDaeunAlignment: number;      // 절기-대운 정렬도 0-100
    progressionPhase?: string;            // 2차 진행법 달 위상
    eastWestHarmony: number;              // 동서양 조화도 0-100
    combinedThemes: string[];             // 통합 테마
    preciseTiming: {
      bestMonths: number[];               // 최적 월
      avoidMonths: number[];              // 회피 월
    };
  };
}

export interface LifeSyncAnalysis {
  birthYear: number;
  currentAge: number;
  syncPoints: SyncPoint[];
  majorTransitions: SyncPoint[];
  peakYears: { age: number; year: number; reason: string }[];
  challengeYears: { age: number; year: number; reason: string }[];
  lifeCyclePattern: string;
  overallConfidence: number;

  // TIER 5: 강화된 통합 분석
  tier5Summary?: {
    eastWestHarmonyScore: number;         // 전체 동서양 조화도
    dominantElement: FiveElement;          // 지배적 오행
    criticalYears: number[];               // 결정적 해
    yearByYearSolarTerms: Array<{          // 연도별 절기 정보
      year: number;
      dominantSolarTermElement: FiveElement;
      daeunAlignment: number;
    }>;
    progressionHighlights: string[];       // 진행법 하이라이트
    integrationAdvice: string;             // 통합 조언
  };
}

// ============================================================
// 트랜짓 주기 정의
// ============================================================

const TRANSIT_CYCLES: Record<string, { ages: number[]; duration: number; intensity: 'high' | 'medium' | 'low'; theme: string }> = {
  jupiterReturn: {
    ages: [12, 24, 36, 48, 60, 72, 84],
    duration: 1,
    intensity: 'high',
    theme: '확장과 성장, 새로운 기회',
  },
  saturnReturn: {
    ages: [29, 58, 87],
    duration: 2,
    intensity: 'high',
    theme: '성숙과 책임, 인생 구조화',
  },
  uranusSquare: {
    ages: [21, 42, 63],
    duration: 2,
    intensity: 'high',
    theme: '혁신과 변화, 자유 추구',
  },
  neptuneSquare: {
    ages: [41, 82],
    duration: 2,
    intensity: 'medium',
    theme: '영성과 꿈, 환멸과 재정립',
  },
  chironReturn: {
    ages: [50],
    duration: 2,
    intensity: 'medium',
    theme: '치유와 지혜, 내면 상처 직면',
  },
  nodeReturn: {
    ages: [18, 37, 56, 74],
    duration: 1,
    intensity: 'medium',
    theme: '운명의 전환점, 카르마 정산',
  },
};

// ============================================================
// 오행-행성 대응 매트릭스
// ============================================================

const ELEMENT_PLANET_SYNERGY: Record<FiveElement, Record<string, number>> = {
  '목': {
    jupiterReturn: 30,    // 목성=목 - 강한 상생
    saturnReturn: -10,    // 토성=토 - 목극토로 충돌
    uranusSquare: 20,     // 천왕성=혁신 - 목의 성장과 조화
    neptuneSquare: 15,    // 해왕성=영성 - 수생목으로 지원
    nodeReturn: 10,
  },
  '화': {
    jupiterReturn: 25,    // 목생화
    saturnReturn: -15,    // 화극금, 토성 제약
    uranusSquare: 25,     // 혁신적 열정
    neptuneSquare: -10,   // 수극화
    nodeReturn: 15,
  },
  '토': {
    jupiterReturn: 15,    // 안정적 확장
    saturnReturn: 30,     // 토성=토 - 강한 공명
    uranusSquare: -15,    // 변화에 저항
    neptuneSquare: -20,   // 토극수 충돌
    nodeReturn: 10,
  },
  '금': {
    jupiterReturn: 10,    // 토생금으로 약간 지원
    saturnReturn: 25,     // 구조화와 조화
    uranusSquare: -10,    // 변화에 불편
    neptuneSquare: 10,    // 금생수
    nodeReturn: 15,
  },
  '수': {
    jupiterReturn: 20,    // 금생수
    saturnReturn: 15,     // 안정적 흐름
    uranusSquare: 20,     // 혁신적 지혜
    neptuneSquare: 30,    // 해왕성=수 - 강한 공명
    nodeReturn: 20,
  },
};

// ============================================================
// 대운 전환기 감지
// ============================================================

function isDaeunTransition(age: number, daeunList: DaeunInfo[]): { isTransition: boolean; from?: DaeunInfo; to?: DaeunInfo } {
  for (let i = 0; i < daeunList.length - 1; i++) {
    if (age === daeunList[i].endAge || age === daeunList[i + 1].startAge) {
      return {
        isTransition: true,
        from: daeunList[i],
        to: daeunList[i + 1],
      };
    }
  }
  return { isTransition: false };
}

// ============================================================
// 트랜짓 감지
// ============================================================

function getActiveTransits(age: number): TransitInfo[] {
  const transits: TransitInfo[] = [];

  for (const [type, cycle] of Object.entries(TRANSIT_CYCLES)) {
    for (const triggerAge of cycle.ages) {
      // 트랜짓 영향 범위 (duration 기간 내)
      if (age >= triggerAge - 1 && age <= triggerAge + cycle.duration) {
        transits.push({
          type: type as TransitInfo['type'],
          triggerAge,
          duration: cycle.duration,
          intensity: cycle.intensity,
          theme: cycle.theme,
        });
      }
    }
  }

  return transits;
}

// ============================================================
// 시너지 점수 계산
// ============================================================

function calculateSynergyScore(daeun: DaeunInfo, transits: TransitInfo[]): {
  score: number;
  type: SyncPoint['synergyType'];
  themes: string[];
  opportunities: string[];
  challenges: string[];
} {
  let totalScore = 50; // 기본 점수
  const themes: string[] = [];
  const opportunities: string[] = [];
  const challenges: string[] = [];

  for (const transit of transits) {
    const elementSynergy = ELEMENT_PLANET_SYNERGY[daeun.element][transit.type] || 0;
    totalScore += elementSynergy;

    // 테마 추가
    themes.push(transit.theme);

    if (elementSynergy > 20) {
      opportunities.push(`${transit.type} 주기와 ${daeun.element} 대운의 상승 시너지`);
    } else if (elementSynergy < -10) {
      challenges.push(`${transit.type} 주기와 ${daeun.element} 대운의 긴장 관계`);
    }
  }

  // 점수 정규화
  totalScore = Math.max(0, Math.min(100, totalScore));

  // 시너지 유형 결정
  let synergyType: SyncPoint['synergyType'];
  if (totalScore >= 70) {
    synergyType = 'amplify';
    opportunities.push('강력한 상승 에너지 - 적극적 행동 권장');
  } else if (totalScore <= 30) {
    synergyType = 'clash';
    challenges.push('도전적 에너지 - 신중한 접근 필요');
  } else if (totalScore >= 45 && totalScore <= 55) {
    synergyType = 'balance';
  } else {
    synergyType = 'neutral';
  }

  return { score: totalScore, type: synergyType, themes, opportunities, challenges };
}

// ============================================================
// 조언 생성
// ============================================================

function generateAdvice(syncPoint: Omit<SyncPoint, 'advice'>): string {
  const { synergyType, daeun, transits } = syncPoint;

  const transitNames = transits.map(t => t.type).join(', ');

  switch (synergyType) {
    case 'amplify':
      return `${daeun.element} 대운과 ${transitNames}의 상승 시너지 시기입니다. ` +
        `새로운 도전, 중요한 결정, 인생의 전환점을 만들기 좋은 때입니다. ` +
        `에너지가 높으니 목표를 향해 적극적으로 나아가세요.`;

    case 'clash':
      return `${daeun.element} 대운과 ${transitNames}이 긴장 관계입니다. ` +
        `내면의 갈등이나 외부 도전이 있을 수 있습니다. ` +
        `무리하지 말고, 자기 성찰과 휴식에 집중하세요. 위기는 성장의 기회입니다.`;

    case 'balance':
      return `${daeun.element} 대운과 ${transitNames}이 균형을 이룹니다. ` +
        `안정적인 시기이나 정체될 수 있습니다. ` +
        `작은 변화를 시도하거나 기존 계획을 점검하기 좋은 때입니다.`;

    default:
      return `${daeun.element} 대운과 ${transitNames} 시기입니다. ` +
        `특별한 극단 없이 흘러가는 시기이며, 일상의 루틴을 유지하며 준비하세요.`;
  }
}

// ============================================================
// 메인 분석 함수
// ============================================================

export function analyzeDaeunTransitSync(
  daeunList: DaeunInfo[],
  birthYear: number,
  currentAge: number,
  options: { enableTier5?: boolean; birthDate?: Date } = {}
): LifeSyncAnalysis {
  const { enableTier5 = true, birthDate } = options;

  const syncPoints: SyncPoint[] = [];
  const majorTransitions: SyncPoint[] = [];
  const peakYears: LifeSyncAnalysis['peakYears'] = [];
  const challengeYears: LifeSyncAnalysis['challengeYears'] = [];

  // TIER 5: 연도별 절기 정보 수집
  const yearByYearSolarTerms: Array<{
    year: number;
    dominantSolarTermElement: FiveElement;
    daeunAlignment: number;
  }> = [];

  // 현재부터 향후 20년 분석
  const startAge = Math.max(0, currentAge - 5);
  const endAge = currentAge + 20;

  for (let age = startAge; age <= endAge; age++) {
    // 해당 나이의 대운 찾기
    const daeun = daeunList.find(d => age >= d.startAge && age <= d.endAge);
    if (!daeun) continue;

    // 활성 트랜짓 감지
    const transits = getActiveTransits(age);

    // 트랜짓이 있거나 대운 전환기인 경우만 분석
    const transition = isDaeunTransition(age, daeunList);
    if (transits.length === 0 && !transition.isTransition) continue;

    // 시너지 계산
    const synergy = calculateSynergyScore(daeun, transits);

    // 신뢰도 계산 (트랜짓 수, 대운 전환 여부에 따라)
    let confidence = 60;
    confidence += transits.length * 10;
    if (transition.isTransition) confidence += 15;
    confidence = Math.min(100, confidence);

    const year = birthYear + age;

    // === TIER 5: 강화된 동서양 통합 분석 ===
    let tier5Analysis: SyncPoint['tier5Analysis'] | undefined;

    if (enableTier5) {
      const yearMidDate = new Date(year, 5, 15); // 6월 중순 기준
      const solarTerm = getSolarTermForDate(yearMidDate);

      // 절기-대운 정렬도 계산
      const solarTermDaeunAlignment = calculateElementAlignment(solarTerm.element, daeun.element);

      // 2차 진행법 분석 (birthDate가 있는 경우)
      let progressionPhase: string | undefined;
      if (birthDate) {
        const progression = calculateSecondaryProgression(birthDate, yearMidDate);
        progressionPhase = progression.moon.phase;
      }

      // 동서양 조화도 계산
      const eastWestHarmony = calculateEastWestHarmony(daeun, transits, solarTerm);

      // 통합 테마 생성
      const combinedThemes = generateCombinedThemes(daeun, transits, solarTerm, progressionPhase);

      // 최적/회피 월 계산
      const preciseTiming = calculatePreciseTiming(daeun, year);

      tier5Analysis = {
        solarTermElement: solarTerm.element,
        solarTermDaeunAlignment,
        progressionPhase,
        eastWestHarmony,
        combinedThemes,
        preciseTiming,
      };

      // 연도별 절기 정보 기록
      yearByYearSolarTerms.push({
        year,
        dominantSolarTermElement: solarTerm.element,
        daeunAlignment: solarTermDaeunAlignment,
      });

      // TIER 5 기반 신뢰도 보정
      if (eastWestHarmony >= 70) confidence += 10;
      confidence = Math.min(100, confidence);
    }

    const syncPointBase = {
      age,
      year,
      daeun,
      transits,
      synergyScore: synergy.score,
      synergyType: synergy.type,
      themes: synergy.themes,
      opportunities: synergy.opportunities,
      challenges: synergy.challenges,
      confidence,
    };

    const syncPoint: SyncPoint = {
      ...syncPointBase,
      advice: generateAdvice(syncPointBase),
      tier5Analysis,
    };

    syncPoints.push(syncPoint);

    // 주요 전환점 분류
    if (transition.isTransition || transits.some(t => t.intensity === 'high')) {
      majorTransitions.push(syncPoint);
    }

    // 피크/챌린지 연도 분류
    if (synergy.score >= 75) {
      peakYears.push({ age, year, reason: `${synergy.themes.slice(0, 2).join(', ')}` });
    } else if (synergy.score <= 35) {
      challengeYears.push({ age, year, reason: `${synergy.challenges.slice(0, 2).join(', ')}` });
    }
  }

  // 인생 패턴 분석
  const avgScore = syncPoints.reduce((sum, p) => sum + p.synergyScore, 0) / (syncPoints.length || 1);
  let lifeCyclePattern: string;
  if (avgScore >= 60) {
    lifeCyclePattern = '전반적으로 상승하는 운세 패턴';
  } else if (avgScore <= 40) {
    lifeCyclePattern = '도전과 성장을 통해 발전하는 패턴';
  } else {
    lifeCyclePattern = '균형잡힌 안정적인 운세 패턴';
  }

  // 종합 신뢰도
  const overallConfidence = Math.round(
    syncPoints.reduce((sum, p) => sum + p.confidence, 0) / (syncPoints.length || 1)
  );

  // === TIER 5: 강화된 통합 요약 ===
  let tier5Summary: LifeSyncAnalysis['tier5Summary'] | undefined;

  if (enableTier5 && syncPoints.length > 0) {
    // 전체 동서양 조화도
    const eastWestHarmonyScore = Math.round(
      syncPoints
        .filter(p => p.tier5Analysis)
        .reduce((sum, p) => sum + (p.tier5Analysis?.eastWestHarmony || 50), 0) /
        syncPoints.filter(p => p.tier5Analysis).length || 1
    );

    // 지배적 오행 계산
    const elementCounts: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
    for (const point of syncPoints) {
      elementCounts[point.daeun.element]++;
    }
    const dominantElement = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0][0] as FiveElement;

    // 결정적 해 (시너지 + TIER5 분석이 모두 높은 해)
    const criticalYears = syncPoints
      .filter(p => p.synergyScore >= 70 && (p.tier5Analysis?.eastWestHarmony || 0) >= 65)
      .map(p => p.year)
      .slice(0, 5);

    // 진행법 하이라이트
    const progressionHighlights: string[] = [];
    for (const point of syncPoints.filter(p => p.tier5Analysis?.progressionPhase)) {
      if (point.tier5Analysis?.progressionPhase === 'Full') {
        progressionHighlights.push(`${point.year}년: 진행 보름달 - 결실의 해`);
      } else if (point.tier5Analysis?.progressionPhase === 'New') {
        progressionHighlights.push(`${point.year}년: 진행 삭월 - 새로운 시작`);
      }
    }

    // 통합 조언
    const integrationAdvice = generateIntegrationAdvice(
      eastWestHarmonyScore,
      dominantElement,
      lifeCyclePattern,
      criticalYears
    );

    tier5Summary = {
      eastWestHarmonyScore,
      dominantElement,
      criticalYears,
      yearByYearSolarTerms,
      progressionHighlights: progressionHighlights.slice(0, 5),
      integrationAdvice,
    };
  }

  return {
    birthYear,
    currentAge,
    syncPoints,
    majorTransitions,
    peakYears,
    challengeYears,
    lifeCyclePattern,
    overallConfidence,
    tier5Summary,
  };
}

// ============================================================
// TIER 5: 보조 함수들
// ============================================================

// 오행 정렬도 계산
function calculateElementAlignment(element1: FiveElement, element2: FiveElement): number {
  if (element1 === element2) return 100;

  const supportMatrix: Record<FiveElement, FiveElement> = {
    '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
  };
  const clashMatrix: Record<FiveElement, FiveElement> = {
    '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
  };

  if (supportMatrix[element1] === element2) return 80; // 상생
  if (supportMatrix[element2] === element1) return 70; // 피상생
  if (clashMatrix[element1] === element2) return 30;   // 상극
  if (clashMatrix[element2] === element1) return 40;   // 피상극

  return 50; // 중립
}

// 동서양 조화도 계산
function calculateEastWestHarmony(
  daeun: DaeunInfo,
  transits: TransitInfo[],
  solarTerm: SolarTerm
): number {
  let harmony = 50;

  // 대운-절기 오행 조화
  harmony += (calculateElementAlignment(daeun.element, solarTerm.element) - 50) * 0.3;

  // 트랜짓-대운 조화
  for (const transit of transits) {
    const transitElement = getTransitElement(transit.type);
    harmony += (calculateElementAlignment(daeun.element, transitElement) - 50) * 0.2;
  }

  // 음양 조화
  if ((daeun.yinYang === '양' && solarTerm.energy === 'yang') ||
      (daeun.yinYang === '음' && solarTerm.energy === 'yin')) {
    harmony += 10;
  }

  return Math.max(0, Math.min(100, Math.round(harmony)));
}

// 트랜짓별 오행 매핑
function getTransitElement(transitType: string): FiveElement {
  const mapping: Record<string, FiveElement> = {
    jupiterReturn: '목',
    saturnReturn: '토',
    uranusSquare: '금',
    neptuneSquare: '수',
    chironReturn: '화',
    nodeReturn: '목',
    plutoTransit: '수',
  };
  return mapping[transitType] || '토';
}

// 통합 테마 생성
function generateCombinedThemes(
  daeun: DaeunInfo,
  transits: TransitInfo[],
  solarTerm: SolarTerm,
  progressionPhase?: string
): string[] {
  const themes: string[] = [];

  // 대운 테마
  const daeunThemes: Record<FiveElement, string> = {
    '목': '성장과 발전', '화': '열정과 표현', '토': '안정과 축적',
    '금': '결실과 정리', '수': '지혜와 적응',
  };
  themes.push(`대운: ${daeunThemes[daeun.element]}`);

  // 절기 테마
  themes.push(`절기: ${solarTerm.nameKo}의 ${solarTerm.element} 에너지`);

  // 트랜짓 테마
  for (const transit of transits.slice(0, 2)) {
    themes.push(`트랜짓: ${transit.theme}`);
  }

  // 진행법 테마
  if (progressionPhase) {
    const phaseThemes: Record<string, string> = {
      'New': '새로운 시작과 잉태', 'Crescent': '도전과 성장',
      'First Quarter': '행동과 결단', 'Gibbous': '완성을 향한 노력',
      'Full': '결실과 깨달음', 'Disseminating': '나눔과 전파',
      'Last Quarter': '재평가와 전환', 'Balsamic': '정리와 준비',
    };
    if (phaseThemes[progressionPhase]) {
      themes.push(`진행: ${phaseThemes[progressionPhase]}`);
    }
  }

  return themes;
}

// 정밀 타이밍 계산
function calculatePreciseTiming(daeun: DaeunInfo, year: number): {
  bestMonths: number[];
  avoidMonths: number[];
} {
  const bestMonths: number[] = [];
  const avoidMonths: number[] = [];

  // 대운 오행에 따른 최적/회피 월 (절기 기준)
  const elementBestMonths: Record<FiveElement, number[]> = {
    '목': [2, 3, 4],       // 봄
    '화': [5, 6, 7],       // 여름
    '토': [1, 4, 7, 10],   // 환절기
    '금': [8, 9, 10],      // 가을
    '수': [11, 12, 1],     // 겨울
  };

  const elementAvoidMonths: Record<FiveElement, number[]> = {
    '목': [8, 9],          // 금극목 시기
    '화': [11, 12],        // 수극화 시기
    '토': [2, 3],          // 목극토 시기
    '금': [5, 6],          // 화극금 시기
    '수': [4, 5],          // 토극수 시기
  };

  bestMonths.push(...(elementBestMonths[daeun.element] || []));
  avoidMonths.push(...(elementAvoidMonths[daeun.element] || []));

  return { bestMonths, avoidMonths };
}

// 통합 조언 생성
function generateIntegrationAdvice(
  harmonyScore: number,
  dominantElement: FiveElement,
  pattern: string,
  criticalYears: number[]
): string {
  let advice = '';

  if (harmonyScore >= 70) {
    advice += '동양 사주와 서양 점성술이 높은 조화를 이루고 있습니다. ';
    advice += '에너지 흐름이 일관되어 계획대로 진행하기 좋습니다. ';
  } else if (harmonyScore <= 40) {
    advice += '동서양 에너지 간 긴장이 있습니다. ';
    advice += '다양한 관점에서 상황을 바라보고 유연하게 대응하세요. ';
  } else {
    advice += '동서양 분석이 균형을 이루고 있습니다. ';
    advice += '상황에 따라 적절히 활용하세요. ';
  }

  advice += `지배적 오행 ${dominantElement}을 고려한 접근이 효과적입니다. `;

  if (criticalYears.length > 0) {
    advice += `특히 ${criticalYears.slice(0, 2).join('년, ')}년이 중요한 해입니다.`;
  }

  return advice;
}

// ============================================================
// 프롬프트용 컨텍스트 생성
// ============================================================

export function generateDaeunTransitPromptContext(
  analysis: LifeSyncAnalysis,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== 대운-트랜짓 동기화 분석 ===`);
    lines.push(`인생 패턴: ${analysis.lifeCyclePattern}`);
    lines.push(`종합 신뢰도: ${analysis.overallConfidence}%`);
    lines.push('');

    lines.push('--- 주요 전환점 ---');
    for (const point of analysis.majorTransitions.slice(0, 5)) {
      lines.push(
        `${point.age}세 (${point.year}년): ${point.synergyType} | ` +
        `점수 ${point.synergyScore} | 신뢰도 ${point.confidence}%`
      );
      lines.push(`  테마: ${point.themes.slice(0, 2).join(', ')}`);
      lines.push(`  조언: ${point.advice.slice(0, 80)}...`);
    }

    if (analysis.peakYears.length > 0) {
      lines.push('');
      lines.push(`최고의 시기: ${analysis.peakYears.slice(0, 3).map(p => `${p.age}세(${p.year}년)`).join(', ')}`);
    }

    if (analysis.challengeYears.length > 0) {
      lines.push(`도전의 시기: ${analysis.challengeYears.slice(0, 3).map(p => `${p.age}세(${p.year}년)`).join(', ')}`);
    }
  } else {
    lines.push(`=== Daeun-Transit Synchronization ===`);
    lines.push(`Life Pattern: ${analysis.lifeCyclePattern}`);
    lines.push(`Confidence: ${analysis.overallConfidence}%`);
    lines.push('');

    lines.push('--- Major Transition Points ---');
    for (const point of analysis.majorTransitions.slice(0, 5)) {
      lines.push(
        `Age ${point.age} (${point.year}): ${point.synergyType} | ` +
        `Score ${point.synergyScore} | Confidence ${point.confidence}%`
      );
    }
  }

  return lines.join('\n');
}

// ============================================================
// 대운 리스트 변환 헬퍼
// ============================================================

export function convertSajuDaeunToInfo(daeunList: unknown[]): DaeunInfo[] {
  const stemToElement: Record<string, FiveElement> = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
  };

  const stemToYinYang: Record<string, '양' | '음'> = {
    '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
    '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음',
  };

  return daeunList.map(d => ({
    startAge: d.startAge ?? d.age ?? 0,
    endAge: (d.startAge ?? d.age ?? 0) + 9,
    stem: d.stem ?? d.heavenlyStem ?? '甲',
    branch: d.branch ?? d.earthlyBranch ?? '子',
    element: stemToElement[d.stem ?? d.heavenlyStem] ?? '토',
    yinYang: stemToYinYang[d.stem ?? d.heavenlyStem] ?? '양',
  }));
}
