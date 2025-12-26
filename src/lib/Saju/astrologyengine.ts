// src/lib/Saju/astrologyengine.ts
// 신강/신약, 격국, 용신 고급 분석 로직

import { FiveElement, YinYang, StemBranchInfo } from './types';
import { STEMS, BRANCHES, JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants';

/* ========== 타입 정의 ========== */

export type StrengthLevel = '극신강' | '신강' | '중화' | '신약' | '극신약';

export type GeokgukType =
  // 정격(正格) - 8격
  | '정관격' | '편관격' | '정재격' | '편재격'
  | '정인격' | '편인격' | '식신격' | '상관격'
  // 특별격(特別格)
  | '건록격' | '양인격'
  // 종격(從格)
  | '종왕격' | '종강격' | '종아격' | '종재격' | '종살격'
  // 화기격
  | '화기격'
  // 미분류
  | '잡격';

export type YongsinElement = FiveElement;

/**
 * 일간 신강/신약 분석 결과 (십성 점수 기반)
 */
export interface DaymasterStrengthAnalysis {
  level: StrengthLevel;
  score: number;           // -100 ~ +100 (양수: 신강, 음수: 신약)
  helpingScore: number;    // 일간을 돕는 힘 (비겁 + 인성)
  drainingScore: number;   // 일간을 빼는 힘 (식상 + 재성 + 관성)
  monthBranchHelps: boolean;  // 월지가 일간을 돕는지
  seasonHelps: boolean;       // 계절이 일간을 돕는지
  details: {
    비겁: number;
    인성: number;
    식상: number;
    재성: number;
    관성: number;
  };
}

/** @deprecated Use DaymasterStrengthAnalysis instead */
export type StrengthAnalysis = DaymasterStrengthAnalysis;

export interface GeokgukAnalysis {
  type: GeokgukType;
  basis: string;           // 판단 근거
  transparentStem?: string; // 투출한 천간 (정격의 경우)
}

export interface YongsinAnalysis {
  primary: YongsinElement;     // 주 용신
  secondary?: YongsinElement;  // 부 용신
  basis: string;               // 판단 근거
  favorable: FiveElement[];    // 희신(喜神)
  unfavorable: FiveElement[];  // 기신(忌神)
}

export interface AdvancedSajuAnalysis {
  strength: StrengthAnalysis;
  geokguk: GeokgukAnalysis;
  yongsin: YongsinAnalysis;
}

/* ========== 헬퍼 함수 ========== */

// 지지에서 StemBranchInfo 찾기
function getBranchInfo(branchName: string): StemBranchInfo | undefined {
  return BRANCHES.find(b => b.name === branchName);
}

// 천간에서 StemBranchInfo 찾기
function getStemInfo(stemName: string): StemBranchInfo | undefined {
  return STEMS.find(s => s.name === stemName);
}

// 지장간 정기(본기) 천간 가져오기
function getMainHiddenStem(branchName: string): StemBranchInfo | undefined {
  const jj = JIJANGGAN[branchName];
  if (!jj?.정기) return undefined;
  return STEMS.find(s => s.name === jj.정기);
}

// 지장간 모든 천간 가져오기 (가중치 포함)
function getHiddenStems(branchName: string): Array<{ stem: StemBranchInfo; weight: number }> {
  const jj = JIJANGGAN[branchName];
  if (!jj) return [];

  const result: Array<{ stem: StemBranchInfo; weight: number }> = [];

  // 초기: 7일 비중 (약 23%)
  if (jj.초기) {
    const stem = STEMS.find(s => s.name === jj.초기);
    if (stem) result.push({ stem, weight: 0.23 });
  }

  // 중기: 7일 비중 (약 23%)
  if (jj.중기) {
    const stem = STEMS.find(s => s.name === jj.중기);
    if (stem) result.push({ stem, weight: 0.23 });
  }

  // 정기: 16일 비중 (약 54%)
  if (jj.정기) {
    const stem = STEMS.find(s => s.name === jj.정기);
    if (stem) result.push({ stem, weight: 0.54 });
  }

  return result;
}

// 오행이 일간을 돕는지 (비겁 또는 인성)
function isHelpingElement(dayMasterElement: FiveElement, targetElement: FiveElement): boolean {
  // 같은 오행 (비겁)
  if (dayMasterElement === targetElement) return true;
  // 일간을 생하는 오행 (인성)
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMasterElement] === targetElement) return true;
  return false;
}

