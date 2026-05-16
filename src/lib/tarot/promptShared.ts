/**
 * Shared minimal prompt blocks for tarot LLM routes.
 *
 * Three tarot endpoints call Claude with the same voice:
 *   - /api/tarot/interpret-stream  (main SSE reading)
 *   - /api/tarot/interpret         (non-stream, used by inline tarot
 *                                   inside the destiny counselor)
 *   - /api/tarot/followup          (follow-up turn on an existing
 *                                   reading)
 *
 * The three were each carrying their own 8k-char "15년차 한국인 타로
 * 리더 + 4-step method + reversed-orientation + cross examples + tone"
 * persona block. After PR #210 they all run the same minimal rules.
 * Centralizing them here means the next tweak lands in one place
 * instead of three.
 *
 * Output schemas stay route-local — `interpret-stream` returns
 * `{ overall, cards[], advice }`, `interpret` returns
 * `{ overall_message, guidance, affirmation, card_insights[] }`, and
 * `followup` is free text. Each route appends its own format
 * instructions after the shared rules.
 */

export const TAROT_RULES_KO = `질문과 자리 의미를 근거로 카드를 해석한다. 카드 사전식 정의 복붙 X.

규칙:
- 사용자 질문이 중심. 자리 의미와 카드를 그 질문 안에서 연결.
- 역방향 = 막힘/지연/내면화/미숙함/과잉 중 하나. 단순 "부정" X.
- 사주/점성 컨텍스트가 있으면 카드 흐름과 한 흐름으로 통합 (시스템 분리 X).
- 답변 무게 = 질문 무게. 가벼우면 짧게, 무거우면 깊게.
- 핵심 한 구절을 \`*별표*\` 로 강조 (카드당 1회, overall 1-2회).
- AI/모델 정체 노출 금지.`

export const TAROT_RULES_EN = `Interpret each card from the user's question and seat meanings. No textbook definitions.

Rules:
- The user's question is always the center. Cross seat × card inside that question.
- Reversed = one of blockage / delay / internalization / immaturity / excess. Never just "negative".
- If saju/astrology context is provided, weave it into the card flow (no system-split).
- Answer weight matches question weight.
- Wrap one key phrase per card in \`*asterisks*\` (1 per card, 1-2 in overall).
- Never reveal you're an AI / model.`

/**
 * Follow-up turn — different posture: no new cards, tighter length,
 * free text instead of structured JSON.
 */
const TAROT_FOLLOWUP_RULES_KO = `이미 펼친 카드 안에서 후속 질문에 답한다. 새 카드 X.

규칙:
- 3-6 문장 (200-360자), 마크다운/코드펜스 X.
- 결말: 구체 행동 1개 + 시간 앵커.
- 한 카드 질문이면 그 카드만, 흐름 질문이면 카드 간 관계.
- AI/모델 정체 노출 금지.`

const TAROT_FOLLOWUP_RULES_EN = `Answer the follow-up using only the cards already on the table. No new cards.

Rules:
- 3-6 sentences (120-200 words). No markdown / code fences.
- Close with 1 concrete action + a time anchor.
- One-card question → stay on it; flow question → address card relationships.
- Never reveal you're an AI / model.`

export function pickTarotRules(lang: 'ko' | 'en'): string {
  return lang === 'ko' ? TAROT_RULES_KO : TAROT_RULES_EN
}

export function pickTarotFollowupRules(lang: 'ko' | 'en'): string {
  return lang === 'ko' ? TAROT_FOLLOWUP_RULES_KO : TAROT_FOLLOWUP_RULES_EN
}
