// src/lib/Saju/hyeongchung.ts
// 형충회합(刑沖會合) 작용력 계산 모듈
// 지지(地支) 간의 상호작용 분석

// ============ 타입 정의 ============

/** 간단한 기둥 인터페이스 */
interface Pillar {
  stem: string;
  branch: string;
}

/** 기둥 위치 */
export type PillarPosition = 'year' | 'month' | 'day' | 'hour';

/** 작용 유형 */
export type InteractionType =
  | '육합'    // 六合 - 지지 1:1 합
  | '삼합'    // 三合 - 3개 지지 합
  | '반합'    // 半合 - 삼합의 2개
  | '방합'    // 方合 - 계절 방위 합
  | '충'      // 沖 - 상충
  | '형'      // 刑 - 형벌
  | '해'      // 害 - 해침
  | '파'      // 破 - 파쇄
  | '원진'    // 怨嗔 - 원망
  | '귀문'    // 鬼門 - 귀문관살;

/** 형(刑) 세부 유형 */
export type HyeongType =
  | '삼형'      // 三刑 - 寅巳申, 丑戌未
  | '자형'      // 自刑 - 辰辰, 午午, 酉酉, 亥亥
  | '상형'      // 相刑 - 子卯
  | '무은지형'  // 無恩之刑 - 寅巳申
  | '시세지형'  // 恃勢之刑 - 丑戌未
  | '무례지형'; // 無禮之刑 - 子卯

/** 합(合) 결과 오행 */
export type MergedElement = '木' | '火' | '土' | '金' | '水' | null;

/** 작용 결과 */
export interface InteractionResult {
  type: InteractionType;
  subType?: HyeongType | string;
  branches: string[];
  pillars: PillarPosition[];
  strength: number;        // 0-100 작용력
  mergedElement?: MergedElement;
  description: string;
  effect: '길' | '흉' | '중립';
}

/** 전체 분석 결과 */
export interface HyeongchungAnalysis {
  interactions: InteractionResult[];
  summary: {
    totalPositive: number;
    totalNegative: number;
    dominantInteraction: InteractionType | null;
    netEffect: '길' | '흉' | '중립';
  };
  warnings: string[];
}

// ============ 상수 정의 ============

/** 지지 배열 */
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 육합(六合) - 지지 1:1 합, 합화 오행 */
const YUKAP: Record<string, { partner: string; element: MergedElement }> = {
  '子': { partner: '丑', element: '土' },
  '丑': { partner: '子', element: '土' },
  '寅': { partner: '亥', element: '木' },
  '亥': { partner: '寅', element: '木' },
  '卯': { partner: '戌', element: '火' },
  '戌': { partner: '卯', element: '火' },
  '辰': { partner: '酉', element: '金' },
  '酉': { partner: '辰', element: '金' },
  '巳': { partner: '申', element: '水' },
  '申': { partner: '巳', element: '水' },
  '午': { partner: '未', element: '土' }, // 일부는 火로 보기도 함
  '未': { partner: '午', element: '土' },
};

/** 삼합(三合) - 3개 지지 합, 합화 오행 */
const SAMHAP: Array<{ branches: string[]; element: MergedElement }> = [
  { branches: ['申', '子', '辰'], element: '水' }, // 수국
  { branches: ['寅', '午', '戌'], element: '火' }, // 화국
  { branches: ['巳', '酉', '丑'], element: '金' }, // 금국
  { branches: ['亥', '卯', '未'], element: '木' }, // 목국
];

/** 방합(方合) - 계절/방위 합 */
const BANGHAP: Array<{ branches: string[]; element: MergedElement; season: string }> = [
  { branches: ['寅', '卯', '辰'], element: '木', season: '봄' },
  { branches: ['巳', '午', '未'], element: '火', season: '여름' },
  { branches: ['申', '酉', '戌'], element: '金', season: '가을' },
  { branches: ['亥', '子', '丑'], element: '水', season: '겨울' },
];

/** 충(沖) - 6쌍의 상충 */
const CHUNG: Array<[string, string]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

