'use client'

/**
 * DestinypalShell — destinypal 4-tier 연속 줌 컨트롤러 (Life → Year → Month → Day).
 * 포팅 출처: destinypal-extracted/js-ink/app.jsx App()
 *
 * 핵심 동작:
 *  - camera depth (float, 0..3) 를 RAF 로 보간.
 *  - 각 tier layer 는 `transform: scale(BASE^(cam - L))` + opacity/blur fade.
 *  - 키보드: ArrowLeft / ArrowRight (rise/dive), '1'..'4' (direct).
 *  - 휠 overscroll: 현재 layer 의 스크롤 끝에서 다음 tier 로 zoom.
 *  - localStorage('dp_tier') 로 마지막 위치 복원.
 *  - Starfield 에 frame 별 camDepth 전달 (parallax).
 *
 * Phase B 는 4-tier (decade 제외). Decade 는 Phase C 에서 5-tier 로 확장.
 *
 * 본 컴포넌트는 데이터/타입에 대한 가정이 없음 — 4 개 tier render 함수만 받음.
 * 각 render 함수는 `onRise` / `onDive` 콜백을 받아 줌 트리거 가능.
 */

import * as React from 'react'
import { DestinypalTopbar } from './DestinypalTopbar'
import { DestinypalRail } from './DestinypalRail'
import { Starfield, type StarfieldHandle } from './Starfield'
import variablesStyles from '../styles/variables.module.css'
import shellStyles from '../styles/shell.module.css'

// ---------------------------------------------------------------------------
// Tier 정의 — Phase B (4-tier).
// ---------------------------------------------------------------------------

export interface DestinypalTierMeta {
  id: 'life' | 'year' | 'month' | 'day'
  ko: string
  en: string
  scale: string
}

export const DESTINYPAL_TIERS: DestinypalTierMeta[] = [
  { id: 'life', ko: '인생', en: 'LIFETIME', scale: '84년' },
  { id: 'year', ko: '1년', en: 'YEARLY', scale: '12달' },
  { id: 'month', ko: '1달', en: 'MONTHLY', scale: '30일' },
  { id: 'day', ko: '1일', en: 'DAILY', scale: '24시' },
]

const TIER_COUNT = DESTINYPAL_TIERS.length
const MAX = TIER_COUNT - 1
const BASE = 5
const DUR = 680
const LS_KEY = 'dp_tier'

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// ---------------------------------------------------------------------------
// Tier render props — 각 tier 가 onRise/onDive 콜백 받음.
// ---------------------------------------------------------------------------

export interface DestinypalTierRenderArgs {
  /** 이전 단(상위)으로 올라가기. */
  onRise: () => void
  /** 다음 단(하위)으로 내려가기. */
  onDive: () => void
  /** 특정 tier index 로 점프 (Month → Day 등 cross-jump 용). */
  goTo: (target: number) => void
}

export interface DestinypalShellProps {
  /** Topbar 데이터 — birthKo · place · ilganHanja. */
  topbar: {
    whoBirthLine: string
    place: string
    ilganHanja: string
  }
  /** Life tier 렌더. (onDive 만 의미 있음 — Life 는 최상위.) */
  renderLife: (args: DestinypalTierRenderArgs) => React.ReactNode
  /** Year tier 렌더. */
  renderYear: (args: DestinypalTierRenderArgs) => React.ReactNode
  /** Month tier 렌더. */
  renderMonth: (args: DestinypalTierRenderArgs) => React.ReactNode
  /** Day tier 렌더. (onRise 만 의미 있음 — Day 는 최하위.) */
  renderDay: (args: DestinypalTierRenderArgs) => React.ReactNode
  /** 초기 tier (localStorage 우선). */
  initialTier?: number
  /** Starfield 끄기 (테스트/스토리북용). */
  disableStarfield?: boolean
}

