import { describe, expect, it } from 'vitest'
import { composeTarotFallbackReply, type TarotFallbackContext } from '@/lib/Tarot/fallbackReply'
import { evaluateTarotFallbackQuality } from '@/lib/Tarot/fallbackQuality'

type GoldenCase = {
  id: string
  language: 'ko' | 'en'
  question: string
  context: TarotFallbackContext
  minScore: number
}

const EN_CONTEXT: TarotFallbackContext = {
  spread_title: 'Three Card Spread',
  category: 'general',
  cards: [
    {
      position: 'Present',
      name: 'The Magician',
      is_reversed: false,
      meaning: 'Use your current resources with focus and clear intent.',
      keywords: ['focus', 'skill'],
    },
    {
      position: 'Near Future',
      name: 'The Star',
      is_reversed: false,
      meaning: 'Recovery and direction get stronger when you keep a steady pace.',
      keywords: ['hope', 'healing'],
    },
  ],
  overall_message: 'You are in a rebuilding phase with strong recovery momentum.',
  guidance: 'Prioritize one clear action and review outcomes weekly.',
}

const KO_CONTEXT: TarotFallbackContext = {
  spread_title: '세 장 스프레드',
  category: 'general',
  cards: [
    {
      position: '현재',
      name: 'The Chariot',
      is_reversed: false,
      meaning: '속도를 조절하면서 방향을 잃지 않는 것이 핵심입니다.',
      keywords: ['통제', '전진'],
    },
    {
      position: '가까운 미래',
      name: 'Strength',
      is_reversed: false,
      meaning: '감정 기복을 다루는 힘이 성과 차이를 만듭니다.',
      keywords: ['인내', '균형'],
    },
  ],
  overall_message: '지금은 무리한 확장보다 안정적인 전진이 유리합니다.',
  guidance: '이번 주는 하나의 우선순위에 집중하세요.',
}

const cases: GoldenCase[] = [
  {
    id: 'en-general-long-question',
    language: 'en',
    question:
      'I asked a very long question because I am confused about many things at once. Can I get practical guidance for this week?',
    context: EN_CONTEXT,
    minScore: 85,
  },
  {
    id: 'en-love',
    language: 'en',
    question: 'How should I approach this relationship without repeating old patterns?',
    context: EN_CONTEXT,
    minScore: 85,
  },
  {
    id: 'en-career',
    language: 'en',
    question: 'I have an interview and I am worried about career direction. What should I do first?',
    context: EN_CONTEXT,
    minScore: 85,
  },
  {
    id: 'en-more-cards',
    language: 'en',
    question: 'Can you draw more cards for me right now?',
    context: EN_CONTEXT,
    minScore: 80,
  },
  {
    id: 'ko-general',
    language: 'ko',
    question: '지금 너무 복잡한데 이번 주에 무엇부터 해야 할지 알려줘.',
    context: KO_CONTEXT,
    minScore: 85,
  },
  {
    id: 'ko-love',
    language: 'ko',
    question: '연애에서 같은 패턴이 반복돼요. 어디부터 바꿔야 할까요?',
    context: KO_CONTEXT,
    minScore: 85,
  },
  {
    id: 'ko-career',
    language: 'ko',
    question: '직장 문제로 고민이 큰데 이번 주 행동 우선순위를 정해줘.',
    context: KO_CONTEXT,
    minScore: 85,
  },
  {
    id: 'ko-more-cards',
    language: 'ko',
    question: '추가 카드 더 뽑아줄 수 있어?',
    context: KO_CONTEXT,
    minScore: 80,
  },
]

describe('tarot fallback quality golden set', () => {
  it('keeps deterministic quality above floor for key user scenarios', () => {
    for (const item of cases) {
      const reply = composeTarotFallbackReply({
        messages: [{ role: 'user', content: item.question }],
        context: item.context,
        language: item.language,
      })

      const quality = evaluateTarotFallbackQuality({
        reply,
        context: item.context,
        language: item.language,
      })

      expect(quality.overallScore, `${item.id} overall`).toBeGreaterThanOrEqual(item.minScore)
      expect(quality.cardGroundingScore, `${item.id} grounding`).toBeGreaterThanOrEqual(80)
      expect(quality.actionabilityScore, `${item.id} actionability`).toBeGreaterThanOrEqual(80)
    }
  })

  it('always includes explicit follow-up question for continuity', () => {
    for (const item of cases) {
      const reply = composeTarotFallbackReply({
        messages: [{ role: 'user', content: item.question }],
        context: item.context,
        language: item.language,
      })

      expect(reply.includes('?'), `${item.id} follow-up`).toBe(true)
      if (item.language === 'ko') {
        expect(reply).toContain('다음 질문')
      } else {
        expect(reply).toContain('Next question')
      }
    }
  })
})
