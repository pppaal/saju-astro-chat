/**
 * Saju, Astrology & Destiny Map Schemas
 */

import { z } from 'zod'
import {
  dateSchema,
  timeSchema,
  timezoneSchema,
  latitudeSchema,
  longitudeSchema,
  genderSchema,
  localeSchema,
  chatMessageSchema,
} from './common'
import {
  sajuChatContextSchema,
  sajuResultSchema,
  fiveElementSchema,
  sibsinDistributionSchema,
  twelveStagesRecordSchema,
  ganjiSchema,
  advancedSajuAnalysisSchema,
} from './domains/saju-domain'
import {
  astroChatContextSchema,
  planetHousesSchema,
  planetSignsSchema,
  aspectHitSchema,
  transitAspectSchema,
  extraPointSchema,
} from './domains/astro-domain'

// ============ Saju API Schema ============

export const sajuRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  calendarType: z.enum(['solar', 'lunar']),
  timezone: timezoneSchema,
  userTimezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type SajuRequest = z.infer<typeof sajuRequestSchema>

export const sajuCalculationRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  calendarType: z.enum(['solar', 'lunar']),
  timezone: timezoneSchema,
  userTimezone: timezoneSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  // 음력 윤달 여부. calendarType==='lunar' 일 때만 의미 있음.
  // 윤4월 vs 평4월처럼 같은 Y/M/D에서 분기되는 케이스를 정확히 분리하기 위함.
  lunarLeap: z.boolean().optional(),
})

export type SajuCalculationRequestValidated = z.infer<typeof sajuCalculationRequestSchema>

export const sajuChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  saju: sajuChatContextSchema.optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: sajuChatContextSchema.optional(),
})

export type SajuChatStreamValidated = z.infer<typeof sajuChatStreamSchema>

// ============ Astrology Schemas ============

export const astrologyOptionsSchema = z.object({
  houseSystem: z.enum(['Placidus', 'WholeSign', 'Koch', 'Equal', 'Campanus']).optional(),
  includeAsteroids: z.boolean().optional(),
  includeFixedStars: z.boolean().optional(),
  includeChiron: z.boolean().optional(),
  includeLilith: z.boolean().optional(),
  aspectOrb: z.number().min(0).max(15).optional(),
})

export const astrologyRequestSchema = z.object({
  date: dateSchema,
  time: timeSchema,
  // 문자열로 와도 parseFloat 후 *반드시* 경계 스키마로 재검증(.pipe) — 직전엔
  // 문자열 분기가 .min/.max·NaN 검사 없이 통과해 "99999"/"abc"(NaN) 좌표가
  // Swiss Ephemeris 까지 흘러갔다.
  latitude: z.union([
    latitudeSchema,
    z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(latitudeSchema),
  ]),
  longitude: z.union([
    longitudeSchema,
    z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(longitudeSchema),
  ]),
  timeZone: timezoneSchema,
  locale: localeSchema.optional(),
  options: astrologyOptionsSchema.optional(),
})

export type AstrologyRequest = z.infer<typeof astrologyRequestSchema>

export const advancedAstrologyOptionsSchema = z.object({
  harmonicNumber: z.number().int().min(1).max(360).optional(),
  progressionType: z.enum(['secondary', 'solarArc']).optional(),
  eclipseType: z.enum(['solar', 'lunar', 'both']).optional(),
  midpointStyle: z.enum(['direct', 'modulus90']).optional(),
  aspectsToInclude: z.array(z.string().max(20)).optional(),
})

export const advancedAstrologyRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  calculationType: z.enum([
    'asteroids',
    'draconic',
    'eclipses',
    'electional',
    'fixed-stars',
    'harmonics',
    'lunar-return',
    'midpoints',
    'progressions',
  ]),
  targetDate: dateSchema.optional(),
  options: advancedAstrologyOptionsSchema.optional(),
  locale: localeSchema.optional(),
})

export type AdvancedAstrologyRequestValidated = z.infer<typeof advancedAstrologyRequestSchema>

export const astroBirthDataSchema = z.object({
  birthDate: dateSchema.optional(),
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  timezone: timezoneSchema.optional(),
})

