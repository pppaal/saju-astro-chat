'use client'

/* ============================================================
   destinypal · Shell — 5-tier 줌 컨트롤러
   직역 출처: destinypal-extracted/js/app.jsx App()
   - 카메라 depth (float 0..4) state + RAF 보간 (DUR=680, easeInOut)
   - layerStyle(L): scale(BASE^(cam-L)) + smoothstep opacity + blur(ar²·2.4)
   - 키보드: ArrowLeft rise / ArrowRight dive / '1'..'5' direct
   - 휠 overscroll 누적 170 도달 시 zoom
   - localStorage('dp_tier') 마지막 tier 복원 (SSR-safe, mount 후 적용)
   - Starfield ref.setCamDepth() 로 parallax 동기화
   ============================================================ */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import variables from '../styles/variables.module.css'
import styles from '../styles/shell.module.css'
import { DestinypalRail, type RailTier } from './DestinypalRail'
import { DestinypalTopbar } from './DestinypalTopbar'
import { Starfield, type StarfieldHandle } from './Starfield'

const TIERS: ReadonlyArray<RailTier> = [
  { id: 'life',   ko: '인생',  en: 'LIFETIME', scale: '84년' },
  { id: 'decade', ko: '10년',  en: 'DECADE',   scale: '甲戌 대운' },
  { id: 'year',   ko: '1년',   en: 'YEARLY',   scale: '12달' },
  { id: 'month',  ko: '1달',   en: 'MONTHLY',  scale: '30일' },
  { id: 'day',    ko: '1일',   en: 'DAILY',    scale: '24시' },
] as const

const MAX_TIER = TIERS.length - 1
const BASE = 5
const DUR = 680
const STORAGE_KEY = 'dp_tier'

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export interface DestinypalShellTopbar {
  whoBirthLine: string
  place: string
  ilganHanja: string
}

export interface DestinypalTierRenderArgs {
  onRise: () => void
  onDive: () => void
  goTo: (i: number) => void
}

export interface DestinypalShellProps {
  topbar: DestinypalShellTopbar
  renderLife:   (args: DestinypalTierRenderArgs) => ReactNode
  renderDecade: (args: DestinypalTierRenderArgs) => ReactNode
  renderYear:   (args: DestinypalTierRenderArgs) => ReactNode
  renderMonth:  (args: DestinypalTierRenderArgs & { onFocusDay: () => void }) => ReactNode
  renderDay:    (args: DestinypalTierRenderArgs) => ReactNode
  initialTier?: number
  className?: string
}

interface AnimState {
  raf: number
}

