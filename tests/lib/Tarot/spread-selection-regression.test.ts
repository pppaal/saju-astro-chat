import { describe, expect, it } from 'vitest'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { recommendSpreads } from '@/lib/Tarot/tarot-recommend'
import { getQuickRecommendation } from '@/app/tarot/utils/recommendations'

const validSpreadKeys = new Set(
  tarotThemes.flatMap((theme) => theme.spreads.map((spread) => `${theme.id}/${spread.id}`))
)

function expectValidTopRecommendation(question: string) {
  const recommendations = recommendSpreads(question, 3)
  expect(recommendations.length).toBeGreaterThan(0)

  const top = recommendations[0]
  const spreadKey = `${top.themeId}/${top.spreadId}`
  expect(validSpreadKeys.has(spreadKey), `${question} -> ${spreadKey}`).toBe(true)
  expect(top.spread.cardCount).toBeGreaterThan(0)
}

function lcg(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function generateRandomQuestion(rand: () => number): string {
  const tokens = [
    '오늘',
    '내일',
    '이번 주',
    '연애',
    '재회',
    '면접',
    '돈',
    '건강',
    '몸과 마음',
    '균형',
    '회복',
    '이직',
    '시험',
    '여행',
    'A vs B',
    '어떻게',
    'why',
    'how',
    'should I',
    'timing',
    'future',
    '관계',
    '🔥',
    '✨',
    '???',
    '@@@',
    '\n',
  ]

  const length = 2 + Math.floor(rand() * 8)
  const picked: string[] = []
  for (let i = 0; i < length; i++) {
    picked.push(tokens[Math.floor(rand() * tokens.length)])
  }
  return picked.join(rand() > 0.5 ? ' ' : '')
}

describe('tarot spread selection regression', () => {
  it('selects a valid spread for diverse fixed questions', () => {
    const questions = [
      '몸과 마음의 균형을 어떻게 회복할까요?',
      '그 사람 마음이 궁금해',
      '오늘 운동 갈까?',
      '면접 결과 어떨까?',
      '이번 주 운세',
      '돈이 들어올까?',
      'A와 B 중에 뭐가 나을까?',
      '재회 가능할까요?',
      '잠이 너무 안 와요',
      '부모님 건강이 걱정돼요',
      'Should I text them?',
      'How can I recover my mental balance?',
      'what is my future direction',
      '   ???   ',
      'asdf qwer zxcv',
      '💫🔥@@@',
    ]

    for (const question of questions) {
      expectValidTopRecommendation(question)

      const quick = getQuickRecommendation(question, true)
      expect(quick.path.startsWith('/tarot/'), `${question} -> ${quick.path}`).toBe(true)
      expect(quick.cardCount).toBeGreaterThan(0)
      expect(quick.spreadTitle.length).toBeGreaterThan(0)
    }
  })

  it('selects a valid spread for randomized noisy questions (500 cases)', () => {
    const rand = lcg(20260225)

    for (let i = 0; i < 500; i++) {
      const question = generateRandomQuestion(rand)
      expectValidTopRecommendation(question)
    }
  })

  it('still returns safe fallback recommendations for dangerous questions when requested', () => {
    const result = recommendSpreads('죽고 싶어요', 3, { checkDangerous: true })
    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(result.dangerousWarning).toBeDefined()

    const top = result.recommendations[0]
    const spreadKey = `${top.themeId}/${top.spreadId}`
    expect(validSpreadKeys.has(spreadKey)).toBe(true)
  })

  it('quick recommendation does not lock generic questions to past-present-future', () => {
    const quick = getQuickRecommendation('내가 가진 숨은 강점은?', true)
    expect(quick.path).not.toContain('/tarot/general-insight/past-present-future')
    expect(quick.path).toContain('/tarot/')
  })
})
