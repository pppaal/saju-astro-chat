// 도시 검색 엔진 — /api/cities 의 핫패스.
//
// 예전 구현은 매 키 입력마다 13.7만 행을 선형 스캔하며 행당 12개 이상의
// 문자열 비교를 수행했다(모바일에서 입력당 50~150ms). 게다가 HARD_CAP
// (limit×3) 조기 중단 때문에, 알파벳상 앞에 있는 includes 매치(점수 10+)가
// 캡을 먼저 채우면 정작 prefix 매치(점수 0)가 잘려 나가는 랭킹 결함이
// 있었다.
//
// 새 구조:
//   - 점수 0(이름 prefix): nameNorm/cityKrNorm 정렬 배열에 이진 탐색 →
//     O(log n + k). 자동완성의 지배적 경로.
//   - 점수 5(pair prefix, "seoul, kr" 류): 쿼리의 쉼표 위치로 이름부를
//     잘라 exact-name Map 조회 → O(쉼표 개수).
//   - 0·5 버킷 합이 limit 를 채우면 스캔 자체를 생략.
//   - 부족할 때만 전체 스캔 폴백(점수 10~15) — 단, 조기 중단 없이 완주
//     하므로 위 랭킹 결함이 사라진다(낮은 점수가 높은 점수를 밀어낼 수
//     없음). 폴백 빈도는 낮다: 짧은 prefix 는 0번 버킷이 넘치고, 긴
//     쿼리는 스캔해도 매치가 적다.
//
// 점수 사다리(0/5/10/11/12/13/14/15)와 동점 시 이름순 정렬은 예전 구현과
// 동일 — 동등성은 tests/lib/cities/searchEngine.equivalence.test.ts 가
// 실데이터 전수로 잠근다.

import {
  getCityNameInKorean,
  getCountryNameInKorean,
  COUNTRY_FULL_NAME,
} from '@/lib/cities/formatter'
import { COUNTRY_NAME_KR, REGION_NAME_KR } from '@/lib/cities/lookups'

export type City = {
  name: string
  country: string
  lat: number
  lon: number
  // dr5hn 의 state.name (영문). build-cities-min.py 가 region 없는 row 는
  // drop 하므로 항상 존재. KO 표시는 REGION_NAME_KR 로 변환.
  region: string
}

export type CityResult = City & {
  nameKr?: string
  countryKr?: string
  displayKr?: string
  displayEn?: string
}

type IndexedCity = {
  /** byName(스캔) 순서 — 동점 정렬 시 기준 구현(stable sort)과 일치시키는 타이브레이크. */
  ord: number
  city: City
  nameNorm: string
  countryNorm: string
  pairNorm: string
  nameCompact: string
  pairCompact: string
  countryFullEnNorm: string
  countryFullEnCompact: string
  pairFullEnNorm: string
  pairFullEnCompact: string
  nameKr?: string
  countryKr?: string
  cityKrNorm?: string
  countryKrNorm?: string
  pairKrNorm?: string
  cityKrCompact?: string
  countryKrCompact?: string
  pairKrCompact?: string
  regionNorm?: string
  regionKrNorm?: string
  displayKr?: string
  displayEn: string
}

// NFKD decomposes accented chars into base + combining mark (예: "ã" → "a" + "˜"),
// 그 다음 combining mark 를 제거하면 "São Paulo" → "sao paulo" 로 매칭된다.
export const norm = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()

export const compact = (value: unknown) => norm(value).replace(/[\s,./_-]+/g, '')
export const hasHangul = (value: string) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value)

