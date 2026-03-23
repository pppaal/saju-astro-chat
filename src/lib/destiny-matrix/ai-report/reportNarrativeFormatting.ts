import { splitSentences } from './sectionQualityGate'
import type { AIPremiumReport } from './reportTypes'

type Lang = 'ko' | 'en'

export interface NarrativePathSanitizerDeps {
  getPathValue: (target: Record<string, unknown>, path: string) => unknown
  postProcessSectionNarrative: (
    text: string,
    sectionKey: keyof AIPremiumReport['sections'],
    lang: Lang
  ) => string
  setPathText: (target: Record<string, unknown>, path: string, value: string) => void
  softenOverclaimPhrases: (text: string) => string
}

export function formatNarrativeParagraphs(text: string, lang: Lang): string {
  const normalized = String(text || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!normalized) return normalized
  const sentences = splitSentences(normalized)
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (sentences.length <= 4) return normalized
  const groupSize = lang === 'ko' ? 3 : 2
  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += groupSize) {
    chunks.push(sentences.slice(i, i + groupSize).join(' '))
  }
  return chunks
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sentenceKey(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 72)
    .toLowerCase()
}

export function removeCrossSectionNarrativeRepetition(
  sections: Record<string, unknown>,
  sectionOrder: string[],
  lang: Lang
): Record<string, unknown> {
  const next = { ...sections }
  const seen = new Set<string>()

  for (const key of sectionOrder) {
    const current = String(next[key] || '').trim()
    if (!current) continue

    if (key === 'actionPlan') {
      const preserved = formatNarrativeParagraphs(current, lang)
      next[key] = preserved
      for (const sentence of splitSentences(preserved)
        .map((item) => String(item || '').trim())
        .filter(Boolean)) {
        seen.add(sentenceKey(sentence))
      }
      continue
    }

    const sentences = splitSentences(current)
      .map((sentence) => String(sentence || '').trim())
      .filter(Boolean)

    if (sentences.length <= 2) {
      for (const sentence of sentences) {
        seen.add(sentenceKey(sentence))
      }
      continue
    }

    const kept: string[] = []
    for (let index = 0; index < sentences.length; index += 1) {
      const sentence = sentences[index]
      const keyValue = sentenceKey(sentence)
      const alreadySeen = seen.has(keyValue)

      if (index === 0 || !alreadySeen) {
        kept.push(sentence)
        seen.add(keyValue)
      }
    }

    const normalized =
      kept.length >= 2
        ? kept.join(' ')
        : sentences.slice(0, Math.min(2, sentences.length)).join(' ')

    next[key] = formatNarrativeParagraphs(normalized, lang)
  }

  return next
}

export function sanitizeSectionsByPaths(
  sections: Record<string, unknown>,
  paths: string[],
  deps: NarrativePathSanitizerDeps
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(sections)) as Record<string, unknown>
  const sectionKeySet = new Set<keyof AIPremiumReport['sections']>([
    'introduction',
    'personalityDeep',
    'careerPath',
    'relationshipDynamics',
    'wealthPotential',
    'healthGuidance',
    'lifeMission',
    'timingAdvice',
    'actionPlan',
    'conclusion',
  ])
  for (const path of paths) {
    const value = deps.getPathValue(next, path)
    if (typeof value !== 'string') continue
    const sectionCandidate = path.split('.').pop() as keyof AIPremiumReport['sections']
    const sectionKey = sectionKeySet.has(sectionCandidate) ? sectionCandidate : 'introduction'
    const lang: Lang = /[가-힣]/.test(value) ? 'ko' : 'en'
    const sanitized = deps.postProcessSectionNarrative(value, sectionKey, lang)
    deps.setPathText(next, path, deps.softenOverclaimPhrases(sanitized))
  }
  return next
}
