/**
 * 60갑자 다이얼(v9 홈 "How a reading is made" 띠) — 순수 기하 모델.
 *
 * 디자인 원본 gen9.py dial() 을 그대로 옮겼다: 300 × 300 viewBox, 반지름 104, 눈금 60개
 * (1눈금 = 1년), 甲년(10년마다)만 긴 눈금. 12시 방향 = 지금의 세운. 개인 표시 셋:
 * 지금(바늘 + 빨간 LED), 태어난 해(빈 원), 인생 전환(사각). 가운데는 '丙午' 와
 * '2026 · 43 / 60'.
 *
 * 시계를 읽지 않는다 — 호출자가 now 를 넘긴다(CLAUDE.md 결정성 규칙). 지금의 세운은
 * 보는 사람 시간대의 *민용 날짜*로 정한다: periodPillars.pillarsForLocalDate(오너 결정 17,
 * 立春 이 든 그날부터 새 세운). 같은 입력이면 같은 모델(좌표는 소수 한 자리 문자열).
 *
 * 글자 크기만 원본(9–11)보다 키웠다(12–13): 220px 로 그리면 viewBox 1단위 ≈ 0.73px 라 원본
 * 크기로는 라벨이 7px 아래로 내려간다.
 *
 * 이 모듈은 절입 표(periodPillars → saju/constants)를 끌고 온다 — 다이얼을 그리는 화면만
 * 쓴다. 라벨 문구(DIAL_LABELS)·카드 뒷면 고리는 의존성 없는 잎 모듈 ./ring 에 있어
 * 카드·문구(components/v9/v9Copy)가 표 없이 읽는다.
 */

import { pillarsForLocalDate, pillarsForLocalDateString } from '@/lib/calendar-engine/periodPillars'
import { yearPillarOfSajuYear } from '@/lib/saju/datePillars'
import { STEM_NAMES, BRANCH_NAMES } from '@/lib/saju/constants'
import { getDateComponentsInTimezone, normalizeTimeZone } from '@/lib/datetime/timezone'
import type { Lang } from '@/lib/i18n/bi'
import { DIAL_LABELS, type DialLine } from './ring'

// ─── 60갑자 색인 ───

/** 천간·지지 → 60갑자 색인(甲子 = 0 … 癸亥 = 59). 짝이 안 맞으면(예: 甲丑) -1. */
export function ganjiIndexOf(stem: string, branch: string): number {
  const s = STEM_NAMES.indexOf(stem)
  const b = BRANCH_NAMES.indexOf(branch)
  if (s < 0 || b < 0 || s % 2 !== b % 2) return -1
  // n ≡ s (mod 10), n ≡ b (mod 12) 인 0 ≤ n < 60 — 짝수 차이라 해가 하나 있다.
  for (let n = s; n < 60; n += 10) if (n % 12 === b) return n
  return -1
}

/**
 * 사주년(입춘 기준 연도 번호) → 그 해 세운의 60갑자 색인. 간지는 엔진
 * yearPillarOfSajuYear 에서 받는다(getYearPillarForDate · periodPillars 와 같은 산술).
 */
export function ganjiIndex60(sajuYear: number): number {
  const p = yearPillarOfSajuYear(sajuYear)
  return ganjiIndexOf(p.stem, p.branch)
}

// ─── 문구(ko/en) — 잎 모듈 ring.ts 가 SSOT ───

export { DIAL_LABELS }

// ─── 기하 상수 (gen9.py dial) ───

const DIAL_VIEWBOX = { width: 300, height: 300 } as const
const CX = 150
const CY = 150
const R = 104

/** 두 줄 라벨의 줄 간격(viewBox 단위). */
const LINE_STEP = 14

const fx = (x: number) => x.toFixed(1)

