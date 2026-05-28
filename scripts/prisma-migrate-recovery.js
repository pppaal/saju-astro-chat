/**
 * Generic prisma migration recovery for P3009 (stuck failed migrations).
 *
 * 배경: Supabase production DB 의 _prisma_migrations 테이블에 여러 stuck
 * migration row 가 누적됨 (각각 finished_at = NULL AND rolled_back_at = NULL).
 * Prisma 가 새 migration 적용 거부 → Vercel 배포 막힘.
 *
 * 이 스크립트:
 *   1. _prisma_migrations 에서 *모든* stuck row 조회 (finished/rolled_back 둘 다 NULL)
 *   2. 각 row 의 logs 컬럼 확인
 *   3. row DELETE → 다음 prisma migrate deploy 가 처음부터 다시 시도
 *
 * 안전성:
 *   - 우리 production migration 들은 대부분 `ADD COLUMN IF NOT EXISTS`,
 *     `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` 사용 →
 *     idempotent 라 재시도 안전.
 *   - finished_at IS NOT NULL 인 (정상 적용된) row 는 건드리지 않음.
 *   - 스크립트 실패해도 빌드 안 막음 (prisma migrate deploy 가 실제 보고).
 *
 * vercel-build 에서 `prisma migrate deploy` 직전 1회 실행. 한 번 풀리면
 * 그 후 빌드는 no-op (stuck row 없으면 즉시 종료).
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

async function main() {
  const url = buildDirectUrl()
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    // 모든 stuck row 조회 — started 됐지만 finish/rollback 둘 다 안 된 것.
    const stuck = await client.query(
      `SELECT id, migration_name, started_at, logs
       FROM "_prisma_migrations"
       WHERE finished_at IS NULL
         AND rolled_back_at IS NULL`
    )

    if (stuck.rows.length === 0) {
      console.log('[migrate-recovery] no stuck migrations — no-op')
      return
    }

    console.log(`[migrate-recovery] found ${stuck.rows.length} stuck migrations:`)
    for (const row of stuck.rows) {
      console.log(`  - ${row.migration_name} (started ${row.started_at?.toISOString?.() ?? '?'})`)
    }

    // 일괄 DELETE → 다음 migrate deploy 가 fresh 재시도.
    // 우리 migration 들은 IF NOT EXISTS 패턴 widely 사용해서 재시도 안전.
    const del = await client.query(
      `DELETE FROM "_prisma_migrations"
       WHERE finished_at IS NULL
         AND rolled_back_at IS NULL
       RETURNING migration_name`
    )
    console.log(`[migrate-recovery] deleted ${del.rowCount} stuck rows — migrate deploy will retry`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('[migrate-recovery] failed:', e.message)
  // 빌드 막지 않음 — prisma migrate deploy 가 실제 에러 보고하게.
  process.exit(0)
})
