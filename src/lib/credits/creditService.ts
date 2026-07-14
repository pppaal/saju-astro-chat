import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { runWithConcurrency } from '@/lib/utils/concurrency'
import type { Prisma } from '@prisma/client'

// 크레딧 전용 모델 — 구독 플랜은 폐지됨. 신규 유저는 월간 무료 0,
// 한도 없음(궁합·후속질문도 일반 크레딧 1개씩 소비), 기록 보관 기본값만 둔다.
const DEFAULT_HISTORY_RETENTION_DAYS = 365

// 기능 게이트도 플랜과 함께 폐지 — 크레딧만 있으면 모든 기능 사용 가능.
export type FeatureType = string

// 테스트용 크레딧 우회 — CREDITS_BYPASS=true *이고* 개발/테스트 환경일 때만 동작.
// 운영(production)에서는 env 가 켜져 있어도 절대 우회하지 않는다 — env 하나
// 잘못 켜서 전 기능이 무료가 되는 사고를 막는 과금 안전장치. (withCredits.ts 의
// BYPASS_CREDITS 게이트와 동일한 정책.)
const CREDITS_BYPASS_NONPROD =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
const CREDITS_BYPASS = process.env.CREDITS_BYPASS === 'true' && CREDITS_BYPASS_NONPROD

// 운영에 env 가 켜진 채 배포된 경우 — 우회는 막혔지만 명확히 경고.
if (process.env.CREDITS_BYPASS === 'true' && !CREDITS_BYPASS_NONPROD) {
  logger.error(
    '[creditService] CREDITS_BYPASS 가 production 에 설정됨 — 무시합니다(우회 비활성). 즉시 env 를 제거하세요.'
  )
}
// dev/test 에서 실제로 켜졌으면 프로세스 시작 시 한 번 경고.
if (CREDITS_BYPASS) {
  logger.warn(
    '[creditService] CREDITS_BYPASS 활성화(dev/test 전용) — 모든 크레딧 검사·차감이 우회됩니다.'
  )
}

// 월간 기간 계산 (다음 달 1일)
function getNextPeriodEnd(): Date {
  const now = new Date()
  // 다음 달 1일 00:00:00 (크레딧 리셋 기준일)
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

// 유저 크레딧 초기화 (신규 가입 시) — 가입 시 5 크레딧 일회성 보너스.
// 8 에서 5 로 축소: 어뷰징(여러 구글 계정 만들기로 가입 보너스 파밍)
// 인센티브 줄이기 위해. 신규 사용자 진입은 referral 보너스 (친구 첫
// 결제 시 +5) 로 보완.
const SIGNUP_BONUS = 5

export async function initializeUserCredits(userId: string) {
  const now = new Date()

  // create + audit row 를 하나의 트랜잭션으로 — 신규 가입 보너스 (SIGNUP_BONUS)
  // 가 UserCredits 에 들어갔는지 CreditTransaction 에 흔적이 남았는지 두 곳을
  // 따로 확인할 필요 없게 single source-of-truth invariant 를 지킨다.
  return prisma.$transaction(async (tx) => {
    const created = await tx.userCredits.create({
      data: {
        userId,
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: SIGNUP_BONUS,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: DEFAULT_HISTORY_RETENTION_DAYS,
        periodStart: now,
        periodEnd: getNextPeriodEnd(),
      },
    })

    if (SIGNUP_BONUS > 0) {
      // signup bonus 도 BonusCreditPurchase row 로 등록 — 그래야
      // consumeBonusCreditsFromPurchasesInTx 가 차감 가능. 옛 코드는 row
      // 안 만들어 invariant (UserCredits.bonusCredits = sum(remaining)) 가
      // 깨졌다. 결과: 사용자가 signup bonus 를 일반 monthly 로 잘못 차감
      // 받아 monthly 가 음수로 침범 가능.
      const purchaseRow = (await tx.bonusCreditPurchase.create({
        data: {
          userId,
          amount: SIGNUP_BONUS,
          remaining: SIGNUP_BONUS,
          // 90일 만료 — addBonusCredits 의 기본과 동일.
          expiresAt: new Date(now.getTime() + 90 * 86_400_000),
          expired: false,
          source: 'signup',
          stripePaymentId: null,
        },
      })) as { id?: string } | null | undefined
      const purchaseId = purchaseRow?.id ?? null

      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'SIGNUP_BONUS',
          pool: 'BONUS',
          amount: SIGNUP_BONUS,
          reason: 'signup_bonus',
          sourceRef: purchaseId,
          metadata: { bonus: SIGNUP_BONUS, purchaseId },
        },
      })
    }

    return created
  })
}

// 유저 크레딧 조회 (없으면 생성)
export async function getUserCredits(userId: string) {
  let credits = await prisma.userCredits.findUnique({
    where: { userId },
  })

  // 없으면 생성. Two concurrent first-touch requests for the same userId
  // (e.g. two tabs hitting credit-aware endpoints right after signup)
  // both reach this branch before either create() commits. The
  // UserCredits.userId unique constraint serializes the create —
  // whichever transaction commits second throws P2002. Catch it,
  // re-read the row the first request just inserted, and use that.
  // Otherwise the second request bubbled a 500 to the client while the
  // first quietly succeeded.
  if (!credits) {
    try {
      credits = await initializeUserCredits(userId)
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      if (code === 'P2002') {
        credits = await prisma.userCredits.findUnique({ where: { userId } })
      } else {
        throw err
      }
      if (!credits) {
        // P2002 fired but the row still isn't visible — should not
        // happen, but propagate the original error rather than
        // silently returning a fabricated zero-credit object.
        throw err
      }
    }
  }

  // 월간 충전 모델이 없으므로 기간 만료 리셋도 없음 (legacy resetMonthlyCredits 제거).
  return credits
}