// 오행별 십성 분류
function getElementCategory(
  dayMasterElement: FiveElement,
  targetElement: FiveElement
): '비겁' | '인성' | '식상' | '재성' | '관성' {
  if (dayMasterElement === targetElement) return '비겁';
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMasterElement] === targetElement) return '인성';
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayMasterElement] === targetElement) return '식상';
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayMasterElement] === targetElement) return '재성';
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayMasterElement] === targetElement) return '관성';
  return '비겁'; // fallback
}

// 월지 기준 계절 오행 (월지가 일간의 계절인지)
function getSeasonElement(monthBranchName: string): FiveElement {
  // 인묘진(寅卯辰) = 봄 = 목
  // 사오미(巳午未) = 여름 = 화
  // 신유술(申酉戌) = 가을 = 금
  // 해자축(亥子丑) = 겨울 = 수
  // 진술축미(辰戌丑未) = 토용(환절기) = 토
  const seasonMap: Record<string, FiveElement> = {
    '寅': '목', '卯': '목', '辰': '토',
    '巳': '화', '午': '화', '未': '토',
    '申': '금', '酉': '금', '戌': '토',
    '亥': '수', '子': '수', '丑': '토',
  };
  return seasonMap[monthBranchName] || '토';
}

// 양인(羊刃) 지지 찾기 - 일간 기준
function getYanginBranch(dayMasterName: string): string | null {
  const yangInMap: Record<string, string> = {
    '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳',
    '戊': '午', '己': '巳', '庚': '酉', '辛': '申',
    '壬': '子', '癸': '亥',
  };
  return yangInMap[dayMasterName] || null;
}

// 건록(建祿) 지지 찾기 - 일간 기준
function getGeonrokBranch(dayMasterName: string): string | null {
  const geonrokMap: Record<string, string> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
    '戊': '巳', '己': '午', '庚': '申', '辛': '酉',
    '壬': '亥', '癸': '子',
  };
  return geonrokMap[dayMasterName] || null;
}

/* ========== 신강/신약 판단 ========== */

interface PillarInput {
  heavenlyStem: { name: string; element: FiveElement };
  earthlyBranch: { name: string; element: FiveElement };
}