function buildIndexedCity(c: City): IndexedCity {
  const nameNorm = norm(c.name)
  const countryNorm = norm(c.country)
  const pairNorm = `${nameNorm}, ${countryNorm}`
  const nameCompact = compact(c.name)
  const pairCompact = compact(`${c.name}, ${c.country}`)

  const countryFullEn = COUNTRY_FULL_NAME[c.country] || c.country
  const countryFullEnNorm = norm(countryFullEn)
  const countryFullEnCompact = compact(countryFullEn)
  const pairFullEnNorm = `${nameNorm}, ${countryFullEnNorm}`
  const pairFullEnCompact = compact(`${c.name}, ${countryFullEn}`)

  const nameKr = getCityNameInKorean(c.name) || undefined
  const countryKr = getCountryNameInKorean(c.country) || undefined
  const cityKrNorm = nameKr ? norm(nameKr) : undefined
  const countryKrNorm = countryKr ? norm(countryKr) : undefined
  const pairKrNorm = cityKrNorm && countryKrNorm ? `${cityKrNorm}, ${countryKrNorm}` : undefined
  const cityKrCompact = nameKr ? compact(nameKr) : undefined
  const countryKrCompact = countryKr ? compact(countryKr) : undefined
  const pairKrCompact = pairKrNorm ? compact(pairKrNorm) : undefined

  const regionNorm = c.region ? norm(c.region) : undefined
  const regionKrNorm =
    c.region && REGION_NAME_KR[c.region] ? norm(REGION_NAME_KR[c.region]) : undefined

  // Display rules:
  //   KO Korean city → just city name (e.g. 서울)
  //   KO foreign city → "{nameKr}, {regionKr?}, {countryKr}"
  //   EN every city  → "{name}, {region?}, {countryFull}"
  // region 은 city 와 동일하거나 한쪽이 다른 쪽을 포함하면 생략.
  const regionEn = c.region
  const regionKr = regionEn ? REGION_NAME_KR[regionEn] : undefined
  let regionPartEn = ''
  let regionPartKr = ''
  if (regionEn) {
    const rl = regionEn.toLowerCase()
    const nl = c.name.toLowerCase()
    const redundant = rl === nl || rl.includes(nl) || nl.includes(rl)
    if (!redundant) {
      regionPartEn = `, ${regionEn}`
      regionPartKr = `, ${regionKr || regionEn}`
    }
  }

  const displayKr =
    c.country === 'KR'
      ? nameKr || c.name
      : nameKr && countryKr
        ? `${nameKr}${regionPartKr}, ${countryKr}`
        : nameKr
          ? `${nameKr}${regionPartKr}, ${c.country}`
          : undefined
  const displayEn = `${c.name}${regionPartEn}, ${countryFullEn}`

  return {
    ord: 0, // 생성자에서 정렬 후 부여
    city: c,
    nameNorm,
    countryNorm,
    pairNorm,
    nameCompact,
    pairCompact,
    countryFullEnNorm,
    countryFullEnCompact,
    pairFullEnNorm,
    pairFullEnCompact,
    nameKr,
    countryKr,
    cityKrNorm,
    countryKrNorm,
    pairKrNorm,
    cityKrCompact,
    countryKrCompact,
    pairKrCompact,
    regionNorm,
    regionKrNorm,
    displayKr,
    displayEn,
  }
}

function lowerBound(
  sorted: IndexedCity[],
  key: (it: IndexedCity) => string,
  target: string
): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (key(sorted[mid]) < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * 정렬 배열에서 key 가 prefix 로 시작하는 [start, end) 범위.
 * 상한은 lowerBound(prefix + U+FFFF) — norm 결과에 U+FFFF 는 등장하지 않고,
 * prefix 로 시작하는 모든 키는 그보다 작으며, 그렇지 않은 키는 크다.
 */
function prefixRange(
  sorted: IndexedCity[],
  key: (it: IndexedCity) => string,
  prefix: string
): [number, number] {
  return [lowerBound(sorted, key, prefix), lowerBound(sorted, key, prefix + '\uffff')]
}

/**
 * 이름(localeCompare, 동점이면 ord) 기준 상위 k 개 — 1~2글자 prefix 처럼
 * 범위가 수천 개일 때 전체 정렬 대신 bounded 삽입으로 선택한다.
 * 결과는 전체 정렬 후 slice(0, k) 와 동일 (비교자가 전순서이므로).
 */
function topKByName(items: IndexedCity[], k: number): IndexedCity[] {
  if (items.length <= k) return [...items].sort(cmpNameOrd)
  const top: IndexedCity[] = []
  for (const it of items) {
    if (top.length === k && cmpNameOrd(it, top[top.length - 1]) >= 0) continue
    // 이진 탐색 삽입 (k ≤ 50 이라 splice 비용 무시 가능)
    let lo = 0
    let hi = top.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cmpNameOrd(top[mid], it) <= 0) lo = mid + 1
      else hi = mid
    }
    top.splice(lo, 0, it)
    if (top.length > k) top.pop()
  }
  return top
}

