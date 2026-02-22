import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'
import {
  getCityNameFromKorean,
  getCityNameInKorean,
  getCountryNameInKorean,
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

const norm = (value: unknown) =>
  String(value ?? '')
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
  cachedIndex = cities.map((c) => {
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

    const displayKr =
      nameKr && countryKr ? `${nameKr}, ${countryKr}` : nameKr ? `${nameKr}, ${c.country}` : undefined
    const displayEn = `${c.name}, ${c.country}`

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
        (item.cityKrNorm && (item.cityKrNorm.startsWith(query) || item.cityKrNorm.includes(query))) ||
        (item.countryKrNorm &&
          (item.countryKrNorm.startsWith(query) || item.countryKrNorm.includes(query))) ||
        (item.pairKrNorm && (item.pairKrNorm.startsWith(query) || item.pairKrNorm.includes(query))) ||
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
