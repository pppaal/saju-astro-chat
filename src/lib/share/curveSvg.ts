// src/lib/share/curveSvg.ts
//
// 공유 OG 이미지(/r/[token]/opengraph-image)에 박는 "운 흐름 곡선"을 순수
// 함수로 SVG 문자열을 만든다. satori(next/og)는 복잡한 inline <svg>/<path> 를
// 안정적으로 못 그리므로, 곡선은 여기서 SVG 문자열 → data-URI 로 만들어
// <img> 로 박는다(버전 무관·픽셀 동일). 폰트/텍스트 없는 순수 도형이라
// 한글 폰트 이슈도 없다.
//
// 인앱 그래프(DecadeTier BigYearGraph / DayTier HourGraph)와 같은
// catmull-rom → 베지어 스무딩을 써서 화면과 공유 카드의 곡선 모양이 일치한다.
//
// 순수·결정론: 같은 입력 → 같은 문자열. 클록·랜덤 없음.

export interface CurveTheme {
  /** 곡선 선 색. */
  stroke: string
  /** 면적 그라데이션 상단 색(하단은 투명). */
  fill: string
  /** 좋은 점(밴드 good 이상) 점 색. */
  dotGood: string
  /** 중간 점 색. */
  dotMid: string
  /** 주의 점(밴드 caution 미만) 점 색. */
  dotLow: string
  /** now/today 마커(세로 점선 + 링) 색. */
  marker: string
  /** 점 테두리 색(대비). 기본 흰색. */
  dotStroke?: string
}

export interface CurveSvgOptions {
  /** 0..100 점수 배열(2개 이상). */
  scores: number[]
  /** now/today 인덱스. 없으면 -1. */
  markerIndex?: number
  /** 피크(✦) 인덱스. 없으면 -1. */
  peakIndex?: number
  width?: number
  height?: number
  theme: CurveTheme
  /** 점 색 임계 — { good, caution }. */
  bands?: { good: number; caution: number }
  /** 선 두께. */
  strokeWidth?: number
}

const DEFAULT_BANDS = { good: 60, caution: 40 }

function buildSmoothPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return ''
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/**
 * 운 흐름 곡선 SVG 문자열을 만든다. 점수 2개 미만이면 빈 문자열.
 * 반환값은 완결된 <svg ...>...</svg> (배경 투명).
 */
export function buildCurveSvg(opts: CurveSvgOptions): string {
  const { scores, theme } = opts
  const n = scores.length
  if (n < 2) return ''

  const W = opts.width ?? 600
  const H = opts.height ?? 200
  const sw = opts.strokeWidth ?? 5
  const bands = opts.bands ?? DEFAULT_BANDS
  const markerIndex = opts.markerIndex ?? -1
  const peakIndex = opts.peakIndex ?? -1
  const dotStroke = theme.dotStroke ?? '#ffffff'

  const padT = Math.round(H * 0.16)
  const padB = Math.round(H * 0.14)
  const padX = Math.round(W * 0.03)
  const maxS = Math.max(...scores)
  const minS = Math.min(...scores)
  const range = Math.max(maxS - minS, 1)
  const X = (i: number) => padX + (i / (n - 1)) * (W - 2 * padX)
  const Y = (s: number) => padT + (1 - (s - minS) / range) * (H - padT - padB)
  const pts = scores.map((s, i) => [X(i), Y(s)] as const)

  const line = buildSmoothPath(pts)
  const area = `${line} L${X(n - 1).toFixed(1)},${(H - padB).toFixed(1)} L${X(0).toFixed(1)},${(H - padB).toFixed(1)} Z`

  const dotColor = (s: number) =>
    s >= bands.good ? theme.dotGood : s > 0 && s < bands.caution ? theme.dotLow : theme.dotMid

  // 점 반지름 — 카드 크기에 비례.
  const r = Math.max(3, Math.round(W * 0.011))

  const dots = scores
    .map((s, i) => {
      const isPeak = i === peakIndex
      return `<circle cx="${X(i).toFixed(1)}" cy="${Y(s).toFixed(1)}" r="${isPeak ? r + 1 : r}" fill="${dotColor(s)}" stroke="${dotStroke}" stroke-width="${Math.max(1.4, r * 0.4).toFixed(1)}"/>`
    })
    .join('')

  let markerEls = ''
  if (markerIndex >= 0 && markerIndex < n) {
    const mx = X(markerIndex).toFixed(1)
    markerEls =
      `<line x1="${mx}" y1="${(padT - 4).toFixed(1)}" x2="${mx}" y2="${(H - padB).toFixed(1)}" stroke="${theme.marker}" stroke-width="2" stroke-dasharray="4 5" stroke-opacity="0.55"/>` +
      `<circle cx="${mx}" cy="${Y(scores[markerIndex]).toFixed(1)}" r="${r + 4}" fill="none" stroke="${theme.marker}" stroke-width="${Math.max(2, r * 0.5).toFixed(1)}"/>`
  }

  const gradId = 'cg'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${theme.fill}" stop-opacity="0.32"/>` +
    `<stop offset="1" stop-color="${theme.fill}" stop-opacity="0"/>` +
    `</linearGradient></defs>` +
    `<path d="${area}" fill="url(#${gradId})"/>` +
    `<path d="${line}" fill="none" stroke="${theme.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>` +
    markerEls +
    dots +
    `</svg>`
  )
}

