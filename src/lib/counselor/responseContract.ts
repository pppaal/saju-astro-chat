import { repairMojibakeText } from '@/lib/text/mojibake'

type CounselorLang = 'ko' | 'en'

interface SectionDefinition {
  heading: string
  aliases: string[]
}

const KO_SECTIONS: readonly SectionDefinition[] = [
  { heading: '한 줄 결론', aliases: ['한 줄 결론', '한줄결론', '핵심 결론'] },
  { heading: '근거', aliases: ['근거', '근거/상세'] },
  { heading: '실행 계획', aliases: ['실행 계획', '실행계획', '행동 계획'] },
  { heading: '주의/재확인', aliases: ['주의/재확인', '주의 / 재확인', '주의·재확인', '주의사항'] },
] as const

const EN_SECTIONS: readonly SectionDefinition[] = [
  { heading: 'Direct Answer', aliases: ['Direct Answer', 'Answer'] },
  { heading: 'Evidence', aliases: ['Evidence', 'Reasoning', 'Why'] },
  { heading: 'Action Plan', aliases: ['Action Plan', 'Plan'] },
  { heading: 'Avoid / Recheck', aliases: ['Avoid / Recheck', 'Avoid/Recheck', 'Caution'] },
] as const

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

function getSections(lang: CounselorLang): readonly SectionDefinition[] {
  return lang === 'ko' ? KO_SECTIONS : EN_SECTIONS
}

function normalizeText(input: string): string {
  return repairMojibakeText(input || '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHAR_REGEX, '')
    .trim()
}

function compactPreview(text: string, maxLen = 220): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  if (compact.length <= maxLen) return compact
  return `${compact.slice(0, maxLen).trim()}...`
}

