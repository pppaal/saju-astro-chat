/**
 * Cross-System Analysis: Saju × Astrology Fusion
 * 사주와 점성학의 교차 분석으로 더 정확하고 풍부한 궁합 해석
 */

// ============================================================
// Types
// ============================================================

export interface SajuProfile {
  dayMaster: {
    name: string;
    element: string;
  };
  pillars: {
    year: { stem: string; branch: string };
    month: { stem: string; branch: string };
    day: { stem: string; branch: string };
    time: { stem: string; branch: string };
  };
  elements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
}

export interface AstroProfile {
  sun?: { sign: string; element: string };
  moon?: { sign: string; element: string };
  venus?: { sign: string; element: string };
  mars?: { sign: string; element: string };
  mercury?: { sign: string; element: string };
  ascendant?: { sign: string; element: string };
  jupiter?: { sign: string; element: string };
  saturn?: { sign: string; element: string };
}

export interface CrossAnalysisResult {
  dayMasterSunAnalysis: DayMasterSunAnalysis;
  monthBranchMoonAnalysis: MonthBranchMoonAnalysis;
  elementFusionAnalysis: ElementFusionAnalysis;
  pillarPlanetCorrespondence: PillarPlanetCorrespondence;
  crossSystemScore: number;
  fusionInsights: string[];
}

// ============================================================
// Element Mapping (점성술 원소 → 오행)
// ============================================================

// 점성술 4원소를 오행으로 매핑
const astroToSajuElement: Record<string, string[]> = {
  fire: ['fire'],           // 불 → 화(火)
  earth: ['earth'],         // 흙 → 토(土)
  air: ['metal', 'wood'],   // 공기 → 금(金) + 목(木) - 바람, 움직임
  water: ['water'],         // 물 → 수(水)
};

// 오행을 점성술 원소로 매핑
const sajuToAstroElement: Record<string, string[]> = {
  wood: ['air', 'earth'],   // 목(木) → 성장, 공기/흙
  fire: ['fire'],           // 화(火) → 불
  earth: ['earth'],         // 토(土) → 흙
  metal: ['air'],           // 금(金) → 공기 (정제, 명확함)
  water: ['water'],         // 수(水) → 물
};

// 오행 상생 관계
const generates: Record<string, string> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};

// 오행 상극 관계
const controls: Record<string, string> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
};

// ============================================================
// 일간 × 태양 별자리 분석
// ============================================================

export interface DayMasterSunAnalysis {
  person1: {
    dayMaster: string;
    dayMasterElement: string;
    sunSign: string;
    sunElement: string;
    harmony: 'excellent' | 'good' | 'neutral' | 'challenging';
    description: string;
  };
  person2: {
    dayMaster: string;
    dayMasterElement: string;
    sunSign: string;
    sunElement: string;
    harmony: 'excellent' | 'good' | 'neutral' | 'challenging';
    description: string;
  };
  crossHarmony: {
    p1DayMasterToP2Sun: string;
    p2DayMasterToP1Sun: string;
    overallScore: number;
    interpretation: string;
  };
}

