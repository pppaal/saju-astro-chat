'use client'

/* ============================================================
   StreakChip — "N일째 확인 중" 연속 방문 칩.
   ────────────────────────────────────────────────────────────
   재방문(DAU) 유인의 가장 가벼운 형태. 서버/DB 없이 브라우저 localStorage 로만
   연속 방문일을 세는 MVP다. 교차기기·영속(로그인 사용자)이 필요하면 서버 스키마로
   승격하면 되지만, 그건 별도 마이그레이션 결정이라 여기선 클라 로컬로만 둔다.

   SSR 안전: 마운트 전(count=null)엔 아무것도 안 그린다(hydration mismatch 회피).
   1일째는 숨기고 2일째부터 노출(동기부여가 생기는 지점).
   ============================================================ */

import { useEffect, useState } from 'react'
import { computeStreak, parseStreak } from '@/lib/calendar/streak'
import styles from './StreakChip.module.css'

const STORAGE_KEY = 'dp:calendar:streak'

/** 로컬 기준 오늘 'YYYY-MM-DD'. */
function localToday(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function StreakChip({ ko }: { ko: boolean }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    try {
      const today = localToday()
      let prev = null
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) prev = parseStreak(JSON.parse(raw))
      const next = computeStreak(prev, today)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setCount(next.count)
    } catch {
      // localStorage 불가(프라이빗 모드·차단) → 칩 숨김. 핵심 기능 아님.
    }
  }, [])

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
