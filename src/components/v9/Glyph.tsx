/**
 * v9 기호 — 행성·각·ASC·방향 마크. 어떤 글꼴에도 없어 인라인 SVG 로 그린다(이모지 금지).
 * 선 = currentColor. 디자인 원본(parts9 · life9 · calendar9)의 경로를 그대로 옮겼고, 원본에
 * 없는 행성(수성·화성·목성·천왕성·해왕성·명왕성)과 각은 같은 14px 격자·1.3 선으로 그렸다.
 * 서버·클라이언트 공용.
 */

import type { ReactElement } from 'react'

export type PlanetGlyph =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'asc'
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const PATHS: Record<PlanetGlyph, (w: number) => ReactElement> = {
  sun: (w) => (
    <>
      <circle cx="7" cy="7" r="5.6" {...S} strokeWidth={w} />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </>
  ),
  moon: (w) => (
    <path d="M9.2 1.4 A5.7 5.7 0 1 0 9.2 12.6 A5.6 5.6 0 0 1 9.2 1.4 Z" {...S} strokeWidth={w} />
  ),
  mercury: (w) => (
    <>
      <path d="M4.4 1.2 C5 3 9 3 9.6 1.2" {...S} strokeWidth={w} />
      <circle cx="7" cy="6.2" r="2.9" {...S} strokeWidth={w} />
      <path d="M7 9.1 V13.4 M5 11.4 H9" {...S} strokeWidth={w} />
    </>
  ),
  venus: (w) => (
    <>
      <circle cx="7" cy="5" r="3.7" {...S} strokeWidth={w} />
      <path d="M7 8.7 V13.4 M4.6 11.2 H9.4" {...S} strokeWidth={w} />
    </>
  ),
  mars: (w) => (
    <>
      <circle cx="5.6" cy="8.4" r="3.8" {...S} strokeWidth={w} />
      <path d="M8.3 5.7 L12.4 1.6 M8.8 1.6 H12.4 V5.2" {...S} strokeWidth={w} />
    </>
  ),
  jupiter: (w) => (
    <path
      d="M2.2 4 C2.6 1.6 6.4 1.4 6.2 4.4 C6 6.6 3.6 8.4 2.2 9.8 H12 M9.6 1.6 V13"
      {...S}
      strokeWidth={w}
    />
  ),
  saturn: (w) => (
    <path
      d="M4.6 0.9 V10.2 M2.4 3.1 H6.8 M4.6 7.4 C5.3 5.3 10.4 5 10.3 8.3 C10.2 10.1 8.3 10.7 8.3 12 C8.3 12.9 9.3 13.3 10.3 12.6"
      {...S}
      strokeWidth={w}
    />
  ),
  uranus: (w) => (
    <>
      <circle cx="7" cy="10.6" r="2.2" {...S} strokeWidth={w} />
      <path d="M7 1.4 V8.4 M3.2 1.8 V7 M10.8 1.8 V7 M3.2 4.4 H10.8" {...S} strokeWidth={w} />
    </>
  ),
  neptune: (w) => (
    <path d="M2.6 2.2 C2.6 7 11.4 7 11.4 2.2 M7 1.4 V13.2 M4.6 10.6 H9.4" {...S} strokeWidth={w} />
  ),
  pluto: (w) => (
    <>
      <circle cx="7" cy="4" r="2.1" {...S} strokeWidth={w} />
      <path
        d="M2.8 3.8 C2.8 9.6 11.2 9.6 11.2 3.8 M7 8.2 V13.4 M4.8 11.2 H9.2"
        {...S}
        strokeWidth={w}
      />
    </>
  ),
  asc: (w) => <path d="M1.3 12.4 H12.7 M7 9.9 V2 M3.9 5.1 L7 2 L10.1 5.1" {...S} strokeWidth={w} />,
  conjunction: (w) => (
    <>
      <circle cx="5.4" cy="8.6" r="3.2" {...S} strokeWidth={w} />
      <path d="M7.7 6.3 L11.8 2.2" {...S} strokeWidth={w} />
    </>
  ),
  sextile: (w) => (
    <path d="M7 1.6 V12.4 M2.3 4.3 L11.7 9.7 M2.3 9.7 L11.7 4.3" {...S} strokeWidth={w} />
  ),
  square: (w) => <rect x="2.4" y="2.4" width="9.2" height="9.2" {...S} strokeWidth={w} />,
  trine: (w) => <path d="M7 2.3 L12.3 11.6 H1.7 Z" {...S} strokeWidth={w} />,
  opposition: (w) => (
    <>
      <circle cx="3.6" cy="10.4" r="2.2" {...S} strokeWidth={w} />
      <circle cx="10.4" cy="3.6" r="2.2" {...S} strokeWidth={w} />
      <path d="M5.2 8.8 L8.8 5.2" {...S} strokeWidth={w} />
    </>
  ),
}

interface GlyphProps {
  name: PlanetGlyph
  /** 선 굵기 — 본문 1.3, 굵은 자리 1.5. */
  weight?: number
  className?: string
}

/** 행성·각·ASC 기호(14 × 14). 장식 — 옆 글자가 이름을 말한다. */
export function Glyph({ name, weight = 1.3, className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 14 14"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-glyph={name}
    >
      {PATHS[name](weight)}
    </svg>
  )
}

/** 방향 마크 — ▲ up(유리) · ▼ down(불리). 12 × 12, 채움. */
export function MarkTriangle({ dir, className }: { dir: 'up' | 'down'; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true" focusable="false">
      <path
        d={dir === 'up' ? 'M6 1 L11.5 11 L0.5 11 Z' : 'M0.5 1 L11.5 1 L6 11 Z'}
        fill="currentColor"
      />
    </svg>
  )
}