/** 형(刑) 정의 */
const HYEONG = {
  // 무은지형(無恩之刑) - 寅巳申
  무은지형: ['寅', '巳', '申'],
  // 시세지형(恃勢之刑) - 丑戌未
  시세지형: ['丑', '戌', '未'],
  // 무례지형(無禮之刑) - 子卯
  무례지형: ['子', '卯'],
  // 자형(自刑) - 같은 지지끼리
  자형: ['辰', '午', '酉', '亥'],
};

/** 해(害) - 6쌍 */
const HAE: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

/** 파(破) - 4쌍 */
const PA: Array<[string, string]> = [
  ['子', '酉'],
  ['卯', '午'],
  ['丑', '辰'],
  ['戌', '未'],
];

/** 원진(怨嗔) - 6쌍 */
const WONJIN: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '酉'],
  ['卯', '申'],
  ['辰', '亥'],
  ['巳', '戌'],
];

/** 귀문관살(鬼門關煞) */
const GWIMUN: Array<[string, string]> = [
  ['寅', '未'],
  ['卯', '申'],
  ['辰', '酉'],
  ['巳', '戌'],
  ['午', '亥'],
];

/** 기둥 간 거리 (인접할수록 작용력 강함) */
const PILLAR_DISTANCE: Record<string, number> = {
  'year-month': 1,
  'month-day': 1,
  'day-hour': 1,
  'year-day': 2,
  'month-hour': 2,
  'year-hour': 3,
};

// ============ 유틸리티 함수 ============

/** 두 기둥 사이 거리 계산 */
function getPillarDistance(p1: PillarPosition, p2: PillarPosition): number {
  const key1 = `${p1}-${p2}`;
  const key2 = `${p2}-${p1}`;
  return PILLAR_DISTANCE[key1] ?? PILLAR_DISTANCE[key2] ?? 0;
}

/** 거리에 따른 작용력 가중치 */
function getDistanceMultiplier(distance: number): number {
  switch (distance) {
    case 1: return 1.0;   // 인접
    case 2: return 0.7;   // 1칸 건너
    case 3: return 0.4;   // 2칸 건너
    default: return 0.5;
  }
}

/** 기둥 위치에 따른 기본 작용력 */
function getBasePillarStrength(pillar: PillarPosition): number {
  switch (pillar) {
    case 'day': return 100;    // 일지 - 가장 강함
    case 'month': return 90;   // 월지 - 두 번째
    case 'hour': return 70;    // 시지
    case 'year': return 60;    // 년지 - 가장 약함
  }
}

// ============ 개별 작용 검사 함수 ============

/** 육합 검사 */
function checkYukap(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const p1 = positions[i];
      const p2 = positions[j];

      if (YUKAP[b1]?.partner === b2) {
        const distance = getPillarDistance(p1, p2);
        const baseStrength = 80;
        const strength = Math.round(baseStrength * getDistanceMultiplier(distance));

        results.push({
          type: '육합',
          branches: [b1, b2],
          pillars: [p1, p2],
          strength,
          mergedElement: YUKAP[b1].element,
          description: `${b1}${b2} 육합 → ${YUKAP[b1].element}`,
          effect: '길',
        });
      }
    }
  }

  return results;
}

/** 삼합 검사 */
function checkSamhap(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branchSet = new Set(branches);

  for (const samhap of SAMHAP) {
    const matches = samhap.branches.filter(b => branchSet.has(b));

    if (matches.length === 3) {
      // 완전 삼합
      const involvedPositions = samhap.branches.map(b => {
        const idx = branches.indexOf(b);
        return positions[idx];
      });

      results.push({
        type: '삼합',
        branches: [...matches],
        pillars: involvedPositions,
        strength: 100,
        mergedElement: samhap.element,
        description: `${matches.join('')} 삼합 → ${samhap.element}국`,
        effect: '길',
      });
    } else if (matches.length === 2) {
      // 반합 검사
      const involvedPositions = matches.map(b => {
        const idx = branches.indexOf(b);
        return positions[idx];
      });

      // 왕지(王支)가 포함되어 있으면 반합 성립
      const center = samhap.branches[1]; // 왕지는 중간
      const hasCenter = matches.includes(center);

      if (hasCenter) {
        results.push({
          type: '반합',
          subType: `${samhap.element}국 반합`,
          branches: [...matches],
          pillars: involvedPositions,
          strength: 60,
          mergedElement: samhap.element,
          description: `${matches.join('')} 반합 → ${samhap.element}국 미완성`,
          effect: '길',
        });
      }
    }
  }

  return results;
}

