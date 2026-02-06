/**
 * branchInteractions.ts - 지지 상호작용 분석
 */

import type { BranchInteraction } from './types';
import { YUKAP, SAMHAP, BANGHAP, CHUNG, HYEONG } from './constants/interactionData';

/**
 * 지지 상호작용 분석
 */
export function analyzeBranchInteractions(branches: string[]): BranchInteraction[] {
  const interactions: BranchInteraction[] = [];
  const uniqueBranches = [...new Set(branches)];

  // 육합 체크
  for (let i = 0; i < uniqueBranches.length; i++) {
    for (let j = i + 1; j < uniqueBranches.length; j++) {
      const b1 = uniqueBranches[i];
      const b2 = uniqueBranches[j];

      if (YUKAP[b1]?.partner === b2) {
        interactions.push({
          branches: [b1, b2],
          type: '육합',
          result: YUKAP[b1].result,
          impact: 'positive',
          score: 15,
          description: `${b1}-${b2} 육합 → ${YUKAP[b1].result} 기운 생성`,
        });
      }
    }
  }

  // 삼합 체크
  for (const samhap of SAMHAP) {
    const matchCount = samhap.branches.filter(b => uniqueBranches.includes(b)).length;
    if (matchCount >= 2) {
      const matched = samhap.branches.filter(b => uniqueBranches.includes(b));
      interactions.push({
        branches: matched,
        type: '삼합',
        result: samhap.result,
        impact: 'positive',
        score: matchCount === 3 ? 25 : 15,
        description: `${matched.join('-')} 삼합 → ${samhap.result}국 형성 (${matchCount}/3)`,
      });
    }
  }

  // 방합 체크
  for (const banghap of BANGHAP) {
    const matchCount = banghap.branches.filter(b => uniqueBranches.includes(b)).length;
    if (matchCount >= 2) {
      const matched = banghap.branches.filter(b => uniqueBranches.includes(b));
      interactions.push({
        branches: matched,
        type: '방합',
        result: banghap.result,
        impact: 'positive',
        score: matchCount === 3 ? 20 : 10,
        description: `${matched.join('-')} 방합 → ${banghap.result} 기운 강화`,
      });
    }
  }

  // 충 체크
  for (let i = 0; i < uniqueBranches.length; i++) {
    for (let j = i + 1; j < uniqueBranches.length; j++) {
      const b1 = uniqueBranches[i];
      const b2 = uniqueBranches[j];

      if (CHUNG[b1] === b2) {
        interactions.push({
          branches: [b1, b2],
          type: '충',
          impact: 'negative',
          score: -20,
          description: `${b1}-${b2} 충 → 에너지 충돌, 변화와 불안정`,
        });
      }
    }
  }

  // 형 체크
  for (const hyeong of HYEONG) {
    const matchCount = hyeong.branches.filter(b => branches.includes(b)).length;
    if (matchCount >= hyeong.branches.length) {
      interactions.push({
        branches: hyeong.branches,
        type: '형',
        impact: 'negative',
        score: -15,
        description: `${hyeong.branches.join('-')} ${hyeong.type} → 갈등과 시련`,
      });
    }
  }

  return interactions;
}
