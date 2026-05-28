import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { Prisma } from '@prisma/client'

// 크레딧 전용 모델 — 구독 플랜은 폐지됨. 신규 유저는 월간 무료 0,
// 한도 없음(궁합·후속질문도 일반 크레딧 1개씩 소비), 기록 보관 기본값만 둔다.
const DEFAULT_HISTORY_RETENTION_DAYS = 365

// 기능 게이트도 플랜과 함께 폐지 — 크레딧만 있으면 모든 기능 사용 가능.
export type FeatureType = string

// 테스트용 크레딧 우회 — CREDITS_BYPASS=true 일 때 동작한다. 운영 빌드에서도
// 켜지므로(배포 환경 테스트용) 실제 과금에 직접 영향을 준다. 켜면 타로/궁합/
// 운명 등 모든 크레딧 검사·차감이 통과된다. 테스트가 끝나면 반드시 끌 것.
const CREDITS_BYPASS = process.env.CREDITS_BYPASS === 'true'

// 켜져 있으면 프로세스 시작 시 한 번 경고 — 운영에 켜둔 채 방치하지 않도록.
if (CREDITS_BYPASS) {
  logger.warn(
    '[creditService] CREDITS_BYPASS 활성화 — 모든 크레딧 검사·차감이 우회됩니다. 운영에 켜져 있지 않은지 확인하세요.'
  )
}

