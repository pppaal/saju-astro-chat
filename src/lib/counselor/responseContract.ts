import { repairMojibakeText } from '@/lib/text/mojibake'

type CounselorLang = 'ko' | 'en'

interface SectionDefinition {
  heading: string
  aliases: string[]
}

const KO_SECTIONS: readonly SectionDefinition[] = [
  {
    heading: '\uD55C \uC904 \uACB0\uB860',
    aliases: ['\uD55C \uC904 \uACB0\uB860', '\uD55C\uC904\uACB0\uB860', '\uD575\uC2EC \uACB0\uB860'],
  },
  { heading: '\uADFC\uAC70', aliases: ['\uADFC\uAC70', '\uADFC\uAC70/\uC0C1\uC138'] },
  {
    heading: '\uC2E4\uD589 \uACC4\uD68D',
    aliases: ['\uC2E4\uD589 \uACC4\uD68D', '\uC2E4\uD589\uACC4\uD68D', '\uD589\uB3D9 \uACC4\uD68D'],
  },
  {
    heading: '\uC8FC\uC758/\uC7AC\uD655\uC778',
    aliases: [
      '\uC8FC\uC758/\uC7AC\uD655\uC778',
      '\uC8FC\uC758 / \uC7AC\uD655\uC778',
      '\uC8FC\uC758\u00B7\uC7AC\uD655\uC778',
      '\uC8FC\uC758\uC0AC\uD56D',
    ],
  },
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
  const match = compact.match(/^(.+?[.!?]|.+?\uB2E4\.)/)
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
  const withHeadingBreaks = text.replace(/([^\n])\s*(##\s*[^\n#]+)/g, '$1\n$2')
  return withHeadingBreaks
    .replace(/^##(?!\s)/gm, '## ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function canonicalizeHeadings(raw: string, sections: readonly SectionDefinition[]): string {
  let text = normalizeHeadingSpacing(raw)

  for (const section of sections) {
    for (const alias of section.aliases) {
      const pattern = aliasPattern(alias)

      const hashHeading = new RegExp(
        `(^|\\n)\\s*##\\s*${pattern}\\s*[:：\\-]?\\s*`,
        'giu'
      )
      text = text.replace(hashHeading, `$1## ${section.heading}\n`)

      const singleHash = new RegExp(`(^|\\n)\\s*#\\s*${pattern}\\s*[:：\\-]?\\s*`, 'giu')
      text = text.replace(singleHash, `$1## ${section.heading}\n`)

      const boldHeading = new RegExp(`(^|\\n)\\s*\\*\\*\\s*${pattern}\\s*\\*\\*\\s*`, 'giu')
      text = text.replace(boldHeading, `$1## ${section.heading}\n`)
    }
  }

  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return text
}

function hasAllRequiredHeadings(text: string, sections: readonly SectionDefinition[]): boolean {
  return sections.every((section) => {
    const headingPattern = new RegExp(
      `(^|\\n)\\s*##\\s*${escapeRegExp(section.heading)}\\s*(?=\\n|$)`,
      'u'
    )
    return headingPattern.test(text)
  })
}

function uniqueNonEmptyLines(value: string): string {
  const seen = new Set<string>()
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => {
      const key = line.replace(/\s+/g, ' ')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  return lines.join('\n')
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
    const body = text.slice(current.end, next ? next.start : text.length).trim()
    result[section.heading] = uniqueNonEmptyLines(body)
  }

  return result
}

function buildKoFallback(raw: string): string {
  const preview = compactPreview(raw)
  const direct = firstSentence(
    raw,
    '\uD575\uC2EC \uC9C8\uBB38\uC5D0 \uBA3C\uC800 \uB2F5\uD558\uACE0, \uD070 \uACB0\uC815\uC740 \uC7AC\uD655\uC778 \uD6C4 \uC9C4\uD589\uD558\uC138\uC694.'
  )
  const evidenceLine = preview
    ? `- \uC785\uB825 \uC694\uC57D: ${preview}`
    : '- \uC785\uB825 \uC694\uC57D: \uC0AC\uC8FC\u00B7\uC810\uC131\u00B7\uBA54\uD2B8\uB9AD\uC2A4 \uAD50\uCC28 \uC2E0\uD638\uB97C \uAE30\uBC18\uC73C\uB85C \uD310\uB2E8\uD588\uC2B5\uB2C8\uB2E4.'

  return [
    `## ${KO_SECTIONS[0].heading}`,
    direct,
    '',
    `## ${KO_SECTIONS[1].heading}`,
    evidenceLine,
    '- \uACBD\uACE0 \uC2E0\uD638\uAC00 \uC788\uC73C\uBA74 \uBE44\uAC00\uC5ED \uACB0\uC815\uC740 \uBCF4\uB958\uD569\uB2C8\uB2E4.',
    '',
    `## ${KO_SECTIONS[2].heading}`,
    '- \uC624\uB298 \uD575\uC2EC \uD560 \uC77C 1\uAC00\uC9C0\uB97C \uBA3C\uC800 \uD655\uC815\uD558\uC138\uC694.',
    '- \uC870\uAC74(\uAE08\uC561\u00B7\uAE30\uD55C\u00B7\uCC45\uC784)\uC744 \uB2E4\uC2DC \uD655\uC778\uD558\uC138\uC694.',
    '- \uCD5C\uC885 \uD655\uC815\uC740 24\uC2DC\uAC04 \uC7AC\uAC80\uD1A0 \uD6C4 \uC9C4\uD589\uD558\uC138\uC694.',
    '',
    `## ${KO_SECTIONS[3].heading}`,
    '- \uC11C\uBA85/\uACB0\uC81C/\uBC1C\uC1A1 \uC804\uC5D0 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8 \uD655\uC778\uC744 \uBA3C\uC800 \uD558\uC138\uC694.',
    '- \uC0C1\uB300\uC640 \uD575\uC2EC \uC870\uAC74\uC744 \uD55C \uC904\uB85C \uC7AC\uD655\uC778\uD558\uC138\uC694.',
  ].join('\n')
}

function buildEnFallback(raw: string): string {
  const preview = compactPreview(raw)
  const direct = firstSentence(
    raw,
    'Answer first, then defer irreversible decisions until verification is complete.'
  )
  const evidenceLine = preview
    ? `- Input summary: ${preview}`
    : '- Input summary: grounded on saju/astrology/matrix cross-signals.'

  return [
    `## ${EN_SECTIONS[0].heading}`,
    direct,
    '',
    `## ${EN_SECTIONS[1].heading}`,
    evidenceLine,
    '- If caution is present, delay irreversible decisions.',
    '',
    `## ${EN_SECTIONS[2].heading}`,
    '- Lock one top priority for today.',
    '- Recheck amount, deadline, and ownership before finalizing.',
    '- Re-evaluate final confirmation after 24 hours.',
    '',
    `## ${EN_SECTIONS[3].heading}`,
    '- Do not sign/finalize/send/pay before checklist verification.',
    '- Reconfirm key terms in one sentence with the other party.',
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
    .map((section) => {
      const body = extracted[section.heading]
      const safeBody = body || (lang === 'ko' ? '- 핵심 조건을 다시 확인하세요.' : '- Recheck key conditions.')
      return `## ${section.heading}\n${safeBody}`
    })
    .join('\n\n')
}

export function normalizeCounselorResponse(raw: string, lang: CounselorLang): string {
  const normalized = normalizeText(raw)
  if (!normalized) {
    return buildFallback('', lang)
  }

  const sections = getSections(lang)

  if (hasAllRequiredHeadings(normalized, sections)) {
    return normalized
  }

  const canonicalized = canonicalizeHeadings(normalized, sections)
  if (hasAllRequiredHeadings(canonicalized, sections)) {
    return tidyStructuredResponse(canonicalized, sections, lang)
  }

  return buildFallback(canonicalized || normalized, lang)
}