// 크레딧 잔여량 조회
export async function getCreditBalance(userId: string) {
  const credits = await getUserCredits(userId)
  // 잔액은 "실제로 차감 가능한 양"과 정확히 일치해야 한다. 차감
  // (consumeBonusCreditsFromPurchasesInTx)은 BonusCreditPurchase 중
  // 미만료(expired=false AND expiresAt>now) 행에서만 빼는데, 집계 카운터
  // (UserCredits.bonusCredits)는 만료를 일 1회 cron(expireBonusCredits)에서만
  // 반영한다. 그래서 만료 시각~cron 사이(최대 ~24h)엔 카운터가 부풀어
  // "잔액은 있다고 뜨는데 차감은 부족 402" 유령 크레딧이 났다. 표시/게이트를
  // 유효 purchase 합(getValidBonusCredits — 차감과 동일 필터)과 카운터의
  // min 으로 계산해 불일치를 없앤다. (min 인 이유: consumeCredits 의 사전
  // 가드가 카운터도 보므로, 실사용 가능량은 둘 중 작은 쪽이다.)
  // monthlyCredits/usedCredits 는 폐기된 월간충전 모델의 frozen 컬럼이라
  // 잔액에서 제외 — 호환을 위해 반환만 한다.
  const validBonus = await getValidBonusCredits(userId)
  const remaining = Math.min(credits.bonusCredits, validBonus)
  // totalBonusReceived가 없는 기존 유저는 현재 bonusCredits를 사용
  const totalBonus =
    (credits as { totalBonusReceived?: number }).totalBonusReceived ?? credits.bonusCredits
  const totalCredits = totalBonus

  return {
    plan: credits.plan,
    monthlyCredits: credits.monthlyCredits,
    usedCredits: credits.usedCredits,
    bonusCredits: credits.bonusCredits,
    totalCredits,
    remainingCredits: Math.max(0, remaining),
    compatibility: {
      used: credits.compatibilityUsed,
      limit: credits.compatibilityLimit,
      remaining: Math.max(0, credits.compatibilityLimit - credits.compatibilityUsed),
    },
    followUp: {
      used: credits.followUpUsed,
      limit: credits.followUpLimit,
      remaining: Math.max(0, credits.followUpLimit - credits.followUpUsed),
    },
    historyRetention: credits.historyRetention,
    periodEnd: credits.periodEnd,
  }
}

// 크레딧 사용 가능 여부 확인
export async function canUseCredits(
  userId: string,
  type: 'reading' | 'compatibility' | 'followUp' = 'reading',
  amount: number = 1
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  if (CREDITS_BYPASS) {
    return { allowed: true, remaining: 9999 }
  }
  const balance = await getCreditBalance(userId)

  // 크레딧 전용: reading·compatibility·followUp 모두 동일하게 일반 크레딧 소비.
  void type
  if (balance.remainingCredits >= amount) {
    return { allowed: true, remaining: balance.remainingCredits - amount }
  }
  return {
    allowed: false,
    reason: 'no_credits',
    remaining: balance.remainingCredits,
  }
}

/** Business logic error (insufficient credits, limits exceeded) — caught and returned as { success: false }. */
class CreditBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreditBusinessError'
  }
}

// 크레딧 소비 (Race Condition 방지 - 트랜잭션 사용)
// Business errors → { success: false, error }
// System errors (DB failure) → thrown to caller (API middleware handles)
export async function consumeCredits(
  userId: string,
  type: 'reading' | 'compatibility' | 'followUp' = 'reading',
  amount: number = 1,
  // 선택적 활동 링크 — 과금↔활동 reconciliation 용. 호출 라우트가 과금 시점에
  // 이미 아는 sessionId/readingId 를 실으면 CONSUME 감사행에 박힌다.
  activity?: ChargeActivityLink
): Promise<{
  success: boolean
  error?: string
  chargedAs?: 'reading' | 'compatibility' | 'followUp'
}> {
  if (CREDITS_BYPASS) {
    return { success: true }
  }
  try {
    // 트랜잭션 내에서 원자적으로 체크 + 차감
    const result = await prisma.$transaction(async (tx) => {
      // 1. 크레딧 정보 가져오기 (트랜잭션 내에서)
      const credits = await tx.userCredits.findUnique({
        where: { userId },
      })

      if (!credits) {
        throw new CreditBusinessError('사용자 크레딧 정보를 찾을 수 없습니다')
      }

      // 2. 사용 가능 여부 — 이 제품은 "크레딧 사서 쓴 만큼 차감" (구매/보너스
      //    풀 단일). 월간 충전 모델은 없다(legacy monthlyCredits/usedCredits 는
      //    schema 에 deprecated 로만 남음). reading·compatibility·followUp 구분
      //    없이 크레딧 1개씩 소비.
      void type
      if (credits.bonusCredits < amount) {
        throw new CreditBusinessError('크레딧이 부족합니다')
      }

      // 3. BonusCreditPurchase 에서 FIFO(만료 임박순)로 원자 차감.
      //    helper 가 purchase 마다 CONSUME(pool=BONUS) audit row 를 emit 하고,
      //    `remaining >= toConsume` 조건부 updateMany 로 동시 차감 초과지출을 막는다.
      const actualConsumed = await consumeBonusCreditsFromPurchasesInTx(tx, userId, amount, {
        reason: 'consume_reading',
        emitAudit: true,
        activity,
      })

      // 실제 차감량이 모자라면 purchase 가 만료됐거나 동시 차감 race —
      //    잔액 부족으로 처리(트랜잭션 롤백).
      if (actualConsumed < amount) {
        throw new CreditBusinessError('크레딧이 부족합니다')
      }

      // 4. 보너스 집계 캐시(UserCredits.bonusCredits) 동기화. 실제 차감 가드는
      //    위 purchase 행 단위 조건부 update 가 담당한다.
      await tx.userCredits.update({
        where: { userId },
        data: { bonusCredits: { decrement: amount } },
      })

      // refund 경로 호환을 위해 chargedAs 유지 (이제 항상 'reading').
      return { success: true, chargedAs: 'reading' as const }
    })

    return result
  } catch (error) {
    // Business errors → return as result
    if (error instanceof CreditBusinessError) {
      return { success: false, error: error.message }
    }
    // System errors (Prisma, network) → rethrow for API middleware
    throw error
  }
}

