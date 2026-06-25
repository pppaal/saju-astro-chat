'use client'

import { useCallback, useEffect, useState } from 'react'

interface FunnelData {
  rangeDays: number
  funnel: {
    hub: number
    tool: number
    counselor: number
    toolRate: number
    counselorRate: number
  }
  paths: { path: string; visitors: number; views: number }[]
  sources: { source: string; visitors: number }[]
  referral?: { signups: number; paid: number; pending: number; paidRate: number }
  unavailable?: boolean
}

const num = (n: number): string => n.toLocaleString('ko-KR')

// 경로 → 사람이 읽는 라벨.
const PATH_LABEL: Record<string, string> = {
  '/free': '무료 허브 (/free)',
  '/integrated-report': '통합 리포트',
  '/compatibility/free': '무료 궁합',
  '/tarot/daily': '오늘의 타로',
  '/destiny': '인생 흐름',
  '/destiny-counselor': '운명 상담사 (유료)',
  '/compatibility/counselor': '궁합 상담사 (유료)',
}

export default function FreeFunnelClient() {
  const [data, setData] = useState<FunnelData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/free-funnel?days=${days}`, { cache: 'no-store' })
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

  const f = data?.funnel
  const steps = f
    ? [
        { key: 'hub', label: '무료 허브 도달 (/free)', count: f.hub, rate: null as number | null },
        { key: 'tool', label: '무료 도구 사용', count: f.tool, rate: f.toolRate },
        { key: 'counselor', label: '상담사(유료) 진입', count: f.counselor, rate: f.counselorRate },
      ]
    : []
  const top = f?.hub || 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">무료 퍼널</h1>
          <p className="mt-1 text-sm text-stone-500">
            최근 {days}일 · 소셜 랜딩(/free)을 거친 방문자 기준 · 허브 → 무료 도구 → 상담사
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
        <div className="space-y-8">
          {data.unavailable && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              방문 기록(PageView)을 아직 읽을 수 없어요. 배포 직후거나 트래픽이 없으면 비어 있을 수
              있어요.
            </div>
          )}

          {/* 3단계 퍼널 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              전환 퍼널 (순 방문자)
            </h2>
            <div className="space-y-3">
              {steps.map((s) => {
                const width = top > 0 ? Math.max((s.count / top) * 100, 3) : 3
                return (
                  <div
                    key={s.key}
                    className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-stone-700">{s.label}</span>
                      <span className="font-mono text-2xl font-semibold tabular-nums text-stone-900">
                        {num(s.count)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-stone-900"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    {s.rate != null && (
                      <p className="mt-2 text-xs text-stone-500">직전 단계 대비 {s.rate}% 전환</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* 레퍼럴 전환 */}
          {data.referral && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
                레퍼럴 전환
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <span className="text-sm font-medium text-stone-700">레퍼럴 가입</span>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-stone-900">
                    {num(data.referral.signups)}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">추천 링크로 가입한 신규</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <span className="text-sm font-medium text-stone-700">첫 결제 전환</span>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-stone-900">
                    {num(data.referral.paid)}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    가입 대비 {data.referral.paidRate}% · 양쪽 크레딧 지급
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <span className="text-sm font-medium text-stone-700">대기 중</span>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-stone-900">
                    {num(data.referral.pending)}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">가입했지만 아직 미결제(전체)</p>
                </div>
              </div>
            </section>
          )}

          {/* /free 유입 출처 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              /free 유입 출처
            </h2>
            <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
              {data.sources.length === 0 ? (
                <p className="p-4 text-sm text-stone-500">아직 유입 기록이 없어요.</p>
              ) : (
                data.sources.map((s) => (
                  <div
                    key={s.source}
                    className="flex items-center justify-between border-b border-stone-100 px-3 py-2 text-sm last:border-0"
                  >
                    <span className="truncate text-stone-700">{s.source}</span>
                    <span className="font-mono tabular-nums text-stone-900">{num(s.visitors)}</span>
                  </div>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-stone-400">
              인스타·유튜브 등 외부 채널이 실제로 사람을 보내는지 확인하는 지표예요.
            </p>
          </section>

          {/* 경로별 순방문자 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              경로별 방문 (전체 도달)
            </h2>
            <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
              {data.paths.length === 0 ? (
                <p className="p-4 text-sm text-stone-500">아직 방문 기록이 없어요.</p>
              ) : (
                data.paths.map((p) => (
                  <div
                    key={p.path}
                    className="flex items-center justify-between border-b border-stone-100 px-3 py-2 text-sm last:border-0"
                  >
                    <span className="truncate text-stone-700">{PATH_LABEL[p.path] ?? p.path}</span>
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono tabular-nums text-stone-900">
                        {num(p.visitors)}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-stone-400">
                        ({num(p.views)} 조회)
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
