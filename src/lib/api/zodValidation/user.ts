/**
 * User, Auth, Profile, Notification & Feedback Schemas
 */

import { z } from 'zod'
import {
  dateSchema,
  timeSchema,
  timezoneSchema,
  genderSchema,
  localeSchema,
  chatMessageSchema,
  paginationQuerySchema,
} from './common'
import {
  sajuChatContextSchema,
  sajuPillarsSchema,
  fiveElementsDistributionSchema,
} from './domains/saju-domain'
import {
  astrologyChartFactsSchema,
  planetHousesSchema,
  planetSignsSchema,
} from './domains/astro-domain'

// ============ Auth Schemas ============

export const userRegistrationRequestSchema = z.object({
  email: z.string().email().max(254).trim(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).trim().optional(),
  referralCode: z.string().max(50).trim().optional(),
})

export type UserRegistrationRequestValidated = z.infer<typeof userRegistrationRequestSchema>

// ============ User Profile Schemas ============

export const notificationSettingsSchema = z.object({
  dailyFortune: z.boolean().optional(),
  weeklyFortune: z.boolean().optional(),
  monthlyFortune: z.boolean().optional(),
  specialEvents: z.boolean().optional(),
  promotions: z.boolean().optional(),
  preferredTime: z
    .string()
    .regex(/^([01]?\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  timezone: timezoneSchema.optional(),
})

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  image: z.string().url().max(500).optional().nullable(),
  emailNotifications: z.boolean().optional(),
  preferredLanguage: localeSchema.optional(),
  notificationSettings: notificationSettingsSchema.optional(),
  tonePreference: z.enum(['formal', 'casual', 'mystical', 'friendly']).optional(),
  readingLength: z.enum(['brief', 'moderate', 'detailed']).optional(),
  birthDate: dateSchema.optional().nullable(),
  birthTime: timeSchema.optional().nullable(),
  gender: genderSchema.optional().nullable(),
  birthCity: z.string().max(200).trim().optional().nullable(),
  tzId: timezoneSchema.optional().nullable(),
})

export type UserProfileUpdateValidated = z.infer<typeof userProfileUpdateSchema>

export const userBirthInfoUpdateSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional().nullable(),
  gender: genderSchema.optional().nullable(),
  birthCity: z.string().max(200).trim().optional().nullable(),
  tzId: timezoneSchema.optional().nullable(),
})

export type UserBirthInfoUpdateValidated = z.infer<typeof userBirthInfoUpdateSchema>

// ============ Persona Memory Schemas ============

export const birthChartMemorySchema = z.object({
  sunSign: z.string().max(30).optional(),
  moonSign: z.string().max(30).optional(),
  ascendant: z.string().max(30).optional(),
  dominantElement: z.enum(['fire', 'earth', 'air', 'water']).optional(),
  dominantModality: z.enum(['cardinal', 'fixed', 'mutable']).optional(),
  planetHouses: planetHousesSchema.optional(),
})

export const sajuProfileMemorySchema = z.object({
  dayMaster: z.string().max(10).optional(),
  dayMasterElement: z.enum(['목', '화', '토', '금', '수']).optional(),
  dominantElement: z.enum(['목', '화', '토', '금', '수']).optional(),
  yongsin: z.string().max(10).optional(),
  geokguk: z.string().max(50).optional(),
  pillars: z
    .object({
      year: z.object({ stem: z.string().max(4), branch: z.string().max(4) }).optional(),
      month: z.object({ stem: z.string().max(4), branch: z.string().max(4) }).optional(),
      day: z.object({ stem: z.string().max(4), branch: z.string().max(4) }).optional(),
      time: z.object({ stem: z.string().max(4), branch: z.string().max(4) }).optional(),
    })
    .optional(),
})

export const personaMemoryPostSchema = z.object({
  dominantThemes: z.array(z.string().max(200)).max(50).optional(),
  keyInsights: z.array(z.string().max(1000)).max(50).optional(),
  emotionalTone: z
    .enum(['positive', 'negative', 'neutral', 'mixed', 'anxious', 'hopeful'])
    .optional(),
  growthAreas: z.array(z.string().max(200)).max(50).optional(),
  lastTopics: z.array(z.string().max(200)).max(50).optional(),
  recurringIssues: z.array(z.string().max(500)).max(50).optional(),
  birthChart: birthChartMemorySchema.optional(),
  sajuProfile: sajuProfileMemorySchema.optional(),
})