// 트랜잭션 내에서 보너스 크레딧 차감 (헬퍼 함수)
// `opts.emitAudit` 가 true 면 차감한 purchase 행마다 CreditTransaction
// (CONSUME / BONUS) 을 한 줄씩 남긴다. consumeCredits 가 부르는 경로는 항상
// 켜고, 백필이나 fallback 경로에서는 호출자가 직접 audit 을 통제하도록 끈다.
export interface ChargeActivityLink {
  /** 과금을 일으킨 API 경로 (예: 'counselor/realtime'). 귀속/그루핑용. */
  apiRoute?: string
  /** 활동 종류 — reconciliation 이 어느 테이블을 조회할지 결정. */
  activityType?: 'counselor_session' | 'compat_session' | 'tarot_reading' | 'tarot_followup'
  /** 활동 레코드 식별자(sessionId/readingId 등). 과금 시점에 이미 알려진 값. */
  activityRef?: string
}

export async function consumeBonusCreditsFromPurchasesInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  amountToConsume: number,
  opts: { reason?: string; emitAudit?: boolean; activity?: ChargeActivityLink } = {}
): Promise<number> {
  const now = new Date()
  // select 명시 — 신규 컬럼(acknowledgedAt) prod 미적용 환경에서 P2022
  // 차단. consumeBonusCreditsFromPurchasesInTx 가 사용하는 필드만.
  const purchases = await tx.bonusCreditPurchase.findMany({
    where: {
      userId,
      expired: false,
      remaining: { gt: 0 },
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: 'asc' },
    select: { id: true, remaining: true },
  })

  if (purchases.length === 0) {
    return 0
  }

  const reason = opts.reason ?? 'consume_bonus'
  let totalConsumed = 0
  for (const purchase of purchases) {
    if (totalConsumed >= amountToConsume) break

    const toConsume = Math.min(purchase.remaining, amountToConsume - totalConsumed)
    if (toConsume <= 0) continue

    // 옛 코드: `purchase.remaining - toConsume` 절대값을 write 해 lost-update race
    // (두 동시 트랜잭션이 같은 `remaining=5` 읽고 둘 다 `remaining=4` write → 차감 1번
    // 누락). updateMany + relative decrement + `remaining >= toConsume` guard 로
    // race-safe. consumeBonusCreditOnceInTx 와 동일 패턴.
    // expired/expiresAt 재확인: 만료 cron 은 remaining 을 그대로 두고
    // expired=true 만 flip + 카운터 전액 차감하므로, findMany 와 이 update
    // 사이에 cron 이 끼면 remaining 가드만으로는 만료 lot 을 또 차감해
    // 카운터가 (만료분+차감분) 이중으로 깎인다.
    const updated = await tx.bonusCreditPurchase.updateMany({
      where: {
        id: purchase.id,
        remaining: { gte: toConsume },
        expired: false,
        expiresAt: { gt: now },
      },
      data: { remaining: { decrement: toConsume } },
    })

    // Prisma 는 항상 `{ count }` 반환. count===0 은 race (다른 tx 가 이미 차감).
    // mock 환경에서 count 가 undefined 반환되는 경우 옛 동작(항상 차감 성공) 유지.
    const updatedCount = (updated as { count?: number } | undefined)?.count
    if (updatedCount === 0) {
      // race: 다른 트랜잭션이 이미 차감해 toConsume 만큼 안 남음. 이 purchase 는 skip.
      continue
    }

    totalConsumed += toConsume

    if (opts.emitAudit) {
      const act = opts.activity
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'CONSUME',
          pool: 'BONUS',
          amount: -toConsume,
          reason,
          sourceRef: purchase.id,
          // 활동 링크(apiRoute/activityType/activityRef)를 메타에 박아, 사후
          // reconciliation 이 "과금됐는데 그 활동 레코드가 없음"을 정확히 잡는다.
          // 과금 시점에 이미 알려진 값만 싣고, 없으면 종전과 동일.
          metadata: {
            purchaseId: purchase.id,
            drained: toConsume,
            ...(act?.apiRoute ? { apiRoute: act.apiRoute } : {}),
            ...(act?.activityType ? { activityType: act.activityType } : {}),
            ...(act?.activityRef ? { activityRef: act.activityRef } : {}),
          },
        },
      })
    }
  }

  return totalConsumed
}

