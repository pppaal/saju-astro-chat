// Generates docs/CROSS_RULES_SPEC.md from the live rule registry.
// Run with: npx tsx scripts/generate-rules-spec.ts
//
// The output is committed alongside code so the spec never drifts.

import { writeFileSync } from 'fs'
import path from 'path'
import { allRules } from '@/lib/fortune/cross-rules/rules'
import { metaRules } from '@/lib/fortune/cross-rules/metaRules'
import type { Rule, MetaRule } from '@/lib/fortune/cross-rules/types'

// Extract signal keys referenced by a predicate by stringifying its source.
// This is heuristic but reliable for our rule-author convention of always
// using string literals like 'saju.state.x' / 'astro.relation.y'.
function extractKeys(fn: (...args: unknown[]) => unknown, system: 'saju' | 'astro'): string[] {
  const src = fn.toString()
  const re = new RegExp(`['"\`](${system}\\.[A-Za-z0-9_.가-힣ㄱ-ㅎㅏ-ㅣ-]+)['"\`]`, 'g')
  const out = new Set<string>()
  let m
  while ((m = re.exec(src)) !== null) out.add(m[1])
  return Array.from(out).sort()
}

const KO_LAYER: Record<string, string> = {
  state: '정적 (state)',
  relation: '관계 (relation)',
  timing: '시점 (timing)',
}
const KO_SCALE: Record<string, string> = {
  longterm: '평생',
  decade: '10년 (대운)',
  year: '1년 (세운/SR)',
  month: '1달 (월운/LR)',
  day: '1일 (일진/transit)',
  event: '이벤트 (활성화)',
}
const KO_POL: Record<string, string> = {
  pos: '긍정 (양쪽 동의 → confirm)',
  neg: '부정 (양쪽 동의 → confirm)',
  mixed: '양면 (양쪽 동의 → conflict)',
  context: '런타임 결정 (predicate가 polarity 반환)',
}

function formatRule(r: Rule): string {
  const sajuKeys = extractKeys(r.sajuPredicate as never, 'saju')
  const astroKeys = extractKeys(r.astroPredicate as never, 'astro')
  return [
    `### \`${r.id}\``,
    '',
    `- **레이어**: ${KO_LAYER[r.layer] ?? r.layer}${r.scale ? `  ·  **스케일**: ${KO_SCALE[r.scale] ?? r.scale}` : ''}`,
    `- **도메인**: ${r.domain}`,
    `- **의미**: ${r.meaning}`,
    `- **폴라리티 힌트**: ${KO_POL[r.polarityHint] ?? r.polarityHint}`,
    '',
    `**발화 조건**`,
    '',
    `- 사주 측: ${sajuKeys.length ? sajuKeys.map((k) => `\`${k}\``).join(' / ') : '_(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_'}`,
    `- 점성 측: ${astroKeys.length ? astroKeys.map((k) => `\`${k}\``).join(' / ') : '_(predicate가 컨텍스트 조회. 예: ctx.hasAstro)_'}`,
    '',
    `**서술 (confirm)**`,
    '',
    `> ${r.narrative.confirm}`,
    r.narrative.conflict
      ? `\n**서술 (conflict / 양면)**\n\n> ${r.narrative.conflict}`
      : '',
  ].filter(Boolean).join('\n')
}

function formatMeta(m: MetaRule): string {
  return [
    `### \`${m.id}\``,
    '',
    `- **의미**: ${m.meaning}`,
    '',
    `**서술**`,
    '',
    `> ${m.narrative}`,
    '',
    `**검출 로직**: 도메인별 집계 결과(\`Record<Domain, DomainAggregate>\`)에서 다음 조건이 참일 때 발화`,
    '',
    '```ts',
    m.detect.toString(),
    '```',
  ].join('\n')
}

function groupBy<T, K extends string>(arr: T[], key: (x: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const x of arr) {
    const k = key(x)
    out[k] = out[k] ?? ([] as T[])
    out[k].push(x)
  }
  return out
}

