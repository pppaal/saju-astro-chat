/**
 * Saju Domain Schema Tests
 * Comprehensive testing for domains/saju-domain.ts validation schemas
 */
import { describe, it, expect } from 'vitest'
import {
  fiveElementSchema,
  fiveElementEnglishSchema,
  yinYangSchema,
  sibsinKindSchema,
  pillarKindSchema,
  twelveStageSchema,
  stemBranchInfoSchema,
  ganjiSchema,
  pillarGanjiDataSchema,
  jijangganSlotSchema,
  jijangganDataSchema,
  pillarDataSchema,
  sajuPillarsSchema,
  sibsinPairSchema,
  unseDataSchema,
  daeunDataSchema,
  annualCycleDataSchema,
  monthlyCycleDataSchema,
  iljinDataSchema,
  relationKindSchema,
  relationHitSchema,
  shinsalKindSchema,
  shinsalHitSchema,
  fiveElementsDistributionSchema,
  fiveElementsKoreanDistributionSchema,
  sajuFactsSchema,
  geokgukTypeSchema,
  geokgukAnalysisSchema,
  yongsinAnalysisSchema,
  tonggeunAnalysisSchema,
  deukryeongAnalysisSchema,
  sibsinDistributionSchema,
  sibsinAnalysisSchema,
  hyeongchungItemSchema,
  hyeongchungAnalysisSchema,
  comprehensiveScoreSchema,
  advancedSajuAnalysisSchema,
  daeunInfoSchema,
  sajuResultSchema,
  sajuChatContextSchema,
  twelveStagesRecordSchema,
} from '@/lib/api/zodValidation/domains/saju-domain'

describe('Core Enum Schema Tests', () => {
  describe('fiveElementSchema', () => {
    it('should accept all Korean five elements', () => {
      const elements = ['목', '화', '토', '금', '수']
      elements.forEach(element => {
        expect(fiveElementSchema.safeParse(element).success).toBe(true)
      })
    })

    it('should reject invalid elements', () => {
      expect(fiveElementSchema.safeParse('wood').success).toBe(false)
      expect(fiveElementSchema.safeParse('fire').success).toBe(false)
    })
  })

  describe('fiveElementEnglishSchema', () => {
    it('should accept all English five elements', () => {
      const elements = ['wood', 'fire', 'earth', 'metal', 'water']
      elements.forEach(element => {
        expect(fiveElementEnglishSchema.safeParse(element).success).toBe(true)
      })
    })
  })

  describe('yinYangSchema', () => {
    it('should accept yin and yang', () => {
      expect(yinYangSchema.safeParse('양').success).toBe(true)
      expect(yinYangSchema.safeParse('음').success).toBe(true)
    })

    it('should reject invalid values', () => {
      expect(yinYangSchema.safeParse('yin').success).toBe(false)
    })
  })

  describe('sibsinKindSchema', () => {
    it('should accept all sibsin types', () => {
      const sibsins = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']
      sibsins.forEach(sibsin => {
        expect(sibsinKindSchema.safeParse(sibsin).success).toBe(true)
      })
    })
  })

  describe('pillarKindSchema', () => {
    it('should accept all pillar types', () => {
      const pillars = ['year', 'month', 'day', 'time']
      pillars.forEach(pillar => {
        expect(pillarKindSchema.safeParse(pillar).success).toBe(true)
      })
    })
  })

  describe('twelveStageSchema', () => {
    it('should accept all twelve stages', () => {
      const stages = ['장생', '목욕', '관대', '임관', '왕지', '쇠', '병', '사', '묘', '절', '태', '양', '건록', '제왕']
      stages.forEach(stage => {
        expect(twelveStageSchema.safeParse(stage).success).toBe(true)
      })
    })
  })
})