/**
 * 트랜잭션 내에서 보너스 1 개를 FIFO 로 차감 — `BonusCreditPurchase.remaining`
 * 과 `UserCredits.bonusCredits` 를 함께 줄여 시스템 전체 invariant
 * (sum(remaining where !expired) == UserCredits.bonusCredits) 를 유지한다.
 *
 * 그동안 couple-reading 등 일부 라우트가 자체 트랜잭션 안에서
 * `userCredits.bonusCredits` 만 줄이고 `BonusCreditPurchase.remaining` 은
 * 손대지 않아, 다음 차례에 `consumeBonusCreditsFromPurchasesInTx` 가 도는
 * 순간 "remaining 합 > 실제 보너스" 가 되어 over-grant 가 발생했다.
 * (FIFO drift.)
 *
 * 사용 패턴:
 *   const consumed = await consumeBonusCreditOnceInTx(tx, userId)
 *   if (consumed) charged = 'bonus'
 *
 * `consumeCredits` 와 달리 1 unit 단위로만 동작하고, 라우트가 자체 분기
 * (compat limit 등) 후 fallback 으로 호출하기 쉬운 형태로 단순화. 차감
 * 성공 시 true.
 */
export async function consumeBonusCreditOnceInTx(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<boolean> {
  const now = new Date()
  // 만료 임박한 것 먼저 → FIFO + 만료 우선 (consumeBonusCreditsFromPurchases
  // 와 동일 ordering).
  const purchase = await tx.bonusCreditPurchase.findFirst({
    where: {
      userId,
      expired: false,
      remaining: { gt: 0 },
      expiresAt: { gt: now },
    },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  })

  if (!purchase) {
    // 매칭 purchase 가 없으면 UserCredits.bonusCredits 만 줄이는 건 invariant
    // 를 더 어그러뜨릴 뿐이라 호출자가 다른 경로로 fallback 하도록 false.
    return false
  }

  // 조건부 update — 동시 차감 race 에서 0 으로 내려가지 않도록 remaining > 0
  // guard. expired/expiresAt 도 재확인한다: 만료 cron(expireBonusCredits)은
  // remaining 을 그대로 두고 expired=true 만 flip + 카운터를 전액 차감하므로,
  // select 와 update 사이에 cron 이 끼어들면 remaining 가드만으로는 만료된
  // lot 을 또 차감(카운터 이중 차감)하게 된다. 두 update 모두 같은 트랜잭션 안.
  const purchaseUpdate = await tx.bonusCreditPurchase.updateMany({
    where: { id: purchase.id, remaining: { gt: 0 }, expired: false, expiresAt: { gt: now } },
    data: { remaining: { decrement: 1 } },
  })

  if (purchaseUpdate.count === 0) {
    // race 로 다른 트랜잭션이 0 으로 내림 — 호출자가 retry / fallback.
    return false
  }

  const userUpdate = await tx.userCredits.updateMany({
    where: { userId, bonusCredits: { gt: 0 } },
    data: { bonusCredits: { decrement: 1 } },
  })

  if (userUpdate.count === 0) {
    // UserCredits.bonusCredits 가 이미 0 — 위에서 purchase 만 줄였으니
    // 트랜잭션 롤백을 일으켜 정합성을 지킨다. (호출자는 catch 해서 다른
    // 경로로 fallback 하거나 INSUFFICIENT 으로 응답.)
    throw new Error('consumeBonusCreditOnceInTx: UserCredits.bonusCredits already 0 (FIFO drift)')
  }

  // 감사 로그 — couple-reading / 다른 라우트가 이 헬퍼만 호출해도
  // CreditTransaction 이 남도록 helper 안에서 emit. sourceRef = 차감된 purchase.id.
  await tx.creditTransaction.create({
    data: {
      userId,
      type: 'CONSUME',
      pool: 'BONUS',
      amount: -1,
      reason: 'consume_bonus_once',
      sourceRef: purchase.id,
      metadata: { purchaseId: purchase.id },
    },
  })

  return true
}

// 기간 갱신 (cron / 만료 진입 시) — 크레딧 전용이라 월간 충전은 없다.
// 구매 크레딧(bonusCredits)은 자체 3개월 만료로 별도 관리되므로 여기서는
// 기간만 다음 달로 넘겨 getUserCredits 의 리셋 루프만 방지한다(잔액 보존).
// 보너스 크레딧 추가 (크레딧팩 구매 등)
export async function addBonusCredits(
  userId: string,
  amount: number,
  source: 'purchase' | 'referral' | 'promotion' | 'gift' = 'purchase',
  stripePaymentId?: string
) {
  await getUserCredits(userId)

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + 3) // 3개월 후 만료

  // BonusCreditPurchase + UserCredits 업데이트를 하나의 transaction 으로.
  // 이전엔 두 op 사이에 실패하면 구매 기록은 있는데 잔액은 안 늘거나(반대)
  // 데이터 불일치 발생 → "결제 됐는데 크레딧 없음" 회귀의 원인. 또
  // BonusCreditPurchase.stripePaymentId 에 unique constraint 가 걸려 있어
  // 같은 결제(Stripe webhook 재시도)로 두 번 도착해도 두 번째는 P2002 로
  // 막힘 — DB 레벨 멱등성. 호출자(webhook handler)는 P2002 를 잡아 silent
  // skip 한다.
  // 본인 결제 (purchase) 는 Stripe success 페이지가 곧 "받았어요" 확인
  // 페이지라 acknowledgment 가 자동. 자동 지급분 (referral / promotion / gift)
  // 만 null 로 둬서 다음 진입 시 모달 트리거.
  const acknowledgedAt = source === 'purchase' ? now : null

  const { updated, createdPurchaseId } = await prisma.$transaction(async (tx) => {
    // acknowledgedAt 컬럼 — 마이그레이션이 prod 에 아직 안 적용된 환경에서
    // 1차 시도 P2022 로 실패하면 acknowledgedAt 빼고 한 번 더 시도해서
    // 적어도 row 는 생성. 같은 패턴: tarot save route 의 신규 컬럼 처리.
    type CreateData = Parameters<typeof tx.bonusCreditPurchase.create>[0]['data']
    const baseData: CreateData = {
      userId,
      amount,
      remaining: amount,
      expiresAt,
      source,
      stripePaymentId,
    }
    let createdId: string | null = null
    try {
      const purchase = await tx.bonusCreditPurchase.create({
        data: { ...baseData, acknowledgedAt },
        select: { id: true },
      })
      createdId = purchase.id
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      const msg = (err as { message?: string } | null)?.message ?? ''
      const isMissingColumn =
        code === 'P2022' || (/column .* does not exist/i.test(msg) && /acknowledged/i.test(msg))
      if (!isMissingColumn) throw err
      // 컬럼 없음. acknowledgedAt 빼고 재시도 → 적어도 row 는 생성.
      const purchase = await tx.bonusCreditPurchase.create({
        data: baseData,
        select: { id: true },
      })
      createdId = purchase.id
    }

    const updatedCredits = await tx.userCredits.update({
      where: { userId },
      data: {
        bonusCredits: { increment: amount },
        totalBonusReceived: { increment: amount },
      },
    })

    return { updated: updatedCredits, createdPurchaseId: createdId }
  })

  // 감사 로그 — GRANT 한 줄. **의도적으로 위 transaction 밖에서** best-effort 로
  // 기록한다. CreditTransaction 은 잔액 재현용 redundant 감사 테이블이고 잔액의
  // source of truth 는 UserCredits + BonusCreditPurchase 다. 이 write 를
  // transaction 안에 두면, prod 에서 테이블이 phantom-apply 로 누락됐을 때
  // (P2021 / 42P01 "table does not exist") Postgres 가 트랜잭션 **전체**를
  // abort 시켜 BonusCreditPurchase + UserCredits 증가분까지 롤백 → "결제 됐는데
  // 크레딧 0, 영수증 메일도 안 감" 회귀가 발생한다(매 결제마다 webhook 500).
  // 밖으로 빼서 audit write 실패가 결제·지급을 절대 되돌리지 못하게 한다.
  // sourceRef 는 stripePaymentId (환불 추적 가능) 우선, 없으면 purchase.id.
  try {
    await prisma.creditTransaction.create({
      data: {
        userId,
        type: 'GRANT',
        pool: 'BONUS',
        amount,
        reason: `grant_${source}`,
        sourceRef: stripePaymentId ?? createdPurchaseId,
        metadata: {
          source,
          purchaseId: createdPurchaseId,
          stripePaymentId: stripePaymentId ?? null,
          expiresAt: expiresAt.toISOString(),
        },
      },
    })
  } catch (err) {
    // 크레딧은 이미 지급됨(transaction commit). 감사 행만 누락 — 비치명적.
    logger.error(
      '[addBonusCredits] CreditTransaction audit write failed — credit grant unaffected:',
      err
    )
  }

  return updated
}

