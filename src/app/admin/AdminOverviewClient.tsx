'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Overview {
  generatedAt: string
  users: {
    total: number
    today: number
    last7d: number
    last30d: number
    activeToday: number
    paying: number
  }
  readings: { total: number; today: number }
  credits: { outstanding: number }
  purchases: { total: number; today: number; last30d: number }
  recentSignups: { id: string; email: string | null; name: string | null; createdAt: string }[]
}

// 카드 클릭 시 펼쳐지는 유저 행. 세그먼트에 따라 일부 필드만 채워진다.
interface UserRow {
  id: string
  email: string | null
  name: string | null
  createdAt?: string
  readings?: number
  lastActiveAt?: string | null
}

const SEGMENT_TITLE: Record<string, string> = {
  total: '총 회원',
  today: '오늘 신규',
  '7d': '최근 7일 신규',
  '30d': '최근 30일 신규',
  'active-today': '오늘 활성 유저',
  paying: '결제 유저',
}

function fmt(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return n.toLocaleString('ko-KR')
}

function Stat({
  label,
  value,
  hint,
  accent,
  onClick,
  expanded,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
  onClick?: () => void
  expanded?: boolean
}) {
  const base = accent
    ? 'rounded-2xl border border-stone-900 bg-stone-900 p-5 text-white shadow-sm'
    : 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm'
  const clickable = onClick ? ' cursor-pointer text-left transition hover:border-stone-400' : ''

  const inner = (
    <>
      <div className={accent ? 'text-[13px] text-stone-300' : 'text-[13px] text-stone-500'}>
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[12px] text-stone-400">
        {hint}
        {onClick && <span className={hint ? 'ml-1 text-stone-500' : 'text-stone-500'}>
          {hint ? '· ' : ''}{expanded ? '닫기' : '누구?'}
        </span>}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base + clickable} aria-expanded={expanded}>
        {inner}
      </button>
    )
  }
  return <div className={base}>{inner}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  )
}

