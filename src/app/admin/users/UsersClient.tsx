'use client'

import { useCallback, useState } from 'react'

interface SearchUser {
  id: string
  email: string | null
  name: string | null
  role: string
  createdAt: string
}

interface UserDetail {
  user: {
    id: string
    email: string | null
    name: string | null
    role: string
    image: string | null
    createdAt: string
    hasPassword: boolean
    providers: string[]
  }
  credits: {
    usable: number
    bonusCredits: number
    totalBonusReceived: number
  } | null
  activity: {
    readings: number
    tarot: number
    counselor: number
    total: number
    lastReadingAt: string | null
  }
  purchases: {
    paidCount: number
    recent: {
      amount: number
      remaining: number
      source: string
      expired: boolean
      createdAt: string
      stripePaymentId: string | null
    }[]
  }
  timeline?: { type: string; label: string; detail: string; at: string }[]
}

function fmt(n: number | undefined | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return n.toLocaleString('ko-KR')
}

function dt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('ko-KR') : '—'
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-[12px] text-stone-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-stone-900">{value}</div>
    </div>
  )
}

export default function UsersClient() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchUser[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const search = useCallback(async () => {
    const query = q.trim()
    if (query.length < 2) {
      setSearchError('검색어는 2자 이상 입력하세요')
      return
    }
    setSearching(true)
    setSearchError(null)
    setDetail(null)
    setSelectedId(null)
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) {
        const err = (json?.error || json) as { message?: string; code?: string }
        setSearchError(err?.message || err?.code || `요청 실패 (HTTP ${res.status})`)
        return
      }
      setResults(((json?.data || json) as { users: SearchUser[] }).users)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setSearching(false)
    }
  }, [q])

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id)
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) {
        const err = (json?.error || json) as { message?: string; code?: string }
        setDetailError(err?.message || err?.code || `요청 실패 (HTTP ${res.status})`)
        return
      }
      setDetail((json?.data || json) as UserDetail)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">유저 검색</h1>
        <p className="mt-1 text-sm text-stone-500">이메일·이름·User ID 로 검색 후 클릭해 상세 보기</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일 / 이름 / User ID"
          className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 outline-none focus:border-stone-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
        >
          {searching ? '검색 중…' : '검색'}
        </button>
      </form>

      {searchError && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {searchError}
        </div>
      )}

      {results && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            검색 결과 ({results.length}명)
          </h2>
          {results.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-400">
              일치하는 유저가 없습니다.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                    <th className="px-4 py-2 font-medium">이메일</th>
                    <th className="px-4 py-2 font-medium">이름</th>
                    <th className="px-4 py-2 font-medium">역할</th>
                    <th className="px-4 py-2 text-right font-medium">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openDetail(u.id)}
                      className={`cursor-pointer border-b border-stone-100 last:border-0 transition hover:bg-stone-50 ${
                        selectedId === u.id ? 'bg-stone-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2 font-mono text-[13px] text-stone-700">
                        {u.email || '—'}
                      </td>
                      <td className="px-4 py-2 text-stone-600">{u.name || '—'}</td>
                      <td className="px-4 py-2 text-stone-600">{u.role}</td>
                      <td className="px-4 py-2 text-right text-[13px] text-stone-500">
                        {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedId && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            유저 상세
          </h2>
          {detailLoading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
              불러오는 중…
            </div>
          ) : detailError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {detailError}
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* 프로필 */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="text-base font-semibold text-stone-900">
                  {detail.user.name || '(이름 없음)'}
                </div>
                <div className="mt-1 font-mono text-sm text-stone-600">
                  {detail.user.email || '(이메일 없음)'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">
                    {detail.user.role}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">
                    가입 {new Date(detail.user.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">
                    로그인:{' '}
                    {[
                      ...detail.user.providers,
                      ...(detail.user.hasPassword ? ['password'] : []),
                    ].join(', ') || '없음'}
                  </span>
                </div>
                <div className="mt-3 font-mono text-[11px] text-stone-400">{detail.user.id}</div>
              </div>

              {/* 크레딧 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wide text-stone-400">크레딧</span>
                  <a
                    href={`/admin/credits?tab=grant&user=${encodeURIComponent(detail.user.email || detail.user.id)}`}
                    className="rounded-full border border-stone-300 bg-white px-3 py-1 text-[12px] font-medium text-stone-700 transition hover:bg-stone-100"
                  >
                    크레딧 지급
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="사용가능 잔액" value={fmt(detail.credits?.usable)} />
                  <Field label="보너스 크레딧" value={fmt(detail.credits?.bonusCredits)} />
                  <Field label="총 받은 보너스" value={fmt(detail.credits?.totalBonusReceived)} />
                </div>
              </div>

              {/* 활동 */}
              <div>
                <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-stone-400">
                  활동 (마지막 리딩 {dt(detail.activity.lastReadingAt)})
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="저장 리딩" value={fmt(detail.activity.readings)} />
                  <Field label="타로" value={fmt(detail.activity.tarot)} />
                  <Field label="상담(사주·궁합)" value={fmt(detail.activity.counselor)} />
                  <Field label="총 활동" value={fmt(detail.activity.total)} />
                </div>
              </div>

              {/* 결제 / 크레딧 충전 이력 */}
              <div>
                <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-stone-400">
                  크레딧 충전·결제 이력 (실결제 {fmt(detail.purchases.paidCount)}건)
                </div>
                {detail.purchases.recent.length === 0 ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-400">
                    내역 없음
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                          <th className="px-4 py-2 font-medium">구분</th>
                          <th className="px-4 py-2 text-right font-medium">지급</th>
                          <th className="px-4 py-2 text-right font-medium">잔여</th>
                          <th className="px-4 py-2 text-right font-medium">일시</th>
                          <th className="px-4 py-2 text-right font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.purchases.recent.map((p, i) => (
                          <tr key={i} className="border-b border-stone-100 last:border-0">
                            <td className="px-4 py-2 text-stone-600">
                              {p.stripePaymentId ? '구매' : p.source}
                              {p.expired && <span className="ml-1 text-rose-500">(만료)</span>}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-stone-700">
                              +{fmt(p.amount)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-stone-700">
                              {fmt(p.remaining)}
                            </td>
                            <td className="px-4 py-2 text-right text-[13px] text-stone-500">
                              {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {p.stripePaymentId && !p.expired && p.remaining > 0 && (
                                <a
                                  href={`/admin/credits?tab=refund&pid=${encodeURIComponent(p.stripePaymentId)}`}
                                  className="rounded-full border border-stone-300 bg-white px-2.5 py-0.5 text-[12px] font-medium text-stone-700 transition hover:bg-stone-100"
                                >
                                  환불
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 활동 타임라인 (리딩·타로·상담·구매·크레딧 시간순) */}
              {detail.timeline && detail.timeline.length > 0 && (
                <div>
                  <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-stone-400">
                    최근 활동 타임라인
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    {detail.timeline.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-2 text-sm last:border-0"
                      >
                        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[12px] text-stone-600">
                          {e.label}
                        </span>
                        <span className="flex-1 truncate text-[13px] text-stone-500">{e.detail}</span>
                        <span className="shrink-0 text-[13px] text-stone-400">
                          {new Date(e.at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}
