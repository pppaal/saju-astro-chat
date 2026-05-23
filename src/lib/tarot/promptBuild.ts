// src/lib/tarot/promptBuild.ts
//
// Pure builders for the tarot interpret-stream route. Extracted from the
// route handler so the prompt shape can be locked by golden tests — any
// silent drift in the system/user prompt or the fallback payload now
// fails a deterministic assertion instead of degrading LLM answers in
// production.
//
// No I/O, no LLM calls. Same inputs → same outputs.

import { TAROT_RULES_KO, TAROT_RULES_EN } from './promptShared'

export interface PromptCardInput {
  name: string
  nameKo?: string
  isReversed: boolean
  keywords?: string[]
  keywordsKo?: string[]
  positionKo?: string
  position?: string
}

export interface InterpretStreamPromptInput {
  language: 'ko' | 'en'
  spreadTitle: string
  cards: PromptCardInput[]
  userQuestion: string
}

export interface InterpretStreamPrompts {
  systemPrompt: string
  userPrompt: string
}

/**
 * Card list rendered for the user prompt. One numbered line per card.
 * KO/EN switching mirrors what the LLM sees.
 */
export function renderCardList(cards: PromptCardInput[], language: 'ko' | 'en'): string {
  const isKorean = language === 'ko'
  return cards
    .map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
      const kw = keywords.slice(0, 3).join(', ')
      return `${i + 1}. ${name}${c.isReversed ? (isKorean ? '(역방향)' : '(reversed)') : ''}${
        kw ? ` - ${kw}` : ''
      }`
    })
    .join('\n')
}

/**
 * The {system, user} pair sent to Claude for `/api/tarot/interpret-stream`.
 * Both halves are derived deterministically from the input.
 */