export function analyzeDayMasterVsSun(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstroProfile,
  p2Astro: AstroProfile
): DayMasterSunAnalysis {
  const p1DM = normalizeElement(p1Saju.dayMaster.element);
  const p2DM = normalizeElement(p2Saju.dayMaster.element);
  const p1Sun = p1Astro.sun?.element || 'fire';
  const p2Sun = p2Astro.sun?.element || 'fire';
  const p1SunSign = p1Astro.sun?.sign || 'aries';
  const p2SunSign = p2Astro.sun?.sign || 'aries';

  // 개인별 일간-태양 조화
  const p1Internal = analyzeElementHarmony(p1DM, astroElementToSaju(p1Sun));
  const p2Internal = analyzeElementHarmony(p2DM, astroElementToSaju(p2Sun));

  // 교차 분석: P1 일간 vs P2 태양
  const p1ToP2 = analyzeElementHarmony(p1DM, astroElementToSaju(p2Sun));
  const p2ToP1 = analyzeElementHarmony(p2DM, astroElementToSaju(p1Sun));

  const crossScore = (p1ToP2.score + p2ToP1.score) / 2;

  let crossInterpretation = '';
  if (crossScore >= 80) {
    crossInterpretation = `🌟 동서양이 인정한 천생연분! 사주의 ${getElementKorean(p1DM)} 기운과 ${getSignKorean(p2SunSign)} 별자리가 완벽하게 맞아요. 동양 철학과 서양 점성술 모두 "찰떡궁합!"이라고 말하고 있어요!`;
  } else if (crossScore >= 60) {
    crossInterpretation = `✨ 사주와 별자리가 서로 끄덕이고 있어요! 동서양 모두에서 좋은 흐름이 보여요. 함께할수록 더 좋아지는 관계예요.`;
  } else if (crossScore >= 40) {
    crossInterpretation = `💫 동양과 서양이 살짝 다른 이야기를 해요. 하지만 다양한 시각으로 서로를 이해할 수 있다는 뜻이에요!`;
  } else {
    crossInterpretation = `🌙 색다른 조합이에요! 사주와 별자리가 다른 방향을 가리키지만, 이 차이가 서로에게 새로운 세계를 열어줄 수 있어요.`;
  }

  return {
    person1: {
      dayMaster: p1Saju.dayMaster.name,
      dayMasterElement: p1DM,
      sunSign: p1SunSign,
      sunElement: p1Sun,
      harmony: p1Internal.harmony,
      description: `${getElementKorean(p1DM)} 일간 + ${getSignKorean(p1SunSign)}: ${p1Internal.description}`,
    },
    person2: {
      dayMaster: p2Saju.dayMaster.name,
      dayMasterElement: p2DM,
      sunSign: p2SunSign,
      sunElement: p2Sun,
      harmony: p2Internal.harmony,
      description: `${getElementKorean(p2DM)} 일간 + ${getSignKorean(p2SunSign)}: ${p2Internal.description}`,
    },
    crossHarmony: {
      p1DayMasterToP2Sun: p1ToP2.description,
      p2DayMasterToP1Sun: p2ToP1.description,
      overallScore: crossScore,
      interpretation: crossInterpretation,
    },
  };
}

// ============================================================
// 월지 × 달 별자리 분석
// ============================================================

export interface MonthBranchMoonAnalysis {
  person1MonthBranch: string;
  person1MoonSign: string;
  person2MonthBranch: string;
  person2MoonSign: string;
  emotionalResonance: number;
  interpretation: string[];
}

export function analyzeMonthBranchVsMoon(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstroProfile,
  p2Astro: AstroProfile
): MonthBranchMoonAnalysis {
  const p1MonthBranch = p1Saju.pillars.month.branch;
  const p2MonthBranch = p2Saju.pillars.month.branch;
  const p1MoonSign = p1Astro.moon?.sign || 'cancer';
  const p2MoonSign = p2Astro.moon?.sign || 'cancer';
  const p1MoonElement = p1Astro.moon?.element || 'water';
  const p2MoonElement = p2Astro.moon?.element || 'water';

  // 지지의 오행
  const branchElements: Record<string, string> = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
    '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
    '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water',
  };

  const p1MonthElement = branchElements[p1MonthBranch] || 'earth';
  const p2MonthElement = branchElements[p2MonthBranch] || 'earth';

  const interpretation: string[] = [];
  let resonance = 50;

  // P1 월지 vs P2 달
  const p1MonthP2Moon = analyzeElementHarmony(p1MonthElement, astroElementToSaju(p2MoonElement));
  // P2 월지 vs P1 달
  const p2MonthP1Moon = analyzeElementHarmony(p2MonthElement, astroElementToSaju(p1MoonElement));

  resonance = (p1MonthP2Moon.score + p2MonthP1Moon.score) / 2;

  if (resonance >= 75) {
    interpretation.push(`🌙💕 감정이 척척 통해요! 말 안 해도 서로 마음을 읽을 수 있는 '텔레파시 커플'이에요.`);
    interpretation.push(`✨ 사주의 계절 에너지와 달 별자리가 완벽하게 맞아떨어져요.`);
  } else if (resonance >= 55) {
    interpretation.push(`🌙 감정 파장이 비슷해요! 서로의 마음을 이해하려 노력하는 관계예요.`);
    interpretation.push(`💫 함께하면서 점점 더 깊이 공감하게 될 거예요.`);
  } else {
    interpretation.push(`🌙 감정 표현 방식이 달라요. 서로 다른 언어를 쓰는 느낌이에요.`);
    interpretation.push(`💬 "나는 지금 이런 기분이야"를 더 자주 말해주면 좋아요!`);
  }

  return {
    person1MonthBranch: p1MonthBranch,
    person1MoonSign: p1MoonSign,
    person2MonthBranch: p2MonthBranch,
    person2MoonSign: p2MoonSign,
    emotionalResonance: resonance,
    interpretation,
  };
}