function firstSentence(text: string, fallback: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return fallback
  const match = compact.match(/^(.+?[.!?]|.+?다\.)/)
  const sentence = match?.[1]?.trim() || compact
  return sentence.length > 180 ? `${sentence.slice(0, 180).trim()}...` : sentence
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function aliasPattern(alias: string): string {
  return escapeRegExp(alias)
    .replace(/\\ /g, '\\s*')
    .replace(/\\\//g, '\\s*[\\/·]\\s*')
}

function normalizeHeadingSpacing(text: string): string {
  return text
    .replace(/([^\n])\s*(##\s*[^\n#]+)/g, '$1\n$2')
    .replace(/^##(?!\s)/gm, '## ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function canonicalizeHeadings(raw: string, sections: readonly SectionDefinition[]): string {
  let text = normalizeHeadingSpacing(raw)

  for (const section of sections) {
    for (const alias of section.aliases) {
      const pattern = aliasPattern(alias)
      text = text.replace(new RegExp(`(^|\\n)\\s*##\\s*${pattern}\\s*[:：\\-]?\\s*`, 'giu'), `$1## ${section.heading}\n`)
      text = text.replace(new RegExp(`(^|\\n)\\s*#\\s*${pattern}\\s*[:：\\-]?\\s*`, 'giu'), `$1## ${section.heading}\n`)
      text = text.replace(new RegExp(`(^|\\n)\\s*\\*\\*\\s*${pattern}\\s*\\*\\*\\s*`, 'giu'), `$1## ${section.heading}\n`)
    }
  }

  return text.replace(/\n{3,}/g, '\n\n').trim()
}

function hasAllRequiredHeadings(text: string, sections: readonly SectionDefinition[]): boolean {
  return sections.every((section) =>
    new RegExp(`(^|\\n)\\s*##\\s*${escapeRegExp(section.heading)}\\s*(?=\\n|$)`, 'u').test(text)
  )
}

function uniqueNonEmptyLines(value: string): string[] {
  const seen = new Set<string>()
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.replace(/\s+/g, ' ')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function sentenceSplit(text: string, lang: CounselorLang): string[] {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return []

  if (lang === 'ko') {
    return compact
      .split(/(?<=다\.|요\.|죠\.|니다\.|습니다\.|[!?])\s+/u)
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return compact
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean)
}

function cleanSectionLine(text: string, lang: CounselorLang): string {
  let cleaned = text
    .replace(/\((?:wood|fire|earth|metal|water|Aquarius|Pisces|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn)\)/gi, '')
    .replace(/\b(?:wood|fire|earth|metal|water)\b/gi, '')
    .replace(/\b(?:ASC|MC|IC|DC)\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.)])/g, '$1')
    .trim()

  if (lang === 'ko') {
    cleaned = cleaned
      .replace(/\b(?:트랜짓|하우스|오브|사인|태그)\b/g, '')
      .replace(/\b(?:Aquarius|Pisces|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn)\b/g, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  return cleaned
}

function toBulletLines(text: string, lang: CounselorLang, limit: number): string[] {
  const rawLines = uniqueNonEmptyLines(text)
  const existingBullets = rawLines.filter((line) => /^[-*]\s+/.test(line))
  if (existingBullets.length > 0) {
    return existingBullets
      .slice(0, limit)
      .map((line) => cleanSectionLine(line, lang))
  }

  return sentenceSplit(rawLines.join(' '), lang)
    .slice(0, limit)
    .map((line) => `- ${cleanSectionLine(line, lang)}`)
}

function formatSectionBody(heading: string, body: string, lang: CounselorLang): string {
  const compact = cleanSectionLine(body.replace(/\s+/g, ' ').trim(), lang)
  if (!compact) {
    return lang === 'ko' ? '- 핵심 조건을 다시 확인하세요.' : '- Recheck the key conditions.'
  }

  const isConclusion =
    heading === KO_SECTIONS[0].heading || heading === EN_SECTIONS[0].heading

  if (isConclusion) {
    return firstSentence(compact, compact)
  }

  if (heading === KO_SECTIONS[1].heading || heading === EN_SECTIONS[1].heading) {
    return toBulletLines(compact, lang, 3).join('\n')
  }

  if (heading === KO_SECTIONS[2].heading || heading === EN_SECTIONS[2].heading) {
    return toBulletLines(compact, lang, 3).join('\n')
  }

  return toBulletLines(compact, lang, 2).join('\n')
}

function extractCanonicalSections(
  text: string,
  sections: readonly SectionDefinition[]
): Record<string, string> | null {
  const headingMatches: Array<{ heading: string; start: number; end: number }> = []
  const headingRegex = /^##\s*(.+)$/gm

  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(text)) !== null) {
    headingMatches.push({
      heading: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  if (headingMatches.length === 0) return null

  const result: Record<string, string> = {}
  for (const section of sections) {
    const idx = headingMatches.findIndex((entry) => entry.heading === section.heading)
    if (idx < 0) return null

    const current = headingMatches[idx]
    const next = headingMatches[idx + 1]
    result[section.heading] = text.slice(current.end, next ? next.start : text.length).trim()
  }

  return result
}

function buildKoFallback(raw: string): string {
  const preview = compactPreview(raw)
  const direct = firstSentence(raw, '핵심 질문에 먼저 답하고, 큰 결정은 한 번 더 확인한 뒤 움직이세요.')

  return [
    '## 한 줄 결론',
    direct,
    '',
    '## 근거',
    preview
      ? `- 입력 요약: ${preview}`
      : '- 사주, 점성, 매트릭스 교차 신호를 바탕으로 핵심 흐름을 읽었습니다.',
    '- 지금은 확정 판단보다 조건 확인이 더 중요합니다.',
    '',
    '## 실행 계획',
    '- 오늘 가장 중요한 한 가지를 먼저 정하세요.',
    '- 금액, 기한, 책임 범위를 다시 확인하세요.',
    '- 최종 결정은 한 번 더 검토한 뒤 진행하세요.',
    '',
    '## 주의/재확인',
    '- 서명, 결제, 약속 확정 전 체크리스트를 먼저 보세요.',
    '- 상대와 핵심 조건을 한 문장으로 다시 맞춰보세요.',
  ].join('\n')
}

function buildEnFallback(raw: string): string {
  const preview = compactPreview(raw)
  const direct = firstSentence(raw, 'Answer first, then defer irreversible decisions until verification is complete.')

  return [
    '## Direct Answer',
    direct,
    '',
    '## Evidence',
    preview ? `- Input summary: ${preview}` : '- Built from overlapping clues across saju, astrology, and matrix evidence.',
    '- Caution is higher than certainty right now.',
    '',
    '## Action Plan',
    '- Lock one top priority for today.',
    '- Recheck amount, deadline, and ownership before finalizing.',
    '- Re-evaluate once more before you commit.',
    '',
    '## Avoid / Recheck',
    '- Do not sign, send, or pay before checklist verification.',
    '- Reconfirm the key terms in one sentence with the other side.',
  ].join('\n')
}

function buildFallback(raw: string, lang: CounselorLang): string {
  return lang === 'ko' ? buildKoFallback(raw) : buildEnFallback(raw)
}

function tidyStructuredResponse(
  text: string,
  sections: readonly SectionDefinition[],
  lang: CounselorLang
): string {
  const extracted = extractCanonicalSections(text, sections)
  if (!extracted) {
    return buildFallback(text, lang)
  }

  return sections
    .map((section) => `## ${section.heading}\n${formatSectionBody(section.heading, extracted[section.heading] || '', lang)}`)
    .join('\n\n')
}

export function normalizeCounselorResponse(raw: string, lang: CounselorLang): string {
  const normalized = normalizeText(raw)
  if (!normalized) {
    return buildFallback('', lang)
  }

  const sections = getSections(lang)
  const canonicalized = canonicalizeHeadings(normalized, sections)

  if (hasAllRequiredHeadings(canonicalized, sections)) {
    return tidyStructuredResponse(canonicalized, sections, lang)
  }

  return buildFallback(canonicalized || normalized, lang)
}
