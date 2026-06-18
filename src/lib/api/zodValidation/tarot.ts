/**
 * Tarot Schemas
 */

import { z } from 'zod'
import { dateSchema, localeSchema, chatMessageSchema } from './common'

// ============ Tarot Card Schemas ============

export const tarotCardSaveSchema = z.object({
  cardId: z.string().max(100),
  name: z.string().min(1).max(120),
  image: z.string().max(500),
  isReversed: z.boolean(),
  position: z.string().min(1).max(100),
})

export const tarotCardInsightSchema = z.object({
  // LLM 이 질문 맥락에 맞춰 자유 명명 → 한 문장급으로 길어질 수 있어 여유.
  position: z.string().max(300),
  card_name: z.string().max(200),
  is_reversed: z.boolean(),
  // 카드별 해석. 장문(특히 한국어) 리딩이 5000 자를 넘어 저장이 통째로
  // 검증 실패(400)하던 회귀 → 넉넉히 상향.
  interpretation: z.string().max(12000),
})

export const tarotCardSchema = z.object({
  name: z.string().min(1).max(120),
  nameKo: z.string().min(1).max(120).optional(),
  isReversed: z.boolean(),
  // position은 LLM이 사용자 질문 맥락에 맞춰 직접 명명. 클라이언트는
  // 더 이상 보내지 않는다 (useTarotInterpretation.ts cardPayload 참고).
  position: z.string().min(1).max(80).optional(),
  positionKo: z.string().max(80).optional(),
  positionMeaning: z.string().max(300).optional(),
  positionMeaningKo: z.string().max(300).optional(),
  meaning: z.string().max(500).optional(),
  meaningKo: z.string().max(500).optional(),
  keywords: z.array(z.string()).max(8).optional(),
  keywordsKo: z.array(z.string()).max(8).optional(),
})

export const tarotCardDetailedSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  nameKo: z.string().max(120).trim().optional(),
  isReversed: z.boolean(),
  position: z.string().min(1).max(80).trim(),
  positionKo: z.string().max(80).trim().optional(),
  meaning: z.string().max(120).optional(),
  meaningKo: z.string().max(120).optional(),
  keywords: z.array(z.string().max(50)).max(8).optional(),
  keywordsKo: z.array(z.string().max(50)).max(8).optional(),
})

const tarotQuestionProfileFieldSchema = z.object({
  code: z.string().max(200),
  label: z.string().max(300),
})

const tarotQuestionContextSchema = z.object({
  question_summary: z.string().max(4000).optional(),
  question_profile: z
    .object({
      type: tarotQuestionProfileFieldSchema,
      subject: tarotQuestionProfileFieldSchema,
      focus: tarotQuestionProfileFieldSchema,
      timeframe: tarotQuestionProfileFieldSchema,
      tone: tarotQuestionProfileFieldSchema,
    })
    .optional(),
  direct_answer: z.string().max(4000).optional(),
  intent: z.string().max(200).optional(),
  intent_label: z.string().max(300).optional(),
})

// 보충 카드 (클래리파이어) — 한 장 한정. 자리(position) 없음.
const tarotClarifierCardSchema = z.object({
  name: z.string().min(1).max(120),
  nameKo: z.string().max(120).optional(),
  isReversed: z.boolean(),
  // LLM 이 클래리파이어 직후 흘려준 보충 해석 (있는 경우). 카운슬러 채팅의
  // assistant turn 과 별개로, 단독 리딩에서 채팅 안 거치고 카드 단독 저장
  // 케이스용.
  followupAnswer: z.string().max(3000).optional(),
})

// 결과 화면 followup 채팅의 한 turn — user 또는 assistant.
const tarotFollowupTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

// ============ Tarot Request Schemas ============

