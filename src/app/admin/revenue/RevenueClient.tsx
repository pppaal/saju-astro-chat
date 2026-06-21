'use client'

import { useCallback, useEffect, useState } from 'react'

interface RevenueData {
  rangeDays: number
  revenue: {
    windowKrw: number
    netKrw: number
    refundedKrw: number
    todayKrw: number
    purchaseCount: number
    daily: { date: string; krw: number; count: number }[]
    byPack: { pack: string; credits: number; count: number; krw: number }[]
  }
  credits: {
    issuedPaid: number
    issuedFree: number
    consumed: number
    outstanding: number
    expiredLost: number
  }
  refunds: { count: number; krw: number; creditsRefunded: number }
}

function krw(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return `₩${n.toLocaleString('ko-KR')}`
}
function num(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return n.toLocaleString('ko-KR')
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join(
    '\n'
  )
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-stone-300 bg-white px-3 py-1 text-[12px] font-medium text-stone-600 transition hover:bg-stone-100"
    >
      CSV 내보내기
    </button>
  )
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={
        accent
          ? 'rounded-2xl border border-stone-900 bg-stone-900 p-5 text-white shadow-sm'
          : 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm'
      }
    >
      <div className={accent ? 'text-[13px] text-stone-300' : 'text-[13px] text-stone-500'}>
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-stone-400">{hint}</div>}
    </div>
  )
}

export default function RevenueClient() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/revenue?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`)
      setData((json?.data || json) as RevenueData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const maxDaily = data ? Math.max(1, ...data.revenue.daily.map((d) => d.krw)) : 1

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">매출 · 크레딧</h1>
          <p className="mt-1 text-sm text-stone-500">
            크레딧팩 매출(추정) · 크레딧 경제 · 최근 {days}일 ·{' '}
            <a
              href="https://dashboard.stripe.com/balance/overview"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-stone-600 underline underline-offset-2 hover:text-stone-900"
            >
              ↗ Stripe 실매출
            </a>
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
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              매출 (추정, 최근 {days}일)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={`${days}일 매출`} value={krw(data.revenue.windowKrw)} accent />
              <Stat
                label="순매출 (환불 차감)"
                value={krw(data.revenue.netKrw)}
                hint={
                  data.revenue.refundedKrw > 0
                    ? `환불 −${krw(data.revenue.refundedKrw)}`
                    : undefined
                }
              />
              <Stat label="오늘 매출" value={krw(data.revenue.todayKrw)} />
              <Stat label="구매 건수" value={num(data.revenue.purchaseCount)} />
            </div>
            <p className="mt-2 text-[12px] text-stone-400">
              결제 금액 컬럼이 없어 크레딧팩 정가(pricing.ts)로 환산한 추정치입니다. 순매출은 기간
              내 환불(크레딧팩 실결제 환불) 정가를 차감한 값입니다.
            </p>
          </section>

          {data.revenue.daily.some((d) => d.krw > 0) && (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                  일별 매출
                </h2>
                <CsvButton onClick={() => downloadCsv('revenue-daily.csv', data.revenue.daily)} />
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex h-32 items-end gap-px">
                  {data.revenue.daily.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date}: ${krw(d.krw)} (${d.count}건)`}
                      className="flex-1 rounded-t bg-stone-800"
                      style={{
                        height: `${Math.max((d.krw / maxDaily) * 100, d.krw > 0 ? 4 : 0)}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-stone-400">
                  <span>{data.revenue.daily[0]?.date.slice(5)}</span>
                  <span>{data.revenue.daily[data.revenue.daily.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            </section>
          )}

          {data.revenue.byPack.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                  팩별 판매
                </h2>
                <CsvButton
                  onClick={() => downloadCsv('revenue-by-pack.csv', data.revenue.byPack)}
                />
              </div>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                      <th className="px-4 py-2 font-medium">팩 (크레딧)</th>
                      <th className="px-4 py-2 text-right font-medium">판매 수</th>
                      <th className="px-4 py-2 text-right font-medium">매출(추정)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenue.byPack.map((p) => (
                      <tr key={p.pack} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-2 text-stone-700">{p.pack}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-stone-600">
                          {num(p.count)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-stone-900">
                          {krw(p.krw)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              크레딧 경제 (전체 누적, 소비는 기간 한정)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="발행 (유료)" value={num(data.credits.issuedPaid)} hint="구매 크레딧" />
              <Stat label="발행 (무료)" value={num(data.credits.issuedFree)} hint="보너스·기프트" />
              {/* 소비만 윈도값(최근 N일) — 나머지 발행/잔여/만료는 전체 누적이라
                  섹션 제목에 한정 표기 + 라벨에 (기간) 을 붙여 오인 방지. */}
              <Stat
                label="소비 (기간)"
                value={num(data.credits.consumed)}
                hint={`최근 ${days}일`}
              />
              <Stat
                label="미사용 잔여"
                value={num(data.credits.outstanding)}
                hint="만료 전 · 부채"
              />
              <Stat label="만료 소멸" value={num(data.credits.expiredLost)} hint="미사용 만료" />
            </div>
            {data.refunds && (data.refunds.count > 0 || data.refunds.creditsRefunded > 0) && (
              <p className="mt-2 text-[12px] text-stone-400">
                최근 {days}일 환불: {num(data.refunds.count)}건 · {krw(data.refunds.krw)} ·{' '}
                {num(data.refunds.creditsRefunded)} 크레딧 회수
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