describe('Core Data Structure Tests', () => {
  describe('stemBranchInfoSchema', () => {
    it('should accept valid stem branch info', () => {
      expect(stemBranchInfoSchema.safeParse({
        name: '갑',
        element: '목',
        yin_yang: '양',
      }).success).toBe(true)
    })

    it('should accept with optional yinYang', () => {
      expect(stemBranchInfoSchema.safeParse({
        name: '을',
        element: '목',
        yin_yang: '음',
        yinYang: '음',
      }).success).toBe(true)
    })
  })

  describe('ganjiSchema', () => {
    it('should accept valid ganji', () => {
      expect(ganjiSchema.safeParse({
        stem: '갑',
        branch: '자',
      }).success).toBe(true)
    })

    it('should reject empty values', () => {
      expect(ganjiSchema.safeParse({ stem: '', branch: '자' }).success).toBe(false)
      expect(ganjiSchema.safeParse({ stem: '갑', branch: '' }).success).toBe(false)
    })
  })

  describe('pillarGanjiDataSchema', () => {
    it('should accept valid pillar data', () => {
      expect(pillarGanjiDataSchema.safeParse({
        name: '갑',
        element: '목',
        yin_yang: '양',
        sibsin: '비견',
      }).success).toBe(true)
    })

    it('should accept string sibsin', () => {
      expect(pillarGanjiDataSchema.safeParse({
        name: '을',
        element: '목',
        yin_yang: '음',
        sibsin: 'custom-sibsin',
      }).success).toBe(true)
    })
  })

  describe('jijangganDataSchema', () => {
    it('should accept valid jijanggan', () => {
      expect(jijangganDataSchema.safeParse({
        chogi: { name: '갑', sibsin: '비견' },
        junggi: { name: '을', sibsin: '겁재' },
        jeonggi: { name: '병', sibsin: '식신' },
      }).success).toBe(true)
    })

    it('should accept partial jijanggan', () => {
      expect(jijangganDataSchema.safeParse({
        jeonggi: { name: '정', sibsin: '정관' },
      }).success).toBe(true)
    })
  })

  describe('pillarDataSchema', () => {
    const validPillar = {
      heavenlyStem: { name: '갑', element: '목', yin_yang: '양', sibsin: '비견' },
      earthlyBranch: { name: '자', element: '수', yin_yang: '양', sibsin: '편인' },
      jijanggan: { jeonggi: { name: '계', sibsin: '정인' } },
    }

    it('should accept valid pillar', () => {
      expect(pillarDataSchema.safeParse(validPillar).success).toBe(true)
    })
  })

  describe('sajuPillarsSchema', () => {
    const createPillar = () => ({
      heavenlyStem: { name: '갑', element: '목', yin_yang: '양', sibsin: '비견' },
      earthlyBranch: { name: '자', element: '수', yin_yang: '양', sibsin: '편인' },
      jijanggan: {},
    })

    it('should accept valid four pillars', () => {
      expect(sajuPillarsSchema.safeParse({
        year: createPillar(),
        month: createPillar(),
        day: createPillar(),
        time: createPillar(),
      }).success).toBe(true)
    })
  })
})

describe('Fortune Cycle Tests', () => {
  describe('sibsinPairSchema', () => {
    it('should accept valid sibsin pair', () => {
      expect(sibsinPairSchema.safeParse({
        cheon: '식신',
        ji: '편재',
      }).success).toBe(true)
    })
  })

  describe('daeunDataSchema', () => {
    it('should accept valid daeun', () => {
      expect(daeunDataSchema.safeParse({
        heavenlyStem: '갑',
        earthlyBranch: '자',
        sibsin: { cheon: '비견', ji: '편인' },
        age: 10,
      }).success).toBe(true)
    })

    it('should accept optional ganji', () => {
      expect(daeunDataSchema.safeParse({
        heavenlyStem: '을',
        earthlyBranch: '축',
        sibsin: { cheon: '겁재', ji: '정인' },
        age: 20,
        ganji: '을축',
      }).success).toBe(true)
    })
  })

  describe('annualCycleDataSchema', () => {
    it('should accept valid annual cycle', () => {
      expect(annualCycleDataSchema.safeParse({
        year: 2024,
        ganji: '갑진',
        element: '목',
      }).success).toBe(true)
    })
  })

  describe('monthlyCycleDataSchema', () => {
    it('should accept valid monthly cycle', () => {
      expect(monthlyCycleDataSchema.safeParse({
        year: 2024,
        month: 6,
        ganji: '경오',
      }).success).toBe(true)
    })
  })

  describe('iljinDataSchema', () => {
    it('should accept valid iljin', () => {
      expect(iljinDataSchema.safeParse({
        heavenlyStem: '갑',
        earthlyBranch: '자',
        sibsin: { cheon: '비견', ji: '편인' },
        year: 2024,
        month: 6,
        day: 15,
        isCheoneulGwiin: true,
      }).success).toBe(true)
    })
  })
})

