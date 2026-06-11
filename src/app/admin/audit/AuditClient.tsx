'use client'

import { useCallback, useEffect, useState } from 'react'

interface AuditLog {
  id: string
  createdAt: string
  adminEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  metadata: unknown
  success: boolean
  errorMessage: string | null
}

interface AuditData {
  rangeDays: number
  totalLogs: number
  actionBreakdown: { action: string; count: number }[]
  recentLogs: AuditLog[]
}

function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
}

// metadata 에서 사람이 볼 핵심만 짧게 (amount/source/reason 등).
function summarizeMeta(meta: unknown): string {
  if (!meta || typeof meta !== 'object') return ''
  const m = meta as Record<string, unknown>
  const parts: string[] = []
  if (typeof m.amount === 'number') parts.push(`${m.amount > 0 ? '+' : ''}${m.amount}`)
  if (typeof m.refundAmount === 'number')
    parts.push(`환불 ${m.refundAmount.toLocaleString('ko-KR')}원`)
  if (typeof m.source === 'string') parts.push(String(m.source))
  if (typeof m.targetEmail === 'string') parts.push(String(m.targetEmail))
  if (typeof m.note === 'string' && m.note) parts.push(`"${m.note}"`)
  if (typeof m.rejectionReason === 'string') parts.push(`거부: ${m.rejectionReason}`)
  return parts.join(' · ')
}

export default function AuditClient() {
  const [data, setData] = useState<AuditData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/audit-log?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`)
      setData((json?.data || json) as AuditData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">감사로그</h1>
          <p className="mt-1 text-sm text-stone-500">
            어드민 액션 기록 (크레딧 지급·환불 등) · 최근 {days}일
            {data ? ` · 총 ${fmt(data.totalLogs)}건` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full border border-stone-200 bg-white p-1">
            {[7, 30, 90].map((d) => (
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
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          불러오는 중…
        </div>
      ) : data ? (
        <>
          {data.actionBreakdown.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
                액션별 건수
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.actionBreakdown.map((a) => (
                  <span
                    key={a.action}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-600"
                  >
                    {a.action}{' '}
                    <span className="font-mono tabular-nums text-stone-900">{fmt(a.count)}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              최근 기록
              {data.totalLogs > data.recentLogs.length
                ? ` (총 ${fmt(data.totalLogs)}건 중 최근 ${fmt(data.recentLogs.length)}건 표시)`
                : ''}
            </h2>
            {data.recentLogs.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-400">
                기록 없음
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                      <th className="px-4 py-2 font-medium">일시</th>
                      <th className="px-4 py-2 font-medium">관리자</th>
                      <th className="px-4 py-2 font-medium">액션</th>
                      <th className="px-4 py-2 font-medium">상세</th>
                      <th className="px-4 py-2 text-center font-medium">결과</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLogs.map((l) => (
                      <tr key={l.id} className="border-b border-stone-100 last:border-0 align-top">
                        <td className="px-4 py-2 text-[13px] text-stone-500">
                          {new Date(l.createdAt).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-2 font-mono text-[13px] text-stone-700">
                          {l.adminEmail}
                        </td>
                        <td className="px-4 py-2 text-stone-700">{l.action}</td>
                        <td className="px-4 py-2 text-[13px] text-stone-500">
                          {summarizeMeta(l.metadata)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {l.success ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                              성공
                            </span>
                          ) : (
                            <span
                              className="rounded-full bg-rose-100 px-2 py-0.5 text-[12px] font-medium text-rose-700"
                              title={l.errorMessage || ''}
                            >
                              실패
                            </span>
                          )}
                        </td>
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
