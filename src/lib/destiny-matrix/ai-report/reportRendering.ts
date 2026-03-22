type JsonLike = Record<string, unknown>

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : '')).join('\n').trim()
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
