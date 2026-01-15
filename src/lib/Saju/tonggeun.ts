// src/lib/Saju/tonggeun.ts
// 통근(通根), 투출(透出), 회국(會局) 계산 모듈
// 일간 및 오행의 실제 힘을 정밀하게 계산

import { FiveElement, YinYang, SajuPillarsInput } from './types';
import { JIJANGGAN } from './constants';
import { getStemElement, getStemYinYang, getBranchElement } from './stemBranchUtils';

// Re-export for backward compatibility
export type { SajuPillarsInput };

/**
 * 통근 결과
 */
export interface TonggeunResult {
  stem: string;
  roots: Array<{
    branch: string;
    pillar: 'year' | 'month' | 'day' | 'time';
    hiddenStem: string;
    type: '정기' | '중기' | '여기';
    strength: number;  // 0-100
  }>;
  totalStrength: number;  // 통근력 총합
  hasRoot: boolean;       // 통근 여부
}

/**
 * 투출 결과
 */
export interface TuechulResult {
  branch: string;
  pillar: 'year' | 'month' | 'day' | 'time';
  hiddenStems: Array<{
    stem: string;
    type: '정기' | '중기' | '여기';
    transparent: boolean;    // 천간에 투출되었는지
    transparentPillar?: 'year' | 'month' | 'day' | 'time';
  }>;
}

/**
 * 회국 결과
 */
export interface HoegukResult {
  type: '삼합' | '방합' | '반합';
  branches: string[];
  resultElement: FiveElement;
  complete: boolean;  // 완전한 합인지
  strength: number;   // 회국 강도 (0-100)
}

/**
 * 득령 결과
 */
export interface DeukryeongResult {
  daymaster: string;
  monthBranch: string;
  status: '득령' | '실령' | '평령';
  strength: number;  // 득령 강도 (-100 ~ 100)
  description: string;
}

/**
 * 종합 세력 분석 결과 (통근/득령/회국 기반)
 */
export interface TonggeunStrengthAnalysis {
  daymaster: string;
  daymasterElement: FiveElement;
  tonggeun: TonggeunResult;
  deukryeong: DeukryeongResult;
  hoeguk: HoegukResult[];
  elementStrengths: Record<FiveElement, number>;
  finalStrength: '극신강' | '신강' | '중화' | '신약' | '극신약';
  score: number;  // -100 ~ 100
}

/** @deprecated Use TonggeunStrengthAnalysis instead */
export type StrengthAnalysis = TonggeunStrengthAnalysis;

// ============ 통근 계산 ============

/**
 * 지장간 강도 계산
 * 정기 > 중기 > 여기 순서로 힘이 강함
 */
const JIJANGGAN_STRENGTH: Record<string, number> = {
  '정기': 100,
  '중기': 60,
  '여기': 30
};

/**
 * 기둥별 통근 강도 가중치
 * 일지 > 월지 > 시지 > 년지
 */
const PILLAR_WEIGHT: Record<string, number> = {
  'day': 1.0,    // 일지: 100%
  'month': 0.8,  // 월지: 80%
  'time': 0.6,   // 시지: 60%
  'year': 0.4    // 년지: 40%
};

/**
 * 천간의 통근 여부 및 강도 계산
 */
