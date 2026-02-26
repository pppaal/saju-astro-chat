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

export function renderSectionsAsText(sections: JsonLike, orderedPaths: string[]): string {
  const lines: string[] = []
  for (const path of orderedPaths) {
    const text = readPath(sections, path)
    if (text) lines.push(text)
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
    lines.push(text)
    lines.push('')
  }
  return lines.join('\n').trim()
}
