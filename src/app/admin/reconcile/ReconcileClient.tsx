'use client'

import { useState } from 'react'

interface RowResult {
  sessionId: string
  status: string
  userId?: string
  email?: string | null
  pack?: string
  credits?: number
  paymentIntentId?: string
  detail?: string
}

interface ReconcileResponse {
  query: string
  apply: boolean
  sessionsFound: number
  summary: Record<string, number>
  results: RowResult[]
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  ok: { text: '정상(이미 반영됨)', cls: 'bg-stone-100 text-stone-600' },
  missing: { text: '누락 — 복구 대상', cls: 'bg-amber-100 text-amber-800' },
  granted: { text: '복구됨(크레딧 지급)', cls: 'bg-emerald-100 text-emerald-800' },
  refunded: { text: '환불됨 — 건너뜀', cls: 'bg-stone-100 text-stone-500' },
  unpaid: { text: '미결제/보류', cls: 'bg-stone-100 text-stone-500' },
  not_credit_pack: { text: '크레딧팩 아님', cls: 'bg-stone-100 text-stone-400' },
  bad_metadata: { text: '메타데이터 불량', cls: 'bg-rose-100 text-rose-700' },
  user_missing: { text: '유저 없음', cls: 'bg-rose-100 text-rose-700' },
  grant_failed: { text: '지급 실패', cls: 'bg-rose-100 text-rose-700' },
}

export default function ReconcileClient() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReconcileResponse | null>(null)

  const run = async (apply: boolean) => {
    const q = query.trim()
    if (q.length < 3) {
      setError('결제 ID(pi_… / cs_… / ch_…) 또는 이메일을 입력하세요')
      return
    }
    if (apply && !window.confirm('누락된 결제에 크레딧을 실제로 지급합니다. 진행할까요?')) {
      return
    }
    setLoading(true)
    setError(null)
    if (!apply) setData(null)
    try {
      const res = await fetch('/api/admin/reconcile-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, apply }),
      })
      const json = await res.json()
      if (!res.ok) {
        const err = (json?.error || json) as { message?: string; code?: string }
        setError(err?.message || err?.code || `요청 실패 (HTTP ${res.status})`)
        return
      }
      setData((json?.data || json) as ReconcileResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  const missingCount = data?.results.filter((r) => r.status === 'missing').length ?? 0

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">결제 점검·복구</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Stripe엔 결제가 있는데 크레딧이 안 들어간(웹훅 누락) 건을 찾아 복구합니다. Stripe 결제 ID
          (<span className="font-mono">pi_…</span> / <span className="font-mono">cs_…</span> /{' '}
          <span className="font-mono">ch_…</span>) 또는 구매자 이메일을 입력하세요.
        </p>
      </header>

      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="pi_3Q… / cs_… / ch_… / buyer@email.com"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm focus:border-stone-500 focus:outline-none"
          autoComplete="off"
          autoCapitalize="none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => run(false)}
            disabled={loading}
            className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
          >
            {loading ? '확인 중…' : '점검 (확인만)'}
          </button>
          <button
            onClick={() => run(true)}
            disabled={loading}
            className="flex-1 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
          >
            복구 (크레딧 지급)
          </button>
        </div>
        <p className="text-[12px] text-stone-500">
          먼저 “점검”으로 누락 여부를 확인한 뒤 “복구”를 누르세요. 멱등 처리라 여러 번 눌러도 중복
          지급되지 않습니다. 환불된 결제는 자동으로 건너뜁니다.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              결과 — Stripe 세션 {data.sessionsFound}건{data.apply ? ' · 복구 실행' : ' · 점검'}
            </h2>
            {!data.apply && missingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[12px] font-medium text-amber-800">
                누락 {missingCount}건 — “복구” 누르세요
              </span>
            )}
          </div>

          {data.results.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-400">
              해당하는 Stripe 결제 세션을 찾지 못했습니다. ID/이메일을 확인하세요.
            </div>
          ) : (
            <div className="space-y-2">
              {data.results.map((r) => {
                const label = STATUS_LABEL[r.status] || {
                  text: r.status,
                  cls: 'bg-stone-100 text-stone-600',
                }
                return (
                  <div
                    key={r.sessionId}
                    className="rounded-xl border border-stone-200 bg-white p-4 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${label.cls}`}
                      >
                        {label.text}
                      </span>
                      {typeof r.credits === 'number' && (
                        <span className="font-mono tabular-nums text-stone-700">
                          {r.pack} · +{r.credits} 크레딧
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 space-y-0.5 text-[12px] text-stone-500">
                      {r.email !== undefined && (
                        <div className="flex justify-between gap-2">
                          <dt>구매자</dt>
                          <dd className="break-all font-mono text-stone-700">
                            {r.email || r.userId || '—'}
                          </dd>
                        </div>
                      )}
                      {r.userId && (
                        <div className="flex justify-between gap-2">
                          <dt>User ID</dt>
                          <dd className="break-all font-mono text-stone-400">{r.userId}</dd>
                        </div>
                      )}
                      {r.paymentIntentId && (
                        <div className="flex justify-between gap-2">
                          <dt>Payment</dt>
                          <dd className="break-all font-mono text-stone-400">
                            {r.paymentIntentId}
                          </dd>
                        </div>
                      )}
                      {r.detail && (
                        <div className="flex justify-between gap-2">
                          <dt>비고</dt>
                          <dd className="text-stone-500">{r.detail}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