export const tarotSaveRequestSchema = z.object({
  question: z.string().min(1).max(1000).trim(),
  spreadId: z.string().min(1).max(100),
  spreadTitle: z.string().min(1).max(200),
  cards: z.array(tarotCardSaveSchema).min(1).max(20),
  // LLM 생성 본문 — 사용자 본인 리딩 내용이라 넉넉히. 직전 5000/2000/500
  // 제한이 장문 한국어 리딩에서 검증 실패(400) → "저장 안 됨" 의 원인.
  overallMessage: z.string().max(12000).optional(),
  cardInsights: z.array(tarotCardInsightSchema).optional(),
  guidance: z.string().max(12000).optional(),
  affirmation: z.string().max(2000).optional(),
  // 'counselor-destiny' / 'counselor-compat' 는 운명/궁합 상담사 안에서 띄운
  // 인라인 타로 — 히스토리 UI 에서 origin 배지를 띄우려고 origin 별로 분리해
  // 받는다. 'counselor' 는 구버전 호환 fallback.
  source: z.enum(['standalone', 'counselor', 'counselor-destiny', 'counselor-compat']).optional(),
  counselorSessionId: z.string().max(100).optional(),
  locale: localeSchema.optional(),
  questionContext: tarotQuestionContextSchema.optional(),
  clarifierCard: tarotClarifierCardSchema.optional(),
  followupTurns: z.array(tarotFollowupTurnSchema).max(20).optional(),
})

export type TarotSaveRequestValidated = z.infer<typeof tarotSaveRequestSchema>

// 보충 카드 (클래리파이어) — 결과 후 "한 장 더 뽑기" 한 장. 저장 후
// 늦게 채워질 수 있어 PATCH 에서도 동일 schema 사용.
const tarotClarifierCardSchemaExport = tarotClarifierCardSchema

// PATCH /api/tarot/save/[id] — 저장된 리딩의 보충 카드 / followup 채팅
// 만 부분 업데이트. 두 필드 둘 다 optional 이지만 최소 하나는 있어야 의미
// 있는 호출.
export const tarotSavePatchSchema = z
  .object({
    clarifierCard: tarotClarifierCardSchema.optional(),
    followupTurns: z.array(tarotFollowupTurnSchema).max(20).optional(),
  })
  .refine((data) => data.clarifierCard !== undefined || data.followupTurns !== undefined, {
    message: 'At least one of clarifierCard or followupTurns must be provided',
  })

export type TarotSavePatchValidated = z.infer<typeof tarotSavePatchSchema>

export const tarotQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export type TarotQueryValidated = z.infer<typeof tarotQuerySchema>

// 분석 단계에서 추출된 메타데이터 — interpret 단계에 직접 전달해 재추론 비용 절감
const tarotQuestionMetaSchema = z.object({
  intent: z.string().max(60).optional(),
  subject: z.string().max(60).optional(),
  focus: z.string().max(120).optional(),
  timeframe: z.string().max(60).optional(),
  tone: z.string().max(60).optional(),
  questionType: z.string().max(60).optional(),
})

export type TarotQuestionMeta = z.infer<typeof tarotQuestionMetaSchema>

export const tarotInterpretRequestSchema = z.object({
  categoryId: z.string().min(1).max(120),
  spreadId: z.string().min(1).max(120),
  spreadTitle: z.string().min(1).max(120),
  cards: z.array(tarotCardSchema).min(1).max(15),
  userQuestion: z.string().max(600).optional(),
  language: z.enum(['ko', 'en']).default('ko'),
  questionContext: tarotQuestionContextSchema.optional(),
  questionMeta: tarotQuestionMetaSchema.optional(),
})

export type TarotInterpretRequest = z.infer<typeof tarotInterpretRequestSchema>

export const tarotInterpretEnhancedRequestSchema = z.object({
  categoryId: z.string().min(1).max(120).trim(),
  spreadId: z.string().min(1).max(120).trim(),
  spreadTitle: z.string().min(1).max(120).trim(),
  cards: z.array(tarotCardDetailedSchema).min(1).max(15),
  userQuestion: z.string().max(600).trim().optional(),
  language: z.enum(['ko', 'en']).optional(),
  birthdate: dateSchema.optional(),
  moonPhase: z.string().min(2).max(40).trim().optional(),
})

export type TarotInterpretEnhancedRequestValidated = z.infer<
  typeof tarotInterpretEnhancedRequestSchema
>

export const tarotDrawSchema = z.object({
  categoryId: z.string().min(1).max(200).trim(),
  spreadId: z.string().min(1).max(200).trim(),
  questionContext: tarotQuestionContextSchema.optional(),
})

export type TarotDrawValidated = z.infer<typeof tarotDrawSchema>