export function calculateTonggeun(stem: string, pillars: SajuPillarsInput): TonggeunResult {
  const roots: TonggeunResult['roots'] = [];
  let totalStrength = 0;

  const pillarEntries: Array<{ key: 'year' | 'month' | 'day' | 'time'; branch: string }> = [
    { key: 'year', branch: pillars.year.branch },
    { key: 'month', branch: pillars.month.branch },
    { key: 'day', branch: pillars.day.branch },
    { key: 'time', branch: pillars.time.branch },
  ];

  for (const { key, branch } of pillarEntries) {
    const jijanggan = JIJANGGAN[branch];
    if (!jijanggan) continue;

    for (const [type, hiddenStem] of Object.entries(jijanggan)) {
      if (hiddenStem === stem) {
        // 같은 천간이 지장간에 있으면 통근
        const baseStrength = JIJANGGAN_STRENGTH[type] || 0;
        const weight = PILLAR_WEIGHT[key] || 0.5;
        const strength = Math.round(baseStrength * weight);

        roots.push({
          branch,
          pillar: key,
          hiddenStem,
          type: type as '정기' | '중기' | '여기',
          strength
        });
        totalStrength += strength;
      } else {
        // 같은 오행이면 부분 통근 (동기통근)
        const stemElement = getStemElement(stem);
        const hiddenElement = getStemElement(hiddenStem);
        if (stemElement === hiddenElement) {
          const baseStrength = (JIJANGGAN_STRENGTH[type] || 0) * 0.5; // 50% 감소
          const weight = PILLAR_WEIGHT[key] || 0.5;
          const strength = Math.round(baseStrength * weight);

          roots.push({
            branch,
            pillar: key,
            hiddenStem,
            type: type as '정기' | '중기' | '여기',
            strength
          });
          totalStrength += strength;
        }
      }
    }
  }

  return {
    stem,
    roots,
    totalStrength: Math.min(totalStrength, 200), // 최대 200
    hasRoot: roots.length > 0
  };
}

// ============ 투출 계산 ============

/**
 * 지지의 지장간이 천간에 투출되었는지 확인
 */
export function calculateTuechul(pillars: SajuPillarsInput): TuechulResult[] {
  const results: TuechulResult[] = [];
  const allStems = [
    { stem: pillars.year.stem, pillar: 'year' as const },
    { stem: pillars.month.stem, pillar: 'month' as const },
    { stem: pillars.day.stem, pillar: 'day' as const },
    { stem: pillars.time.stem, pillar: 'time' as const },
  ];

  const pillarEntries: Array<{ key: 'year' | 'month' | 'day' | 'time'; branch: string }> = [
    { key: 'year', branch: pillars.year.branch },
    { key: 'month', branch: pillars.month.branch },
    { key: 'day', branch: pillars.day.branch },
    { key: 'time', branch: pillars.time.branch },
  ];

  for (const { key, branch } of pillarEntries) {
    const jijanggan = JIJANGGAN[branch];
    if (!jijanggan) continue;

    const hiddenStems: TuechulResult['hiddenStems'] = [];

    for (const [type, hiddenStem] of Object.entries(jijanggan)) {
      const transparentInfo = allStems.find(s => s.stem === hiddenStem);

      hiddenStems.push({
        stem: hiddenStem,
        type: type as '정기' | '중기' | '여기',
        transparent: !!transparentInfo,
        transparentPillar: transparentInfo?.pillar
      });
    }

    results.push({
      branch,
      pillar: key,
      hiddenStems
    });
  }

  return results;
}

/**
 * 월지 지장간 투출 우선순위 확인 (격국 판정용)
 */
export function getMonthBranchTransparency(pillars: SajuPillarsInput): {
  transparentStem: string | null;
  transparentType: '정기' | '중기' | '여기' | null;
  priority: number;
} {
  const monthBranch = pillars.month.branch;
  const jijanggan = JIJANGGAN[monthBranch];
  if (!jijanggan) return { transparentStem: null, transparentType: null, priority: 0 };

  const allStems = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.time.stem,
  ];

  // 정기 > 중기 > 여기 순서로 투출 확인
  const order: Array<'정기' | '중기' | '여기'> = ['정기', '중기', '여기'];
  const priorities: Record<string, number> = { '정기': 3, '중기': 2, '여기': 1 };

  for (const type of order) {
    const hiddenStem = jijanggan[type];
    if (hiddenStem && allStems.includes(hiddenStem)) {
      return {
        transparentStem: hiddenStem,
        transparentType: type,
        priority: priorities[type]
      };
    }
  }

  return { transparentStem: null, transparentType: null, priority: 0 };
}

