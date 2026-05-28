import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'
import {
  getCityNameFromKorean,
  getCityNameInKorean,
  getCountryNameInKorean,
  COUNTRY_FULL_NAME,
} from '@/lib/cities/formatter'
import { COUNTRY_NAME_KR, REGION_NAME_KR } from '@/lib/cities/lookups'
import { citiesSearchQuerySchema } from '@/lib/api/zodValidation'
import { HTTP_STATUS } from '@/lib/constants/http'

export const runtime = 'nodejs'

type City = {
  name: string
  country: string
  lat: number
  lon: number
  // dr5hn 의 state.name (영문). build-cities-min.py 가 region 없는 row 는
  // drop 하므로 항상 존재. KO 표시는 REGION_NAME_KR 로 변환.
  region: string
}

type CityResult = City & {
  nameKr?: string
  countryKr?: string
  displayKr?: string
  displayEn?: string
}

type IndexedCity = {
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
  // region 검색용 norm 필드. 사용자가 "일리노이" 또는 "Illinois" 검색 시
  // 그 region 의 모든 도시를 expansion 대상으로 끌어옴.
  regionNorm?: string
  regionKrNorm?: string
  displayKr?: string
  displayEn: string
}

let cachedCities: City[] | null = null
let cachedIndex: IndexedCity[] | null = null
let loading: Promise<City[]> | null = null
let cachedCountryLookup: { en: Array<[string, string]>; kr: Array<[string, string]> } | null = null

// NFKD decomposes accented chars into base + combining mark (예: "ã" → "a" + "˜"),
// 그 다음 combining mark 를 제거하면 "São Paulo" → "sao paulo" 로 매칭된다.
// 사용자가 "Sao Paulo" 든 "São Paulo" 든 같은 결과 받게 하는 키. NFKC 만으로는
// 다이어크리틱이 살아있어 검색 miss 가 났다.
const norm = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()

