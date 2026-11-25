/**
 * 절입(節入) 표 생성기 — KASI_SOLAR_TERMS 행을 Swiss Ephemeris 로 만든다 (dev 전용, CI 미실행).
 *
 * 표의 행은 손으로 적지 않는다. 이 스크립트가 public/ephe 의 Swiss Ephemeris 로 계산하고,
 * 독립 출처인 astronomy-engine 과 ≤ 90 초로 교차검증한 뒤 src/lib/saju/constants.ts 의
 * KASI_SOLAR_TERMS 안에 그 연도 블록을 써 넣는다 (엔진 감사 E14, SAJU-5, OD-4).
 *
 * 정의
 *   - 節 m (1 = 小寒 … 12 = 大雪) = 태양 겉보기 황경(진춘분점·황도 of date)이
 *     (285 + 30·(m − 1)) mod 360 도에 닿는 순간. swe_calc_ut(SE_SUN, SEFLG_SWIEPH).
 *   - 근은 그 양력월 1일 00:00 UT ~ 13일 00:00 UT 구간 이분법 60회 (節은 모두 3~9일).
 *   - 표기 = UT + 9 시간("KST" 고정 표기 — 그 시대 한국 민용시가 아니다), 분 단위 반올림.
 *     기존 1940–2051 행도 같은 규칙(Swiss Ephemeris, 분 반올림)이라 이어 붙여도 이음새가 없다.
 *
 * 검증 (실패하면 아무것도 쓰지 않고 종료 코드 1)
 *   - 반올림 전 Swiss Ephemeris instant 와 astronomy-engine SearchSunLongitude 차이 ≤ 90 초.
 *   - 표에 쓰는 분 단위 값과 astronomy-engine 차이 ≤ 90 초.
 *   - 이미 표에 있는 연도는 새 값과 비교해 바뀌는 행을 출력한다. 기록 모드는 지정한
 *     연도 블록만 바꾸고, --check 는 아무것도 쓰지 않고 빠진 연도·바뀌는 행이 있으면
 *     종료 코드 1.
 *
 * 사용
 *   npx tsx scripts/golden/build-solar-terms.mts                 # 1899–1939 생성·기록
 *   npx tsx scripts/golden/build-solar-terms.mts --from 1899 --to 1939 --check
 *   (1899 는 1900-01-01~05 출생의 子월·대운 lookup 용 경계 연도 — 1939 가 1940 에 했던 역할.)
 *
 * 참고: 1940–2051 행은 2026-06 에 같은 방식으로 만든 값이다. 이 스크립트로 --check 하면
 * 12 개 행이 분 반올림 경계(±30 초 근처)에서 1 분씩 다르게 나온다 — 모두 astronomy-engine
 * 과 90 초 안이라 다시 쓰지 않았다(tests/lib/saju/kasiSolarTerms.crosscheck.test.ts 가 표
 * 전체를 astronomy-engine 과 비교한다).
 */
import * as AstronomyNs from 'astronomy-engine'
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type * as SwissEph from 'swisseph'

// tsx 는 이 패키지의 CommonJS 빌드를 읽어 namespace 가 `default` 아래로 온다.
const Astronomy = ((AstronomyNs as unknown as { default?: typeof AstronomyNs }).default ??
  AstronomyNs) as typeof AstronomyNs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CONSTANTS = resolve(ROOT, 'src/lib/saju/constants.ts')
const require = createRequire(import.meta.url)
const sw = require('swisseph') as typeof SwissEph
sw.swe_set_ephe_path(resolve(ROOT, 'public/ephe'))

const DAY_MS = 86_400_000
const KST_MS = 9 * 3_600_000
const MAX_DEV_SEC = 90

function argNum(name: string, fallback: number): number {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  const v = Number(process.argv[i + 1])
  if (!Number.isInteger(v)) throw new Error(`${name} needs an integer year`)
  return v
}
const FROM = argNum('--from', 1899)
const TO = argNum('--to', 1939)
const CHECK_ONLY = process.argv.includes('--check')
if (FROM > TO) throw new Error(`--from ${FROM} > --to ${TO}`)

const termLongitude = (m: number) => (285 + 30 * (m - 1)) % 360
const msToJd = (ms: number) => ms / DAY_MS + 2440587.5
const jdToMs = (jd: number) => (jd - 2440587.5) * DAY_MS

/** Swiss Ephemeris 태양 겉보기 황경(도). */
function sunLonSE(ms: number): number {
  const r = sw.swe_calc_ut(msToJd(ms), sw.SE_SUN, sw.SEFLG_SWIEPH) as
    | { longitude: number }
    | { error: string }
  if ('error' in r) throw new Error(`swe_calc_ut: ${r.error}`)
  return r.longitude
}

/** 목표 황경과의 부호 있는 차(−180, 180]. */
const signedDiff = (lon: number, target: number) => ((lon - target + 540) % 360) - 180

/** 節 instant(UT ms) — year 의 양력 month 안, Swiss Ephemeris + 이분법. */
function termInstantSE(year: number, month: number): number {
  const target = termLongitude(month)
  let a = Date.UTC(year, month - 1, 1)
  let b = Date.UTC(year, month - 1, 13)
  if (!(signedDiff(sunLonSE(a), target) < 0 && signedDiff(sunLonSE(b), target) > 0)) {
    throw new Error(`no bracket for ${year}-${month} (λ ${target})`)
  }
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2
    if (signedDiff(sunLonSE(mid), target) < 0) a = mid
    else b = mid
  }
  return (a + b) / 2
}

