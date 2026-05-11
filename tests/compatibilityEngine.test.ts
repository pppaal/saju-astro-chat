// tests/compatibilityEngine.test.ts
// 궁합 분석 엔진 테스트

import {
  analyzeElementCompatibility,
  analyzeStemCompatibility,
  analyzeBranchCompatibility,
  analyzeDayMasterRelation,
  analyzeByCategory,
  analyzeComprehensiveCompatibility,
  analyzeMultiPersonCompatibility,
  type CompatibilitySubject,
} from '@/lib/saju/compatibility'
import type { SajuPillars, PillarData } from '@/lib/saju/types'

// 헬퍼: 테스트용 기둥 데이터 생성
function createPillarData(stemName: string, branchName: string): PillarData {
  const stemElementMap: Record<string, '목' | '화' | '토' | '금' | '수'> = {
    甲: '목',
    乙: '목',
    丙: '화',
    丁: '화',
    戊: '토',
    己: '토',
    庚: '금',
    辛: '금',
    壬: '수',
    癸: '수',
  }
  const branchElementMap: Record<string, '목' | '화' | '토' | '금' | '수'> = {
    子: '수',
    丑: '토',
    寅: '목',
    卯: '목',
    辰: '토',
    巳: '화',
    午: '화',
    未: '토',
    申: '금',
    酉: '금',
    戌: '토',
    亥: '수',
  }
  const stemYinYangMap: Record<string, '양' | '음'> = {
    甲: '양',
    乙: '음',
    丙: '양',
    丁: '음',
    戊: '양',
    己: '음',
    庚: '양',
    辛: '음',
    壬: '양',
    癸: '음',
  }

  return {
    heavenlyStem: {
      name: stemName,
      element: stemElementMap[stemName] || '토',
      yin_yang: stemYinYangMap[stemName] || '양',
      sibsin: '비견',
    },
    earthlyBranch: {
      name: branchName,
      element: branchElementMap[branchName] || '토',
      yin_yang: '양',
      sibsin: '비견',
    },
    jijanggan: {},
  }
}

function createTestPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1]),
    month: createPillarData(month[0], month[1]),
    day: createPillarData(day[0], day[1]),
    time: createPillarData(time[0], time[1]),
  }
}

function createSubject(id: string, pillars: SajuPillars): CompatibilitySubject {
  return { id, pillars }
}

