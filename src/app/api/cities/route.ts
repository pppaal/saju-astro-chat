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
import { citiesSearchQuerySchema } from '@/lib/api/zodValidation'
import { HTTP_STATUS } from '@/lib/constants/http'

export const runtime = 'nodejs'

type City = {
  name: string
  country: string
  lat: number
  lon: number
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
  nameKr?: string
  countryKr?: string
  cityKrNorm?: string
  countryKrNorm?: string
  pairKrNorm?: string
  cityKrCompact?: string
  countryKrCompact?: string
  pairKrCompact?: string
  displayKr?: string
  displayEn: string
}

let cachedCities: City[] | null = null
let cachedIndex: IndexedCity[] | null = null
let loading: Promise<City[]> | null = null

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

    const nameKr = getCityNameInKorean(c.name) || undefined
    const countryKr = getCountryNameInKorean(c.country) || undefined
    const cityKrNorm = nameKr ? norm(nameKr) : undefined
    const countryKrNorm = countryKr ? norm(countryKr) : undefined
    const pairKrNorm = cityKrNorm && countryKrNorm ? `${cityKrNorm}, ${countryKrNorm}` : undefined
    const cityKrCompact = nameKr ? compact(nameKr) : undefined
    const countryKrCompact = countryKr ? compact(countryKr) : undefined
    const pairKrCompact = pairKrNorm ? compact(pairKrNorm) : undefined

    // Display rules:
    //   KO Korean city → just city name (e.g. 서울)
    //   KO foreign city → "{nameKr}, {countryKr}" (e.g. 도쿄, 일본)
    //   EN every city  → "{name}, {countryFull}" (e.g. Seoul, Korea)
    const displayKr =
      c.country === 'KR'
        ? nameKr || c.name
        : nameKr && countryKr
          ? `${nameKr}, ${countryKr}`
          : nameKr
            ? `${nameKr}, ${c.country}`
            : undefined
    const countryFullEn = COUNTRY_FULL_NAME[c.country] || c.country
    const displayEn = `${c.name}, ${countryFullEn}`

    return {
      city: c,
      nameNorm,
      countryNorm,
      pairNorm,
      nameCompact,
      pairCompact,
      nameKr,
      countryKr,
      cityKrNorm,
      countryKrNorm,
      pairKrNorm,
      cityKrCompact,
      countryKrCompact,
      pairKrCompact,
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

    // 137k 도시를 매 키 입력마다 전부 스캔하면 모바일에서 한 글자당 수백 ms.
    // 대부분의 검색 의도는 startsWith (score=0/5). limit 의 3 배가 모이면
    // 그 이상 includes/contains 후보를 더 끌어와도 결과 페이지에 못 들어옴.
    // → 충분히 모이면 끊는다. 점수 분포가 충분해서 sort 후 limit slice 가
    //   여전히 의도된 결과를 돌려준다.
    const HARD_CAP = limit * 3

    for (const item of indexedData) {
      const aliasMatch = koreanAlias ? item.nameNorm === norm(koreanAlias) : false

      // Check English matches
      const engMatch =
        item.nameNorm.startsWith(query) ||
        item.nameNorm.includes(query) ||
        item.pairNorm.startsWith(query) ||
        item.pairNorm.includes(query) ||
        (queryCompact.length >= 2 &&
          (item.nameCompact.includes(queryCompact) || item.pairCompact.includes(queryCompact)))

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

      if (engMatch || korMatch || aliasMatch) {
        // Calculate score (lower is better)
        let score = 100

        // Best match: starts with query
        if (item.nameNorm.startsWith(query) || item.cityKrNorm?.startsWith(query)) {
          score = 0
        } else if (item.pairNorm.startsWith(query) || item.pairKrNorm?.startsWith(query)) {
          score = 5
        } else if (item.nameNorm.includes(query) || item.cityKrNorm?.includes(query)) {
          score = 10
        } else {
          score = 15
        }

        scored.push({ item, score })

        if (scored.length >= HARD_CAP) break
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