export function analyzeStrength(
  dayMaster: { name: string; element: FiveElement; yin_yang: YinYang },
  pillars: {
    yearPillar: PillarInput;
    monthPillar: PillarInput;
    dayPillar: PillarInput;
    timePillar: PillarInput;
  }
): StrengthAnalysis {
  const dayElement = dayMaster.element;

  const details = {
    비겁: 0,
    인성: 0,
    식상: 0,
    재성: 0,
    관성: 0,
  };

  // 천간 점수 (각 1점)
  const stems = [
    pillars.yearPillar.heavenlyStem,
    pillars.monthPillar.heavenlyStem,
    // 일간은 제외 (본인이므로)
    pillars.timePillar.heavenlyStem,
  ];

  for (const stem of stems) {
    const cat = getElementCategory(dayElement, stem.element);
    details[cat] += 1;
  }

  // 지지 점수 (각 1점, 지장간 가중치 적용)
  const branches = [
    pillars.yearPillar.earthlyBranch.name,
    pillars.monthPillar.earthlyBranch.name,
    pillars.dayPillar.earthlyBranch.name,
    pillars.timePillar.earthlyBranch.name,
  ];

  for (const branchName of branches) {
    const hiddenStems = getHiddenStems(branchName);
    for (const { stem, weight } of hiddenStems) {
      const cat = getElementCategory(dayElement, stem.element);
      details[cat] += weight;
    }
  }

  // 월지 계절 보너스 (가장 중요)
  const monthBranchName = pillars.monthPillar.earthlyBranch.name;
  const seasonElement = getSeasonElement(monthBranchName);
  const seasonHelps = isHelpingElement(dayElement, seasonElement);
  const monthBranchHelps = isHelpingElement(dayElement, pillars.monthPillar.earthlyBranch.element);

  // 월지가 일간을 도우면 +2점 보너스
  if (monthBranchHelps) {
    const monthMainStem = getMainHiddenStem(monthBranchName);
    if (monthMainStem) {
      const cat = getElementCategory(dayElement, monthMainStem.element);
      details[cat] += 2; // 월지 보너스
    }
  }

  // 계절 보너스
  if (seasonHelps) {
    if (seasonElement === dayElement) {
      details.비겁 += 1;
    } else {
      details.인성 += 1;
    }
  }

  // 점수 계산
  const helpingScore = details.비겁 + details.인성;
  const drainingScore = details.식상 + details.재성 + details.관성;

  // 총점: -100 ~ +100 스케일로 변환
  const total = helpingScore + drainingScore;
  const rawScore = total > 0 ? ((helpingScore - drainingScore) / total) * 100 : 0;
  const score = Math.round(rawScore);

  // 레벨 판정
  let level: StrengthLevel;
  if (score >= 40) level = '극신강';
  else if (score >= 15) level = '신강';
  else if (score >= -15) level = '중화';
  else if (score >= -40) level = '신약';
  else level = '극신약';

  return {
    level,
    score,
    helpingScore,
    drainingScore,
    monthBranchHelps,
    seasonHelps,
    details,
  };
}

/* ========== 격국 판단 ========== */

export function analyzeGeokguk(
  dayMaster: { name: string; element: FiveElement; yin_yang: YinYang },
  pillars: {
    yearPillar: PillarInput;
    monthPillar: PillarInput;
    dayPillar: PillarInput;
    timePillar: PillarInput;
  },
  strength: StrengthAnalysis
): GeokgukAnalysis {
  const monthBranchName = pillars.monthPillar.earthlyBranch.name;
  const dayElement = dayMaster.element;

  // 1. 건록격 체크 - 월지가 일간의 건록지인지
  const geonrokBranch = getGeonrokBranch(dayMaster.name);
  if (geonrokBranch === monthBranchName) {
    return {
      type: '건록격',
      basis: `월지 ${monthBranchName}가 일간 ${dayMaster.name}의 건록지`,
    };
  }

  // 2. 양인격 체크 - 월지가 일간의 양인지인지
  const yanginBranch = getYanginBranch(dayMaster.name);
  if (yanginBranch === monthBranchName) {
    return {
      type: '양인격',
      basis: `월지 ${monthBranchName}가 일간 ${dayMaster.name}의 양인지`,
    };
  }

  // 3. 종격 체크 - 극신강 또는 극신약인 경우
  if (strength.level === '극신강') {
    // 비겁이 압도적이면 종왕격, 인성이 압도적이면 종강격
    if (strength.details.비겁 > strength.details.인성 * 2) {
      return {
        type: '종왕격',
        basis: '비겁이 태과하여 종왕',
      };
    }
    return {
      type: '종강격',
      basis: '인성이 태과하여 종강',
    };
  }

  if (strength.level === '극신약') {
    // 재성이 많으면 종재격, 관성이 많으면 종살격, 식상이 많으면 종아격
    if (strength.details.재성 >= strength.details.관성 && strength.details.재성 >= strength.details.식상) {
      return {
        type: '종재격',
        basis: '신약하고 재성이 태과하여 종재',
      };
    }
    if (strength.details.관성 >= strength.details.식상) {
      return {
        type: '종살격',
        basis: '신약하고 관성이 태과하여 종살',
      };
    }
    return {
      type: '종아격',
      basis: '신약하고 식상이 태과하여 종아',
    };
  }

  // 4. 정격 판단 - 월지 정기가 천간에 투출했는지 확인
  const monthMainStem = getMainHiddenStem(monthBranchName);
  if (!monthMainStem) {
    return { type: '잡격', basis: '월지 정기 파악 불가' };
  }

  // 투출 확인: 월지 정기와 같은 천간이 연/월/시 천간에 있는지
  const transparentStems = [
    pillars.yearPillar.heavenlyStem,
    pillars.monthPillar.heavenlyStem,
    pillars.timePillar.heavenlyStem,
  ];

  const transparent = transparentStems.find(s => s.name === monthMainStem.name);

  // 정기의 십성 카테고리로 격국 결정
  const mainStemCategory = getElementCategory(dayElement, monthMainStem.element);
  const mainStemYinYang = monthMainStem.yin_yang;
  const dayYinYang = dayMaster.yin_yang;
  const isSameYinYang = mainStemYinYang === dayYinYang;

  let geokgukType: GeokgukType;
  switch (mainStemCategory) {
    case '비겁':
      // 비겁격은 없으므로 잡격
      geokgukType = '잡격';
      break;
    case '인성':
      geokgukType = isSameYinYang ? '편인격' : '정인격';
      break;
    case '식상':
      geokgukType = isSameYinYang ? '식신격' : '상관격';
      break;
    case '재성':
      geokgukType = isSameYinYang ? '편재격' : '정재격';
      break;
    case '관성':
      geokgukType = isSameYinYang ? '편관격' : '정관격';
      break;
    default:
      geokgukType = '잡격';
  }

  return {
    type: geokgukType,
    basis: transparent
      ? `월지 ${monthBranchName} 정기 ${monthMainStem.name}이 천간에 투출`
      : `월지 ${monthBranchName} 정기 ${monthMainStem.name} 기준`,
    transparentStem: transparent?.name,
  };
}

