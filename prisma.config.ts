import { defineConfig } from '@prisma/config'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Load environment variables
const loadEnv = () => {
  // Try to load dotenv
  try {
    const dotenv = require('dotenv')

    // Load .env first (base)
    const envPath = resolve(process.cwd(), '.env')
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath })
    }

    // Then load .env.local (override)
    const envLocalPath = resolve(process.cwd(), '.env.local')
    if (existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: true })
    }
  } catch {
    // dotenv not available, use process.env directly
  }
}

loadEnv()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL not found in environment variables')
}

// Migration 용 URL: 항상 DATABASE_URL 을 변환해서 사용.
//   - :6543 (transaction pooler) → :5432 (session pooler — migration 지원)
//   - pgbouncer=true 제거 (migration 은 prepared statements 사용해야 함)
//
// 이전엔 DIRECT_DATABASE_URL env 도 우선 supported 했는데, Vercel 에 stale
// 한 옛날 direct host (paused/deprecated) 로 남아 있으면 prisma migrate
// deploy 가 P1001 (Can't reach DB) 로 실패 → 배포 전체 막힘. 단일 source
// (DATABASE_URL) 만 신뢰하도록 단순화 — 사용자가 env 두 개 동기화 신경
// 안 써도 됨.
const migrateUrl = databaseUrl
  .replace(':6543/', ':5432/')
  .replace(/[?&]pgbouncer=true/, '')
  .replace(/[?&]$/, '')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrateUrl,
  },
})
