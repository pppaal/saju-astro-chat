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
  const sajuEv = compactEvidence(m.saju.evidence, SAJU_KEY_KO)
  const astroEv = compactEvidence(m.astro.evidence, ASTRO_KEY_KO)
  if (sajuEv) parts.push(`사주: ${sajuEv}`)
  if (astroEv) parts.push(`점성: ${astroEv}`)
  return parts.join(' / ')
}

// 사주 evidence 키 → 한국어 라벨
const SAJU_KEY_KO: Record<string, string> = {
  source: '운',
  kind: '관계',
  detail: '내용',
  pillars: '기둥',
  sibsin: '십성',
  unse: '운',
  count: '개수',
  group: '그룹',
  level: '단계',
  total: '총',
  yongsin: '용신',
  geokguk: '격국',
  category: '분류',
  dayMaster: '일간',
  type: '유형',
}
// 점성 evidence 키 → 한국어 라벨
const ASTRO_KEY_KO: Record<string, string> = {
  trigger: '자극원',
  target: '대상',
  type: '각도',
  orb: '오브',
  from: '출발',
  to: '도달',
  house: '하우스',
  sign: '사인',
  planet: '행성',
  ruler: '통치자',
  rulerHouse: '통치자 하우스',
  status: '상태',
  score: '점수',
  tier: '등급',
  reasons: '근거',
  sect: 'sect',
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(Math.round(v * 100) / 100)
  if (typeof v === 'boolean') return v ? '예' : '아니오'
  if (Array.isArray(v)) return v.map((x) => formatValue(x)).filter(Boolean).join('·')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.cheon === 'string') return String(o.cheon) // 십성
    if (typeof o.name === 'string') return String(o.name)   // 일간 등
    return ''
  }
  return String(v)
}

function compactEvidence(ev: Record<string, unknown>, koKeys: Record<string, string> = {}): string {
  const keys = Object.keys(ev).filter((k) => !k.startsWith('_'))
  if (keys.length === 0) return ''
  return keys
    .slice(0, 3)
    .map((k) => {
      const v = ev[k]
      const label = koKeys[k] ?? k
      const val = formatValue(v)
      if (!val) return ''
      return `${label} ${val}`
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