/* ========== 용신 판단 ========== */

export function analyzeYongsin(
  dayMaster: { name: string; element: FiveElement; yin_yang: YinYang },
  strength: StrengthAnalysis,
  geokguk: GeokgukAnalysis
): YongsinAnalysis {
  const dayElement = dayMaster.element;

  // 오행 관계
  const generating = FIVE_ELEMENT_RELATIONS.생하는관계[dayElement]; // 식상
  const controlling = FIVE_ELEMENT_RELATIONS.극하는관계[dayElement]; // 재성
  const generatedBy = FIVE_ELEMENT_RELATIONS.생받는관계[dayElement]; // 인성
  const controlledBy = FIVE_ELEMENT_RELATIONS.극받는관계[dayElement]; // 관성

  // 종격의 경우 특별 처리
  if (geokguk.type === '종왕격' || geokguk.type === '종강격') {
    // 종강격은 그 세를 따라가야 함
    return {
      primary: dayElement,      // 비겁
      secondary: generatedBy,   // 인성
      basis: '종격이므로 일간의 세력을 따름',
      favorable: [dayElement, generatedBy],
      unfavorable: [controlling, controlledBy, generating],
    };
  }

  if (geokguk.type === '종재격') {
    return {
      primary: controlling,     // 재성
      secondary: generating,    // 식상
      basis: '종재격이므로 재성을 따름',
      favorable: [controlling, generating],
      unfavorable: [generatedBy, dayElement],
    };
  }

  if (geokguk.type === '종살격') {
    return {
      primary: controlledBy,    // 관성
      secondary: controlling,   // 재성
      basis: '종살격이므로 관성을 따름',
      favorable: [controlledBy, controlling],
      unfavorable: [generatedBy, dayElement],
    };
  }

  if (geokguk.type === '종아격') {
    return {
      primary: generating,      // 식상
      secondary: controlling,   // 재성
      basis: '종아격이므로 식상을 따름',
      favorable: [generating, controlling],
      unfavorable: [generatedBy, controlledBy],
    };
  }

  // 일반격의 경우: 신강/신약에 따라 결정
  if (strength.level === '극신강' || strength.level === '신강') {
    // 신강하면 설기(식상) > 재성 > 관성 순으로 용신
    // 가장 부족한 오행을 용신으로
    if (strength.details.관성 <= strength.details.재성 && strength.details.관성 <= strength.details.식상) {
      return {
        primary: controlledBy,   // 관성 (일간을 극하는)
        secondary: controlling,  // 재성
        basis: '신강하므로 관성으로 억제',
        favorable: [controlledBy, controlling, generating],
        unfavorable: [generatedBy, dayElement],
      };
    }
    if (strength.details.재성 <= strength.details.식상) {
      return {
        primary: controlling,    // 재성
        secondary: generating,   // 식상
        basis: '신강하므로 재성으로 설기',
        favorable: [controlling, generating, controlledBy],
        unfavorable: [generatedBy, dayElement],
      };
    }
    return {
      primary: generating,       // 식상
      secondary: controlling,    // 재성
      basis: '신강하므로 식상으로 설기',
      favorable: [generating, controlling, controlledBy],
      unfavorable: [generatedBy, dayElement],
    };
  }

  if (strength.level === '극신약' || strength.level === '신약') {
    // 신약하면 인성 > 비겁 순으로 용신
    if (strength.details.인성 <= strength.details.비겁) {
      return {
        primary: generatedBy,    // 인성
        secondary: dayElement,   // 비겁
        basis: '신약하므로 인성으로 생조',
        favorable: [generatedBy, dayElement],
        unfavorable: [controlledBy, controlling, generating],
      };
    }
    return {
      primary: dayElement,       // 비겁
      secondary: generatedBy,    // 인성
      basis: '신약하므로 비겁으로 부조',
      favorable: [dayElement, generatedBy],
      unfavorable: [controlledBy, controlling, generating],
    };
  }

  // 중화: 가장 부족한 오행을 보충
  const { 비겁, 인성, 식상, 재성, 관성 } = strength.details;
  const min = Math.min(비겁, 인성, 식상, 재성, 관성);

  let primary: FiveElement;
  if (관성 === min) primary = controlledBy;
  else if (재성 === min) primary = controlling;
  else if (식상 === min) primary = generating;
  else if (인성 === min) primary = generatedBy;
  else primary = dayElement;

  return {
    primary,
    secondary: undefined,
    basis: '중화 상태이므로 부족한 오행 보충',
    favorable: [primary],
    unfavorable: [],
  };
}

