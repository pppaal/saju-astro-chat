import { ensureMinSentenceText } from './textDepth'

type DepthTopic = Parameters<typeof ensureMinSentenceText>[2]

const DETAIL_KEY_REGEX =
  /(description|desc|detail|advice|message|summary|impact|focus|caution|warning|healing|wound|gift|style|pattern|path|phase|theme|flow|tip|fortune|narrative|analysis|needs|language|conflict|response|mission|direction|identity|interpretation|ideal|attract|danger|work|love|money|health|support|activation|turning|approach|lesson|public|decision|growth)/i

function shouldExpandText(value: string): boolean {
  const text = value.trim()
  if (!text) return false
  if (text.length < 20) return false
  if (/^\d+(?:[./:-]\d+)*$/.test(text)) return false
  if (/^[\p{Emoji}\p{Extended_Pictographic}\s]+$/u.test(text)) return false
  if (text.split(/\s+/).filter(Boolean).length < 3) return false
  return true
}

function isExpandableByPath(path: string[]): boolean {
  const key = path[path.length - 1] ?? ''
  const parent = path[path.length - 2] ?? ''

  if (DETAIL_KEY_REGEX.test(key)) return true
  if (/^\d+$/.test(key) && DETAIL_KEY_REGEX.test(parent)) return true
  if ((key === 'ko' || key === 'en') && DETAIL_KEY_REGEX.test(parent)) return true
  return false
}

interface ExpandOptions {
  isKo: boolean
  topic?: DepthTopic
  minSentences?: number
}

export function expandNarrativeDeep<T>(
  input: T,
  { isKo, topic = 'general', minSentences = 4 }: ExpandOptions,
  path: string[] = []
): T {
  if (typeof input === 'string') {
    if (!isExpandableByPath(path)) return input
    if (!shouldExpandText(input)) return input
    return ensureMinSentenceText(input, isKo, topic, minSentences) as T
  }

  if (Array.isArray(input)) {
    return input.map((item, index) =>
      expandNarrativeDeep(item, { isKo, topic, minSentences }, [...path, String(index)])
    ) as T
  }

  if (input && typeof input === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      output[key] = expandNarrativeDeep(value, { isKo, topic, minSentences }, [...path, key])
    }
    return output as T
  }

  return input
}
