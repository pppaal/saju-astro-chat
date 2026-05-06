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

// The system prompt explicitly tells the model "format is guidance, not rigid"
// and gives different lengths for different question types (short check-in,
// yes/no, vague-question ask-back, full decision, etc.). The previous strict
// 4-section template clobbered every conversational reply with a generic
// "입력 요약 / 실행 계획 / 주의" wrapper, which is what users were seeing
// as awkward / robotic answers. We now pass the model's reply through after
// safety cleanup and only canonicalize headings when the model wrote them.
export function normalizeCounselorResponse(raw: string, lang: CounselorLang): string {
  const normalized = normalizeText(raw)
  if (!normalized) return ''

  const sections = getSections(lang)
  return canonicalizeHeadings(normalized, sections)
}