describe('compatibilityEngine', () => {
  describe('analyzeElementCompatibility (오행 궁합)', () => {
    it('should return score between 0 and 100', () => {
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])

      const result = analyzeElementCompatibility(person1, person2)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should identify harmony elements', () => {
      // 둘 다 목이 강한 사주
      const person1 = createTestPillars(['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯'])
      const person2 = createTestPillars(['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯'])

      const result = analyzeElementCompatibility(person1, person2)

      expect(result.harmony).toContain('목')
    })

    it('should identify complementary elements', () => {
      // person1은 목이 강하고, person2는 목이 약함
      const person1 = createTestPillars(['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯'])
      const person2 = createTestPillars(['庚', '申'], ['辛', '酉'], ['庚', '申'], ['辛', '酉'])

      const result = analyzeElementCompatibility(person1, person2)

      expect(result.complementary.length).toBeGreaterThan(0)
    })

    it('should provide analysis text', () => {
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])

      const result = analyzeElementCompatibility(person1, person2)

      expect(result.analysis).toBeTruthy()
      expect(typeof result.analysis).toBe('string')
    })
  })

  describe('analyzeStemCompatibility (천간 궁합)', () => {
    it('should detect stem hap (천간합)', () => {
      // 甲己 합이 있는 경우
      const person1 = createTestPillars(['甲', '子'], ['甲', '寅'], ['甲', '辰'], ['甲', '午'])
      const person2 = createTestPillars(['己', '丑'], ['己', '卯'], ['己', '巳'], ['己', '未'])

      const result = analyzeStemCompatibility(person1, person2)

      expect(result.hapPairs.length).toBeGreaterThan(0)
      expect(result.hapPairs[0]).toHaveProperty('stem1', '甲')
      expect(result.hapPairs[0]).toHaveProperty('stem2', '己')
    })

    it('should detect stem chung (천간충)', () => {
      // 甲庚 충이 있는 경우
      const person1 = createTestPillars(['甲', '子'], ['甲', '寅'], ['甲', '辰'], ['甲', '午'])
      const person2 = createTestPillars(['庚', '申'], ['庚', '酉'], ['庚', '戌'], ['庚', '亥'])

      const result = analyzeStemCompatibility(person1, person2)

      expect(result.chungPairs.length).toBeGreaterThan(0)
    })

    it('should return score between 0 and 100', () => {
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])

      const result = analyzeStemCompatibility(person1, person2)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('analyzeBranchCompatibility (지지 궁합)', () => {
    it('should detect yukhap (육합)', () => {
      // 子丑 육합
      const person1 = createTestPillars(['甲', '子'], ['乙', '子'], ['丙', '子'], ['丁', '子'])
      const person2 = createTestPillars(['戊', '丑'], ['己', '丑'], ['庚', '丑'], ['辛', '丑'])

      const result = analyzeBranchCompatibility(person1, person2)

      expect(result.yukhapPairs.length).toBeGreaterThan(0)
      expect(result.yukhapPairs[0].branch1).toBe('子')
      expect(result.yukhapPairs[0].branch2).toBe('丑')
    })

    it('should detect samhap (삼합)', () => {
      // 寅午戌 화국 삼합
      const person1 = createTestPillars(['甲', '寅'], ['乙', '午'], ['丙', '寅'], ['丁', '午'])
      const person2 = createTestPillars(['戊', '戌'], ['己', '戌'], ['庚', '戌'], ['辛', '戌'])

      const result = analyzeBranchCompatibility(person1, person2)

      expect(result.samhapGroups.length).toBeGreaterThan(0)
      expect(result.samhapGroups[0].result).toBe('화')
    })

    it('should detect chung (지지충)', () => {
      // 子午 충
      const person1 = createTestPillars(['甲', '子'], ['乙', '子'], ['丙', '子'], ['丁', '子'])
      const person2 = createTestPillars(['戊', '午'], ['己', '午'], ['庚', '午'], ['辛', '午'])

      const result = analyzeBranchCompatibility(person1, person2)

      expect(result.chungPairs.length).toBeGreaterThan(0)
    })

    it('should detect hae (지지해)', () => {
      // 子未 해
      const person1 = createTestPillars(['甲', '子'], ['乙', '子'], ['丙', '子'], ['丁', '子'])
      const person2 = createTestPillars(['戊', '未'], ['己', '未'], ['庚', '未'], ['辛', '未'])

      const result = analyzeBranchCompatibility(person1, person2)

      expect(result.haePairs.length).toBeGreaterThan(0)
    })

    it('should provide analysis text', () => {
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])

      const result = analyzeBranchCompatibility(person1, person2)

      expect(result.analysis).toBeTruthy()
    })
  })

  describe('analyzeDayMasterRelation (일간 관계 분석)', () => {
    it('should identify 비화 relation for same element', () => {
      // 둘 다 甲 일간 (목)
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['甲', '午'], ['辛', '未'])

      const result = analyzeDayMasterRelation(person1, person2)

      expect(result.relation).toBe('비화')
      expect(result.sibsin).toBe('비견')
    })

    it('should identify 생조 relation', () => {
      // 甲(목) 일간과 壬(수) 일간 - 수생목
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['壬', '子'], ['辛', '未'])

      const result = analyzeDayMasterRelation(person1, person2)

      expect(result.relation).toBe('생조')
      expect(['편인', '정인']).toContain(result.sibsin)
    })

    it('should provide dynamics description', () => {
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])

      const result = analyzeDayMasterRelation(person1, person2)

      expect(result.dynamics).toBeTruthy()
      expect(typeof result.dynamics).toBe('string')
    })

    it('should return score between 0 and 100', () => {
      const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])

      const result = analyzeDayMasterRelation(person1, person2)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('analyzeByCategory (카테고리별 궁합)', () => {
    const person1 = createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
    const person2 = createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])

    it('should analyze love compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'love')

      expect(result.category).toBe('love')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.strengths).toBeDefined()
      expect(result.challenges).toBeDefined()
      expect(result.advice).toBeTruthy()
    })

    it('should analyze business compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'business')

      expect(result.category).toBe('business')
      expect(result.advice).toContain('역할')
    })

    it('should analyze friendship compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'friendship')

      expect(result.category).toBe('friendship')
    })

    it('should analyze family compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'family')

      expect(result.category).toBe('family')
    })

    it('should analyze work compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'work')

      expect(result.category).toBe('work')
    })
  })

  describe('analyzeComprehensiveCompatibility (종합 궁합)', () => {
    it('should return overall score and grade', () => {
      const subject1 = createSubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      )
      const subject2 = createSubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
      )

      const result = analyzeComprehensiveCompatibility(subject1, subject2)

      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade)
    })

    it('should include all compatibility components', () => {
      const subject1 = createSubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      )
      const subject2 = createSubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
      )

      const result = analyzeComprehensiveCompatibility(subject1, subject2)

      expect(result.elementCompatibility).toBeDefined()
      expect(result.stemCompatibility).toBeDefined()
      expect(result.branchCompatibility).toBeDefined()
      expect(result.dayMasterRelation).toBeDefined()
    })

    it('should include category scores', () => {
      const subject1 = createSubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      )
      const subject2 = createSubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
      )

      const result = analyzeComprehensiveCompatibility(subject1, subject2)

      expect(result.categoryScores).toBeDefined()
      expect(Array.isArray(result.categoryScores)).toBe(true)
      expect(result.categoryScores.length).toBeGreaterThan(0)
    })

    it('should provide summary and recommendations', () => {
      const subject1 = createSubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      )
      const subject2 = createSubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
      )

      const result = analyzeComprehensiveCompatibility(subject1, subject2)

      expect(result.summary).toBeTruthy()
      expect(result.strengths).toBeDefined()
      expect(result.challenges).toBeDefined()
      expect(result.recommendations).toBeDefined()
    })

    it('should allow custom categories', () => {
      const subject1 = createSubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      )
      const subject2 = createSubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
      )

      const result = analyzeComprehensiveCompatibility(subject1, subject2, {
        categories: ['love', 'family'],
      })

      expect(result.categoryScores.length).toBe(2)
      expect(result.categoryScores.map((c) => c.category)).toContain('love')
      expect(result.categoryScores.map((c) => c.category)).toContain('family')
    })
  })

  describe('analyzeMultiPersonCompatibility (다자간 궁합)', () => {
    it('should analyze 3 person compatibility', () => {
      const participants = [
        createSubject(
          'A',
          createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
        ),
        createSubject(
          'B',
          createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
        ),
        createSubject(
          'C',
          createTestPillars(['壬', '申'], ['癸', '酉'], ['甲', '戌'], ['乙', '亥'])
        ),
      ]

      const result = analyzeMultiPersonCompatibility(participants)

      expect(result.participants.length).toBe(3)
      expect(result.pairwiseScores.length).toBe(3) // 3C2 = 3
    })

    it('should calculate group harmony', () => {
      const participants = [
        createSubject(
          'A',
          createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
        ),
        createSubject(
          'B',
          createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
        ),
        createSubject(
          'C',
          createTestPillars(['壬', '申'], ['癸', '酉'], ['甲', '戌'], ['乙', '亥'])
        ),
      ]

      const result = analyzeMultiPersonCompatibility(participants)

      expect(result.groupHarmony).toBeGreaterThanOrEqual(0)
      expect(result.groupHarmony).toBeLessThanOrEqual(100)
    })

    it('should identify best and challenging pairs', () => {
      const participants = [
        createSubject(
          'A',
          createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
        ),
        createSubject(
          'B',
          createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
        ),
        createSubject(
          'C',
          createTestPillars(['壬', '申'], ['癸', '酉'], ['甲', '戌'], ['乙', '亥'])
        ),
      ]

      const result = analyzeMultiPersonCompatibility(participants)

      expect(result.bestPairs).toBeDefined()
      expect(result.challengingPairs).toBeDefined()
      expect(Array.isArray(result.bestPairs)).toBe(true)
    })

    it('should provide group dynamics description', () => {
      const participants = [
        createSubject(
          'A',
          createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
        ),
        createSubject(
          'B',
          createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
        ),
      ]

      const result = analyzeMultiPersonCompatibility(participants)

      expect(result.groupDynamics).toBeTruthy()
    })

    it('should throw error for less than 2 participants', () => {
      const participants = [
        createSubject(
          'A',
          createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
        ),
      ]

      expect(() => analyzeMultiPersonCompatibility(participants)).toThrow('최소 2명')
    })

    it('should provide recommendations', () => {
      const participants = [
        createSubject(
          'A',
          createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
        ),
        createSubject(
          'B',
          createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
        ),
        createSubject(
          'C',
          createTestPillars(['壬', '申'], ['癸', '酉'], ['甲', '戌'], ['乙', '亥'])
        ),
      ]

      const result = analyzeMultiPersonCompatibility(participants)

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })
  })
})