export const personaMemoryPatchDataSchema = z.object({
  insight: z.string().max(1000).optional(),
  growthArea: z.string().max(200).optional(),
  recurringIssue: z.string().max(500).optional(),
  emotionalTone: z
    .enum(['positive', 'negative', 'neutral', 'mixed', 'anxious', 'hopeful'])
    .optional(),
  birthChart: birthChartMemorySchema.optional(),
  sajuProfile: sajuProfileMemorySchema.optional(),
})

export const personaMemoryPatchSchema = z.object({
  action: z.enum([
    'add_insight',
    'add_growth_area',
    'add_recurring_issue',
    'update_emotional_tone',
    'increment_session',
    'update_birth_chart',
    'update_saju_profile',
  ]),
  data: personaMemoryPatchDataSchema.optional(),
})

export const personaMemoryUpdateSchema = z.object({
  sessionId: z.string().min(1).max(200).trim(),
  theme: z.string().min(1).max(100).trim(),
  locale: localeSchema,
  messages: z.array(chatMessageSchema).min(1).max(200),
  saju: sajuChatContextSchema.optional(),
  astro: z
    .object({
      sunSign: z.string().max(30).optional(),
      moonSign: z.string().max(30).optional(),
      ascendant: z.string().max(30).optional(),
      dominantElement: z.enum(['fire', 'earth', 'air', 'water']).optional(),
    })
    .optional(),
})

export type PersonaMemoryUpdateValidated = z.infer<typeof personaMemoryUpdateSchema>

// ============ Notification Schemas ============

export const notificationSendRequestSchema = z.object({
  userId: z.string().max(100).optional(),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
  link: z.string().max(500).url().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
})

export type NotificationSendRequestValidated = z.infer<typeof notificationSendRequestSchema>

export const notificationSendSchema = z.object({
  targetUserId: z.string().min(1).max(200),
  type: z.enum(['like', 'comment', 'reply', 'mention', 'system']),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  link: z.string().max(500).optional(),
  avatar: z.string().max(500).optional(),
})

export const pushSendRequestSchema = z.object({
  targetUserId: z.string().max(200).optional(),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  icon: z.string().max(500).optional(),
  url: z.string().max(500).optional(),
  tag: z.string().max(100).optional(),
  test: z.boolean().optional(),
})

export type PushSendRequestValidated = z.infer<typeof pushSendRequestSchema>

export const pushSubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
})

export type PushSubscribeValidated = z.infer<typeof pushSubscribeSchema>

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2000),
})

export type PushUnsubscribeValidated = z.infer<typeof pushUnsubscribeSchema>

// ============ Feedback Schemas ============

export const feedbackRequestSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  subject: z.string().min(1).max(200).trim(),
  message: z.string().min(10).max(5000).trim(),
  email: z.string().email().max(254).optional(),
  page: z.string().max(500).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

export type FeedbackRequestValidated = z.infer<typeof feedbackRequestSchema>

export const sectionFeedbackRequestSchema = z.object({
  service: z.string().min(1).max(64).trim(),
  theme: z.string().min(1).max(64).trim(),
  sectionId: z.string().min(1).max(80).trim(),
  helpful: z.boolean(),
  dayMaster: z.string().max(32).trim().optional(),
  sunSign: z.string().max(32).trim().optional(),
  locale: localeSchema.optional(),
  userHash: z.string().max(128).trim().optional(),
  recordId: z.string().max(120).trim().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  feedbackText: z.string().max(600).trim().optional(),
  userQuestion: z.string().max(600).trim().optional(),
  consultationSummary: z.string().max(600).trim().optional(),
  contextUsed: z.string().max(600).trim().optional(),
})

export type SectionFeedbackRequestValidated = z.infer<typeof sectionFeedbackRequestSchema>

export const feedbackGetQuerySchema = z.object({
  service: z.string().max(50).optional(),
  theme: z.string().max(50).optional(),
})

