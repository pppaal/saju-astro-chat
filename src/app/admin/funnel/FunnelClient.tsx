'use client'

import { useCallback, useEffect, useState } from 'react'

interface Step {
  key: string
  label: string
  count: number
  fromPrev: number
  fromStart: number
}
interface FunnelData {
  rangeDays: number
  steps: Step[]
  retention?: { returned: number; rate: number }
}

function num(n: number): string {
  return n.toLocaleString('ko-KR')
}

export default function FunnelClient() {
  const [data, setData] = useState<FunnelData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/funnel?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`)
      setData((json?.data || json) as FunnelData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const top = data?.steps[0]?.count || 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">전환 퍼널</h1>
          <p className="mt-1 text-sm text-stone-500">
            최근 {days}일 가입자 코호트 · 가입 → 첫 리딩 → 첫 결제 · 재방문
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
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          불러오는 중…
        </div>
      ) : data ? (
        <div className="space-y-3">
          {data.steps.map((s, i) => {
            const width = top > 0 ? Math.max((s.count / top) * 100, 3) : 3
            return (
              <div key={s.key} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-stone-700">
                    {i + 1}. {s.label}
                  </span>
                  <span className="font-mono text-xl font-semibold tabular-nums text-stone-900">
                    {num(s.count)}명
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-stone-800" style={{ width: `${width}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[12px] text-stone-400">
                  <span>가입 대비 {s.fromStart}%</span>
                  {i > 0 && <span>직전 단계 대비 {s.fromPrev}%</span>}
                </div>
              </div>
            )
          })}
          {data.retention && top > 0 && (
            <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-indigo-900">재방문 (리텐션)</span>
                <span className="font-mono text-xl font-semibold tabular-nums text-indigo-900">
                  {num(data.retention.returned)}명
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.max(data.retention.rate, 3)}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-indigo-500">
                가입 후 하루 이상 지나 다시 활동한 사용자 · 재방문율 {data.retention.rate}% (가입 대비)
              </p>
            </div>
          )}
          {top === 0 && (
            <p className="text-center text-sm text-stone-400">해당 기간 가입자가 없습니다.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