/* ========== 통합 분석 함수 ========== */

export function analyzeAdvancedSaju(
  dayMaster: { name: string; element: FiveElement; yin_yang: YinYang },
  pillars: {
    yearPillar: PillarInput;
    monthPillar: PillarInput;
    dayPillar: PillarInput;
    timePillar: PillarInput;
  }
): AdvancedSajuAnalysis {
  const strength = analyzeStrength(dayMaster, pillars);
  const geokguk = analyzeGeokguk(dayMaster, pillars, strength);
  const yongsin = analyzeYongsin(dayMaster, strength, geokguk);

  return {
    strength,
    geokguk,
    yongsin,
  };
}

/* ========== 용신 기반 운세 해석 유틸 ========== */

// 특정 오행이 용신/기신인지 판단
export function evaluateElementInfluence(
  element: FiveElement,
  yongsin: YongsinAnalysis
): '용신' | '희신' | '기신' | '한신' | '구신' {
  if (element === yongsin.primary) return '용신';
  if (yongsin.favorable.includes(element)) return '희신';
  if (yongsin.unfavorable.includes(element)) return '기신';
  // 그 외는 한신(閑神) 또는 구신(仇神)
  return '한신';
}

// 대운/세운 천간 지지의 용신 부합 여부 점수
export function scoreUnseElement(
  stemElement: FiveElement,
  branchElement: FiveElement,
  yongsin: YongsinAnalysis
): number {
  let score = 0;

  // 천간 점수
  if (stemElement === yongsin.primary) score += 3;
  else if (yongsin.secondary && stemElement === yongsin.secondary) score += 2;
  else if (yongsin.favorable.includes(stemElement)) score += 1;
  else if (yongsin.unfavorable.includes(stemElement)) score -= 2;

  // 지지 점수
  if (branchElement === yongsin.primary) score += 3;
  else if (yongsin.secondary && branchElement === yongsin.secondary) score += 2;
  else if (yongsin.favorable.includes(branchElement)) score += 1;
  else if (yongsin.unfavorable.includes(branchElement)) score -= 2;

  return score;
}

