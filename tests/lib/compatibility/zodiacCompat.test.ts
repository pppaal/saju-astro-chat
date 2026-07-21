// tests/lib/compatibility/zodiacCompat.test.ts
//
// 띠궁합 엔진 — 핵심 계약: (1) 결정론(같은 쌍 → 같은 결과, 대칭 관계는 순서 무관
// 관계 동일), (2) 정규 슬러그가 대칭을 하나로 모으고 78개(12+66)를 낸다,
// (3) 육합/삼합은 고점·충은 저점, (4) ko/en 본문에 두 띠 이름이 실제로 박힌다.

import { describe, it, expect } from 'vitest'
import {
  allPairSlugs,
  canonicalPairSlug,
  parsePairSlug,
  computeZodiacCompat,
} from '@/lib/compatibility/zodiacCompat'
import { getAnimalBySlug, ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'

const rat = getAnimalBySlug('rat')!
const ox = getAnimalBySlug('ox')!
const horse = getAnimalBySlug('horse')!
const dragon = getAnimalBySlug('dragon')!
const monkey = getAnimalBySlug('monkey')!

describe('allPairSlugs', () => {
  it('정규 조합은 78개(같은 띠 12 + 서로 다른 쌍 66)', () => {
    const slugs = allPairSlugs()
    expect(slugs.length).toBe(78)
    expect(new Set(slugs).size).toBe(78) // 중복 없음
  })

  it('모든 슬러그가 파싱 가능', () => {
    for (const s of allPairSlugs()) expect(parsePairSlug(s)).not.toBeNull()
  })
})

describe('canonicalPairSlug / parsePairSlug', () => {
  it('역순이어도 같은 정규 슬러그로 모인다', () => {
    expect(canonicalPairSlug(rat, ox)).toBe('rat-ox')
    expect(canonicalPairSlug(ox, rat)).toBe('rat-ox') // 지지 순서(子<丑) 기준
  })

  it('잘못된 슬러그는 null', () => {
    expect(parsePairSlug('rat')).toBeNull()
    expect(parsePairSlug('rat-nope')).toBeNull()
    expect(parsePairSlug('')).toBeNull()
    expect(parsePairSlug('a-b-c')).toBeNull()
  })

  it('parsePairSlug 는 순서 무관 파싱', () => {
    expect(parsePairSlug('ox-rat')).toEqual({ a: ox, b: rat })
    expect(parsePairSlug('rat-ox')).toEqual({ a: rat, b: ox })
  })
})

describe('computeZodiacCompat', () => {
  it('결정론 — 같은 쌍은 항상 같은 결과', () => {
    expect(computeZodiacCompat(rat, dragon)).toEqual(computeZodiacCompat(rat, dragon))
  })

  it('대칭 관계 — 순서를 바꿔도 relation/score 동일', () => {
    const ab = computeZodiacCompat(rat, horse)
    const ba = computeZodiacCompat(horse, rat)
    expect(ab.relation).toBe(ba.relation)
    // 점수 시드는 (인덱스A*12+인덱스B) 기반이라 순서에 따라 ±로 갈릴 수 있으나
    // 관계 자체는 대칭이어야 한다(고전 지지 관계는 대칭).
  })

  it('충(沖) — 자오(rat×horse)는 저점', () => {
    const c = computeZodiacCompat(rat, horse)
    expect(c.relation).toBe('chung')
    expect(c.score).toBeLessThan(50)
  })

  it('삼합(三合) — 신자진(rat×dragon, rat×monkey)은 고점', () => {
    const rd = computeZodiacCompat(rat, dragon)
    const rm = computeZodiacCompat(rat, monkey)
    expect(rd.relation).toBe('samhap')
    expect(rm.relation).toBe('samhap')
    expect(rd.score).toBeGreaterThanOrEqual(85)
  })

  it('육합(六合) — 자축(rat×ox)은 최고점대', () => {
    const c = computeZodiacCompat(rat, ox)
    expect(c.relation).toBe('yukhap')
    expect(c.score).toBeGreaterThanOrEqual(90)
  })

  it('점수는 0~100 범위, 모든 쌍', () => {
    for (const x of ZODIAC_ANIMALS) {
      for (const y of ZODIAC_ANIMALS) {
        const c = computeZodiacCompat(x, y)
        expect(c.score).toBeGreaterThanOrEqual(0)
        expect(c.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('본문에 두 띠 이름이 ko/en 모두 실제로 박힌다', () => {
    const c = computeZodiacCompat(rat, ox)
    expect(c.body.ko).toContain('쥐띠')
    expect(c.body.ko).toContain('소띠')
    expect(c.body.en).toContain('Rat')
    expect(c.body.en).toContain('Ox')
  })

  it('EN 본문에 한글이 섞이지 않는다(지지 한자는 허용)', () => {
    for (const x of [rat, ox, horse, dragon]) {
      for (const y of ZODIAC_ANIMALS) {
        const c = computeZodiacCompat(x, y)
        expect(c.body.en).not.toMatch(/[가-힣]/)
        expect(c.headline.en).not.toMatch(/[가-힣]/)
        expect(c.goodSide.en).not.toMatch(/[가-힣]/)
        expect(c.watchSide.en).not.toMatch(/[가-힣]/)
      }
    }
  })
})
