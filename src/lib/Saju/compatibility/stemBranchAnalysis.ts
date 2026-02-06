// src/lib/Saju/compatibility/stemBranchAnalysis.ts
// 천간/지지 궁합 분석 모듈

import { FiveElement, SajuPillars } from '../types';
import {
  STEM_HAP,
  STEM_CHUNG,
  BRANCH_YUKHAP,
  BRANCH_SAMHAP,
  BRANCH_CHUNG,
  BRANCH_HYEONG,
  BRANCH_HAE,
} from './constants';
import type { StemCompatibility, BranchCompatibility } from './types';

/**
 * 사주에서 천간 추출
 */
function extractStems(pillars: SajuPillars): string[] {
  return [
    pillars.year.heavenlyStem.name,
    pillars.month.heavenlyStem.name,
    pillars.day.heavenlyStem.name,
    pillars.time.heavenlyStem.name,
  ];
}

/**
 * 사주에서 지지 추출
 */
function extractBranches(pillars: SajuPillars): string[] {
  return [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ];
}

/**
 * 천간 궁합 분석
 */
export function analyzeStemCompatibility(
  person1: SajuPillars,
  person2: SajuPillars
): StemCompatibility {
  const stems1 = extractStems(person1);
  const stems2 = extractStems(person2);

  const hapPairs: Array<{ stem1: string; stem2: string; result: string }> = [];
  const chungPairs: Array<{ stem1: string; stem2: string }> = [];

  for (const s1 of stems1) {
    for (const s2 of stems2) {
      // 합 체크
      const hapInfo = STEM_HAP[s1];
      if (hapInfo && hapInfo.partner === s2) {
        hapPairs.push({ stem1: s1, stem2: s2, result: `${hapInfo.result}으로 합화` });
      }

      // 충 체크
      if (STEM_CHUNG[s1] === s2) {
        chungPairs.push({ stem1: s1, stem2: s2 });
      }
    }
  }

  // 점수 계산
  let score = 50;
  score += hapPairs.length * 15;
  score -= chungPairs.length * 12;
  score = Math.max(0, Math.min(100, score));

  let analysis = '';
  if (hapPairs.length > 0) {
    analysis += `천간에서 ${hapPairs.length}개의 합이 형성되어 좋은 인연입니다. `;
  }
  if (chungPairs.length > 0) {
    analysis += `천간에서 ${chungPairs.length}개의 충이 있어 의견 충돌에 주의가 필요합니다.`;
  }
  if (hapPairs.length === 0 && chungPairs.length === 0) {
    analysis = '천간에서 특별한 합충 관계가 없어 평온한 관계입니다.';
  }

  return { score, hapPairs, chungPairs, analysis };
}

/**
 * 지지 분석 텍스트 생성
 */
function generateBranchAnalysis(
  yukhapPairs: Array<{ branch1: string; branch2: string; result: FiveElement }>,
  samhapGroups: Array<{ branches: string[]; result: FiveElement }>,
  chungPairs: Array<{ branch1: string; branch2: string }>,
  hyeongPairs: Array<{ branch1: string; branch2: string; type: string }>,
  haePairs: Array<{ branch1: string; branch2: string }>
): string {
  const parts: string[] = [];

  if (yukhapPairs.length > 0) {
    parts.push(`지지 육합(${yukhapPairs.map(p => `${p.branch1}-${p.branch2}`).join(', ')})으로 깊은 정이 형성됩니다`);
  }
  if (samhapGroups.length > 0) {
    parts.push(`삼합이 형성되어 함께 할 때 큰 힘을 발휘합니다`);
  }
  if (chungPairs.length > 0) {
    parts.push(`지지 충(${chungPairs.map(p => `${p.branch1}-${p.branch2}`).join(', ')})이 있어 변동이나 갈등에 주의가 필요합니다`);
  }
  if (hyeongPairs.length > 0) {
    parts.push(`지지 형이 있어 서로 자극이 될 수 있습니다`);
  }
  if (haePairs.length > 0) {
    parts.push(`지지 해가 있어 은근한 불화에 주의하세요`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : '지지에서 특별한 합충 관계가 없어 무난한 관계입니다.';
}

/**
 * 지지 궁합 분석
 */
export function analyzeBranchCompatibility(
  person1: SajuPillars,
  person2: SajuPillars
): BranchCompatibility {
  const branches1 = extractBranches(person1);
  const branches2 = extractBranches(person2);
  const allBranches = [...branches1, ...branches2];

  const yukhapPairs: Array<{ branch1: string; branch2: string; result: FiveElement }> = [];
  const samhapGroups: Array<{ branches: string[]; result: FiveElement }> = [];
  const chungPairs: Array<{ branch1: string; branch2: string }> = [];
  const hyeongPairs: Array<{ branch1: string; branch2: string; type: string }> = [];
  const haePairs: Array<{ branch1: string; branch2: string }> = [];

  // 육합 체크
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      const yukhap = BRANCH_YUKHAP[b1];
      if (yukhap && yukhap.partner === b2) {
        yukhapPairs.push({ branch1: b1, branch2: b2, result: yukhap.result });
      }
    }
  }

  // 삼합 체크
  for (const samhap of BRANCH_SAMHAP) {
    const matchCount = samhap.branches.filter(b => allBranches.includes(b)).length;
    if (matchCount >= 2) {
      const matched = samhap.branches.filter(b => allBranches.includes(b));
      const in1 = matched.filter(b => branches1.includes(b)).length;
      const in2 = matched.filter(b => branches2.includes(b)).length;
      if (in1 >= 1 && in2 >= 1) {
        samhapGroups.push({ branches: matched, result: samhap.result });
      }
    }
  }

  // 충 체크
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      if (BRANCH_CHUNG[b1] === b2) {
        chungPairs.push({ branch1: b1, branch2: b2 });
      }
    }
  }

  // 형 체크
  for (const hyeong of BRANCH_HYEONG) {
    for (const b1 of branches1) {
      for (const b2 of branches2) {
        if (hyeong.branches.includes(b1) && hyeong.branches.includes(b2) && b1 !== b2) {
          hyeongPairs.push({ branch1: b1, branch2: b2, type: hyeong.type });
        }
      }
    }
  }

  // 해 체크
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      if (BRANCH_HAE[b1] === b2) {
        haePairs.push({ branch1: b1, branch2: b2 });
      }
    }
  }

  // 점수 계산
  let score = 50;
  score += yukhapPairs.length * 12;
  score += samhapGroups.length * 15;
  score -= chungPairs.length * 10;
  score -= hyeongPairs.length * 8;
  score -= haePairs.length * 5;
  score = Math.max(0, Math.min(100, score));

  const analysis = generateBranchAnalysis(yukhapPairs, samhapGroups, chungPairs, hyeongPairs, haePairs);

  return { score, yukhapPairs, samhapGroups, chungPairs, hyeongPairs, haePairs, analysis };
}
