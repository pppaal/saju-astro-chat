import { repairMojibakeText } from '@/lib/text/mojibake'

type CounselorLang = 'ko' | 'en'

interface SectionDefinition {
  heading: string
  aliases: string[]
}

const KO_SECTIONS: readonly SectionDefinition[] = [
  { heading: '한 줄 결론', aliases: ['한 줄 결론', '한줄결론', '핵심 결론', '직접 답', '직접답'] },
  { heading: '근거', aliases: ['근거', '근거/상세', '구조와 상황', '구조 상황', '타이밍과 충돌', '타이밍 충돌'] },
  { heading: '실행 계획', aliases: ['실행 계획', '실행계획', '행동 계획', '실행', '실행 방안'] },
  {
    heading: '주의/재확인',
    aliases: [
      '주의/재확인',
      '주의 / 재확인',
      '주의·재확인',
      '주의사항',
      '리스크와 재확인',
      '리스크 재확인',
      '리스크와 주의',
    ],
  },
] as const

const EN_SECTIONS: readonly SectionDefinition[] = [
  { heading: 'Direct Answer', aliases: ['Direct Answer', 'Answer', 'Direct'] },
  {
    heading: 'Evidence',
    aliases: [
      'Evidence',
      'Reasoning',
      'Why',
      'Structure and Situation',
      'Structure & Situation',
      'Timing and Tension',
      'Timing & Tension',
    ],
  },
  { heading: 'Action Plan', aliases: ['Action Plan', 'Plan', 'Action'] },
  {
    heading: 'Avoid / Recheck',
    aliases: ['Avoid / Recheck', 'Avoid/Recheck', 'Caution', 'Risk and Recheck', 'Risk & Recheck'],
  },
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

function mergeRepeatedHeadings(text: string, sections: readonly SectionDefinition[]): string {
  // After alias rewriting, two distinct source headings can collapse onto the
  // same canonical heading (e.g. both "구조와 상황" and "타이밍과 충돌" map to
  // "근거"). Merge consecutive duplicate H2s so the bodies join into one
  // section instead of the second one truncating the first.
  for (const section of sections) {
    const heading = escapeRegExp(section.heading)
    const re = new RegExp(
      `(^|\\n)##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)\\n##\\s*${heading}\\s*\\n`,
      'gu'
    )
    let prev: string
    do {
      prev = text
      text = text.replace(re, '$1## ' + section.heading + '\n$2\n')
    } while (text !== prev)
  }
  return text
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

  text = mergeRepeatedHeadings(text, sections)
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

// The system prompt explicitly tells the model "format is guidance, not rigid"
// and gives different lengths for different question types (short check-in,
// yes/no, vague-question ask-back, full decision, etc.). The previous strict
// 4-section template clobbered every conversational reply with a generic
// "입력 요약 / 실행 계획 / 주의" wrapper, which is what users were seeing
// as awkward / robotic answers. We now pass the model's reply through after
// safety cleanup and only canonicalize headings when the model wrote them.
//
// The counselor now answers in flowing prose by contract — no headings.
// We strip any markdown H2/H3 the model leaks (e.g. "## 한 줄 결론") so the
// reply renders as one continuous block; bullet markers are preserved since
// the writer may use them sparingly inline.
function stripMarkdownHeadings(text: string): string {
  return text
    .replace(/^\s*#{1,6}\s*[^\n]*\n?/gm, '')
    .replace(/\*\*([^*\n]+)\*\*\s*[:：]\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function normalizeCounselorResponse(raw: string, lang: CounselorLang): string {
  const normalized = normalizeText(raw)
  if (!normalized) return ''

  // Even with the contract telling the model to answer in prose, GPT/Claude
  // sometimes leak the old "## 한 줄 결론 / ## 근거 / ..." scaffolding —
  // sometimes with the body glued onto the heading line. We first canonicalize
  // so headings sit on their own line with body below, *then* strip headings
  // so only the body survives as flowing prose.
  const sections = getSections(lang)
  const canonicalized = canonicalizeHeadings(normalized, sections)
  const stripped = stripMarkdownHeadings(canonicalized)
  return stripped || canonicalized
}