// ============================================================
// 오행 분포 × 행성 원소 분포 분석
// ============================================================

export interface ElementFusionAnalysis {
  person1: {
    sajuDominant: string[];
    sajuWeak: string[];
    astroDominant: string[];
    astroWeak: string[];
  };
  person2: {
    sajuDominant: string[];
    sajuWeak: string[];
    astroDominant: string[];
    astroWeak: string[];
  };
  mutualCompletion: {
    p1NeedsFromP2: string[];
    p2NeedsFromP1: string[];
    completionScore: number;
  };
  interpretation: string[];
}

export function analyzeElementFusion(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstroProfile,
  p2Astro: AstroProfile
): ElementFusionAnalysis {
  // 사주 오행 분석
  const p1SajuDominant = getDominantElements(p1Saju.elements);
  const p1SajuWeak = getWeakElements(p1Saju.elements);
  const p2SajuDominant = getDominantElements(p2Saju.elements);
  const p2SajuWeak = getWeakElements(p2Saju.elements);

  // 점성술 원소 분석
  const p1AstroElements = countAstroElements(p1Astro);
  const p2AstroElements = countAstroElements(p2Astro);
  const p1AstroDominant = getDominantAstroElements(p1AstroElements);
  const p1AstroWeak = getWeakAstroElements(p1AstroElements);
  const p2AstroDominant = getDominantAstroElements(p2AstroElements);
  const p2AstroWeak = getWeakAstroElements(p2AstroElements);

  // 상호 보완 분석
  const p1Needs: string[] = [];
  const p2Needs: string[] = [];

  // P1이 부족한 것을 P2가 가지고 있는지 (사주 + 점성 통합)
  for (const weak of p1SajuWeak) {
    if (p2SajuDominant.includes(weak)) {
      p1Needs.push(`${getElementKorean(weak)}(사주)`);
    }
    // 점성술 원소로도 체크
    const astroEquiv = sajuToAstroElement[weak];
    if (astroEquiv?.some(ae => p2AstroDominant.includes(ae))) {
      p1Needs.push(`${getElementKorean(weak)}(점성)`);
    }
  }

  for (const weak of p2SajuWeak) {
    if (p1SajuDominant.includes(weak)) {
      p2Needs.push(`${getElementKorean(weak)}(사주)`);
    }
    const astroEquiv = sajuToAstroElement[weak];
    if (astroEquiv?.some(ae => p1AstroDominant.includes(ae))) {
      p2Needs.push(`${getElementKorean(weak)}(점성)`);
    }
  }

  const completionScore = Math.min(100, (p1Needs.length + p2Needs.length) * 15 + 40);

  const interpretation: string[] = [];

  if (completionScore >= 80) {
    interpretation.push(`🧩 완벽한 퍼즐! 서로에게 부족한 걸 채워주는 관계예요.`);
    interpretation.push(`🎯 동양 철학과 서양 점성술 모두 "천생연분!"이라고 말해요.`);
  } else if (completionScore >= 60) {
    interpretation.push(`✨ 서로를 보완해주는 부분이 있어요!`);
    if (p1Needs.length > 0 || p2Needs.length > 0) {
      interpretation.push(`💫 함께 있으면 서로의 약점이 강점으로 바뀌어요.`);
    }
  } else {
    interpretation.push(`🌈 각자 독립적인 에너지를 가지고 있어요!`);
    interpretation.push(`💪 서로의 독립성을 존중하는 성숙한 관계가 될 수 있어요.`);
  }

  return {
    person1: {
      sajuDominant: p1SajuDominant,
      sajuWeak: p1SajuWeak,
      astroDominant: p1AstroDominant,
      astroWeak: p1AstroWeak,
    },
    person2: {
      sajuDominant: p2SajuDominant,
      sajuWeak: p2SajuWeak,
      astroDominant: p2AstroDominant,
      astroWeak: p2AstroWeak,
    },
    mutualCompletion: {
      p1NeedsFromP2: p1Needs,
      p2NeedsFromP1: p2Needs,
      completionScore,
    },
    interpretation,
  };
}

