type JsonLike = Record<string, unknown>

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value))
    return value
      .map((v) => (typeof v === 'string' ? v : ''))
      .join('\n')
      .trim()
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
  projections:
    | {
        structure?: { headline?: string; summary?: string; topAxes?: string[] }
        timing?: { headline?: string; summary?: string; window?: string; granularity?: string }
        conflict?: { headline?: string; summary?: string; reasons?: string[] }
        evidence?: {
          headline?: string
          summary?: string
          signalIds?: string[]
          patternIds?: string[]
          scenarioIds?: string[]
        }
      }
    | null
    | undefined
): string {
  if (!projections) return ''
  const blocks = [
    projections.structure
      ? [
          projections.structure.headline || 'Structure Projection',
          projections.structure.summary || '',
          (projections.structure.topAxes || []).length > 0
            ? `Top axes: ${(projections.structure.topAxes || []).join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.timing
      ? [
          projections.timing.headline || 'Timing Projection',
          projections.timing.summary || '',
          [projections.timing.window, projections.timing.granularity].filter(Boolean).join(' / '),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.conflict
      ? [
          projections.conflict.headline || 'Conflict Projection',
          projections.conflict.summary || '',
          ...(projections.conflict.reasons || []).slice(0, 3).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.evidence
      ? [
          projections.evidence.headline || 'Evidence Projection',
          projections.evidence.summary || '',
          (projections.evidence.signalIds || []).length > 0
            ? `Signals: ${(projections.evidence.signalIds || []).join(', ')}`
            : '',
          (projections.evidence.patternIds || []).length > 0
            ? `Patterns: ${(projections.evidence.patternIds || []).join(', ')}`
            : '',
          (projections.evidence.scenarioIds || []).length > 0
            ? `Scenarios: ${(projections.evidence.scenarioIds || []).join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
  ].filter(Boolean)

  return blocks.join('\n\n').trim()
}

export function renderProjectionBlocksAsMarkdown(
  projections:
    | {
        structure?: { headline?: string; summary?: string; topAxes?: string[] }
        timing?: { headline?: string; summary?: string; window?: string; granularity?: string }
        conflict?: { headline?: string; summary?: string; reasons?: string[] }
        evidence?: {
          headline?: string
          summary?: string
          signalIds?: string[]
          patternIds?: string[]
          scenarioIds?: string[]
        }
      }
    | null
    | undefined
): string {
  if (!projections) return ''
  const lines: string[] = []
  const pushBlock = (headline: string | undefined, bodyLines: string[]) => {
    if (!headline || bodyLines.filter(Boolean).length === 0) return
    lines.push(`## ${headline}`)
    lines.push('')
    lines.push(...bodyLines.filter(Boolean))
    lines.push('')
  }

  pushBlock(projections.structure?.headline, [
    projections.structure?.summary || '',
    (projections.structure?.topAxes || []).length > 0
      ? `- Top axes: ${(projections.structure?.topAxes || []).join(', ')}`
      : '',
  ])
  pushBlock(projections.timing?.headline, [
    projections.timing?.summary || '',
    [projections.timing?.window, projections.timing?.granularity].filter(Boolean).join(' / '),
  ])
  pushBlock(projections.conflict?.headline, [
    projections.conflict?.summary || '',
    ...(projections.conflict?.reasons || []).slice(0, 3).map((item) => `- ${item}`),
  ])
  pushBlock(projections.evidence?.headline, [
    projections.evidence?.summary || '',
    (projections.evidence?.signalIds || []).length > 0
      ? `- Signals: ${(projections.evidence?.signalIds || []).join(', ')}`
      : '',
    (projections.evidence?.patternIds || []).length > 0
      ? `- Patterns: ${(projections.evidence?.patternIds || []).join(', ')}`
      : '',
    (projections.evidence?.scenarioIds || []).length > 0
      ? `- Scenarios: ${(projections.evidence?.scenarioIds || []).join(', ')}`
      : '',
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
  const lines: string[] = []
  for (const path of orderedPaths) {
    const text = readPath(sections, path)
    if (!text) continue
    const title = lang === 'ko' ? `섹션: ${path}` : `Section: ${path}`
    lines.push(`## ${title}`)
    lines.push('')
    lines.push(formatRenderedSectionText(text, lang))
    lines.push('')
  }
  return lines.join('\n').trim()
}
