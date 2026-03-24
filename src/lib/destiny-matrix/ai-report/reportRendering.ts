type JsonLike = Record<string, unknown>

type ProjectionBlocks = {
  structure?: { headline?: string; summary?: string; topAxes?: string[] }
  timing?: { headline?: string; summary?: string; window?: string; granularity?: string }
  conflict?: { headline?: string; summary?: string; reasons?: string[] }
  action?: { headline?: string; summary?: string; reasons?: string[] }
  risk?: { headline?: string; summary?: string; reasons?: string[] }
  evidence?: { headline?: string; summary?: string; reasons?: string[] }
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : ''))
      .join('\n')
      .trim()
  }
  return ''
}

function readPath(data: JsonLike, path: string): string {
  const parts = path.split('.')
  let cur: unknown = data
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return ''
    cur = (cur as JsonLike)[part]
  }
  return toText(cur)
}

function getProjectionLabels(lang: 'ko' | 'en') {
  return lang === 'ko'
    ? {
        structure: '구조 투영',
        timing: '타이밍 투영',
        conflict: '충돌 투영',
        action: '행동 투영',
        risk: '리스크 투영',
        evidence: '근거 투영',
        topAxes: '상위 축',
        evidencePrefix: '근거',
        section: '섹션',
      }
    : {
        structure: 'Structure View',
        timing: 'Timing View',
        conflict: 'Conflict View',
        action: 'Action View',
        risk: 'Risk View',
        evidence: 'Evidence View',
        topAxes: 'Top axes',
        evidencePrefix: 'Evidence',
        section: 'Section',
      }
}

function formatRenderedSectionText(text: string, lang: 'ko' | 'en'): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  if (lang === 'ko') {
    const match = trimmed.match(/^(.*?)(?:\s*)핵심 근거는\s*([^.!?\n]+)\s*입니다\.?$/su)
    if (!match) return trimmed
    const body = match[1].trim()
    const evidence = match[2].trim()
    return `${body}\n\n근거: ${evidence}`.trim()
  }

  const match = trimmed.match(/^(.*?)(?:\s*)Key grounding comes from\s*([^.!?\n]+)\.?$/su)
  if (!match) return trimmed
  const body = match[1].trim()
  const evidence = match[2].trim()
  return `${body}\n\nEvidence: ${evidence}`.trim()
}

export function renderProjectionBlocksAsText(
  projections: ProjectionBlocks | null | undefined,
  lang: 'ko' | 'en' = 'ko'
): string {
  if (!projections) return ''

  const labels = getProjectionLabels(lang)
  const blocks = [
    projections.structure
      ? [
          projections.structure.headline || labels.structure,
          projections.structure.summary || '',
          (projections.structure.topAxes || []).length > 0
            ? `${labels.topAxes}: ${(projections.structure.topAxes || []).join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.timing
      ? [
          projections.timing.headline || labels.timing,
          projections.timing.summary || '',
          [projections.timing.window, projections.timing.granularity].filter(Boolean).join(' / '),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.conflict
      ? [
          projections.conflict.headline || labels.conflict,
          projections.conflict.summary || '',
          ...(projections.conflict.reasons || []).slice(0, 3).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.action
      ? [
          projections.action.headline || labels.action,
          projections.action.summary || '',
          ...(projections.action.reasons || []).slice(0, 3).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.risk
      ? [
          projections.risk.headline || labels.risk,
          projections.risk.summary || '',
          ...(projections.risk.reasons || []).slice(0, 3).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.evidence
      ? [
          projections.evidence.headline || labels.evidence,
          projections.evidence.summary || '',
          ...(projections.evidence.reasons || []).slice(0, 4).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
  ].filter(Boolean)

  return blocks.join('\n\n').trim()
}

export function renderProjectionBlocksAsMarkdown(
  projections: ProjectionBlocks | null | undefined,
  lang: 'ko' | 'en' = 'ko'
): string {
  if (!projections) return ''

  const labels = getProjectionLabels(lang)
  const lines: string[] = []
  const pushBlock = (headline: string | undefined, bodyLines: string[]) => {
    if (!headline || bodyLines.filter(Boolean).length === 0) return
    lines.push(`## ${headline}`)
    lines.push('')
    lines.push(...bodyLines.filter(Boolean))
    lines.push('')
  }

  pushBlock(projections.structure?.headline || labels.structure, [
    projections.structure?.summary || '',
    (projections.structure?.topAxes || []).length > 0
      ? `- ${labels.topAxes}: ${(projections.structure?.topAxes || []).join(', ')}`
      : '',
  ])
  pushBlock(projections.timing?.headline || labels.timing, [
    projections.timing?.summary || '',
    [projections.timing?.window, projections.timing?.granularity].filter(Boolean).join(' / '),
  ])
  pushBlock(projections.conflict?.headline || labels.conflict, [
    projections.conflict?.summary || '',
    ...(projections.conflict?.reasons || []).slice(0, 3).map((item) => `- ${item}`),
  ])
  pushBlock(projections.action?.headline || labels.action, [
    projections.action?.summary || '',
    ...(projections.action?.reasons || []).slice(0, 3).map((item) => `- ${item}`),
  ])
  pushBlock(projections.risk?.headline || labels.risk, [
    projections.risk?.summary || '',
    ...(projections.risk?.reasons || []).slice(0, 3).map((item) => `- ${item}`),
  ])
  pushBlock(projections.evidence?.headline || labels.evidence, [
    projections.evidence?.summary || '',
    ...(projections.evidence?.reasons || []).slice(0, 4).map((item) => `- ${item}`),
  ])

  return lines.join('\n').trim()
}

export function renderSectionsAsText(
  sections: JsonLike,
  orderedPaths: string[],
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = []
  for (const path of orderedPaths) {
    const text = readPath(sections, path)
    if (text) lines.push(formatRenderedSectionText(text, lang))
  }
  return lines.join('\n\n').trim()
}

export function renderSectionsAsMarkdown(
  sections: JsonLike,
  orderedPaths: string[],
  lang: 'ko' | 'en'
): string {
  const labels = getProjectionLabels(lang)
  const lines: string[] = []
  for (const path of orderedPaths) {
    const text = readPath(sections, path)
    if (!text) continue
    const title = `${labels.section}: ${path}`
    lines.push(`## ${title}`)
    lines.push('')
    lines.push(formatRenderedSectionText(text, lang))
    lines.push('')
  }
  return lines.join('\n').trim()
}
