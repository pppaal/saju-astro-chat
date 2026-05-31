'use client'

import { useCallback, useEffect, useState } from 'react'

interface Usage {
  rangeDays: number
  generatedAt: string
  services: { service: string; count: number }[]
  hourly: { hour: number; counselor: number; tarot: number; total: number }[]
  daily: { day: string; counselor: number; tarot: number; total: number }[]
  topTopics: { topic: string; count: number }[]
  topTarotQuestions: { question: string; count: number }[]
}

const RANGES = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
]

function Bar({ value, max, label, sub }: { value: number; max: number; label: string; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-28 shrink-0 truncate text-[13px] text-stone-600" title={label}>
        {label}
      </div>
      <div className="relative h-5 flex-1 overflow-hidden rounded bg-stone-100">
        <div className="absolute inset-y-0 left-0 rounded bg-stone-800" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-16 shrink-0 text-right font-mono text-[13px] tabular-nums text-stone-700">
        {value.toLocaleString('ko-KR')}
        {sub && <span className="ml-1 text-[11px] text-stone-400">{sub}</span>}
      </div>
    </div>
  )
}

export default function UsageClient() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (d: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/usage?days=${d}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) {
        const e = (json?.error || json) as { message?: string; code?: string }
        setError(e?.message || e?.code || `요청 실패 (HTTP ${res.status})`)
        return
      }
      setData((json?.data || json) as Usage)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(days)
  }, [days, load])

  const hourMax = data ? Math.max(1, ...data.hourly.map((h) => h.total)) : 1
  const dayMax = data ? Math.max(1, ...data.daily.map((d) => d.total)) : 1
  const svcMax = data ? Math.max(1, ...data.services.map((s) => s.count)) : 1
  const topicMax = data ? Math.max(1, ...data.topTopics.map((t) => t.count)) : 1
  const qMax = data ? Math.max(1, ...data.topTarotQuestions.map((q) => q.count)) : 1

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">사용량 분석</h1>
          <p className="mt-1 text-sm text-stone-500">
            서비스·시간대(KST)·인기 주제/질문 · 최근 {days}일
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-stone-200 bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={
                days === r.days
                  ? 'rounded-full bg-stone-900 px-3 py-1 text-sm font-medium text-white'
                  : 'rounded-full px-3 py-1 text-sm text-stone-600 hover:bg-stone-100'
              }
            >
              {r.label}
            </button>
          ))}
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
          {/* 서비스별 사용량 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              서비스별 사용량
            </h2>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              {data.services.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">데이터 없음</p>
              ) : (
                data.services.map((s) => (
                  <Bar key={s.service} label={s.service} value={s.count} max={svcMax} />
                ))
              )}
            </div>
          </section>

          {/* 시간대별 (KST) */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              시간대별 사용 (KST 0–23시)
            </h2>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-end gap-[3px]" style={{ height: 140 }}>
                {data.hourly.map((h) => (
                  <div key={h.hour} className="group flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-stone-800 transition-all group-hover:bg-stone-600"
                      style={{ height: `${Math.round((h.total / hourMax) * 120)}px` }}
                      title={`${h.hour}시: ${h.total}건 (상담 ${h.counselor} / 타로 ${h.tarot})`}
                    />
                    <span className="mt-1 text-[9px] text-stone-400">{h.hour}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-stone-400">막대에 마우스를 올리면 상담/타로 분해가 보입니다.</p>
            </div>
          </section>

          {/* 일별 추이 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              일별 추이
            </h2>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              {data.daily.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">데이터 없음</p>
              ) : (
                <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
                  {data.daily.map((d) => (
                    <div key={d.day} className="group flex flex-1 flex-col items-center justify-end">
                      <div
                        className="w-full rounded-t bg-amber-500/80 transition-all group-hover:bg-amber-600"
                        style={{ height: `${Math.round((d.total / dayMax) * 100)}px` }}
                        title={`${d.day}: ${d.total}건`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 인기 주제 + 인기 타로 질문 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
                인기 상담 주제 (keyTopics)
              </h2>
              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                {data.topTopics.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-400">데이터 없음</p>
                ) : (
                  data.topTopics.map((t) => (
                    <Bar key={t.topic} label={t.topic} value={t.count} max={topicMax} />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
                인기 타로 질문
              </h2>
              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                {data.topTarotQuestions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-400">데이터 없음</p>
                ) : (
                  data.topTarotQuestions.map((q, i) => (
                    <div
                      key={`${q.question}-${i}`}
                      className="flex items-start gap-3 border-b border-stone-100 py-2 last:border-0"
                    >
                      <span className="font-mono text-[13px] tabular-nums text-stone-400">{i + 1}</span>
                      <span className="flex-1 text-[13px] text-stone-700">{q.question}</span>
                      <span className="shrink-0 font-mono text-[13px] tabular-nums text-stone-500">
                        {q.count}
                      </span>
                      <span className="sr-only">{qMax}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  )
}