/** SVG 문자열을 satori <img> 에 박을 data-URI 로. */
export function curveSvgDataUri(svg: string): string {
  const b64 = Buffer.from(svg, 'utf8').toString('base64')
  return `data:image/svg+xml;base64,${b64}`
}

// ── 점수 게이지(원형 링) ──────────────────────────────────────────────
// 궁합 공유의 "얼굴 통일"용. 다운로드 1080 카드(CompatShareCard)와 같은 결의
// 원형 점수 게이지를 순수 SVG 문자열로 만든다 — satori(OG) 는 inline <svg> 를
// 못 그리므로 곡선과 똑같이 data-URI <img> 로 박고, 라이트 페이지(/r)는 그대로
// <img> 로 쓴다. 필터(글로우)는 satori 비호환이라 그라데이션 stroke 만 쓴다.

export interface GaugeTheme {
  /** 배경 트랙(안 채워진 부분) 색. */
  track: string
  /** 진행 호 그라데이션 — 시작(상단)→중간→끝. */
  gradFrom: string
  gradMid?: string
  gradTo: string
}

export interface GaugeSvgOptions {
  /** 0..100 점수. */
  score: number
  /** 정사각 한 변(px). */
  size?: number
  /** 링 두께. 기본 size*0.05. */
  strokeWidth?: number
  theme: GaugeTheme
}

/**
 * 원형 점수 게이지 SVG 문자열. 상단(12시)에서 시작해 점수만큼 시계방향으로 채운다.
 * 텍스트는 없다(호출부가 숫자를 위에 얹는다) — 순수 도형이라 폰트 이슈 없음.
 */
export function buildGaugeSvg(opts: GaugeSvgOptions): string {
  const size = opts.size ?? 400
  const sw = opts.strokeWidth ?? Math.round(size * 0.05)
  const s = Math.max(0, Math.min(100, Math.round(opts.score)))
  const cx = size / 2
  const cy = size / 2
  const r = (size - sw) / 2 - Math.round(size * 0.012)
  const C = 2 * Math.PI * r
  const off = C * (1 - s / 100)
  const t = opts.theme
  const mid = t.gradMid ?? t.gradFrom
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${t.gradFrom}"/>` +
    `<stop offset="0.5" stop-color="${mid}"/>` +
    `<stop offset="1" stop-color="${t.gradTo}"/>` +
    `</linearGradient></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.track}" stroke-width="${sw}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#gg)" stroke-width="${sw}" ` +
    `stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" ` +
    `transform="rotate(-90 ${cx} ${cy})"/>` +
    `</svg>`
  )
}

/** 게이지 SVG 문자열을 <img> src 용 data-URI 로. (curveSvgDataUri 와 동일) */
export function gaugeSvgDataUri(svg: string): string {
  return curveSvgDataUri(svg)
}