export const tarotInterpretStreamSchema = z.object({
  categoryId: z.string().min(1).max(200).trim(),
  spreadId: z.string().max(200).trim().optional(),
  spreadTitle: z.string().max(200).trim().optional(),
  cards: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        nameKo: z.string().max(200).optional(),
        isReversed: z.boolean(),
        // LLM이 직접 명명 — 클라가 안 보냄.
        position: z.string().min(1).max(200).optional(),
        positionKo: z.string().max(200).optional(),
        positionMeaning: z.string().max(300).optional(),
        positionMeaningKo: z.string().max(300).optional(),
        keywords: z.array(z.string().max(100)).max(20).optional(),
        keywordsKo: z.array(z.string().max(100)).max(20).optional(),
      })
    )
    .min(1)
    .max(15),
  userQuestion: z.string().max(600).trim().optional(),
  language: z.enum(['ko', 'en']).optional(),
  questionContext: tarotQuestionContextSchema.optional(),
  // 서버가 draw 응답에서 발급한 단일-사용 nonce. 차감 면제(무료 재해석)
  // 판정을 클라이언트 헤더가 아닌 이 서버 발급 토큰에 묶는다. 없거나
  // 위조면 정상 차감(면제 없음).
  drawNonce: z.string().max(200).optional(),
  // 이 해석 요청의 고유 id(클라 생성). 연결이 끊겨도 서버가 끝까지 생성한
  // 완성 리딩을 이 키로 캐시에 저장해 두면, 사용자가 돌아왔을 때 result
  // 엔드포인트로 복원한다. 로그인 사용자만 캐시(게스트는 보관 안 함).
  turnId: z.string().max(80).optional(),
})

export type TarotInterpretStreamValidated = z.infer<typeof tarotInterpretStreamSchema>

export const tarotChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  context: z.object({
    spread_title: z.string().max(200).trim(),
    category: z.string().max(100).trim(),
    cards: z
      .array(
        z.object({
          position: z.string().max(200).trim(),
          name: z.string().max(200).trim(),
          isReversed: z.boolean().optional(),
          is_reversed: z.boolean().optional(),
          meaning: z.string().max(2000).trim(),
          keywords: z.array(z.string().max(100)).max(20).optional(),
        })
      )
      .min(1)
      .max(15),
    overall_message: z.string().max(10000),
    guidance: z.string().max(5000),
  }),
  language: z.enum(['ko', 'en']).optional(),
})

export type TarotChatRequestValidated = z.infer<typeof tarotChatRequestSchema>

export const tarotChatStreamRequestSchema = tarotChatRequestSchema.extend({
  counselor_id: z.string().max(200).trim().optional(),
  counselor_style: z.string().max(200).trim().optional(),
})

export type TarotChatStreamRequestValidated = z.infer<typeof tarotChatStreamRequestSchema>

export const tarotAnalyzeQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long (max 500)'),
  language: z.enum(['ko', 'en']).default('ko'),
})

// ============ Couple Tarot Reading Schemas ============

export const coupleTarotReadingPostSchema = z.object({
  connectionId: z.string().min(1).max(200).trim(),
  spreadId: z.string().min(1).max(120).trim(),
  spreadTitle: z.string().max(120).trim().optional(),
  // 표준 저장(line 100)과 동일하게 1~20 장으로 제한 — 직전엔 상한이 없어
  // 임의 크기 배열을 커플 리딩으로 영속화할 수 있었다(방어).
  cards: z.array(tarotCardSaveSchema).min(1).max(20),
  question: z.string().max(600).trim().optional(),
  overallMessage: z.string().max(10000).optional(),
  cardInsights: z.array(tarotCardInsightSchema).optional(),
  guidance: z.string().max(5000).optional(),
  affirmation: z.string().max(500).optional(),
})

export type CoupleTarotReadingPostValidated = z.infer<typeof coupleTarotReadingPostSchema>

export const coupleTarotReadingDeleteSchema = z.object({
  readingId: z.string().min(1).max(200).trim(),
})

export type CoupleTarotReadingDeleteValidated = z.infer<typeof coupleTarotReadingDeleteSchema>

export const coupleTarotReadingQuerySchema = z.object({
  connectionId: z.string().min(1).max(200).trim().optional(),
})

export type CoupleTarotReadingQueryValidated = z.infer<typeof coupleTarotReadingQuerySchema>
