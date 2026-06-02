'use client'

import { useState } from 'react'

interface RefundResult {
  success: boolean
  refundedKrw: number
  feeWithheld: number
  originalAmount: number
  stripeRefundId: string
  creditsRevoked: number
  alreadyUsedCredits: number
  feeSource: 'balance_transaction' | 'formula'
}

interface ApiError {
  code?: string
  message?: string
}

function formatKrw(n: number) {
  return `₩${n.toLocaleString()}`
}

export default function RefundClient({
  initialPaymentId = '',
  embedded = false,
}: {
  initialPaymentId?: string
  embedded?: boolean
} = {}) {
  const [paymentId, setPaymentId] = useState(initialPaymentId)
  const [force, setForce] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RefundResult | null>(null)

  const canSubmit = paymentId.trim().length > 0 && !loading

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (!window.confirm('이 결제를 환불하시겠어요? 잔여 크레딧이 모두 회수됩니다.')) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/refund-credit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePaymentId: paymentId.trim(),
          force,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const err = (data?.error || data) as ApiError
        setError(err?.message || err?.code || `요청 실패 (HTTP ${res.status})`)
        return
      }
      setResult((data?.data || data) as RefundResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={embedded ? '' : 'mx-auto max-w-xl px-5 py-10'}>
      {!embedded && (
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">크레딧팩 환불 처리</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Stripe 결제수수료(약 3.5% + ₩300)를 차감해 부분 환불하고, 남은 크레딧을 자동 회수합니다.
            기본: 미사용 + 7일 이내만 가능 (관리자 강제 옵션 있음).
          </p>
        </header>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5"
      >
        <label className="block">
          <span className="text-sm font-medium text-stone-800">Stripe Payment Intent ID</span>
          <input
            type="text"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="pi_..."
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm focus:border-stone-500 focus:outline-none"
            autoComplete="off"
          />
          <span className="mt-1 block text-[12px] text-stone-500">
            Stripe 대시보드의 결제 상세 페이지에서 복사 (BonusCreditPurchase.stripePaymentId 와
            동일).
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>강제 환불</strong> — 7일 경과 / 일부 사용된 팩도 환불 (정책 우회). 신중히.
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {loading ? '처리 중…' : '환불 처리'}
        </button>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="font-semibold text-emerald-800">환불 완료</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
              <dt className="text-emerald-700">원 결제액</dt>
              <dd className="text-right font-mono">{formatKrw(result.originalAmount)}</dd>
              <dt className="text-emerald-700">차감(수수료)</dt>
              <dd className="text-right font-mono">- {formatKrw(result.feeWithheld)}</dd>
              <dt className="text-emerald-700">실제 환불액</dt>
              <dd className="text-right font-mono font-semibold">
                {formatKrw(result.refundedKrw)}
              </dd>
              <dt className="text-emerald-700">수수료 출처</dt>
              <dd className="text-right">
                {result.feeSource === 'balance_transaction' ? '정확값 (Stripe)' : '공식 폴백'}
              </dd>
              <dt className="text-emerald-700">회수 크레딧</dt>
              <dd className="text-right">
                {result.creditsRevoked} (이미 사용: {result.alreadyUsedCredits})
              </dd>
              <dt className="text-emerald-700">Stripe Refund ID</dt>
              <dd className="text-right break-all font-mono text-[11px]">
                {result.stripeRefundId}
              </dd>
            </dl>
          </div>
        )}
      </form>

      <p className="mt-6 text-[12px] leading-relaxed text-stone-500">
        ※ Stripe 의 결제수수료는 환불 시 사장님께 돌려주지 않습니다. 그래서 환불액에서 미리 차감해
        ±0원으로 정산합니다. (전자상거래법 7일 청약철회 — 디지털 미사용 한정, 부득이한 비용 차감
        가능)
      </p>
    </div>
  )
}