export const feedbackRecordsQuerySchema = z.object({
  service: z.string().optional(),
  theme: z.string().optional(),
  helpful: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// ============ Personality & ICP Schemas ============

export const personalityAnalysisDataSchema = z.object({
  description: z.string().max(5000),
  descriptionKo: z.string().max(5000).optional(),
  strengths: z.array(z.string().max(500)),
  strengthsKo: z.array(z.string().max(500)).optional(),
  weaknesses: z.array(z.string().max(500)).optional(),
  weaknessesKo: z.array(z.string().max(500)).optional(),
  compatibleTypes: z.array(z.string().max(20)).optional(),
  careerSuggestions: z.array(z.string().max(200)).optional(),
})

export const personalityAnswersSchema = z.record(
  z.string().max(50),
  z.union([z.number().min(1).max(5), z.string().max(100)])
)

export const personalitySaveRequestSchema = z.object({
  typeCode: z
    .string()
    .regex(/^[RG][VS][LH][AF]$/, 'Invalid typeCode format: expected [R|G][V|S][L|H][A|F]'),
  personaName: z.string().min(1).max(100).trim(),
  avatarGender: z.enum(['M', 'F']),
  energyScore: z.number().min(0).max(100),
  cognitionScore: z.number().min(0).max(100),
  decisionScore: z.number().min(0).max(100),
  rhythmScore: z.number().min(0).max(100),
  consistencyScore: z.number().min(0).max(100).nullable().optional(),
  analysisData: personalityAnalysisDataSchema,
  answers: personalityAnswersSchema.optional(),
})

export type PersonalitySaveRequestValidated = z.infer<typeof personalitySaveRequestSchema>

export const icpOctantSchema = z.enum(['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'])

export const icpScoreSchema = z.object({
  primaryStyle: z.string().max(50),
  secondaryStyle: z.string().max(50).nullable().optional(),
  dominanceScore: z.number().min(-100).max(100),
  affiliationScore: z.number().min(-100).max(100),
  octantScores: z.record(z.string(), z.number()).optional(),
})

export const personaTypeSchema = z.object({
  typeCode: z.string().max(10),
  personaName: z.string().max(100),
  energyScore: z.number().min(0).max(100),
  cognitionScore: z.number().min(0).max(100),
  decisionScore: z.number().min(0).max(100),
  rhythmScore: z.number().min(0).max(100),
})

export const icpOctantScoresSchema = z.record(icpOctantSchema, z.number().min(0).max(100))

export const icpAnalysisDataSchema = z.object({
  description: z.string().max(5000).optional(),
  descriptionKo: z.string().max(5000).optional(),
  summary: z.string().max(5000).optional(),
  summaryKo: z.string().max(5000).optional(),
  strengths: z.array(z.string().max(500)).optional(),
  strengthsKo: z.array(z.string().max(500)).optional(),
  challenges: z.array(z.string().max(500)).optional(),
  challengesKo: z.array(z.string().max(500)).optional(),
  tips: z.array(z.string().max(500)).optional(),
  tipsKo: z.array(z.string().max(500)).optional(),
  relationshipStyle: z.string().max(2000).optional(),
  workStyle: z.string().max(2000).optional(),
  explainability: z
    .object({
      topAxes: z
        .array(
          z.object({
            axis: z.string().max(50),
            score: z.number(),
            interpretation: z.string().max(500),
          })
        )
        .optional(),
      lowAxes: z
        .array(
          z.object({
            axis: z.string().max(50),
            score: z.number(),
            interpretation: z.string().max(500),
          })
        )
        .optional(),
      evidence: z
        .array(
          z.object({
            questionId: z.string().max(100),
            axis: z.string().max(50),
            answer: z.number(),
            reverse: z.boolean(),
            reason: z.string().max(500),
          })
        )
        .optional(),
      note: z.string().max(1000).optional(),
    })
    .optional(),
  compatibleStyles: z.array(icpOctantSchema).optional(),
})

export const icpAnswersSchema = z.record(
  z.string().max(50),
  z.union([z.number().min(1).max(7), z.string().max(100)])
)

export const icpSaveRequestSchema = z.object({
  primaryStyle: icpOctantSchema,
  secondaryStyle: icpOctantSchema.nullable().optional(),
  dominanceScore: z.number().min(-100).max(100),
  affiliationScore: z.number().min(-100).max(100),
  octantScores: icpOctantScoresSchema,
  analysisData: icpAnalysisDataSchema,
  answers: icpAnswersSchema.optional(),
  testVersion: z.string().max(50).optional(),
  resultId: z.string().max(100).optional(),
  confidence: z.number().min(0).max(100).optional(),
  axes: z.record(z.string().max(30), z.number().min(0).max(100)).optional(),
  completionSeconds: z.number().int().min(0).max(36000).optional(),
  missingAnswerCount: z.number().int().min(0).max(200).optional(),
  locale: localeSchema.optional(),
})

export type ICPSaveRequestValidated = z.infer<typeof icpSaveRequestSchema>

export const icpSaveSchema = z.object({
  primaryStyle: icpOctantSchema,
  secondaryStyle: icpOctantSchema.optional(),
  dominanceScore: z.number().min(-100).max(100),
  affiliationScore: z.number().min(-100).max(100),
  octantScores: icpOctantScoresSchema.optional(),
  analysisData: icpAnalysisDataSchema.optional(),
  answers: icpAnswersSchema.optional(),
  testVersion: z.string().max(50).optional(),
  resultId: z.string().max(100).optional(),
  confidence: z.number().min(0).max(100).optional(),
  axes: z.record(z.string().max(30), z.number().min(0).max(100)).optional(),
  completionSeconds: z.number().int().min(0).max(36000).optional(),
  missingAnswerCount: z.number().int().min(0).max(200).optional(),
  locale: localeSchema.optional(),
})

export type IcpSaveValidated = z.infer<typeof icpSaveSchema>

export const personalityCompatibilityPersonSchema = z.object({
  userId: z.string().max(100).optional(),
  name: z.string().max(120).optional(),
  icp: icpScoreSchema,
  persona: personaTypeSchema,
  icpAnswers: icpAnswersSchema.optional(),
  personaAnswers: personalityAnswersSchema.optional(),
})

export const personalityCompatibilitySaveRequestSchema = z.object({
  person1: personalityCompatibilityPersonSchema,
  person2: personalityCompatibilityPersonSchema,
  compatibility: z.object({
    icpScore: z.number().min(0).max(100),
    icpLevel: z.string().max(50),
    icpLevelKo: z.string().max(50).optional(),
    icpDescription: z.string().max(2000),
    icpDescriptionKo: z.string().max(2000).optional(),
    personaScore: z.number().min(0).max(100),
    personaLevel: z.string().max(50),
    personaLevelKo: z.string().max(50).optional(),
    personaDescription: z.string().max(2000),
    personaDescriptionKo: z.string().max(2000).optional(),
    crossSystemScore: z.number().min(0).max(100),
    crossSystemLevel: z.string().max(50),
    crossSystemLevelKo: z.string().max(50).optional(),
    crossSystemDescription: z.string().max(2000),
    crossSystemDescriptionKo: z.string().max(2000).optional(),
    synergies: z.array(z.string().max(500)).optional(),
    synergiesKo: z.array(z.string().max(500)).optional(),
    tensions: z.array(z.string().max(500)).optional(),
    tensionsKo: z.array(z.string().max(500)).optional(),
    insights: z.array(z.string().max(500)).optional(),
    insightsKo: z.array(z.string().max(500)).optional(),
  }),
  locale: localeSchema.optional(),
})

export type PersonalityCompatibilitySaveRequestValidated = z.infer<
  typeof personalityCompatibilitySaveRequestSchema
>

export const personalityCompatibilitySchema = z.object({
  person1: z.object({
    typeCode: z.string().min(1).max(10),
    personaName: z.string().max(100).optional(),
    energyScore: z.number().min(0).max(100),
    cognitionScore: z.number().min(0).max(100),
    decisionScore: z.number().min(0).max(100),
    rhythmScore: z.number().min(0).max(100),
  }),
  person2: z.object({
    typeCode: z.string().min(1).max(10),
    personaName: z.string().max(100).optional(),
    energyScore: z.number().min(0).max(100),
    cognitionScore: z.number().min(0).max(100),
    decisionScore: z.number().min(0).max(100),
    rhythmScore: z.number().min(0).max(100),
  }),
  locale: localeSchema.optional(),
})

export type PersonalityCompatibilityValidated = z.infer<typeof personalityCompatibilitySchema>

export const personalityIcpSaveGetQuerySchema = z.object({
  id: z.string().max(100).optional(),
})

export const personalityCompatibilitySaveGetQuerySchema = z.object({
  id: z.string().max(100).optional(),
})

export const icpRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  gender: genderSchema.optional(),
  locale: localeSchema.optional(),
  analysisType: z.string().max(50).optional(),
})

