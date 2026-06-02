'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import GrantCreditsClient from '../grant-credits/GrantCreditsClient'
import RefundClient from '../refunds/RefundClient'

// 지급/환불을 한 화면에서. 유저 상세에서 ?tab=grant&user= / ?tab=refund&pid= 로
// 딥링크되면 해당 탭이 열리고 입력값이 자동 채워진다.
type Tab = 'grant' | 'refund'

export default function CreditsClient() {
  const params = useSearchParams()
  const initialTab: Tab = params.get('tab') === 'refund' ? 'refund' : 'grant'
  const [tab, setTab] = useState<Tab>(initialTab)

  const user = params.get('user') ?? ''
  const pid = params.get('pid') ?? ''

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">크레딧 관리</h1>
        <p className="mt-1 text-sm text-stone-500">보너스 크레딧 지급 · 크레딧팩 환불</p>
      </div>

      <div className="mb-6 inline-flex gap-1 rounded-full border border-stone-200 bg-white p-1">
        {(['grant', 'refund'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            {t === 'grant' ? '지급(충전)' : '환불'}
          </button>
        ))}
      </div>

      {tab === 'grant' ? (
        <GrantCreditsClient embedded initialUserId={user} />
      ) : (
        <div>
          <RefundClient embedded initialPaymentId={pid} />
          <a
            href="https://dashboard.stripe.com/payments"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-[12px] font-medium text-stone-500 underline underline-offset-2 hover:text-stone-800"
          >
            ↗ Stripe 대시보드에서 결제 확인 (진실 원천)
          </a>
        </div>
      )}
    </div>
  )
}