/** 12시 = topIdx 일 때 색인 n 의 반지름 r 점. 시계 방향으로 1칸 = 6°. */
function pt(n: number, r: number, topIdx: number): { x: number; y: number } {
  const a = ((-90 + (n - topIdx) * 6) * Math.PI) / 180
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

/** 라벨 폭 어림 — mono 글리프 0.6em, 한자·한글 1em, 자간 포함. 화면 밖 잘림만 막는다. */
function estimateWidth(text: string, fontSize: number, letterSpacing: number): number {
  let w = 0
  for (const ch of text) w += /[　-鿿가-힯]/.test(ch) ? fontSize : fontSize * 0.6
  return w + letterSpacing * Math.max(0, [...text].length - 1)
}

// ─── 모델 ───

type DialAnchor = 'start' | 'middle' | 'end'

interface DialTick extends DialLine {
  /** 60갑자 색인. */
  n: number
  /** 甲년(10년마다) — 긴 눈금. */
  major: boolean
}

export interface DialText {
  x: string
  y: string
  anchor: DialAnchor
  text: string
  fontSize: number
  /** 흐림(0~1) — 1 이면 생략해도 된다. */
  opacity: number
}

export interface DialModel {
  viewBox: string
  /** 바깥 테두리 원. */
  ring: { cx: number; cy: number; r: number }
  /** 지금·인생 전환 자리는 빠진 눈금들. */
  ticks: DialTick[]
  /** 지금 — 바늘과 LED. */
  needle: { line: DialLine; led: { cx: string; cy: string; r: number } }
  /** 태어난 해 — 빈 원. bornYear 가 없으면 null. */
  born: { n: number; cx: string; cy: string; r: number } | null
  /** 인생 전환 — 짧은 바늘 + 사각. turn 이 없으면 null. */
  turn: { n: number; line: DialLine; rect: { x: string; y: string; size: number } } | null
  /** 라벨들(NOW · 인생 전환 연도/문구 · 태어난 해). */
  labels: DialText[]
  /** 가운데 — 간지('丙午')와 '2026 · 43 / 60'. */
  centre: { ganji: string; sub: string }
  /** 지금 세운. */
  now: { stem: string; branch: string; sajuYear: number; index: number }
  /** 스크린 리더용 한 줄. */
  ariaLabel: string
}

export interface DialInput {
  /**
   * 지금 — 호출자가 넘긴다. Date 면 timeZone 의 민용 날짜로 읽고, 'YYYY-MM-DD' 문자열이면
   * 이미 그 사람의 현지 날짜로 보고 그대로 쓴다.
   */
  nowDate: Date | string
  /**
   * 보는 사람의 IANA 시간대 — Date 를 그 민용 날짜로 읽고, 節/立春 순간이 어느 현지 날짜에
   * 드는지 정한다. 없거나 깨졌으면 UTC(서울 아님 — 글로벌 제품, greetingTemplates ·
   * useCounselorData 와 같은 규칙, G13).
   */
  timeZone?: string | null
  /** 태어난 해의 사주년(원국 연주의 해, 입춘 기준). 없으면 표시 안 함. */
  bornYear?: number | null
  /** 인생 전환(인생의 큰 전환 목록의 다음 항목) — 그 해. 없으면 표시 안 함. */
  turn?: { year: number } | null
  locale?: Lang
}

function localPillars(nowDate: Date | string, timeZone?: string | null) {
  const tz = normalizeTimeZone(timeZone, 'UTC')
  if (typeof nowDate === 'string') return pillarsForLocalDateString(nowDate.slice(0, 10), tz)
  const c = getDateComponentsInTimezone(nowDate, tz)
  return pillarsForLocalDate(c.year, c.month, c.day, tz)
}

/** 표시(사각 · 원)의 상자 — viewBox 단위. */
export interface DialBox {
  x: number
  y: number
  w: number
  h: number
}

/** 라벨과 표시 사이에 남길 최소 틈(viewBox 단위) — '상자 주석은 부딪히지 않는다'(SPEC9 규칙 5). */
export const LABEL_GAP = 5

type LabelLine = { text: string; fontSize: number; opacity: number; letterSpacing: number }

/**
 * 라벨 한 줄의 어림 상자 — 글자 폭은 estimateWidth, 높이는 기준선 위 0.75em · 아래 0.25em.
 * 테스트가 표시와의 겹침을 같은 셈으로 확인한다.
 */
export function labelBox(l: DialText, letterSpacing = 0.4): DialBox {
  const w = estimateWidth(l.text, l.fontSize, letterSpacing)
  const x0 = Number(l.x) - (l.anchor === 'start' ? 0 : l.anchor === 'middle' ? w / 2 : w)
  return { x: x0, y: Number(l.y) - l.fontSize * 0.75, w, h: l.fontSize }
}

function boxesTouch(a: DialBox, b: DialBox, gap: number): boolean {
  return (
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
  )
}

/** 위·아래 배치 — 가운데 정렬. 아래면 표시 밑으로, 위면 표시 위로. */
function placeVertical(
  m: { x: number; y: number },
  lines: LabelLine[],
  w: number,
  below: boolean
): DialText[] {
  const pad = 2
  const x = Math.min(DIAL_VIEWBOX.width - pad - w / 2, Math.max(pad + w / 2, m.x))
  return lines.map((l, i) => ({
    x: fx(x),
    y: fx(below ? m.y + 20 + i * LINE_STEP : m.y - 12 - (lines.length - 1 - i) * LINE_STEP),
    anchor: 'middle' as const,
    text: l.text,
    fontSize: l.fontSize,
    opacity: l.opacity,
  }))
}

/**
 * 표시 하나(색인 n, 반지름 R+14)의 라벨 자리 — gen9 배치 규칙을 일반화. 옆 배치가 viewBox 가장자리에
 * 밀려(오른쪽 끝 고정) 표시 상자 marker 에 닿으면 — EN 'LIFE TURN' 이 x 238 → 230 으로 밀려 사각
 * (226–232)의 'L' 을 덮던 문제(QA VH-4) — 같은 정렬로 표시 위(또는 아래)에 쌓고, 그래도 닿으면
 * 가운데 정렬 위·아래로 둔다. 어느 자리든 표시와 LABEL_GAP 이상 떨어진다.
 */
function placeLabel(
  n: number,
  topIdx: number,
  lines: LabelLine[],
  marker: DialBox | null
): DialText[] {
  const m = pt(n, R + 14, topIdx)
  const sinFromTop = (m.x - CX) / (R + 14) // 12시 기준 시계방향 각의 sin
  const widths = lines.map((l) => estimateWidth(l.text, l.fontSize, l.letterSpacing))
  const w = Math.max(...widths)
  const pad = 2
  if (Math.abs(sinFromTop) < 0.3) return placeVertical(m, lines, w, m.y > CY)
  // 옆 — 오른쪽은 start, 왼쪽은 end. 한 줄이면 표시 높이에, 두 줄이면 위아래로 나눈다.
  const right = m.x > CX
  let x = right ? m.x + 9 : m.x - 9
  if (right && x + w > DIAL_VIEWBOX.width - pad) x = DIAL_VIEWBOX.width - pad - w
  if (!right && x - w < pad) x = pad + w
  const anchor = right ? ('start' as const) : ('end' as const)
  const at = (yOf: (i: number) => number): DialText[] =>
    lines.map((l, i) => ({
      x: fx(x),
      y: fx(yOf(i)),
      anchor,
      text: l.text,
      fontSize: l.fontSize,
      opacity: l.opacity,
    }))
  const below = m.y > CY
  const y0 = lines.length === 1 ? m.y + 3.5 : m.y - 8
  const candidates: DialText[][] = [
    // 1) 옆(gen9 원래 자리).
    at((i) => y0 + i * LINE_STEP),
    // 2) 같은 정렬로 표시 위(위 반쪽) · 아래(아래 반쪽)에 쌓기 — 고리 바깥쪽이라 눈금과 겹치지 않는다.
    at((i) => (below ? m.y + 20 + i * LINE_STEP : m.y - 12 - (lines.length - 1 - i) * LINE_STEP)),
    // 3) 가운데 정렬 위·아래.
    placeVertical(m, lines, w, below),
  ]
  if (!marker) return candidates[0]
  const clear = (c: DialText[]) =>
    !c.some((t, i) => boxesTouch(labelBox(t, lines[i].letterSpacing), marker, LABEL_GAP))
  return candidates.find(clear) ?? candidates[candidates.length - 1]
}

/** 60갑자 다이얼 모델. 순수 함수 — 시계를 읽지 않는다. */
export function dialModel(input: DialInput): DialModel {
  const lang: Lang = input.locale === 'ko' ? 'ko' : 'en'
  const L = (k: keyof typeof DIAL_LABELS) => DIAL_LABELS[k][lang]

  const p = localPillars(input.nowDate, input.timeZone)
  const top = ganjiIndexOf(p.year.stem, p.year.branch)
  const bornIdx = input.bornYear != null ? ganjiIndex60(input.bornYear) : -1
  const turnIdx = input.turn ? ganjiIndex60(input.turn.year) : -1

  const ticks: DialTick[] = []
  for (let n = 0; n < 60; n++) {
    if (n === top || n === turnIdx) continue
    const major = n % 10 === 0
    const a = pt(n, R - (major ? 16 : 9), top)
    const b = pt(n, R, top)
    ticks.push({ n, major, x1: fx(a.x), y1: fx(a.y), x2: fx(b.x), y2: fx(b.y) })
  }

  const n1 = pt(top, R - 36, top)
  const n2 = pt(top, R + 4, top)
  const led = pt(top, R + 15, top)

  let turn: DialModel['turn'] = null
  if (turnIdx >= 0) {
    const a = pt(turnIdx, R - 22, top)
    const b = pt(turnIdx, R + 4, top)
    const r = pt(turnIdx, R + 14, top)
    turn = {
      n: turnIdx,
      line: { x1: fx(a.x), y1: fx(a.y), x2: fx(b.x), y2: fx(b.y) },
      rect: { x: fx(r.x - 3), y: fx(r.y - 3), size: 6 },
    }
  }

  let born: DialModel['born'] = null
  if (bornIdx >= 0) {
    const b = pt(bornIdx, R + 14, top)
    born = { n: bornIdx, cx: fx(b.x), cy: fx(b.y), r: 3.6 }
  }

  const labels: DialText[] = [
    { x: fx(CX), y: '16.0', anchor: 'middle', text: L('now'), fontSize: 13, opacity: 1 },
  ]
  if (turn && input.turn) {
    labels.push(
      ...placeLabel(
        turnIdx,
        top,
        [
          { text: String(input.turn.year), fontSize: 12.5, opacity: 0.86, letterSpacing: 0.4 },
          { text: L('lifeTurn'), fontSize: 12, opacity: 0.72, letterSpacing: 0.4 },
        ],
        {
          x: Number(turn.rect.x),
          y: Number(turn.rect.y),
          w: turn.rect.size,
          h: turn.rect.size,
        }
      )
    )
  }
  let bornText = ''
  if (born && input.bornYear != null) {
    const bp = yearPillarOfSajuYear(input.bornYear)
    bornText = `${L('born')} · ${bp.stem}${bp.branch} ${input.bornYear}`
    labels.push(
      ...placeLabel(
        bornIdx,
        top,
        [{ text: bornText, fontSize: 12.5, opacity: 0.86, letterSpacing: 0.6 }],
        {
          x: Number(born.cx) - born.r,
          y: Number(born.cy) - born.r,
          w: born.r * 2,
          h: born.r * 2,
        }
      )
    )
  }

  const ganji = `${p.year.stem}${p.year.branch}`
  const sub = `${p.year.sajuYear} · ${top + 1} / 60`
  const aria = [
    `${L('cycle')}: ${L('now')} ${ganji} ${p.year.sajuYear} (${L('position').replace('{n}', String(top + 1))})`,
    bornText,
    input.turn ? `${L('lifeTurn')} ${input.turn.year}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    viewBox: `0 0 ${DIAL_VIEWBOX.width} ${DIAL_VIEWBOX.height}`,
    ring: { cx: CX, cy: CY, r: R + 7 },
    ticks,
    needle: {
      line: { x1: fx(n1.x), y1: fx(n1.y), x2: fx(n2.x), y2: fx(n2.y) },
      led: { cx: fx(led.x), cy: fx(led.y), r: 3.6 },
    },
    born,
    turn,
    labels,
    centre: { ganji, sub },
    now: { stem: p.year.stem, branch: p.year.branch, sajuYear: p.year.sajuYear, index: top },
    ariaLabel: aria,
  }
}