// 유효한 보너스 크레딧 계산 (만료되지 않은 것만)
export async function getValidBonusCredits(userId: string): Promise<number> {
  const now = new Date()

  const validPurchases = await prisma.bonusCreditPurchase.findMany({
    where: {
      userId,
      expired: false,
      expiresAt: { gt: now },
      remaining: { gt: 0 },
    },
    select: { remaining: true },
  })

  return validPurchases.reduce((sum, p) => sum + p.remaining, 0)
}

// 만료 fan-out 동시성 상한 — Prisma/pg 풀 고갈(ECHECKOUTTIMEOUT) 방지.
const EXPIRY_CONCURRENCY = 8

// 만료된 보너스 크레딧 정리 (cron job용)
export async function expireBonusCredits() {
  const now = new Date()

  // 만료 대상이 있는 유저 worklist 만 뽑는다(중복 제거). 실제 차감 금액·감사
  // 행은 아래 트랜잭션에서 *잠근 현재값* 으로 다시 계산한다 — 이 읽기 값으로
  // 차감하면 동시 cron 실행이 같은 stale 값을 둘 다 빼는 이중차감이 난다.
  const expirableUsers = await prisma.bonusCreditPurchase.findMany({
    where: {
      expired: false,
      expiresAt: { lte: now },
      remaining: { gt: 0 },
    },
    select: { userId: true },
    distinct: ['userId'],
  })
  const userIds = expirableUsers.map((u) => u.userId)

  // 유저별 인터랙티브 트랜잭션 — 만료 대상 행을 FOR UPDATE 로 잠그고 다시 읽어
  // 그 잠근 집합에서만 차감액·감사행을 만든다. 동시 cron 실행은 이 행 잠금에서
  // 직렬화되어, 두 번째 실행의 SELECT 는 (이미 expired=true) 빈 결과 → no-op.
  // 따라서 이중차감(bonusCredits 두 번 빼기)·중복 EXPIRE 감사행이 불가능해진다.
  const runUserExpiry = (uid: string): Promise<number> =>
    prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; remaining: number }>>`
        SELECT "id", "remaining" FROM "BonusCreditPurchase"
        WHERE "userId" = ${uid}
          AND "expired" = false
          AND "expiresAt" <= ${now}
          AND "remaining" > 0
        FOR UPDATE
      `
      if (locked.length === 0) return 0 // 다른 실행이 이미 처리함 → no-op

      const expiredAmount = locked.reduce((sum, p) => sum + p.remaining, 0)
      const ids = locked.map((p) => p.id)

      // 잠근 행들만 expired=true 로 flip (이미 0-remaining/환불 행은 애초에 미포함).
      await tx.bonusCreditPurchase.updateMany({
        where: { id: { in: ids } },
        data: { expired: true },
      })
      // UserCredits 에서 만료 크레딧 차감 (atomic floor 0). 잠근 합계만큼만 1회.
      await tx.$executeRaw`
        UPDATE "UserCredits"
        SET "bonusCredits" = GREATEST(0, "bonusCredits" - ${expiredAmount})
        WHERE "userId" = ${uid}
      `
      // 감사 로그 — 잠근 purchase 마다 한 행 (sourceRef = purchase.id).
      await tx.creditTransaction.createMany({
        data: locked.map((p) => ({
          userId: uid,
          type: 'EXPIRE' as const,
          pool: 'BONUS' as const,
          amount: -p.remaining,
          reason: 'expire_bonus',
          sourceRef: p.id,
          metadata: { purchaseId: p.id, expiredAmount: p.remaining },
        })),
      })
      return expiredAmount
    })

  // fan-out 동시성 상한 — 각 작업이 인터랙티브 트랜잭션 1개(연결 1개 + FOR UPDATE)
  // 를 잡으므로, 만료일에 유저 수천 명을 Promise.allSettled 로 한 번에 띄우면
  // Prisma/pg 풀이 고갈돼 ECHECKOUTTIMEOUT 이 난다. 소수로 제한해 겹쳐 실행한다.
  const settle = (uid: string) => async (): Promise<PromiseSettledResult<number>> => {
    try {
      return { status: 'fulfilled', value: await runUserExpiry(uid) }
    } catch (reason) {
      return { status: 'rejected', reason }
    }
  }

  let results = await runWithConcurrency(
    userIds.map((uid) => settle(uid)),
    EXPIRY_CONCURRENCY
  )

  // 1회 재시도 — 일시적 connection blip / deadlock 등 회복 가능한 실패 대비.
  // 그래도 실패하면 critical 로그로 발행해 알림 시스템(메트릭/sentry)에서
  // 잡히도록 한다. 이전엔 단순 카운트만 하고 silent 였음.
  const rejectedIdx = results.flatMap((r, i) => (r.status === 'rejected' ? [i] : []))
  if (rejectedIdx.length > 0) {
    const retryResults = await runWithConcurrency(
      rejectedIdx.map((i) => settle(userIds[i])),
      EXPIRY_CONCURRENCY
    )
    retryResults.forEach((r, j) => {
      const origIdx = rejectedIdx[j]
      results = [...results.slice(0, origIdx), r, ...results.slice(origIdx + 1)]
      if (r.status === 'rejected') {
        logger.error('[expireBonusCredits] user expiry failed after retry', {
          userId: userIds[origIdx],
          reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
        })
      }
    })
  }

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length
  const totalCreditsExpired = results.reduce(
    (sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0),
    0
  )

  return {
    totalUsers: userIds.length,
    totalCreditsExpired,
    succeeded,
    failed,
  }
}

