// tests/lib/Tarot/promptBuild.golden.test.ts
//
// Golden tests for the tarot interpret-stream prompt builders.
//
// The interpretation itself is LLM-streamed and therefore non-deterministic,
// but the *prompt* sent to the LLM — and the fallback payload used when
// no LLM is reachable — are fully deterministic. These tests lock the
// shape of those deterministic surfaces so a future refactor cannot
// silently degrade answer quality.
//
// What "silent degradation" looks like and is caught here:
//   • The user's question stops appearing verbatim in the prompt.
//   • The drawn-card list goes missing or loses reversed markers.
//   • The card count or spread title drops out of the user prompt.
//   • The JSON schema description disappears from the system prompt.
//   • The KO/EN switch leaks cross-language text into the wrong prompt.
//   • The fallback payload's per-card cardinality breaks (UI relies on it).

import { describe, expect, it } from 'vitest'
import {
  buildChunkUserPrompt,
  buildFallbackPayload,
  buildInterpretStreamPrompts,
  renderCardList,
  type PromptCardInput,
} from '@/lib/tarot/promptBuild'
import { TAROT_RULES_KO, TAROT_RULES_EN } from '@/lib/tarot/promptShared'

const SAMPLE_CARDS: PromptCardInput[] = [
  {
    name: 'The Fool',
    nameKo: '바보',
    isReversed: false,
    keywords: ['Beginnings', 'Innocence', 'Spontaneity'],
    keywordsKo: ['시작', '순수', '자유'],
  },
  {
    name: 'The Tower',
    nameKo: '탑',
    isReversed: true,
    keywords: ['Upheaval', 'Sudden change', 'Revelation'],
    keywordsKo: ['격변', '갑작스러운 변화', '계시'],
  },
  {
    name: 'The Star',
    nameKo: '별',
    isReversed: false,
    keywords: ['Hope', 'Renewal', 'Inspiration'],
    keywordsKo: ['희망', '재생', '영감'],
  },
]

const SAMPLE_QUESTION_KO = '이번 달 안에 이직을 결심해도 될까요?'
const SAMPLE_QUESTION_EN = 'Should I commit to changing jobs this month?'
const SAMPLE_SPREAD = 'Past · Present · Future'

