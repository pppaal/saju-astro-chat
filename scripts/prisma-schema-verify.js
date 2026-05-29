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

// 통째 missing 테이블 — phantom apply 로 CREATE TABLE 자체가 안 된 케이스.
// 각 항목: { table, migration, createSql: 전체 SQL 문 (idempotent IF NOT EXISTS) }
const REQUIRED_TABLES = [
  {
    table: 'CalendarBuildCache',
    migration: '20260528120000_add_calendar_build_cache',
    createSql: `
      CREATE TABLE IF NOT EXISTS "CalendarBuildCache" (
        "id" TEXT NOT NULL,
        "birthKey" TEXT NOT NULL,
        "monthKey" TEXT NOT NULL,
        "data" JSONB NOT NULL,
        "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CalendarBuildCache_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "CalendarBuildCache_birthKey_monthKey_key"
        ON "CalendarBuildCache"("birthKey", "monthKey");
      CREATE INDEX IF NOT EXISTS "CalendarBuildCache_builtAt_idx"
        ON "CalendarBuildCache"("builtAt");
    `,
  },
  {
    table: 'RequestIdempotencyLog',
    migration: '20260528120300_add_request_idempotency_log',
    createSql: `
      CREATE TABLE IF NOT EXISTS "RequestIdempotencyLog" (
        "scopedKey" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RequestIdempotencyLog_pkey" PRIMARY KEY ("scopedKey")
      );
      CREATE INDEX IF NOT EXISTS "RequestIdempotencyLog_expiresAt_idx"
        ON "RequestIdempotencyLog" ("expiresAt");
    `,
  },
  {
    // 크레딧 감사 테이블. prod (Supabase) 에서 phantom-apply 로 CREATE TABLE
    // 이 누락됐다 — 매 결제마다 addBonusCredits → creditTransaction.create 가
    // "table does not exist" 로 죽어 트랜잭션 전체 롤백("결제 됐는데 크레딧 0
    // + 영수증 메일 안 감"). enum 두 개는 Postgres 에 `CREATE TYPE IF NOT
    // EXISTS` 가 없어 DO 블록(duplicate_object 무시)으로, FK 도 ADD CONSTRAINT
    // 가 idempotent 하지 않아 DO 블록으로 감싼다. 전부 재실행 안전.
    table: 'CreditTransaction',
    migration: '20260529000000_add_credit_transaction',
    createSql: `
      DO $$ BEGIN
        CREATE TYPE "CreditTxnType" AS ENUM (
          'GRANT', 'CONSUME', 'REFUND', 'EXPIRE', 'REVOKE', 'SIGNUP_BONUS'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "CreditPool" AS ENUM (
          'BONUS', 'MONTHLY', 'COMPATIBILITY', 'FOLLOWUP'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS "CreditTransaction" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "type"      "CreditTxnType" NOT NULL,
        "pool"      "CreditPool" NOT NULL,
        "amount"    INTEGER NOT NULL,
        "reason"    TEXT NOT NULL,
        "sourceRef" TEXT,
        "metadata"  JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
      );

      DO $$ BEGIN
        ALTER TABLE "CreditTransaction"
          ADD CONSTRAINT "CreditTransaction_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_createdAt_idx"
        ON "CreditTransaction" ("userId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "CreditTransaction_sourceRef_idx"
        ON "CreditTransaction" ("sourceRef");
      CREATE INDEX IF NOT EXISTS "CreditTransaction_type_createdAt_idx"
        ON "CreditTransaction" ("type", "createdAt");
    `,
  },
]

// 각 항목: { table, columns: [{ name, ddl, postSql? }] } — DDL 은 ALTER TABLE
// 뒤 붙는 ADD COLUMN 조각. IF NOT EXISTS 필수. postSql 은 컬럼이 새로 추가됐을
// 때만 실행 (backfill + 보조 인덱스 등). 이미 있던 컬럼이면 ddl·postSql 둘 다
// 스킵 — 운영 데이터 덮어쓰기 방지.
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
  {
    table: 'BonusCreditPurchase',
    migration: '20260528123217_add_bonus_credit_acknowledged_at',
    columns: [
      {
        name: 'acknowledgedAt',
        ddl: `ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3)`,
        // backfill: 기존 row 는 "이미 본 것" 처리. 안 그러면 모든 기존 사용자에게
        // "보너스 받았어요" 모달이 한꺼번에 뜬다.
        postSql: `
          UPDATE "BonusCreditPurchase"
          SET "acknowledgedAt" = "createdAt"
          WHERE "acknowledgedAt" IS NULL;
          CREATE INDEX IF NOT EXISTS "BonusCreditPurchase_userId_acknowledgedAt_idx"
            ON "BonusCreditPurchase" ("userId", "acknowledgedAt");
        `,
      },
    ],
  },
]

async function tableExists(client, table) {
  const res = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = $1
     LIMIT 1`,
    [table]
  )
  return res.rowCount > 0
}

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

    // 1) 통째 missing 테이블 검증·생성 — phantom apply 가 CREATE TABLE 자체를 막은 케이스.
    for (const entry of REQUIRED_TABLES) {
      const exists = await tableExists(client, entry.table)
      if (exists) {
        console.log(`[schema-verify] ${entry.table}: table present`)
        continue
      }
      console.log(
        `[schema-verify] ${entry.table}: table MISSING (migration ${entry.migration} phantom-applied)`
      )
      console.log(`  - executing CREATE TABLE + indexes`)
      await client.query(entry.createSql)
      totalFixed += 1
    }

    // 2) 컬럼-레벨 검증·추가 — ALTER TABLE ADD COLUMN phantom-applied.
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
        if (col.postSql) {
          console.log(`  - executing postSql for ${col.name} (backfill / indexes)`)
          await client.query(col.postSql)
        }
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
