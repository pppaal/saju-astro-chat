/**
 * branchData.ts - 지지 데이터
 */

import type { BranchInfo } from '../types';

export const BRANCHES: Record<string, BranchInfo> = {
  '子': { name: '子', element: '수', yinYang: '양', hiddenStems: ['癸'] },
  '丑': { name: '丑', element: '토', yinYang: '음', hiddenStems: ['己', '癸', '辛'] },
  '寅': { name: '寅', element: '목', yinYang: '양', hiddenStems: ['甲', '丙', '戊'] },
  '卯': { name: '卯', element: '목', yinYang: '음', hiddenStems: ['乙'] },
  '辰': { name: '辰', element: '토', yinYang: '양', hiddenStems: ['戊', '乙', '癸'] },
  '巳': { name: '巳', element: '화', yinYang: '음', hiddenStems: ['丙', '戊', '庚'] },
  '午': { name: '午', element: '화', yinYang: '양', hiddenStems: ['丁', '己'] },
  '未': { name: '未', element: '토', yinYang: '음', hiddenStems: ['己', '丁', '乙'] },
  '申': { name: '申', element: '금', yinYang: '양', hiddenStems: ['庚', '壬', '戊'] },
  '酉': { name: '酉', element: '금', yinYang: '음', hiddenStems: ['辛'] },
  '戌': { name: '戌', element: '토', yinYang: '양', hiddenStems: ['戊', '辛', '丁'] },
  '亥': { name: '亥', element: '수', yinYang: '음', hiddenStems: ['壬', '甲'] },
};

export const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
