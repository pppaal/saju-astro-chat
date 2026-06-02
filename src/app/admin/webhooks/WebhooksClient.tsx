'use client'

import { useCallback, useEffect, useState } from 'react'

interface WebhookData {
  rangeDays: number
  total: number
  failed: number
  successRate: number
  byType: { type: string; total: number; failed: number }[]
  recentFailures: { id: string; eventId: string; type: string; processedAt: string; errorMsg: string | null }[]
}

function num(n: number): string {
  return n.toLocaleString('ko-KR')
}

export default function WebhooksClient() {
  const [data, setData] = useState<WebhookData | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/webhook-events?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`)
      setData((json?.data || json) as WebhookData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const healthy = data ? data.successRate >= 99 : true

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">결제 · 웹훅 모니터</h1>
          <p className="mt-1 text-sm text-stone-500">Stripe 웹훅 처리 결과 · 최근 {days}일</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full border border-stone-200 bg-white p-1">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  days === d ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
                }`}
              >
                {d}일
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
          >
            {loading ? '새로고침 중…' : '새로고침'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          불러오는 중…
        </div>
      ) : data ? (
        <>
          <div className="mb-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="text-[13px] text-stone-500">처리 이벤트</div>
              <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{num(data.total)}</div>
            </div>
            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                data.failed > 0 ? 'border-rose-200 bg-rose-50' : 'border-stone-200 bg-white'
              }`}
            >
              <div className="text-[13px] text-stone-500">실패</div>
              <div
                className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
                  data.failed > 0 ? 'text-rose-700' : ''
                }`}
              >
                {num(data.failed)}
              </div>
            </div>
            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                healthy ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="text-[13px] text-stone-500">성공률</div>
              <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{data.successRate}%</div>
            </div>
          </div>

          {data.byType.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">이벤트 타입별</h2>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                      <th className="px-4 py-2 font-medium">타입</th>
                      <th className="px-4 py-2 text-right font-medium">처리</th>
                      <th className="px-4 py-2 text-right font-medium">실패</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byType.map((t) => (
                      <tr key={t.type} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-2 font-mono text-[13px] text-stone-700">{t.type}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-stone-600">{num(t.total)}</td>
                        <td
                          className={`px-4 py-2 text-right font-mono tabular-nums ${
                            t.failed > 0 ? 'font-semibold text-rose-600' : 'text-stone-400'
                          }`}
                        >
                          {num(t.failed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              최근 실패 ({num(data.recentFailures.length)})
            </h2>
            {data.recentFailures.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center text-sm text-emerald-700">
                실패한 웹훅 이벤트가 없습니다 ✓
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                      <th className="px-4 py-2 font-medium">일시</th>
                      <th className="px-4 py-2 font-medium">타입</th>
                      <th className="px-4 py-2 font-medium">오류</th>
                      <th className="px-4 py-2 font-medium">이벤트 ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentFailures.map((e) => (
                      <tr key={e.id} className="border-b border-stone-100 align-top last:border-0">
                        <td className="px-4 py-2 text-[13px] text-stone-500">
                          {new Date(e.processedAt).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-2 font-mono text-[13px] text-stone-700">{e.type}</td>
                        <td className="px-4 py-2 text-[13px] text-rose-600">{e.errorMsg || '—'}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-stone-400">{e.eventId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