/** 방합 검사 */
function checkBanghap(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branchSet = new Set(branches);

  for (const banghap of BANGHAP) {
    const matches = banghap.branches.filter(b => branchSet.has(b));

    if (matches.length === 3) {
      const involvedPositions = banghap.branches.map(b => {
        const idx = branches.indexOf(b);
        return positions[idx];
      });

      results.push({
        type: '방합',
        subType: `${banghap.season} 방합`,
        branches: [...matches],
        pillars: involvedPositions,
        strength: 90,
        mergedElement: banghap.element,
        description: `${matches.join('')} 방합 → ${banghap.element}(${banghap.season})`,
        effect: '길',
      });
    }
  }

  return results;
}

/** 충 검사 */
function checkChung(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const p1 = positions[i];
      const p2 = positions[j];

      const isChung = CHUNG.some(
        ([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1)
      );

      if (isChung) {
        const distance = getPillarDistance(p1, p2);
        const baseStrength = 85;
        const strength = Math.round(baseStrength * getDistanceMultiplier(distance));

        // 특수 충 명칭
        let subType = '';
        if ((b1 === '子' && b2 === '午') || (b1 === '午' && b2 === '子')) {
          subType = '자오충(子午沖)';
        } else if ((b1 === '卯' && b2 === '酉') || (b1 === '酉' && b2 === '卯')) {
          subType = '묘유충(卯酉沖)';
        }

        results.push({
          type: '충',
          subType: subType || `${b1}${b2}충`,
          branches: [b1, b2],
          pillars: [p1, p2],
          strength,
          description: `${b1}${b2} 상충 - 변화와 충돌`,
          effect: '흉',
        });
      }
    }
  }

  return results;
}

/** 형 검사 */
function checkHyeong(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branchSet = new Set(branches);

  // 무은지형 (寅巳申) - 3개 중 2개 이상
  const muenMatches = HYEONG.무은지형.filter(b => branchSet.has(b));
  if (muenMatches.length >= 2) {
    const involvedPositions = muenMatches.map(b => {
      const idx = branches.indexOf(b);
      return positions[idx];
    });

    results.push({
      type: '형',
      subType: '무은지형',
      branches: [...muenMatches],
      pillars: involvedPositions,
      strength: muenMatches.length === 3 ? 90 : 60,
      description: `${muenMatches.join('')} 무은지형 - 은혜를 모름, 배신`,
      effect: '흉',
    });
  }

  // 시세지형 (丑戌未) - 3개 중 2개 이상
  const siseMatches = HYEONG.시세지형.filter(b => branchSet.has(b));
  if (siseMatches.length >= 2) {
    const involvedPositions = siseMatches.map(b => {
      const idx = branches.indexOf(b);
      return positions[idx];
    });

    results.push({
      type: '형',
      subType: '시세지형',
      branches: [...siseMatches],
      pillars: involvedPositions,
      strength: siseMatches.length === 3 ? 90 : 60,
      description: `${siseMatches.join('')} 시세지형 - 권세를 믿고 횡포`,
      effect: '흉',
    });
  }

  // 무례지형 (子卯)
  if (branchSet.has('子') && branchSet.has('卯')) {
    const idx1 = branches.indexOf('子');
    const idx2 = branches.indexOf('卯');

    results.push({
      type: '형',
      subType: '무례지형',
      branches: ['子', '卯'],
      pillars: [positions[idx1], positions[idx2]],
      strength: 70,
      description: '子卯 무례지형 - 예의를 모름',
      effect: '흉',
    });
  }

  // 자형 (辰辰, 午午, 酉酉, 亥亥)
  for (const b of HYEONG.자형) {
    const occurrences = branches.filter(br => br === b);
    if (occurrences.length >= 2) {
      const indices = branches.map((br, i) => br === b ? i : -1).filter(i => i !== -1);
      const involvedPositions = indices.map(i => positions[i]);

      results.push({
        type: '형',
        subType: '자형',
        branches: occurrences,
        pillars: involvedPositions,
        strength: 50,
        description: `${b}${b} 자형 - 스스로를 해침`,
        effect: '흉',
      });
    }
  }

  return results;
}

