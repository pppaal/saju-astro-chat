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

  // 풀 크기: DATABASE_POOL_MAX(env) > 기본 5.
  //
  // 주의: URL 의 `connection_limit=1` 을 pg.Pool max 로 그대로 쓰지 않는다.
  // connection_limit=1 은 Prisma 자체 풀(요청 1개 = 커넥션 1개)에서나 맞는
  // 값이고, 우리처럼 pg.Pool 이 *한 인스턴스 안에서 동시 요청 여러 개*를
  // 처리하는 구조에선 max=1 이면 동시 요청·로그인 다단계 쿼리가 서로 막혀
  // ECHECKOUTTIMEOUT 으로 터진다(로그인 장애 유발). 인스턴스당 적당한 동시성을
  // 주되(5) 풀러 고갈은 env 나 Supabase 풀 설정으로 조절한다.
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      // 인스턴스당 최대 커넥션 수. 한 인스턴스가 동시 요청을 처리하므로 1 은
      // 너무 작다(서로 막혀 로그인 장애). 5 면 동시성 확보 + 풀러 부담도 적정.
      // env DATABASE_POOL_MAX 로 오버라이드 가능.
      max: toInt(process.env.DATABASE_POOL_MAX, 5),
      // 유휴 커넥션 회수 시간 — 서버리스에서 죽은 인스턴스가 풀러 슬롯을
      // 오래 쥐고 있지 않도록 짧게.
      idleTimeoutMillis: toInt(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS, 10_000),
      // 커넥션 획득이 막히면 무한 대기 대신 빠르게 실패시켜 원인을 드러낸다.
      connectionTimeoutMillis: toInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10_000),
      // PgBouncer 풀러와 함께 쓸 때 커넥션을 주기적으로 재생성.
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