export const astroChartDataSchema = z.object({
  sunSign: z.string().max(30).optional(),
  moonSign: z.string().max(30).optional(),
  ascendant: z.string().max(30).optional(),
  planetHouses: planetHousesSchema.optional(),
  planetSigns: planetSignsSchema.optional(),
  aspects: z.array(aspectHitSchema).optional(),
})

export const astrologyChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  birthData: astroBirthDataSchema.optional(),
  chartData: astroChartDataSchema.optional(),
  locale: z.enum(['ko', 'en']).optional(),
})

export type AstrologyChatStreamValidated = z.infer<typeof astrologyChatStreamSchema>

export const astrologyDetailsSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

export type AstrologyDetailsValidated = z.infer<typeof astrologyDetailsSchema>

export const precomputeChartRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  gender: z.string().max(20).optional(),
  timezone: timezoneSchema.optional(),
})

export type PrecomputeChartRequestValidated = z.infer<typeof precomputeChartRequestSchema>

// ============ Destiny Map Schemas ============

export const destinyMapRequestSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  gender: genderSchema,
  calendarType: z.enum(['solar', 'lunar']).optional().default('solar'),
  timezone: timezoneSchema,
  locale: localeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
})

export type DestinyMapRequestValidated = z.infer<typeof destinyMapRequestSchema>

export const destinyMapContextSchema = z.object({
  sessionId: z.string().max(100).optional(),
  previousTopics: z.array(z.string().max(100)).optional(),
  userPreferences: z
    .object({
      detailLevel: z.enum(['brief', 'moderate', 'detailed']).optional(),
      focusArea: z.enum(['career', 'love', 'health', 'wealth', 'general']).optional(),
    })
    .optional(),
})

export const destinyMapChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  saju: sajuChatContextSchema.optional(),
  astro: astroChatContextSchema.optional(),
  locale: z.enum(['ko', 'en']).optional(),
  context: destinyMapContextSchema.optional(),
})

export type DestinyMapChatValidated = z.infer<typeof destinyMapChatSchema>

// Destiny Matrix 영역 schemas — 코드 + Prisma 모델 통째 폐기로 같이 제거
// (2026-06-06). 옛 "AI 프리미엄 리포트" timing/themed score/grade 가짜 등급
// 시스템. 차트 페이지는 raw + 분석 데이터 + 12 교차 카드만 노출, 테마별
// 해석은 운명상담사 LLM 으로.

// ============ Calendar Schemas ============

export const sajuFactorsSchema = z.object({
  dayMaster: z.string().max(10).optional(),
  currentDaeun: z.string().max(20).optional(),
  currentSaeun: z.string().max(20).optional(),
  dailyGanji: z.string().max(10).optional(),
  favorableElements: z.array(fiveElementSchema).optional(),
  unfavorableElements: z.array(fiveElementSchema).optional(),
  activeRelations: z.array(z.string().max(30)).optional(),
  activeShinsal: z.array(z.string().max(30)).optional(),
})

export const astroFactorsSchema = z.object({
  sunSign: z.string().max(30).optional(),
  moonPhase: z.string().max(30).optional(),
  mercuryRetrograde: z.boolean().optional(),
  activeTransits: z.array(z.string().max(100)).optional(),
  majorAspects: z.array(z.string().max(100)).optional(),
  voidOfCourseMoon: z.boolean().optional(),
})

export const calendarSaveRequestSchema = z.object({
  date: dateSchema,
  year: z.number().int().min(1900).max(2100).optional(),
  grade: z.number().int().min(0).max(4),
  score: z.number().min(0).max(100),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  summary: z.string().max(1000).trim().optional(),
  categories: z.array(z.string().max(50)).optional(),
  bestTimes: z.array(z.string().max(100)).optional(),
  sajuFactors: z.union([sajuFactorsSchema, z.array(z.string().max(300))]).optional(),
  astroFactors: z.union([astroFactorsSchema, z.array(z.string().max(300))]).optional(),
  recommendations: z.array(z.string().max(500)).optional(),
  warnings: z.array(z.string().max(500)).optional(),
  birthDate: dateSchema.optional(),
  birthTime: timeSchema.optional(),
  birthPlace: z.string().max(200).optional(),
  locale: localeSchema.optional(),
})

export type CalendarSaveRequestValidated = z.infer<typeof calendarSaveRequestSchema>

export const calendarQuerySchema = z.object({
  date: dateSchema.optional(),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(365))
    .optional()
    .default(50),
})