describe('tarot prompt builders — rules constants', () => {
  it('TAROT_RULES_KO carries the question-centric directive', () => {
    expect(TAROT_RULES_KO).toContain('사용자 질문이 중심')
  })

  it('TAROT_RULES_KO defines reversed = blockage/delay/internal/immature/excess', () => {
    expect(TAROT_RULES_KO).toContain('역방향')
    expect(TAROT_RULES_KO).toMatch(/막힘|지연|내면화|미숙함|과잉/)
  })

  it('TAROT_RULES_KO forbids AI/model identity disclosure', () => {
    expect(TAROT_RULES_KO).toMatch(/AI\/모델 정체 노출 금지/)
  })

  it('TAROT_RULES_EN carries the same three invariants', () => {
    expect(TAROT_RULES_EN).toContain("user's question is always the center")
    expect(TAROT_RULES_EN).toMatch(/Reversed = one of blockage \/ delay \/ internalization/)
    expect(TAROT_RULES_EN).toMatch(/Never reveal you're an AI/i)
  })

  it('both rule sets forbid deterministic fate claims', () => {
    expect(TAROT_RULES_KO).toContain('단정하지')
    expect(TAROT_RULES_EN).toMatch(/possibility \/ tendency|not prophecy/)
  })

  it('rules constants do not bleed across languages', () => {
    // English rules must not embed Hangul; Korean rules must contain Hangul.
    expect(TAROT_RULES_EN).not.toMatch(/[가-힯]/)
    expect(TAROT_RULES_KO).toMatch(/[가-힯]/)
  })
})

describe('renderCardList', () => {
  it('emits one numbered line per card', () => {
    const out = renderCardList(SAMPLE_CARDS, 'ko')
    expect(out.split('\n')).toHaveLength(SAMPLE_CARDS.length)
    expect(out).toMatch(/^1\. /)
    expect(out).toMatch(/\n2\. /)
    expect(out).toMatch(/\n3\. /)
  })

  it('renders reversed markers in Korean mode', () => {
    const out = renderCardList(SAMPLE_CARDS, 'ko')
    expect(out).toMatch(/탑.*\(역방향\)/)
    expect(out).not.toMatch(/바보.*\(역방향\)/)
  })

  it('renders reversed markers in English mode', () => {
    const out = renderCardList(SAMPLE_CARDS, 'en')
    expect(out).toMatch(/Tower.*\(reversed\)/)
    expect(out).not.toMatch(/Fool.*\(reversed\)/)
  })

  it('caps keyword list to 3 hints', () => {
    const overflow: PromptCardInput[] = [
      {
        name: 'X',
        isReversed: false,
        keywords: ['a', 'b', 'c', 'd', 'e'],
      },
    ]
    const out = renderCardList(overflow, 'en')
    expect(out).toContain('a, b, c')
    expect(out).not.toContain('a, b, c, d')
  })

  it('omits the keyword tail when no keywords are provided', () => {
    const noKw: PromptCardInput[] = [{ name: 'X', isReversed: false }]
    expect(renderCardList(noKw, 'en')).toBe('1. X')
  })
})

describe('buildInterpretStreamPrompts — Korean', () => {
  const built = buildInterpretStreamPrompts({
    language: 'ko',
    spreadTitle: SAMPLE_SPREAD,
    cards: SAMPLE_CARDS,
    userQuestion: SAMPLE_QUESTION_KO,
  })

  it('embeds TAROT_RULES_KO at the head of the system prompt', () => {
    expect(built.systemPrompt.startsWith(TAROT_RULES_KO)).toBe(true)
  })

  it('declares the JSON output schema in the system prompt', () => {
    expect(built.systemPrompt).toContain('"overall"')
    expect(built.systemPrompt).toContain('"cards"')
    expect(built.systemPrompt).toContain('"advice"')
    expect(built.systemPrompt).toContain('"position"')
    expect(built.systemPrompt).toContain('"interpretation"')
  })

  it('quotes the user question verbatim in the user prompt', () => {
    expect(built.userPrompt).toContain(`"${SAMPLE_QUESTION_KO}"`)
  })

  it('mentions every drawn card name in the user prompt', () => {
    for (const card of SAMPLE_CARDS) {
      const expected = card.nameKo ?? card.name
      expect(built.userPrompt).toContain(expected)
    }
  })

  it('repeats the card count consistently in the user prompt', () => {
    const count = SAMPLE_CARDS.length
    expect(built.userPrompt).toContain(`(${count}장)`)
    expect(built.userPrompt).toContain(`모든 ${count}장의 카드`)
  })

  it('reproduces the spread title once', () => {
    const occurrences = built.userPrompt.split(SAMPLE_SPREAD).length - 1
    expect(occurrences).toBe(1)
  })

  it('uses Korean-only chrome (no English instruction headers)', () => {
    expect(built.userPrompt).not.toContain("# User's Question")
    expect(built.userPrompt).not.toContain('# Instructions')
    expect(built.systemPrompt).not.toContain('Naming each position')
  })

  it('falls back to "일반 운세" when the user question is blank', () => {
    const blank = buildInterpretStreamPrompts({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: '   ',
    })
    expect(blank.userPrompt).toContain('"일반 운세"')
  })

  it('is byte-for-byte deterministic across repeated calls', () => {
    const a = buildInterpretStreamPrompts({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: SAMPLE_QUESTION_KO,
    })
    const b = buildInterpretStreamPrompts({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: SAMPLE_QUESTION_KO,
    })
    expect(a.systemPrompt).toBe(b.systemPrompt)
    expect(a.userPrompt).toBe(b.userPrompt)
  })
})

describe('buildInterpretStreamPrompts — English', () => {
  const built = buildInterpretStreamPrompts({
    language: 'en',
    spreadTitle: SAMPLE_SPREAD,
    cards: SAMPLE_CARDS,
    userQuestion: SAMPLE_QUESTION_EN,
  })

  it('embeds TAROT_RULES_EN at the head of the system prompt', () => {
    expect(built.systemPrompt.startsWith(TAROT_RULES_EN)).toBe(true)
  })

  it('quotes the question and embeds all card names', () => {
    expect(built.userPrompt).toContain(`"${SAMPLE_QUESTION_EN}"`)
    for (const card of SAMPLE_CARDS) {
      expect(built.userPrompt).toContain(card.name)
    }
  })

  it('uses English chrome only', () => {
    expect(built.userPrompt).toContain("# User's Question")
    expect(built.userPrompt).toContain('# Instructions')
    expect(built.userPrompt).not.toContain('# 사용자의 질문')
    expect(built.systemPrompt).not.toContain('자리(position) 명명')
  })

  it('falls back to "general reading" when the user question is blank', () => {
    const blank = buildInterpretStreamPrompts({
      language: 'en',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: '',
    })
    expect(blank.userPrompt).toContain('"general reading"')
  })
})

describe('buildInterpretStreamPrompts — schema directives', () => {
  it('KO schema asks for a relative time anchor and a decision lean', () => {
    const built = buildInterpretStreamPrompts({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: SAMPLE_QUESTION_KO,
    })
    expect(built.systemPrompt).toContain('상대 시점 앵커')
    expect(built.systemPrompt).toContain('기울기')
  })

  it('EN schema asks for a relative time anchor and a decision lean', () => {
    const built = buildInterpretStreamPrompts({
      language: 'en',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: SAMPLE_QUESTION_EN,
    })
    expect(built.systemPrompt).toContain('relative time anchor')
    expect(built.systemPrompt).toMatch(/state your lean/)
  })
})

describe('buildInterpretStreamPrompts — blank question opening', () => {
  it('KO: blank question opens with the general flow, not a forced question reference', () => {
    const blank = buildInterpretStreamPrompts({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: '   ',
    })
    expect(blank.userPrompt).toContain('전반적인 운세 흐름으로 자연스럽게 시작')
    expect(blank.userPrompt).not.toContain('사용자의 질문을 직접 언급하면서 시작')
    expect(blank.systemPrompt).toContain('첫 문장은 전반적인 운세 흐름으로 자연스럽게 시작')
  })

  it('KO: a real question keeps the question-reference opening', () => {
    const withQ = buildInterpretStreamPrompts({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: SAMPLE_QUESTION_KO,
    })
    expect(withQ.userPrompt).toContain('사용자의 질문을 직접 언급하면서 시작')
    expect(withQ.userPrompt).not.toContain('전반적인 운세 흐름으로 자연스럽게 시작')
  })

  it('EN: blank question opens with the general flow', () => {
    const blank = buildInterpretStreamPrompts({
      language: 'en',
      spreadTitle: SAMPLE_SPREAD,
      cards: SAMPLE_CARDS,
      userQuestion: '',
    })
    expect(blank.userPrompt).toContain('open overall with the overall flow naturally')
    expect(blank.userPrompt).not.toContain("must reference the user's question directly")
  })
})

describe('buildChunkUserPrompt — large spread chunks', () => {
  const cards: PromptCardInput[] = Array.from({ length: 10 }, (_, i) => ({
    name: `Card ${i + 1}`,
    nameKo: `${i + 1}번 카드`,
    isReversed: i % 3 === 0,
  }))

  it('chunk A (includeMeta=true) asks for overall + advice + first-half cards', () => {
    const text = buildChunkUserPrompt({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards,
      userQuestion: SAMPLE_QUESTION_KO,
      startIdx: 0,
      endIdx: 5,
      includeMeta: true,
    })
    expect(text).toContain('overall + advice')
    expect(text).toContain('(전체 10장 중 1~5번 카드만 해석)')
    expect(text).toContain('cards 배열 길이 정확히 5 개')
  })

  it('chunk B (includeMeta=false) explicitly suppresses overall/advice', () => {
    const text = buildChunkUserPrompt({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards,
      userQuestion: SAMPLE_QUESTION_KO,
      startIdx: 5,
      endIdx: 10,
      includeMeta: false,
    })
    expect(text).toContain('overall/advice 는 출력하지 마세요')
    expect(text).toContain('(전체 10장 중 6~10번 카드만 해석)')
    expect(text).toContain('cards 배열 길이 정확히 5 개')
  })

  it('the English variant mirrors the Korean wording switch', () => {
    const a = buildChunkUserPrompt({
      language: 'en',
      spreadTitle: SAMPLE_SPREAD,
      cards,
      userQuestion: SAMPLE_QUESTION_EN,
      startIdx: 0,
      endIdx: 5,
      includeMeta: true,
    })
    expect(a).toContain('write overall + advice')
    expect(a).toContain('cards 1-5 of 10')

    const b = buildChunkUserPrompt({
      language: 'en',
      spreadTitle: SAMPLE_SPREAD,
      cards,
      userQuestion: SAMPLE_QUESTION_EN,
      startIdx: 5,
      endIdx: 10,
      includeMeta: false,
    })
    expect(b).toContain('Do NOT include overall/advice')
    expect(b).toContain('cards 6-10 of 10')
  })

  it('includes the full card list in both chunks (context anchor)', () => {
    const a = buildChunkUserPrompt({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards,
      userQuestion: SAMPLE_QUESTION_KO,
      startIdx: 0,
      endIdx: 5,
      includeMeta: true,
    })
    const b = buildChunkUserPrompt({
      language: 'ko',
      spreadTitle: SAMPLE_SPREAD,
      cards,
      userQuestion: SAMPLE_QUESTION_KO,
      startIdx: 5,
      endIdx: 10,
      includeMeta: false,
    })
    for (const card of cards) {
      expect(a).toContain(card.nameKo!)
      expect(b).toContain(card.nameKo!)
    }
  })
})

describe('buildFallbackPayload', () => {
  it('emits one cards[] entry per drawn card (Korean)', () => {
    const fb = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    expect(fb.cards).toHaveLength(SAMPLE_CARDS.length)
  })

  it('every entry has a non-empty position and interpretation', () => {
    const fb = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    for (const entry of fb.cards) {
      expect(entry.position.length).toBeGreaterThan(0)
      expect(entry.interpretation.length).toBeGreaterThan(10)
    }
  })

  it('overall and advice are non-empty strings in both languages', () => {
    const ko = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    const en = buildFallbackPayload(SAMPLE_CARDS, 'en')
    expect(ko.overall.length).toBeGreaterThan(0)
    expect(ko.advice.length).toBeGreaterThan(0)
    expect(en.overall.length).toBeGreaterThan(0)
    expect(en.advice.length).toBeGreaterThan(0)
  })

  it('marks reversed vs upright orientation in the per-card interpretation', () => {
    const fb = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    expect(fb.cards[0].interpretation).toContain('정방향')
    expect(fb.cards[1].interpretation).toContain('역방향')
    const en = buildFallbackPayload(SAMPLE_CARDS, 'en')
    expect(en.cards[0].interpretation).toContain('upright')
    expect(en.cards[1].interpretation).toContain('reversed')
  })

  it('uses Korean names when language=ko and falls back to English when missing', () => {
    const fb = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    expect(fb.cards[0].interpretation).toContain('바보')
    const missingKo: PromptCardInput[] = [{ name: 'The Hermit', isReversed: false }]
    const fb2 = buildFallbackPayload(missingKo, 'ko')
    expect(fb2.cards[0].interpretation).toContain('The Hermit')
  })

  it('is byte-for-byte deterministic for the same input', () => {
    const a = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    const b = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('Korean fallback contains no English sentences in the body', () => {
    const fb = buildFallbackPayload(SAMPLE_CARDS, 'ko')
    expect(fb.overall).not.toMatch(/[a-z]{4,}/i)
    expect(fb.advice).not.toMatch(/[a-z]{4,}/i)
  })

  it('English fallback contains no Hangul in the body', () => {
    const fb = buildFallbackPayload(SAMPLE_CARDS, 'en')
    expect(fb.overall).not.toMatch(/[가-힯]/)
    expect(fb.advice).not.toMatch(/[가-힯]/)
  })
})
