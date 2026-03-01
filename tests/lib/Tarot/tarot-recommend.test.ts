import {
  recommendSpreads,
  checkDangerousQuestion,
  determineCardCount,
  generateDynamicSpread,
  quickQuestions,
  type SpreadRecommendation,
  type RecommendSpreadsResult,
} from '@/lib/Tarot/tarot-recommend'

describe('tarot-recommend', () => {
  describe('checkDangerousQuestion', () => {
    it('returns isDangerous: false for normal questions', () => {
      const result = checkDangerousQuestion('오늘 운세가 어떨까요?')
      expect(result.isDangerous).toBe(false)
      expect(result.message).toBeUndefined()
    })

    it('detects Korean suicide-related keywords', () => {
      const result = checkDangerousQuestion('죽고 싶어요')
      expect(result.isDangerous).toBe(true)
      expect(result.message).toBeDefined()
      expect(result.messageKo).toBeDefined()
      expect(result.messageKo).toContain('1393')
    })

    it('detects English suicide-related keywords', () => {
      const result = checkDangerousQuestion('I want to end my life')
      expect(result.isDangerous).toBe(true)
      expect(result.message).toBeDefined()
    })

    it('detects self-harm keywords', () => {
      const result = checkDangerousQuestion('자해하고 싶어')
      expect(result.isDangerous).toBe(true)
    })

    it('is case insensitive for English', () => {
      const result = checkDangerousQuestion('I want to KILL MYSELF')
      expect(result.isDangerous).toBe(true)
    })

    it('does not flag similar but safe words', () => {
      const result = checkDangerousQuestion('죽이는 패션 센스')
      expect(result.isDangerous).toBe(false)
    })
  })

  describe('determineCardCount', () => {
    it('returns 1 for daily fortune questions', () => {
      expect(determineCardCount('오늘 운세')).toBe(1)
      expect(determineCardCount('하루 운세')).toBe(1)
      expect(determineCardCount("today's fortune")).toBe(1)
    })

    it('returns 1 for simple/quick requests', () => {
      expect(determineCardCount('간단히 알려줘')).toBe(1)
      expect(determineCardCount('핵심만')).toBe(1)
      expect(determineCardCount('quick answer')).toBe(1)
    })

    it('returns 2 for comparison questions', () => {
      expect(determineCardCount('A vs B')).toBe(2)
      expect(determineCardCount('할까 말까')).toBe(2)
      expect(determineCardCount('이것 저것')).toBe(2)
    })

    it('returns 3 for flow/timeline questions', () => {
      expect(determineCardCount('과거 현재 미래')).toBe(3)
      expect(determineCardCount('흐름을 알고 싶어')).toBe(3)
      expect(determineCardCount('past present future')).toBe(3)
    })

    it('returns 3 for love questions', () => {
      expect(determineCardCount('그 사람이 나를 좋아할까')).toBe(3)
      expect(determineCardCount('면접 결과')).toBe(3)
    })

    it('returns 4 for job change questions', () => {
      // Note: "이직해야 할까요" matches "해야 할까" (2-card) before "이직" (4-card)
      // So we test with patterns that clearly match 4-card first
      expect(determineCardCount('이직을 고민중입니다')).toBe(4)
      expect(determineCardCount('퇴사 후 어떻게 될까요')).toBe(4)
      expect(determineCardCount('그만두면 어떨까요')).toBe(4)
    })

    it('returns 5 for detailed analysis requests', () => {
      expect(determineCardCount('자세히 분석해주세요')).toBe(5)
      expect(determineCardCount('깊게 봐주세요')).toBe(5)
    })

    it('returns 7 for weekly questions', () => {
      expect(determineCardCount('이번 주 운세')).toBe(7)
      expect(determineCardCount('weekly forecast')).toBe(7)
    })

    it('returns 10 for comprehensive life reading', () => {
      expect(determineCardCount('인생 전체를 봐주세요')).toBe(10)
      expect(determineCardCount('켈틱 크로스')).toBe(10)
    })

    it('returns based on question length for unknown patterns', () => {
      expect(determineCardCount('짧은')).toBe(1)
      expect(determineCardCount('이건 좀 더 긴 질문')).toBe(2)
      expect(determineCardCount('이건 조금 더 긴 질문인데 어떻게 될까요')).toBe(3)
    })
  })

  describe('generateDynamicSpread', () => {
    it('generates 1-card spread with correct structure', () => {
      const spread = generateDynamicSpread('오늘', 1)
      expect(spread.cardCount).toBe(1)
      expect(spread.positions).toHaveLength(1)
      expect(spread.positions[0].title).toBe('Answer')
      expect(spread.positions[0].titleKo).toBe('답변')
      expect(spread.layoutType).toBe('horizontal')
    })

    it('generates 2-card spread for comparisons', () => {
      const spread = generateDynamicSpread('A vs B', 2)
      expect(spread.cardCount).toBe(2)
      expect(spread.positions).toHaveLength(2)
      expect(spread.positions[0].title).toBe('Option A')
      expect(spread.positions[1].title).toBe('Option B')
    })

    it('generates 3-card spread with past/present/future', () => {
      const spread = generateDynamicSpread('흐름', 3)
      expect(spread.cardCount).toBe(3)
      expect(spread.positions[0].title).toBe('Past')
      expect(spread.positions[1].title).toBe('Present')
      expect(spread.positions[2].title).toBe('Future')
    })

    it('generates 7-card spread for weekly', () => {
      const spread = generateDynamicSpread('이번 주', 7)
      expect(spread.cardCount).toBe(7)
      expect(spread.positions[0].titleKo).toBe('월요일')
      expect(spread.positions[6].titleKo).toBe('일요일')
    })

    it('generates 10-card Celtic cross spread', () => {
      const spread = generateDynamicSpread('인생', 10)
      expect(spread.cardCount).toBe(10)
      expect(spread.positions).toHaveLength(10)
      expect(spread.layoutType).toBe('cross')
    })

    it('auto-determines card count when not provided', () => {
      const spread = generateDynamicSpread('오늘 하루')
      expect(spread.cardCount).toBe(1)
    })

    it('generates dynamic positions for undefined counts', () => {
      const spread = generateDynamicSpread('질문', 6)
      expect(spread.cardCount).toBe(6)
      expect(spread.positions).toHaveLength(6)
      expect(spread.positions[0].title).toBe('Card 1')
      expect(spread.positions[5].title).toBe('Card 6')
    })
  })

  describe('recommendSpreads', () => {
    it('returns default recommendations for empty question', () => {
      const result = recommendSpreads('')
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns array when called without checkDangerous option', () => {
      const result = recommendSpreads('연애 운세')
      expect(result).toBeInstanceOf(Array)
      expect((result as SpreadRecommendation[])[0]).toHaveProperty('spreadId')
      expect((result as SpreadRecommendation[])[0]).toHaveProperty('theme')
    })

    it('returns RecommendSpreadsResult when checkDangerous is true', () => {
      const result = recommendSpreads('연애 운세', 3, { checkDangerous: true })
      expect(result).toHaveProperty('recommendations')
      expect((result as RecommendSpreadsResult).recommendations).toBeInstanceOf(Array)
    })

    it('returns dangerousWarning for dangerous questions', () => {
      const result = recommendSpreads('죽고 싶어요', 3, { checkDangerous: true })
      expect((result as RecommendSpreadsResult).dangerousWarning).toBeDefined()
      expect((result as RecommendSpreadsResult).dangerousWarning?.messageKo).toContain('1393')
    })

    it('matches love-related keywords to love theme', () => {
      const result = recommendSpreads('그 사람이 나를 좋아할까요') as SpreadRecommendation[]
      const hasLoveTheme = result.some((r) => r.themeId === 'love-relationships')
      expect(hasLoveTheme).toBe(true)
    })

    it('matches career keywords to career theme', () => {
      const result = recommendSpreads('면접 결과가 어떨까요') as SpreadRecommendation[]
      const hasCareerTheme = result.some((r) => r.themeId === 'career-work')
      expect(hasCareerTheme).toBe(true)
    })

    it('matches money keywords to money theme', () => {
      const result = recommendSpreads('돈이 들어올까요') as SpreadRecommendation[]
      const hasMoneyTheme = result.some((r) => r.themeId === 'money-finance')
      expect(hasMoneyTheme).toBe(true)
    })

    it('does not route mind-body recovery questions to crush-feelings', () => {
      const result = recommendSpreads(
        '몸과 마음의 균형을 어떻게 회복할까요?',
        1
      ) as SpreadRecommendation[]
      expect(result[0].themeId).toBe('well-being-health')
      expect(result[0].spreadId).not.toBe('crush-feelings')
    })

    it('still routes clear crush-intent questions to crush-feelings', () => {
      const result = recommendSpreads('그 사람 마음이 궁금해', 1) as SpreadRecommendation[]
      expect(result[0].spreadId).toBe('crush-feelings')
    })

    it('matches daily keywords to daily reading', () => {
      const result = recommendSpreads('오늘 하루') as SpreadRecommendation[]
      const hasDailyTheme = result.some((r) => r.themeId === 'daily-reading')
      expect(hasDailyTheme).toBe(true)
    })

    it('respects maxResults parameter', () => {
      const result = recommendSpreads('연애 운세', 1) as SpreadRecommendation[]
      expect(result.length).toBeLessThanOrEqual(1)
    })

    it('returns unique spreads', () => {
      const result = recommendSpreads('복잡한 연애 커리어 돈 질문', 5) as SpreadRecommendation[]
      const spreadIds = result.map((r) => r.spreadId)
      const uniqueIds = new Set(spreadIds)
      expect(uniqueIds.size).toBe(spreadIds.length)
    })

    it('includes reason and reasonKo in recommendations', () => {
      const result = recommendSpreads('연애 운세') as SpreadRecommendation[]
      expect(result[0].reason).toBeDefined()
      expect(result[0].reasonKo).toBeDefined()
    })

    it('matches reconciliation keywords', () => {
      const result = recommendSpreads('전남친과 재회할 수 있을까') as SpreadRecommendation[]
      const hasReconciliation = result.some(
        (r) => r.spreadId === 'reconciliation' || r.themeId === 'love-relationships'
      )
      expect(hasReconciliation).toBe(true)
    })

    it('matches timing questions', () => {
      const result = recommendSpreads('취업 언제 될까요') as SpreadRecommendation[]
      expect(result.length).toBeGreaterThan(0)
    })

    it('routes binary no-space choice phrasing to two-paths', () => {
      const result = recommendSpreads('A할까B할까') as SpreadRecommendation[]
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].themeId).toBe('decisions-crossroads')
      expect(result[0].spreadId).toBe('two-paths')
    })

    it('handles English questions', () => {
      const result = recommendSpreads('Will I find love soon?') as SpreadRecommendation[]
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('quickQuestions', () => {
    it('has predefined quick questions', () => {
      expect(quickQuestions.length).toBeGreaterThan(0)
    })

    it('each quick question has required properties', () => {
      quickQuestions.forEach((q) => {
        if ('emoji' in q) {
          expect(q.emoji).toBeDefined()
          expect(q.label).toBeDefined()
          expect(q.labelEn).toBeDefined()
          expect(q.question).toBeDefined()
          expect(q.questionEn).toBeDefined()
        }
      })
    })

    it('includes common question types', () => {
      const labels = quickQuestions.filter((q) => 'label' in q).map((q) => q.label)
      expect(labels).toContain('오늘 운세')
    })
  })
})