// 기능 사용 가능 여부 — 플랜 게이트 폐지, 크레딧만 있으면 모두 사용 가능.
export async function canUseFeature(_userId: string, _feature: FeatureType): Promise<boolean> {
  return true
}

// 전체 유저 기간 갱신 (cron job용)
// Stripe 환불(charge.refunded) 처리 — 결제 ID 로 BonusCreditPurchase 를
// 찾아 잔여 크레딧을 회수하고 해당 구매를 만료시킨다. 환불된 사용자가
// 남은 크레딧을 계속 쓰지 못하도록 막는 방어. 이미 다 쓴 크레딧은 회수할
// 수 없으므로 차감액 0 + 로그만 남긴다(loss).
export async function revokeBonusCreditPurchase(
  stripePaymentId: string
): Promise<{ revoked: boolean; reclaimed: number; alreadyUsed: number; error?: boolean }> {
  if (!stripePaymentId) return { revoked: false, reclaimed: 0, alreadyUsed: 0 }

  try {
    // 동시성: 예전엔 잠금 없는 findFirst 로 읽은 stale remaining 을 그대로
    // 무조건 update + 카운터 차감에 써서, 같은 결제의 webhook 이 동시에 두 번
    // 처리되거나(부분 환불 2건, 재전송 race) revoke 와 일반 차감이 겹치면
    // 카운터가 이중으로 깎여 사용자의 *다른* 팩 크레딧까지 회수됐다.
    // claimBonusPurchaseForRefund(:860) 와 동일하게 "exact remaining +
    // expired:false" 조건부 updateMany 를 원자 잠금으로 쓰고, 값이 바뀌어
    // 잠금에 실패하면 재읽기 후 재시도한다. expired 로 바뀌었으면 멱등 no-op.
    const MAX_ATTEMPTS = 3
    let reclaim = 0
    let alreadyUsed = 0
    let revoked = false
    let revokedUserId = ''
    let revokedPackAmount = 0

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // select 명시 — schema 의 acknowledgedAt 등 신규 컬럼 prod 미적용 시
      // default SELECT 가 죽는 회귀 차단. 함수에서 실제 사용하는 필드만.
      const purchase = await prisma.bonusCreditPurchase.findFirst({
        where: { stripePaymentId },
        select: { id: true, userId: true, amount: true, remaining: true, expired: true },
      })

      if (!purchase) {
        logger.warn('[revokeBonusCreditPurchase] no purchase found for paymentId', {
          stripePaymentId,
        })
        return { revoked: false, reclaimed: 0, alreadyUsed: 0 }
      }

      if (purchase.expired) {
        // 이미 만료/회수된 구매 — 멱등성 (중복 webhook 무시)
        return { revoked: false, reclaimed: 0, alreadyUsed: purchase.amount - purchase.remaining }
      }

      reclaim = purchase.remaining
      alreadyUsed = purchase.amount - purchase.remaining

      const claimed = await prisma.$transaction(async (tx) => {
        // 원자 잠금 — 읽은 remaining 이 그대로일 때만 성립. 동시 revoke 는
        // 둘 중 하나만 성공하고, 동시 일반 차감으로 remaining 이 변했으면
        // 실패 → 재읽기로 최신 값을 회수한다.
        const lock = await tx.bonusCreditPurchase.updateMany({
          where: { id: purchase.id, expired: false, remaining: reclaim },
          data: { remaining: 0, expired: true, expiresAt: new Date() },
        })
        if (lock.count !== 1) return false
        // 음수 방지 atomic — GREATEST 로 floor 를 0 에 박는다.
        await tx.$executeRaw`
          UPDATE "UserCredits"
          SET "bonusCredits" = GREATEST(0, "bonusCredits" - ${reclaim})
          WHERE "userId" = ${purchase.userId}
        `
        // 감사 로그 — REVOKE (BONUS) 한 줄 (reclaim 이 0 이면 생략).
        if (reclaim > 0) {
          await tx.creditTransaction.create({
            data: {
              userId: purchase.userId,
              type: 'REVOKE',
              pool: 'BONUS',
              amount: -reclaim,
              reason: 'stripe_refund',
              sourceRef: stripePaymentId,
              metadata: {
                purchaseId: purchase.id,
                stripePaymentId,
                reclaimed: reclaim,
                alreadyUsed,
              },
            },
          })
        }
        return true
      })

      if (claimed) {
        revoked = true
        revokedUserId = purchase.userId
        revokedPackAmount = purchase.amount
        break
      }
      // 잠금 실패 — 동시 변경. 루프 상단에서 재읽기 (expired 면 멱등 반환).
    }

    if (!revoked) {
      // 재시도 소진 — 지속 경합. reconciliation 이 잡도록 error 레벨 로그.
      logger.error('[revokeBonusCreditPurchase] claim failed after retries', {
        stripePaymentId,
      })
      return { revoked: false, reclaimed: 0, alreadyUsed: 0, error: true }
    }

    logger.warn('[revokeBonusCreditPurchase] revoked refunded purchase', {
      userId: revokedUserId,
      stripePaymentId,
      packAmount: revokedPackAmount,
      reclaimed: reclaim,
      alreadyUsed,
    })

    return { revoked: true, reclaimed: reclaim, alreadyUsed }
  } catch (error) {
    // 진짜 DB 오류 — not-found/already-revoked 의 정상 false 와 구분되게 error:true
    // 를 단다. 옛 코드는 그냥 {revoked:false} 를 돌려줬고, webhook 이 그걸
    // "이미 회수됨(멱등)" 으로 오인해 success 처리 → Stripe 재시도 안 함 →
    // *환불받은 사용자가 크레딧을 유지*했다. 호출자(webhook)는 error:true 를
    // 재시도 신호로 쓴다.
    logger.error('[revokeBonusCreditPurchase] error', { stripePaymentId, error })
    return { revoked: false, reclaimed: 0, alreadyUsed: 0, error: true }
  }
}

