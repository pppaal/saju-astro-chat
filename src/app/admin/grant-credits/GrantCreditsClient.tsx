'use client'

import { useState } from 'react'

interface GrantResult {
  success: boolean
  userId: string
  email: string | null
  name: string | null
  granted: number
  bonusBalanceAfter: number
  source: 'gift' | 'promotion'
  note: string | null
}

interface ApiError {
  code?: string
  message?: string
}

export default function GrantCreditsClient({
  initialUserId = '',
  embedded = false,
}: {
  initialUserId?: string
  embedded?: boolean
} = {}) {
  const [userIdOrEmail, setUserIdOrEmail] = useState(initialUserId)
  const [amount, setAmount] = useState<number>(10)
  const [source, setSource] = useState<'gift' | 'promotion'>('gift')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GrantResult | null>(null)

  const canSubmit = userIdOrEmail.trim().length > 0 && amount >= 1 && !loading

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (
      !window.confirm(
        `${userIdOrEmail.trim()} 에게 ${amount} 크레딧을 지급할까요? (만료: 3개월 후)`
      )
    ) {
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/grant-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIdOrEmail: userIdOrEmail.trim(),
          amount,
          source,
          note: note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const err = (data?.error || data) as ApiError
        setError(err?.message || err?.code || `요청 실패 (HTTP ${res.status})`)
        return
      }
      setResult((data?.data || data) as GrantResult)
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
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">크레딧 충전 (어드민)</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            유저 이메일 또는 User ID 로 즉시 보너스 크레딧 지급. 만료 3개월. 테스트·사과 보상·프로모션
            용도.
          </p>
        </header>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5"
      >
        <label className="block">
          <span className="text-sm font-medium text-stone-800">유저 이메일 또는 User ID</span>
          <input
            type="text"
            value={userIdOrEmail}
            onChange={(e) => setUserIdOrEmail(e.target.value)}
            placeholder="user@example.com 또는 cuid..."
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm focus:border-stone-500 focus:outline-none"
            autoComplete="off"
          />
          <span className="mt-1 block text-[12px] text-stone-500">
            @ 포함이면 email 로, 없으면 User ID 로 조회.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">크레딧 수량</span>
          <input
            type="number"
            min={1}
            max={10000}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value || '0', 10) || 0))}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm focus:border-stone-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">소스 (추적용)</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'gift' | 'promotion')}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          >
            <option value="gift">gift (선물·사과 보상·테스트)</option>
            <option value="promotion">promotion (프로모션 캠페인)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">메모 (선택)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 결제 실패 보상 / QA 테스트"
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
          <span className="mt-1 block text-[12px] text-stone-500">
            서버 로그에 남음. 화면이나 사용자에겐 안 보임.
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {loading ? '지급 중…' : '크레딧 지급'}
        </button>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="font-semibold text-emerald-800">충전 완료</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
              <dt className="text-emerald-700">대상</dt>
              <dd className="text-right">{result.name || '—'}</dd>
              <dt className="text-emerald-700">이메일</dt>
              <dd className="text-right break-all font-mono text-[12px]">{result.email || '—'}</dd>
              <dt className="text-emerald-700">지급</dt>
              <dd className="text-right font-mono font-semibold">+{result.granted}</dd>
              <dt className="text-emerald-700">보너스 잔액</dt>
              <dd className="text-right font-mono">{result.bonusBalanceAfter}</dd>
              <dt className="text-emerald-700">소스</dt>
              <dd className="text-right">{result.source}</dd>
              <dt className="text-emerald-700">User ID</dt>
              <dd className="text-right break-all font-mono text-[11px]">{result.userId}</dd>
            </dl>
          </div>
        )}
      </form>

      <p className="mt-6 text-[12px] leading-relaxed text-stone-500">
        ※ 지급된 크레딧은 일반 보너스 크레딧과 동일하게 동작합니다 — 3개월 후 만료, 사용 시 먼저
        차감. 환불 흐름과는 별개라 Stripe 결제 기록 없이 추적용 로그만 남깁니다.
      </p>
    </div>
  )
}