// 월간 기간 계산 (다음 달 1일)
function getNextPeriodEnd(): Date {
  const now = new Date()
  // 다음 달 1일 00:00:00 (크레딧 리셋 기준일)
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

// 유저 크레딧 초기화 (신규 가입 시) — 가입 시 8 크레딧 일회성 보너스.
// 팩 크레딧 2배 정책(1 메시지 = 1 credit) 에 맞춰 4 → 8 로 상향: 종전과
// 동일한 "8 메시지 체험" 가치 유지.
const SIGNUP_BONUS = 8

export async function initializeUserCredits(userId: string) {
  const now = new Date()

  return prisma.userCredits.create({
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
}

// 유저 크레딧 조회 (없으면 생성)
export async function getUserCredits(userId: string) {
  let credits = await prisma.userCredits.findUnique({
    where: { userId },
  })

  // 없으면 생성
  if (!credits) {
    credits = await initializeUserCredits(userId)
  }

  // 기간 만료 시 리셋
  if (credits.periodEnd && new Date() > credits.periodEnd) {
    credits = await resetMonthlyCredits(userId)
  }

  return credits
}

// 크레딧 잔여량 조회
export async function getCreditBalance(userId: string) {
  const credits = await getUserCredits(userId)
  const remaining = credits.monthlyCredits - credits.usedCredits + credits.bonusCredits
  // totalBonusReceived가 없는 기존 유저는 현재 bonusCredits를 사용
  const totalBonus =
    (credits as { totalBonusReceived?: number }).totalBonusReceived ?? credits.bonusCredits
  const totalCredits = credits.monthlyCredits + totalBonus

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

// 보너스 크레딧 소비 (FIFO - 먼저 구매한 것부터 사용)
// Optimized to use batch updates instead of N+1 queries
async function consumeBonusCreditsFromPurchases(userId: string, amount: number): Promise<number> {
  if (amount <= 0) {
    return 0
  }

  const now = new Date()

  // 유효한 보너스 구매 건 조회 (먼저 구매한 것부터, 만료 임박한 것부터)
  const validPurchases = await prisma.bonusCreditPurchase.findMany({
    where: {
      userId,
      expired: false,
      expiresAt: { gt: now },
      remaining: { gt: 0 },
    },
    orderBy: [
      { expiresAt: 'asc' }, // 만료 임박한 것 먼저
      { createdAt: 'asc' }, // 먼저 구매한 것 먼저
    ],
  })

  let remainingToConsume = amount
  let totalConsumed = 0

  // Collect updates to batch process
  const updates: Array<{ id: string; decrement: number }> = []

  for (const purchase of validPurchases) {
    if (remainingToConsume <= 0) {
      break
    }

    const toConsume = Math.min(purchase.remaining, remainingToConsume)
    updates.push({ id: purchase.id, decrement: toConsume })

    totalConsumed += toConsume
    remainingToConsume -= toConsume
  }

  // Sequential update using interactive transaction (prevents deadlocks from concurrent access)
  if (updates.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const { id, decrement } of updates) {
        await tx.bonusCreditPurchase.update({
          where: { id },
          data: { remaining: { decrement } },
        })
      }
    })
  }

  return totalConsumed
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
  amount: number = 1
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

      // 2. 사용 가능 여부 체크 (트랜잭션 내에서)
      // 크레딧 전용: reading·compatibility·followUp 구분 없이 일반 크레딧 1개씩 소비.
      void type
      const available = credits.monthlyCredits - credits.usedCredits + credits.bonusCredits

      if (available < amount) {
        throw new CreditBusinessError('크레딧이 부족합니다')
      }

      // 3. 보너스 크레딧 먼저 사용 (만료 임박한 것부터)
      let fromBonus = 0
      let fromMonthly = amount

      if (credits.bonusCredits > 0) {
        fromBonus = Math.min(credits.bonusCredits, amount)
        fromMonthly = amount - fromBonus

        // BonusCreditPurchase 테이블에서 FIFO로 차감 (트랜잭션 내에서)
        const actualBonusConsumed = await consumeBonusCreditsFromPurchasesInTx(
          tx,
          userId,
          fromBonus
        )
        // 실제 차감된 양과 다르면 조정 (레거시 데이터 대응)
        if (actualBonusConsumed < fromBonus) {
          fromMonthly += fromBonus - actualBonusConsumed
          fromBonus = actualBonusConsumed
        }
      }

      // 4. 크레딧 차감 (트랜잭션 내에서 원자적으로)
      const updateData: Record<string, { increment?: number; decrement?: number }> = {}
      if (fromBonus > 0) {
        updateData.bonusCredits = { decrement: fromBonus }
      }
      if (fromMonthly > 0) {
        updateData.usedCredits = { increment: fromMonthly }
      }

      if (Object.keys(updateData).length > 0) {
        await tx.userCredits.update({
          where: { userId },
          data: updateData,
        })
      }

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
async function consumeBonusCreditsFromPurchasesInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  amountToConsume: number
): Promise<number> {
  const now = new Date()
  const purchases = await tx.bonusCreditPurchase.findMany({
    where: {
      userId,
      expired: false,
      remaining: { gt: 0 },
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: 'asc' },
  })

  if (purchases.length === 0) {
    return 0
  }

  let totalConsumed = 0
  for (const purchase of purchases) {
    if (totalConsumed >= amountToConsume) break

    const toConsume = Math.min(purchase.remaining, amountToConsume - totalConsumed)
    totalConsumed += toConsume

    const newRemaining = purchase.remaining - toConsume
    await tx.bonusCreditPurchase.update({
      where: { id: purchase.id },
      data: { remaining: newRemaining },
    })
  }

  return totalConsumed
}

// 기간 갱신 (cron / 만료 진입 시) — 크레딧 전용이라 월간 충전은 없다.
// 구매 크레딧(bonusCredits)은 자체 3개월 만료로 별도 관리되므로 여기서는
// 기간만 다음 달로 넘겨 getUserCredits 의 리셋 루프만 방지한다(잔액 보존).
export async function resetMonthlyCredits(userId: string) {
  const credits = await prisma.userCredits.findUnique({
    where: { userId },
  })

  if (!credits) {
    return initializeUserCredits(userId)
  }

  const now = new Date()
  return prisma.userCredits.update({
    where: { userId },
    data: {
      periodStart: now,
      periodEnd: getNextPeriodEnd(),
    },
  })
}

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
  return prisma.$transaction(async (tx) => {
    await tx.bonusCreditPurchase.create({
      data: {
        userId,
        amount,
        remaining: amount,
        expiresAt,
        source,
        stripePaymentId,
      },
    })
    return tx.userCredits.update({
      where: { userId },
      data: {
        bonusCredits: { increment: amount },
        totalBonusReceived: { increment: amount },
      },
    })
  })
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

// 만료된 보너스 크레딧 정리 (cron job용)
export async function expireBonusCredits() {
  const now = new Date()

  // 만료된 구매 건 조회
  const expiredPurchases = await prisma.bonusCreditPurchase.findMany({
    where: {
      expired: false,
      expiresAt: { lte: now },
      remaining: { gt: 0 },
    },
    select: { id: true, userId: true, remaining: true },
  })

  // 각 유저별로 만료된 크레딧 합계
  const userExpiredCredits = new Map<string, number>()
  for (const p of expiredPurchases) {
    userExpiredCredits.set(p.userId, (userExpiredCredits.get(p.userId) || 0) + p.remaining)
  }

  // 트랜잭션으로 처리 — bonusCredits 차감은 GREATEST(0, ...) 로 음수 drift 방어.
  const runUserExpiry = (uid: string, expiredAmount: number) =>
    prisma.$transaction([
      // 만료된 구매 건들 업데이트
      prisma.bonusCreditPurchase.updateMany({
        where: {
          userId: uid,
          expired: false,
          expiresAt: { lte: now },
        },
        data: { expired: true },
      }),
      // UserCredits 에서 만료된 크레딧 차감 (atomic floor 0)
      prisma.$executeRaw`
        UPDATE "UserCredits"
        SET "bonusCredits" = GREATEST(0, "bonusCredits" - ${expiredAmount})
        WHERE "userId" = ${uid}
      `,
    ])

  const entries = Array.from(userExpiredCredits.entries())
  let results = await Promise.allSettled(entries.map(([uid, amt]) => runUserExpiry(uid, amt)))

  // 1회 재시도 — 일시적 connection blip / deadlock 등 회복 가능한 실패 대비.
  // 그래도 실패하면 critical 로그로 발행해 알림 시스템(메트릭/sentry)에서
  // 잡히도록 한다. 이전엔 단순 카운트만 하고 silent 였음.
  const rejectedIdx = results.flatMap((r, i) => (r.status === 'rejected' ? [i] : []))
  if (rejectedIdx.length > 0) {
    const retryEntries = rejectedIdx.map((i) => entries[i])
    const retryResults = await Promise.allSettled(
      retryEntries.map(([uid, amt]) => runUserExpiry(uid, amt))
    )
    retryResults.forEach((r, j) => {
      const origIdx = rejectedIdx[j]
      results = [...results.slice(0, origIdx), r, ...results.slice(origIdx + 1)]
      if (r.status === 'rejected') {
        const [uid, amt] = retryEntries[j]
        logger.error('[expireBonusCredits] user expiry failed after retry', {
          userId: uid,
          expiredAmount: amt,
          reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
        })
      }
    })
  }

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return {
    totalUsers: userExpiredCredits.size,
    totalCreditsExpired: Array.from(userExpiredCredits.values()).reduce((a, b) => a + b, 0),
    succeeded,
    failed,
  }
}

// 기능 사용 가능 여부 — 플랜 게이트 폐지, 크레딧만 있으면 모두 사용 가능.
export async function canUseFeature(_userId: string, _feature: FeatureType): Promise<boolean> {
  return true
}

// 전체 유저 기간 갱신 (cron job용)
export async function resetAllExpiredCredits() {
  const now = new Date()

  const expiredUsers = await prisma.userCredits.findMany({
    where: {
      periodEnd: { lte: now },
    },
    select: { userId: true },
  })

  const results = await Promise.allSettled(
    expiredUsers.map((user) => resetMonthlyCredits(user.userId))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return { total: expiredUsers.length, succeeded, failed }
}

// Stripe 환불(charge.refunded) 처리 — 결제 ID 로 BonusCreditPurchase 를
// 찾아 잔여 크레딧을 회수하고 해당 구매를 만료시킨다. 환불된 사용자가
// 남은 크레딧을 계속 쓰지 못하도록 막는 방어. 이미 다 쓴 크레딧은 회수할
// 수 없으므로 차감액 0 + 로그만 남긴다(loss).
export async function revokeBonusCreditPurchase(
  stripePaymentId: string
): Promise<{ revoked: boolean; reclaimed: number; alreadyUsed: number }> {
  if (!stripePaymentId) return { revoked: false, reclaimed: 0, alreadyUsed: 0 }

  try {
    const purchase = await prisma.bonusCreditPurchase.findFirst({
      where: { stripePaymentId },
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

    const reclaim = purchase.remaining
    const alreadyUsed = purchase.amount - purchase.remaining

    // 음수 방지 atomic — Prisma 의 단순 decrement 는 raw guard 가 없어
    // 동시 차감 / 다른 경로의 0 도달 시 음수 drift 발생 가능. GREATEST 로
    // floor 를 0 에 박아 transaction 안에서 한 줄로 처리.
    await prisma.$transaction([
      prisma.bonusCreditPurchase.update({
        where: { id: purchase.id },
        data: { remaining: 0, expired: true, expiresAt: new Date() },
      }),
      prisma.$executeRaw`
        UPDATE "UserCredits"
        SET "bonusCredits" = GREATEST(0, "bonusCredits" - ${reclaim})
        WHERE "userId" = ${purchase.userId}
      `,
    ])

    logger.warn('[revokeBonusCreditPurchase] revoked refunded purchase', {
      userId: purchase.userId,
      stripePaymentId,
      packAmount: purchase.amount,
      reclaimed: reclaim,
      alreadyUsed,
    })

    return { revoked: true, reclaimed: reclaim, alreadyUsed }
  } catch (error) {
    logger.error('[revokeBonusCreditPurchase] error', { stripePaymentId, error })
    return { revoked: false, reclaimed: 0, alreadyUsed: 0 }
  }
}