export function buildInterpretStreamPrompts(
  input: InterpretStreamPromptInput
): InterpretStreamPrompts {
  const { language, spreadTitle, cards, userQuestion } = input
  const isKorean = language === 'ko'
  const trimmed = (userQuestion || '').trim()
  const q = trimmed || (isKorean ? '일반 운세' : 'general reading')
  const hasQuestion = trimmed.length > 0
  const cardListText = renderCardList(cards, language)

  // 질문이 없으면(일반 운세) "첫 문장에 질문 직접 언급" 지시가 어색해지므로
  // 전반적 흐름으로 시작하도록 분기. 질문이 있을 때 문구는 기존과 동일.
  const overallDirectiveKo = hasQuestion
    ? '오프닝 + 시너지, 400-600자, 첫 문장에 사용자 질문 직접 언급'
    : '오프닝 + 시너지, 400-600자, 첫 문장은 전반적인 운세 흐름으로 자연스럽게 시작'
  const overallDirectiveEn = hasQuestion
    ? 'Opening + synergy, 250-350 words, first sentence references the question'
    : 'Opening + synergy, 250-350 words, open with the overall flow naturally'
  const openingInstructionKo = hasQuestion
    ? '- overall 의 첫 문장은 사용자의 질문을 직접 언급하면서 시작.'
    : '- 특정 질문이 없으니 overall 첫 문장은 전반적인 운세 흐름으로 자연스럽게 시작하세요 (억지로 질문을 언급하지 말 것).'
  const openingInstructionEn = hasQuestion
    ? "- The first sentence of overall must reference the user's question directly."
    : '- No specific question was asked; open overall with the overall flow naturally (do not force a question reference).'

  const systemPrompt = isKorean
    ? `${TAROT_RULES_KO}

자리(position)와 순서 — 가장 중요:
- 카드는 뽑힌 순서대로 각자 *서로 다른 역할(자리)* 을 맡습니다. 1번→2번→3번… 으로 이야기가 단계적으로 이어져야 하고, 모든 카드가 같은 질문을 반복해 답하면 안 됩니다.
- 각 자리 이름은 그 카드의 *순서상 역할 + 질문 맥락* 에 맞게 네가 직접 한국어 짧은 라벨로 명명 (2-6자, 자리마다 초점이 분명히 다르게, 중복 절대 금지). 예: 지금 마음 → 상대 반응 → 다가올 흐름.
- 사전식 "과거·현재·미래" 같은 뻔한 라벨보다 질문에 밀착된 표현을 쓰되, 자리별 관점은 반드시 구분되게.
- 각 카드 해석은 *그 자리에서만* 본 관점으로 쓰고, 앞 카드와 내용이 겹치지 않게 하세요.

출력 — 정확히 이 JSON 스키마 (코드펜스/주석/머리말 X):
{
  "overall": "${overallDirectiveKo}. 개별 카드 요약 나열이 아니라 모든 카드를 하나로 묶어 전체가 그리는 큰 흐름을 종합",
  "cards": [
    { "position": "자리명(네가 명명)", "interpretation": "자리 × 카드 × 정/역 × 질문 4중 cross, 그 자리 고유 관점으로 300-500자, 상대 시점 앵커 포함(예: 2-3주 내·다음 달)" }
  ],
  "advice": "위 카드 전체를 종합한 뒤 내리는 결론적 조언. 구체 행동 1-3개, 150-200자. 결정형 질문(예/아니오·선택)이면 첫 문장에 기울기를 분명히(예: 지금은 유보를 권해요)"
}`
    : `${TAROT_RULES_EN}

Positions and order — most important:
- Each card, in the order drawn, holds a *distinct role (seat)*. The story must progress card 1 → 2 → 3 …; do NOT have every card re-answer the same question.
- Name each seat yourself in short English (2-4 words) from its *order-role + the question* (each seat clearly different in focus, no duplicates). e.g. "My feelings" → "Their response" → "Where it heads".
- Prefer question-specific labels over generic "Past"/"Present"/"Future", but the seats must be clearly distinct.
- Interpret each card *only from its own seat's vantage*, without overlapping the previous card.

Output — exactly this JSON schema (no code fences, no preamble, no comments):
{
  "overall": "${overallDirectiveEn}. Synthesize ALL cards into one big-picture flow, not a list of per-card summaries",
  "cards": [
    { "position": "seat name you named", "interpretation": "seat × card × orientation × question cross, from that seat's own vantage, 180-280 words, with a relative time anchor (e.g. next 2-3 weeks)" }
  ],
  "advice": "Conclusion drawn after weighing ALL cards together. 1-3 concrete actions, 90-130 words. For a yes/no or choice question, state your lean in the first sentence (e.g. lean toward waiting for now)"
}`

  const userPrompt = isKorean
    ? `# 사용자의 질문
"${q}"

# 스프레드
${spreadTitle} (${cards.length}장)

# 뽑힌 카드 (순서대로)
${cardListText}

# 작성 지시
- 모든 ${cards.length}장의 카드에 대해 cards[] 항목을 만들되, 뽑힌 *순서대로* 각각 다른 자리(역할)로 해석하세요 (1번→2번→… 단계적 흐름).
- 각 카드의 position 은 그 순서상 역할 + 질문 맥락에 맞춰 *네가 직접* 한국어 짧은 라벨로 명명 (2-6자, 자리마다 초점이 다르게, 중복 금지).
- 각 카드는 *그 자리만의 관점* 으로 해석하고, 앞 카드와 내용이 겹치거나 같은 질문을 반복해 답하지 마세요. 사전식 정의 금지.
- overall 은 카드 전체를 하나로 묶은 종합, advice 는 카드 전체를 본 뒤의 결론으로 작성하세요.
${openingInstructionKo}`
    : `# User's Question
"${q}"

# Spread
${spreadTitle} (${cards.length} cards)

# Cards Drawn (in order)
${cardListText}

# Instructions
- Produce cards[] entries for all ${cards.length} cards, interpreting each by its *draw order* as a distinct seat (a step-by-step progression 1 → 2 → …).
- Name each card's position yourself, in short English (2-4 words), from its order-role + the user's question. Each seat distinct in focus, no duplicates.
- Interpret each card *only from its own seat's vantage*; do not overlap the previous card or re-answer the same question. No textbook definitions.
- Write overall as a synthesis of ALL cards, and advice as the conclusion after weighing all cards.
${openingInstructionEn}`

  return { systemPrompt, userPrompt }
}