export function DestinypalShell({
  topbar,
  renderLife,
  renderDecade,
  renderYear,
  renderMonth,
  renderDay,
  initialTier = 0,
  className,
}: DestinypalShellProps) {
  const clampTier = (n: number) => Math.max(0, Math.min(MAX_TIER, n))
  const initial = clampTier(initialTier)

  const [tier, setTier] = useState<number>(initial)
  const [cam, setCam] = useState<number>(initial)
  const animRef = useRef<AnimState | null>(null)
  const camRef = useRef<number>(initial)

  const scrollRefs = [
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
  ]

  const starfieldRef = useRef<StarfieldHandle | null>(null)

  // SSR-safe localStorage 복원 — mount 후 한 번.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = parseInt(raw || '', 10)
      if (!Number.isNaN(parsed)) {
        const t = clampTier(parsed)
        setTier(t)
        setCam(t)
        camRef.current = t
      }
    } catch {
      /* localStorage unavailable — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // parallax depth sync.
  useEffect(() => {
    starfieldRef.current?.setCamDepth(cam)
    camRef.current = cam
  }, [cam])

  const goTo = useCallback((rawTarget: number) => {
    const target = clampTier(rawTarget)
    if (animRef.current) cancelAnimationFrame(animRef.current.raf)
    const from = camRef.current
    if (Math.abs(target - from) < 0.001) return
    const dist = Math.abs(target - from)
    const dur = DUR * Math.min(2.2, Math.sqrt(dist))
    const t0 = performance.now()

    const dest = scrollRefs[target]?.current
    if (dest) dest.scrollTop = 0

    setTier(target)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(target))
    } catch {
      /* ignore */
    }

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const c = from + (target - from) * easeInOut(p)
      setCam(c)
      camRef.current = c
      starfieldRef.current?.setCamDepth(c)
      if (p < 1) {
        animRef.current = { raf: requestAnimationFrame(step) }
      } else {
        setCam(target)
        camRef.current = target
        animRef.current = null
      }
    }
    animRef.current = { raf: requestAnimationFrame(step) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keyboard: ← rise / → dive / 1..5 direct.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(Math.round(camRef.current) + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(Math.round(camRef.current) - 1)
      } else if (e.key >= '1' && e.key <= '5') {
        goTo(parseInt(e.key, 10) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo])

  // wheel overscroll → zoom (desktop delight).
  const accRef = useRef(0)
  useEffect(() => {
    const el = scrollRefs[tier]?.current
    if (!el) return
    let resetTimer: ReturnType<typeof setTimeout> | null = null
    const onWheel = (e: WheelEvent) => {
      if (animRef.current) return
      const atBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 3
      const atTop = el.scrollTop <= 1
      if ((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) {
        accRef.current += e.deltaY
        if (resetTimer) clearTimeout(resetTimer)
        resetTimer = setTimeout(() => {
          accRef.current = 0
        }, 220)
        if (accRef.current > 170 && tier < MAX_TIER) {
          accRef.current = 0
          goTo(tier + 1)
        } else if (accRef.current < -170 && tier > 0) {
          accRef.current = 0
          goTo(tier - 1)
        }
      } else {
        accRef.current = 0
      }
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (resetTimer) clearTimeout(resetTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, goTo])

  // touch swipe → zoom (mobile dive/rise) — mirrors wheel overscroll policy.
  // 세로 스와이프 거리 임계 80px, 스크롤이 끝(또는 시작)에 닿았을 때만.
  const touchRef = useRef<{ y0: number; t0: number; active: boolean }>({
    y0: 0,
    t0: 0,
    active: false,
  })
  useEffect(() => {
    const el = scrollRefs[tier]?.current
    if (!el) return
    const THRESHOLD = 80 // px

    const onStart = (e: TouchEvent) => {
      if (animRef.current) return
      const t = e.touches[0]
      if (!t) return
      touchRef.current = { y0: t.clientY, t0: performance.now(), active: true }
    }
    const onMove = (e: TouchEvent) => {
      if (!touchRef.current.active || animRef.current) return
      const t = e.touches[0]
      if (!t) return
      const dy = t.clientY - touchRef.current.y0
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 3
      const atTop = el.scrollTop <= 1
      // upward swipe at bottom → dive
      if (dy < -THRESHOLD && atBottom && tier < MAX_TIER) {
        touchRef.current.active = false
        goTo(tier + 1)
      }
      // downward swipe at top → rise
      else if (dy > THRESHOLD && atTop && tier > 0) {
        touchRef.current.active = false
        goTo(tier - 1)
      }
    }
    const onEnd = () => {
      touchRef.current.active = false
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, goTo])

  const layerStyle = (L: number): React.CSSProperties => {
    const r = cam - L
    const ar = Math.abs(r)
    const s = Math.pow(BASE, r)
    let op = 0
    if (ar < 1) {
      const t = Math.min(1, Math.max(0, (ar - 0.12) / 0.78))
      op = 1 - t * t * (3 - 2 * t)
    }
    const atRest =
      animRef.current === null && Math.round(cam) === L
    return {
      transform: `scale(${s.toFixed(4)})`,
      transformOrigin: '50% 44%',
      opacity: op,
      filter: ar > 0.04 ? `blur(${(ar * ar * 2.4).toFixed(2)}px)` : 'none',
      pointerEvents: atRest ? 'auto' : 'none',
      visibility: ar < 1.05 ? 'visible' : 'hidden',
      zIndex: 10 - Math.round(ar * 6),
    }
  }

  const camRounded = clampTier(Math.round(cam))
  const curT = TIERS[camRounded]

  const renderArgs = (idx: number): DestinypalTierRenderArgs => ({
    onRise: () => goTo(idx - 1),
    onDive: () => goTo(idx + 1),
    goTo,
  })

  return (
    <div
      className={[variables.dpRoot, styles.root, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.sky} aria-hidden />
      <Starfield ref={starfieldRef} />

      <DestinypalTopbar
        whoBirthLine={topbar.whoBirthLine}
        place={topbar.place}
        ilganHanja={topbar.ilganHanja}
        tierKo={curT.ko}
        tierEn={curT.en}
        tierScale={curT.scale}
      />

      <DestinypalRail
        tiers={TIERS}
        activeIndex={camRounded}
        onSelect={(i) => goTo(i)}
      />

      <div className={styles.stage}>
        <div className={styles.tierLayer} style={layerStyle(0)}>
          <div className={styles.tierScroll} ref={scrollRefs[0]}>
            {renderLife(renderArgs(0))}
          </div>
        </div>
        <div className={styles.tierLayer} style={layerStyle(1)}>
          <div className={styles.tierScroll} ref={scrollRefs[1]}>
            {renderDecade(renderArgs(1))}
          </div>
        </div>
        <div className={styles.tierLayer} style={layerStyle(2)}>
          <div className={styles.tierScroll} ref={scrollRefs[2]}>
            {renderYear(renderArgs(2))}
          </div>
        </div>
        <div className={styles.tierLayer} style={layerStyle(3)}>
          <div className={styles.tierScroll} ref={scrollRefs[3]}>
            {renderMonth({
              ...renderArgs(3),
              onFocusDay: () => goTo(4),
            })}
          </div>
        </div>
        <div className={styles.tierLayer} style={layerStyle(4)}>
          <div className={styles.tierScroll} ref={scrollRefs[4]}>
            {renderDay(renderArgs(4))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DestinypalShell
