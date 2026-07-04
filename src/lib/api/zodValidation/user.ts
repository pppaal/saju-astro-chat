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
  // 이 세션이 "누구 사주"인지. 세션 생성 시 meta 로 저장해 사이드바 부제 +
  // (후속) 재개 시 대상자 복원에 쓴다. 없으면(구버전 클라) 저장 안 함.
  subject: z
    .object({
      name: z.string().max(80).optional(),
      birthDate: z.string().max(40).optional(),
      birthTime: z.string().max(20).optional(),
      birthTimeUnknown: z.boolean().optional(),
      gender: z.string().max(20).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      city: z.string().max(120).optional(),
      timeZone: z.string().max(60).optional(),
    })
    .optional(),
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

const contentAccessGetQuerySchema = paginationQuerySchema.extend({
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

// ============ Web Push Subscription Schemas ============
// "매일 아침 오늘의 운세" 웹 푸시 구독 — POST /api/me/push-subscription.
// endpoint 는 푸시 서비스가 발급한 https URL (구독의 자연키, upsert 기준).

// SSRF 방어 — endpoint 는 cron sender 가 서버에서 직접 POST 하는 URL 이므로,
// 인증된 사용자가 임의 내부/사설 호스트를 심어 서버발 요청을 유발(blind SSRF)하지
// 못하도록 *알려진 푸시 서비스 도메인* 으로 호스트를 제한한다. IP 리터럴(사설/링크
// 로컬 포함)은 어느 suffix 와도 안 맞아 자동 거부된다.
const ALLOWED_PUSH_HOST_SUFFIXES = [
  '.googleapis.com', // FCM (Chrome/Android): fcm.googleapis.com
  '.push.services.mozilla.com', // Firefox
  '.notify.windows.com', // Edge/WNS
  '.push.apple.com', // Safari web push: web.push.apple.com
] as const

function isAllowedPushEndpoint(raw: string): boolean {
  let host: string
  try {
    host = new URL(raw).hostname.toLowerCase()
  } catch {
    return false
  }
  // 선행 '.' 로 lookalike 도메인(evil-googleapis.com) 차단.
  return ALLOWED_PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

export const pushSubscriptionUpsertSchema = z.object({
  endpoint: z
    .string()
    .max(1000)
    .url()
    .refine((url) => url.startsWith('https://'), {
      message: 'Push endpoint must be https',
    })
    .refine(isAllowedPushEndpoint, {
      message: 'Push endpoint host is not an allowed push service',
    }),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  locale: z.enum(['ko', 'en']).default('ko'),
})

export type PushSubscriptionUpsertValidated = z.infer<typeof pushSubscriptionUpsertSchema>

// DELETE /api/me/push-subscription — 본인 구독만 endpoint 로 삭제.
export const pushSubscriptionDeleteSchema = z.object({
  endpoint: z.string().min(1).max(1000),
})

export type PushSubscriptionDeleteValidated = z.infer<typeof pushSubscriptionDeleteSchema>

// POST /api/me/streak — 방문 스트릭 체크인. today 는 *클라이언트 로컬* 날짜
// (사용자가 화면에서 보는 하루 경계와 일치). 서버는 포맷 + 서버 날짜 ±2일
// 상한만 검증(라우트에서) — 스트릭은 과금 무관 코스메틱 지표.
export const streakCheckinSchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'today must be YYYY-MM-DD'),
})

export type StreakCheckinValidated = z.infer<typeof streakCheckinSchema>
