'use client'

import { useCallback, useEffect, useState } from 'react'

interface Row {
  userId: string
  email: string | null
  name: string | null
  consumed?: number
  granted?: number
}
interface AnomalyData {
  rangeDays: number
  topConsumers: Row[]
  topGranted: Row[]
  topConsumersTotal?: number
  topGrantedTotal?: number
  cap?: number
}

function num(n: number | undefined): string {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '—'
}

function RankTable({
  title,
  rows,
  valueKey,
  valueLabel,
  total,
}: {
  title: string
  rows: Row[]
  valueKey: 'consumed' | 'granted'
  valueLabel: string
  total?: number
}) {
  // 전체 모수가 표시 행수보다 많으면 "TOP N / 전체 M" 으로 잘림을 명시
  // (audit·webhooks 의 cap 표기와 통일).
  const capNote =
    typeof total === 'number' && total > rows.length
      ? `상위 ${rows.length}명 표시 · 전체 ${total.toLocaleString('ko-KR')}명`
      : null
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
        {capNote && <span className="text-[12px] text-stone-400">{capNote}</span>}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-400">
          해당 데이터 없음
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">이메일</th>
                <th className="px-4 py-2 font-medium">이름</th>
                <th className="px-4 py-2 text-right font-medium">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2 text-[13px] text-stone-400">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-[13px] text-stone-700">
                    {r.email || '—'}
                  </td>
                  <td className="px-4 py-2 text-stone-600">{r.name || '—'}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-stone-900">
                    {num(r[valueKey])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AnomaliesClient() {
  const [data, setData] = useState<AnomalyData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/anomalies?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`)
      setData((json?.data || json) as AnomalyData)
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
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">이상징후</h1>
          <p className="mt-1 text-sm text-stone-500">
            크레딧 과다 소비·무료 과다 수령 상위 · 최근 {days}일
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <RankTable
            title="크레딧 과다 소비 TOP"
            rows={data.topConsumers}
            valueKey="consumed"
            valueLabel="소비"
            total={data.topConsumersTotal}
          />
          <RankTable
            title="무료 크레딧 과다 수령 TOP"
            rows={data.topGranted}
            valueKey="granted"
            valueLabel="수령"
            total={data.topGrantedTotal}
          />
        </div>
      ) : null}
      <p className="mt-6 text-[12px] text-stone-400">
        의심 계정은 이메일을 유저 검색에 넣어 활동·결제 타임라인을 확인하세요.
      </p>
    </div>
  )
}
