/**
 * Saju Domain Zod Schemas
 * Type-safe validation for all Saju-related data structures
 */

import { z } from 'zod'

// ============ Core Enums ============

export const fiveElementSchema = z.enum(['목', '화', '토', '금', '수'])
export type FiveElementValidated = z.infer<typeof fiveElementSchema>

export const fiveElementEnglishSchema = z.enum(['wood', 'fire', 'earth', 'metal', 'water'])
export type FiveElementEnglishValidated = z.infer<typeof fiveElementEnglishSchema>

export const yinYangSchema = z.enum(['양', '음'])
export type YinYangValidated = z.infer<typeof yinYangSchema>

export const sibsinKindSchema = z.enum([
  '비견', '겁재',
  '식신', '상관',
  '편재', '정재',
  '편관', '정관',
  '편인', '정인',
])
export type SibsinKindValidated = z.infer<typeof sibsinKindSchema>

export const pillarKindSchema = z.enum(['year', 'month', 'day', 'time'])
export type PillarKindValidated = z.infer<typeof pillarKindSchema>

export const twelveStageSchema = z.enum([
  '장생', '목욕', '관대', '임관', '왕지',
  '쇠', '병', '사', '묘', '절', '태', '양',
  '건록', '제왕',
])
export type TwelveStageValidated = z.infer<typeof twelveStageSchema>

// ============ Core Data Structures ============

export const stemBranchInfoSchema = z.object({
  name: z.string().min(1).max(10),
  element: fiveElementSchema,
  yin_yang: yinYangSchema,
  yinYang: yinYangSchema.optional(),
})
export type StemBranchInfoValidated = z.infer<typeof stemBranchInfoSchema>

export const dayMasterSchema = stemBranchInfoSchema
export type DayMasterValidated = z.infer<typeof dayMasterSchema>

export const ganjiSchema = z.object({
  stem: z.string().min(1).max(4),
  branch: z.string().min(1).max(4),
})
export type GanjiValidated = z.infer<typeof ganjiSchema>

// ============ Pillar Structures ============

export const pillarGanjiDataSchema = z.object({
  name: z.string().min(1).max(10),
  element: fiveElementSchema,
  yin_yang: yinYangSchema,
  sibsin: z.union([sibsinKindSchema, z.string().max(20)]),
})
export type PillarGanjiDataValidated = z.infer<typeof pillarGanjiDataSchema>

export const jijangganSlotSchema = z.object({
  name: z.string().max(10).optional(),
  sibsin: z.union([sibsinKindSchema, z.string().max(20)]).optional(),
})
export type JijangganSlotValidated = z.infer<typeof jijangganSlotSchema>

export const jijangganDataSchema = z.object({
  chogi: jijangganSlotSchema.optional(),
  junggi: jijangganSlotSchema.optional(),
  jeonggi: jijangganSlotSchema.optional(),
})
export type JijangganDataValidated = z.infer<typeof jijangganDataSchema>

export const pillarDataSchema = z.object({
  heavenlyStem: pillarGanjiDataSchema,
  earthlyBranch: pillarGanjiDataSchema,
  jijanggan: jijangganDataSchema,
})
export type PillarDataValidated = z.infer<typeof pillarDataSchema>

export const sajuPillarsSchema = z.object({
  year: pillarDataSchema,
  month: pillarDataSchema,
  day: pillarDataSchema,
  time: pillarDataSchema,
})
export type SajuPillarsValidated = z.infer<typeof sajuPillarsSchema>

// ============ Fortune Cycles ============

export const sibsinPairSchema = z.object({
  cheon: z.union([sibsinKindSchema, z.string().max(20)]),
  ji: z.union([sibsinKindSchema, z.string().max(20)]),
})
export type SibsinPairValidated = z.infer<typeof sibsinPairSchema>

export const unseDataSchema = z.object({
  heavenlyStem: z.string().min(1).max(4),
  earthlyBranch: z.string().min(1).max(4),
  sibsin: sibsinPairSchema,
})
export type UnseDataValidated = z.infer<typeof unseDataSchema>

export const daeunDataSchema = unseDataSchema.extend({
  age: z.number().int().min(0).max(150),
  ganji: z.string().max(10).optional(),
})
export type DaeunDataValidated = z.infer<typeof daeunDataSchema>

