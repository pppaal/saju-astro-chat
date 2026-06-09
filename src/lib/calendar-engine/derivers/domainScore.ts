/**
 * 도메인(재물·애정·직업·학업·건강)별 날짜 점수.
 *
 * 같은 signed-surprise(희소×중요+부호)를 *그 영역 신호만* 으로 돌린다. 영역 판정은
 * data/domainSignals(DOMAIN_BUCKETS) — 사전에 이미 있는 십신/행성/신살→영역 지식.
 * 점수 매핑·정규화는 layeredScore 와 동일(분포 강제 아님).
 *
 * 결과: 영역별 per-date 점수/등급 + 베스트 날(이유는 cell.topReasons 로 별도 표시).
 */
import type { CalendarCell, ActiveSignal } from '../types'
import { computeBaseRates } from './surprise'
import { signedSurprise, linearMapper } from './layeredScore'
import { scoreToGrade, type CalendarGrade } from './grade'
import {
  DOMAIN_BUCKETS,
  DOMAIN_KEYS,
  SPOUSE_STAR,
  type DomainKey,
  type DomainBucket,
} from '../data/domainSignals'

export interface DomainDayScore {
  date: string
  score: number
  grade: CalendarGrade
  signed: number
}
export interface DomainResult {
  key: DomainKey
  ko: string
  /** 날짜별 점수 (해당 영역 신호가 있는 날만). */
  perDate: DomainDayScore[]
  /** 베스트 날 (score 내림차순 상위). */
  best: DomainDayScore[]
}

function matchesDomain(s: ActiveSignal, bucket: DomainBucket, spouse: string[]): boolean {
  const e = (s.evidence ?? {}) as {
    sibsin?: string
    shinsalName?: string
    planets?: string[]
  }
  const sib = e.sibsin
  const sh = e.shinsalName
  const pl = e.planets?.[0]
  if (sib && (bucket.sibsin.includes(sib) || spouse.includes(sib))) return true
  if (sh && bucket.shinsal.includes(sh)) return true
  if (pl && bucket.planet.includes(pl)) return true
  return false
}

export function deriveDomainScores(
  cells: CalendarCell[],
  gender: 'male' | 'female' = 'male',
  topBest = 5
): Record<DomainKey, DomainResult> {
  const rates = computeBaseRates(cells)
  const out = {} as Record<DomainKey, DomainResult>

  for (const key of DOMAIN_KEYS) {
    const bucket = DOMAIN_BUCKETS[key]
    // love 버킷엔 성별별 배우자성 가산.
    const spouse = key === 'love' ? SPOUSE_STAR[gender] : []

    const signedByDate = cells.map((c) => ({
      date: c.datetime.slice(0, 10),
      signed: signedSurprise(
        c.signals.filter((s) => matchesDomain(s, bucket, spouse)),
        rates
      ),
    }))
    const map = linearMapper(signedByDate.map((d) => d.signed))
    const perDate: DomainDayScore[] = signedByDate.map((d) => {
      const score = map(d.signed)
      return { date: d.date, score, grade: scoreToGrade(score), signed: d.signed }
    })
    const best = [...perDate]
      .filter((d) => d.signed > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topBest)

    out[key] = { key, ko: bucket.ko, perDate, best }
  }

  return out
}