/* ========== 통근/득령/득지/득세 분석 ========== */

export interface RootAnalysis {
  hasRoot: boolean;           // 통근 여부 (지지에 뿌리가 있는지)
  rootBranches: string[];     // 통근 지지 목록
  deukryeong: boolean;        // 득령 (월지가 일간을 돕는지)
  deukji: boolean;            // 득지 (일지가 일간을 돕는지)
  deukse: boolean;            // 득세 (천간에 비겁/인성이 많은지)
  totalRootScore: number;     // 총 통근 점수
}

// 일간의 통근(通根) 분석 - 지지에 일간과 같은 오행이 있는지
export function analyzeRoot(
  dayMaster: { name: string; element: FiveElement },
  pillars: {
    yearPillar: PillarInput;
    monthPillar: PillarInput;
    dayPillar: PillarInput;
    timePillar: PillarInput;
  }
): RootAnalysis {
  const dayElement = dayMaster.element;
  const rootBranches: string[] = [];
  let totalRootScore = 0;

  // 각 지지의 지장간에서 일간과 같은 오행 찾기
  const branches = [
    { name: pillars.yearPillar.earthlyBranch.name, position: 'year', weight: 1 },
    { name: pillars.monthPillar.earthlyBranch.name, position: 'month', weight: 3 }, // 월지 가중치 높음
    { name: pillars.dayPillar.earthlyBranch.name, position: 'day', weight: 2 },
    { name: pillars.timePillar.earthlyBranch.name, position: 'time', weight: 1 },
  ];

  for (const branch of branches) {
    const hiddenStems = getHiddenStems(branch.name);
    for (const { stem, weight } of hiddenStems) {
      // 일간과 같은 오행이거나 일간을 생하는 오행
      if (stem.element === dayElement || FIVE_ELEMENT_RELATIONS.생받는관계[dayElement] === stem.element) {
        rootBranches.push(branch.name);
        totalRootScore += branch.weight * weight;
        break;
      }
    }
  }

  // 득령: 월지가 일간을 돕는지
  const monthBranchElement = pillars.monthPillar.earthlyBranch.element;
  const deukryeong = isHelpingElement(dayElement, monthBranchElement);

  // 득지: 일지가 일간을 돕는지
  const dayBranchElement = pillars.dayPillar.earthlyBranch.element;
  const deukji = isHelpingElement(dayElement, dayBranchElement);

  // 득세: 천간에 비겁/인성이 많은지 (2개 이상)
  let helpingStemCount = 0;
  const stems = [
    pillars.yearPillar.heavenlyStem,
    pillars.monthPillar.heavenlyStem,
    pillars.timePillar.heavenlyStem,
  ];
  for (const stem of stems) {
    if (isHelpingElement(dayElement, stem.element)) {
      helpingStemCount++;
    }
  }
  const deukse = helpingStemCount >= 2;

  return {
    hasRoot: rootBranches.length > 0,
    rootBranches,
    deukryeong,
    deukji,
    deukse,
    totalRootScore,
  };
}

/* ========== 조후용신(調候用神) ========== */

export type Season = '춘' | '하' | '추' | '동';

// 월지로 계절 판단
export function getSeasonFromMonthBranch(monthBranchName: string): Season {
  const seasonMap: Record<string, Season> = {
    '寅': '춘', '卯': '춘', '辰': '춘',
    '巳': '하', '午': '하', '未': '하',
    '申': '추', '酉': '추', '戌': '추',
    '亥': '동', '子': '동', '丑': '동',
  };
  return seasonMap[monthBranchName] || '춘';
}