const compact = (value: unknown) => norm(value).replace(/[\s,./_-]+/g, '')
const hasHangul = (value: string) => /[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/.test(value)

// Reverse lookups: country name \u2192 ISO code. Built once per process the first
// time a request comes in, so a query that is purely a country name
// (e.g. "Indonesia" / "\uc778\ub3c4\ub124\uc2dc\uc544") expands to every city in that country
// instead of needing a city-name hit. 158 entries each \u2014 cheap.
function getCountryLookup() {
  if (cachedCountryLookup) return cachedCountryLookup
  const en: Array<[string, string]> = Object.entries(COUNTRY_FULL_NAME).map(([code, name]) => [
    norm(name),
    code,
  ])
  const kr: Array<[string, string]> = Object.entries(COUNTRY_NAME_KR).map(([code, name]) => [
    norm(name),
    code,
  ])
  cachedCountryLookup = { en, kr }
  return cachedCountryLookup
}

// Country codes whose full English or Korean name matches the query. Skip
// single-char queries \u2014 they would over-expand (e.g. "u" \u2192 United States,
// United Kingdom, Uganda, \u2026) and the city-name path already covers them.
function findMatchingCountryCodes(query: string): Set<string> {
  const codes = new Set<string>()
  if (query.length < 2) return codes
  const { en, kr } = getCountryLookup()
  for (const [name, code] of en) {
    if (name.startsWith(query) || name.includes(query)) codes.add(code)
  }
  for (const [name, code] of kr) {
    if (name.startsWith(query) || name.includes(query)) codes.add(code)
  }
  return codes
}

// 1 \ud68c \ube4c\ub4dc \ud6c4 cache \u2014 region \uc601\ubb38/\ud55c\uae00 norm \ub9ac\uc2a4\ud2b8 5060 + 5060 entries.
let cachedRegionNorms: { en: string[]; kr: string[] } | null = null
function getRegionNorms() {
  if (cachedRegionNorms) return cachedRegionNorms
  const en: string[] = []
  const kr: string[] = []
  for (const [eng, ko] of Object.entries(REGION_NAME_KR)) {
    en.push(norm(eng))
    kr.push(norm(ko))
  }
  cachedRegionNorms = { en, kr }
  return cachedRegionNorms
}

// query \uac00 \uc5b4\ub5a4 region \uc774\ub984\uacfc \ub9e4\uce58\ud558\ub294\uc9c0 \ubbf8\ub9ac \ud655\uc778. \ub9e4\uce58 \uc788\uc73c\uba74 search \ub8e8\ud504
// \uc5d0\uc11c region match \uac00 indexed \uc804\uccb4\uc5d0 \ud769\uc5b4\uc838 \uc788\uc744 \uc218 \uc788\uc5b4 HARD_CAP early-
// break \ub97c \ube44\ud65c\uc131\ud654\ud574\uc57c \ud55c\ub2e4.
function queryHitsAnyRegion(query: string): boolean {
  if (query.length < 2) return false
  const { en, kr } = getRegionNorms()
  for (const n of en) {
    if (n.startsWith(query) || n.includes(query)) return true
  }
  for (const n of kr) {
    if (n.startsWith(query) || n.includes(query)) return true
  }
  return false
}

async function loadCities(): Promise<City[]> {
  if (cachedCities) {
    return cachedCities
  }
  if (!loading) {
    loading = (async () => {
      const filePath = path.join(process.cwd(), 'public', 'data', 'cities.min.json')
      try {
        const raw = await fs.readFile(filePath, 'utf-8')
        const sanitized = raw.replace(/^\uFEFF/, '')
        const data = JSON.parse(sanitized)
        cachedCities = Array.isArray(data) ? data : []
        return cachedCities
      } catch (err) {
        // Reset loading state on failure to allow retry
        loading = null
        if (err instanceof SyntaxError) {
          logger.error('[cities] Invalid JSON format in cities.min.json')
          throw new Error('City data file is corrupted')
        }
        // File not found or other I/O error
        logger.error(
          '[cities] Failed to load cities data:',
          err instanceof Error ? err.message : 'Unknown error'
        )
        throw new Error('City data unavailable')
      }
    })()
  }
  return loading
}

async function loadCityIndex(): Promise<IndexedCity[]> {
  if (cachedIndex) {
    return cachedIndex
  }

  const cities = await loadCities()
  const indexed: IndexedCity[] = cities.map((c) => {
    const nameNorm = norm(c.name)
    const countryNorm = norm(c.country)
    const pairNorm = `${nameNorm}, ${countryNorm}`
    const nameCompact = compact(c.name)
    const pairCompact = compact(`${c.name}, ${c.country}`)

    // Full English country name (e.g. "Indonesia") so a query like
    // "indonesia" or "united states" matches every city in that country.
    // The 2-letter code already in pairNorm doesn't help English queries.
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
    //   KO foreign city → "{nameKr}, {regionKr?}, {countryKr}" (e.g. "스프링필드, 일리노이, 미국")
    //   EN every city  → "{name}, {region?}, {countryFull}" (e.g. "Springfield, Illinois, United States")
    // region 은 city 와 동일하거나 한쪽이 다른 쪽을 포함하면 생략
    // ("Seoul, Seoul Special City" 같은 redundancy 회피).
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
  })

  // nameNorm 으로 사전순 정렬 → 검색 시 score=0 (startsWith) 매치가
  // 알파벳 순서로 나와 사용자가 첫 글자만 쳐도 인기/사전순 도시가 위로 옴.
  // 또한 early-break 로직과 결합하면 137k 전체 스캔 없이 limit 만큼만 모음.
  indexed.sort((a, b) => a.nameNorm.localeCompare(b.nameNorm))

  cachedIndex = indexed
  return cachedIndex
}

export const GET = withApiMiddleware(
  async (request: NextRequest, _context: ApiContext) => {
    const { searchParams } = new URL(request.url)
    const queryValidation = citiesSearchQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'validation_failed', details: queryValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const query = norm(queryValidation.data.q)
    const queryCompact = compact(queryValidation.data.q)
    const limit = queryValidation.data.limit
    const koreanAlias = hasHangul(query) ? getCityNameFromKorean(queryValidation.data.q) : null

    logger.info('[cities API] Query:', { query, limit })

    if (query.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const indexedData = await loadCityIndex()
    logger.info('[cities API] Loaded cities count:', { count: indexedData.length })
    const scored: { item: IndexedCity; score: number }[] = []

    // If the query matches any country (e.g. "Indonesia" / "인도네시아"),
    // expand to every city in that country. When this set is non-empty we
    // scan the full index — country-matches are scattered through the
    // alphabetically-sorted index, so the HARD_CAP early-break would clip
    // off most of them.
    const countryMatchCodes = findMatchingCountryCodes(query)
    const hasCountryMatch = countryMatchCodes.size > 0
    // 단일 글자 region (예: "u") 은 무의미하게 너무 많이 매칭되어 skip.
    // 2 글자 이상부터 region expansion 활성화. country expansion 과 같은
    // 이유로 region 매치 시에도 full scan (early-break 없이) 필요.
    const hasRegionQuery = query.length >= 2
    // query 가 실제로 어떤 region 이름과 매치되는지 미리 확인. 매치되면
    // HARD_CAP early-break 를 비활성 — region 도시가 alphabetic index 에
    // 흩어져 있어 일부만 모으면 결과 누락.
    const queryMatchesRegion = hasRegionQuery && queryHitsAnyRegion(query)

    // 137k 도시를 매 키 입력마다 전부 스캔하면 모바일에서 한 글자당 수백 ms.
    // 대부분의 검색 의도는 startsWith (score=0/5). limit 의 3 배가 모이면
    // 그 이상 includes/contains 후보를 더 끌어와도 결과 페이지에 못 들어옴.
    // → 충분히 모이면 끊는다. 점수 분포가 충분해서 sort 후 limit slice 가
    //   여전히 의도된 결과를 돌려준다.
    const HARD_CAP = limit * 3

    for (const item of indexedData) {
      const aliasMatch = koreanAlias ? item.nameNorm === norm(koreanAlias) : false

      // Country expansion: query matched a country name, so every city in
      // that country is a candidate (city itself may not contain the query).
      const countryExpansionMatch = hasCountryMatch && countryMatchCodes.has(item.city.country)

      // Check English matches (now includes full country name like "Indonesia"
      // instead of just the 2-letter code).
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

      // Check Korean matches
      const korMatch =
        (item.cityKrNorm &&
          (item.cityKrNorm.startsWith(query) || item.cityKrNorm.includes(query))) ||
        (item.countryKrNorm &&
          (item.countryKrNorm.startsWith(query) || item.countryKrNorm.includes(query))) ||
        (item.pairKrNorm &&
          (item.pairKrNorm.startsWith(query) || item.pairKrNorm.includes(query))) ||
        (queryCompact.length >= 2 &&
          ((item.cityKrCompact && item.cityKrCompact.includes(queryCompact)) ||
            (item.countryKrCompact && item.countryKrCompact.includes(queryCompact)) ||
            (item.pairKrCompact && item.pairKrCompact.includes(queryCompact))))

      // Region match — "Illinois" / "일리노이" 같은 admin1 이름이 그 region 의
      // 모든 도시를 결과에 끌어옴. region 은 city 보다 구체적이므로 country
      // 보다 우선 score (12 country < 11 region < 10 city includes).
      const regionMatch =
        hasRegionQuery &&
        ((item.regionNorm &&
          (item.regionNorm.startsWith(query) || item.regionNorm.includes(query))) ||
          (item.regionKrNorm &&
            (item.regionKrNorm.startsWith(query) || item.regionKrNorm.includes(query))))

      if (engMatch || korMatch || aliasMatch || countryExpansionMatch || regionMatch) {
        // Score (lower is better). City-name hits always rank above
        // country-only hits so typing "ind" still surfaces "Indianapolis"
        // before Indonesia's 1902 cities.
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
          // region 의 startsWith — 사용자가 region 이름의 시작을 쳤다.
          // city 의 includes(10) 보다는 약하고 country prefix(12) 보다는 강함.
          score = 11
        } else if (
          item.countryFullEnNorm.startsWith(query) ||
          item.countryKrNorm?.startsWith(query)
        ) {
          score = 12
        } else if (regionMatch) {
          // region 의 includes — 더 약한 매치.
          score = 13
        } else if (countryExpansionMatch) {
          score = 14
        } else {
          score = 15
        }

        scored.push({ item, score })

        // Only break early when we have NOT expanded to a country or region.
        // Country / region expansion needs the full scan to gather every
        // matching city before sorting/slicing — those matches are scattered
        // across the alphabetically-sorted index.
        if (!hasCountryMatch && !queryMatchesRegion && scored.length >= HARD_CAP) break
      }
    }

    scored.sort((a, b) => a.score - b.score || a.item.city.name.localeCompare(b.item.city.name))
    const results: CityResult[] = scored.slice(0, limit).map(({ item }) => {
      return {
        ...item.city,
        nameKr: item.nameKr,
        countryKr: item.countryKr,
        displayKr: item.displayKr,
        displayEn: item.displayEn,
      }
    })

    logger.info('[cities API] Found results:', { count: results.length })
    const response = NextResponse.json({ results })
    response.headers.set('Cache-Control', 'public, max-age=86400')
    return response
  },
  createSimpleGuard({
    route: '/api/cities',
    limit: 60,
    windowSeconds: 60,
  })
)
