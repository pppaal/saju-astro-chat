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
    // 통화별 실결제액(최소 단위). 환율 환산 없음 — 해외 매출 확인용.
    byCurrency?: {
      currency: string
      grossMinor: number
      refundedMinor: number
      netMinor: number
      count: number
    }[]
    // windowKrw 중 실결제액이 없어 정가로 추정한 건수(레거시 행).
    estimatedCount?: number
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
// 최소 단위 → 표시. KRW 는 0-decimal, 그 외는 2-decimal.
function minor(n: number, currency: string): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  const c = currency.toUpperCase()
  if (c === 'KRW') return `₩${n.toLocaleString('ko-KR')}`
  if (c === 'USD') return `$${(n / 100).toFixed(2)}`
  return `${(n / 100).toFixed(2)} ${c}`
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
              위 KRW 집계는 <strong>원화 결제분만</strong> 담습니다. 외화 결제를 임의 환율로 섞지
              않기 때문입니다 — 통화별 실결제액은 아래를 보세요.
              {typeof data.revenue.estimatedCount === 'number' &&
                data.revenue.estimatedCount > 0 && (
                  <>
                    {' '}
                    이 중 {num(data.revenue.estimatedCount)}건은 실결제액 기록 이전(2026-10
                    마이그레이션) 구매로, 크레딧팩 정가(pricing.ts) 추정치입니다.
                  </>
                )}
            </p>

            {/* 통화별 실결제액 — 국제 매출이 실제로 들어오는지 보는 유일한 지표.
                환율 환산은 하지 않는다(임의 환율은 추정을 실측으로 위장한다). */}
            {data.revenue.byCurrency && data.revenue.byCurrency.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-[13px] font-semibold text-stone-700">
                  통화별 실결제액 (환율 환산 없음)
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[12px] text-stone-500">
                      <th className="py-1">통화</th>
                      <th className="py-1 text-right">총매출</th>
                      <th className="py-1 text-right">환불</th>
                      <th className="py-1 text-right">순매출</th>
                      <th className="py-1 text-right">건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenue.byCurrency.map((row) => (
                      <tr key={row.currency} className="border-t border-stone-100">
                        <td className="py-1 font-mono uppercase">{row.currency}</td>
                        <td className="py-1 text-right font-mono">
                          {minor(row.grossMinor, row.currency)}
                        </td>
                        <td className="py-1 text-right font-mono text-stone-500">
                          {row.refundedMinor > 0
                            ? `−${minor(row.refundedMinor, row.currency)}`
                            : '—'}
                        </td>
                        <td className="py-1 text-right font-mono font-semibold">
                          {minor(row.netMinor, row.currency)}
                        </td>
                        <td className="py-1 text-right">{num(row.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
