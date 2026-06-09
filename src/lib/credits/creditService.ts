import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
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
        // helper 가 차감한 purchase 마다 CONSUME(pool=BONUS) audit row 를 emit.
        const actualBonusConsumed = await consumeBonusCreditsFromPurchasesInTx(
          tx,
          userId,
          fromBonus,
          { reason: 'consume_reading', emitAudit: true }
        )
        // 실제 차감된 양이 의도한 양보다 적은 경우 — purchase 가 만료됐거나
        // 동시 차감으로 race 났음. 옛 코드는 부족분을 그냥 fromMonthly 로
        // 넘겨 usedCredits 증가 → monthly 가 음수로 침범 가능 (사용자에게
        // 무료 사용 허용). 부족분을 monthly 로 넘기되 실제 monthly 잔액으로
        // 검증해 부족하면 throw. monthly 잔액 = monthlyCredits - usedCredits.
        // (그 시점 트랜잭션 안에선 아직 usedCredits 증가 전이라 fresh value.)
        if (actualBonusConsumed < fromBonus) {
          const shortfall = fromBonus - actualBonusConsumed
          const monthlyAvailable = credits.monthlyCredits - credits.usedCredits
          const newMonthly = fromMonthly + shortfall
          if (monthlyAvailable < newMonthly) {
            throw new CreditBusinessError('크레딧이 부족합니다')
          }
          fromMonthly = newMonthly
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

      // 5. 감사 로그 — monthly 차감분에 대해 한 줄 (보너스 풀 차감은
      // consumeBonusCreditsFromPurchasesInTx 가 emit 한다).
      if (fromMonthly > 0) {
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'CONSUME',
            pool: 'MONTHLY',
            amount: -fromMonthly,
            reason: `consume_${type}`,
            sourceRef: null,
            metadata: { requested: amount, fromBonus, fromMonthly, type },
          },
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
// `opts.emitAudit` 가 true 면 차감한 purchase 행마다 CreditTransaction
// (CONSUME / BONUS) 을 한 줄씩 남긴다. consumeCredits 가 부르는 경로는 항상
// 켜고, 백필이나 fallback 경로에서는 호출자가 직접 audit 을 통제하도록 끈다.
export async function consumeBonusCreditsFromPurchasesInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  amountToConsume: number,
  opts: { reason?: string; emitAudit?: boolean } = {}
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
    const updated = await tx.bonusCreditPurchase.updateMany({
      where: { id: purchase.id, remaining: { gte: toConsume } },
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
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'CONSUME',
          pool: 'BONUS',
          amount: -toConsume,
          reason,
          sourceRef: purchase.id,
          metadata: { purchaseId: purchase.id, drained: toConsume },
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
  // guard. 두 update 모두 같은 트랜잭션 안.
  const purchaseUpdate = await tx.bonusCreditPurchase.updateMany({
    where: { id: purchase.id, remaining: { gt: 0 } },
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

  // 각 유저별로 만료된 크레딧 합계 + per-purchase 명세 (감사 로그용)
  const userExpiredCredits = new Map<string, number>()
  const userExpiredPurchases = new Map<string, Array<{ id: string; remaining: number }>>()
  for (const p of expiredPurchases) {
    userExpiredCredits.set(p.userId, (userExpiredCredits.get(p.userId) || 0) + p.remaining)
    const list = userExpiredPurchases.get(p.userId) ?? []
    list.push({ id: p.id, remaining: p.remaining })
    userExpiredPurchases.set(p.userId, list)
  }

  // 트랜잭션으로 처리 — bonusCredits 차감은 GREATEST(0, ...) 로 음수 drift 방어.
  // CreditTransaction (EXPIRE / BONUS) 는 행마다 한 줄씩 — sourceRef = purchase.id.
  const runUserExpiry = (
    uid: string,
    expiredAmount: number,
    purchases: Array<{ id: string; remaining: number }>
  ) =>
    prisma.$transaction([
      // 만료된 구매 건들 업데이트 — `remaining > 0` 필터는 필수.
      // 차감 합계 (expiredAmount) 는 `remaining > 0` 행만으로 계산되는데,
      // 여기서 그 필터 없이 expired=true 로 flip 하면 이미 0 remaining
      // 인(소진됐거나 환불·회수된) 구매까지 expired=true 로 변형됨.
      // 잔액 영향은 없지만 audit trail 이 오염되고,
      // revokeBonusCreditPurchase 의 `purchase.expired` 멱등성 가드가
      // 오작동(이미 환불된 0-remaining 행을 다시 환불 시도 시
      // already_refunded 로 잘못 분기) 한다.
      prisma.bonusCreditPurchase.updateMany({
        where: {
          userId: uid,
          expired: false,
          expiresAt: { lte: now },
          remaining: { gt: 0 },
        },
        data: { expired: true },
      }),
      // UserCredits 에서 만료된 크레딧 차감 (atomic floor 0)
      prisma.$executeRaw`
        UPDATE "UserCredits"
        SET "bonusCredits" = GREATEST(0, "bonusCredits" - ${expiredAmount})
        WHERE "userId" = ${uid}
      `,
      // 감사 로그 — purchase 마다 한 행 (sourceRef = purchase.id).
      prisma.creditTransaction.createMany({
        data: purchases.map((p) => ({
          userId: uid,
          type: 'EXPIRE' as const,
          pool: 'BONUS' as const,
          amount: -p.remaining,
          reason: 'expire_bonus',
          sourceRef: p.id,
          metadata: { purchaseId: p.id, expiredAmount: p.remaining },
        })),
      }),
    ])

  const entries = Array.from(userExpiredCredits.entries())
  let results = await Promise.allSettled(
    entries.map(([uid, amt]) => runUserExpiry(uid, amt, userExpiredPurchases.get(uid) ?? []))
  )

  // 1회 재시도 — 일시적 connection blip / deadlock 등 회복 가능한 실패 대비.
  // 그래도 실패하면 critical 로그로 발행해 알림 시스템(메트릭/sentry)에서
  // 잡히도록 한다. 이전엔 단순 카운트만 하고 silent 였음.
  const rejectedIdx = results.flatMap((r, i) => (r.status === 'rejected' ? [i] : []))
  if (rejectedIdx.length > 0) {
    const retryEntries = rejectedIdx.map((i) => entries[i])
    const retryResults = await Promise.allSettled(
      retryEntries.map(([uid, amt]) => runUserExpiry(uid, amt, userExpiredPurchases.get(uid) ?? []))
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

    const reclaim = purchase.remaining
    const alreadyUsed = purchase.amount - purchase.remaining

    // 음수 방지 atomic — Prisma 의 단순 decrement 는 raw guard 가 없어
    // 동시 차감 / 다른 경로의 0 도달 시 음수 drift 발생 가능. GREATEST 로
    // floor 를 0 에 박아 transaction 안에서 한 줄로 처리.
    // 감사 로그 — REVOKE (BONUS) 한 줄 (reclaim 이 0 이면 생략).
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.bonusCreditPurchase.update({
        where: { id: purchase.id },
        data: { remaining: 0, expired: true, expiresAt: new Date() },
      }),
      prisma.$executeRaw`
        UPDATE "UserCredits"
        SET "bonusCredits" = GREATEST(0, "bonusCredits" - ${reclaim})
        WHERE "userId" = ${purchase.userId}
      `,
    ]
    if (reclaim > 0) {
      ops.push(
        prisma.creditTransaction.create({
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
      )
    }
    await prisma.$transaction(ops)

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