/** 해 검사 */
function checkHae(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const p1 = positions[i];
      const p2 = positions[j];

      const isHae = HAE.some(
        ([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1)
      );

      if (isHae) {
        const distance = getPillarDistance(p1, p2);
        const strength = Math.round(50 * getDistanceMultiplier(distance));

        results.push({
          type: '해',
          branches: [b1, b2],
          pillars: [p1, p2],
          strength,
          description: `${b1}${b2} 해 - 서로 해침`,
          effect: '흉',
        });
      }
    }
  }

  return results;
}

/** 파 검사 */
function checkPa(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const p1 = positions[i];
      const p2 = positions[j];

      const isPa = PA.some(
        ([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1)
      );

      if (isPa) {
        const distance = getPillarDistance(p1, p2);
        const strength = Math.round(40 * getDistanceMultiplier(distance));

        results.push({
          type: '파',
          branches: [b1, b2],
          pillars: [p1, p2],
          strength,
          description: `${b1}${b2} 파 - 파괴와 분쇄`,
          effect: '흉',
        });
      }
    }
  }

  return results;
}

/** 원진 검사 */
function checkWonjin(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const p1 = positions[i];
      const p2 = positions[j];

      const isWonjin = WONJIN.some(
        ([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1)
      );

      if (isWonjin) {
        const distance = getPillarDistance(p1, p2);
        const strength = Math.round(45 * getDistanceMultiplier(distance));

        results.push({
          type: '원진',
          branches: [b1, b2],
          pillars: [p1, p2],
          strength,
          description: `${b1}${b2} 원진 - 원망과 갈등`,
          effect: '흉',
        });
      }
    }
  }

  return results;
}

/** 귀문관살 검사 */
function checkGwimun(
  branches: string[],
  positions: PillarPosition[]
): InteractionResult[] {
  const results: InteractionResult[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const p1 = positions[i];
      const p2 = positions[j];

      const isGwimun = GWIMUN.some(
        ([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1)
      );

      if (isGwimun) {
        results.push({
          type: '귀문',
          branches: [b1, b2],
          pillars: [p1, p2],
          strength: 55,
          description: `${b1}${b2} 귀문관살 - 영적 감수성, 정신적 고민`,
          effect: '흉',
        });
      }
    }
  }

  return results;
}

// ============ 합충 상호작용 검사 ============

/** 합이 충으로 인해 해소되는지 검사 */
function checkHapBreakByChung(
  interactions: InteractionResult[]
): string[] {
  const warnings: string[] = [];

  const haps = interactions.filter(i =>
    i.type === '육합' || i.type === '삼합' || i.type === '방합'
  );
  const chungs = interactions.filter(i => i.type === '충');

  for (const hap of haps) {
    for (const chung of chungs) {
      // 합에 참여한 지지가 충당하면 합 해소
      const overlap = hap.branches.some(b => chung.branches.includes(b));
      if (overlap) {
        warnings.push(
          `${hap.branches.join('')} ${hap.type}이 ${chung.branches.join('')} 충으로 인해 약화될 수 있음`
        );
      }
    }
  }

  return warnings;
}

/** 충이 합으로 인해 해소되는지 검사 */
function checkChungBreakByHap(
  interactions: InteractionResult[]
): string[] {
  const warnings: string[] = [];

  const haps = interactions.filter(i =>
    i.type === '육합' || i.type === '삼합' || i.type === '방합'
  );
  const chungs = interactions.filter(i => i.type === '충');

  for (const chung of chungs) {
    for (const hap of haps) {
      const overlap = chung.branches.some(b => hap.branches.includes(b));
      if (overlap && hap.strength > chung.strength) {
        warnings.push(
          `${chung.branches.join('')} 충이 ${hap.branches.join('')} ${hap.type}으로 인해 해소될 수 있음`
        );
      }
    }
  }

  return warnings;
}

