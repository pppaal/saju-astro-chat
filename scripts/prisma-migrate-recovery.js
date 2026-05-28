/**
 * One-off prisma migration recovery for P3009 (failed migration block).
 *
 * 배경: Supabase DB 에 `20260130_add_block_report_message_delete` migration 이
 * 부분 적용 → failed marker 로 stuck. 이후 모든 `prisma migrate deploy` 가
 * P3009 로 거부 → Vercel 배포 전체 막힘.
 *
 * 이 스크립트:
 *   1. _prisma_migrations 테이블에서 failed migration 조회
 *   2. 해당 migration 의 schema 객체가 DB 에 이미 존재하는지 확인
 *      - UserBlock / UserReport 테이블 존재 → 적용됨 (applied)
 *      - 없음 → 미적용 (rolled-back)
 *   3. _prisma_migrations row 수정해 stuck 해제
 *      - applied: finished_at = NOW, logs = NULL
 *      - rolled-back: row DELETE (다음 migrate deploy 가 재시도)
 *
 * vercel-build 에서 `prisma migrate deploy` 직전 1회 실행. 한 번 풀리면
 * 그 후 빌드는 이 스크립트가 no-op (failed row 없으면 즉시 종료).
 *
 * 일회성이라 fix 후엔 vercel-build 에서 빼도 됨 — 하지만 두면 향후 비슷
 * 케이스에서 자동 회복.
 */

const { Client } = require('pg')

const FAILED_MIGRATION = '20260130_add_block_report_message_delete'

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
    // 1) failed migration 조회
    const failed = await client.query(
      `SELECT id, migration_name, finished_at, rolled_back_at
       FROM "_prisma_migrations"
       WHERE migration_name = $1
         AND finished_at IS NULL
         AND rolled_back_at IS NULL`,
      [FAILED_MIGRATION]
    )

    if (failed.rows.length === 0) {
      console.log(`[migrate-recovery] ${FAILED_MIGRATION} not in failed state — no-op`)
      return
    }

    console.log(`[migrate-recovery] found stuck migration ${FAILED_MIGRATION}, checking objects...`)

    // 2) migration 의 schema 객체 존재 확인
    const tablesExist = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('UserBlock', 'UserReport')`
    )
    const hasObjects = tablesExist.rows.length > 0

    if (hasObjects) {
      // 적용됨 — finished_at 채워서 success 처리
      await client.query(
        `UPDATE "_prisma_migrations"
         SET finished_at = NOW(), logs = NULL
         WHERE migration_name = $1 AND finished_at IS NULL`,
        [FAILED_MIGRATION]
      )
      console.log(`[migrate-recovery] objects exist — marked ${FAILED_MIGRATION} as applied`)
    } else {
      // 미적용 — row 삭제해서 다음 deploy 가 재시도
      await client.query(`DELETE FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NULL`, [
        FAILED_MIGRATION,
      ])
      console.log(`[migrate-recovery] objects missing — deleted failed row, will retry`)
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('[migrate-recovery] failed:', e.message)
  // 빌드 막지 않음 — prisma migrate deploy 가 실제 에러 보고하게.
  process.exit(0)
})