// ============================================================
// 기둥별 행성 대응 분석
// ============================================================

export interface PillarPlanetCorrespondence {
  yearPillarJupiter: { harmony: number; description: string };   // 년주 ↔ 목성 (확장, 행운)
  monthPillarMoon: { harmony: number; description: string };     // 월주 ↔ 달 (감정, 어머니)
  dayPillarSun: { harmony: number; description: string };        // 일주 ↔ 태양 (자아, 본질)
  timePillarMercury: { harmony: number; description: string };   // 시주 ↔ 수성 (소통, 자녀)
  venusRelationship: { harmony: number; description: string };   // 금성 (연애, 미)
  marsEnergy: { harmony: number; description: string };          // 화성 (열정, 행동)
  overallCorrespondence: number;
  fusionReading: string;
}

export function analyzePillarPlanetCorrespondence(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstroProfile,
  p2Astro: AstroProfile
): PillarPlanetCorrespondence {
  // 년주 ↔ 목성 (사회적 확장, 철학)
  const yearJupiter = analyzeCorrespondence(
    p1Saju.pillars.year, p2Saju.pillars.year,
    p1Astro.jupiter, p2Astro.jupiter,
    '년주', '목성', '사회적 비전과 성장'
  );

  // 월주 ↔ 달 (가정, 감정)
  const monthMoon = analyzeCorrespondence(
    p1Saju.pillars.month, p2Saju.pillars.month,
    p1Astro.moon, p2Astro.moon,
    '월주', '달', '감정과 가정생활'
  );

  // 일주 ↔ 태양 (본질, 자아)
  const daySun = analyzeCorrespondence(
    p1Saju.pillars.day, p2Saju.pillars.day,
    p1Astro.sun, p2Astro.sun,
    '일주', '태양', '본질적 자아'
  );

  // 시주 ↔ 수성 (소통, 생각)
  const timeMercury = analyzeCorrespondence(
    p1Saju.pillars.time, p2Saju.pillars.time,
    p1Astro.mercury, p2Astro.mercury,
    '시주', '수성', '소통과 미래'
  );

  // 금성 분석 (연애 궁합 특화)
  const venusAnalysis = analyzeVenusCompatibility(p1Saju, p2Saju, p1Astro, p2Astro);

  // 화성 분석 (열정, 갈등)
  const marsAnalysis = analyzeMarsCompatibility(p1Saju, p2Saju, p1Astro, p2Astro);

  const overall = Math.round(
    (yearJupiter.harmony + monthMoon.harmony + daySun.harmony +
     timeMercury.harmony + venusAnalysis.harmony + marsAnalysis.harmony) / 6
  );

  let fusionReading = '';
  if (overall >= 75) {
    fusionReading = `🌌 사주와 별자리가 오케스트라처럼 하모니를 이루고 있어요! 동서양 모두 두 분의 만남을 축복해요.`;
  } else if (overall >= 55) {
    fusionReading = `✨ 대체로 좋은 흐름이에요! 일부는 완벽하고, 일부는 맞춰가면 되는 관계예요.`;
  } else {
    fusionReading = `🌠 서로 다른 매력을 가진 조합이에요! 다양한 관점으로 서로를 이해해보세요.`;
  }

  return {
    yearPillarJupiter: yearJupiter,
    monthPillarMoon: monthMoon,
    dayPillarSun: daySun,
    timePillarMercury: timeMercury,
    venusRelationship: venusAnalysis,
    marsEnergy: marsAnalysis,
    overallCorrespondence: overall,
    fusionReading,
  };
}

// ============================================================
// 종합 교차 분석
// ============================================================

