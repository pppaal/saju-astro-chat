// src/lib/prediction/modules/solarTerms.ts
// 24절기 계산 모듈

import type { FiveElement } from '../timingScore'
import type { SolarTerm } from './types'

// ============================================================
// 24절기 데이터
// ============================================================

const SOLAR_TERMS: {
  name: string
  nameKo: string
  month: number
  element: FiveElement
  energy: 'yang' | 'yin'
}[] = [
  { name: 'lichun', nameKo: '입춘', month: 1, element: '목', energy: 'yang' },
  { name: 'yushui', nameKo: '우수', month: 1, element: '목', energy: 'yin' },
  { name: 'jingzhe', nameKo: '경칩', month: 2, element: '목', energy: 'yang' },
  { name: 'chunfen', nameKo: '춘분', month: 2, element: '목', energy: 'yin' },
  { name: 'qingming', nameKo: '청명', month: 3, element: '목', energy: 'yang' },
  { name: 'guyu', nameKo: '곡우', month: 3, element: '목', energy: 'yin' },
  { name: 'lixia', nameKo: '입하', month: 4, element: '화', energy: 'yang' },
  { name: 'xiaoman', nameKo: '소만', month: 4, element: '화', energy: 'yin' },
  { name: 'mangzhong', nameKo: '망종', month: 5, element: '화', energy: 'yang' },
  { name: 'xiazhi', nameKo: '하지', month: 5, element: '화', energy: 'yin' },
  { name: 'xiaoshu', nameKo: '소서', month: 6, element: '화', energy: 'yang' },
  { name: 'dashu', nameKo: '대서', month: 6, element: '화', energy: 'yin' },
  { name: 'liqiu', nameKo: '입추', month: 7, element: '금', energy: 'yang' },
  { name: 'chushu', nameKo: '처서', month: 7, element: '금', energy: 'yin' },
  { name: 'bailu', nameKo: '백로', month: 8, element: '금', energy: 'yang' },
  { name: 'qiufen', nameKo: '추분', month: 8, element: '금', energy: 'yin' },
  { name: 'hanlu', nameKo: '한로', month: 9, element: '금', energy: 'yang' },
  { name: 'shuangjiang', nameKo: '상강', month: 9, element: '금', energy: 'yin' },
  { name: 'lidong', nameKo: '입동', month: 10, element: '수', energy: 'yang' },
  { name: 'xiaoxue', nameKo: '소설', month: 10, element: '수', energy: 'yin' },
  { name: 'daxue', nameKo: '대설', month: 11, element: '수', energy: 'yang' },
  { name: 'dongzhi', nameKo: '동지', month: 11, element: '수', energy: 'yin' },
  { name: 'xiaohan', nameKo: '소한', month: 12, element: '수', energy: 'yang' },
  { name: 'dahan', nameKo: '대한', month: 12, element: '수', energy: 'yin' },
]

// ============================================================
// 절기 계산 함수
// ============================================================

/**
 * 특정 날짜의 절기 정보 계산
 */
export function getSolarTermForDate(date: Date): SolarTerm {
  const month = date.getMonth() + 1
  const day = date.getDate()

  // 간단한 절기 계산 (실제로는 천문학적 계산 필요)
  // 각 월 초순/중순에 절기가 있음
  let termIndex: number

  if (month === 1) {
    termIndex = day < 20 ? 22 : 23
  } // 소한/대한
  else if (month === 2) {
    termIndex = day < 19 ? 0 : 1
  } // 입춘/우수
  else if (month === 3) {
    termIndex = day < 21 ? 2 : 3
  } // 경칩/춘분
  else if (month === 4) {
    termIndex = day < 20 ? 4 : 5
  } // 청명/곡우
  else if (month === 5) {
    termIndex = day < 21 ? 6 : 7
  } // 입하/소만
  else if (month === 6) {
    termIndex = day < 21 ? 8 : 9
  } // 망종/하지
  else if (month === 7) {
    termIndex = day < 23 ? 10 : 11
  } // 소서/대서
  else if (month === 8) {
    termIndex = day < 23 ? 12 : 13
  } // 입추/처서
  else if (month === 9) {
    termIndex = day < 23 ? 14 : 15
  } // 백로/추분
  else if (month === 10) {
    termIndex = day < 23 ? 16 : 17
  } // 한로/상강
  else if (month === 11) {
    termIndex = day < 22 ? 18 : 19
  } // 입동/소설
  else {
    termIndex = day < 22 ? 20 : 21
  } // 대설/동지

  const term = SOLAR_TERMS[termIndex]
  const seasonPhase: 'early' | 'mid' | 'late' = day < 10 ? 'early' : day < 20 ? 'mid' : 'late'

  return {
    ...term,
    date,
    longitude: termIndex * 15, // 태양 황경 (근사값)
    seasonPhase,
  }
}

/**
 * 절기월 계산 (양력월과 다름)
 */
export function getSolarTermMonth(date: Date): number {
  const term = getSolarTermForDate(date)
  return term.month
}
