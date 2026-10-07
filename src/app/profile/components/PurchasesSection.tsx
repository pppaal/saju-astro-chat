'use client'

import { useState } from 'react'
import { Coins, Gift, Receipt } from 'lucide-react'
import { logger } from '@/lib/logger'
import { DISPLAY_FEE_PERCENT, formatMinorUnits } from '@/lib/payments/stripeFees'
import { asMinor } from '@/lib/payments/money'
import {
  GOLD,
  type Locale,
  type PurchasesResponse,
  SectionSkeleton,
  cardCls,
  emptyCls,
  formatDateOnly,
  purchaseSourceLabel,
  rowCls,
  sectionLabelCls,
} from './profileShared'

interface Props {
  purchases: PurchasesResponse | null
  loading: boolean
  locale: Locale
  /** 환불 성공 후 구매내역·크레딧 재조회 */
  onRefunded: () => Promise<void>
}

// 구매 내역 — 크레딧 팩 구매/보상 목록 + 7일 내 미사용 팩 환불.
export function PurchasesSection({ purchases, loading, locale, onRefunded }: Props) {
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundError, setRefundError] = useState<string | null>(null)

  const handleRefundPurchase = async (purchaseId: string, packAmount: number) => {
    // 수수료 금액을 여기서 특정 통화로 적지 않는다. 구매 레코드에 통화 컬럼이
    // 없어 이 화면은 그 결제가 KRW 였는지 USD 였는지 모르고, 예전엔 영문 문구가
    // 미국 고객에게도 `~3.5% + ₩300` 이라고 원화로 고지했다. 실제 차감액은
    // 서버가 결제 통화로 계산해 응답(feeWithheld)에 담아 주므로, 여기선 고정
    // 수수료가 있다는 사실만 알린다.
    const ok = window.confirm(
      locale === 'ko'
        ? `${packAmount} 크레딧 팩을 환불하시겠어요?\n• 결제수수료(약 ${DISPLAY_FEE_PERCENT}% + 결제 통화별 고정 수수료)는 차감 후 환불됩니다.\n• 남은 크레딧은 자동으로 회수됩니다.`
        : `Refund ${packAmount}-credit pack?\n• The payment-processing fee (~${DISPLAY_FEE_PERCENT}% plus a fixed fee in your payment currency) is withheld.\n• Remaining credits are automatically revoked.`
    )
    if (!ok) return

    setRefundError(null)
    setRefundingId(purchaseId)
    try {
      const res = await fetch('/api/me/refund-credit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMsg = data?.error?.message || data?.error?.code || `요청 실패 (${res.status})`
        setRefundError(String(errMsg))
        return
      }
      const result = (data?.data || data) as {
        refundedKrw: number
        feeWithheld: number
        currency?: string
      }
      // 금액은 결제 통화의 최소 단위이므로 통화를 받아 포맷한다 — ₩ 를 박아
      // 찍으면 USD 환불에 "₩934"(실제 $9.34)가 나온다. 구버전 응답(currency
      // 없음)은 KRW 로 폴백(기존 동작).
      const cur = result.currency || 'krw'
      // 서버가 최소 단위로 내려준 값 — 여기서 단위를 보증한다(asMinor).
      const refunded = formatMinorUnits(asMinor(result.refundedKrw), cur)
      const fee = formatMinorUnits(asMinor(result.feeWithheld), cur)
      window.alert(
        locale === 'ko'
          ? `환불 완료\n실제 환불액: ${refunded}\n차감 수수료: ${fee}`
          : `Refunded\nAmount: ${refunded}\nFee withheld: ${fee}`
      )
      await onRefunded()
    } catch (err) {
      logger.warn('[profile/refund] failed', err)
      setRefundError(
        locale === 'ko'
          ? '환불 처리에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Refund failed. Please try again later.'
      )
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <section className={`mt-6 ${cardCls}`}>
      <h2 className={sectionLabelCls}>
        <Receipt className="h-3.5 w-3.5 text-[#a07a3c]" />
        {locale === 'ko' ? '구매 내역' : 'Purchase history'}
      </h2>

      {loading ? (
        <SectionSkeleton rows={3} />
      ) : !purchases || purchases.purchases.length === 0 ? (
        <div className={emptyCls}>
          <p className="text-[14px] text-[#57534e]">
            {locale === 'ko' ? '아직 구매 내역이 없어요' : 'No purchases yet'}
          </p>
          <p className="mt-1 text-[12px] text-[#a8a29e]">
            {locale === 'ko'
              ? '추천 보상이나 프로모션 크레딧도 여기에 표시돼요'
              : 'Referral and promotion credits will also show up here'}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {purchases.purchases.map((p) => {
            const isPaid = p.source === 'purchase'
            const within7Days =
              Date.now() - new Date(p.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000
            const isUnused = p.remaining === p.amount
            const canRefund = isPaid && !p.expired && isUnused && within7Days
            return (
              <li key={p.id} className={rowCls}>
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={
                    isPaid
                      ? { background: '#f1efeb', color: '#57534e' }
                      : { background: 'rgba(160,122,60,0.10)', color: GOLD }
                  }
                >
                  {isPaid ? <Coins className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-[#1c1917]">
                    +{p.amount} {locale === 'ko' ? '크레딧' : 'credits'}
                    <span className="rounded-full bg-[#f1efeb] px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-[#78716c]">
                      {purchaseSourceLabel(p.source, locale)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-[#a8a29e]">
                    {formatDateOnly(p.createdAt, locale)} ·{' '}
                    {p.expired
                      ? locale === 'ko'
                        ? '만료됨'
                        : 'expired'
                      : `${locale === 'ko' ? '남은' : 'remaining'} ${p.remaining}`}
                  </p>
                </div>
                {!p.expired && (
                  <span className="flex-shrink-0 text-[11px] text-[#a8a29e]">
                    {locale === 'ko' ? '만료' : 'exp'} {formatDateOnly(p.expiresAt, locale)}
                  </span>
                )}
                {canRefund && (
                  <button
                    type="button"
                    onClick={() => void handleRefundPurchase(p.id, p.amount)}
                    disabled={refundingId === p.id}
                    className="ml-1 flex-shrink-0 rounded-full border border-[#e7e5e4] px-2.5 py-1 text-[11px] font-medium text-[#57534e] hover:border-[#a8a29e] hover:text-[#1c1917] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refundingId === p.id
                      ? locale === 'ko'
                        ? '처리 중…'
                        : 'Refunding…'
                      : locale === 'ko'
                        ? '환불'
                        : 'Refund'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {refundError && <p className="mt-3 text-[12px] text-red-600">{refundError}</p>}
    </section>
  )
}
