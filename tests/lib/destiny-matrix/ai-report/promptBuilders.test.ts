/**
 * Prompt Builders Tests
 * AI 리포트 프롬프트 빌더 함수 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  getDomainName,
  buildProfileInfo,
  buildMatrixSummary,
  buildAIPrompt,
  buildThemedAIPrompt,
} from '@/lib/destiny-matrix/ai-report/promptBuilders'
import type { InsightDomain, FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { AIReportGenerationOptions } from '@/lib/destiny-matrix/ai-report/reportTypes'

describe('PromptBuilders', () => {
  describe('getDomainName', () => {
    describe('Korean domain names', () => {
      it('should return correct Korean name for personality', () => {
        expect(getDomainName('personality', 'ko')).toBe('성격')
      })

      it('should return correct Korean name for career', () => {
        expect(getDomainName('career', 'ko')).toBe('직업/재능')
      })

      it('should return correct Korean name for relationship', () => {
        expect(getDomainName('relationship', 'ko')).toBe('관계')
      })

      it('should return correct Korean name for wealth', () => {
        expect(getDomainName('wealth', 'ko')).toBe('재물')
      })

      it('should return correct Korean name for health', () => {
        expect(getDomainName('health', 'ko')).toBe('건강')
      })

      it('should return correct Korean name for spirituality', () => {
        expect(getDomainName('spirituality', 'ko')).toBe('영성')
      })

      it('should return correct Korean name for timing', () => {
        expect(getDomainName('timing', 'ko')).toBe('타이밍')
      })
    })

    describe('English domain names', () => {
      it('should return correct English name for personality', () => {
        expect(getDomainName('personality', 'en')).toBe('Personality')
      })

      it('should return correct English name for career', () => {
        expect(getDomainName('career', 'en')).toBe('Career')
      })

      it('should return correct English name for relationship', () => {
        expect(getDomainName('relationship', 'en')).toBe('Relationships')
      })

      it('should return correct English name for wealth', () => {
        expect(getDomainName('wealth', 'en')).toBe('Wealth')
      })
    })

    describe('fallback behavior', () => {
      it('should return domain as fallback for unknown domain', () => {
        const result = getDomainName('unknown' as InsightDomain, 'ko')
        expect(result).toBe('unknown')
      })
    })
  })

  describe('buildProfileInfo', () => {
    const mockInput: MatrixCalculationInput = {
      dayMasterElement: '목',
      geokguk: '정격',
      yongsin: '수',
      sibsinDistribution: {
        정재: 2,
        편관: 1,
      },
      shinsalList: ['천을귀인', '역마살'],
      currentDaeunElement: '화',
    }

    const mockOptions: AIReportGenerationOptions = {
      name: '홍길동',
      birthDate: '1990-01-15',
    }

    describe('Korean profile info', () => {
      it('should include profile header', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('## 프로필')
      })

      it('should include name', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('이름: 홍길동')
      })

      it('should include birth date', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('생년월일: 1990-01-15')
      })

      it('should include day master element', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('목(木) - 나무')
      })

      it('should include geokguk', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('격국: 정격')
      })

      it('should include yongsin', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('용신: 수')
      })

      it('should include sibsin distribution', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('정재(2)')
        expect(result).toContain('편관(1)')
      })

      it('should include shinsal list', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('천을귀인')
        expect(result).toContain('역마살')
      })

      it('should include current daeun element', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'ko')
        expect(result).toContain('현재 대운 오행: 화')
      })
    })

    describe('English profile info', () => {
      it('should include profile header', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'en')
        expect(result).toContain('## Profile')
      })

      it('should include name', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'en')
        expect(result).toContain('Name: 홍길동')
      })

      it('should include day master in English', () => {
        const result = buildProfileInfo(mockInput, mockOptions, 'en')
        expect(result).toContain('Day Master: Wood')
      })

      it('should include timing lines when timingData is provided', () => {
        const result = buildProfileInfo(
          mockInput,
          {
            ...mockOptions,
            timingData: {
              daeun: {
                heavenlyStem: 'Gyeong',
                earthlyBranch: 'Ja',
                element: 'Water',
                startAge: 30,
                endAge: 39,
                isCurrent: true,
              },
              seun: {
                year: 2026,
                heavenlyStem: 'Byeong',
                earthlyBranch: 'O',
                element: 'Fire',
              },
              wolun: {
                month: 2,
                heavenlyStem: 'Im',
                earthlyBranch: 'In',
                element: 'Water',
              },
              iljin: {
                date: '2026-02-25',
                heavenlyStem: 'Gap',
                earthlyBranch: 'Ja',
                element: 'Wood',
              },
            },
          },
          'en'
        )

        expect(result).toContain('Current Daeun: GyeongJa (Water, age 30-39)')
        expect(result).toContain('Seun: 2026 ByeongO (Fire)')
        expect(result).toContain('Wolun: month 2 ImIn (Water)')
        expect(result).toContain('Iljin: 2026-02-25 GapJa (Wood)')
      })
    })

    describe('missing data handling', () => {
      it('should show 미입력 for missing name in Korean', () => {
        const result = buildProfileInfo(mockInput, {}, 'ko')
        expect(result).toContain('이름: 미입력')
      })

      it('should show Not provided for missing name in English', () => {
        const result = buildProfileInfo(mockInput, {}, 'en')
        expect(result).toContain('Name: Not provided')
      })

      it('should show 없음 for empty sibsin distribution', () => {
        const inputWithoutSibsin = { ...mockInput, sibsinDistribution: undefined }
        const result = buildProfileInfo(inputWithoutSibsin, mockOptions, 'ko')
        expect(result).toContain('주요 십신: 없음')
      })

      it('should show 없음 for empty shinsal list', () => {
        const inputWithoutShinsal = { ...mockInput, shinsalList: undefined }
        const result = buildProfileInfo(inputWithoutShinsal, mockOptions, 'ko')
        expect(result).toContain('신살: 없음')
      })
    })

    describe('all day master elements', () => {
      const elements = ['목', '화', '토', '금', '수']
      const englishNames = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']

      elements.forEach((element, index) => {
        it(`should handle ${element} element correctly`, () => {
          const input = { ...mockInput, dayMasterElement: element }
          const result = buildProfileInfo(input, mockOptions, 'en')
          expect(result).toContain(`Day Master: ${englishNames[index]}`)
        })
      })
    })
  })

  describe('buildMatrixSummary', () => {
    const mockReport: FusionReport = {
      overallScore: {
        total: 78,
        grade: 'A',
      },
      topInsights: [
        { category: 'personality', title: '리더십', description: '강한 리더십 성향' },
        { category: 'career', title: '창업', description: '창업 적성이 높음' },
        { category: 'wealth', title: '투자', description: '투자 감각이 뛰어남' },
      ],
      domainAnalysis: [
        { domain: 'personality', score: 85, grade: 'A' },
        { domain: 'career', score: 72, grade: 'B' },
      ],
    }

    describe('Korean summary', () => {
      it('should include overall score', () => {
        const result = buildMatrixSummary(mockReport, 'ko')
        expect(result).toContain('종합 점수: 78/100')
      })

      it('should include grade', () => {
        const result = buildMatrixSummary(mockReport, 'ko')
        expect(result).toContain('A등급')
      })

      it('should include insights', () => {
        const result = buildMatrixSummary(mockReport, 'ko')
        expect(result).toContain('주요 인사이트')
        expect(result).toContain('리더십')
        expect(result).toContain('강한 리더십 성향')
      })

      it('should include domain scores', () => {
        const result = buildMatrixSummary(mockReport, 'ko')
        expect(result).toContain('도메인별 점수')
        expect(result).toContain('personality: 85/100')
      })
    })

    describe('English summary', () => {
      it('should include overall score', () => {
        const result = buildMatrixSummary(mockReport, 'en')
        expect(result).toContain('Overall Score: 78/100')
      })

      it('should include grade', () => {
        const result = buildMatrixSummary(mockReport, 'en')
        expect(result).toContain('Grade A')
      })

      it('should include key insights header', () => {
        const result = buildMatrixSummary(mockReport, 'en')
        expect(result).toContain('Key Insights')
      })

      it('should include domain scores header', () => {
        const result = buildMatrixSummary(mockReport, 'en')
        expect(result).toContain('Domain Scores')
      })
    })

    describe('insight numbering', () => {
      it('should number insights 1-5', () => {
        const result = buildMatrixSummary(mockReport, 'ko')
        expect(result).toContain('1.')
        expect(result).toContain('2.')
        expect(result).toContain('3.')
      })

      it('should limit to 5 insights', () => {
        const manyInsights = {
          ...mockReport,
          topInsights: Array(10)
            .fill(null)
            .map((_, i) => ({
              category: 'test',
              title: `Insight ${i}`,
              description: `Description ${i}`,
            })),
        }
        const result = buildMatrixSummary(manyInsights, 'ko')
        expect(result).toContain('5.')
        expect(result).not.toContain('6.')
      })
    })

    describe('missing domain analysis', () => {
      it('should handle undefined domain analysis', () => {
        const reportWithoutDomains = { ...mockReport, domainAnalysis: undefined }
        const result = buildMatrixSummary(reportWithoutDomains, 'ko')
        expect(result).toContain('종합 점수')
      })
    })
  })

  describe('buildAIPrompt', () => {
    const mockInput: MatrixCalculationInput = {
      dayMasterElement: '목',
      geokguk: '정격',
      yongsin: '수',
    }

    const mockReport: FusionReport = {
      overallScore: { total: 75, grade: 'B' },
      topInsights: [{ category: 'test', title: 'Test', description: 'Test desc' }],
      domainAnalysis: [],
    }

    describe('Korean prompt', () => {
      it('should include role description', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko' })
        expect(result).toContain('전문 운세 상담사')
      })

      it('should include profile info', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko', name: '테스트' })
        expect(result).toContain('프로필')
        expect(result).toContain('테스트')
      })

      it('should include matrix summary', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko' })
        expect(result).toContain('매트릭스 분석 결과')
      })

      it('should include section instructions', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko' })
        expect(result).toContain('introduction')
        expect(result).toContain('personalityDeep')
        expect(result).toContain('conclusion')
      })

      it('should include JSON template', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko' })
        expect(result).toContain('"introduction"')
        expect(result).toContain('"actionPlan"')
      })
    })

    describe('English prompt', () => {
      it('should include role description in English', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'en' })
        expect(result).toContain('expert fortune consultant')
      })

      it('should include section instructions in English', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'en' })
        expect(result).toContain('Sections to Write')
        expect(result).toContain('Overall destiny summary')
      })
    })

    describe('focus domain', () => {
      it('should include focus instruction for Korean', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko', focusDomain: 'career' })
        expect(result).toContain('직업/재능')
        expect(result).toContain('집중하여 분석')
      })

      it('should include focus instruction for English', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'en', focusDomain: 'career' })
        expect(result).toContain('Career')
        expect(result).toContain('Focus particularly')
      })
    })

    describe('detail level', () => {
      it('should show standard detail level', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko', detailLevel: 'standard' })
        expect(result).toContain('상세도: 표준')
      })

      it('should show detailed level', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko', detailLevel: 'detailed' })
        expect(result).toContain('상세도: 상세')
      })

      it('should show comprehensive level', () => {
        const result = buildAIPrompt(mockInput, mockReport, {
          lang: 'ko',
          detailLevel: 'comprehensive',
        })
        expect(result).toContain('상세도: 매우 상세')
      })
    })

    describe('default values', () => {
      it('should default to Korean', () => {
        const result = buildAIPrompt(mockInput, mockReport, {})
        expect(result).toContain('전문 운세 상담사')
      })

      it('should default to detailed level', () => {
        const result = buildAIPrompt(mockInput, mockReport, { lang: 'ko' })
        expect(result).toContain('상세도: 상세')
      })
    })

    describe('question intent routing', () => {
      it('should include binary-decision guidance for Korean yes/no question', () => {
        const result = buildAIPrompt(mockInput, mockReport, {
          lang: 'ko',
          userQuestion: '여기로 가는게 맞냐?',
        })
        expect(result).toContain('사용자 질문 의도')
        expect(result).toContain('예/아니오(결정형)')
        expect(result).toContain('지금 해야 할 행동')
      })

      it('should include open-guidance marker for English question', () => {
        const result = buildAIPrompt(mockInput, mockReport, {
          lang: 'en',
          userQuestion: 'How can I approach my career transition better?',
        })
        expect(result).toContain('User Question Intent')
        expect(result).toContain('Open guidance question')
      })

      it('should include deterministic core block when provided', () => {
        const result = buildAIPrompt(mockInput, mockReport, {
          lang: 'ko',
          deterministicCorePrompt: '## Deterministic Core (모든 데이터 통합)\n- SAJU coverage: ...',
        })
        expect(result).toContain('Deterministic Core')
        expect(result).toContain('SAJU coverage')
      })
    })
  })

  describe('buildThemedAIPrompt', () => {
    const mockInput: MatrixCalculationInput = {
      dayMasterElement: '화',
    }

    const mockReport: FusionReport = {
      overallScore: { total: 80, grade: 'A' },
      topInsights: [],
      domainAnalysis: [],
    }

    it('should include profile info', () => {
      const result = buildThemedAIPrompt(mockInput, mockReport, 'love', { lang: 'ko' })
      expect(result).toContain('프로필')
    })

    it('should include matrix summary', () => {
      const result = buildThemedAIPrompt(mockInput, mockReport, 'love', { lang: 'ko' })
      expect(result).toContain('매트릭스 분석 결과')
    })

    it('should include section instructions for Korean', () => {
      const result = buildThemedAIPrompt(mockInput, mockReport, 'love', { lang: 'ko' })
      expect(result).toContain('섹션들을 각각 작성')
    })

    it('should include section instructions for English', () => {
      const result = buildThemedAIPrompt(mockInput, mockReport, 'love', { lang: 'en' })
      expect(result).toContain('Write each of the following sections')
    })

    it('should default to Korean language', () => {
      const result = buildThemedAIPrompt(mockInput, mockReport, 'career', {})
      expect(result).toContain('프로필')
    })
  })
})
