// Deterministic renderer: turns FortuneReport into structured Korean text.
// LLM-free; later an LLM step can re-write these sections, but the sections
// themselves remain the source of truth so output is auditable.

import type {
  CrossMatch,
  Domain,
  DomainAggregate,
  FortuneReport,
  Intensity,
  Tone,
} from './types'

const DOMAIN_KO: Record<Domain, string> = {
  self: '자아',
  love: '사랑',
  money: '재물',
  career: '직업',
  health: '건강',
  family: '가정',
}

const TONE_KO: Record<Tone, string> = {
  positive: '긍정',
  negative: '주의',
  mixed: '양면',
  neutral: '평이',
}

const INTENSITY_KO: Record<Intensity, string> = {
  strong: '강',
  moderate: '중',
  weak: '약',
}

export interface RenderedReport {
  generatedAt: string
  themes: string[]
  domains: Array<{
    domain: Domain
    domainKo: string
    tone: Tone
    toneKo: string
    text: string
  }>
}

function sectionFor(agg: DomainAggregate): string {
  const lines: string[] = []
  if (agg.confirms.length === 0 && agg.conflicts.length === 0) {
    lines.push('이 영역에는 양 시스템이 동시에 가리키는 신호가 없음.')
    return lines.join(' ')
  }

  if (agg.confirms.length > 0) {
    lines.push(`【양쪽 동의】`)
    for (const m of agg.confirms.slice(0, 3)) {
      lines.push(formatMatch(m, 'confirm'))
    }
  }

  if (agg.conflicts.length > 0) {
    lines.push(`【양면성】`)
    for (const m of agg.conflicts.slice(0, 2)) {
      lines.push(formatMatch(m, 'conflict'))
    }
  }

  return lines.join('\n')
}

function formatMatch(m: CrossMatch, mode: 'confirm' | 'conflict'): string {
  const text =
    mode === 'conflict'
      ? m.rule.narrative.conflict ?? m.rule.narrative.confirm
      : m.rule.narrative.confirm
  const intensity = INTENSITY_KO[m.intensity]
  const evidence = formatEvidence(m)
  return `· (${intensity}) ${text}${evidence ? `  〔${evidence}〕` : ''}`
}

function formatEvidence(m: CrossMatch): string {
  const parts: string[] = []
  const sajuEv = compactEvidence(m.saju.evidence)
  const astroEv = compactEvidence(m.astro.evidence)
  if (sajuEv) parts.push(`사주: ${sajuEv}`)
  if (astroEv) parts.push(`점성: ${astroEv}`)
  return parts.join(' / ')
}

function compactEvidence(ev: Record<string, unknown>): string {
  const keys = Object.keys(ev)
  if (keys.length === 0) return ''
  return keys
    .slice(0, 3)
    .map((k) => {
      const v = ev[k]
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return `${k}=${JSON.stringify(v).slice(0, 40)}`
      return `${k}=${String(v).slice(0, 40)}`
    })
    .filter(Boolean)
    .join(', ')
}

export function render(report: FortuneReport): RenderedReport {
  const themes = report.themes.map((t) => `[${t.rule.meaning}] ${t.rule.narrative}`)
  const domains = (Object.keys(report.byDomain) as Domain[]).map((d) => {
    const agg = report.byDomain[d]
    return {
      domain: d,
      domainKo: DOMAIN_KO[d],
      tone: agg.tone,
      toneKo: TONE_KO[agg.tone],
      text: sectionFor(agg),
    }
  })
  return {
    generatedAt: report.generatedAt,
    themes,
    domains,
  }
}

// Plain-text renderer for CLI / debugging.
export function renderToText(report: FortuneReport): string {
  const r = render(report)
  const lines: string[] = []
  lines.push(`■ 운세 리포트  (${r.generatedAt})`)
  lines.push('')
  if (r.themes.length > 0) {
    lines.push('▶ 통합 테마')
    for (const t of r.themes) lines.push(`  • ${t}`)
    lines.push('')
  }
  for (const d of r.domains) {
    lines.push(`▶ ${d.domainKo}  (${d.toneKo})`)
    lines.push(d.text.replace(/^/gm, '  '))
    lines.push('')
  }
  return lines.join('\n')
}
