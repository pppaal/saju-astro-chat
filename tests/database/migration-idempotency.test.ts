/**
 * 마이그레이션 멱등성 가드 — 새 마이그레이션은 IF NOT EXISTS 를 써야 한다.
 *
 * 왜 테스트로 묶는가:
 * 이 규약은 지금까지 `scripts/prisma-schema-verify.js` 의 주석에만 있었다
 * ("우리 마이그레이션이 모두 IF NOT EXISTS 패턴이라는 점을 활용해"). 코드가
 * 그 전제를 실제로 강제하지 않으니, 새로 추가되는 마이그레이션이 조용히 규약을
 * 깨도 아무것도 알려주지 않는다 — 깨진 채로 통과하는 테스트도, 실패하는 빌드도
 * 없다. 실제로 터지는 건 배포 때다.
 *
 * 왜 중요한가(실제 사고 기록):
 * 1. phantom apply — _prisma_migrations 에는 finished_at 이 찍혔는데 실제 SQL 은
 *    적용 안 된 상태가 production 에서 반복 관찰됐다. prisma migrate deploy 는
 *    그 테이블만 보고 "applied" 라 판단해 재실행하지 않으므로 영영 안 풀린다.
 *    prisma-schema-verify.js 가 ALTER TABLE 을 직접 재시도해 복구하는데, 그
 *    복구는 **DDL 이 멱등일 때만** 동작한다. 맨 `ADD COLUMN` 이면 재시도가
 *    "column already exists" 로 죽어 복구 경로 자체가 무력화된다.
 * 2. 20260709000000_birth_time_unknown_flag 가 바로 그 사례다 — 맨 ADD COLUMN
 *    으로 들어갔고 prod 에서 phantom-apply 돼 PATCH /api/me/profile 과 궁합
 *    SavedPerson 저장이 P2022 로 죽었다(2026-07-11 Sentry).
 * 3. vercel-build 는 `prisma migrate deploy` 를 빌드 체인에 포함한다. 비멱등
 *    마이그레이션이 재실행되면 **배포가 실패**한다.
 *
 * LEGACY_* 는 "괜찮다"는 뜻이 아니라 "이미 머지돼 있고 되감을 수 없다"는 기록
 * 이다. 손볼 기회가 생기면 줄여나가고, 목록은 늘리지 않는다.
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations')

// 규약 도입 전에 이미 머지된 파일들. 새 항목을 여기 추가하지 말고 DDL 을 고친다.
const LEGACY_BARE_ADD_COLUMN = new Set([
  // prod phantom-apply 로 P2022 를 실제로 일으킨 당사자. 위 주석 참조.
  '20260709000000_birth_time_unknown_flag/migration.sql',
  // prisma migrate 체인 밖의 수동 스크립트(디렉터리가 아닌 단독 .sql).
  'add_profile_photo_field.sql',
  // prisma 가 자동 생성한 포맷(`ADD COLUMN     "birthCity"`) — 공백이 여러 칸이라
  // `ADD COLUMN "` 같은 단순 grep 으로는 안 잡힌다. 이 가드를 정규식으로 쓴 이유.
  '20251031150431_add_birth_city_tz_and_snapshot/migration.sql',
])

const LEGACY_BARE_CREATE = new Set([
  '20251031035507_init/migration.sql',
  '20251031065920_add_fortune/migration.sql',
  '20251031150431_add_birth_city_tz_and_snapshot/migration.sql',
  '20260129_add_stripe_event_log/migration.sql',
  '20260208_split_user_profile_settings/migration.sql',
  '20260704000000_visit_streak/migration.sql',
])

/** prisma/migrations 아래의 모든 .sql 을 디렉터리 기준 상대경로로 수집. */
function allMigrationSql(): { rel: string; sql: string }[] {
  const out: { rel: string; sql: string }[] = []
  for (const entry of readdirSync(MIGRATIONS_DIR)) {
    const full = path.join(MIGRATIONS_DIR, entry)
    if (statSync(full).isDirectory()) {
      for (const f of readdirSync(full)) {
        if (f.endsWith('.sql')) {
          out.push({ rel: `${entry}/${f}`, sql: readFileSync(path.join(full, f), 'utf8') })
        }
      }
    } else if (entry.endsWith('.sql')) {
      out.push({ rel: entry, sql: readFileSync(full, 'utf8') })
    }
  }
  return out
}

