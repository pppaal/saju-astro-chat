/**
 * docs 자동 섹션 생성기 (SSOT → 문서).
 *
 * 문서 안의 다음 마커 사이 내용을 코드 SSOT 에서 읽어 갱신한다:
 *   <!-- gen:KEY -->
 *   ...자동 생성 영역...
 *   <!-- /gen:KEY -->
 *
 * 마커 밖의 산문(교리 설명 등)은 절대 건드리지 않는다.
 *
 * 사용:
 *   npm run docs:sync         # 문서 갱신 (tsx scripts/docs/generate.ts)
 *   npm run docs:sync:check   # 갱신 필요하면 비-0 종료 (CI/훅용)
 *
 * 새 자동 섹션 추가: 아래 GENERATORS 에 key → () => markdown 추가 후
 * 문서에 <!-- gen:key --> <!-- /gen:key --> 마커만 넣으면 됨.
 */
import fs from 'node:fs'
import path from 'node:path'
import prettier from 'prettier'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'
import { ENABLED_SERVICES, REMOVED_PUBLIC_SERVICE_PREFIXES } from '@/config/enabledServices'
import { tarotThemes, tarotCreditCostFor } from '@/lib/tarot/tarot-spreads-data'
import { tarotDeck } from '@/lib/tarot/data'

const ROOT = process.cwd()
const DOCS_DIR = path.join(ROOT, 'docs')
const API_DIR = path.join(ROOT, 'src', 'app', 'api')
const TESTS_DIR = path.join(ROOT, 'tests')

// 디렉토리 재귀 순회하며 조건 맞는 파일 수 세기
function countFiles(dir: string, match: (name: string) => boolean): number {
  if (!fs.existsSync(dir)) return 0
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countFiles(path.join(dir, e.name), match)
    else if (match(e.name)) n++
  }
  return n
}

function countRoutes(): number {
  return countFiles(API_DIR, (n) => n === 'route.ts')
}

// API_AUDIT_REPORT.md(audit:api 생성물)의 Summary bullet 들을 그대로 surface.
function auditSummaryLines(): string[] {
  const f = path.join(DOCS_DIR, 'API_AUDIT_REPORT.md')
  if (!fs.existsSync(f)) return ['- (API_AUDIT_REPORT.md 없음 — `npm run audit:api` 실행)']
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  const start = lines.findIndex((l) => l.trim() === '## Summary')
  if (start < 0) return ['- (Summary 섹션 못 찾음)']
  const out: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('## ')) break
    if (l.trim().startsWith('- ')) out.push(l.trim())
  }
  return out.length ? out : ['- (Summary 비어있음)']
}

const STAMP = '<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->'

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return [head, sep, body].join('\n')
}

