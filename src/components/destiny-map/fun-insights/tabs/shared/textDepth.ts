type DepthTopic = 'general' | 'health' | 'warning' | 'healing' | 'karma'

function splitSentences(text: string): string[] {
  const trimmed = (text || '').trim()
  if (!trimmed) return []

  const byPunctuation = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (byPunctuation.length > 0) return byPunctuation
  return [trimmed]
}

function withEnding(sentence: string): string {
  const s = sentence.trim()
  if (!s) return ''
  if (/[.!?]$/.test(s)) return s
  return `${s}.`
}

function fallbackSentences(topic: DepthTopic): string[] {
  switch (topic) {
    case 'health':
      return [
        'Track your condition weekly to read trends, not one-time results.',
        'Small early adjustments reduce bigger fatigue later.',
        'Keep one practical habit for seven days and review the change.',
      ]
    case 'warning':
      return [
        'This warning is guidance for adjustment, not a signal for fear.',
        'Log repeated timing and context to identify triggers faster.',
        'Stabilizing sleep, hydration, and meal timing works better than extreme plans.',
      ]
    case 'healing':
      return [
        'Healing starts from naming your current state clearly.',
        'Observe emotional and physical reactions together for better recovery choices.',
        'Sustainable routine changes are stronger than short-term intensity.',
      ]
    case 'karma':
      return [
        'This can be read as a repeating choice pattern, not a fixed fate.',
        'A different response in one familiar situation can shift your trajectory.',
        'Steady reflection and execution matter more than perfect answers.',
      ]
    default:
      return [
        'Start from one concrete action and measure the response.',
        'Short records improve the quality of your next decision.',
        'Consistency is what turns interpretation into real change.',
      ]
  }
}

export function ensureMinSentenceText(
  text: string,
  _isKo: boolean,
  topic: DepthTopic = 'general',
  minSentences = 3
): string {
  const base = splitSentences(text).map(withEnding).filter(Boolean)
  if (base.length >= minSentences) return base.join(' ')

  const fallbacks = fallbackSentences(topic).map(withEnding)
  const result = [...base]

  for (const sentence of fallbacks) {
    if (result.length >= minSentences) break
    result.push(sentence)
  }

  return result.join(' ')
}

export function ensureMinNarrativeParagraphs(
  paragraphs: string[],
  _isKo: boolean,
  topic: DepthTopic = 'general',
  minParagraphs = 3
): string[] {
  const contentCount = paragraphs.filter((p) => {
    const t = (p || '').trim()
    if (!t) return false
    if (t.startsWith('【') || t.includes('【')) return false
    return true
  }).length

  if (contentCount >= minParagraphs) return paragraphs

  const missing = minParagraphs - contentCount
  const extras = fallbackSentences(topic).slice(0, missing)
  return [...paragraphs, '', ...extras]
}