function buildSpec(): string {
  const lines: string[] = []
  lines.push(`# Cross-Rules Spec — 사주 × 점성 교차 룰 명세`)
  lines.push('')
  lines.push(`> 자동 생성 문서. 룰 정의가 진실의 원천이며, 이 문서는 \`scripts/generate-rules-spec.ts\`로 재생성됩니다.`)
  lines.push('')
  lines.push(`총 룰 수: **${allRules.length}**  ·  메타룰 수: **${metaRules.length}**`)
  lines.push('')

  // ── 레이어 / 스케일 인덱스 ────────────────────────────
  lines.push(`## 인덱스`)
  lines.push('')
  const byLayer = groupBy(allRules, (r) => r.layer)
  for (const layer of ['state', 'relation', 'timing'] as const) {
    const list = byLayer[layer] ?? []
    lines.push(`- **${KO_LAYER[layer]}**: ${list.length}개`)
    if (layer === 'timing') {
      const byScale = groupBy(list, (r) => (r.scale ?? 'longterm') as string)
      for (const s of ['longterm', 'decade', 'year', 'month', 'day', 'event']) {
        const sList = byScale[s] ?? []
        if (sList.length) lines.push(`    - ${KO_SCALE[s] ?? s}: ${sList.length}개`)
      }
    }
  }
  lines.push('')

  // ── 도메인 분포 ────────────────────────────────────────
  const byDomain = groupBy(allRules, (r) => r.domain)
  lines.push(`### 도메인 분포`)
  lines.push('')
  for (const d of ['self', 'love', 'money', 'career', 'health', 'family'] as const) {
    lines.push(`- **${d}**: ${(byDomain[d] ?? []).length}개`)
  }
  lines.push('')

  // ── 룰 본문 ─────────────────────────────────────────────
  for (const layer of ['state', 'relation', 'timing'] as const) {
    lines.push(`---`)
    lines.push('')
    lines.push(`## ${KO_LAYER[layer].toUpperCase()} 레이어`)
    lines.push('')
    const list = byLayer[layer] ?? []
    if (layer === 'timing') {
      const byScale = groupBy(list, (r) => (r.scale ?? 'longterm') as string)
      for (const s of ['longterm', 'decade', 'year', 'month', 'day', 'event']) {
        const sList = byScale[s] ?? []
        if (!sList.length) continue
        lines.push(`### 스케일: ${KO_SCALE[s] ?? s}`)
        lines.push('')
        for (const r of sList) {
          lines.push(formatRule(r))
          lines.push('')
        }
      }
    } else {
      for (const r of list) {
        lines.push(formatRule(r))
        lines.push('')
      }
    }
  }

  // ── 메타룰 ─────────────────────────────────────────────
  lines.push(`---`)
  lines.push('')
  lines.push(`## 메타룰 (Cross-domain themes)`)
  lines.push('')
  lines.push(`각 메타룰은 도메인별 집계가 끝난 뒤 \`detect()\` 조건을 평가하여 발화합니다. 정상 룰과 달리 **신호 → 룰 → 도메인 집계 → 메타룰** 순으로 두 단계 위에서 작동합니다.`)
  lines.push('')
  for (const m of metaRules) {
    lines.push(formatMeta(m))
    lines.push('')
  }

  // ── 엔진 동작 ──────────────────────────────────────────
  lines.push(`---`)
  lines.push('')
  lines.push(`## 엔진 동작 명세`)
  lines.push('')
  lines.push(`1. **Normalizer**가 사주·점성 엔진 결과를 \`Signal[]\`로 환원. 키는 \`<system>.<layer>.<sub>\` 네임스페이스.`)
  lines.push(`2. **Engine**이 모든 룰을 한 번씩 평가. timing 룰은 같은 \`scale\`의 시그널만 본다 (다른 스케일은 매칭 풀에서 제외).`)
  lines.push(`3. 각 룰은 양쪽 시스템에서 \`Hit\`(fired/strength)를 받음.`)
  lines.push(`4. **Polarity 결정**:`)
  lines.push(`    - 양쪽 \`fired\` & 힌트 ≠ mixed: **confirm**`)
  lines.push(`    - 양쪽 \`fired\` & 힌트 = mixed (또는 context의 polarity 불일치): **conflict**`)
  lines.push(`    - 한쪽만 \`fired\`: **silent**`)
  lines.push(`5. **Intensity** = \`min(saju.strength, astro.strength) × layerPrior\` 후 등급화 (≥0.7 strong, ≥0.4 moderate, else weak). state 레이어는 prior 0.7, relation/timing은 1.0.`)
  lines.push(`6. **Aggregator**가 도메인별로 confirm/conflict/silent 분류 + tone 라벨 부여.`)
  lines.push(`7. **MetaRule**이 도메인 집계를 보고 cross-domain 테마를 추가.`)
  lines.push('')
  lines.push(`이 흐름은 \`tests/fortune-cross-rules.test.ts\`의 16개 단위 테스트로 검증됩니다.`)
  lines.push('')

  return lines.join('\n')
}

const out = buildSpec()
const outPath = path.resolve('docs/CROSS_RULES_SPEC.md')
writeFileSync(outPath, out, 'utf8')
console.log(`wrote ${outPath} (${out.length.toLocaleString()} chars, ${allRules.length} rules + ${metaRules.length} meta)`)
