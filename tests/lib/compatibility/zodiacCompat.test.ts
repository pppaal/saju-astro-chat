// tests/lib/compatibility/zodiacCompat.test.ts
//
// 띠궁합 엔진 — 핵심 계약: (1) 결정론(같은 쌍 → 같은 결과, 대칭 관계는 순서 무관
// 관계 동일), (2) 정규 슬러그가 대칭을 하나로 모으고 78개(12+66)를 낸다,
// (3) 육합/삼합은 고점·충은 저점, (4) ko/en 본문에 두 띠 이름이 실제로 박힌다.

import { describe, it, expect } from 'vitest'
import {
  allPairSlugs,
  canonicalPair,
  canonicalPairSlug,
  parsePairSlug,
  computeZodiacCompat,
} from '@/lib/compatibility/zodiacCompat'
import { getAnimalBySlug, relationForDay, ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'

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
    expect(ab.score).toBe(ba.score)
  })

  // 재감사 CS-4: 예전엔 시드 (idxA*12+idxB)%7 와 방향별 기준점(seng-in 80/out 78,
  // geuk-in 55/out 58)이 순서를 타 144쌍 중 126쌍의 점수, 6쌍의 등급이 갈렸다.
  it('A×B = B×A — 144 ordered pairs: identical result (score, grade, relation, copy)', () => {
    for (const x of ZODIAC_ANIMALS) {
      for (const y of ZODIAC_ANIMALS) {
        const xy = computeZodiacCompat(x, y)
        const yx = computeZodiacCompat(y, x)
        expect(yx, `${x.slug}-${y.slug}`).toEqual(xy)
        expect(yx.gradeLabel).toEqual(xy.gradeLabel)
        // 결과의 a→b 는 정규 순서이고, 방향 관계(seng-in/out 등)는 그 a→b 기준이다.
        expect(canonicalPairSlug(xy.a, xy.b)).toBe(`${xy.a.slug}-${xy.b.slug}`)
        expect(xy.relation).toBe(relationForDay(xy.a.branch, xy.b.branch))
      }
    }
  })

  it('정규 슬러그의 점수는 그대로 — 역순은 정규 순서 값을 따른다', () => {
    // 재감사 verdict corrected_expected: 정규 순서 값이 기준.
    const pick = (slug: string) => {
      const p = parsePairSlug(slug)!
      return computeZodiacCompat(p.a, p.b)
    }
    expect(pick('rat-ox').score).toBe(93)
    expect(pick('ox-rat').score).toBe(93)
    expect(pick('rooster-rat').score).toBe(49)
    expect(pick('rooster-rat').gradeLabel.en).toBe('High-friction')
    expect(pick('horse-rabbit').score).toBe(47)
    expect(pick('dog-rooster').score).toBe(50)
    expect(pick('dog-rooster').gradeLabel.en).toBe('Needs work')
    expect(pick('snake-rabbit').score).toBe(83)
    expect(pick('snake-rabbit').gradeLabel.en).toBe('Excellent')
  })

  it('canonicalPair puts the earlier branch first', () => {
    expect(canonicalPair(ox, rat)).toEqual({ a: rat, b: ox })
    expect(canonicalPair(rat, ox)).toEqual({ a: rat, b: ox })
    expect(computeZodiacCompat(ox, rat).a).toBe(rat)
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
