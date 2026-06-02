'use client'

import { useCallback, useEffect, useState } from 'react'

// 상세지표 — 서비스 3개(사주·궁합·타로) 중심 재구성.
// 공통개요는 /api/admin/overview, 서비스별 이용량·인기주제·시간대는
// /api/admin/usage 를 조합한다. 모든 서비스는 1건 = 크레딧 1개라 이용 건수가
// 곧 소비 크레딧이다.

interface Overview {
  users: { total: number; today: number; activeToday: number; paying: number }
  readings: { total: number; today: number }
  credits: { outstanding: number }
  purchases: { total: number; today: number; last30d: number }
}

interface Usage {
  rangeDays: number
  services: { service: string; count: number }[]
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

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div
      className={
        accent
          ? 'rounded-2xl border border-stone-900 bg-stone-900 p-5 text-white shadow-sm'
          : 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm'
      }
    >
      <div className={accent ? 'text-[13px] text-stone-300' : 'text-[13px] text-stone-500'}>{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-stone-400">{hint}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{children}</h2>
}

export default function ServicesClient() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ovRes, usRes] = await Promise.all([
        fetch('/api/admin/overview', { cache: 'no-store' }),
        fetch(`/api/admin/usage?days=${days}`, { cache: 'no-store' }),
      ])
      const ovJson = await ovRes.json()
      const usJson = await usRes.json()
      if (!ovRes.ok) throw new Error(ovJson?.error?.message || ovJson?.error || `개요 HTTP ${ovRes.status}`)
      if (!usRes.ok) throw new Error(usJson?.error?.message || usJson?.error || `사용량 HTTP ${usRes.status}`)
      setOverview((ovJson?.data || ovJson) as Overview)
      setUsage((usJson?.data || usJson) as Usage)
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

      {loading && !overview ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          불러오는 중…
        </div>
      ) : (
        <>
          {/* 공통 개요 */}
          {overview && (
            <section className="mb-8">
              <SectionTitle>공통 개요</SectionTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="총 회원" value={fmt(overview.users.total)} accent />
                <Stat label="오늘 신규" value={fmt(overview.users.today)} />
                <Stat label="오늘 활성" value={fmt(overview.users.activeToday)} />
                <Stat label="결제 유저" value={fmt(overview.users.paying)} />
                <Stat label="총 구매" value={fmt(overview.purchases.total)} hint="크레딧팩 결제" />
                <Stat label="미사용 크레딧" value={fmt(overview.credits.outstanding)} hint="만료 전 잔여" />
              </div>
            </section>
          )}

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