// ── 자동 섹션 생성기들 ───────────────────────────────────────────────
const GENERATORS: Record<string, () => string> = {
  // 계산 표준(교리) — calculationStandards.ts 가 코드 SSOT
  'calculation-standards': () => {
    const s = CALCULATION_STANDARDS
    const saju = table(
      ['항목', '값'],
      Object.entries(s.saju).map(([k, v]) => [`\`${k}\``, `\`${String(v)}\``])
    )
    const astro = table(
      ['항목', '값'],
      Object.entries(s.astrology).map(([k, v]) => [`\`${k}\``, `\`${String(v)}\``])
    )
    return [
      STAMP,
      '',
      '**원천:** [`src/lib/config/calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)',
      '',
      '### 사주 (Saju)',
      '',
      saju,
      '',
      '### 점성 (Astrology)',
      '',
      astro,
    ].join('\n')
  },

  // 활성 서비스 — enabledServices.ts 가 코드 SSOT
  'services-table': () => {
    const active = table(
      ['', '서비스', '경로', 'ID'],
      ENABLED_SERVICES.map((s) => [
        s.icon,
        `${s.label.ko} / ${s.label.en}`,
        `\`${s.href}\``,
        `\`${s.id}\``,
      ])
    )
    const removed = REMOVED_PUBLIC_SERVICE_PREFIXES.map((p) => `\`${p}\``).join(', ')
    return [
      STAMP,
      '',
      '**원천:** [`src/config/enabledServices.ts`](../../src/config/enabledServices.ts)',
      '',
      '### 활성 서비스',
      '',
      active,
      '',
      `### 제거된 경로 (404)\n\n${removed}`,
    ].join('\n')
  },

  // 타로 스프레드 → 크레딧 비용 — tarot-spreads-data.ts 가 코드 SSOT
  'tarot-costs': () => {
    const rows: string[][] = []
    for (const theme of tarotThemes) {
      for (const sp of theme.spreads) {
        rows.push([
          `${sp.titleKo} / ${sp.title}`,
          String(sp.cardCount),
          `${tarotCreditCostFor(sp.cardCount)} 크레딧`,
        ])
      }
    }
    return [
      STAMP,
      '',
      '**원천:** [`src/lib/tarot/tarot-spreads-data.ts`](../../src/lib/tarot/tarot-spreads-data.ts)',
      '',
      table(['스프레드', '카드 수', '비용'], rows),
    ].join('\n')
  },

  // 타로 덱 구성 — tarotDeck 가 코드 SSOT
  'tarot-deck': () => {
    const total = tarotDeck.length
    const bySuit = tarotDeck.reduce<Record<string, number>>((acc, c) => {
      acc[c.suit] = (acc[c.suit] ?? 0) + 1
      return acc
    }, {})
    const major = tarotDeck.filter((c) => c.arcana === 'major').length
    const minor = total - major
    const suitRows = Object.entries(bySuit)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([suit, n]) => [`\`${suit}\``, String(n)])
    return [
      STAMP,
      '',
      '**원천:** [`src/lib/tarot/data/`](../../src/lib/tarot/data/)',
      '',
      `- **총 ${total}장** — Major ${major} · Minor ${minor}`,
      '',
      table(['Suit', '장수'], suitRows),
    ].join('\n')
  },

  // 프로젝트 상태판 — 코드에서 끌어온 실지표 (Obsidian 한눈 현황)
  'health-dashboard': () => {
    const routes = countRoutes()
    const services = ENABLED_SERVICES.length
    const tests = countFiles(TESTS_DIR, (n) => /\.(test|spec)\.(ts|tsx)$/.test(n))
    const deck = tarotDeck.length
    const major = tarotDeck.filter((c) => c.arcana === 'major').length
    const inventory = table(
      ['지표', '값'],
      [
        ['활성 서비스', `${services}개 ([[services-index]])`],
        ['API 라우트', `${routes}개 ([[api-routes]])`],
        ['테스트 파일', `${tests}개`],
        ['타로 덱', `${deck}장 (Major ${major}/Minor ${deck - major})`],
        ['하우스 시스템', `\`${CALCULATION_STANDARDS.astrology.houseSystem}\``],
        ['사주 기준 TZ', `\`${CALCULATION_STANDARDS.saju.baseTimezone}\``],
      ]
    )
    return [
      STAMP,
      '',
      '### 📦 인벤토리 (코드 기준)',
      '',
      inventory,
      '',
      '### 🔐 보안 ([[API_AUDIT_REPORT]] 기준)',
      '',
      ...auditSummaryLines(),
      '',
      '> 코드 품질 점수(테스트 통과율·버그·커버리지)는 이 표로 안 나옴 —',
      '> 별도 에이전트 감사 필요. 여기는 "인벤토리 + 보안 신호" 현황판.',
    ].join('\n')
  },

  // API 라우트 인벤토리 — 파일시스템이 SSOT
  'api-routes': () => {
    const routes: { route: string; methods: string }[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name === 'route.ts') {
          const rel = path.relative(API_DIR, path.dirname(full)).split(path.sep).join('/')
          const src = fs.readFileSync(full, 'utf8')
          const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
            .filter((m) => new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${m}\\b`).test(src))
            .join(', ')
          routes.push({ route: `/api/${rel}`, methods: methods || '—' })
        }
      }
    }
    walk(API_DIR)
    routes.sort((a, b) => a.route.localeCompare(b.route))
    return [
      STAMP,
      '',
      `**총 ${routes.length}개 라우트** (원천: \`src/app/api/**/route.ts\`)`,
      '',
      table(
        ['라우트', '메서드'],
        routes.map((r) => [`\`${r.route}\``, r.methods])
      ),
    ].join('\n')
  },
}

// ── 마커 치환 엔진 ──────────────────────────────────────────────────
function applyGenerators(content: string, file: string): string {
  return content.replace(
    /(<!-- gen:([\w-]+) -->)([\s\S]*?)(<!-- \/gen:\2 -->)/g,
    (_match, open: string, key: string, _body: string, close: string) => {
      const gen = GENERATORS[key]
      if (!gen) {
        throw new Error(`[docs:sync] 알 수 없는 gen 키 "${key}" (${file})`)
      }
      return `${open}\n${gen()}\n${close}`
    }
  )
}

function listMarkdown(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listMarkdown(full))
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

// prettier 와 충돌하지 않도록, 생성 결과를 prettier 로 한 번 정규화해서 쓴다.
// (lint-staged 의 prettier --write 가 다시 손대도 변화 없음 = idempotent)
async function formatMarkdown(content: string, file: string): Promise<string> {
  const cfg = await prettier.resolveConfig(file)
  return prettier.format(content, { ...cfg, parser: 'markdown' })
}

async function main() {
  const check = process.argv.includes('--check')
  const files = listMarkdown(DOCS_DIR)
  const stale: string[] = []
  let updated = 0
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8')
    if (!before.includes('<!-- gen:')) continue
    const after = await formatMarkdown(applyGenerators(before, file), file)
    if (after === before) continue
    if (check) {
      stale.push(path.relative(ROOT, file))
    } else {
      fs.writeFileSync(file, after)
      updated++
      console.log(`updated: ${path.relative(ROOT, file)}`)
    }
  }
  if (check && stale.length) {
    console.error('\n[docs:sync:check] 문서가 코드 SSOT 와 어긋남. `npm run docs:sync` 후 커밋:')
    stale.forEach((f) => console.error(`  - ${f}`))
    process.exit(1)
  }
  if (!check) console.log(`done. ${updated} file(s) updated.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