export interface ChunkUserPromptInput extends InterpretStreamPromptInput {
  startIdx: number
  endIdx: number
  includeMeta: boolean
}

/**
 * Large-spread (>=8 cards) chunk variant. Chunk A carries overall + advice,
 * chunk B is per-card only. Same system prompt, different user prompt.
 */
export function buildChunkUserPrompt(input: ChunkUserPromptInput): string {
  const { language, spreadTitle, cards, userQuestion, startIdx, endIdx, includeMeta } = input
  const isKorean = language === 'ko'
  const trimmed = (userQuestion || '').trim()
  const q = trimmed || (isKorean ? '일반 운세' : 'general reading')
  const cardListText = renderCardList(cards, language)
  const totalCards = cards.length

  const chunkInfo = isKorean
    ? `(전체 ${totalCards}장 중 ${startIdx + 1}~${endIdx}번 카드만 해석)`
    : `(interpret only cards ${startIdx + 1}-${endIdx} of ${totalCards})`
  const task = includeMeta
    ? isKorean
      ? `# 작성 지시\n- 전체 카드 흐름을 보고 overall + advice 작성하고, ${chunkInfo} 의 카드별 cards[] 항목을 채우세요.\n- cards 배열 길이 정확히 ${endIdx - startIdx} 개.`
      : `# Instructions\n- Read the full ${totalCards}-card flow; write overall + advice, fill cards[] with per-card interpretations ${chunkInfo}.\n- cards[] length must be exactly ${endIdx - startIdx}.`
    : isKorean
      ? `# 작성 지시\n- 전체 카드 흐름은 컨텍스트로만 참고. ${chunkInfo} 의 카드별 해석만 cards[] 에 채우세요. overall/advice 는 출력하지 마세요.\n- cards 배열 길이 정확히 ${endIdx - startIdx} 개.`
      : `# Instructions\n- Use the full ${totalCards}-card flow as context only. Output ONLY per-card interpretations ${chunkInfo} in cards[]. Do NOT include overall/advice.\n- cards[] length must be exactly ${endIdx - startIdx}.`

  if (isKorean) {
    return `# 사용자의 질문\n"${q}"\n\n# 스프레드\n${spreadTitle} (${totalCards}장)\n\n# 뽑힌 카드 — 전체 (순서대로)\n${cardListText}\n\n${task}`
  }
  return `# User's Question\n"${q}"\n\n# Spread\n${spreadTitle} (${totalCards} cards)\n\n# Cards Drawn — full list (in order)\n${cardListText}\n\n${task}`
}

export interface FallbackPayloadCard {
  position: string
  interpretation: string
}

export interface FallbackPayload {
  overall: string
  cards: FallbackPayloadCard[]
  advice: string
}

/**
 * Deterministic fallback when both LLM providers are unavailable. Every
 * drawn card still gets a per-card line so the UI never breaks.
 */
export function buildFallbackPayload(
  cards: PromptCardInput[],
  language: 'ko' | 'en'
): FallbackPayload {
  const isKorean = language === 'ko'
  const overall = isKorean
    ? '카드에서 전해지는 핵심 메시지를 정리했습니다.'
    : 'Here is the core message the cards are pointing to.'
  const advice = isKorean
    ? '오늘 할 수 있는 작은 행동부터 시작해 보세요.'
    : 'Start with one small, concrete step you can take today.'

  const cardsPayload = cards.map((card, index) => {
    const position =
      (isKorean && card.positionKo ? card.positionKo : card.position) || `Card ${index + 1}`
    const name = (isKorean && card.nameKo ? card.nameKo : card.name) || `Card ${index + 1}`
    const orientation = card.isReversed
      ? isKorean
        ? '역방향'
        : 'reversed'
      : isKorean
        ? '정방향'
        : 'upright'
    const interpretation = isKorean
      ? `${name} (${orientation}) 카드는 현재 상황에서 중요한 포인트를 짚어 줍니다.`
      : `${name} (${orientation}) highlights a key point in your current situation.`
    return { position, interpretation }
  })

  return { overall, cards: cardsPayload, advice }
}
