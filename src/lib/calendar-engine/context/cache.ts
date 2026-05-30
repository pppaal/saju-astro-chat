/**
 * NatalContext 영구 캐시 wrapper.
 *
 * 흐름 (cascade):
 *   1. Redis 캐시 (~1ms hit)
 *   2. DB NatalContextCache (~5ms hit)
 *   3. 재계산 (~500ms) → DB + Redis 둘 다 저장
 *
 * Redis 만 쓰던 시절: 30일 만료 → cold start → 500ms 재계산.
 * DB 영구 + Redis 앞단 패턴: 만료돼도 DB hit → ~5ms, 재계산 거의 없음.
 *
 * engineSignature mismatch → stale row 무시 + 재계산 + 덮어씀.
 * Schema 의 saju/astro 엔진 변경 시 bump.
 */

import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/redis-cache'
import {
  buildNatalContext,
  type BuildContextInput,
  type PreComputedNatal,
} from './build'
import type { NatalContext } from './types'

// 엔진 버전 — 사주 / 점성 / 신살 / 격국 계산 로직이 바뀔 때 bump.
// bump 안 하면 stale cache 가 영원히 유지됨.
// v1-baseline: 초기.
// v2-rich: NatalContext.saju 에 fiveElements + advancedAnalysis 추가 — 운명/궁합 차트
//          PersonaCard·InsightStrip 가 cache hit 으로 격국/용신/십신/오행 분포 받게.
const ENGINE_SIGNATURE = 'natal-v3-gender'

interface NatalCacheKeyInput {
  birthDate: string
  birthTime: string
  latitude: number
  longitude: number
  gender: 'male' | 'female'
}

/**
 * 본명 차트 cache 키 — Redis + DB 둘 다 같은 키 사용.
 * 출생 정보 + 좌표 + 엔진 버전 hash. 좌표가 들어가 같은 생일이라도 다른 도시면
 * 다른 row (점성 ASC/MC 가 좌표 따라 다름).
 */
export function makeNatalCacheKey(input: NatalCacheKeyInput): string {
  return createHash('sha1')
    .update(
      `${input.birthDate}|${input.birthTime}|${input.latitude.toFixed(4)}|${input.longitude.toFixed(4)}|${input.gender}|${ENGINE_SIGNATURE}`
    )
    .digest('hex')
    .slice(0, 32)
}

const redisKey = (birthKey: string) => `natal-ctx:${ENGINE_SIGNATURE}:${birthKey}`

/**
 * 본명 차트 가져오기 — Redis → DB → 재계산 cascade.
 *
 * preComputed 가 들어오면 그 결과를 사용 (cascade 건너뜀) — 한 요청 안에서
 * sajuResult / natalChart 가 이미 계산된 경우 buildNatalContext 가 재사용
 * 하도록 같은 경로로 흐름.
 */
export async function getOrBuildNatalContext(
  input: BuildContextInput,
  preComputed?: PreComputedNatal
): Promise<{ context: NatalContext; source: 'redis' | 'db' | 'compute' }> {
  const birthKey = makeNatalCacheKey({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    latitude: input.latitude,
    longitude: input.longitude,
    gender: input.gender,
  })

  // 1. Redis L1 hit
  try {
    const cached = await cacheGet<NatalContext>(redisKey(birthKey))
    if (cached) {
      return { context: cached, source: 'redis' }
    }
  } catch (err) {
    logger.warn('[natal-cache] redis lookup failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // 2. DB L2 hit
  try {
    const row = await prisma.natalContextCache.findUnique({
      where: { birthKey },
    })
    if (row && row.engineSignature === ENGINE_SIGNATURE) {
      const context = row.data as unknown as NatalContext
      // L1 (Redis) 채우기 — 이후 요청은 ~1ms 응답.
      void cacheSet(redisKey(birthKey), context, CACHE_TTL.NATAL_CHART).catch(() => {})
      return { context, source: 'db' }
    }
    if (row && row.engineSignature !== ENGINE_SIGNATURE) {
      // Stale row — 엔진 버전 mismatch. 아래에서 재계산 후 덮어씀.
      logger.info('[natal-cache] stale row, recomputing', {
        birthKey,
        oldSig: row.engineSignature,
        newSig: ENGINE_SIGNATURE,
      })
    }
  } catch (err) {
    logger.warn('[natal-cache] db lookup failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // 3. 미스 → 재계산
  const context = await buildNatalContext(input, preComputed ?? {})

  // 4. fire-and-forget DB + Redis 저장. 실패해도 사용자한테 영향 X.
  void prisma.natalContextCache
    .upsert({
      where: { birthKey },
      create: {
        birthKey,
        engineSignature: ENGINE_SIGNATURE,
        data: context as unknown as object,
      },
      update: {
        engineSignature: ENGINE_SIGNATURE,
        data: context as unknown as object,
        builtAt: new Date(),
      },
    })
    .catch((err) => {
      logger.warn('[natal-cache] db save failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    })

  void cacheSet(redisKey(birthKey), context, CACHE_TTL.NATAL_CHART).catch(() => {})

  return { context, source: 'compute' }
}

/** 영구 캐시 무효화 — engine 변경 / migration 등 강제 재계산 필요 시. */
export async function invalidateNatalContext(input: NatalCacheKeyInput): Promise<void> {
  const birthKey = makeNatalCacheKey(input)
  await Promise.allSettled([
    prisma.natalContextCache.delete({ where: { birthKey } }).catch(() => {}),
    cacheSet(redisKey(birthKey), null, 1).catch(() => {}),
  ])
}