// ============ 회국 계산 ============

/**
 * 삼합 정의
 */
const SAMHAP: Array<{ branches: string[]; result: FiveElement }> = [
  { branches: ['申', '子', '辰'], result: '수' },  // 신자진 수국
  { branches: ['寅', '午', '戌'], result: '화' },  // 인오술 화국
  { branches: ['巳', '酉', '丑'], result: '금' },  // 사유축 금국
  { branches: ['亥', '卯', '未'], result: '목' },  // 해묘미 목국
];

/**
 * 방합 정의
 */
const BANGHAP: Array<{ branches: string[]; result: FiveElement }> = [
  { branches: ['寅', '卯', '辰'], result: '목' },  // 인묘진 동방목국
  { branches: ['巳', '午', '未'], result: '화' },  // 사오미 남방화국
  { branches: ['申', '酉', '戌'], result: '금' },  // 신유술 서방금국
  { branches: ['亥', '子', '丑'], result: '수' },  // 해자축 북방수국
];

/**
 * 반합(半合) 정의 - 삼합의 2개만 있는 경우
 */
const BANHAP: Array<{ branches: string[]; result: FiveElement; center: string }> = [
  // 수국 반합
  { branches: ['申', '子'], result: '수', center: '子' },
  { branches: ['子', '辰'], result: '수', center: '子' },
  // 화국 반합
  { branches: ['寅', '午'], result: '화', center: '午' },
  { branches: ['午', '戌'], result: '화', center: '午' },
  // 금국 반합
  { branches: ['巳', '酉'], result: '금', center: '酉' },
  { branches: ['酉', '丑'], result: '금', center: '酉' },
  // 목국 반합
  { branches: ['亥', '卯'], result: '목', center: '卯' },
  { branches: ['卯', '未'], result: '목', center: '卯' },
];

/**
 * 회국 계산
 */
export function calculateHoeguk(pillars: SajuPillarsInput): HoegukResult[] {
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.time.branch
  ];
  const results: HoegukResult[] = [];

  // 삼합 체크
  for (const samhap of SAMHAP) {
    const matchCount = samhap.branches.filter(b => branches.includes(b)).length;
    if (matchCount === 3) {
      results.push({
        type: '삼합',
        branches: samhap.branches,
        resultElement: samhap.result,
        complete: true,
        strength: 100
      });
    }
  }

  // 방합 체크
  for (const banghap of BANGHAP) {
    const matchCount = banghap.branches.filter(b => branches.includes(b)).length;
    if (matchCount === 3) {
      results.push({
        type: '방합',
        branches: banghap.branches,
        resultElement: banghap.result,
        complete: true,
        strength: 90
      });
    }
  }

  // 반합 체크 (삼합이 없을 때만)
  if (results.filter(r => r.type === '삼합').length === 0) {
    for (const banhap of BANHAP) {
      const hasAll = banhap.branches.every(b => branches.includes(b));
      if (hasAll) {
        results.push({
          type: '반합',
          branches: banhap.branches,
          resultElement: banhap.result,
          complete: false,
          strength: 50
        });
      }
    }
  }

  return results;
}

// ============ 득령 계산 ============

/**
 * 월지별 왕상휴수사(旺相休囚死) 계산
 */
const MONTH_ELEMENT_MAP: Record<string, FiveElement> = {
  '寅': '목', '卯': '목', '辰': '토',
  '巳': '화', '午': '화', '未': '토',
  '申': '금', '酉': '금', '戌': '토',
  '亥': '수', '子': '수', '丑': '토'
};

/**
 * 왕상휴수사 계산
 * 旺(100): 같은 오행
 * 相(80): 나를 생하는 오행
 * 休(0): 내가 생하는 오행
 * 囚(-50): 나를 극하는 오행
 * 死(-80): 내가 극하는 오행
 */
