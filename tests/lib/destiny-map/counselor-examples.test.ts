import { describe, it, expect } from 'vitest'
import { counselorExamples, buildFewShotPrompt } from '@/lib/destiny-map/counselor-examples'

describe('Counselor Examples', () => {
  describe('counselorExamples data structure', () => {
    it('should have both ko and en examples', () => {
      expect(counselorExamples).toHaveProperty('ko')
      expect(counselorExamples).toHaveProperty('en')
    })

    it('should have ko examples as an array', () => {
      expect(Array.isArray(counselorExamples.ko)).toBe(true)
    })

    it('should have en examples as an array', () => {
      expect(Array.isArray(counselorExamples.en)).toBe(true)
    })

    it('should have at least one ko example', () => {
      expect(counselorExamples.ko.length).toBeGreaterThan(0)
    })

    it('should have at least one en example', () => {
      expect(counselorExamples.en.length).toBeGreaterThan(0)
    })

    it('should have multiple ko examples', () => {
      expect(counselorExamples.ko.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Korean examples structure', () => {
    it('should have question and answer in each example', () => {
      counselorExamples.ko.forEach((example) => {
        expect(example).toHaveProperty('question')
        expect(example).toHaveProperty('answer')
      })
    })

    it('should have non-empty questions', () => {
      counselorExamples.ko.forEach((example) => {
        expect(example.question.length).toBeGreaterThan(0)
      })
    })

    it('should have non-empty answers', () => {
      counselorExamples.ko.forEach((example) => {
        expect(example.answer.length).toBeGreaterThan(0)
      })
    })

    it('should have detailed answers (at least 100 characters)', () => {
      counselorExamples.ko.forEach((example) => {
        expect(example.answer.length).toBeGreaterThan(100)
      })
    })

    it('should have questions as strings', () => {
      counselorExamples.ko.forEach((example) => {
        expect(typeof example.question).toBe('string')
      })
    })

    it('should have answers as strings', () => {
      counselorExamples.ko.forEach((example) => {
        expect(typeof example.answer).toBe('string')
      })
    })
  })

  describe('English examples structure', () => {
    it('should have question and answer in each example', () => {
      counselorExamples.en.forEach((example) => {
        expect(example).toHaveProperty('question')
        expect(example).toHaveProperty('answer')
      })
    })

    it('should have non-empty questions', () => {
      counselorExamples.en.forEach((example) => {
        expect(example.question.length).toBeGreaterThan(0)
      })
    })

    it('should have non-empty answers', () => {
      counselorExamples.en.forEach((example) => {
        expect(example.answer.length).toBeGreaterThan(0)
      })
    })

    it('should have detailed answers (at least 100 characters)', () => {
      counselorExamples.en.forEach((example) => {
        expect(example.answer.length).toBeGreaterThan(100)
      })
    })
  })

  describe('Korean examples content', () => {
    it('should have identity question example', () => {
      const identityExample = counselorExamples.ko.find((ex) => ex.question.includes('어떤 사람'))
      expect(identityExample).toBeDefined()
    })

    it('should have romance/relationship question example', () => {
      const romanceExample = counselorExamples.ko.find(
        (ex) => ex.question.includes('연애') || ex.question.includes('만날')
      )
      expect(romanceExample).toBeDefined()
    })

    it('should have career question example', () => {
      const careerExample = counselorExamples.ko.find(
        (ex) => ex.question.includes('직장') || ex.question.includes('이직')
      )
      expect(careerExample).toBeDefined()
    })

    it('should include saju terminology in Korean answers', () => {
      const hassajuTerms = counselorExamples.ko.some((ex) => {
        const answer = ex.answer
        return (
          answer.includes('사주') ||
          answer.includes('일간') ||
          answer.includes('십신') ||
          answer.includes('대운') ||
          answer.includes('세운')
        )
      })
      expect(hassajuTerms).toBe(true)
    })

    it('should include astrology terminology in Korean answers', () => {
      const hasAstroTerms = counselorExamples.ko.some((ex) => {
        const answer = ex.answer
        return (
          answer.includes('점성술') ||
          answer.includes('하우스') ||
          answer.includes('트랜짓') ||
          answer.includes('금성') ||
          answer.includes('목성')
        )
      })
      expect(hasAstroTerms).toBe(true)
    })

    it('should include timing information in some answers', () => {
      const hasTimingInfo = counselorExamples.ko.some((ex) => {
        const answer = ex.answer
        return answer.includes('월') || answer.includes('년') || answer.includes('시기')
      })
      expect(hasTimingInfo).toBe(true)
    })
  })

  describe('English examples content', () => {
    it('should have identity question example', () => {
      const identityExample = counselorExamples.en.find((ex) =>
        ex.question.toLowerCase().includes('who am i')
      )
      expect(identityExample).toBeDefined()
    })

    it('should include Four Pillars terminology in English answers', () => {
      const hasFourPillarsTerms = counselorExamples.en.some((ex) => {
        const answer = ex.answer
        return (
          answer.includes('Four Pillars') ||
          answer.includes('Day Master') ||
          answer.includes('Wealth') ||
          answer.includes('Luck')
        )
      })
      expect(hasFourPillarsTerms).toBe(true)
    })

    it('should include astrology terminology in English answers', () => {
      const hasAstroTerms = counselorExamples.en.some((ex) => {
        const answer = ex.answer
        return (
          answer.includes('Sun') ||
          answer.includes('Venus') ||
          answer.includes('house') ||
          answer.includes('transit')
        )
      })
      expect(hasAstroTerms).toBe(true)
    })
  })

  describe('buildFewShotPrompt()', () => {
    describe('Korean prompts', () => {
      it('should generate prompt for Korean language', () => {
        const prompt = buildFewShotPrompt('ko', '나는 누구인가요?')
        expect(prompt).toBeDefined()
        expect(prompt.length).toBeGreaterThan(0)
      })

      it('should include user question in prompt', () => {
        const userQuestion = '올해 운세가 어떤가요?'
        const prompt = buildFewShotPrompt('ko', userQuestion)
        expect(prompt).toContain(userQuestion)
      })

      it('should include example questions in prompt', () => {
        const prompt = buildFewShotPrompt('ko', '테스트 질문')
        counselorExamples.ko.forEach((example) => {
          expect(prompt).toContain(example.question)
        })
      })

      it('should include example answers in prompt', () => {
        const prompt = buildFewShotPrompt('ko', '테스트 질문')
        counselorExamples.ko.forEach((example) => {
          expect(prompt).toContain(example.answer)
        })
      })

      it('should format examples with Q: and A: labels', () => {
        const prompt = buildFewShotPrompt('ko', '테스트 질문')
        expect(prompt).toContain('Q:')
        expect(prompt).toContain('A:')
      })

      it('should number examples sequentially', () => {
        const prompt = buildFewShotPrompt('ko', '테스트 질문')
        expect(prompt).toContain('[Example 1]')
        expect(prompt).toContain('[Example 2]')
      })

      it('should include separator between examples', () => {
        const prompt = buildFewShotPrompt('ko', '테스트 질문')
        expect(prompt).toContain('---')
      })

      it('should include HIGH-QUALITY instruction', () => {
        const prompt = buildFewShotPrompt('ko', '테스트 질문')
        expect(prompt).toContain('HIGH-QUALITY')
      })

      it('should include SAME LEVEL OF DETAIL instruction', () => {
        const prompt = buildFewShotPrompt('ko', '테스트 질문')
        expect(prompt).toContain('SAME LEVEL OF DETAIL')
      })

      it('should end with user question and answer prefix', () => {
        const userQuestion = '나의 적성은?'
        const prompt = buildFewShotPrompt('ko', userQuestion)
        expect(prompt).toContain('Q: ' + userQuestion)
        expect(prompt).toContain('A: ')
      })
    })

    describe('English prompts', () => {
      it('should generate prompt for English language', () => {
        const prompt = buildFewShotPrompt('en', 'Who am I?')
        expect(prompt).toBeDefined()
        expect(prompt.length).toBeGreaterThan(0)
      })

      it('should include user question in English prompt', () => {
        const userQuestion = 'What is my fortune this year?'
        const prompt = buildFewShotPrompt('en', userQuestion)
        expect(prompt).toContain(userQuestion)
      })

      it('should include English example questions', () => {
        const prompt = buildFewShotPrompt('en', 'Test question')
        counselorExamples.en.forEach((example) => {
          expect(prompt).toContain(example.question)
        })
      })

      it('should include English example answers', () => {
        const prompt = buildFewShotPrompt('en', 'Test question')
        counselorExamples.en.forEach((example) => {
          expect(prompt).toContain(example.answer)
        })
      })

      it('should format English examples with Q: and A: labels', () => {
        const prompt = buildFewShotPrompt('en', 'Test question')
        expect(prompt).toContain('Q:')
        expect(prompt).toContain('A:')
      })
    })

    describe('Fallback behavior', () => {
      it('should fallback to Korean for undefined language', () => {
        const prompt = buildFewShotPrompt(undefined as any, '테스트')
        // Should use Korean examples as fallback
        const hasKoreanContent = counselorExamples.ko.some((ex) => prompt.includes(ex.question))
        expect(hasKoreanContent).toBe(true)
      })

      it('should fallback to Korean for unsupported language', () => {
        const prompt = buildFewShotPrompt('fr' as any, 'Question test')
        // Should use Korean examples as fallback
        const hasKoreanContent = counselorExamples.ko.some((ex) => prompt.includes(ex.question))
        expect(hasKoreanContent).toBe(true)
      })
    })

    describe('Prompt structure', () => {
      it('should have introduction section', () => {
        const prompt = buildFewShotPrompt('ko', '테스트')
        expect(prompt).toContain('HIGH-QUALITY counselor responses')
      })

      it('should have examples section', () => {
        const prompt = buildFewShotPrompt('ko', '테스트')
        expect(prompt).toContain('[Example')
      })

      it('should have user question section', () => {
        const prompt = buildFewShotPrompt('ko', '테스트')
        expect(prompt).toContain('Now answer')
      })

      it('should separate sections with dashes', () => {
        const prompt = buildFewShotPrompt('ko', '테스트')
        const dashCount = (prompt.match(/---/g) || []).length
        expect(dashCount).toBeGreaterThanOrEqual(2)
      })

      it('should include all examples in order', () => {
        const prompt = buildFewShotPrompt('ko', '테스트')
        counselorExamples.ko.forEach((example, index) => {
          expect(prompt).toContain(`[Example ${index + 1}]`)
        })
      })
    })

    describe('Edge cases', () => {
      it('should handle empty user question', () => {
        const prompt = buildFewShotPrompt('ko', '')
        expect(prompt).toBeDefined()
        expect(prompt.length).toBeGreaterThan(0)
      })

      it('should handle very long user question', () => {
        const longQuestion = '질문이 '.repeat(100)
        const prompt = buildFewShotPrompt('ko', longQuestion)
        expect(prompt).toContain(longQuestion)
      })

      it('should handle special characters in user question', () => {
        const specialQuestion = '나는 누구?! @#$% & *'
        const prompt = buildFewShotPrompt('ko', specialQuestion)
        expect(prompt).toContain(specialQuestion)
      })

      it('should handle multiline user question', () => {
        const multilineQuestion = '첫 번째 질문\n두 번째 질문\n세 번째 질문'
        const prompt = buildFewShotPrompt('ko', multilineQuestion)
        expect(prompt).toContain(multilineQuestion)
      })
    })
  })

  describe('Integration', () => {
    it('should generate consistent prompts for same input', () => {
      const question = '나의 미래는?'
      const prompt1 = buildFewShotPrompt('ko', question)
      const prompt2 = buildFewShotPrompt('ko', question)
      expect(prompt1).toBe(prompt2)
    })

    it('should generate different prompts for different languages', () => {
      const question = 'Test question'
      const koPrompt = buildFewShotPrompt('ko', question)
      const enPrompt = buildFewShotPrompt('en', question)
      expect(koPrompt).not.toBe(enPrompt)
    })

    it('should generate different prompts for different questions', () => {
      const prompt1 = buildFewShotPrompt('ko', '질문 1')
      const prompt2 = buildFewShotPrompt('ko', '질문 2')
      expect(prompt1).not.toBe(prompt2)
    })

    it('should have quality indicators in Korean examples', () => {
      const koExamples = counselorExamples.ko
      koExamples.forEach((example) => {
        // Should have detailed analysis, not just generic responses
        expect(example.answer.length).toBeGreaterThan(200)
      })
    })

    it('should have quality indicators in English examples', () => {
      const enExamples = counselorExamples.en
      enExamples.forEach((example) => {
        // Should have detailed analysis, not just generic responses
        expect(example.answer.length).toBeGreaterThan(200)
      })
    })

    it('should provide actionable advice in examples', () => {
      const hasActionableAdvice = counselorExamples.ko.some((ex) => {
        const answer = ex.answer
        return (
          answer.includes('추천') ||
          answer.includes('조언') ||
          answer.includes('하세요') ||
          answer.includes('필요')
        )
      })
      expect(hasActionableAdvice).toBe(true)
    })

    it('should include specific data points in examples', () => {
      const hasSpecificData = counselorExamples.ko.some((ex) => {
        const answer = ex.answer
        // Look for specific dates, numbers, zodiac signs, etc.
        return /\d+월/.test(answer) || /\d+년/.test(answer) || /\d+하우스/.test(answer)
      })
      expect(hasSpecificData).toBe(true)
    })
  })
})
