/**
 * branchData.ts - 지지 데이터
 *
 * 지지의 오행/음양/이름·순서(BRANCH_ORDER)는 saju/constants 정본(BRANCHES)에서
 * 파생한다 — 값을 다시 적지 않아 정본과 갈라지지 않는다.
 *
 * 지장간(hiddenStems)만 로컬로 둔다: 이 레이어가 쓰는 "정기 우선" 배열 순서가
 * 정본 JIJANGGAN(여기/중기/정기 dict)의 표현과 달라 단순 파생이 불가능하다.
 * (도메인 NOTE: 亥 지장간이 정본 {戊,壬} 과 여기 {壬,甲} 로 불일치 — 별도 검토 필요.)
 */

import { BRANCHES as CANON_BRANCHES } from '@/lib/saju/constants';
import type { BranchInfo } from '../types';

const HIDDEN_STEMS_BY_BRANCH: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '戊', '庚'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

export const BRANCHES: Record<string, BranchInfo> = Object.fromEntries(
  CANON_BRANCHES.map((b): [string, BranchInfo] => [
    b.name,
    {
      name: b.name,
      element: b.element,
      yinYang: b.yin_yang,
      hiddenStems: HIDDEN_STEMS_BY_BRANCH[b.name],
    },
  ])
);

export const BRANCH_ORDER = CANON_BRANCHES.map((b) => b.name);