export const annualCycleDataSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  ganji: z.string().max(10).optional(),
  heavenlyStem: z.string().max(4).optional(),
  earthlyBranch: z.string().max(4).optional(),
  element: fiveElementSchema.optional(),
  sibsin: sibsinPairSchema.optional(),
})
export type AnnualCycleDataValidated = z.infer<typeof annualCycleDataSchema>

export const monthlyCycleDataSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12),
  ganji: z.string().max(10).optional(),
  heavenlyStem: z.string().max(4).optional(),
  earthlyBranch: z.string().max(4).optional(),
  element: fiveElementSchema.optional(),
  sibsin: sibsinPairSchema.optional(),
})
export type MonthlyCycleDataValidated = z.infer<typeof monthlyCycleDataSchema>

export const iljinDataSchema = unseDataSchema.extend({
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  isCheoneulGwiin: z.boolean(),
  ganji: z.string().max(10).optional(),
})
export type IljinDataValidated = z.infer<typeof iljinDataSchema>

// ============ Relations & Shinsal ============

export const relationKindSchema = z.enum([
  '천간합', '천간충',
  '지지육합', '지지삼합', '지지방합',
  '지지충', '지지형', '지지파', '지지해', '원진',
  '공망',
])
export type RelationKindValidated = z.infer<typeof relationKindSchema>

export const relationHitSchema = z.object({
  kind: relationKindSchema,
  pillars: z.array(pillarKindSchema),
  detail: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
})
export type RelationHitValidated = z.infer<typeof relationHitSchema>

export const shinsalKindSchema = z.enum([
  '장성', '반안', '재살', '천살', '월살', '망신',
  '역마', '화개', '겁살', '육해', '화해', '괘살',
  '길성', '흉성',
])
export type ShinsalKindValidated = z.infer<typeof shinsalKindSchema>

export const shinsalHitSchema = z.object({
  kind: z.union([shinsalKindSchema, z.string().max(20)]),
  pillars: z.array(pillarKindSchema),
  target: z.string().max(50).optional(),
  detail: z.string().max(500).optional(),
})
export type ShinsalHitValidated = z.infer<typeof shinsalHitSchema>

// ============ Five Elements Distribution ============

export const fiveElementsDistributionSchema = z.object({
  wood: z.number().min(0).max(100),
  fire: z.number().min(0).max(100),
  earth: z.number().min(0).max(100),
  metal: z.number().min(0).max(100),
  water: z.number().min(0).max(100),
})
export type FiveElementsDistributionValidated = z.infer<typeof fiveElementsDistributionSchema>

export const fiveElementsKoreanDistributionSchema = z.object({
  목: z.number().min(0).max(100),
  화: z.number().min(0).max(100),
  토: z.number().min(0).max(100),
  금: z.number().min(0).max(100),
  수: z.number().min(0).max(100),
})
export type FiveElementsKoreanDistributionValidated = z.infer<typeof fiveElementsKoreanDistributionSchema>

// ============ Saju Facts (Summary) ============

export const sajuFactsSchema = z.object({
  dayMaster: z.string().min(1).max(10),
  sibsin: z.array(z.union([sibsinKindSchema, z.string().max(20)])),
  shinsal: z.array(z.string().max(50)),
  elementStats: z.record(fiveElementSchema, z.number()).optional(),
  yinYangRatio: z.object({
    yin: z.number().min(0).max(100),
    yang: z.number().min(0).max(100),
  }).optional(),
  unse: z.object({
    대운: z.string().max(20).optional(),
    세운: z.string().max(20).optional(),
    월운: z.string().max(20).optional(),
    일운: z.string().max(20).optional(),
  }).optional(),
  relations: z.object({
    합충형: z.string().max(200).optional(),
    관성관계: z.string().max(200).optional(),
    기타: z.string().max(200).optional(),
  }).optional(),
  fateIndex: z.number().min(0).max(100).optional(),
})
export type SajuFactsValidated = z.infer<typeof sajuFactsSchema>

// ============ Advanced Analysis Schemas ============