/** 같은 節 instant — astronomy-engine (독립 출처). */
function termInstantAE(year: number, month: number): number {
  const t = Astronomy.SearchSunLongitude(
    termLongitude(month),
    new Date(Date.UTC(year, month - 1, 1)),
    13
  )
  if (!t) throw new Error(`astronomy-engine SearchSunLongitude failed for ${year}-${month}`)
  return t.date.getTime()
}

const pad = (n: number) => String(n).padStart(2, '0')
/** UT ms → 'YYYY-MM-DD HH:mm' (UT+9 고정 표기, 분 반올림). */
function kstLabel(ms: number): string {
  const d = new Date(Math.round(ms / 60_000) * 60_000 + KST_MS)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
/** 'YYYY-MM-DD HH:mm'(UT+9) → UT ms. getSolarTermKST 와 같은 해석. */
function labelToMs(s: string): number {
  const [Y, M, D, h, mi] = s.split(/[- :]/).map(Number)
  return Date.UTC(Y, M - 1, D, h - 9, mi)
}

// ── 생성 + 교차검증 ────────────────────────────────────────────────────────
const generated = new Map<number, string[]>()
let maxRawDev = 0
let maxLabelDev = 0
const failures: string[] = []
for (let year = FROM; year <= TO; year++) {
  const labels: string[] = []
  for (let month = 1; month <= 12; month++) {
    const se = termInstantSE(year, month)
    const ae = termInstantAE(year, month)
    const label = kstLabel(se)
    const rawDev = Math.abs(se - ae) / 1000
    const labelDev = Math.abs(labelToMs(label) - ae) / 1000
    maxRawDev = Math.max(maxRawDev, rawDev)
    maxLabelDev = Math.max(maxLabelDev, labelDev)
    if (rawDev > MAX_DEV_SEC || labelDev > MAX_DEV_SEC) {
      failures.push(
        `${year}-${month}: SE ${new Date(se).toISOString()} vs AE ${new Date(ae).toISOString()}`
      )
    }
    labels.push(label)
  }
  generated.set(year, labels)
}
if (failures.length) {
  console.error(`astronomy-engine cross-check failed (> ${MAX_DEV_SEC} s):\n${failures.join('\n')}`)
  process.exit(1)
}

// ── 표 블록 파싱 → 병합 ───────────────────────────────────────────────────
const src = readFileSync(CONSTANTS, 'utf8')
const HEAD = 'export const KASI_SOLAR_TERMS: { [year: number]: { [month: number]: string } } = {\n'
const start = src.indexOf(HEAD)
if (start < 0) throw new Error('KASI_SOLAR_TERMS header not found in constants.ts')
const bodyStart = start + HEAD.length
const end = src.indexOf('\n}\n', bodyStart)
if (end < 0) throw new Error('KASI_SOLAR_TERMS closing brace not found')
const body = src.slice(bodyStart, end + 1)

const existing = new Map<number, string[]>()
for (const m of body.matchAll(/^ {2}(\d{4}): \{\n((?: {4}\d+: '[^']+',\n)+) {2}\},\n/gm)) {
  const rows = [...m[2].matchAll(/ {4}(\d+): '([^']+)',/g)]
  const labels: string[] = []
  for (const r of rows) labels[Number(r[1]) - 1] = r[2]
  existing.set(Number(m[1]), labels)
}
const blockCount = (body.match(/^ {2}\d{4}: \{$/gm) ?? []).length
if (blockCount !== existing.size) {
  throw new Error(`parsed ${existing.size} of ${blockCount} year blocks — table format changed?`)
}

const diffs: string[] = []
for (const [year, labels] of generated) {
  const old = existing.get(year)
  if (!old) continue
  labels.forEach((l, i) => {
    if (old[i] !== l) diffs.push(`${year}-${i + 1}: table '${old[i]}' → generated '${l}'`)
  })
}

const added = [...generated.keys()].filter((y) => !existing.has(y))
console.log(
  `years ${FROM}–${TO}: ${generated.size * 12} terms, astronomy-engine max deviation ` +
    `${maxRawDev.toFixed(1)} s (raw), ${maxLabelDev.toFixed(1)} s (minute label); ` +
    `new years ${added.length}, changed rows ${diffs.length}`
)
if (diffs.length) console.log(diffs.join('\n'))

if (CHECK_ONLY) {
  const missing = added.length ? `missing years: ${added.join(', ')}` : ''
  if (diffs.length || added.length) {
    if (missing) console.error(missing)
    process.exit(1)
  }
  process.exit(0)
}

for (const [year, labels] of generated) existing.set(year, labels)
const years = [...existing.keys()].sort((a, b) => a - b)
const newBody = years
  .map((y) => {
    const rows = existing
      .get(y)!
      .map((l, i) => `    ${i + 1}: '${l}',`)
      .join('\n')
    return `  ${y}: {\n${rows}\n  },\n`
  })
  .join('')
writeFileSync(CONSTANTS, src.slice(0, bodyStart) + newBody + src.slice(end + 1))
console.log(`wrote ${CONSTANTS} (${years[0]}–${years[years.length - 1]})`)