describe('Relations & Shinsal Tests', () => {
  describe('relationKindSchema', () => {
    it('should accept all relation kinds', () => {
      const relations = ['천간합', '천간충', '지지육합', '지지삼합', '지지방합', '지지충', '지지형', '지지파', '지지해', '원진', '공망']
      relations.forEach(relation => {
        expect(relationKindSchema.safeParse(relation).success).toBe(true)
      })
    })
  })

  describe('relationHitSchema', () => {
    it('should accept valid relation hit', () => {
      expect(relationHitSchema.safeParse({
        kind: '천간합',
        pillars: ['year', 'day'],
        detail: 'Year and day stems combine',
      }).success).toBe(true)
    })
  })

  describe('shinsalKindSchema', () => {
    it('should accept all shinsal kinds', () => {
      const shinsals = ['장성', '반안', '재살', '천살', '월살', '망신', '역마', '화개', '겁살', '육해', '화해', '괘살', '길성', '흉성']
      shinsals.forEach(shinsal => {
        expect(shinsalKindSchema.safeParse(shinsal).success).toBe(true)
      })
    })
  })

  describe('shinsalHitSchema', () => {
    it('should accept valid shinsal hit', () => {
      expect(shinsalHitSchema.safeParse({
        kind: '역마',
        pillars: ['year'],
        target: 'Career',
        detail: 'Movement and change indicated',
      }).success).toBe(true)
    })

    it('should accept custom shinsal kind', () => {
      expect(shinsalHitSchema.safeParse({
        kind: 'custom-shinsal',
        pillars: ['month'],
      }).success).toBe(true)
    })
  })
})

describe('Five Elements Distribution Tests', () => {
  describe('fiveElementsDistributionSchema', () => {
    it('should accept valid distribution', () => {
      expect(fiveElementsDistributionSchema.safeParse({
        wood: 30,
        fire: 20,
        earth: 20,
        metal: 15,
        water: 15,
      }).success).toBe(true)
    })

    it('should reject negative values', () => {
      expect(fiveElementsDistributionSchema.safeParse({
        wood: -10,
        fire: 20,
        earth: 20,
        metal: 20,
        water: 50,
      }).success).toBe(false)
    })
  })

  describe('fiveElementsKoreanDistributionSchema', () => {
    it('should accept Korean element distribution', () => {
      expect(fiveElementsKoreanDistributionSchema.safeParse({
        목: 25,
        화: 25,
        토: 20,
        금: 15,
        수: 15,
      }).success).toBe(true)
    })
  })
})

describe('Analysis Schema Tests', () => {
  describe('geokgukTypeSchema', () => {
    it('should accept all geokguk types', () => {
      const types = ['건록격', '양인격', '식신격', '상관격', '편재격', '정재격', '편관격', '정관격', '편인격', '정인격', '종격', '화기격', '외격', '잡격']
      types.forEach(type => {
        expect(geokgukTypeSchema.safeParse(type).success).toBe(true)
      })
    })
  })

  describe('geokgukAnalysisSchema', () => {
    it('should accept valid geokguk analysis', () => {
      expect(geokgukAnalysisSchema.safeParse({
        primary: '건록격',
        category: 'standard',
        confidence: 85,
        description: 'Strong day master with building energy',
      }).success).toBe(true)
    })
  })

  describe('yongsinAnalysisSchema', () => {
    it('should accept valid yongsin analysis', () => {
      expect(yongsinAnalysisSchema.safeParse({
        primaryYongsin: '수',
        secondaryYongsin: '금',
        kibsin: '화',
        description: 'Water and metal support needed',
        luckyColors: ['blue', 'white'],
        luckyDirection: 'North',
        luckyNumbers: [1, 6],
      }).success).toBe(true)
    })
  })

  describe('tonggeunAnalysisSchema', () => {
    it('should accept valid tonggeun analysis', () => {
      expect(tonggeunAnalysisSchema.safeParse({
        score: 75,
        details: [
          { pillar: 'year', branch: '인', stems: ['갑'], score: 80 },
          { pillar: 'month', branch: '묘', stems: ['을'], score: 70 },
        ],
      }).success).toBe(true)
    })
  })

  describe('deukryeongAnalysisSchema', () => {
    it('should accept valid deukryeong analysis', () => {
      expect(deukryeongAnalysisSchema.safeParse({
        isDeukryeong: true,
        monthBranch: '인',
        dayMaster: '갑',
        strength: 'strong',
      }).success).toBe(true)
    })

    it('should accept all strength values', () => {
      const strengths = ['strong', 'weak', 'neutral']
      strengths.forEach(strength => {
        expect(deukryeongAnalysisSchema.safeParse({
          isDeukryeong: false,
          monthBranch: '자',
          dayMaster: '갑',
          strength,
        }).success).toBe(true)
      })
    })
  })

  describe('sibsinAnalysisSchema', () => {
    it('should accept valid sibsin analysis', () => {
      expect(sibsinAnalysisSchema.safeParse({
        distribution: { '비견': 20, '겁재': 10, '식신': 15, '상관': 15, '편재': 10, '정재': 10, '편관': 5, '정관': 5, '편인': 5, '정인': 5 },
        dominant: ['비견', '식신'],
        missing: ['편관'],
        balance: 'balanced',
      }).success).toBe(true)
    })
  })

  describe('comprehensiveScoreSchema', () => {
    it('should accept valid score', () => {
      expect(comprehensiveScoreSchema.safeParse({
        overall: 85,
        grade: 'A',
        breakdown: {
          balance: 80,
          strength: 90,
          harmony: 85,
          fortune: 85,
        },
      }).success).toBe(true)
    })

    it('should accept all grades', () => {
      const grades = ['S', 'A', 'B', 'C', 'D', 'F']
      grades.forEach(grade => {
        expect(comprehensiveScoreSchema.safeParse({
          overall: 50,
          grade,
          breakdown: { balance: 50, strength: 50, harmony: 50, fortune: 50 },
        }).success).toBe(true)
      })
    })
  })
})

