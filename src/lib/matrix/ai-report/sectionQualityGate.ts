import { hasRepetitiveSentences } from './sectionAudit'

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|(?<=다\.)\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

function measureSectionNovelty(text: string): number {
  const sentences = splitSentences(text).filter((s) => s.length >= 16)
  if (sentences.length === 0) return 0
  const keys = sentences.map((sentence) => sentence.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''))
  const unique = new Set(keys)
  return unique.size
}

function measureSectionSpecificity(text: string): number {
  const concreteRegex =
    /[0-9]{2,4}|(년|월|일|세)|[A-Z]{2,}|[A-Za-z]+(?:\/|\-)[A-Za-z]+|대운|세운|트랜짓/
  return splitSentences(text).filter((s) => concreteRegex.test(s)).length
}

function countConcreteNounsBySection(text: string, sectionKey: string): number {
  const domainHints: Record<string, string[]> = {
    careerPath: ['프로젝트', '역할', '성과', '직무', '협업', '로드맵'],
    relationshipDynamics: ['대화', '경청', '경계', '합의', '감정', '신뢰'],
    wealthPotential: ['예산', '현금흐름', '자산', '손실', '수익', '리스크'],
    healthGuidance: ['수면', '회복', '스트레스', '루틴', '호흡', '피로'],
  }
  const hints = domainHints[sectionKey] || []
  return hints.reduce((acc, hint) => (text.includes(hint) ? acc + 1 : acc), 0)
}

function measureAverageSentenceLength(text: string): number {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return 0
  const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0)
  return total / sentences.length
}

function countAdviceSentences(text: string): number {
  const sentences = splitSentences(text)
  const adviceRegex = /하세요|하십시오|권장|추천|해보세요|준비하세요|점검하세요|검토하세요/
  return sentences.filter((sentence) => adviceRegex.test(sentence)).length
}

function normalizeFactKeywords(fact: string): string[] {
  if (!fact) return []
  const cleaned = fact
    .replace(/\[.*?\]/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const tokens = cleaned
    .split(/[,/:\-]\s*|\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
  return [...new Set(tokens)].slice(0, 8)
}

function measureEvidenceDensity(text: string, factPack: string[]): number {
  const lowered = text.toLowerCase()
  let reflected = 0
  for (const fact of factPack) {
    const keywords = normalizeFactKeywords(fact)
    if (keywords.some((kw) => lowered.includes(kw.toLowerCase()))) {
      reflected += 1
    }
  }
  return reflected
}

export function evaluateSectionGate(
  text: string,
  factPack: string[],
  sectionKey: string,
  isBannedPhrase: (value: string) => boolean
) {
  const novelty = measureSectionNovelty(text)
  const specificity = countConcreteNounsBySection(text, sectionKey)
  const genericSpecificity = measureSectionSpecificity(text)
  const evidenceDensity = measureEvidenceDensity(text, factPack)
  const avgSentenceLength = measureAverageSentenceLength(text)
  const banned = isBannedPhrase(text)
  const adviceCount = countAdviceSentences(text)
  return {
    novelty,
    specificity,
    genericSpecificity,
    evidenceDensity,
    avgSentenceLength,
    banned,
    adviceCount,
    repetitive: hasRepetitiveSentences(text),
    pass:
      novelty >= 3 &&
      specificity >= 2 &&
      evidenceDensity >= 2 &&
      avgSentenceLength <= 40 &&
      !banned &&
      adviceCount <= 2 &&
      !hasRepetitiveSentences(text),
  }
}