export const geokgukTypeSchema = z.enum([
  '건록격', '양인격', '식신격', '상관격',
  '편재격', '정재격', '편관격', '정관격',
  '편인격', '정인격', '종격', '화기격',
  '외격', '잡격',
])
export type GeokgukTypeValidated = z.infer<typeof geokgukTypeSchema>

export const geokgukAnalysisSchema = z.object({
  primary: z.string().max(50),
  category: z.string().max(50),
  confidence: z.number().min(0).max(100),
  description: z.string().max(2000).optional(),
})
export type GeokgukAnalysisValidated = z.infer<typeof geokgukAnalysisSchema>

export const yongsinAnalysisSchema = z.object({
  primaryYongsin: fiveElementSchema,
  secondaryYongsin: fiveElementSchema.optional(),
  kibsin: fiveElementSchema.optional(),
  description: z.string().max(2000).optional(),
  luckyColors: z.array(z.string().max(30)).optional(),
  luckyDirection: z.string().max(30).optional(),
  luckyNumbers: z.array(z.number().int().min(0).max(99)).optional(),
})
export type YongsinAnalysisValidated = z.infer<typeof yongsinAnalysisSchema>

export const tonggeunAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  details: z.array(z.object({
    pillar: z.string().max(20),
    branch: z.string().max(10),
    stems: z.array(z.string().max(10)),
    score: z.number().min(0).max(100),
  })),
})
export type TonggeunAnalysisValidated = z.infer<typeof tonggeunAnalysisSchema>

export const deukryeongAnalysisSchema = z.object({
  isDeukryeong: z.boolean(),
  monthBranch: z.string().max(10),
  dayMaster: z.string().max(10),
  strength: z.enum(['strong', 'weak', 'neutral']),
})
export type DeukryeongAnalysisValidated = z.infer<typeof deukryeongAnalysisSchema>

export const sibsinDistributionSchema = z.record(
  z.union([sibsinKindSchema, z.string().max(20)]),
  z.number().min(0).max(100)
)
export type SibsinDistributionValidated = z.infer<typeof sibsinDistributionSchema>

export const sibsinAnalysisSchema = z.object({
  distribution: sibsinDistributionSchema,
  dominant: z.array(sibsinKindSchema),
  missing: z.array(sibsinKindSchema),
  balance: z.enum(['balanced', 'imbalanced', 'extreme']),
})
export type SibsinAnalysisValidated = z.infer<typeof sibsinAnalysisSchema>

export const hyeongchungItemSchema = z.object({
  branches: z.array(z.string().max(10)),
  type: z.string().max(30),
})
export type HyeongchungItemValidated = z.infer<typeof hyeongchungItemSchema>

export const hyeongchungAnalysisSchema = z.object({
  chung: z.array(hyeongchungItemSchema),
  hyeong: z.array(hyeongchungItemSchema),
  hae: z.array(hyeongchungItemSchema),
  hap: z.array(hyeongchungItemSchema),
})
export type HyeongchungAnalysisValidated = z.infer<typeof hyeongchungAnalysisSchema>

export const comprehensiveScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  grade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']),
  breakdown: z.object({
    balance: z.number().min(0).max(100),
    strength: z.number().min(0).max(100),
    harmony: z.number().min(0).max(100),
    fortune: z.number().min(0).max(100),
  }),
})
export type ComprehensiveScoreValidated = z.infer<typeof comprehensiveScoreSchema>

// ============ Full Advanced Analysis ============

