import { describe, it, expect } from 'vitest'
import { geokgukStatusLineEn, GEOKGUK_NAME_EN } from '@/components/calendar/adapters/dayTierEnMaps'

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