export type IcpRequestValidated = z.infer<typeof icpRequestSchema>

// ============ Consultation Schemas ============

export const jungQuoteSchema = z.object({
  quote: z.string().max(2000),
  source: z.string().max(200).optional(),
  archetype: z.string().max(100).optional(),
  relevance: z.string().max(500).optional(),
})

export const consultationSignalSchema = z.object({
  type: z.enum(['positive', 'negative', 'neutral', 'warning', 'opportunity']),
  category: z.enum(['career', 'love', 'health', 'wealth', 'spiritual', 'general']).optional(),
  message: z.string().max(500),
  strength: z.number().min(0).max(100).optional(),
})

export const consultationSaveSchema = z.object({
  theme: z.string().max(100).trim().optional(),
  summary: z.string().max(3000).trim().optional(),
  fullReport: z.string().max(30000).optional(),
  jungQuotes: z.array(jungQuoteSchema).max(10).optional(),
  signals: z.array(consultationSignalSchema).max(20).optional(),
  userQuestion: z.string().max(1000).trim().optional(),
  locale: localeSchema.optional(),
})

export type ConsultationSaveValidated = z.infer<typeof consultationSaveSchema>

export const consultationGetQuerySchema = z.object({
  theme: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// ============ Chat History & Counselor Schemas ============

export const chatHistorySaveRequestSchema = z.object({
  sessionId: z.string().max(100),
  theme: z.string().max(100).optional(),
  messages: z.array(chatMessageSchema).min(1).max(100),
  summary: z.string().max(1000).optional(),
  keyTopics: z.array(z.string().max(100)).max(20).optional(),
  locale: localeSchema.optional(),
})

export type ChatHistorySaveRequestValidated = z.infer<typeof chatHistorySaveRequestSchema>

export const counselorSessionSaveRequestSchema = z.object({
  sessionId: z.string().min(1).max(100).trim(),
  theme: z.string().max(100).trim().optional(),
  messages: z.array(chatMessageSchema).min(1).max(200),
  locale: localeSchema.optional(),
})

export type CounselorSessionSaveRequestValidated = z.infer<typeof counselorSessionSaveRequestSchema>

export const counselorSessionLoadQuerySchema = z.object({
  theme: z.string().max(50).optional().default('chat'),
  sessionId: z.string().max(100).optional(),
})

export const counselorSessionListQuerySchema = z.object({
  theme: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export const counselorSessionDeleteQuerySchema = z.object({
  sessionId: z.string().min(1).max(100),
})

// ============ Content Access & Share Schemas ============

export const contentAccessMetadataSchema = z.object({
  source: z.enum(['web', 'mobile', 'api']).optional(),
  referrer: z.string().max(500).optional(),
  sessionId: z.string().max(100).optional(),
  deviceType: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  feature: z.string().max(100).optional(),
})

export const contentAccessSchema = z.object({
  service: z.string().min(1).max(100).trim(),
  contentType: z.string().min(1).max(100).trim(),
  contentId: z.string().max(200).trim().optional().nullable(),
  locale: localeSchema.optional(),
  metadata: contentAccessMetadataSchema.optional(),
  creditUsed: z.number().int().min(0).max(100).optional(),
})

export type ContentAccessValidated = z.infer<typeof contentAccessSchema>

export const contentAccessGetQuerySchema = paginationQuerySchema.extend({
  service: z.string().max(50).optional(),
})

export const shareImageRequestSchema = z.object({
  type: z.enum(['tarot', 'astrology', 'saju', 'compatibility', 'dream']),
  title: z.string().min(1).max(200).trim(),
  content: z.string().max(2000).trim(),
  theme: z.enum(['light', 'dark']).optional(),
  locale: localeSchema.optional(),
})

export type ShareImageRequestValidated = z.infer<typeof shareImageRequestSchema>

export const shareResultDataSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  grade: z.string().max(10).optional(),
  highlights: z.array(z.string().max(500)).optional(),
  imageUrl: z.string().url().max(500).optional(),
  shareableText: z.string().max(1000).optional(),
})

export const shareResultRequestSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  resultType: z.enum([
    'tarot',
    'astrology',
    'saju',
    'compatibility',
    'dream',
    'numerology',
    'iching',
  ]),
  resultData: shareResultDataSchema.optional(),
})

