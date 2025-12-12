// src/lib/Saju/healthCareer.ts
// 건강 및 직업 적성 심층 분석 모듈 - 200% 급

import { FiveElement } from './types';
import { STEMS, BRANCHES } from './constants';

// ============================================================
// 헬퍼 함수
// ============================================================

function getStemElement(stem: string): FiveElement {
  const found = STEMS.find(s => s.name === stem);
  return found?.element as FiveElement || '토';
}

function getBranchElement(branch: string): FiveElement {
  const found = BRANCHES.find(b => b.name === branch);
  return found?.element as FiveElement || '토';
}

// ============================================================
// 타입 정의
// ============================================================

interface Pillar { stem: string; branch: string; }
interface SajuPillars { year: Pillar; month: Pillar; day: Pillar; hour: Pillar; }

export interface OrganHealth {
  organ: string;
  element: FiveElement;
  status: 'strong' | 'normal' | 'weak' | 'vulnerable';
  score: number;
  description: string;
  risks: string[];
  prevention: string[];
}

export interface HealthAnalysis {
  overallScore: number;
  constitution: string;
  dominantElement: FiveElement;
  weakElement: FiveElement;
  organHealth: OrganHealth[];
  vulnerableAges: { age: number; reason: string }[];
  preventionAdvice: string[];
  lifestyleRecommendations: string[];
  seasonalHealth: { season: string; advice: string }[];
}

export interface CareerField {
  category: string;
  jobs: string[];
  fitScore: number;
  elementBasis: FiveElement[];
  description: string;
  successFactors: string[];
  challenges: string[];
}

export interface WorkStyle {
  type: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  idealEnvironment: string[];
}

export interface CareerAnalysis {
  primaryFields: CareerField[];
  secondaryFields: CareerField[];
  workStyle: WorkStyle;
  entrepreneurialScore: number;
  leadershipScore: number;
  creativityScore: number;
  stabilityPreference: number;
  careerPath: string[];
  peakCareerAges: number[];
  careerAdvice: string[];
}

export interface HealthCareerComprehensive {
  health: HealthAnalysis;
  career: CareerAnalysis;
  synergy: string[];
  warnings: string[];
}

// ============================================================
// 오행-장기 매핑
// ============================================================

const ELEMENT_ORGANS: Record<FiveElement, { yang: string; yin: string }> = {
  '목': { yang: '담', yin: '간' },
  '화': { yang: '소장', yin: '심장' },
  '토': { yang: '위', yin: '비장' },
  '금': { yang: '대장', yin: '폐' },
  '수': { yang: '방광', yin: '신장' }
};

const ELEMENT_CONTROLS: Record<FiveElement, FiveElement> = {
  '목': '토', '화': '금', '토': '수', '금': '목', '수': '화'
};

// ============================================================
// 오행 개수 계산
// ============================================================

function countElements(pillars: SajuPillars): Record<FiveElement, number> {
  const count: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };

  const allStems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

  for (const stem of allStems) {
    const element = getStemElement(stem);
    if (element) count[element]++;
  }

  for (const branch of allBranches) {
    const element = getBranchElement(branch);
    if (element) count[element]++;
  }

  return count;
}

// ============================================================
// 건강 분석
// ============================================================