/** `--` 주석을 제거한다 — 주석에 쓴 예시 DDL 이 오탐을 내지 않도록. */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
}

describe('prisma 마이그레이션 멱등성', () => {
  const files = allMigrationSql()

  it('마이그레이션 파일을 찾는다(경로가 바뀌면 이 가드가 조용히 무력화되므로)', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('ADD COLUMN 은 IF NOT EXISTS 를 쓴다', () => {
    const offenders: string[] = []
    for (const { rel, sql } of files) {
      if (LEGACY_BARE_ADD_COLUMN.has(rel)) continue
      // IF NOT EXISTS 가 붙지 않은 ADD COLUMN.
      if (/ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/i.test(stripComments(sql))) offenders.push(rel)
    }
    expect(
      offenders,
      `비멱등 ADD COLUMN — phantom-apply 자동복구(scripts/prisma-schema-verify.js)가 ` +
        `"column already exists" 로 죽고 vercel-build 의 prisma migrate deploy 가 실패한다. ` +
        `ADD COLUMN IF NOT EXISTS 로 바꿔라: ${offenders.join(', ')}`
    ).toEqual([])
  })

  it('CREATE TABLE / CREATE INDEX 도 IF NOT EXISTS 를 쓴다', () => {
    const offenders: string[] = []
    for (const { rel, sql } of files) {
      if (LEGACY_BARE_CREATE.has(rel)) continue
      const body = stripComments(sql)
      if (
        /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i.test(body) ||
        /CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)/i.test(body)
      ) {
        offenders.push(rel)
      }
    }
    expect(
      offenders,
      `비멱등 CREATE TABLE/INDEX — 재실행 시 배포가 실패한다. ` +
        `IF NOT EXISTS 를 붙여라: ${offenders.join(', ')}`
    ).toEqual([])
  })

  // 레거시 목록이 "실제로 아직 위반인 파일"만 담고 있는지 확인. 고쳐놓고 목록에
  // 남겨두면 가드가 그 파일을 영구 면제해 회귀를 놓친다.
  it('레거시 면제 목록에 이미 고쳐진 파일이 남아 있지 않다', () => {
    const byRel = new Map(files.map((f) => [f.rel, stripComments(f.sql)]))
    const stale: string[] = []
    for (const rel of LEGACY_BARE_ADD_COLUMN) {
      const sql = byRel.get(rel)
      // 파일이 사라졌거나, 더 이상 맨 ADD COLUMN 이 없으면 면제를 지워야 한다.
      if (sql === undefined || !/ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/i.test(sql)) stale.push(rel)
    }
    for (const rel of LEGACY_BARE_CREATE) {
      const sql = byRel.get(rel)
      if (
        sql === undefined ||
        !(
          /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i.test(sql) ||
          /CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)/i.test(sql)
        )
      ) {
        stale.push(rel)
      }
    }
    expect(stale, `면제 불필요 — LEGACY_* 목록에서 지워라: ${stale.join(', ')}`).toEqual([])
  })
})

describe('schema-verify 등록 누락 가드', () => {
  // prisma-schema-verify.js 는 "알려진 critical 컬럼" 만 복구한다. 새 컬럼을
  // 등록하지 않으면 phantom-apply 때 자동복구 대상에서 빠져 조용히 누락된다.
  // BonusCreditPurchase 는 결제·매출 테이블이라 특히 등록이 필수다.
  const verifySrc = readFileSync(
    path.resolve(__dirname, '../../scripts/prisma-schema-verify.js'),
    'utf8'
  )

  it.each(['amountMinor', 'currency', 'acknowledgedAt'])(
    'BonusCreditPurchase.%s 가 복구 목록에 등록돼 있다',
    (column) => {
      expect(verifySrc).toContain(`ADD COLUMN IF NOT EXISTS "${column}"`)
    }
  )
})
