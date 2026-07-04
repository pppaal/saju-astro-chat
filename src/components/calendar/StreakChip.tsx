'use client'

/* ============================================================
   StreakChip — "N일째 확인 중" 연속 방문 칩.
   ────────────────────────────────────────────────────────────
   재방문(DAU) 유인의 가장 가벼운 형태.

   로그인 사용자: POST /api/me/streak(서버 영속, VisitStreak 1행)가 정본 —
   기기를 바꿔도 스트릭이 이어진다. 서버 호출 실패(오프라인 등) 시 아래
   localStorage 경로로 조용히 폴백.
   익명 사용자: 기존 localStorage MVP 그대로(서버 호출 자체를 안 함).

   SSR 안전: 마운트 전(count=null)엔 아무것도 안 그린다(hydration mismatch 회피).
   1일째는 숨기고 2일째부터 노출(동기부여가 생기는 지점).
   ============================================================ */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { computeStreak, parseStreak } from '@/lib/calendar/streak'
import styles from './StreakChip.module.css'

const STORAGE_KEY = 'dp:calendar:streak'

/** 로컬 기준 오늘 'YYYY-MM-DD'. */
function localToday(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** localStorage 경로 — 익명/서버 실패 폴백. 갱신된 count 또는 null. */
function checkinLocal(today: string): number | null {
  try {
    let prev = null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) prev = parseStreak(JSON.parse(raw))
    const next = computeStreak(prev, today)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next.count
  } catch {
    // localStorage 불가(프라이빗 모드·차단) → 칩 숨김. 핵심 기능 아님.
    return null
  }
}

export default function StreakChip({ ko }: { ko: boolean }) {
  const { status } = useSession()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    // 세션 판별 전엔 대기 — 로그인 사용자의 첫 체크인이 로컬로 새서 서버와
    // 이중 계산되는 것을 막는다(판별 후 한 경로만 탄다).
    if (status === 'loading') return
    const today = localToday()

    if (status !== 'authenticated') {
      setCount(checkinLocal(today))
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ today }),
        })
        if (!res.ok) throw new Error(String(res.status))
        const json = (await res.json()) as { data?: { count?: number } }
        const c = json.data?.count
        if (!cancelled) setCount(typeof c === 'number' && c >= 1 ? c : checkinLocal(today))
      } catch {
        // 서버 실패(오프라인·레이트리밋 등) → 로컬 폴백으로 조용히 유지.
        if (!cancelled) setCount(checkinLocal(today))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  // 마운트 전 · 1일째는 노출 안 함(2일 연속부터 동기부여).
  if (count == null || count < 2) return null

  return (
    <div
      className={styles.chip}
      aria-label={ko ? `${count}일 연속 확인 중` : `${count}-day check-in streak`}
    >
      <span aria-hidden>🔥</span>
      <span>{ko ? `${count}일째 확인 중` : `Day ${count} streak`}</span>
    </div>
  )
}
