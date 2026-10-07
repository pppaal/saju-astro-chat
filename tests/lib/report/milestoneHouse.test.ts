// tests/lib/report/milestoneHouse.test.ts
//
// 인생 마디 개인화 가드. 회귀는 본명에서 그 행성이 있는 하우스에서 일어나므로,
// 뜻풀이가 사람마다 달라져야 한다. 실측(6인)에서 인생총흐름 뜻풀이의 48%가 전원
// 공통이었고 그 대부분이 이 마디 텍스트였다 → 개인화 후 5%.

import { describe, it, expect } from 'vitest'
import {
  MILESTONE_BODY,
  natalHouseOf,
  personalizeMilestoneMeaning,
} from '@/lib/report/milestoneHouse'

const GENERIC = '책임과 전문성, 기반이 자리 잡는 시기예요.'

describe('natalHouseOf', () => {
  it('이름으로 하우스를 찾는다', () => {
    expect(natalHouseOf([{ name: 'Saturn', house: 10 }], 'Saturn')).toBe(10)
  })
  it('없거나 범위 밖이면 null — 날조 금지', () => {
    expect(natalHouseOf([{ name: 'Saturn', house: 10 }], 'Chiron')).toBeNull()
    expect(natalHouseOf([{ name: 'Saturn', house: 0 }], 'Saturn')).toBeNull()
    expect(natalHouseOf(undefined, 'Saturn')).toBeNull()
  })
})

describe('MILESTONE_BODY', () => {
  it('회귀 마디는 그 이름의 천체를 가리킨다', () => {
    expect(MILESTONE_BODY['saturn_return_1']).toBe('Saturn')
    expect(MILESTONE_BODY['saturn_return_2']).toBe('Saturn')
    expect(MILESTONE_BODY['jupiter_return_3']).toBe('Jupiter')
    expect(MILESTONE_BODY['chiron_return']).toBe('Chiron')
    expect(MILESTONE_BODY['uranus_return']).toBe('Uranus')
  })
})

describe('personalizeMilestoneMeaning', () => {
  it('하우스를 모르면 원문 그대로 — 없는 정보를 지어내지 않는다', () => {
    expect(personalizeMilestoneMeaning('saturn_return_1', null, GENERIC, true)).toBe(GENERIC)
  })

  it('첫 토성 회귀는 하우스마다 전부 다른 문장', () => {
    const out = new Set<string>()
    for (let h = 1; h <= 12; h++) {
      out.add(personalizeMilestoneMeaning('saturn_return_1', h, GENERIC, true))
    }
    expect(out.size).toBe(12)
    for (const s of out) expect(s).not.toBe(GENERIC)
  })

  it('직접 쓴 조합이 없는 마디는 일반 뜻 + 자리 구로 조합된다', () => {
    const a = personalizeMilestoneMeaning('jupiter_return_1', 10, GENERIC, true)
    const b = personalizeMilestoneMeaning('jupiter_return_1', 5, GENERIC, true)
    expect(a).toContain(GENERIC) // 원문 보존
    expect(a).not.toBe(b) // 하우스가 다르면 문장도 다름
    expect(a).toContain('직업')
    expect(b).toContain('연애')
  })

  it('영문도 같은 규칙', () => {
    const en = personalizeMilestoneMeaning(
      'saturn_return_1',
      7,
      'Responsibility settles in.',
      false
    )
    expect(en).toMatch(/[A-Za-z]/)
    expect(en).not.toMatch(/[가-힣]/)
  })
})