// 펼쳐진 유저 목록 패널. active-today 는 활동 컬럼, 나머지는 가입일 컬럼.
function UserListPanel({
  seg,
  count,
  users,
  loading,
  error,
}: {
  seg: string
  count: number | null
  users: UserRow[] | null
  loading: boolean
  error: string | null
}) {
  const isActive = seg === 'active-today'
  const capped = count !== null && users !== null && count > users.length
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {SEGMENT_TITLE[seg] || seg}
        {count !== null && ` (${fmt(count)}명${capped ? `, 최근 ${users!.length}명 표시` : ''})`}
      </h2>
      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          불러오는 중…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : users && users.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[12px] uppercase text-stone-400">
                <th className="px-4 py-2 font-medium">이메일</th>
                <th className="px-4 py-2 font-medium">이름</th>
                <th className="px-4 py-2 text-right font-medium">{isActive ? '오늘 활동' : '가입일'}</th>
                {isActive && <th className="px-4 py-2 text-right font-medium">마지막 활동</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2 font-mono text-[13px] text-stone-700">{u.email || '—'}</td>
                  <td className="px-4 py-2 text-stone-600">{u.name || '—'}</td>
                  {isActive ? (
                    <>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-stone-700">
                        {fmt(u.readings)}
                      </td>
                      <td className="px-4 py-2 text-right text-[13px] text-stone-500">
                        {u.lastActiveAt
                          ? new Date(u.lastActiveAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-2 text-right text-[13px] text-stone-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-400">
          해당하는 유저가 없습니다.
        </div>
      )}
    </section>
  )
}

export default function AdminOverviewClient() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 카드 클릭 드릴다운. 한 번에 하나의 세그먼트만 펼친다(다시 누르면 닫힘).
  const [openSegment, setOpenSegment] = useState<string | null>(null)
  const [cache, setCache] = useState<Record<string, { count: number; users: UserRow[] }>>({})
  const [segLoading, setSegLoading] = useState(false)
  const [segError, setSegError] = useState<string | null>(null)

  const loadSegment = useCallback(
    async (seg: string) => {
      if (openSegment === seg) {
        setOpenSegment(null)
        return
      }
      setOpenSegment(seg)
      setSegError(null)
      if (cache[seg]) return // 이미 로드함
      setSegLoading(true)
      try {
        const url =
          seg === 'active-today'
            ? '/api/admin/active-users'
            : `/api/admin/users-by?segment=${seg}`
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) {
          const err = (json?.error || json) as { message?: string; code?: string }
          setSegError(err?.message || err?.code || `요청 실패 (HTTP ${res.status})`)
          return
        }
        const payload = (json?.data || json) as { count: number; users: UserRow[] }
        setCache((prev) => ({ ...prev, [seg]: { count: payload.count, users: payload.users } }))
      } catch (err) {
        setSegError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setSegLoading(false)
      }
    },
    [openSegment, cache]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) {
        const err = (json?.error || json) as { message?: string; code?: string }
        setError(err?.message || err?.code || `요청 실패 (HTTP ${res.status})`)
        return
      }
      setData((json?.data || json) as Overview)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const SHORTCUTS = [
    { href: '/admin/users', title: '유저 검색', desc: '이메일·이름으로 찾아 상세 보기' },
    { href: '/admin/grant-credits', title: '크레딧 지급', desc: '유저에게 보너스 크레딧 충전' },
    { href: '/admin/refunds', title: '환불', desc: '크레딧팩 환불 처리' },
    { href: '/admin/dashboard', title: '상세 지표', desc: '서비스별 이용·매출' },
  ]

  // 펼쳐진 세그먼트 패널 렌더 헬퍼 (해당 섹션의 세그먼트가 열렸을 때만).
  const renderPanel = (segments: string[]) => {
    if (!openSegment || !segments.includes(openSegment)) return null
    const c = cache[openSegment]
    return (
      <UserListPanel
        seg={openSegment}
        count={c?.count ?? null}
        users={c?.users ?? null}
        loading={segLoading}
        error={segError}
      />
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">개요</h1>
          <p className="mt-1 text-sm text-stone-500">
            {data?.generatedAt
              ? `기준 ${new Date(data.generatedAt).toLocaleString('ko-KR')}`
              : '실시간 운영 지표'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
        >
          {loading ? '새로고침 중…' : '새로고침'}
        </button>
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
          <Section title="회원">
            <Stat
              label="총 회원"
              value={fmt(data.users.total)}
              accent
              onClick={() => loadSegment('total')}
              expanded={openSegment === 'total'}
            />
            <Stat
              label="오늘 신규"
              value={fmt(data.users.today)}
              onClick={() => loadSegment('today')}
              expanded={openSegment === 'today'}
            />
            <Stat
              label="최근 7일 신규"
              value={fmt(data.users.last7d)}
              onClick={() => loadSegment('7d')}
              expanded={openSegment === '7d'}
            />
            <Stat
              label="최근 30일 신규"
              value={fmt(data.users.last30d)}
              onClick={() => loadSegment('30d')}
              expanded={openSegment === '30d'}
            />
          </Section>
          {renderPanel(['total', 'today', '7d', '30d'])}

          <Section title="활동">
            <Stat
              label="오늘 활성 유저"
              value={fmt(data.users.activeToday)}
              hint="오늘 타로·상담한 유저"
              onClick={() => loadSegment('active-today')}
              expanded={openSegment === 'active-today'}
            />
            <Stat label="오늘 활동" value={fmt(data.readings.today)} hint="타로+상담" />
            <Stat label="총 활동" value={fmt(data.readings.total)} hint="타로+상담" />
          </Section>
          {renderPanel(['active-today'])}

          <Section title="결제 / 크레딧">
            <Stat
              label="결제 유저"
              value={fmt(data.users.paying)}
              hint="크레딧팩 구매자"
              onClick={() => loadSegment('paying')}
              expanded={openSegment === 'paying'}
            />
            <Stat label="총 구매 건수" value={fmt(data.purchases.total)} />
            <Stat label="오늘 구매" value={fmt(data.purchases.today)} />
            <Stat label="최근 30일 구매" value={fmt(data.purchases.last30d)} />
            <Stat
              label="미사용 구매 크레딧"
              value={fmt(data.credits.outstanding)}
              hint="결제 후 미사용 (만료 전)"
            />
          </Section>
          {renderPanel(['paying'])}

          <section className="mt-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              바로가기
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-400"
                >
                  <div className="font-medium text-stone-900">{s.title}</div>
                  <div className="mt-1 text-sm text-stone-500">{s.desc}</div>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
