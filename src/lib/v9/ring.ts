/**
 * v9 60갑자 고리의 가벼운 잎(leaf) 모듈 — 다이얼 라벨 문구(DIAL_LABELS), 카드 뒷면 고리
 * 기하(cardBackRing), 연도 → 60갑자 색인 산술. 절입 표·사주 상수를 import 하지 않아
 * 클라이언트 번들(홈 카드 · v9 문구)이 sixtyDial(periodPillars 의존)을 끌고 오지 않는다.
 * 순수 함수 — 시계를 읽지 않는다.
 */

import type { Bi } from '@/lib/i18n/bi'

export interface DialLine {
  x1: string
  y1: string
  x2: string
  y2: string
}

const fx = (x: number) => x.toFixed(1)

/**
 * 사주년 → 그 해 세운의 60갑자 색인(甲子 = 0). 엔진 yearPillarOfSajuYear 와 같은 산술
 * ((y − 4) mod 60) — tests/lib/v9/sixtyDial.test.ts 가 엔진 간지(ganjiIndex60)와 1900–2100
 * 전 구간 일치를 지킨다.
 */
export function yearRingIndex(sajuYear: number): number {
  return (((sajuYear - 4) % 60) + 60) % 60
}

// ─── 다이얼 문구(ko/en) — sixtyDial · v9Copy 가 다시 내보낸다 ───

/** 다이얼 라벨 — v9Copy 가 다시 내보낸다. 영어 문구에 한글 없음. */
export const DIAL_LABELS = {
  now: { ko: '지금', en: 'NOW' },
  born: { ko: '태어난 해', en: 'BORN' },
  lifeTurn: { ko: '인생 전환', en: 'LIFE TURN' },
  /** 접근성 이름 머리 — "60-year cycle". */
  cycle: { ko: '60년 주기', en: '60-year cycle' },
  /** 60 중 몇 번째 — '{n}' 자리에 1-기반 순번. */
  position: { ko: '60 중 {n}번째', en: '{n} of 60' },
} as const satisfies Record<string, Bi>

// ─── 카드 뒷면 60갑자 고리 (gen8.py ring, dark) ───

export interface BackRingModel {
  viewBox: string
  /** 바깥·안쪽 테 원. */
  circles: Array<{ cx: number; cy: number; r: number; opacity: number; width: number }>
  /** 눈금 60개 — 길이 = 그 해 천간의 오행(목 8 · 화 11 · 토 14 · 금 17 · 수 20), 양간은 굵게. */
  ticks: Array<DialLine & { n: number; yang: boolean }>
  /** 子년(12년마다) 안쪽 점. */
  dots: Array<{ cx: string; cy: string }>
}

/**
 * 사주 카드 뒷면에 비치는 60갑자 고리 — 장식(개인 표시 없음). 12시 = topIdx(보통 지금 세운).
 * 순수 함수.
 */
export function cardBackRing(topIdx: number): BackRingModel {
  const W = 320
  const H = 344
  const cx = 160
  const cy = 172
  const r = 122
  const at = (n: number, rr: number) => {
    const a = ((-90 + (n - topIdx) * 6) * Math.PI) / 180
    return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) }
  }
  const lengths = [8, 11, 14, 17, 20]
  const ticks: BackRingModel['ticks'] = []
  for (let n = 0; n < 60; n++) {
    const stem = n % 10
    const a = at(n, r - lengths[Math.floor(stem / 2)])
    const b = at(n, r)
    ticks.push({ n, yang: stem % 2 === 0, x1: fx(a.x), y1: fx(a.y), x2: fx(b.x), y2: fx(b.y) })
  }
  const dots: BackRingModel['dots'] = []
  for (let n = 0; n < 60; n += 12) {
    const p = at(n, r - 40)
    dots.push({ cx: fx(p.x), cy: fx(p.y) })
  }
  return {
    viewBox: `0 0 ${W} ${H}`,
    circles: [
      { cx, cy, r: r + 8, opacity: 0.28, width: 1 },
      { cx, cy, r: r - 30, opacity: 0.2, width: 0.8 },
    ],
    ticks,
    dots,
  }
}
