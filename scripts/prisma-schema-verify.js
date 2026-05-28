/**
 * Schema verification — prisma migrate deploy 후 critical 컬럼이 실제로
 * 존재하는지 확인. 없으면 SQL 을 직접 실행해 자동 복구.
 *
 * 배경: _prisma_migrations 에 finished_at 만 set 된 채 실제 SQL 은
 * 적용 안 된 "phantom apply" 케이스가 production 에서 종종 관찰됨
 * (legal_consent migration 이 그 사례 — Sentry 에 매 요청 P2022 로그).
 * Prisma migrate deploy 는 _prisma_migrations 만 보고 "applied" 라
 * 판단해서 재실행 안 함 → phantom 상태 영영 안 풀림.
 *
 * 이 스크립트는 우리 마이그레이션이 모두 IF NOT EXISTS 패턴이라는
 * 점을 활용해, 알려진 critical 컬럼 목록을 직접 ALTER TABLE 로
 * 재시도. 이미 있으면 no-op, 없으면 추가. 안전.
 *
 * vercel-build 에서 `prisma migrate deploy` 직후 1회 실행.
 */

const { Client } = require('pg')

function buildDirectUrl() {
  const u = process.env.DATABASE_URL
  if (!u) throw new Error('DATABASE_URL not set')
  // pooler :6543 (transaction mode) → :5432 (session mode, DDL OK)
  return u
    .replace(':6543/', ':5432/')
    .replace(/[?&]pgbouncer=true/, '')
    .replace(/[?&]$/, '')
}

// 각 항목: { table, columns: [{ name, ddl }] } — DDL 은 ALTER TABLE 뒤
// 붙는 ADD COLUMN 조각. IF NOT EXISTS 필수.
const REQUIRED_SCHEMA = [
  {
    table: 'UserSettings',
    migration: '20260527000000_add_legal_consent',
    columns: [
      { name: 'legalAcceptedAt', ddl: `ADD COLUMN IF NOT EXISTS "legalAcceptedAt" TIMESTAMP(3)` },
      {
        name: 'legalAcceptedVersion',
        ddl: `ADD COLUMN IF NOT EXISTS "legalAcceptedVersion" TEXT`,
      },
      { name: 'ageConfirmedAt', ddl: `ADD COLUMN IF NOT EXISTS "ageConfirmedAt" TIMESTAMP(3)` },
    ],
  },
  {
    table: 'TarotReading',
    migration: '20260528000000_tarot_clarifier_and_followup',
    columns: [
      { name: 'clarifierCard', ddl: `ADD COLUMN IF NOT EXISTS "clarifierCard" JSONB` },
      { name: 'followupTurns', ddl: `ADD COLUMN IF NOT EXISTS "followupTurns" JSONB` },
    ],
  },
]

async function columnExists(client, table, column) {
  const res = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [table, column]
  )
  return res.rowCount > 0
}

async function main() {
  const url = buildDirectUrl()
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    let totalFixed = 0
    for (const entry of REQUIRED_SCHEMA) {
      const missing = []
      for (const col of entry.columns) {
        const exists = await columnExists(client, entry.table, col.name)
        if (!exists) missing.push(col)
      }
      if (missing.length === 0) {
        console.log(`[schema-verify] ${entry.table}: all ${entry.columns.length} columns present`)
        continue
      }
      console.log(
        `[schema-verify] ${entry.table}: ${missing.length} missing columns (migration ${entry.migration} may be phantom-applied)`
      )
      for (const col of missing) {
        const sql = `ALTER TABLE "${entry.table}" ${col.ddl}`
        console.log(`  - executing: ${sql}`)
        await client.query(sql)
        totalFixed += 1
      }
    }
    if (totalFixed === 0) {
      console.log('[schema-verify] all critical columns present — no-op')
    } else {
      console.log(`[schema-verify] fixed ${totalFixed} missing columns`)
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('[schema-verify] failed:', e.message)
  // 빌드 막지 않음 — application 자체 P2022 fallback 으로 사용자 진입은 가능.
  process.exit(0)
})