export function performCrossSystemAnalysis(
  p1Saju: SajuProfile | null,
  p2Saju: SajuProfile | null,
  p1Astro: AstroProfile | null,
  p2Astro: AstroProfile | null
): CrossAnalysisResult | null {
  if (!p1Saju || !p2Saju || !p1Astro || !p2Astro) {
    return null;
  }

  const dayMasterSun = analyzeDayMasterVsSun(p1Saju, p2Saju, p1Astro, p2Astro);
  const monthBranchMoon = analyzeMonthBranchVsMoon(p1Saju, p2Saju, p1Astro, p2Astro);
  const elementFusion = analyzeElementFusion(p1Saju, p2Saju, p1Astro, p2Astro);
  const pillarPlanet = analyzePillarPlanetCorrespondence(p1Saju, p2Saju, p1Astro, p2Astro);

  const crossScore = Math.round(
    dayMasterSun.crossHarmony.overallScore * 0.3 +
    monthBranchMoon.emotionalResonance * 0.25 +
    elementFusion.mutualCompletion.completionScore * 0.25 +
    pillarPlanet.overallCorrespondence * 0.2
  );

  const fusionInsights: string[] = [
    dayMasterSun.crossHarmony.interpretation,
    ...monthBranchMoon.interpretation.slice(0, 1),
    ...elementFusion.interpretation.slice(0, 1),
    pillarPlanet.fusionReading,
  ];

  return {
    dayMasterSunAnalysis: dayMasterSun,
    monthBranchMoonAnalysis: monthBranchMoon,
    elementFusionAnalysis: elementFusion,
    pillarPlanetCorrespondence: pillarPlanet,
    crossSystemScore: crossScore,
    fusionInsights,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function normalizeElement(el: string): string {
  const map: Record<string, string> = {
    '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water',
  };
  return map[el] ?? el;
}

function getElementKorean(el: string): string {
  const map: Record<string, string> = {
    wood: '나무', fire: '불', earth: '흙', metal: '금속', water: '물',
  };
  return map[el] || el;
}

function getAstroElementKorean(el: string): string {
  const map: Record<string, string> = {
    fire: '불', earth: '흙', air: '바람', water: '물',
  };
  return map[el] || el;
}

function getSignKorean(sign: string): string {
  const map: Record<string, string> = {
    aries: '양자리', taurus: '황소자리', gemini: '쌍둥이자리', cancer: '게자리',
    leo: '사자자리', virgo: '처녀자리', libra: '천칭자리', scorpio: '전갈자리',
    sagittarius: '사수자리', capricorn: '염소자리', aquarius: '물병자리', pisces: '물고기자리',
  };
  return map[sign] || sign;
}

function astroElementToSaju(astroEl: string): string {
  const map: Record<string, string> = {
    fire: 'fire',
    earth: 'earth',
    air: 'metal',  // 주된 매핑
    water: 'water',
  };
  return map[astroEl] || 'earth';
}

function analyzeElementHarmony(el1: string, el2: string): {
  harmony: 'excellent' | 'good' | 'neutral' | 'challenging';
  score: number;
  description: string;
} {
  if (el1 === el2) {
    return { harmony: 'good', score: 70, description: '같은 원소로 자연스러운 이해' };
  }
  if (generates[el1] === el2) {
    return { harmony: 'excellent', score: 90, description: '상생 관계로 서로를 키워줌' };
  }
  if (generates[el2] === el1) {
    return { harmony: 'excellent', score: 85, description: '상생 관계로 에너지를 받음' };
  }
  if (controls[el1] === el2 || controls[el2] === el1) {
    return { harmony: 'challenging', score: 40, description: '상극 관계로 긴장감 존재' };
  }
  return { harmony: 'neutral', score: 55, description: '중립적 관계' };
}

function getDominantElements(elements: Record<string, number>): string[] {
  const sorted = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  return sorted.filter(([, v]) => v >= 2).map(([k]) => k);
}

function getWeakElements(elements: Record<string, number>): string[] {
  return Object.entries(elements).filter(([, v]) => v === 0).map(([k]) => k);
}

function countAstroElements(astro: AstroProfile): Record<string, number> {
  const count: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const planets = ['sun', 'moon', 'venus', 'mars', 'mercury', 'jupiter', 'saturn'] as const;

  for (const planet of planets) {
    const el = astro[planet]?.element;
    if (el && count[el] !== undefined) {
      count[el]++;
    }
  }

  return count;
}

function getDominantAstroElements(elements: Record<string, number>): string[] {
  const sorted = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  return sorted.filter(([, v]) => v >= 2).map(([k]) => k);
}

function getWeakAstroElements(elements: Record<string, number>): string[] {
  return Object.entries(elements).filter(([, v]) => v === 0).map(([k]) => k);
}

function analyzeCorrespondence(
  p1Pillar: { stem: string; branch: string },
  p2Pillar: { stem: string; branch: string },
  p1Planet: { sign?: string; element?: string } | undefined,
  p2Planet: { sign?: string; element?: string } | undefined,
  pillarName: string,
  planetName: string,
  theme: string
): { harmony: number; description: string } {
  const branchElements: Record<string, string> = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
    '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
    '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water',
  };

  const p1BranchEl = branchElements[p1Pillar.branch] || 'earth';
  const p2BranchEl = branchElements[p2Pillar.branch] || 'earth';
  const p1PlanetEl = astroElementToSaju(p1Planet?.element || 'fire');
  const p2PlanetEl = astroElementToSaju(p2Planet?.element || 'fire');

  // P1 기둥 vs P2 행성, P2 기둥 vs P1 행성
  const h1 = analyzeElementHarmony(p1BranchEl, p2PlanetEl);
  const h2 = analyzeElementHarmony(p2BranchEl, p1PlanetEl);

  const avg = (h1.score + h2.score) / 2;

  let desc = '';
  if (avg >= 75) {
    desc = `${theme} 영역에서 완벽한 조화! 🌟`;
  } else if (avg >= 55) {
    desc = `${theme} 영역이 괜찮아요 ✨`;
  } else {
    desc = `${theme} 영역은 맞춰가야 해요 💫`;
  }

  return { harmony: avg, description: desc };
}

function analyzeVenusCompatibility(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstroProfile,
  p2Astro: AstroProfile
): { harmony: number; description: string } {
  // 금성 = 연애, 미적 감각, 가치관
  // 사주에서는 재성(남), 관성(여)과 연관

  const p1VenusEl = astroElementToSaju(p1Astro.venus?.element || 'earth');
  const p2VenusEl = astroElementToSaju(p2Astro.venus?.element || 'earth');

  // 금성끼리의 조화
  const venusHarmony = analyzeElementHarmony(p1VenusEl, p2VenusEl);

  // 일간과 상대 금성의 조화
  const p1DmP2Venus = analyzeElementHarmony(
    normalizeElement(p1Saju.dayMaster.element),
    p2VenusEl
  );
  const p2DmP1Venus = analyzeElementHarmony(
    normalizeElement(p2Saju.dayMaster.element),
    p1VenusEl
  );

  const avg = (venusHarmony.score + p1DmP2Venus.score + p2DmP1Venus.score) / 3;

  let desc = '';
  if (avg >= 75) {
    desc = `사랑의 언어가 잘 통해요! 서로를 예쁘게 봐요.`;
  } else if (avg >= 55) {
    desc = `연애 스타일이 꽤 맞아요. 서로의 매력을 알아봐요.`;
  } else {
    desc = `사랑 표현 방식이 달라요. 서로 배워가야 해요.`;
  }

  return { harmony: avg, description: desc };
}

function analyzeMarsCompatibility(
  p1Saju: SajuProfile,
  p2Saju: SajuProfile,
  p1Astro: AstroProfile,
  p2Astro: AstroProfile
): { harmony: number; description: string } {
  // 화성 = 열정, 행동력, 갈등 방식
  // 사주에서는 편관, 양인살 등과 연관

  const p1MarsEl = astroElementToSaju(p1Astro.mars?.element || 'fire');
  const p2MarsEl = astroElementToSaju(p2Astro.mars?.element || 'fire');

  const marsHarmony = analyzeElementHarmony(p1MarsEl, p2MarsEl);

  // 일간과 상대 화성의 조화
  const p1DmP2Mars = analyzeElementHarmony(
    normalizeElement(p1Saju.dayMaster.element),
    p2MarsEl
  );
  const p2DmP1Mars = analyzeElementHarmony(
    normalizeElement(p2Saju.dayMaster.element),
    p1MarsEl
  );

  const avg = (marsHarmony.score + p1DmP2Mars.score + p2DmP1Mars.score) / 3;

  let desc = '';
  if (avg >= 75) {
    desc = `열정이 잘 맞아요! 함께 행동하고 갈등도 건강하게 해결해요.`;
  } else if (avg >= 55) {
    desc = `가끔 불꽃이 튀지만, 그게 서로를 자극하기도 해요.`;
  } else {
    desc = `열정 표현과 갈등 해결 방식이 달라서 이해가 필요해요.`;
  }

  return { harmony: avg, description: desc };
}