export type ShareResultRequestValidated = z.infer<typeof shareResultRequestSchema>

// ============ Readings Schemas ============

export const readingsMetadataSchema = z.object({
  spread: z.string().max(50).optional(),
  question: z.string().max(1000).optional(),
  cards: z.array(z.string().max(100)).optional(),
  hexagram: z.number().int().min(1).max(64).optional(),
  dreamSymbols: z.array(z.string().max(100)).optional(),
  birthDate: dateSchema.optional(),
  score: z.number().min(0).max(100).optional(),
})

export const readingsSaveSchema = z.object({
  type: z.enum(['tarot', 'iching', 'dream', 'numerology', 'daily-fortune', 'compatibility']),
  title: z.string().max(200).trim().optional(),
  content: z.string().min(1).max(50000),
  metadata: readingsMetadataSchema.optional(),
})

export type ReadingsSaveValidated = z.infer<typeof readingsSaveSchema>

export const readingsGetQuerySchema = z.object({
  type: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

// ============ Fortune Schemas ============

export const fortuneSaveSchema = z.object({
  date: z.string().min(1).max(30),
  kind: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().default('daily'),
  title: z.string().max(200).trim().optional().nullable(),
  content: z.string().min(1).max(10000),
})

export type FortuneSaveValidated = z.infer<typeof fortuneSaveSchema>

export const dailyFortuneSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  sendEmail: z.boolean().optional().default(false),
  userTimezone: timezoneSchema.optional(),
})

