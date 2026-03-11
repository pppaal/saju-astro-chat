type CounselorLang = 'ko' | 'en'

const KO_HEADINGS = ['í•œ ì¤„ ê²°ë¡ ', 'ê·¼ê±°', 'ì‹¤í–‰ ê³„íš', 'ì£¼ì˜/ìž¬í™•ì¸'] as const
const EN_HEADINGS = ['Direct Answer', 'Evidence', 'Action Plan', 'Avoid / Recheck'] as const

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, '\n').trim()
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
  const match = compact.match(/^(.+?[.!?]|.+?ë‹¤\.)/)
  const sentence = match?.[1]?.trim() || compact
  return sentence.length > 180 ? `${sentence.slice(0, 180).trim()}...` : sentence
}

function ensureLinePrefix(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('- ') ? trimmed : `- ${trimmed}`
}

function buildKoFallback(raw: string): string {
  const preview = compactPreview(raw)
  const direct = firstSentence(
    raw,
    'ì§€ê¸ˆì€ í•µì‹¬ ì§ˆë¬¸ì— ë¨¼ì € ë‹µí•˜ê³ , í° ê²°ì •ì€ ìž¬í™•ì¸ í›„ ì§„í–‰í•˜ëŠ” íë¦„ì´ ì¢‹ìŠµë‹ˆë‹¤.'
  )
  const evidenceLine = preview
    ? `- ìž…ë ¥ ìš”ì•½: ${preview}`
    : '- ìž…ë ¥ ìš”ì•½: ì‚¬ì£¼Â·ì ì„±Â·ë©”íŠ¸ë¦­ìŠ¤ êµì°¨ ì‹ í˜¸ë¥¼ ê¸°ì¤€ìœ¼ë¡œ íŒë‹¨í–ˆìŠµë‹ˆë‹¤.'
  const lines = [
    '## í•œ ì¤„ ê²°ë¡ ',
    direct,
    '## ê·¼ê±°',
    evidenceLine,
    '- êµì°¨ ì‹ í˜¸ê°€ ì•½í•˜ê±°ë‚˜ ê²½ê³ ê°€ ìžˆìœ¼ë©´ ë¹„ê°€ì—­ ê²°ì •ì€ ë³´ë¥˜í•©ë‹ˆë‹¤.',
    '## ì‹¤í–‰ ê³„íš',
    '- ì˜¤ëŠ˜ í•´ì•¼ í•  í•µì‹¬ 1ê°œë¥¼ ë¨¼ì € í™•ì •í•˜ì„¸ìš”.',
    '- ë¬¸ì„œ/ëŒ€í™”/ì¡°ê±´(ê¸ˆì•¡Â·ê¸°í•œÂ·ì±…ìž„)ì„ ë‘ ë²ˆ í™•ì¸í•˜ì„¸ìš”.',
    '- ìµœì¢… í™•ì •ì€ 24ì‹œê°„ ìž¬ê²€í†  í›„ ì§„í–‰í•˜ì„¸ìš”.',
    '## ì£¼ì˜/ìž¬í™•ì¸',
    '- ì„œëª…/ê²°ì œ/ë°œì†¡/ì¦‰ì‹œ í™•ì •ì€ ì²´í¬ë¦¬ìŠ¤íŠ¸ í™•ì¸ ì „ ë³´ë¥˜í•˜ì„¸ìš”.',
    '- ìƒëŒ€ì™€ ì¡°ê±´ì„ í•œ ì¤„ë¡œ ë‹¤ì‹œ í•©ì˜í•´ ì˜¤í•´ë¥¼ ì¤„ì´ì„¸ìš”.',
    'ì§€ê¸ˆ ë‹¹ìž¥ í•  1ê°œ í–‰ë™: ì˜¤ëŠ˜ ê²°ì •í•  í•­ëª© 1ê°œë§Œ ì ê³ , í™•ì • ì „ ì²´í¬ë¦¬ìŠ¤íŠ¸ 2ê°œë¥¼ ë¨¼ì € ì™„ë£Œí•˜ì„¸ìš”.',
  ]
  return lines.join('\n')
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
  const lines = [
    '## Direct Answer',
    direct,
    '## Evidence',
    evidenceLine,
    '- If caution is present, irreversible decisions should be delayed.',
    '## Action Plan',
    '- Lock one priority for today.',
    '- Recheck document/communication conditions (amount, deadline, ownership).',
    '- Re-evaluate final confirmation after 24 hours.',
    '## Avoid / Recheck',
    '- Do not sign/finalize/send/pay before checklist verification.',
    '- Reconfirm key terms in one sentence with the other party.',
    'Immediate next action: write one decision item now and finish two verification checks first.',
  ]
  return lines.join('\n')
}

function requiredHeadings(lang: CounselorLang): readonly string[] {
  return lang === 'ko' ? KO_HEADINGS : EN_HEADINGS
}

function hasAllRequiredHeadings(text: string, lang: CounselorLang): boolean {
  const normalized = normalizeText(text)
  return requiredHeadings(lang).every((heading) => normalized.includes(`## ${heading}`))
}

export function normalizeCounselorResponse(raw: string, lang: CounselorLang): string {
  const normalized = normalizeText(raw)
  if (!normalized) {
    return lang === 'ko' ? buildKoFallback('') : buildEnFallback('')
  }

  if (hasAllRequiredHeadings(normalized, lang)) {
    return normalized
  }

  return lang === 'ko' ? buildKoFallback(normalized) : buildEnFallback(normalized)
}
