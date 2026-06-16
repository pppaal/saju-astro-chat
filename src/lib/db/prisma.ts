// src/lib/db/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { encryptToken } from '@/lib/security/tokenCrypto'
import { logger } from '@/lib/logger'

// Re-export Prisma namespace for type usage
export { Prisma }

// HMR/다중 import 방지(개발 환경)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pool?: Pool }

const encryptAccountTokens = <T>(data: T): T => {
  if (!data || typeof data !== 'object') {
    return data
  }
  const fields = ['access_token', 'refresh_token', 'id_token'] as const
  const result = { ...data } as Record<string, unknown>
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      result[field] = encryptToken(result[field] as string)
    }
  }
  return result as T
}

function createPrismaClient(): PrismaClient {
  // Prisma 7.x: Use adapter for database connection
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    // Return a proxy that throws on first actual use rather than at import time.
    // This prevents build-time failures when DATABASE_URL is not available.
    logger.warn('[prisma] DATABASE_URL not set — Prisma client will fail on first query')
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === 'then') return undefined // avoid treating as thenable
        throw new Error('DATABASE_URL environment variable is not set')
      },
    })
  }

  // Create connection pool.
  //
  // 기본값(max=10, idle 무한)은 Vercel 서버리스 + Neon 풀러 환경에서 동시성이
  // 몰릴 때 커넥션이 고갈돼 Prisma 쿼리 엔진이 ECHECKOUTTIMEOUT
  // ("unable to check out a connection from the pool")을 던지는 원인이 된다.
  // 환경변수로 튜닝 가능하게 하고, 유휴 커넥션을 빠르게 회수해 Neon 풀러
  // 슬롯을 점유하지 않도록 한다.
  const toInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      // 인스턴스당 최대 커넥션 수. Neon 풀러(PgBouncer transaction mode) +
      // Vercel 서버리스에서는 *총* 커넥션 = max × 살아있는 인스턴스 수 다.
      // 옛 기본값 15 는 배포 컷오버(구·신 인스턴스 동시 생존)나 트래픽 스파이크
      // 때 풀러 상한을 넘겨 ECHECKOUTTIMEOUT 을 유발했다. 풀러가 이미
      // 멀티플렉싱하므로 인스턴스당 풀은 작아야 한다(5 = 일반 라우트엔 충분,
      // 관리자 Promise.all 병렬 쿼리는 잠깐 큐잉되지만 connectionTimeout 안에
      // 해소). 더 필요하면 DATABASE_POOL_MAX 로 올린다.
      max: toInt(process.env.DATABASE_POOL_MAX, 5),
      // 유휴 커넥션 회수 시간 — 서버리스에서 죽은 인스턴스가 Neon 슬롯을
      // 오래 쥐고 있지 않도록 짧게.
      idleTimeoutMillis: toInt(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS, 10_000),
      // 커넥션 획득이 막히면 무한 대기 대신 빠르게 실패시켜 원인을 드러낸다.
      connectionTimeoutMillis: toInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10_000),
      // PgBouncer(Neon 풀러)와 함께 쓸 때 커넥션을 주기적으로 재생성.
      maxUses: toInt(process.env.DATABASE_POOL_MAX_USES, 7_500),
      // 모든 커넥션이 유휴가 되면 풀이 이벤트 루프를 막지 않도록 — 서버리스 친화.
      allowExitOnIdle: true,
    })

  // 동일 인스턴스 내 모듈 재평가/번들러 엣지 케이스에서 풀이 중복 생성되는 것을
  // 막기 위해 프로덕션에서도 전역에 캐시한다.
  globalForPrisma.pool = pool

  // Create adapter
  const adapter = new PrismaPg(pool)

  const basePrisma = new PrismaClient({
    adapter,
    // 로그가 필요하면 켜기
    // log: ['query', 'error', 'warn'],
  })

  return basePrisma
}

// 연결 끊김 시 재연결을 위한 함수
export async function ensureDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    logger.warn('[prisma] Connection lost, reconnecting...')
    await prisma.$disconnect()
    await prisma.$connect()
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// 풀과 마찬가지로 동일 인스턴스 내 중복 클라이언트 생성을 막기 위해 항상 캐시.
globalForPrisma.prisma = prisma

// Helper for encrypting tokens before Account operations
export const encryptAccountData = encryptAccountTokens
