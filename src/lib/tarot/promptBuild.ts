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

자리(position) 명명:
- 카드 자리 이름은 사용자 질문 맥락에 맞게 *네가 직접* 한국어 짧은 라벨로 명명 (예: 내 마음, 상대 마음, 막힘, 다음 행동, 가까운 결말).
- 라벨 길이는 2-6자, 중복 금지, 사전적·일반 용어("과거"·"현재"·"미래") 보다 질문에 *밀착된 표현* 우선.
- 카드 순서대로 흐름이 자연스럽게 이어지게.

출력 — 정확히 이 JSON 스키마 (코드펜스/주석/머리말 X):
{
  "overall": "${overallDirectiveKo}",
  "cards": [
    { "position": "자리명(네가 명명)", "interpretation": "자리 × 카드 × 정/역 × 질문 4중 cross, 300-500자, 상대 시점 앵커 포함(예: 2-3주 내·다음 달)" }
  ],
  "advice": "구체 행동 1-3개, 150-200자. 결정형 질문(예/아니오·선택)이면 첫 문장에 기울기를 분명히(예: 지금은 유보를 권해요)"
}`
    : `${TAROT_RULES_EN}

Naming each position:
- Name each seat yourself in short English (2-4 words) based on the user's question (e.g. "My feelings", "Their feelings", "What's blocking", "Next move", "Likely outcome").
- No duplicates, prefer question-specific labels over generic "Past"/"Present"/"Future".
- The positions should flow naturally in the order the cards were drawn.

Output — exactly this JSON schema (no code fences, no preamble, no comments):
{
  "overall": "${overallDirectiveEn}",
  "cards": [
    { "position": "seat name you named", "interpretation": "seat × card × orientation × question cross, 180-280 words, with a relative time anchor (e.g. next 2-3 weeks)" }
  ],
  "advice": "1-3 concrete actions, 90-130 words. For a yes/no or choice question, state your lean in the first sentence (e.g. lean toward waiting for now)"
}`

  const userPrompt = isKorean
    ? `# 사용자의 질문
"${q}"

# 스프레드
${spreadTitle} (${cards.length}장)

# 뽑힌 카드 (순서대로)
${cardListText}

# 작성 지시
- 모든 ${cards.length}장의 카드에 대해 cards[] 항목을 만드세요.
- 각 카드의 position 은 사용자 질문 맥락에 맞춰 *네가 직접* 한국어 짧은 라벨로 명명 (2-6자, 중복 금지).
- 각 카드는 위 질문 맥락 안에서 해석합니다. 카드를 보고 사전식 정의를 쓰지 마세요.
${openingInstructionKo}`
    : `# User's Question
"${q}"

# Spread
${spreadTitle} (${cards.length} cards)

# Cards Drawn (in order)
${cardListText}

# Instructions
- Produce cards[] entries for all ${cards.length} cards.
- Name each card's position yourself, in short English (2-4 words), grounded in the user's question. No duplicates.
- Interpret each card *inside the user's question above*. No textbook definitions.
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