export type CalendarQueryValidated = z.infer<typeof calendarQuerySchema>

// year 범위 — UI 가 navigates 가능한 현재 ±5년만. 1900-2100 풀 범위는 attacker
// 가 cell-cache 를 무한히 채우는 DoS 표면 (200 yrs × 12 mo × ~150ms = ~6분 CPU
// per birthKey). UI 가 의미 있게 보여줄 윈도우만 허용.
const CURRENT_YEAR = new Date().getFullYear()
export const calendarMainQuerySchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional().default('00:00'),
  birthPlace: z.string().max(100).trim().optional().default('Seoul'),
  year: z.coerce
    .number()
    .int()
    .min(CURRENT_YEAR - 5)
    .max(CURRENT_YEAR + 5)
    .optional(),
  gender: genderSchema.optional().default('male'),
  locale: localeSchema.optional().default('ko'),
  category: z.enum(['wealth', 'career', 'love', 'health', 'travel', 'study', 'general']).optional(),
})

export const calendarPageQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
})

// ============ Cache Chart Schemas ============

export const cacheChartSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema.optional(),
})

export type CacheChartValidated = z.infer<typeof cacheChartSchema>

export const cachedChartDataSchema = z.object({
  saju: sajuResultSchema.optional(),
  astro: z
    .object({
      sunSign: z.string().max(30).optional(),
      moonSign: z.string().max(30).optional(),
      ascendant: z.string().max(30).optional(),
      houses: z.array(z.number().int().min(1).max(12)).optional(),
      aspects: z.array(aspectHitSchema).optional(),
    })
    .optional(),
  calculatedAt: z.string().max(50),
  version: z.string().max(20).optional(),
})

export const cacheChartSaveSchema = cacheChartSchema.extend({
  birthTime: timeSchema,
  data: cachedChartDataSchema,
})

export type CacheChartSaveValidated = z.infer<typeof cacheChartSaveSchema>

export const cacheChartDeleteSchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
})

export type CacheChartDeleteValidated = z.infer<typeof cacheChartDeleteSchema>

export const cacheChartGetQuerySchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

// ============ Compatibility Schemas ============

export const personDataSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  timezone: timezoneSchema,
  gender: genderSchema.optional(),
})

export const relationTypeSchema = z.enum([
  'lover',
  'crush',
  'spouse',
  'engaged',
  'ex',
  'family',
  'sibling',
  'friend',
  'colleague',
  'business',
  'other',
])

export const compatibilityPersonInputSchema = z
  .object({
    name: z.string().max(120).optional(),
    date: dateSchema,
    time: timeSchema,
    gender: genderSchema.optional(),
    latitude: z
      .number()
      .refine((val) => val >= -90 && val <= 90, { message: 'Latitude must be between -90 and 90' }),
    longitude: z.number().refine((val) => val >= -180 && val <= 180, {
      message: 'Longitude must be between -180 and 180',
    }),
    timeZone: z.string().min(1).max(80).trim(),
    city: z.string().max(200).optional(),
    relationToP1: relationTypeSchema.optional(),
    relationNoteToP1: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.relationToP1 === 'other') {
        return !!data.relationNoteToP1?.trim()
      }
      return true
    },
    {
      message: 'relationNoteToP1 required when relationToP1 is "other"',
      path: ['relationNoteToP1'],
    }
  )

export const compatibilityRequestSchema = z
  .object({
    persons: z.array(compatibilityPersonInputSchema).min(2).max(4),
    locale: localeSchema.optional(),
  })
  .refine(
    (data) => {
      for (let i = 1; i < data.persons.length; i++) {
        if (!data.persons[i].relationToP1) {
          return false
        }
      }
      return true
    },
    {
      message: 'All persons after first must have relationToP1',
      path: ['persons'],
    }
  )

export type CompatibilityRequestValidated = z.infer<typeof compatibilityRequestSchema>