export function calculateDeukryeong(daymaster: string, monthBranch: string): DeukryeongResult {
  const daymasterElement = getStemElement(daymaster);
  const monthElement = MONTH_ELEMENT_MAP[monthBranch] || '토';

  // 오행 관계 매핑
  const relations: Record<FiveElement, Record<FiveElement, { status: '득령' | '실령' | '평령'; strength: number; desc: string }>> = {
    '목': {
      '목': { status: '득령', strength: 100, desc: '목왕절, 득령' },
      '수': { status: '득령', strength: 80, desc: '수생목, 상령' },
      '화': { status: '평령', strength: 0, desc: '목생화, 휴령' },
      '금': { status: '실령', strength: -50, desc: '금극목, 수령' },
      '토': { status: '실령', strength: -80, desc: '목극토, 사령' },
    },
    '화': {
      '화': { status: '득령', strength: 100, desc: '화왕절, 득령' },
      '목': { status: '득령', strength: 80, desc: '목생화, 상령' },
      '토': { status: '평령', strength: 0, desc: '화생토, 휴령' },
      '수': { status: '실령', strength: -50, desc: '수극화, 수령' },
      '금': { status: '실령', strength: -80, desc: '화극금, 사령' },
    },
    '토': {
      '토': { status: '득령', strength: 100, desc: '토왕절, 득령' },
      '화': { status: '득령', strength: 80, desc: '화생토, 상령' },
      '금': { status: '평령', strength: 0, desc: '토생금, 휴령' },
      '목': { status: '실령', strength: -50, desc: '목극토, 수령' },
      '수': { status: '실령', strength: -80, desc: '토극수, 사령' },
    },
    '금': {
      '금': { status: '득령', strength: 100, desc: '금왕절, 득령' },
      '토': { status: '득령', strength: 80, desc: '토생금, 상령' },
      '수': { status: '평령', strength: 0, desc: '금생수, 휴령' },
      '화': { status: '실령', strength: -50, desc: '화극금, 수령' },
      '목': { status: '실령', strength: -80, desc: '금극목, 사령' },
    },
    '수': {
      '수': { status: '득령', strength: 100, desc: '수왕절, 득령' },
      '금': { status: '득령', strength: 80, desc: '금생수, 상령' },
      '목': { status: '평령', strength: 0, desc: '수생목, 휴령' },
      '토': { status: '실령', strength: -50, desc: '토극수, 수령' },
      '화': { status: '실령', strength: -80, desc: '수극화, 사령' },
    },
  };

  const result = relations[daymasterElement]?.[monthElement] || {
    status: '평령' as const,
    strength: 0,
    desc: '판정 불가'
  };

  return {
    daymaster,
    monthBranch,
    status: result.status,
    strength: result.strength,
    description: result.desc
  };
}

// ============ 종합 세력 분석 ============

/**
 * 오행별 힘 계산
 */
export function calculateElementStrengths(pillars: SajuPillarsInput): Record<FiveElement, number> {
  const strengths: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // 천간 기본 힘 (각 10점)
  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.time.stem];
  for (const stem of stems) {
    const element = getStemElement(stem);
    strengths[element] += 10;
  }

  // 지지 기본 힘 (각 15점)
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.time.branch];
  for (const branch of branches) {
    const element = getBranchElement(branch);
    strengths[element] += 15;
  }

  // 지장간 힘 (정기 10, 중기 5, 여기 3)
  for (const branch of branches) {
    const jijanggan = JIJANGGAN[branch];
    if (!jijanggan) continue;

    if (jijanggan.정기) {
      strengths[getStemElement(jijanggan.정기)] += 10;
    }
    if (jijanggan.중기) {
      strengths[getStemElement(jijanggan.중기)] += 5;
    }
    if (jijanggan.여기) {
      strengths[getStemElement(jijanggan.여기)] += 3;
    }
  }

  // 회국 보너스
  const hoeguk = calculateHoeguk(pillars);
  for (const hg of hoeguk) {
    if (hg.complete) {
      strengths[hg.resultElement] += 30;
    } else {
      strengths[hg.resultElement] += 15;
    }
  }

  return strengths;
}

