// CitySearchIndex 동등성 골든 — 실데이터(public/data/cities.min.json, 13.7만
// 행) 위에서 "기준 알고리즘(예전 선형 스캔의 점수 사다리를 조기 중단 없이
// 전수 평가)"과 결과가 완전히 일치해야 한다.
//
// 기준 구현은 의도적으로 이 테스트 파일 안에 독립 복제했다(엔진 모듈을
// import 해서 비교하면 같은 버그를 양쪽이 공유해도 통과해 버린다). 예전
// 라우트와 다른 점은 HARD_CAP 조기 중단이 없다는 것뿐 — 그 캡은 "알파벳상
// 앞의 includes 매치가 캡을 선점해 prefix 매치를 밀어내는" 랭킹 결함의
// 원인이라 새 엔진에서 의도적으로 제거했고, 따라서 동등성의 기준도
// 무중단 전수 평가다.

import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CitySearchIndex, type City } from '@/lib/cities/searchEngine'
import {
  getCityNameFromKorean,
  getCityNameInKorean,
  getCountryNameInKorean,
  COUNTRY_FULL_NAME,
} from '@/lib/cities/formatter'
import { COUNTRY_NAME_KR, REGION_NAME_KR } from '@/lib/cities/lookups'

// ── 기준 구현 (예전 라우트 로직의 독립 복제, 조기 중단 제거) ──────────
const refNorm = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
const refCompact = (value: unknown) => refNorm(value).replace(/[\s,./_-]+/g, '')
const refHasHangul = (value: string) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value)

type RefIndexed = {
  city: City
  nameNorm: string
  pairNorm: string
  nameCompact: string
  pairCompact: string
  countryFullEnNorm: string
  countryFullEnCompact: string
  pairFullEnNorm: string
  pairFullEnCompact: string
  cityKrNorm?: string
  countryKrNorm?: string
  pairKrNorm?: string
  cityKrCompact?: string
  countryKrCompact?: string
  pairKrCompact?: string
  regionNorm?: string
  regionKrNorm?: string
}

function buildRefIndex(cities: City[]): RefIndexed[] {
  const indexed = cities.map((c): RefIndexed => {
    const nameNorm = refNorm(c.name)
    const countryNorm = refNorm(c.country)
    const countryFullEn = COUNTRY_FULL_NAME[c.country] || c.country
    const nameKr = getCityNameInKorean(c.name) || undefined
    const countryKr = getCountryNameInKorean(c.country) || undefined
    const cityKrNorm = nameKr ? refNorm(nameKr) : undefined
    const countryKrNorm = countryKr ? refNorm(countryKr) : undefined
    const pairKrNorm = cityKrNorm && countryKrNorm ? `${cityKrNorm}, ${countryKrNorm}` : undefined
    return {
      city: c,
      nameNorm,
      pairNorm: `${nameNorm}, ${countryNorm}`,
      nameCompact: refCompact(c.name),
      pairCompact: refCompact(`${c.name}, ${c.country}`),
      countryFullEnNorm: refNorm(countryFullEn),
      countryFullEnCompact: refCompact(countryFullEn),
      pairFullEnNorm: `${nameNorm}, ${refNorm(countryFullEn)}`,
      pairFullEnCompact: refCompact(`${c.name}, ${countryFullEn}`),
      cityKrNorm,
      countryKrNorm,
      pairKrNorm,
      cityKrCompact: nameKr ? refCompact(nameKr) : undefined,
      countryKrCompact: countryKr ? refCompact(countryKr) : undefined,
      pairKrCompact: pairKrNorm ? refCompact(pairKrNorm) : undefined,
      regionNorm: c.region ? refNorm(c.region) : undefined,
      regionKrNorm:
        c.region && REGION_NAME_KR[c.region] ? refNorm(REGION_NAME_KR[c.region]) : undefined,
    }
  })
  indexed.sort((a, b) => a.nameNorm.localeCompare(b.nameNorm))
  return indexed
}

