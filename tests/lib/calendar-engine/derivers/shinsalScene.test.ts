/**
 * shinsalScene — 신살 생활 장면 사전 커버리지 가드.
 *
 * 감사(2026-07): 추출기 어휘 ~33종 중 4종만 생활어가 있어 화면에 원어가 그대로
 * 떴다. 이 테스트는 추출기의 방출 어휘(SHINSAL_POLARITY 키) 전부가 사전에
 * 매핑돼 있음을 강제 — 새 신살을 추출기에 추가하면 사전도 같이 채워야 깨지지
 * 않는다(커버리지 회귀 차단).
 */
import { describe, it, expect } from 'vitest'
import { shinsalScene } from '@/lib/calendar-engine/derivers/plainLanguage'
import { SHINSAL_POLARITY } from '@/lib/calendar-engine/extractors/saju-shinsal'

describe('shinsalScene', () => {
  it('추출기가 방출하는 모든 신살에 생활 장면이 있다 (한/영)', () => {
    for (const name of Object.keys(SHINSAL_POLARITY)) {
      expect(shinsalScene(name, 'ko'), `${name} (ko) 누락`).not.toBe('')
      expect(shinsalScene(name, 'en'), `${name} (en) 누락`).not.toBe('')
    }
  })

  it('-살 별칭도 같은 장면으로 조회된다', () => {
    expect(shinsalScene('역마살', 'ko')).toBe(shinsalScene('역마', 'ko'))
    expect(shinsalScene('화개살', 'ko')).toBe(shinsalScene('화개', 'ko'))
    expect(shinsalScene('망신살', 'ko')).toBe(shinsalScene('망신', 'ko'))
  })

  it('미지의 이름은 빈 문자열 (drop-on-doubt — 억지 문장 금지)', () => {
    expect(shinsalScene('없는살', 'ko')).toBe('')
    expect(shinsalScene(undefined, 'ko')).toBe('')
  })

  it('장면은 생활 명사를 담고 공포·숙명론이 없다 (샘플)', () => {
    expect(shinsalScene('백호', 'ko')).toContain('칼')
    expect(shinsalScene('겁살', 'ko')).toContain('지갑')
    expect(shinsalScene('천을귀인', 'ko')).toContain('사람')
    // 금지선 — 죽음/파멸류 단어 없음.
    for (const name of ['백호', '삼재', '괴강', '천라지망']) {
      expect(shinsalScene(name, 'ko')).not.toMatch(/죽|파멸|불행|저주/)
    }
  })
})