/**
 * 종합 세력 분석
 */
export function analyzeStrength(pillars: SajuPillarsInput): StrengthAnalysis {
  const daymaster = pillars.day.stem;
  const daymasterElement = getStemElement(daymaster);

  // 통근 계산
  const tonggeun = calculateTonggeun(daymaster, pillars);

  // 득령 계산
  const deukryeong = calculateDeukryeong(daymaster, pillars.month.branch);

  // 회국 계산
  const hoeguk = calculateHoeguk(pillars);

  // 오행별 힘 계산
  const elementStrengths = calculateElementStrengths(pillars);

  // 일간을 돕는 힘 (비겁 + 인성)
  const supportElement = {
    '목': '수', '화': '목', '토': '화', '금': '토', '수': '금'
  }[daymasterElement] as FiveElement;

  const supportPower = elementStrengths[daymasterElement] + elementStrengths[supportElement];

  // 일간을 약하게 하는 힘 (식상 + 재성 + 관성)
  const drainElement = {
    '목': '화', '화': '토', '토': '금', '금': '수', '수': '목'
  }[daymasterElement] as FiveElement;
  const wealthElement = {
    '목': '토', '화': '금', '토': '수', '금': '목', '수': '화'
  }[daymasterElement] as FiveElement;
  const officerElement = {
    '목': '금', '화': '수', '토': '목', '금': '화', '수': '토'
  }[daymasterElement] as FiveElement;

  const weakenPower = elementStrengths[drainElement] + elementStrengths[wealthElement] + elementStrengths[officerElement];

  // 종합 점수 계산
  let score = 0;

  // 통근 점수 (최대 40점)
  score += Math.min(tonggeun.totalStrength / 5, 40);

  // 득령 점수 (최대 30점)
  score += deukryeong.strength * 0.3;

  // 비겁+인성 vs 식상+재성+관성 비교 (최대 30점)
  const ratio = (supportPower - weakenPower) / (supportPower + weakenPower + 1);
  score += ratio * 30;

  // 강약 판정
  let finalStrength: StrengthAnalysis['finalStrength'];
  if (score > 50) finalStrength = '극신강';
  else if (score > 20) finalStrength = '신강';
  else if (score > -20) finalStrength = '중화';
  else if (score > -50) finalStrength = '신약';
  else finalStrength = '극신약';

  return {
    daymaster,
    daymasterElement,
    tonggeun,
    deukryeong,
    hoeguk,
    elementStrengths,
    finalStrength,
    score: Math.round(score)
  };
}

/**
 * 특정 천간의 힘 평가 (격국 판정용)
 */
export function evaluateStemPower(stem: string, pillars: SajuPillarsInput): {
  tonggeunScore: number;
  transparentScore: number;
  hoegukBonus: number;
  total: number;
  description: string;
} {
  const tonggeun = calculateTonggeun(stem, pillars);
  const stemElement = getStemElement(stem);

  // 투출 점수 (월지 기준)
  const monthTuechul = getMonthBranchTransparency(pillars);
  const transparentScore = monthTuechul.transparentStem === stem ? monthTuechul.priority * 20 : 0;

  // 회국 보너스
  const hoeguk = calculateHoeguk(pillars);
  let hoegukBonus = 0;
  for (const hg of hoeguk) {
    if (hg.resultElement === stemElement) {
      hoegukBonus += hg.complete ? 30 : 15;
    }
  }

  const total = tonggeun.totalStrength + transparentScore + hoegukBonus;

  let description = '';
  if (total >= 100) description = '매우 강함';
  else if (total >= 60) description = '강함';
  else if (total >= 30) description = '보통';
  else if (total > 0) description = '약함';
  else description = '무력';

  return {
    tonggeunScore: tonggeun.totalStrength,
    transparentScore,
    hoegukBonus,
    total,
    description
  };
}
