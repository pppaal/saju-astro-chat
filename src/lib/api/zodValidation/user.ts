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
import { isAllowedPhotoHost } from '../photoHostAllowlist'

// Avatar / profile-image URL. Uses the shared photo-host allowlist —
// `user.image` is rendered in nav/profile widgets via next/image, so a
// `javascript:` or attacker-host URL persisted here has the same XSS /
// hotlink / SSRF surface.
const profileImageUrlSchema = z
  .string()
  .max(500)
  .url()
  .refine((url) => url.startsWith('https://'), {
    message: 'Image URL must be https',
  })
  .refine((url) => isAllowedPhotoHost(url), {
    message: 'Image URL host not allowed',
  })

// ============ Auth Schemas ============

export const userRegistrationRequestSchema = z.object({
  email: z.string().email().max(254).trim(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).trim().optional(),
  referralCode: z.string().max(50).trim().optional(),
})

export type UserRegistrationRequestValidated = z.infer<typeof userRegistrationRequestSchema>

// ============ User Email Schemas ============

// 결제 페이지의 EmailCollectionModal 에서 호출하는 PATCH /api/me/email 의
// 입력 스키마. 정규식은 /api/checkout 의 isValidEmail() 과 동일하게 맞춰서,
// "여기선 통과했는데 결제 단계에서 invalid_email 로 다시 막힘" 같은
// regression 을 차단한다.
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export const userEmailUpdateSchema = z.object({
  email: z.string().trim().min(1).max(254).regex(EMAIL_REGEX, 'invalid_email_format'),
})

export type UserEmailUpdateValidated = z.infer<typeof userEmailUpdateSchema>

// ============ User Profile Schemas ============

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(64).trim().optional(),
  image: profileImageUrlSchema.optional().nullable(),
  preferredLanguage: localeSchema.optional(),
  tonePreference: z.enum(['formal', 'casual', 'mystical', 'friendly']).optional(),
  readingLength: z.enum(['brief', 'moderate', 'detailed']).optional(),
  birthDate: dateSchema.optional().nullable(),
  birthTime: timeSchema.optional().nullable(),
  gender: genderSchema.optional().nullable(),
  birthCity: z.string().max(200).trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  tzId: timezoneSchema.optional().nullable(),
})

export type UserProfileUpdateValidated = z.infer<typeof userProfileUpdateSchema>

export const userBirthInfoUpdateSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional().nullable(),
  gender: genderSchema.optional().nullable(),
  birthCity: z.string().max(200).trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  tzId: timezoneSchema.optional().nullable(),
})

export type UserBirthInfoUpdateValidated = z.infer<typeof userBirthInfoUpdateSchema>

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

// SectionFeedback (사용자 섹션별 👍/👎 피드백) — DB 모델 + zod schema 같이
// 2026-06-06 제거. 페이지/캡처 코드 0, row 0.

export const feedbackGetQuerySchema = z.object({
  service: z.string().max(50).optional(),
})

export const feedbackRecordsQuerySchema = z.object({
  service: z.string().optional(),
  helpful: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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
  messages: z.array(chatMessageSchema).min(1).max(200),
  locale: localeSchema.optional(),
})

export type CounselorSessionSaveRequestValidated = z.infer<typeof counselorSessionSaveRequestSchema>

export const counselorSessionLoadQuerySchema = z.object({
  sessionId: z.string().max(100).optional(),
})

export const counselorSessionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  // Optional service filter so the sidebar can scope to destiny or
  // compat sessions only. Omitted → returns all types (legacy
  // behavior).
  type: z.enum(['destiny', 'compat']).optional(),
})

export const counselorSessionDeleteQuerySchema = z.object({
  sessionId: z.string().min(1).max(100),
})

export const counselorSessionRenameRequestSchema = z.object({
  sessionId: z.string().min(1).max(100),
  // .trim() must come *before* .min() so whitespace-only titles ('   ')
  // are rejected at validation time rather than collapsing to '' inside
  // the handler.
  title: z.string().trim().min(1).max(80),
})

// ============ Content Access & Share Schemas ============

const contentAccessMetadataSchema = z.object({
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
  type: z.enum(['tarot', 'astrology', 'saju', 'compatibility']),
  title: z.string().min(1).max(200).trim(),
  content: z.string().max(2000).trim(),
  theme: z.enum(['light', 'dark']).optional(),
  locale: localeSchema.optional(),
})

export type ShareImageRequestValidated = z.infer<typeof shareImageRequestSchema>

const shareResultDataSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  grade: z.string().max(10).optional(),
  highlights: z.array(z.string().max(500)).optional(),
  imageUrl: z.string().url().max(500).optional(),
  shareableText: z.string().max(1000).optional(),
})

export const shareResultRequestSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  resultType: z.enum(['tarot', 'astrology', 'saju', 'compatibility', 'numerology', 'iching']),
  resultData: shareResultDataSchema.optional(),
})

export type ShareResultRequestValidated = z.infer<typeof shareResultRequestSchema>

// ============ Readings Schemas ============

const readingsMetadataSchema = z.object({
  spread: z.string().max(50).optional(),
  question: z.string().max(1000).optional(),
  cards: z.array(z.string().max(100)).optional(),
  hexagram: z.number().int().min(1).max(64).optional(),
  birthDate: dateSchema.optional(),
  score: z.number().min(0).max(100).optional(),
})

export const readingsSaveSchema = z.object({
  type: z.enum(['tarot', 'iching', 'numerology', 'daily-fortune', 'compatibility']),
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

// DailyFortune (옛 일일 운세 score 모델) — DB 모델 + zod schema 같이
// 2026-06-06 제거. 페이지 코드 0, row 0.

const fortuneGetQuerySchema = z.object({
  date: dateSchema,
  kind: z.string().max(50).optional().default('daily'),
})

const weeklyFortuneQuerySchema = z.object({
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

const metricsTokenSchema = z.object({
  'x-metrics-token': z.string().optional(),
})
