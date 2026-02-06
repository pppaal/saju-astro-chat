/**
 * stemData.ts - 천간 데이터
 */

import type { StemInfo } from '../types';

export const STEMS: Record<string, StemInfo> = {
  '甲': { name: '甲', element: '목', yinYang: '양' },
  '乙': { name: '乙', element: '목', yinYang: '음' },
  '丙': { name: '丙', element: '화', yinYang: '양' },
  '丁': { name: '丁', element: '화', yinYang: '음' },
  '戊': { name: '戊', element: '토', yinYang: '양' },
  '己': { name: '己', element: '토', yinYang: '음' },
  '庚': { name: '庚', element: '금', yinYang: '양' },
  '辛': { name: '辛', element: '금', yinYang: '음' },
  '壬': { name: '壬', element: '수', yinYang: '양' },
  '癸': { name: '癸', element: '수', yinYang: '음' },
};