describe('Advanced Analysis Schema Tests', () => {
  describe('advancedSajuAnalysisSchema', () => {
    it('should accept minimal analysis', () => {
      expect(advancedSajuAnalysisSchema.safeParse({}).success).toBe(true)
    })

    it('should accept full analysis', () => {
      expect(advancedSajuAnalysisSchema.safeParse({
        geokguk: { primary: '건록격', category: 'standard', confidence: 85 },
        yongsin: { primaryYongsin: '수' },
        hyeongchung: { chung: [], hyeong: [], hae: [], hap: [] },
        score: { overall: 85, grade: 'A', breakdown: { balance: 80, strength: 90, harmony: 85, fortune: 85 } },
      }).success).toBe(true)
    })

    it('should accept null values', () => {
      expect(advancedSajuAnalysisSchema.safeParse({
        geokguk: null,
        yongsin: null,
        health: null,
      }).success).toBe(true)
    })
  })
})

describe('Daeun Info Schema Tests', () => {
  describe('daeunInfoSchema', () => {
    it('should accept valid daeun info', () => {
      expect(daeunInfoSchema.safeParse({
        startAge: 5,
        isForward: true,
        list: [
          { heavenlyStem: '갑', earthlyBranch: '자', sibsin: { cheon: '비견', ji: '편인' }, age: 5 },
        ],
      }).success).toBe(true)
    })
  })
})

describe('Saju Result Schema Tests', () => {
  describe('sajuResultSchema', () => {
    const createPillar = () => ({
      heavenlyStem: { name: '갑', element: '목', yin_yang: '양', sibsin: '비견' },
      earthlyBranch: { name: '자', element: '수', yin_yang: '양', sibsin: '편인' },
      jijanggan: {},
    })

    it('should accept valid saju result', () => {
      expect(sajuResultSchema.safeParse({
        yearPillar: createPillar(),
        monthPillar: createPillar(),
        dayPillar: createPillar(),
        timePillar: createPillar(),
        dayMaster: { name: '갑', element: '목', yin_yang: '양' },
        fiveElements: { wood: 25, fire: 20, earth: 20, metal: 20, water: 15 },
      }).success).toBe(true)
    })
  })
})

describe('Chat Context Schema Tests', () => {
  describe('sajuChatContextSchema', () => {
    it('should accept valid chat context', () => {
      expect(sajuChatContextSchema.safeParse({
        dayMaster: '갑',
        dayMasterElement: '목',
        pillars: {
          year: { stem: '갑', branch: '자' },
          month: { stem: '을', branch: '축' },
        },
        yongsin: { primary: '수' },
        geokguk: '건록격',
      }).success).toBe(true)
    })

    it('should accept minimal context', () => {
      expect(sajuChatContextSchema.safeParse({
        dayMaster: '갑',
      }).success).toBe(true)
    })
  })

  describe('twelveStagesRecordSchema', () => {
    it('should accept valid twelve stages record', () => {
      expect(twelveStagesRecordSchema.safeParse({
        year: '장생',
        month: '목욕',
        day: '관대',
        time: '임관',
      }).success).toBe(true)
    })

    it('should accept all valid twelve stage values', () => {
      // z.record(pillarKindSchema, ...) requires all pillar keys
      expect(twelveStagesRecordSchema.safeParse({
        year: '왕지',
        month: '쇠',
        day: '병',
        time: '사',
      }).success).toBe(true)
    })
  })
})