// 조후용신 테이블
const JOHU_YONGSIN_TABLE: Record<string, Record<Season, { primary: FiveElement; secondary: FiveElement }>> = {
  '甲': { '춘': { primary: '화', secondary: '수' }, '하': { primary: '수', secondary: '금' }, '추': { primary: '화', secondary: '수' }, '동': { primary: '화', secondary: '토' } },
  '乙': { '춘': { primary: '화', secondary: '수' }, '하': { primary: '수', secondary: '금' }, '추': { primary: '화', secondary: '수' }, '동': { primary: '화', secondary: '토' } },
  '丙': { '춘': { primary: '목', secondary: '토' }, '하': { primary: '수', secondary: '금' }, '추': { primary: '목', secondary: '토' }, '동': { primary: '목', secondary: '토' } },
  '丁': { '춘': { primary: '목', secondary: '금' }, '하': { primary: '수', secondary: '금' }, '추': { primary: '목', secondary: '토' }, '동': { primary: '목', secondary: '토' } },
  '戊': { '춘': { primary: '화', secondary: '금' }, '하': { primary: '수', secondary: '금' }, '추': { primary: '화', secondary: '목' }, '동': { primary: '화', secondary: '목' } },
  '己': { '춘': { primary: '화', secondary: '금' }, '하': { primary: '수', secondary: '금' }, '추': { primary: '화', secondary: '목' }, '동': { primary: '화', secondary: '목' } },
  '庚': { '춘': { primary: '토', secondary: '화' }, '하': { primary: '수', secondary: '토' }, '추': { primary: '화', secondary: '목' }, '동': { primary: '화', secondary: '토' } },
  '辛': { '춘': { primary: '토', secondary: '수' }, '하': { primary: '수', secondary: '토' }, '추': { primary: '화', secondary: '수' }, '동': { primary: '화', secondary: '토' } },
  '壬': { '춘': { primary: '금', secondary: '토' }, '하': { primary: '금', secondary: '토' }, '추': { primary: '화', secondary: '목' }, '동': { primary: '화', secondary: '목' } },
  '癸': { '춘': { primary: '금', secondary: '화' }, '하': { primary: '금', secondary: '수' }, '추': { primary: '화', secondary: '목' }, '동': { primary: '화', secondary: '목' } },
};

export interface JohuYongsinAnalysis {
  season: Season;
  primary: FiveElement;
  secondary: FiveElement;
  description: string;
}

// 조후용신 분석
export function analyzeJohuYongsin(
  dayMasterName: string,
  monthBranchName: string
): JohuYongsinAnalysis {
  const season = getSeasonFromMonthBranch(monthBranchName);
  const johu = JOHU_YONGSIN_TABLE[dayMasterName]?.[season];

  if (!johu) {
    return {
      season,
      primary: '토',
      secondary: '토',
      description: '조후용신 판단 불가',
    };
  }

  const descriptions: Record<string, Record<Season, string>> = {
    '甲': {
      '춘': '봄 갑목: 목왕하니 화로 설기, 수로 윤택하게',
      '하': '여름 갑목: 화태과하니 수로 조열, 금으로 제목',
      '추': '가을 갑목: 금왕하니 화로 제금, 수로 생목',
      '동': '겨울 갑목: 수태과하니 화로 따뜻하게',
    },
    '乙': {
      '춘': '봄 을목: 목왕하니 화로 설기',
      '하': '여름 을목: 화태과하니 수로 자윤',
      '추': '가을 을목: 금왕하니 화로 금을 녹임',
      '동': '겨울 을목: 한랭하니 화가 급선무',
    },
    '丙': {
      '춘': '봄 병화: 목생화하니 토로 설기',
      '하': '여름 병화: 화태과하니 수로 조후 필수',
      '추': '가을 병화: 금왕하니 목으로 생화',
      '동': '겨울 병화: 수왕하니 목으로 통관생화',
    },
    '丁': {
      '춘': '봄 정화: 목생화하니 강함, 금재로 부',
      '하': '여름 정화: 화태과하니 수로 조후',
      '추': '가을 정화: 금왕하니 목으로 생화',
      '동': '겨울 정화: 한랭하니 목으로 생화 급선무',
    },
    '戊': {
      '춘': '봄 무토: 목왕하니 화로 통관',
      '하': '여름 무토: 화생토하니 수로 윤택',
      '추': '가을 무토: 금설기하니 화로 난토',
      '동': '겨울 무토: 한습하니 화로 따뜻하게',
    },
    '己': {
      '춘': '봄 기토: 목극토하니 화로 통관',
      '하': '여름 기토: 조열하니 수로 윤택',
      '추': '가을 기토: 금설기하니 화로 따뜻하게',
      '동': '겨울 기토: 한습하니 화가 급선무',
    },
    '庚': {
      '춘': '봄 경금: 목왕하니 토로 생금, 화로 제련',
      '하': '여름 경금: 화극금하니 수로 조후 필수',
      '추': '가을 경금: 금태왕하니 화로 제련',
      '동': '겨울 경금: 수다금침하니 화로 따뜻하게',
    },
    '辛': {
      '춘': '봄 신금: 목왕하니 토로 생금',
      '하': '여름 신금: 화태과하니 수로 조후 필수',
      '추': '가을 신금: 금태왕하니 화로 제련',
      '동': '겨울 신금: 한랭하니 화로 따뜻하게',
    },
    '壬': {
      '춘': '봄 임수: 목설기하니 금으로 생수',
      '하': '여름 임수: 화태과하니 금생수로 원천',
      '추': '가을 임수: 금생수하니 토로 제수, 목으로 설기',
      '동': '겨울 임수: 수태과하니 화로 따뜻하게',
    },
    '癸': {
      '춘': '봄 계수: 목설기하니 금으로 생수',
      '하': '여름 계수: 화태과하니 금생수로 원천',
      '추': '가을 계수: 금생수하니 화로 따뜻하게',
      '동': '겨울 계수: 수태과하니 화로 따뜻하게',
    },
  };

  return {
    season,
    primary: johu.primary,
    secondary: johu.secondary,
    description: descriptions[dayMasterName]?.[season] || '조후용신 설명 없음',
  };
}