// ============ 메인 분석 함수 ============

export interface SajuPillarsInput {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

/**
 * 사주 전체의 형충회합 분석
 */
export function analyzeHyeongchung(pillars: SajuPillarsInput): HyeongchungAnalysis {
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch,
  ];

  const positions: PillarPosition[] = ['year', 'month', 'day', 'hour'];

  // 모든 작용 검사
  const interactions: InteractionResult[] = [
    ...checkYukap(branches, positions),
    ...checkSamhap(branches, positions),
    ...checkBanghap(branches, positions),
    ...checkChung(branches, positions),
    ...checkHyeong(branches, positions),
    ...checkHae(branches, positions),
    ...checkPa(branches, positions),
    ...checkWonjin(branches, positions),
    ...checkGwimun(branches, positions),
  ];

  // 상호작용 검사
  const warnings: string[] = [
    ...checkHapBreakByChung(interactions),
    ...checkChungBreakByHap(interactions),
  ];

  // 요약 계산
  const positiveInteractions = interactions.filter(i => i.effect === '길');
  const negativeInteractions = interactions.filter(i => i.effect === '흉');

  const totalPositive = positiveInteractions.reduce((sum, i) => sum + i.strength, 0);
  const totalNegative = negativeInteractions.reduce((sum, i) => sum + i.strength, 0);

  // 우세 작용 결정
  let dominantInteraction: InteractionType | null = null;
  let maxStrength = 0;

  for (const interaction of interactions) {
    if (interaction.strength > maxStrength) {
      maxStrength = interaction.strength;
      dominantInteraction = interaction.type;
    }
  }

  // 순 효과 결정
  let netEffect: '길' | '흉' | '중립';
  if (totalPositive > totalNegative * 1.2) {
    netEffect = '길';
  } else if (totalNegative > totalPositive * 1.2) {
    netEffect = '흉';
  } else {
    netEffect = '중립';
  }

  return {
    interactions,
    summary: {
      totalPositive,
      totalNegative,
      dominantInteraction,
      netEffect,
    },
    warnings,
  };
}

/**
 * 대운/세운과 원국 간의 형충회합 검사
 */
export function analyzeUnseInteraction(
  pillars: SajuPillarsInput,
  unseBranch: string,
  unseType: '대운' | '세운' | '월운'
): InteractionResult[] {
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch,
    unseBranch,
  ];

  const positions: PillarPosition[] = ['year', 'month', 'day', 'hour'];
  const results: InteractionResult[] = [];

  // 운의 지지와 각 기둥의 지지 간 관계 검사
  for (let i = 0; i < 4; i++) {
    const pillarBranch = branches[i];
    const pillarPos = positions[i];

    // 충 검사
    const isChung = CHUNG.some(
      ([a, b]) => (a === pillarBranch && b === unseBranch) || (a === unseBranch && b === pillarBranch)
    );
    if (isChung) {
      const baseStrength = getBasePillarStrength(pillarPos);
      results.push({
        type: '충',
        subType: `${unseType} 충`,
        branches: [pillarBranch, unseBranch],
        pillars: [pillarPos],
        strength: Math.round(baseStrength * 0.8),
        description: `${unseType} ${unseBranch}이 ${pillarPos}지 ${pillarBranch}과 충`,
        effect: '흉',
      });
    }

    // 육합 검사
    if (YUKAP[pillarBranch]?.partner === unseBranch) {
      const baseStrength = getBasePillarStrength(pillarPos);
      results.push({
        type: '육합',
        subType: `${unseType} 합`,
        branches: [pillarBranch, unseBranch],
        pillars: [pillarPos],
        strength: Math.round(baseStrength * 0.9),
        mergedElement: YUKAP[pillarBranch].element,
        description: `${unseType} ${unseBranch}이 ${pillarPos}지 ${pillarBranch}과 육합 → ${YUKAP[pillarBranch].element}`,
        effect: '길',
      });
    }

    // 형 검사 (간단화)
    const isHyeong = checkHyeongPair(pillarBranch, unseBranch);
    if (isHyeong) {
      results.push({
        type: '형',
        subType: `${unseType} 형`,
        branches: [pillarBranch, unseBranch],
        pillars: [pillarPos],
        strength: 60,
        description: `${unseType} ${unseBranch}이 ${pillarPos}지 ${pillarBranch}과 형`,
        effect: '흉',
      });
    }
  }

  return results;
}