interface AnimSlot {
  raf: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DestinypalShell({
  topbar,
  renderLife,
  renderYear,
  renderMonth,
  renderDay,
  initialTier,
  disableStarfield = false,
}: DestinypalShellProps): React.ReactElement {
  // ---- starting tier (LS 우선 → prop → 0) -----------------------------------
  const computeStart = React.useCallback((): number => {
    if (typeof window === 'undefined') return initialTier ?? 0
    const raw = window.localStorage.getItem(LS_KEY)
    if (raw !== null) {
      const s = parseInt(raw, 10)
      if (!isNaN(s)) return Math.max(0, Math.min(MAX, s))
    }
    return initialTier ?? 0
  }, [initialTier])

  // SSR-safe: 초기 렌더는 prop/0, mount 후 LS 적용.
  const [tier, setTier] = React.useState<number>(initialTier ?? 0)
  const [cam, setCam] = React.useState<number>(initialTier ?? 0)
  const animRef = React.useRef<AnimSlot | null>(null)
  const camDepthRef = React.useRef<number>(initialTier ?? 0)
  const starfieldRef = React.useRef<StarfieldHandle | null>(null)

  // 4 scroll refs (TIER_COUNT 만큼)
  const scrollRefs = React.useRef<Array<HTMLDivElement | null>>(
    Array(TIER_COUNT).fill(null),
  )

  // mount 후 LS 적용
  React.useEffect(() => {
    const start = computeStart()
    setTier(start)
    setCam(start)
    camDepthRef.current = start
    starfieldRef.current?.setCamDepth(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // cam → starfield ref + ref 갱신
  React.useEffect(() => {
    camDepthRef.current = cam
    starfieldRef.current?.setCamDepth(cam)
  }, [cam])

  // ---- goTo ----------------------------------------------------------------
  const goTo = React.useCallback(
    (rawTarget: number) => {
      const target = Math.max(0, Math.min(MAX, rawTarget))
      if (animRef.current) {
        cancelAnimationFrame(animRef.current.raf)
        animRef.current = null
      }
      const from = camDepthRef.current
      if (Math.abs(target - from) < 0.001) return
      const dist = Math.abs(target - from)
      const dur = DUR * Math.min(2.2, Math.sqrt(dist))
      const t0 = performance.now()

      // reset destination scroll
      const dest = scrollRefs.current[target]
      if (dest) dest.scrollTop = 0

      setTier(target)
      try {
        window.localStorage.setItem(LS_KEY, String(target))
      } catch {
        /* private mode etc. — ignore */
      }

      const step = (now: number): void => {
        const p = Math.min(1, (now - t0) / dur)
        const c = from + (target - from) * easeInOut(p)
        setCam(c)
        camDepthRef.current = c
        if (p < 1) {
          animRef.current = { raf: requestAnimationFrame(step) }
        } else {
          setCam(target)
          camDepthRef.current = target
          animRef.current = null
        }
      }

      animRef.current = { raf: requestAnimationFrame(step) }
    },
    [],
  )

  // ---- keyboard ------------------------------------------------------------
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(Math.round(camDepthRef.current) + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(Math.round(camDepthRef.current) - 1)
      } else if (e.key >= '1' && e.key <= String(TIER_COUNT)) {
        goTo(parseInt(e.key, 10) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo])

  // ---- wheel overscroll → zoom --------------------------------------------
  const accRef = React.useRef(0)
  React.useEffect(() => {
    const el = scrollRefs.current[tier]
    if (!el) return
    let resetTimer: ReturnType<typeof setTimeout> | null = null
    const onWheel = (e: WheelEvent): void => {
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
        if (accRef.current > 170 && tier < MAX) {
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
  }, [tier, goTo])

  // ---- per-layer style (scale + opacity + blur) ----------------------------
  const layerStyle = (L: number): React.CSSProperties => {
    const r = cam - L
    const ar = Math.abs(r)
    const s = Math.pow(BASE, r)
    let op = 0
    if (ar < 1) {
      const t = Math.min(1, Math.max(0, (ar - 0.12) / 0.78))
      op = 1 - t * t * (3 - 2 * t)
    }
    const atRest = animRef.current === null && Math.round(cam) === L
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

  // ---- current tier meta (topbar 표시) -------------------------------------
  const camRounded = Math.max(0, Math.min(MAX, Math.round(cam)))
  const curT = DESTINYPAL_TIERS[camRounded]

  // ---- tier render args 생성 -----------------------------------------------
  const makeArgs = (idx: number): DestinypalTierRenderArgs => ({
    onRise: () => goTo(idx - 1),
    onDive: () => goTo(idx + 1),
    goTo,
  })

  const setScrollRef =
    (idx: number) =>
    (el: HTMLDivElement | null): void => {
      scrollRefs.current[idx] = el
    }

  const renderers: Array<(args: DestinypalTierRenderArgs) => React.ReactNode> =
    [renderLife, renderYear, renderMonth, renderDay]

  return (
    <div className={`${variablesStyles.destinypalScope} ${shellStyles.root}`}>
      <div className={shellStyles.sky} />
      {!disableStarfield && <Starfield ref={starfieldRef} />}

      <DestinypalTopbar
        whoBirthLine={topbar.whoBirthLine}
        place={topbar.place}
        ilganHanja={topbar.ilganHanja}
        tierKo={curT.ko}
        tierEn={curT.en}
        tierScale={curT.scale}
      />

      <DestinypalRail
        stops={DESTINYPAL_TIERS}
        activeIndex={camRounded}
        onStop={goTo}
      />

      <div className={shellStyles.stage}>
        {renderers.map((render, i) => (
          <div
            key={DESTINYPAL_TIERS[i].id}
            className={shellStyles.tierLayer}
            style={layerStyle(i)}
          >
            <div className={shellStyles.tierScroll} ref={setScrollRef(i)}>
              {render(makeArgs(i))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DestinypalShell