export const compatibilitySaveRequestSchema = z.object({
  people: z.array(personDataSchema).min(2).max(4),
  analysisType: z.string().max(50).optional(),
  compatibilityScore: z.number().min(0).max(100).optional(),
  report: z.string().max(15000),
  insights: z.array(z.string().max(1000)).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilitySaveRequestValidated = z.infer<typeof compatibilitySaveRequestSchema>

export const compatibilityChatRequestSchema = z.object({
  persons: z
    .array(
      z.object({
        name: z.string().max(120).optional(),
        date: dateSchema.optional(),
        time: timeSchema.optional(),
        relation: z.string().max(50).optional(),
      })
    )
    .min(2)
    .max(4),
  compatibilityResult: z.string().max(10000).optional(),
  fullContext: z.record(z.string(), z.unknown()).optional(),
  useRag: z.boolean().optional(),
  theme: z.enum(['general', 'love', 'business', 'family']).optional(),
  messages: z.array(chatMessageSchema).max(20),
  lang: localeSchema.optional(),
  locale: localeSchema.optional(),
})

export type CompatibilityChatRequestValidated = z.infer<typeof compatibilityChatRequestSchema>

export const compatibilityAnalysisSchema = z.object({
  person1: z.lazy(() =>
    z.object({
      birthDate: dateSchema,
      birthTime: timeSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      timezone: timezoneSchema,
      gender: genderSchema.optional(),
      calendarType: z.enum(['solar', 'lunar']).optional(),
      userTimezone: timezoneSchema.optional(),
    })
  ),
  person2: z.lazy(() =>
    z.object({
      birthDate: dateSchema,
      birthTime: timeSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      timezone: timezoneSchema,
      gender: genderSchema.optional(),
      calendarType: z.enum(['solar', 'lunar']).optional(),
      userTimezone: timezoneSchema.optional(),
    })
  ),
  analysisType: z.enum(['romantic', 'friendship', 'business', 'family']).optional(),
  locale: localeSchema.optional(),
})

export type CompatibilityAnalysis = z.infer<typeof compatibilityAnalysisSchema>

export const counselorPersonSchema = z.object({
  name: z.string().max(120).optional(),
  date: dateSchema.optional(),
  time: timeSchema.optional(),
  birthDate: dateSchema.optional(),
  birthTime: timeSchema.optional(),
  gender: genderSchema.optional(),
  city: z.string().max(120).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  timeZone: timezoneSchema.optional(),
  relation: z.string().max(50).optional(),
  timeUnknown: z.boolean().optional(),
})

// 상담사 데이터 소스 토글 — 사주만/점성만/둘 다(체크박스). 누락 시 라우트가
// resolveCounselorSources 로 둘 다로 폴백하므로 optional. 운명·궁합 상담사가
// 같은 스키마를 공유한다(궁합은 사주/점성 *시너스트리* 블록을 같은 토글로 게이팅).
const counselorSourcesSchema = z
  .object({
    saju: z.boolean().optional(),
    astro: z.boolean().optional(),
  })
  .optional()

export const compatibilityCounselorRequestSchema = z.object({
  persons: z.array(counselorPersonSchema).min(2).max(4),
  person1Saju: sajuChatContextSchema.nullable().optional(),
  person2Saju: sajuChatContextSchema.nullable().optional(),
  person1Astro: astroChatContextSchema.nullable().optional(),
  person2Astro: astroChatContextSchema.nullable().optional(),
  fullContext: z.record(z.string(), z.unknown()).optional(),
  useRag: z.boolean().optional(),
  lang: z.enum(['ko', 'en']).optional(),
  // 이번 답변에 넣을 시너스트리 도메인(체크박스). 누락 시 서버가 둘 다로 폴백.
  sources: counselorSourcesSchema,
  messages: z.array(chatMessageSchema).max(50).optional(),
  // Parsed text of a user-attached file (notes/chat log). Injected into the
  // current turn so the LLM can reference it. Client trims to ~6000 chars.
  cvText: z.string().max(8000).optional(),
  // 끊김 복구용 턴 식별자 — 클라이언트가 idempotencyKey 와 동일 값을 보냄.
  // 서버는 keepGeneratingOnDisconnect 로 끝까지 생성한 답을 이 키로 캐시해
  // 두고, 사용자가 돌아오면 /result?turnId=… 로 복원한다.
  turnId: z.string().max(80).optional(),
})

export type CompatibilityCounselorRequestValidated = z.infer<
  typeof compatibilityCounselorRequestSchema
>

// ============ Realtime (운명) Counselor Schemas ============

// 핵심 매출 라우트(/api/counselor/realtime POST)라 "코어만 엄격 + passthrough"
// 전략을 쓴다: 클라이언트가 saju/astro/predictionContext/userContext 등 부가
// 컨텍스트 필드를 계속 실어 보내므로(useChatApi.ts), unknown 필드를 거부하면
// 배포 시점이 어긋난 구버전 클라이언트가 통째로 깨진다. 잠그는 건
// messages 배열 + birthDate 두 코어와 turnId/cvText 의 타입/길이뿐.
const realtimeCounselorTurnSchema = z
  .object({
    // 라우트가 user/assistant 외 role('system' 위조 포함)을 직접 필터하므로
    // enum 으로 막지 않는다 — 클라가 보낸 비표준 턴이 422 가 되면 안 됨.
    role: z.string().max(50).optional(),
    // 일부 복원/저장 경로에서 content 가 비거나 null 일 수 있어 라우트의
    // `m.content ?? ''` 처리와 동일하게 관대히 받는다. 길이는 abuse 방지 캡만
    // 둔다 — prior 턴은 sanitizePriorTurns 가 8,000자로 자르고, 현재(마지막)
    // user 메시지는 예전엔 어떤 캡도 없이 프롬프트로 들어가 1크레딧에 수 MB
    // 입력 토큰을 태울 수 있었다. cvText(12,000자)보다 여유 있게 20,000자.
    content: z.string().max(20_000).nullish(),
  })
  .passthrough()

// 출생/지오 필드는 사주·점성 엔진에 그대로 흘러가므로 *경계*를 잠근다 — 직전엔
// passthrough 로 latitude:9999 / longitude:"x" / timezone:"garbage" 가 무검증으로
// ensureCounselorContext 까지 갔다(이 라우트는 1 크레딧 과금 경로). 알 수 없는
// 컨텍스트 필드는 계속 passthrough.
// gender 는 라우트가 normalizeGender 로 관대히 처리(불명 → male 폴백)하므로 여기서
// 잠그지 않고 passthrough — 잘못된 gender 는 엔진에 garbage 가 아니라 기본값으로
// 간다. 실제 garbage-into-engine 위험인 좌표/tz/시각만 경계를 강제한다.
const counselorBirthGeoFields = {
  birthTime: timeSchema.optional(),
  timezone: timezoneSchema.optional(),
  userTimezone: timezoneSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
}

export const counselorRealtimeRequestSchema = z
  .object({
    // 배열 개수 상한 — 예전엔 .max() 가 없어 수만 개 턴을 담은 단일 요청이
    // req.json() 에서 통째로 버퍼링되고 전 턴이 프롬프트로 재생돼 메모리·토큰
    // abuse 가 가능했다. 매우 긴 상담 세션도 커버하도록 넉넉히 400.
    messages: z.array(realtimeCounselorTurnSchema).min(1).max(400),
    birthDate: z.string().min(1).max(64),
    // 상담 대상 이름('다른 사람으로 보기' 시 그 사람 이름). 라우트가
    // sanitizeDisplayName 으로 50자 cap + 정규화하므로 여기선 폭주만 차단.
    name: z.string().max(200).optional(),
    // 라우트는 80자로 자르지만 입력은 여유 있게 — 길이만 abuse 방지 캡.
    turnId: z.string().max(200).optional(),
    // 첨부 파일 텍스트 — 라우트가 12,000자로 자르므로 여기선 폭주만 차단.
    cvText: z.string().max(200_000).optional(),
    sources: counselorSourcesSchema,
    ...counselorBirthGeoFields,
  })
  .passthrough()

export type CounselorRealtimeRequestValidated = z.infer<typeof counselorRealtimeRequestSchema>

// 워밍 라우트(/api/counselor/warm) — realtime 과 동일한 CounselorBirthInput
// 을 받지만 LLM 호출·과금이 없어 잠그는 코어는 birthDate + 지오 경계.
export const counselorWarmRequestSchema = z
  .object({
    birthDate: z.string().min(1).max(64),
    sources: counselorSourcesSchema,
    ...counselorBirthGeoFields,
  })
  .passthrough()

// ============ Utility Schemas ============

export const latlonToTimezoneSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
})

export type LatlonToTimezoneValidated = z.infer<typeof latlonToTimezoneSchema>

export const citiesSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})
