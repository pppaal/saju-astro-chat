import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'
import { getCityNameFromKorean } from '@/lib/cities/formatter'
import { citiesSearchQuerySchema } from '@/lib/api/zodValidation'
import { HTTP_STATUS } from '@/lib/constants/http'
import { CitySearchIndex, hasHangul, norm, type City } from '@/lib/cities/searchEngine'

export const runtime = 'nodejs'

// 검색 알고리즘(인덱싱·점수 사다리·정렬)은 lib/cities/searchEngine 로 이동.
// 이 라우트는 데이터 로드 + 검증 + 캐시 헤더만 담당한다.
let cachedEngine: CitySearchIndex | null = null
let loading: Promise<CitySearchIndex> | null = null

async function loadEngine(): Promise<CitySearchIndex> {
  if (cachedEngine) {
    return cachedEngine
  }
  if (!loading) {
    loading = (async () => {
      const filePath = path.join(process.cwd(), 'public', 'data', 'cities.min.json')
      try {
        const raw = await fs.readFile(filePath, 'utf-8')
        const sanitized = raw.replace(/^﻿/, '')
        const data = JSON.parse(sanitized)
        const cities: City[] = Array.isArray(data) ? data : []
        cachedEngine = new CitySearchIndex(cities)
        return cachedEngine
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
    const rawQuery = queryValidation.data.q
    const query = norm(rawQuery)
    const limit = queryValidation.data.limit
    const koreanAlias = hasHangul(query) ? getCityNameFromKorean(rawQuery) : null

    logger.info('[cities API] Query:', { query, limit })

    if (query.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const engine = await loadEngine()
    const results = engine.search(rawQuery, limit, koreanAlias)

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
