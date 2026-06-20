/**
 * ensureTarotReadingRecord — 타로 차감-기록 불일치 방지용 서버측 안전망.
 *
 * 배경(회귀): 타로는 "리딩당 크레딧 차감"이 서버(`tarot/interpret-stream`)에서
 * 일어나지만, 활동 기록(TarotReading 행)은 클라이언트의 `tarot/save` 호출에만
 * 의존했다(자동 저장이지만 best-effort). 독립 타로 페이지는 3회 재시도로 비교적
 * 견고하나, 인라인 모달은 1회 시도 후 실패하면 로컬 폴백 + isSaved=true 로 끝나
 * 서버 행이 안 생긴다. 그 결과 "크레딧은 빠졌는데 활동(저장된 리딩) 0".
 *
 * 이 헬퍼는 그 안전망이다. 리딩이 실제로 생성되어 과금이 확정된 순간
 * (interpret-stream 의 정상 완료 분기 — usable reading, 환불 안 됨)에 서버가
 * 같은 readingId 로 행을 **없으면 생성**한다. interpret-stream 이 그 id 를 응답
 * 헤더(x-reading-id)로 돌려주고, 클라 tarot/save 가 같은 id 로 upsert 하므로
 * 행이 갈라지지 않는다(중복 차단). 해석(overallMessage 등)은 비워 두고 클라
 * 저장이 채운다 — 서버는 onComplete 시점에 파싱된 해석을 갖고 있지 않으므로.
 * 실패해도 cards/question/spread 는 남아 활동 기록 + 부분 복원이 가능하다.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { Prisma } from '@prisma/client'

// 클라가 보내는 readingId 와 동일한 `tr_<hex>` 형태(≈27자). 비정상적으로 긴
// 값은 헤더/요청 변조 가능성이 있어 안전 상한에서 거른다.
const MAX_READING_ID_LEN = 128

export interface EnsureTarotReadingArgs {
  /** interpret-stream 이 발급해 응답 헤더로 돌려주는 안정적 리딩 id. */
  readingId: string
  userId: string
  question: string
  spreadId: string
  spreadTitle: string
  /** 뽑은 카드 배열(JSON). 클라 저장이 나중에 같은 id 로 보강한다. */
  cards: unknown
  locale?: string
  /** "standalone" | "counselor". 기본 standalone. */
  source?: string
}

export type EnsureTarotReadingResult = 'created' | 'exists' | 'skipped'

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

/**
 * 리딩 행이 없으면 생성한다(create-if-missing). 이미 있거나 입력이 부실하면
 * 아무것도 하지 않는다. 절대 throw 하지 않는다 — 스트림/과금 경로를 깨면 안 됨.
 */
export async function ensureTarotReadingRecord(
  args: EnsureTarotReadingArgs
): Promise<EnsureTarotReadingResult> {
  const { readingId, userId } = args
  if (!readingId || !userId) return 'skipped'
  if (readingId.length > MAX_READING_ID_LEN) return 'skipped'
  if (!args.spreadId) return 'skipped'

  try {
    // PK 단건 조회 — 행이 있으면(클라 저장 성공 or 다른 사용자 소유) 건드리지
    // 않는다. 해석 채우기/갱신은 클라 tarot/save 의 책임.
    const existing = await prisma.tarotReading.findUnique({
      where: { id: readingId },
      select: { id: true },
    })
    if (existing) return 'exists'

    await prisma.tarotReading.create({
      data: {
        id: readingId,
        userId,
        question: args.question ?? '',
        spreadId: args.spreadId,
        spreadTitle: args.spreadTitle ?? '',
        cards: args.cards as Prisma.InputJsonValue,
        source: args.source ?? 'standalone',
        locale: args.locale ?? 'ko',
        // 해석 필드(overallMessage/cardInsights/guidance/affirmation)는 비워 둔다 —
        // 클라 tarot/save 가 같은 id 로 upsert 하며 채운다.
      },
    })
    logger.info('[ensureTarotReadingRecord] safety-net record created', { readingId, userId })
    return 'created'
  } catch (err) {
    // find 와 create 사이 race(클라 저장이 먼저 만든 경우) — P2002 는 "이미 존재".
    if (isUniqueConstraintError(err)) return 'exists'
    // 그 외 오류(DB 일시 장애 / 누락 컬럼 등)는 삼키고 스트림을 깨지 않는다.
    logger.warn('[ensureTarotReadingRecord] failed', { err, readingId, userId })
    return 'skipped'
  }
}

export interface TarotFollowupTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 유료 followup Q&A 의 차감-기록 안전망. /api/tarot/followup 은 1크레딧을
 * 차감하고 답변을 응답으로 돌려주지만, 그 Q&A 의 기록(TarotReading.followupTurns)
 * 은 클라의 best-effort PATCH 에만 의존했다 — PATCH 가 유실되면 과금된 후속
 * 대화가 히스토리에서 사라진다. 이 헬퍼는 서버가 같은 readingId 행에 새 turn 을
 * 직접 append 한다.
 *
 * 중복 안 됨: 클라 PATCH(/api/tarot/save/[id])는 followupTurns 를 *replace* 한다.
 * 클라가 정상 저장하면 같은 내용으로 덮어써 turn 이 한 번만 남고, 유실되면 이
 * append 가 남는다. 호출 측은 첫 과금(claimed)일 때만 호출해야 한다 — 멱등 replay
 * 는 이미 append 됐으므로.
 *
 * 소유권 가드: readingId 가 호출자 소유가 아니면 아무것도 하지 않는다. 절대
 * throw 하지 않는다(답변 응답 경로를 깨면 안 됨).
 */
export async function appendTarotFollowupTurns(
  readingId: string,
  userId: string,
  newTurns: TarotFollowupTurn[]
): Promise<void> {
  if (!readingId || !userId || newTurns.length === 0) return
  if (readingId.length > MAX_READING_ID_LEN) return
  try {
    // DB 측 원자적 jsonb concat — read-modify-write 를 쓰면 같은 리딩에 서로
    // 다른 followup 두 개가 동시에 들어올 때(다른 탭/기기) 둘 다 같은 기존
    // 배열을 읽고 덮어써 한쪽의 유료 turn 이 사라진다(lost update). 단일 UPDATE
    // 로 `기존(||'[]') || 새 turn` 을 이어 붙이면 그 경쟁창이 사라진다. 소유권은
    // WHERE "userId" 로 강제(남의 리딩이면 0행 갱신=no-op). updateMany 가 아닌
    // raw 라 count 로 적용 여부만 확인.
    const turnsJson = JSON.stringify(newTurns)
    await prisma.$executeRaw`
      UPDATE "TarotReading"
      SET "followupTurns" = COALESCE("followupTurns", '[]'::jsonb) || ${turnsJson}::jsonb
      WHERE "id" = ${readingId} AND "userId" = ${userId}
    `
  } catch (err) {
    // P2022/42703(followupTurns 컬럼 prod 미적용) / 일시 DB 오류 — 삼킨다.
    logger.warn('[appendTarotFollowupTurns] failed', { err, readingId })
  }
}