/** 기준 구현의 stable sort 와 동일한 전순서: 이름 localeCompare → 스캔 순서. */
function cmpNameOrd(a: IndexedCity, b: IndexedCity): number {
  return a.city.name.localeCompare(b.city.name) || a.ord - b.ord
}

export class CitySearchIndex {
  /** nameNorm 사전순 — 예전 구현의 cachedIndex 정렬과 동일. */
  private byName: IndexedCity[]
  /** cityKrNorm 보유 도시만, cityKrNorm 사전순. */
  private byKrName: IndexedCity[]
  /** 정확한 nameNorm → 도시들 (pair prefix 의 이름부 exact 조회용). */
  private nameExact = new Map<string, IndexedCity[]>()
  private krNameExact = new Map<string, IndexedCity[]>()
  // country/region 이름 → 매치 판정용 캐시 (158 + 5,060 entries — 스캔 비용 무시 가능)
  private countryLookup: { en: Array<[string, string]>; kr: Array<[string, string]> }
  private regionNorms: { en: string[]; kr: string[] }

  constructor(cities: City[]) {
    const indexed = cities.map(buildIndexedCity)
    indexed.sort((a, b) => (a.nameNorm < b.nameNorm ? -1 : a.nameNorm > b.nameNorm ? 1 : 0))
    for (let i = 0; i < indexed.length; i++) indexed[i].ord = i
    this.byName = indexed

    this.byKrName = indexed
      .filter((it) => it.cityKrNorm)
      .sort((a, b) => (a.cityKrNorm! < b.cityKrNorm! ? -1 : a.cityKrNorm! > b.cityKrNorm! ? 1 : 0))

    for (const it of indexed) {
      const en = this.nameExact.get(it.nameNorm)
      if (en) en.push(it)
      else this.nameExact.set(it.nameNorm, [it])
      if (it.cityKrNorm) {
        const kr = this.krNameExact.get(it.cityKrNorm)
        if (kr) kr.push(it)
        else this.krNameExact.set(it.cityKrNorm, [it])
      }
    }

    this.countryLookup = {
      en: Object.entries(COUNTRY_FULL_NAME).map(([code, name]) => [norm(name), code]),
      kr: Object.entries(COUNTRY_NAME_KR).map(([code, name]) => [norm(name), code]),
    }
    const en: string[] = []
    const kr: string[] = []
    for (const [eng, ko] of Object.entries(REGION_NAME_KR)) {
      en.push(norm(eng))
      kr.push(norm(ko))
    }
    this.regionNorms = { en, kr }
  }

  get size(): number {
    return this.byName.length
  }

  /** query.length < 2 면 빈 Set (한 글자는 과확장 — 예전 구현과 동일). */
  private findMatchingCountryCodes(query: string): Set<string> {
    const codes = new Set<string>()
    if (query.length < 2) return codes
    for (const [name, code] of this.countryLookup.en) {
      if (name.startsWith(query) || name.includes(query)) codes.add(code)
    }
    for (const [name, code] of this.countryLookup.kr) {
      if (name.startsWith(query) || name.includes(query)) codes.add(code)
    }
    return codes
  }