export function analyzeHealth(pillars: SajuPillars): HealthAnalysis {
  const elementCount = countElements(pillars);
  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];

  let dominantElement: FiveElement = '목';
  let weakElement: FiveElement = '목';
  let maxCount = 0;
  let minCount = 99;

  for (const elem of elements) {
    if (elementCount[elem] > maxCount) { maxCount = elementCount[elem]; dominantElement = elem; }
    if (elementCount[elem] < minCount) { minCount = elementCount[elem]; weakElement = elem; }
  }

  const organHealth: OrganHealth[] = [];

  for (const elem of elements) {
    const count = elementCount[elem];
    const organs = ELEMENT_ORGANS[elem];
    let status: OrganHealth['status'];
    let score: number;

    if (count === 0) { status = 'vulnerable'; score = 30; }
    else if (count === 1) { status = 'weak'; score = 50; }
    else if (count >= 4) { status = 'strong'; score = 90; }
    else { status = 'normal'; score = 75; }

    const controller = Object.entries(ELEMENT_CONTROLS).find(([, v]) => v === elem)?.[0] as FiveElement | undefined;
    if (controller && elementCount[controller] >= 3) {
      score -= 15;
      if (status === 'normal') status = 'weak';
    }

    const risks: string[] = [];
    const prevention: string[] = [];

    if (status === 'vulnerable' || status === 'weak') {
      if (elem === '목') { risks.push('간 기능 저하', '눈 피로'); prevention.push('녹색 채소 섭취', '눈 휴식'); }
      else if (elem === '화') { risks.push('심장 질환', '불면증'); prevention.push('적절한 운동', '스트레스 관리'); }
      else if (elem === '토') { risks.push('소화기 문제', '비만'); prevention.push('규칙적인 식사', '과식 금지'); }
      else if (elem === '금') { risks.push('호흡기 질환', '피부 문제'); prevention.push('금연', '공기 정화'); }
      else if (elem === '수') { risks.push('신장 기능 저하', '뼈 관절 약화'); prevention.push('충분한 수분 섭취', '칼슘 보충'); }
    }

    organHealth.push({
      organ: `${organs.yin}/${organs.yang}`, element: elem, status, score,
      description: `${elem} 오행 - ${organs.yin}, ${organs.yang} 계통`,
      risks, prevention
    });
  }

  const overallScore = Math.round(organHealth.reduce((sum, o) => sum + o.score, 0) / 5);

  let constitution: string;
  if (dominantElement === '목') constitution = '목형 체질 - 활동적이고 창의적';
  else if (dominantElement === '화') constitution = '화형 체질 - 열정적이고 외향적';
  else if (dominantElement === '토') constitution = '토형 체질 - 안정적이고 실용적';
  else if (dominantElement === '금') constitution = '금형 체질 - 꼼꼼하고 예민함';
  else constitution = '수형 체질 - 지혜롭고 내향적';

  const vulnerableAges: { age: number; reason: string }[] = [];
  if (elementCount[weakElement] === 0) {
    vulnerableAges.push({ age: 35, reason: `${weakElement} 오행 부족` });
    vulnerableAges.push({ age: 55, reason: `${weakElement} 오행 관련 장기 약화` });
  }

  const seasonalHealth = [
    { season: '봄', advice: elementCount['목'] <= 1 ? '간 건강 주의' : '적당한 활동량 유지' },
    { season: '여름', advice: elementCount['화'] <= 1 ? '심장 무리 주의' : '열 관리 필요' },
    { season: '환절기', advice: elementCount['토'] <= 1 ? '소화기 관리' : '체중 관리 주의' },
    { season: '가을', advice: elementCount['금'] <= 1 ? '호흡기 주의' : '피부 관리' },
    { season: '겨울', advice: elementCount['수'] <= 1 ? '신장 보온' : '과로 주의' }
  ];

  const preventionAdvice: string[] = [];
  if (weakElement === '목') preventionAdvice.push('간 해독, 눈 건강 관리');
  if (weakElement === '화') preventionAdvice.push('심장 검진, 혈압 관리');
  if (weakElement === '토') preventionAdvice.push('소화기 검진, 당뇨 검사');
  if (weakElement === '금') preventionAdvice.push('호흡기 검진, 피부 관리');
  if (weakElement === '수') preventionAdvice.push('신장 검진, 뼈 건강 체크');

  const lifestyleRecommendations: string[] = [];
  lifestyleRecommendations.push(`${weakElement} 오행 보충 음식 섭취 권장`);
  lifestyleRecommendations.push(`과다한 ${dominantElement} 오행 억제 필요`);

  return {
    overallScore, constitution, dominantElement, weakElement, organHealth,
    vulnerableAges, preventionAdvice, lifestyleRecommendations, seasonalHealth
  };
}

// ============================================================
// 직업 분석
// ============================================================

const ELEMENT_CAREERS: Record<FiveElement, { category: string; jobs: string[] }[]> = {
  '목': [
    { category: '교육/문화', jobs: ['교사', '교수', '작가', '편집자'] },
    { category: '패션/뷰티', jobs: ['디자이너', '스타일리스트'] },
    { category: '농업/환경', jobs: ['농업인', '조경사', '환경 전문가'] }
  ],
  '화': [
    { category: '방송/연예', jobs: ['배우', '가수', 'MC', 'PD'] },
    { category: '외식/요식', jobs: ['요리사', '식당 운영'] },
    { category: '광고/마케팅', jobs: ['광고인', '마케터'] }
  ],
  '토': [
    { category: '부동산/건설', jobs: ['부동산 중개', '건설업', '건축가'] },
    { category: '농업/축산', jobs: ['농업', '축산업'] },
    { category: '중개/서비스', jobs: ['중개업', '컨설팅'] }
  ],
  '금': [
    { category: '금융/투자', jobs: ['은행원', '투자 전문가', '보험사'] },
    { category: '기계/제조', jobs: ['기계 엔지니어', '제조업'] },
    { category: '법률/행정', jobs: ['변호사', '공무원', '군인', '경찰'] }
  ],
  '수': [
    { category: '무역/유통', jobs: ['무역업', '유통업', '물류'] },
    { category: 'IT/기술', jobs: ['개발자', 'IT 엔지니어', '데이터 분석가'] },
    { category: '연구/학술', jobs: ['연구원', '학자', '심리학자'] }
  ]
};

