'use client'

/* ============================================================
   destinypal · TierFrame — 모든 티어(인생·10년·년·월·일)가 공유하는
   레이아웃 골격. 화면이 티어마다 제각각(중구난방)이던 문제를 잡기 위해
   바깥 프레임 / 히어로 / 섹션 리듬 / 접기를 하나로 통일한다.

   위계(intentional hierarchy):
     1) <TierHero>   — 한 줄 답 + 큰 비주얼 하나 (3초 안에 "그래서 뭐?")
     2) <Band> ×3    — 핵심만. 같은 카드·제목·간격.
     3) <MoreFold>   — 나머지 쉬운말은 접어서 demote.
     4) (티어별 jargon <details> '자세한 신호 보기' 는 그대로 맨 아래)

   내용·엔진은 손대지 않는다. 배치/위계만 통일(표현 전용).
   ============================================================ */

import type { ReactNode } from 'react'

import styles from './TierFrame.module.css'

export interface TierFrameProps {
  /** data-screen-label — 줌/공유 캡처가 읽는 화면 이름. 예: `1일 2026-06-22`. */
  screenLabel: string
  children: ReactNode
}

/** 바깥 프레임 — 일정한 폭·여백·세로 리듬(섹션 사이 간격)을 모든 티어에 강제. */
export function TierFrame({ screenLabel, children }: TierFrameProps) {
  return (
    <div className={styles.frame} data-screen-label={screenLabel}>
      {children}
    </div>
  )
}

/** 줌아웃 버튼 — 티어 상단 좌측. 모든 티어 동일 모양. */
export function RiseButton({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) return null
  return (
    <button className={styles.rise} onClick={onClick} type="button">
      ↑ {label}
    </button>
  )
}

/** 작은 머리표(eyebrow) — 모노 트래킹 라벨. 예: `1일 · DAILY · 2026-06-22`. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className={styles.eyebrow}>{children}</div>
}

export type ToneKind = 'positive' | 'caution' | 'neutral' | 'mixed'

export interface TierHeroProps {
  /** 큰 비주얼 슬롯(날씨 글리프 / 계절의 길 / 달력 미니 등). 없으면 텍스트만. */
  visual?: ReactNode
  /** 한 줄 답 — 용어 없이. 히어로의 주인공. */
  lead: ReactNode
  /** 톤 단어(순풍/주의 등) — 선택. */
  tone?: ReactNode
  /** 톤 색(좋음/주의/중립/혼조) — 모든 티어 동일 처리. */
  toneKind?: ToneKind
  /** 우측 보조 슬롯(세기 막대 등) — 선택. */
  aside?: ReactNode
  /** 부연 한 줄 — 선택. */
  sub?: ReactNode
}

/** 히어로 — 모든 티어의 최상단. 큰 비주얼 + 한 줄 답 + 톤. */
export function TierHero({ visual, lead, tone, toneKind, aside, sub }: TierHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        {visual ? <div className={styles.heroVisual}>{visual}</div> : null}
        <div className={styles.heroText}>
          <div className={styles.heroLead}>{lead}</div>
          {tone ? (
            <div className={styles.heroTone} data-tone={toneKind ?? 'neutral'}>
              <span className={styles.toneDot} aria-hidden />
              {tone}
            </div>
          ) : null}
        </div>
        {aside ? <div className={styles.heroAside}>{aside}</div> : null}
      </div>
      {sub ? <p className={styles.heroSub}>{sub}</p> : null}
    </header>
  )
}

/** 큰 세리프 제목 — 글리프 히어로가 없는 티어(월·년·10년·인생)의 주인공 줄. */
export function HeroTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.heroTitle}>{children}</h2>
}

export interface BandProps {
  /** 섹션 제목(쉬운말). 없으면 머리표 없이 본문만. */
  title?: ReactNode
  /** 우측 보조 라벨(예: 범례). */
  aside?: ReactNode
  children: ReactNode
}

/** 핵심 섹션 — 같은 머리표·간격으로 통일. 티어당 3개 안쪽 권장. */
export function Band({ title, aside, children }: BandProps) {
  return (
    <section className={styles.band}>
      {title ? (
        <div className={styles.bandHead}>
          <span className={styles.bandTitle}>{title}</span>
          {aside ? <span className={styles.bandAside}>{aside}</span> : null}
        </div>
      ) : null}
      <div className={styles.bandBody}>{children}</div>
    </section>
  )
}

/** 일관 카드 — 핵심 항목을 담는 기본 카드. */
export function Card({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>
}

/** 더 보기 — 쉬운말 보조 내용을 접어서 위계상 아래로 내림(용어 fold 와는 별개). */
export function MoreFold({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className={styles.moreFold}>
      <summary className={styles.moreSummary}>▸ {label}</summary>
      <div className={styles.moreBody}>{children}</div>
    </details>
  )
}
