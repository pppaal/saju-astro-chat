/**
 * branchData.ts - 지지 데이터
 *
 * 지지의 오행/음양/이름·순서(BRANCH_ORDER)·지장간(hiddenStems)을 모두
 * saju/constants 정본에서 파생한다 — 값을 다시 적지 않아 정본과 갈라지지 않는다.
 * hiddenStems 는 강도 순서(정기→중기→여기) 배열인 JIJANGGAN_ORDERED 를 그대로 쓴다.
 */

import { BRANCHES as CANON_BRANCHES, JIJANGGAN_ORDERED } from '@/lib/saju/constants';
import type { BranchInfo } from '../types';

export const BRANCHES: Record<string, BranchInfo> = Object.fromEntries(
  CANON_BRANCHES.map((b): [string, BranchInfo] => [
    b.name,
    {
      name: b.name,
      element: b.element,
      yinYang: b.yin_yang,
      hiddenStems: JIJANGGAN_ORDERED[b.name],
    },
  ])
);

export const BRANCH_ORDER = CANON_BRANCHES.map((b) => b.name);