export function analyzeCareer(pillars: SajuPillars): CareerAnalysis {
  const elementCount = countElements(pillars);
  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
  const dayElement = getStemElement(pillars.day.stem);

  const elementScores: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };

  for (const elem of elements) {
    let score = elementCount[elem] * 20;
    if (elem === dayElement) score += 15;
    elementScores[elem] = Math.min(100, score);
  }

  const sortedElements = [...elements].sort((a, b) => elementScores[b] - elementScores[a]);

  const primaryFields: CareerField[] = [];
  const secondaryFields: CareerField[] = [];

  for (let i = 0; i < 2; i++) {
    const elem = sortedElements[i];
    const careers = ELEMENT_CAREERS[elem];

    for (const career of careers) {
      const field: CareerField = {
        category: career.category, jobs: career.jobs, fitScore: elementScores[elem],
        elementBasis: [elem], description: `${elem} 오행 기반`,
        successFactors: [], challenges: []
      };

      if (elementCount[elem] >= 2) field.successFactors.push(`${elem} 기운이 강함`);
      if (i === 0) primaryFields.push(field);
      else secondaryFields.push(field);
    }
  }

  let workStyle: WorkStyle;
  if (elementCount['화'] >= 3) {
    workStyle = {
      type: '열정형', description: '에너지 넘치고 추진력이 강한 스타일',
      strengths: ['빠른 실행력', '동기부여'], weaknesses: ['지속력 부족'],
      idealEnvironment: ['역동적인 환경', '팀워크 중시 조직']
    };
  } else if (elementCount['수'] >= 3) {
    workStyle = {
      type: '분석형', description: '깊이 있는 사고와 전략적 접근',
      strengths: ['분석력', '장기 계획'], weaknesses: ['결정 지연'],
      idealEnvironment: ['연구 중심 환경', '자율성 보장 조직']
    };
  } else if (elementCount['금'] >= 3) {
    workStyle = {
      type: '완벽형', description: '정확하고 체계적인 업무 처리',
      strengths: ['정확성', '조직력'], weaknesses: ['유연성 부족'],
      idealEnvironment: ['구조화된 환경', '명확한 규칙 조직']
    };
  } else if (elementCount['토'] >= 3) {
    workStyle = {
      type: '안정형', description: '꾸준하고 신뢰할 수 있는 스타일',
      strengths: ['신뢰성', '인내력'], weaknesses: ['변화 저항'],
      idealEnvironment: ['안정적인 환경', '장기근속 가능 조직']
    };
  } else {
    workStyle = {
      type: '성장형', description: '다양한 가능성을 추구하는 스타일',
      strengths: ['적응력', '학습 능력'], weaknesses: ['집중력 분산'],
      idealEnvironment: ['성장 기회가 많은 환경']
    };
  }

  let entrepreneurialScore = 50;
  if (elementCount['화'] >= 2) entrepreneurialScore += 15;
  if (elementCount['목'] >= 2) entrepreneurialScore += 10;

  let leadershipScore = 50;
  if (elementCount['금'] >= 2) leadershipScore += 15;
  if (elementCount['화'] >= 2) leadershipScore += 10;

  let creativityScore = 50;
  if (elementCount['수'] >= 2) creativityScore += 20;
  if (elementCount['화'] >= 2) creativityScore += 10;

  let stabilityPreference = 50;
  if (elementCount['토'] >= 2) stabilityPreference += 20;
  if (elementCount['금'] >= 2) stabilityPreference += 15;

  const careerPath: string[] = [];
  if (entrepreneurialScore >= 70) careerPath.push('창업 및 자영업 적합');
  if (leadershipScore >= 70) careerPath.push('관리직/임원 승진 가능');
  if (creativityScore >= 70) careerPath.push('창작/기획 분야 성장');
  if (stabilityPreference >= 70) careerPath.push('대기업/공공기관 장기근속');

  const peakCareerAges: number[] = [];
  if (elementCount['화'] >= 2) peakCareerAges.push(35);
  if (elementCount['금'] >= 2) peakCareerAges.push(45);
  if (elementCount['수'] >= 2) peakCareerAges.push(55);
  if (peakCareerAges.length === 0) peakCareerAges.push(40, 50);

  const careerAdvice: string[] = [];
  careerAdvice.push(`${sortedElements[0]} 관련 업종이 가장 적합합니다`);

  return {
    primaryFields, secondaryFields, workStyle,
    entrepreneurialScore: Math.min(100, entrepreneurialScore),
    leadershipScore: Math.min(100, leadershipScore),
    creativityScore: Math.min(100, creativityScore),
    stabilityPreference: Math.min(100, stabilityPreference),
    careerPath, peakCareerAges, careerAdvice
  };
}

