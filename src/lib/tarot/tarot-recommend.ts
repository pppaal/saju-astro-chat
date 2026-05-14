// 스프레드 4개만 남긴 뒤의 mini 추천기.
// 질문의 *깊이* (길이 + 키워드) 만 보고 1·3·5·10장 중 하나로 라우팅.
// 도메인(연애·커리어 등)은 LLM 이 해석 단계에서 추출하므로 여기서는 따지지 않음.

import { tarotThemes } from './tarot-spreads-data'
import { Spread, TarotTheme } from './tarot.types'

export interface SpreadRecommendation {
  themeId: string
  theme: TarotTheme
  spreadId: string
  spread: Spread
  reason: string
  reasonKo: string
  matchScore: number
}

const THEME_ID = 'general-insight'

const SPREAD_BY_DEPTH = {
  shallow: 'quick-reading',       // 1장
  normal: 'past-present-future',  // 3장
  deep: 'general-cross',          // 5장
  full: 'celtic-cross',           // 10장
} as const

type Depth = keyof typeof SPREAD_BY_DEPTH

function classifyDepth(question: string): Depth {
  const q = question.trim()
  const len = q.length
  if (len === 0) return 'normal'

  // 캐주얼·단답 — 1장
  if (len <= 10) return 'shallow'
  if (/^(오늘|내일|뭐|어디|언제|누구|뭐 ?먹|뭐 ?입|뭐 ?사)/i.test(q) && len <= 25) return 'shallow'

  // 깊고 무거운 질문 — 10장
  if (/(인생|평생|운명|진로|소명|왜 ?사|어떻게 ?살|삶의 ?의미)/i.test(q)) return 'full'
  if (len >= 80) return 'full'

  // 5장 — 결정·진로·관계 등 본격 질문
  if (len >= 40) return 'deep'
  if (/(어떻게|왜|어디서|만나|이직|결혼|헤어|선택|결정|투자)/i.test(q)) return 'deep'

  return 'normal'
}

function pick(depth: Depth): SpreadRecommendation | null {
  const theme = tarotThemes.find((t) => t.id === THEME_ID)
  if (!theme) return null
  const spreadId = SPREAD_BY_DEPTH[depth]
  const spread = theme.spreads.find((s) => s.id === spreadId)
  if (!spread) return null

  const labels: Record<Depth, { reason: string; reasonKo: string }> = {
    shallow: { reason: 'Quick single-card answer', reasonKo: '가볍게 한 장으로 답을 봐요' },
    normal: { reason: 'Three-card flow over time', reasonKo: '과거·현재·미래 흐름으로 봐요' },
    deep: { reason: 'Five-card balanced reading', reasonKo: '5장으로 균형 잡힌 리딩' },
    full: { reason: 'Celtic Cross — full depth', reasonKo: '켈틱 크로스로 깊게 풀어요' },
  }

  return {
    themeId: THEME_ID,
    theme,
    spreadId,
    spread,
    reason: labels[depth].reason,
    reasonKo: labels[depth].reasonKo,
    matchScore: 100,
  }
}

export function recommendSpreads(question: string, maxResults?: number): SpreadRecommendation[]
export function recommendSpreads(
  question: string,
  maxResults: number,
  language: 'ko' | 'en'
): SpreadRecommendation[]
export function recommendSpreads(
  question: string,
  maxResults: number = 3,
  _language: 'ko' | 'en' = 'ko'
): SpreadRecommendation[] {
  void _language
  // 깊이 기반 — primary 1개. 추가 결과는 인접 깊이 (호환을 위해 N개 채워줌).
  const order: Depth[] = ['shallow', 'normal', 'deep', 'full']
  const primary = classifyDepth(question)
  const primaryIdx = order.indexOf(primary)
  const ordered: Depth[] = [
    primary,
    ...order.filter((_, i) => i !== primaryIdx),
  ]
  const results: SpreadRecommendation[] = []
  for (const d of ordered) {
    const rec = pick(d)
    if (rec) results.push(rec)
    if (results.length >= Math.max(1, maxResults)) break
  }
  return results
}

export function getDefaultRecommendation(): SpreadRecommendation | null {
  return pick('normal')
}