/** 두 지지가 형 관계인지 검사 */
function checkHyeongPair(b1: string, b2: string): boolean {
  // 무은지형
  if (HYEONG.무은지형.includes(b1) && HYEONG.무은지형.includes(b2) && b1 !== b2) {
    return true;
  }
  // 시세지형
  if (HYEONG.시세지형.includes(b1) && HYEONG.시세지형.includes(b2) && b1 !== b2) {
    return true;
  }
  // 무례지형
  if ((b1 === '子' && b2 === '卯') || (b1 === '卯' && b2 === '子')) {
    return true;
  }
  // 자형
  if (b1 === b2 && HYEONG.자형.includes(b1)) {
    return true;
  }
  return false;
}

/**
 * 합화 성립 여부 판단
 * 합이 실제로 화(化)하려면 조건이 필요함
 */
export function checkHapHwa(
  pillars: SajuPillarsInput,
  hapResult: InteractionResult
): { isComplete: boolean; reason: string } {
  if (!hapResult.mergedElement) {
    return { isComplete: false, reason: '합화 오행 없음' };
  }

  const monthBranch = pillars.month.branch;
  const mergedElement = hapResult.mergedElement;

  // 월지가 합화 오행을 생조하거나 같은 오행이면 합화 성립
  const monthElement = getBranchElement(monthBranch);

  const isSupported =
    monthElement === mergedElement ||
    isGenerating(monthElement, mergedElement);

  if (hapResult.type === '삼합' && hapResult.branches.length === 3) {
    return { isComplete: true, reason: '삼합 완성으로 화(化) 성립' };
  }

  if (isSupported) {
    return { isComplete: true, reason: `월지 ${monthBranch}(${monthElement})이 ${mergedElement} 지원` };
  }

  return {
    isComplete: false,
    reason: `월지 ${monthBranch}(${monthElement})이 ${mergedElement}을 지원하지 않음`
  };
}

/** 지지의 본기 오행 */
function getBranchElement(branch: string): string {
  const map: Record<string, string> = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水',
  };
  return map[branch] ?? '';
}

/** 생 관계 검사 */
function isGenerating(source: string, target: string): boolean {
  const generates: Record<string, string> = {
    '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
  };
  return generates[source] === target;
}

/**
 * 작용력 종합 점수 계산
 */
export function calculateInteractionScore(analysis: HyeongchungAnalysis): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  interpretation: string;
} {
  const { totalPositive, totalNegative } = analysis.summary;

  // 순점수 계산 (-100 ~ +100 스케일로 정규화)
  const raw = totalPositive - totalNegative;
  const max = Math.max(totalPositive + totalNegative, 1);
  const normalized = Math.round((raw / max) * 100);

  // 50점 기준으로 환산 (0~100)
  const score = Math.max(0, Math.min(100, 50 + normalized / 2));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let interpretation: string;

  if (score >= 80) {
    grade = 'A';
    interpretation = '지지 간 조화가 매우 좋음. 합이 많고 충이 적어 안정적인 운세 흐름';
  } else if (score >= 65) {
    grade = 'B';
    interpretation = '전반적으로 양호한 지지 관계. 일부 갈등이 있으나 관리 가능';
  } else if (score >= 50) {
    grade = 'C';
    interpretation = '길흉이 혼재. 상황에 따라 변동성이 클 수 있음';
  } else if (score >= 35) {
    grade = 'D';
    interpretation = '충형이 많아 변화와 갈등이 잦음. 신중한 처신 필요';
  } else {
    grade = 'F';
    interpretation = '지지 간 충돌이 심함. 인내와 지혜로 극복해야 함';
  }

  return { score, grade, interpretation };
}
