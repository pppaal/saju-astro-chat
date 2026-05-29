'use client'

import * as React from 'react'
import Link from 'next/link'

interface RefundConsentModalProps {
  open: boolean
  // 모달 닫기 (배경 클릭, X, "취소" 등). 결제는 진행 안 됨.
  onClose: () => void
  // 사용자가 동의 체크 + "결제하기" 누른 경우. 호출자는 여기에 실제
  // checkout 흐름 (POST /api/checkout → Stripe redirect) 을 연결.
  onConfirm: () => void
  // 상단에 표시할 상품 요약 (예: "미니 팩 · 10 크레딧 · ₩1,900").
  // null 이면 안 표시.
  productSummary?: string | null
  locale: 'ko' | 'en'
}

// 결제 직전 청약철회 제한 동의 (전상법 §17 ②항 5호, EU CRD Art.16(m)).
//
// 이전엔 pricing 페이지 상단에 체크박스를 두고 "체크 안 하면 결제 버튼
// 비활성" 패턴이었는데:
//   - 사용자가 체크박스를 인지 못함 → 결제 버튼 눌렀는데 안 됨 → "결제
//     시스템이 안 열린다" 보고
//   - 법조항 표현 ("전상법 §17 ②항 5호") 이 시각적으로 거리감
//
// 이 모달은 결제 버튼 클릭 시점에 띄워, (1) 사용자가 결제를 시도한 직후
// 명시 동의를 받고 (2) 즉시 결제 흐름으로 연결. UX + 법적 안전 둘 다.
export function RefundConsentModal({
  open,
  onClose,
  onConfirm,
  productSummary,
  locale,
}: RefundConsentModalProps) {
  const [agreed, setAgreed] = React.useState(false)
  const isKo = locale === 'ko'

  // 모달 close 시 동의 상태 reset — 다음에 다시 열 때 깨끗하게.
  React.useEffect(() => {
    if (!open) setAgreed(false)
  }, [open])

  // ESC 키 close
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-consent-title"
      onClick={onClose}
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 pt-12 sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 text-stone-900 shadow-2xl"
      >
        <h2 id="refund-consent-title" className="text-lg font-bold">
          {isKo ? '결제 전 확인해주세요' : 'Please confirm before paying'}
        </h2>

        {productSummary && (
          <p className="mt-2 text-sm font-medium text-stone-700">{productSummary}</p>
        )}

        <p className="mt-4 text-[14px] leading-relaxed text-stone-700">
          {isKo ? (
            <>
              AI 리딩은 결제 후 곧바로 생성·제공이 시작돼요. 그래서 한 번 사용하면 부분 환불이
              어려울 수 있어요. 자세한 내용은{' '}
              <Link
                href="/policy/refund"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-700 underline"
              >
                환불 정책
              </Link>
              에서 확인할 수 있어요.
            </>
          ) : (
            <>
              AI readings start generating immediately after payment, so partial refunds may not be
              possible once used. See the full{' '}
              <Link
                href="/policy/refund"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-700 underline"
              >
                refund policy
              </Link>{' '}
              for details.
            </>
          )}
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-stone-50 p-3 transition hover:bg-stone-100">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-amber-700"
          />
          <span className="text-[13px] leading-snug text-stone-800">
            {isKo
              ? '이해했어요. 위 내용을 확인했고 결제를 진행할게요.'
              : "I understand. I've reviewed the above and want to proceed."}
          </span>
        </label>

        {/* 작은 글씨로 법조항 명시 — 일반 사용자는 안 봐도 되고, 필요한
            사람만 확인 가능. 메인 카피에선 제거. */}
        <p className="mt-3 text-[11px] text-stone-500">
          {isKo
            ? '전자상거래법 §17 ②항 5호 · EU CRD Art. 16(m)'
            : 'KR e-Commerce Act §17(2)(5) · EU CRD Art. 16(m)'}
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            {isKo ? '취소' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={!agreed}
            onClick={() => {
              if (!agreed) return
              onConfirm()
            }}
            className="flex-[2] rounded-full bg-amber-700 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
          >
            {isKo ? '결제하기' : 'Continue to payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
