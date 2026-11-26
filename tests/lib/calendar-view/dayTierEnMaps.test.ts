import { describe, it, expect } from 'vitest'
import {
  geokgukStatusLineEn,
  GEOKGUK_NAME_EN,
  APPLIED_PATTERN_EN,
  appliedPatternEn,
  shinsalEn,
  twelveStageEn,
  twelveStageHanja,
} from '@/lib/calendar-view/dayTierEnMaps'
import { APPLIED_PATTERN_IDS } from '@/lib/calendar-engine/extractors/saju-applied-pattern'
import { SHINSAL_POLARITY } from '@/lib/calendar-engine/extractors/saju-shinsal'
import { getTwelveStage } from '@/lib/saju/shinsal'

const HANGUL = /[가-힣]/

/**
 * geokgukStatusLineEn — 격국 상태 한 줄을 EN 로케일용 '이름 · 상태'로 재구성.
 * DayTier 가 EN 에서 한국어 전용 description 대신 이 값을 렌더해 한글 누수를 막는다.
 */
describe('geokgukStatusLineEn — 격국 EN 한 줄', () => {
  it('이름·상태를 영문으로 합친다(한글 없음)', () => {
    const s = geokgukStatusLineEn('정인격', '반성반파')
    expect(s).toBe('Jeongin (Direct-resource) · Mixed')
    expect(/[가-힣]/.test(s)).toBe(false)
  })

  it('성격/파격도 영문 상태로', () => {
    expect(geokgukStatusLineEn('식신격', '성격')).toBe('Siksin (Eating-god) · Formed')
    expect(geokgukStatusLineEn('편관격', '파격')).toBe('Pyeongwan (Indirect-officer) · Broken')
  })

  it('상태가 없으면 이름만(구분자 없이)', () => {
    expect(geokgukStatusLineEn('종왕격')).toBe('Jongwang (Dominant self)')
    expect(geokgukStatusLineEn('종왕격', '')).toBe('Jongwang (Dominant self)')
  })

  it('GeokgukType 전 종류(정격·종격·비격·화기격·특수격·미정)에 EN 이름이 있다', () => {
    const all = [
      '식신격',
      '상관격',
      '편재격',
      '정재격',
      '편관격',
      '정관격',
      '편인격',
      '정인격',
      '종왕격',
      '종강격',
      '종아격',
      '종재격',
      '종살격',
      '건록격',
      '양인격',
      '월겁격',
      '잡기격',
      '갑기화토격',
      '을경화금격',
      '병신화수격',
      '정임화목격',
      '무계화화격',
      '곡직격',
      '염상격',
      '가색격',
      '종혁격',
      '윤하격',
      '미정',
    ]
    for (const name of all) {
      expect(GEOKGUK_NAME_EN[name], name).toBeTruthy()
      expect(/[가-힣]/.test(GEOKGUK_NAME_EN[name]), name).toBe(false)
    }
  })

  it('미상 이름은 원어로 폴백(깨지지 않음)', () => {
    expect(geokgukStatusLineEn('알수없는격', '성격')).toBe('알수없는격 · Formed')
  })
})

// 재감사 SI-3 — Day '본명 풀이' 접힘: 응용격국 EN 은 추출기 패턴 id 로 찾고, 보조 글리프는 한자.
describe('응용격국 EN (APPLIED_PATTERN_EN)', () => {
  it('추출기가 내는 패턴 id 전부에 EN 이름·글로스가 있다(bigeop-talchae 포함)', () => {
    expect(APPLIED_PATTERN_IDS.length).toBe(8)
    for (const id of APPLIED_PATTERN_IDS) {
      const en = appliedPatternEn(id)
      expect(en, id).toBeDefined()
      expect(HANGUL.test(`${en?.name} ${en?.gloss}`), id).toBe(false)
    }
    // 맵에 추출기에 없는 유령 키가 남지 않는다.
    expect(Object.keys(APPLIED_PATTERN_EN).sort()).toEqual([...APPLIED_PATTERN_IDS].sort())
  })

  it("신호 id('saju.applied-pattern.<id>.<날짜>')도 패턴 id 로 풀어 찾는다", () => {
    expect(appliedPatternEn('saju.applied-pattern.jae-saeng-gwan.2026-11-25')?.name).toBe(
      'Wealth generates Officer'
    )
    expect(appliedPatternEn('saju.applied-pattern.bigeop-talchae.2026-11-03')?.name).toBe(
      'Peers rob Wealth'
    )
    expect(appliedPatternEn('nope')).toBeUndefined()
  })
})

describe('12운성 EN·한자 글리프', () => {
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  it('엔진이 낼 수 있는 단계 전부(120칸) — EN 문구·한자 글리프가 있고 한글이 없다', () => {
    const stages = new Set<string>()
    for (const s of STEMS) for (const b of BRANCHES) stages.add(getTwelveStage(s, b))
    expect(stages.size).toBe(12)
    for (const st of stages) {
      expect(HANGUL.test(twelveStageEn(st)), st).toBe(false)
      const han = twelveStageHanja(st)
      expect(han, st).toMatch(/^[\u4e00-\u9fff]+$/)
    }
  })

  it('동의어는 같은 글리프(건록=임관 臨官, 제왕=왕지 帝旺), 미상은 빈 글리프', () => {
    expect(twelveStageHanja('임관')).toBe('臨官')
    expect(twelveStageHanja('건록')).toBe('臨官')
    expect(twelveStageHanja('왕지')).toBe('帝旺')
    expect(twelveStageHanja('제왕')).toBe('帝旺')
    expect(twelveStageHanja('병')).toBe('病')
    expect(twelveStageHanja('—')).toBe('')
  })
})

// 재감사 SI-2 — 신살 이름 EN 은 정본 한 표(signalI18n.SHINSAL_NAME_EN). 캘린더 신살 전부.
describe('신살 EN (shinsalEn)', () => {
  it('캘린더가 낼 수 있는 신살 이름 전부(SHINSAL_POLARITY 키, ~살 별칭 포함)가 한글 없는 EN', () => {
    const names = Object.keys(SHINSAL_POLARITY)
    expect(names.length).toBeGreaterThan(40)
    for (const n of names) expect(HANGUL.test(shinsalEn(n)), `${n} → ${shinsalEn(n)}`).toBe(false)
  })

  it('건록은 신살 정본 이름(Established Stipend) — 교차 칩과 같은 라벨', () => {
    expect(shinsalEn('건록')).toBe('Established Stipend')
    expect(shinsalEn('망신살')).toBe('Disgrace Star')
    expect(shinsalEn('홍염살')).toBe('Red Charm Star')
    expect(shinsalEn('미상신살')).toBe('미상신살')
  })
})
