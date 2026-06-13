'use client'

import { useCallback, useEffect, useState } from 'react'

interface DailyRow {
  day: string
  pageviews: number
  visits: number
  loggedInVisits: number
  anonymousVisits: number
}
interface NameRow {
  path?: string
  host?: string
  pageviews: number
  visits: number
}
interface VisitorsData {
  rangeDays: number
  notReady?: boolean
  today?: {
    visits: number
    pageviews: number
    loggedInVisits: number
    anonymousVisits: number
    yesterdayVisits: number
  }
  summary: {
    pageviews: number
    visits: number
    loggedInVisits: number
    anonymousVisits: number
    loginShare: number
  }
  daily: DailyRow[]
  topPaths: NameRow[]
  topReferrers: NameRow[]
  devices: { device: string; visits: number }[]
}

function num(n: number): string {
  return n.toLocaleString('ko-KR')
}

export default function VisitorsClient() {
  const [data, setData] = useState<VisitorsData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/visitors?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`)
      setData((json?.data || json) as VisitorsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const maxDaily = data ? Math.max(1, ...data.daily.map((d) => d.visits)) : 1

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">방문자</h1>
          <p className="mt-1 text-sm text-stone-500">
            최근 {days}일 · 비로그인 포함 트래픽 · 일(日) 기준 순방문
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
      ) : data?.notReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800">
          방문자 집계 테이블이 아직 준비 중입니다. 배포(마이그레이션)가 끝나면 자동으로 표시됩니다.
          잠시 후 새로고침해 주세요.
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* 오늘 방문자 (KST 기준) */}
          {data.today && (
            <div className="rounded-2xl border border-stone-900 bg-stone-900 p-5 text-white shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[12px] font-medium text-stone-300">오늘 방문자 (KST)</div>
                  <div className="mt-1 font-mono text-4xl font-bold tabular-nums">
                    {num(data.today.visits)}
                  </div>
                </div>
                <div className="text-right text-[12px] text-stone-300">
                  <div>
                    페이지뷰{' '}
                    <span className="font-mono text-white">{num(data.today.pageviews)}</span>
                  </div>
                  <div className="mt-0.5">
                    비로그인{' '}
                    <span className="font-mono text-amber-300">
                      {num(data.today.anonymousVisits)}
                    </span>{' '}
                    · 로그인{' '}
                    <span className="font-mono text-emerald-300">
                      {num(data.today.loggedInVisits)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-stone-400">
                    어제 {num(data.today.yesterdayVisits)}
                    {data.today.yesterdayVisits > 0 && (
                      <span
                        className={
                          data.today.visits >= data.today.yesterdayVisits
                            ? ' text-emerald-300'
                            : ' text-rose-300'
                        }
                      >
                        {' '}
                        ({data.today.visits >= data.today.yesterdayVisits ? '▲' : '▼'}
                        {Math.abs(
                          Math.round(
                            ((data.today.visits - data.today.yesterdayVisits) /
                              data.today.yesterdayVisits) *
                              100
                          )
                        )}
                        %)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card
              label="순방문 (일 기준)"
              value={num(data.summary.visits)}
              sub="페이지뷰 수와 별개"
            />
            <Card label="페이지뷰" value={num(data.summary.pageviews)} sub="총 조회 수" />
            <Card
              label="비로그인 방문"
              value={num(data.summary.anonymousVisits)}
              sub={`전체의 ${100 - data.summary.loginShare}%`}
              accent="amber"
            />
            <Card
              label="로그인 방문"
              value={num(data.summary.loggedInVisits)}
              sub={`로그인 비율 ${data.summary.loginShare}%`}
              accent="emerald"
            />
          </div>

          {/* 일별 추이 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-stone-700">
              일별 순방문 (비로그인/로그인)
            </h2>
            {data.daily.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">
                아직 방문 데이터가 없습니다. 배포 후 방문이 쌓이면 표시됩니다.
              </p>
            ) : (
              <div className="flex items-end gap-1 overflow-x-auto">
                {data.daily.map((d) => {
                  const h = Math.max((d.visits / maxDaily) * 120, 2)
                  const anonH = d.visits > 0 ? (d.anonymousVisits / d.visits) * h : 0
                  return (
                    <div
                      key={d.day}
                      className="flex min-w-[10px] flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className="flex w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-t"
                        style={{ height: `${h}px` }}
                        title={`${d.day} · 순방문 ${d.visits} (비로그인 ${d.anonymousVisits} / 로그인 ${d.loggedInVisits}) · PV ${d.pageviews}`}
                      >
                        <div
                          className="w-full bg-emerald-400"
                          style={{ height: `${h - anonH}px` }}
                        />
                        <div className="w-full bg-amber-400" style={{ height: `${anonH}px` }} />
                      </div>
                      <span className="text-[9px] text-stone-400">{d.day.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-3 flex gap-4 text-[12px] text-stone-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" /> 비로그인
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> 로그인
              </span>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <ListCard title="인기 경로" rows={data.topPaths} keyField="path" empty="데이터 없음" />
            <ListCard
              title="유입 출처 (외부 referrer)"
              rows={data.topReferrers}
              keyField="host"
              empty="외부 유입 기록 없음 (직접 방문/검색 등)"
            />
          </div>

          {/* 디바이스 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-stone-700">디바이스</h2>
            <div className="flex flex-wrap gap-3">
              {data.devices.length === 0 ? (
                <span className="text-sm text-stone-400">데이터 없음</span>
              ) : (
                data.devices.map((d) => (
                  <span
                    key={d.device}
                    className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
                  >
                    {d.device} · <span className="font-mono">{num(d.visits)}</span>
                  </span>
                ))
              )}
            </div>
          </section>

          <p className="text-[12px] leading-relaxed text-stone-400">
            ※ 방문자는 쿠키 없이 “일별 회전 익명 해시”로 집계합니다(원본 IP·UA 미저장, 개인 식별
            불가). 같은 사람도 날짜가 다르면 다른 방문으로 세므로 “순방문”은 일(日) 기준입니다.
            봇/크롤러와 어드민 경로는 제외됩니다.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'amber' | 'emerald'
}) {
  const accentCls =
    accent === 'amber'
      ? 'border-amber-200 bg-amber-50'
      : accent === 'emerald'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-stone-200 bg-white'
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentCls}`}>
      <div className="text-[12px] font-medium text-stone-500">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-stone-900">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-stone-400">{sub}</div>}
    </div>
  )
}

function ListCard({
  title,
  rows,
  keyField,
  empty,
}: {
  title: string
  rows: NameRow[]
  keyField: 'path' | 'host'
  empty: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.visits))
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-stone-700">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-stone-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r[keyField]} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-mono text-[13px] text-stone-700">{r[keyField]}</span>
                <span className="shrink-0 font-mono tabular-nums text-stone-500">
                  {num(r.visits)}
                  <span className="ml-1 text-[11px] text-stone-400">· PV {num(r.pageviews)}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-stone-700"
                  style={{ width: `${Math.max((r.visits / max) * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