export type DailyFortuneValidated = z.infer<typeof dailyFortuneSchema>

export const fortuneGetQuerySchema = z.object({
  date: dateSchema,
  kind: z.string().max(50).optional().default('daily'),
})

export const weeklyFortuneQuerySchema = z.object({
  locale: localeSchema.optional(),
  birthDate: dateSchema.optional(),
})

// ============ Referral Schemas ============

export const referralClaimRequestSchema = z.object({
  code: z.string().min(1).max(50).trim(),
})

export type ReferralClaimRequestValidated = z.infer<typeof referralClaimRequestSchema>

export const referralLinkRequestSchema = z.object({
  customCode: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
})

export type ReferralLinkRequestValidated = z.infer<typeof referralLinkRequestSchema>

export const referralValidateQuerySchema = z.object({
  code: z.string().min(1).max(50),
})

// ============ Me (User Dashboard) Schemas ============

export const meHistoryQuerySchema = paginationQuerySchema.extend({
  type: z.string().max(50).optional(),
  theme: z.string().max(50).optional(),
})

// ============ Cron & System Schemas ============

export const cronAuthSchema = z.object({
  token: z.string().min(1),
})

export type CronAuthValidated = z.infer<typeof cronAuthSchema>

export const cronNotificationsTriggerSchema = z.object({
  hour: z.number().int().min(0).max(23).optional(),
})

export type CronNotificationsTriggerValidated = z.infer<typeof cronNotificationsTriggerSchema>

export const cspReportSchema = z.object({
  'csp-report': z
    .object({
      'document-uri': z.string().optional(),
      referrer: z.string().optional(),
      'violated-directive': z.string().optional(),
      'effective-directive': z.string().optional(),
      'original-policy': z.string().optional(),
      disposition: z.string().optional(),
      'blocked-uri': z.string().optional(),
      'line-number': z.number().optional(),
      'column-number': z.number().optional(),
      'source-file': z.string().optional(),
      'status-code': z.number().optional(),
      'script-sample': z.string().optional(),
    })
    .optional(),
})

export const metricsTokenSchema = z.object({
  'x-metrics-token': z.string().optional(),
})
