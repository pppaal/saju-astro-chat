'use client'

import { useCallback, useEffect, useState } from 'react'

// 상세지표 — 서비스 3개(사주·궁합·타로) 중심. 서비스별 이용량·일별/시간대
// 추이·인기주제를 /api/admin/usage 에서 가져온다. 모든 서비스는 1건 = 크레딧
// 1개라 이용 건수가 곧 소비 크레딧이다. (회원·결제 요약은 '개요' 페이지 참고)

interface Usage {
  rangeDays: number
  services: { service: string; count: number }[]
  daily: { day: string; counselor: number; tarot: number; total: number }[]
  hourly: { hour: number; counselor: number; tarot: number; total: number }[]
  topTopics: { topic: string; count: number }[]
  topTarotQuestions: { question: string; count: number }[]
}

type ServiceKey = 'saju' | 'compat' | 'tarot'
const SERVICE_LABEL: Record<ServiceKey, string> = { saju: '사주', compat: '궁합', tarot: '타로' }

// usage.services 의 raw 라벨(상담:destiny / 상담:compat / 타로)을 3개 서비스로 묶는다.
function bucketServices(services: Usage['services']): Record<ServiceKey, number> {
  const out: Record<ServiceKey, number> = { saju: 0, compat: 0, tarot: 0 }
  for (const s of services) {
    const name = s.service.toLowerCase()
    if (name.includes('타로') || name.includes('tarot')) out.tarot += s.count
    else if (name.includes('compat') || name.includes('궁합')) out.compat += s.count
    else if (name.includes('destiny') || name.includes('운명') || name.includes('사주'))
      out.saju += s.count
  }
  return out
}

function fmt(n: number | undefined | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return n.toLocaleString('ko-KR')
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{children}</h2>
}

export default function ServicesClient() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/usage?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `사용량 HTTP ${res.status}`)
      setUsage((json?.data || json) as Usage)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const buckets = usage ? bucketServices(usage.services) : null
  const serviceTotal = buckets ? buckets.saju + buckets.compat + buckets.tarot : 0
  const maxHour = usage ? Math.max(1, ...usage.hourly.map((h) => h.total)) : 1
  const maxDay = usage ? Math.max(1, ...usage.daily.map((d) => d.total)) : 1

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">상세 지표</h1>
          <p className="mt-1 text-sm text-stone-500">서비스 3개(사주·궁합·타로) 중심 · 최근 {days}일</p>
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

      {loading && !usage ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          불러오는 중…
        </div>
      ) : (
        <>
          {/* 서비스별 이용량 / 매출(=소비 크레딧) */}
          {buckets && (
            <section className="mb-8">
              <SectionTitle>서비스별 이용량 · 매출 (최근 {days}일)</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(Object.keys(SERVICE_LABEL) as ServiceKey[]).map((k) => {
                  const count = buckets[k]
                  const share = serviceTotal > 0 ? (count / serviceTotal) * 100 : 0
                  return (
                    <div key={k} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                      <div className="text-[13px] text-stone-500">{SERVICE_LABEL[k]}</div>
                      <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-stone-900">
                        {fmt(count)}
                      </div>
                      <div className="mt-1 text-[12px] text-stone-400">
                        이용 건수 · 소비 크레딧 {fmt(count)} · 점유율 {share.toFixed(0)}%
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-stone-800"
                          style={{ width: `${Math.max(share, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-[12px] text-stone-400">
                모든 서비스는 1건당 크레딧 1개 소비 → 이용 건수 = 소비 크레딧. (사주=운명상담,
                궁합=궁합상담, 타로=타로 리딩 기준)
              </p>
            </section>
          )}

          {/* 일별 추이 */}
          {usage && usage.daily.some((d) => d.total > 0) && (
            <section className="mb-8">
              <SectionTitle>일별 추이 (최근 {days}일)</SectionTitle>
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex h-32 items-end gap-px">
                  {usage.daily.map((d) => (
                    <div
                      key={d.day}
                      title={`${d.day}: ${d.total}건 (상담 ${d.counselor} / 타로 ${d.tarot})`}
                      className="flex-1 rounded-t bg-stone-800"
                      style={{ height: `${Math.max((d.total / maxDay) * 100, d.total > 0 ? 4 : 0)}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-stone-400">
                  <span>{usage.daily[0]?.day.slice(5)}</span>
                  <span>{usage.daily[usage.daily.length - 1]?.day.slice(5)}</span>
                </div>
              </div>
            </section>
          )}

          {/* 시간대별 사용 */}
          {usage && usage.hourly.some((h) => h.total > 0) && (
            <section className="mb-8">
              <SectionTitle>시간대별 사용 (KST 0–23시)</SectionTitle>
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex h-32 items-end gap-1">
                  {usage.hourly.map((h) => (
                    <div
                      key={h.hour}
                      title={`${h.hour}시: ${h.total}건 (상담 ${h.counselor} / 타로 ${h.tarot})`}
                      className="flex-1 rounded-t bg-stone-800"
                      style={{ height: `${Math.max((h.total / maxHour) * 100, 2)}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-stone-400">
                  <span>0시</span>
                  <span>6시</span>
                  <span>12시</span>
                  <span>18시</span>
                  <span>23시</span>
                </div>
              </div>
            </section>
          )}

          {/* 인기 주제 / 타로 질문 */}
          {usage && (
            <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <SectionTitle>인기 상담 주제</SectionTitle>
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  {usage.topTopics.length === 0 ? (
                    <p className="py-6 text-center text-sm text-stone-400">데이터 없음</p>
                  ) : (
                    usage.topTopics.slice(0, 12).map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border-b border-stone-100 px-4 py-2 text-sm last:border-0"
                      >
                        <span className="text-stone-700">{t.topic}</span>
                        <span className="font-mono tabular-nums text-stone-500">{fmt(t.count)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <SectionTitle>인기 타로 질문</SectionTitle>
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  {usage.topTarotQuestions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-stone-400">데이터 없음</p>
                  ) : (
                    usage.topTarotQuestions.slice(0, 12).map((qn, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-2 text-sm last:border-0"
                      >
                        <span className="truncate text-stone-700">{qn.question}</span>
                        <span className="shrink-0 font-mono tabular-nums text-stone-500">{fmt(qn.count)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