/* ===================== 셀프/어드민 환불 공유 원시함수 ===================== */
//
// me/refund-credit-pack 과 admin/refund-credit-pack 은 동일한 "현금 환불 전에
// 크레딧을 원자적으로 회수" 로직을 각자 복붙해 갖고 있었다 → 한 쪽만 고치면
// 나머지에 같은 TOCTOU 가 남는 두더지잡기. 두 라우트가 공유하는 단일 출처로
// 흡수한다. 핵심 불변식:
//   1) claim 은 Stripe 환불 *전에* 실행. 조건부 updateMany(remaining===expected
//      && !expired)로 그 사이 소비/이중환불이 일어났으면 count!==1 → 거부(현금
//      미이동). 같은 트랜잭션에서 잔액을 회수하고 REVOKE 원장을 남긴다.
//   2) Stripe 환불 실패 시 호출자는 rollback 으로 pack/잔액을 원복(GRANT 원장).

export interface RefundClaimParams {
  /** 대상 구매(pack) PK. */
  purchaseId: string
  /** pack 소유자 userId — 잔액 회수 + 원장 기록 대상. */
  ownerUserId: string
  /** pack 총 발급량(alreadyUsed 계산/메타용). */
  amount: number
  /**
   * 낙관적 가드 — 현재 remaining 이 정확히 이 값일 때만 claim 한다. me/(완전
   * 미사용)는 amount, admin force(부분 사용 허용)는 현재 remaining 을 넘긴다.
   * 회수량(reclaim)도 이 값이다.
   */
  expectedRemaining: number
  /** REVOKE 원장 reason ('self_refund' | 'admin_refund' | 'referral_reversed_on_refund'). */
  reason: string
  // 'system' — 사용자/관리자 액션이 아닌 시스템 트리거(예: 추천 대상 구매가
  // 환불돼 추천 보상 lot 을 되돌리는 경로). requireSourcePurchase 를 생략해
  // source='referral' lot 도 회수 대상으로 허용한다.
  initiatedBy: 'self' | 'admin' | 'system'
  /** stripePaymentId 등 원장 sourceRef. */
  sourceRef: string
  /** me/ 는 source='purchase' 가드 추가(프로모/추천분 환불 차단). admin/system 은 생략. */
  requireSourcePurchase?: boolean
  /** admin 호출 시 감사 메타에 남길 admin userId. */
  actorUserId?: string
}