  /**
   * 검색 — 점수 사다리와 동점 이름순 정렬은 예전 선형 스캔 구현과 동일하되,
   * 조기 중단이 없으므로 "낮은 점수가 캡을 선점해 높은 점수를 밀어내는"
   * 일이 없다 (전수 평가와 동일한 결과).
   *
   * @param rawQuery 사용자가 입력한 원문 (norm 전)
   * @param koreanAlias getCityNameFromKorean(rawQuery) 결과 (라우트가 주입)
   */
  search(rawQuery: string, limit: number, koreanAlias: string | null): CityResult[] {
    const query = norm(rawQuery)
    if (query.length < 1) return []
    const queryCompact = compact(rawQuery)

    const seen = new Set<IndexedCity>()
    const buckets: Array<{ score: number; items: IndexedCity[] }> = []

    // ── 점수 0: 이름 prefix (en ∪ kr) — 이진 탐색 ──────────────────
    const score0: IndexedCity[] = []
    {
      const [s, e] = prefixRange(this.byName, (it) => it.nameNorm, query)
      for (let i = s; i < e; i++) score0.push(this.byName[i])
      const [ks, ke] = prefixRange(this.byKrName, (it) => it.cityKrNorm!, query)
      for (let i = ks; i < ke; i++) {
        const it = this.byKrName[i]
        if (!it.nameNorm.startsWith(query)) score0.push(it) // en 범위와 중복 방지
      }
      for (const it of score0) seen.add(it)
      if (score0.length) buckets.push({ score: 0, items: score0 })
    }

    // ── 점수 5: pair prefix — 쿼리의 쉼표 위치로 이름부 exact 조회 ──
    // pairNorm = `${name}, ${country}` 이므로 pair.startsWith(query) 이면서
    // name.startsWith(query) 가 아니려면 query 가 이름 전체 + ", ..." 꼴.
    {
      const score5: IndexedCity[] = []
      for (let i = 1; i < query.length; i++) {
        if (query[i] !== ',') continue
        const namePart = query.slice(0, i)
        for (const it of this.nameExact.get(namePart) ?? []) {
          if (!seen.has(it) && it.pairNorm.startsWith(query)) {
            score5.push(it)
            seen.add(it)
          }
        }
        for (const it of this.krNameExact.get(namePart) ?? []) {
          if (!seen.has(it) && it.pairKrNorm?.startsWith(query)) {
            score5.push(it)
            seen.add(it)
          }
        }
      }
      if (score5.length) buckets.push({ score: 5, items: score5 })
    }

    let total = 0
    for (const b of buckets) total += b.items.length

    // ── 폴백: 0·5 로 limit 를 못 채우면 잔여 점수(10~15) 전체 스캔 ────
    if (total < limit) {
      const countryMatchCodes = this.findMatchingCountryCodes(query)
      const hasCountryMatch = countryMatchCodes.size > 0
      const hasRegionQuery = query.length >= 2
      const aliasNorm = koreanAlias ? norm(koreanAlias) : null

      const rest: Array<{ item: IndexedCity; score: number }> = []
      for (const item of this.byName) {
        if (seen.has(item)) continue

        const aliasMatch = aliasNorm ? item.nameNorm === aliasNorm : false
        const countryExpansionMatch = hasCountryMatch && countryMatchCodes.has(item.city.country)

        const engMatch =
          item.nameNorm.includes(query) ||
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
          (item.cityKrNorm && item.cityKrNorm.includes(query)) ||
          (item.countryKrNorm &&
            (item.countryKrNorm.startsWith(query) || item.countryKrNorm.includes(query))) ||
          (item.pairKrNorm && item.pairKrNorm.includes(query)) ||
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
          // 점수 사다리 — 예전 구현과 동일. 0/5 분기는 seen 제외로 이 지점에
          // 도달하는 행에서 참일 수 없으므로 생략(증명: seen = 0·5 의 전체집합).
          let score: number
          if (item.nameNorm.includes(query) || item.cityKrNorm?.includes(query)) {
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
          rest.push({ item, score })
        }
      }

      rest.sort((a, b) => a.score - b.score || cmpNameOrd(a.item, b.item))
      // rest 를 점수별 버킷으로 이어 붙인다 (이미 정렬됨).
      let i = 0
      while (i < rest.length) {
        const score = rest[i].score
        const items: IndexedCity[] = []
        while (i < rest.length && rest[i].score === score) items.push(rest[i++].item)
        buckets.push({ score, items })
      }
    }

    // ── 버킷 순서대로 이름순 정렬해 limit 까지 수집 ───────────────────
    const out: CityResult[] = []
    for (const b of buckets) {
      if (out.length >= limit) break
      for (const it of topKByName(b.items, limit - out.length)) {
        if (out.length >= limit) break
        out.push({
          ...it.city,
          nameKr: it.nameKr,
          countryKr: it.countryKr,
          displayKr: it.displayKr,
          displayEn: it.displayEn,
        })
      }
    }
    return out
  }
}