function refSearch(indexed: RefIndexed[], rawQuery: string, limit: number): string[] {
  const query = refNorm(rawQuery)
  const queryCompact = refCompact(rawQuery)
  if (query.length < 1) return []
  const koreanAlias = refHasHangul(query) ? getCityNameFromKorean(rawQuery) : null

  const countryMatchCodes = new Set<string>()
  if (query.length >= 2) {
    for (const [code, name] of Object.entries(COUNTRY_FULL_NAME)) {
      const n = refNorm(name)
      if (n.startsWith(query) || n.includes(query)) countryMatchCodes.add(code)
    }
    for (const [code, name] of Object.entries(COUNTRY_NAME_KR)) {
      const n = refNorm(name)
      if (n.startsWith(query) || n.includes(query)) countryMatchCodes.add(code)
    }
  }
  const hasCountryMatch = countryMatchCodes.size > 0
  const hasRegionQuery = query.length >= 2

  const scored: { item: RefIndexed; score: number }[] = []
  for (const item of indexed) {
    const aliasMatch = koreanAlias ? item.nameNorm === refNorm(koreanAlias) : false
    const countryExpansionMatch = hasCountryMatch && countryMatchCodes.has(item.city.country)
    const engMatch =
      item.nameNorm.startsWith(query) ||
      item.nameNorm.includes(query) ||
      item.pairNorm.startsWith(query) ||
      item.pairNorm.includes(query) ||
      item.countryFullEnNorm.startsWith(query) ||
      item.countryFullEnNorm.includes(query) ||
      item.pairFullEnNorm.startsWith(query) ||
      item.pairFullEnNorm.includes(query) ||
      (queryCompact.length >= 2 &&
        (item.nameCompact.includes(queryCompact) ||
          item.pairCompact.includes(queryCompact) ||
          item.countryFullEnCompact.includes(queryCompact) ||
          item.pairFullEnCompact.includes(queryCompact)))
    const korMatch =
      (item.cityKrNorm && (item.cityKrNorm.startsWith(query) || item.cityKrNorm.includes(query))) ||
      (item.countryKrNorm &&
        (item.countryKrNorm.startsWith(query) || item.countryKrNorm.includes(query))) ||
      (item.pairKrNorm && (item.pairKrNorm.startsWith(query) || item.pairKrNorm.includes(query))) ||
      (queryCompact.length >= 2 &&
        ((item.cityKrCompact && item.cityKrCompact.includes(queryCompact)) ||
          (item.countryKrCompact && item.countryKrCompact.includes(queryCompact)) ||
          (item.pairKrCompact && item.pairKrCompact.includes(queryCompact))))
    const regionMatch =
      hasRegionQuery &&
      ((item.regionNorm &&
        (item.regionNorm.startsWith(query) || item.regionNorm.includes(query))) ||
        (item.regionKrNorm &&
          (item.regionKrNorm.startsWith(query) || item.regionKrNorm.includes(query))))

    if (engMatch || korMatch || aliasMatch || countryExpansionMatch || regionMatch) {
      let score = 100
      if (item.nameNorm.startsWith(query) || item.cityKrNorm?.startsWith(query)) {
        score = 0
      } else if (item.pairNorm.startsWith(query) || item.pairKrNorm?.startsWith(query)) {
        score = 5
      } else if (item.nameNorm.includes(query) || item.cityKrNorm?.includes(query)) {
        score = 10
      } else if (
        regionMatch &&
        (item.regionNorm?.startsWith(query) || item.regionKrNorm?.startsWith(query))
      ) {
        score = 11
      } else if (
        item.countryFullEnNorm.startsWith(query) ||
        item.countryKrNorm?.startsWith(query)
      ) {
        score = 12
      } else if (regionMatch) {
        score = 13
      } else if (countryExpansionMatch) {
        score = 14
      } else {
        score = 15
      }
      scored.push({ item, score })
    }
  }

  scored.sort((a, b) => a.score - b.score || a.item.city.name.localeCompare(b.item.city.name))
  return scored
    .slice(0, limit)
    .map(({ item }) => `${item.city.name}|${item.city.country}|${item.city.lat}|${item.city.lon}`)
}

// ── 테스트 본문 ─────────────────────────────────────────────────────
const QUERIES = [
  // 자동완성 핫패스 (en prefix, 1~6자)
  's',
  'se',
  'seo',
  'seou',
  'seoul',
  'b',
  'bu',
  'busan',
  'to',
  'tok',
  'tokyo',
  'new',
  'new york',
  'san',
  'paris',
  'spring',
  'springf',
  // pair prefix
  'seoul,',
  'seoul, kr',
  'paris, fr',
  'springfield, ',
  // 한국어
  '서',
  '서울',
  '부산',
  '도쿄',
  'ㅅ',
  '런던',
  // 국가 확장 / 지역
  'korea',
  'south korea',
  '한국',
  '대한민국',
  'indonesia',
  '인도네시아',
  'illinois',
  '일리노이',
  'usa',
  'united states',
  // 다이어크리틱/compact
  'sao paulo',
  'são paulo',
  'saopaulo',
  'newyork',
  // includes / 희귀 / 무매치
  'ork',
  'xyzzyq',
  'qq',
  'x',
]
const LIMITS = [1, 3, 10, 50]

let cities: City[]
let engine: CitySearchIndex
let refIndex: RefIndexed[]

beforeAll(() => {
  const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'cities.min.json'), 'utf8')
  cities = JSON.parse(raw.replace(/^﻿/, '')) as City[]
  engine = new CitySearchIndex(cities)
  refIndex = buildRefIndex(cities)
}, 120_000)

describe('CitySearchIndex — 기준 알고리즘과 실데이터 동등성', () => {
  it('실데이터 로드 sanity (수천 행 이상)', () => {
    // 라우트 옛 주석의 "137k" 는 stale — filter-cities-to-translated 이후
    // 실데이터는 ~9k 행이다. 회귀(빈 파일/포맷 깨짐)만 잡는다.
    expect(cities.length).toBeGreaterThan(8_000)
    expect(engine.size).toBe(cities.length)
  })

  for (const q of QUERIES) {
    it(`query=${JSON.stringify(q)} — 모든 limit 에서 결과 일치`, () => {
      const koreanAlias = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(refNorm(q)) ? getCityNameFromKorean(q) : null
      for (const limit of LIMITS) {
        const got = engine
          .search(q, limit, koreanAlias)
          .map((c) => `${c.name}|${c.country}|${c.lat}|${c.lon}`)
        const want = refSearch(refIndex, q, limit)
        expect(got, `q=${q} limit=${limit}`).toEqual(want)
      }
    })
  }
})

describe('CitySearchIndex — 성능 스모크', () => {
  it('prefix 자동완성 200회가 1초 안에 끝난다 (예전: 회당 50~150ms)', () => {
    const prefixes = ['s', 'se', 'seo', 'seou', 'seoul', 'b', 'bu', 'bus', 'busa', 'busan']
    const t0 = performance.now()
    for (let i = 0; i < 20; i++) {
      for (const p of prefixes) engine.search(p, 10, null)
    }
    const elapsed = performance.now() - t0
    // 느슨한 상한 — CI 머신 편차 흡수. 회귀(선형 스캔 복귀)는 10초 이상
    // 걸리므로 확실히 잡힌다.
    expect(elapsed).toBeLessThan(1000)
  })
})