/**
 * 환불용 원자적 claim + 회수. 성공 시 pack 은 만료(expired, remaining 0)되고
 * 잔액에서 reclaim(=expectedRemaining)만큼 회수된다. 그 사이 remaining 이
 * 달라졌거나 이미 만료됐으면 claimed:false (현금 미이동으로 거부해야 함).
 * 절대 throw 하지 않도록 호출자가 try 로 감싸되, 여기선 트랜잭션만 수행한다.
 */
export async function claimBonusPurchaseForRefund(
  params: RefundClaimParams
): Promise<{ claimed: boolean; reclaimed: number; alreadyUsed: number }> {
  const {
    purchaseId,
    ownerUserId,
    amount,
    expectedRemaining,
    reason,
    initiatedBy,
    sourceRef,
    requireSourcePurchase,
    actorUserId,
  } = params
  const reclaimed = expectedRemaining
  const alreadyUsed = amount - expectedRemaining

  const claimed = await prisma.$transaction(async (tx) => {
    const lock = await tx.bonusCreditPurchase.updateMany({
      where: {
        id: purchaseId,
        userId: ownerUserId,
        expired: false,
        remaining: expectedRemaining,
        ...(requireSourcePurchase ? { source: 'purchase' } : {}),
      },
      data: { remaining: 0, expired: true, expiresAt: new Date() },
    })
    if (lock.count !== 1) return false
    if (reclaimed > 0) {
      await tx.$executeRaw`
        UPDATE "UserCredits"
        SET "bonusCredits" = GREATEST(0, "bonusCredits" - ${reclaimed})
        WHERE "userId" = ${ownerUserId}
      `
      await tx.creditTransaction.create({
        data: {
          userId: ownerUserId,
          type: 'REVOKE',
          pool: 'BONUS',
          amount: -reclaimed,
          reason,
          sourceRef,
          metadata: {
            purchaseId,
            stripePaymentId: sourceRef,
            reclaimed,
            alreadyUsed,
            initiatedBy,
            ...(actorUserId ? { adminUserId: actorUserId } : {}),
          },
        },
      })
    }
    return true
  })

  return { claimed, reclaimed, alreadyUsed }
}

export interface RefundRollbackParams {
  purchaseId: string
  ownerUserId: string
  /** claim 에서 회수했던 양 — 그대로 재지급. 0 이면 잔액/원장 건드리지 않음. */
  reclaimed: number
  /** 복원할 remaining(=claim 의 expectedRemaining). */
  restoreRemaining: number
  /** 복원할 원래 만료시각(claim 이 now 로 덮었으므로 원복). */
  restoreExpiresAt: Date
  reason: string
  initiatedBy: 'self' | 'admin'
  sourceRef: string
  actorUserId?: string
}

/**
 * claim 을 되돌린다 — Stripe 환불이 실패했을 때 "크레딧만 뺏기고 현금은 못
 * 받는" 상태를 막기 위해 pack(remaining/expired/expiresAt)과 잔액을 원복하고
 * 보상 GRANT 원장을 남긴다. 호출자가 try 로 감싸 롤백 실패도 삼키고 CRITICAL
 * 로그를 남기도록 한다(throw 가능).
 */
export async function rollbackBonusPurchaseRefundClaim(
  params: RefundRollbackParams
): Promise<void> {
  const {
    purchaseId,
    ownerUserId,
    reclaimed,
    restoreRemaining,
    restoreExpiresAt,
    reason,
    initiatedBy,
    sourceRef,
    actorUserId,
  } = params
  await prisma.$transaction(async (tx) => {
    await tx.bonusCreditPurchase.update({
      where: { id: purchaseId },
      data: { remaining: restoreRemaining, expired: false, expiresAt: restoreExpiresAt },
    })
    if (reclaimed > 0) {
      await tx.$executeRaw`
        UPDATE "UserCredits"
        SET "bonusCredits" = "bonusCredits" + ${reclaimed}
        WHERE "userId" = ${ownerUserId}
      `
      await tx.creditTransaction.create({
        data: {
          userId: ownerUserId,
          type: 'GRANT',
          pool: 'BONUS',
          amount: reclaimed,
          reason,
          sourceRef,
          metadata: {
            purchaseId,
            stripePaymentId: sourceRef,
            restored: reclaimed,
            initiatedBy,
            ...(actorUserId ? { adminUserId: actorUserId } : {}),
          },
        },
      })
    }
  })
}