export const advancedSajuAnalysisSchema = z.object({
  geokguk: geokgukAnalysisSchema.nullable().optional(),
  yongsin: yongsinAnalysisSchema.nullable().optional(),
  hyeongchung: hyeongchungAnalysisSchema.nullable().optional(),
  tonggeun: tonggeunAnalysisSchema.nullable().optional(),
  deukryeong: deukryeongAnalysisSchema.nullable().optional(),
  johuYongsin: z.object({
    primary: z.string().max(50),
    secondary: z.string().max(50).optional(),
    description: z.string().max(2000),
  }).nullable().optional(),
  sibsin: sibsinAnalysisSchema.nullable().optional(),
  health: z.object({
    vulnerableOrgans: z.array(z.string().max(50)),
    strengths: z.array(z.string().max(200)),
    recommendations: z.array(z.string().max(500)),
    overallScore: z.number().min(0).max(100),
  }).nullable().optional(),
  career: z.object({
    suitableFields: z.array(z.string().max(100)),
    strengths: z.array(z.string().max(200)),
    challenges: z.array(z.string().max(200)),
    recommendations: z.array(z.string().max(500)),
  }).nullable().optional(),
  score: comprehensiveScoreSchema.nullable().optional(),
  report: z.object({
    summary: z.string().max(5000),
    personality: z.string().max(5000),
    career: z.string().max(5000),
    relationships: z.string().max(5000),
    health: z.string().max(5000),
    fortune: z.string().max(5000),
  }).nullable().optional(),
  interpretations: z.object({
    twelveStages: z.record(z.string(), z.string().max(1000)),
    elements: z.record(z.string(), z.string().max(1000)),
  }).nullable().optional(),
})
export type AdvancedSajuAnalysisValidated = z.infer<typeof advancedSajuAnalysisSchema>

// ============ Daeun (Fortune Cycles) Schema ============

export const daeunInfoSchema = z.object({
  startAge: z.number().int().min(0).max(20),
  isForward: z.boolean(),
  current: daeunDataSchema.nullable().optional(),
  list: z.array(daeunDataSchema),
  cycles: z.array(daeunDataSchema).optional(),
})
export type DaeunInfoValidated = z.infer<typeof daeunInfoSchema>

// ============ Complete Saju Result Schema ============

export const sajuResultSchema = z.object({
  // Pillar data
  yearPillar: pillarDataSchema,
  monthPillar: pillarDataSchema,
  dayPillar: pillarDataSchema,
  timePillar: pillarDataSchema,
  pillars: sajuPillarsSchema.optional(),

  // Core analysis
  dayMaster: stemBranchInfoSchema,
  fiveElements: fiveElementsDistributionSchema,

  // Fortune cycles
  daeun: daeunInfoSchema.optional(),
  daeWoon: daeunInfoSchema.optional(),
  yeonun: z.array(annualCycleDataSchema).optional(),
  wolun: z.array(monthlyCycleDataSchema).optional(),
  iljin: z.array(iljinDataSchema).optional(),
  unse: z.object({
    daeun: z.array(daeunDataSchema),
    annual: z.array(annualCycleDataSchema),
    monthly: z.array(monthlyCycleDataSchema),
  }).optional(),

  // Relations and shinsal
  relations: z.array(relationHitSchema).optional(),
  shinsal: z.array(shinsalHitSchema).optional(),
  shinsalRaw: z.array(shinsalHitSchema).optional(),

  // Advanced analysis
  advancedAnalysis: advancedSajuAnalysisSchema.nullable().optional(),

  // Metadata
  birthYear: z.number().int().optional(),
  birthDate: z.string().optional(),
  analysisDate: z.string().optional(),
  userTimezone: z.string().max(64).optional(),
  isPremium: z.boolean().optional(),
  isLoggedIn: z.boolean().optional(),
})
export type SajuResultValidated = z.infer<typeof sajuResultSchema>

// ============ Simplified Chat Context Schema ============

export const sajuChatContextSchema = z.object({
  dayMaster: z.string().max(10).optional(),
  dayMasterElement: fiveElementSchema.optional(),
  pillars: z.object({
    year: ganjiSchema.optional(),
    month: ganjiSchema.optional(),
    day: ganjiSchema.optional(),
    time: ganjiSchema.optional(),
  }).optional(),
  fiveElements: fiveElementsDistributionSchema.optional(),
  yongsin: z.object({
    primary: fiveElementSchema.optional(),
    secondary: fiveElementSchema.optional(),
  }).optional(),
  geokguk: z.string().max(50).optional(),
  currentDaeun: z.string().max(20).optional(),
  currentSaeun: z.string().max(20).optional(),
})
export type SajuChatContextValidated = z.infer<typeof sajuChatContextSchema>

// ============ Twelve Stages Interaction Schema ============

export const twelveStagesRecordSchema = z.record(
  pillarKindSchema,
  z.union([twelveStageSchema, z.string().max(20)])
)
export type TwelveStagesRecordValidated = z.infer<typeof twelveStagesRecordSchema>