/* ========== 확장된 고급 분석 ========== */

export interface ExtendedAdvancedAnalysis extends AdvancedSajuAnalysis {
  root: RootAnalysis;
  johu: JohuYongsinAnalysis;
  finalYongsin: FiveElement;  // 격용신 + 조후용신 종합
  finalYongsinBasis: string;
}

// 확장된 통합 분석 (기존 analyzeAdvancedSaju + 통근 + 조후)
export function analyzeExtendedSaju(
  dayMaster: { name: string; element: FiveElement; yin_yang: YinYang },
  pillars: {
    yearPillar: PillarInput;
    monthPillar: PillarInput;
    dayPillar: PillarInput;
    timePillar: PillarInput;
  }
): ExtendedAdvancedAnalysis {
  const basic = analyzeAdvancedSaju(dayMaster, pillars);
  const root = analyzeRoot(dayMaster, pillars);
  const johu = analyzeJohuYongsin(dayMaster.name, pillars.monthPillar.earthlyBranch.name);

  // 최종 용신 결정: 격용신과 조후용신이 같으면 확정, 다르면 조후 우선
  let finalYongsin: FiveElement;
  let finalYongsinBasis: string;

  if (basic.yongsin.primary === johu.primary) {
    finalYongsin = basic.yongsin.primary;
    finalYongsinBasis = '격용신과 조후용신 일치';
  } else {
    // 극신강/극신약은 격용신 우선, 그 외는 조후 고려
    if (basic.strength.level === '극신강' || basic.strength.level === '극신약') {
      finalYongsin = basic.yongsin.primary;
      finalYongsinBasis = '극단적 신강/신약으로 격용신 우선';
    } else {
      // 조후가 급한 계절(하/동)이면 조후 우선
      if (johu.season === '하' || johu.season === '동') {
        finalYongsin = johu.primary;
        finalYongsinBasis = `${johu.season === '하' ? '여름' : '겨울'} 조후 급선무`;
      } else {
        finalYongsin = basic.yongsin.primary;
        finalYongsinBasis = '봄/가을로 격용신 우선';
      }
    }
  }

  return {
    ...basic,
    root,
    johu,
    finalYongsin,
    finalYongsinBasis,
  };
}
