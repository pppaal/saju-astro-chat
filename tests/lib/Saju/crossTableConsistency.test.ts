// 도그마 표 교차 일치 + 골든 (관계표 외 나머지 두더지 방지용).
//
// 같은 진실이 여러 곳에 복제돼 드리프트하던 패턴을 잠근다:
//  - 천간/지지 → 오행 base 표가 STEMS/BRANCHES(SSOT)와 일치
//  - 지장간 텍스트가 JIJANGGAN(정본)에서 파생 (과거 午·亥 드리프트 회귀 방지)
//  - 천을귀인 표준값
//  - 별자리 지배행성(SIGN_RULERS) 표준값 (4곳 복제 → dignities SSOT 통합)

import { describe, it, expect } from 'vitest'
import {
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  CHEONEUL_GWIIN_MAP,
  JIJANGGAN,
} from '@/lib/saju/constants'
import { JIJANGGAN_TEXT_BY_BRANCH } from '@/lib/saju/shinsal'
import { SIGN_RULERS_BY_SIGN } from '@/lib/astrology/foundation/dignities'

describe('base 오행 표 ↔ STEMS/BRANCHES SSOT 일치', () => {
  it('STEM_TO_ELEMENT 가 STEMS 의 오행과 일치(한자 키)', () => {
    for (const s of STEMS) {
      expect(STEM_TO_ELEMENT[s.name]).toBe(s.element)
    }
  })
  it('BRANCH_TO_ELEMENT 가 BRANCHES 의 오행과 일치(한자 키)', () => {
    for (const b of BRANCHES) {
      expect(BRANCH_TO_ELEMENT[b.name]).toBe(b.element)
    }
  })
})

describe('지장간 텍스트 ↔ JIJANGGAN 정본 파생', () => {
  const STEM_HAN_TO_KO: Record<string, string> = {
    甲: '갑',
    乙: '을',
    丙: '병',
    丁: '정',
    戊: '무',
    己: '기',
    庚: '경',
    辛: '신',
    壬: '임',
    癸: '계',
  }
  it('모든 지지의 지장간 텍스트가 JIJANGGAN(여기→중기→정기) 한글 독음과 일치', () => {
    for (const [branch, j] of Object.entries(JIJANGGAN)) {
      const expected = [j['여기'], j['중기'], j['정기']]
        .filter((s): s is string => Boolean(s))
        .map((s) => STEM_HAN_TO_KO[s])
        .join('')
      expect(JIJANGGAN_TEXT_BY_BRANCH[branch]).toBe(expected)
    }
  })
  it('과거 드리프트 회귀 가드: 午=병기정, 亥=무갑임 (丙·甲 누락 금지)', () => {
    expect(JIJANGGAN_TEXT_BY_BRANCH['午']).toBe('병기정')
    expect(JIJANGGAN_TEXT_BY_BRANCH['亥']).toBe('무갑임')
  })
})

describe('천을귀인(天乙貴人) 표준값', () => {
  it('일간별 천을귀인 2지지 (set)', () => {
    const expected: Record<string, string[]> = {
      甲: ['丑', '未'],
      戊: ['丑', '未'],
      庚: ['丑', '未'],
      乙: ['子', '申'],
      己: ['子', '申'],
      丙: ['亥', '酉'],
      丁: ['亥', '酉'],
      壬: ['卯', '巳'],
      癸: ['卯', '巳'],
      辛: ['寅', '午'],
    }
    for (const [stem, branches] of Object.entries(expected)) {
      expect(new Set(CHEONEUL_GWIIN_MAP[stem])).toEqual(new Set(branches))
    }
  })
})

describe('별자리 지배행성(SIGN_RULERS) 표준값 — dignities SSOT', () => {
  it('헬레니즘 전통 12 지배행성', () => {
    const expected: Record<string, string> = {
      Aries: 'Mars',
      Taurus: 'Venus',
      Gemini: 'Mercury',
      Cancer: 'Moon',
      Leo: 'Sun',
      Virgo: 'Mercury',
      Libra: 'Venus',
      Scorpio: 'Mars',
      Sagittarius: 'Jupiter',
      Capricorn: 'Saturn',
      Aquarius: 'Saturn',
      Pisces: 'Jupiter',
    }
    expect(SIGN_RULERS_BY_SIGN).toEqual(expected)
  })
})