// ============================================================
// 종합 분석
// ============================================================

export function analyzeHealthCareer(pillars: SajuPillars): HealthCareerComprehensive {
  const health = analyzeHealth(pillars);
  const career = analyzeCareer(pillars);

  const synergy: string[] = [];
  const warnings: string[] = [];

  if (health.overallScore >= 70 && career.entrepreneurialScore >= 60) {
    synergy.push('건강한 체력과 창업 정신이 조화로워 사업 성공 가능성이 높습니다');
  }

  if (career.workStyle.type === '열정형' && health.organHealth.find(o => o.element === '화' && o.status === 'vulnerable')) {
    warnings.push('열정적인 업무 스타일이지만 심장 건강 주의 필요');
  }

  if (career.entrepreneurialScore >= 70 && health.overallScore <= 50) {
    warnings.push('사업 추진력은 있으나 건강 관리가 선행되어야 합니다');
  }

  return { health, career, synergy, warnings };
}

// ============================================================
// 맞춤 추천
// ============================================================

export interface ElementRecommendations {
  luckyColors: string[];
  luckyDirections: string[];
  beneficialFoods: string[];
  avoidFoods: string[];
  luckyNumbers: number[];
  beneficialActivities: string[];
}

const ELEMENT_COLORS: Record<FiveElement, string[]> = {
  '목': ['청색', '녹색'], '화': ['적색', '자주색'], '토': ['황색', '갈색'],
  '금': ['백색', '은색'], '수': ['흑색', '남색']
};

const ELEMENT_DIRECTIONS: Record<FiveElement, string[]> = {
  '목': ['동쪽'], '화': ['남쪽'], '토': ['중앙'], '금': ['서쪽'], '수': ['북쪽']
};

const ELEMENT_NUMBERS: Record<FiveElement, number[]> = {
  '목': [3, 8], '화': [2, 7], '토': [5, 10], '금': [4, 9], '수': [1, 6]
};

export function getElementRecommendations(weakElements: FiveElement[]): ElementRecommendations {
  const luckyColors: string[] = [];
  const luckyDirections: string[] = [];
  const beneficialFoods: string[] = [];
  const luckyNumbers: number[] = [];
  const beneficialActivities: string[] = [];

  for (const elem of weakElements) {
    luckyColors.push(...ELEMENT_COLORS[elem]);
    luckyDirections.push(...ELEMENT_DIRECTIONS[elem]);
    luckyNumbers.push(...ELEMENT_NUMBERS[elem]);
  }

  if (weakElements.includes('목')) beneficialActivities.push('산책', '등산', '원예 활동');
  if (weakElements.includes('화')) beneficialActivities.push('햇볕 쬐기', '사우나');
  if (weakElements.includes('토')) beneficialActivities.push('흙 만지기', '도예', '요리');
  if (weakElements.includes('금')) beneficialActivities.push('호흡 운동', '악기 연주');
  if (weakElements.includes('수')) beneficialActivities.push('수영', '명상', '독서');

  return {
    luckyColors: Array.from(new Set(luckyColors)),
    luckyDirections: Array.from(new Set(luckyDirections)),
    beneficialFoods,
    avoidFoods: [],
    luckyNumbers: Array.from(new Set(luckyNumbers)).sort((a, b) => a - b),
    beneficialActivities: Array.from(new Set(beneficialActivities))
  };
}
