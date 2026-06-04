/**
 * 클라이언트 사이드 인생 분기점 계산 — 대운 코어 데이터(API)가 없어도
 * 사용자가 의미 있는 timeline을 볼 수 있게 birthDate 와 phaseLabel 만으로
 * 5개 안팎의 분기점을 구성한다.
 *
 * 소스:
 *  - 현재 대운: data.matrixContract.overallPhaseLabel (engine)
 *  - 향후 분기점: birthDate 기반 표준 astro milestones
 *    (Saturn return ≈ 29.5세 / 59세, Uranus opposition ≈ 41세,
 *     Jupiter return ≈ 12·24·36·48·60세, Pluto square ≈ 36-40세)
 *
 * 만 나이 표시 — 사주/점성 화면 전체가 만 나이 한 컨벤션으로 통일 (2026-06).
 */

import type { TimelineEntry } from './LifeTimeline'
import type { CalLocale } from '../labels'

interface Args {
  /** ISO 'YYYY-MM-DD' */
  birthDate: string | undefined | null
  /** 현재 대운 라벨 — engine matrixContract.overallPhaseLabel */
  currentPhaseLabel?: string | null
  /** 현재 연도(클라 now). 없으면 new Date().getFullYear() */
  thisYear?: number
  locale?: CalLocale
}

interface AstroMilestone {
  /** 만 나이 (사주/점성 전체 컨벤션). */
  ageMan: number
  title: { ko: string; en: string }
  desc: { ko: string; en: string }
}

// 표준 astro 분기점 — Western astrology 의 generation milestones.
// 만 나이 기준 (Saturn return ~29, Pluto square ~35, Uranus opposition ~40,
// Neptune square ~41, 2nd Saturn return ~59).
const ASTRO_MILESTONES: AstroMilestone[] = [
  {
    ageMan: 29,
    title: { ko: '첫 번째 토성 회귀', en: 'First Saturn Return' },
    desc: {
      ko: '책임·구조·자기 길의 첫 큰 정렬. 본격적인 어른의 길로 진입',
      en: 'First major alignment of responsibility, structure, and your path. Entering adulthood seriously.',
    },
  },
  {
    ageMan: 35,
    title: { ko: '명왕성 사각', en: 'Pluto Square' },
    desc: {
      ko: '정체성과 내면 깊은 곳의 강한 재구성 — 변화는 외부보다 안에서',
      en: 'Strong inner reconstruction of identity — the change is internal, not external.',
    },
  },
  {
    ageMan: 40,
    title: { ko: '천왕성 마주봄', en: 'Uranus Opposition' },
    desc: {
      ko: '진짜 자기와 맞지 않는 길이 깨지는 중년 각성기',
      en: 'Mid-life awakening — paths that don’t fit the true self break apart.',
    },
  },
  {
    ageMan: 41,
    title: { ko: '해왕성 사각', en: 'Neptune Square' },
    desc: {
      ko: '의미와 환상이 시험대에 오르는 시기',
      en: 'A period when meaning and illusion are put to the test.',
    },
  },
  {
    ageMan: 59,
    title: { ko: '두 번째 토성 회귀', en: 'Second Saturn Return' },
    desc: {
      ko: '인생 후반의 방향성을 결정하는 큰 정렬',
      en: 'A major alignment that sets the direction for the latter half of life.',
    },
  },
]

const PHASE_DESC = {
  ko: '현재 진행 중인 10년 대운 — 이 흐름이 향후 몇 년의 큰 기조를 결정해요',
  en: 'Current 10-year decade luck — this flow sets the tone for the next few years.',
}

function manAgeApprox(birthYear: number, refYear: number): number {
  // 만 나이 근사 — refYear 기준 (생일 통과는 timeline 표시상 중요하지 않음).
  // 정확한 생일-aware 만 나이가 필요한 곳은 currentManAge() (datetime/currentAge) 사용.
  return refYear - birthYear
}

export function computeLifeTimeline({
  birthDate,
  currentPhaseLabel,
  thisYear,
  locale,
}: Args): TimelineEntry[] {
  if (!birthDate) return []
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return []
  const birthYear = parseInt(match[1], 10)
  if (!Number.isFinite(birthYear)) return []
  const refYear = thisYear ?? new Date().getFullYear()
  const currentAge = manAgeApprox(birthYear, refYear)
  const lang: 'ko' | 'en' = locale === 'en' ? 'en' : 'ko'
  const ageSuffix = (a: number) => (lang === 'en' ? `age ${a}` : `${a}세`)

  // 과거 + 현재 + 미래 모두 — chronological.
  const past = ASTRO_MILESTONES.filter((m) => m.ageMan < currentAge)
  const future = ASTRO_MILESTONES.filter((m) => m.ageMan > currentAge)

  const entries: TimelineEntry[] = []

  // 1. 과거 milestones — 가장 가까운 2개
  for (const m of past.slice(-2)) {
    const yearAt = birthYear + m.ageMan
    entries.push({
      ageLabel: ageSuffix(m.ageMan),
      year: yearAt,
      title: m.title[lang],
      description: m.desc[lang],
    })
  }

  // 2. 현재 대운 — engine 제공 라벨 그대로 (이미 KO 만 — 별건). active 표시.
  if (currentPhaseLabel) {
    entries.push({
      ageLabel: ageSuffix(currentAge),
      year: refYear,
      title: currentPhaseLabel,
      description: PHASE_DESC[lang],
      active: true,
    })
  }

  // 3. 미래 milestones — 최대 3개.
  for (const m of future.slice(0, 3)) {
    const yearAt = birthYear + m.ageMan
    entries.push({
      ageLabel: ageSuffix(m.ageMan),
      year: yearAt,
      title: m.title[lang],
      description: m.desc[lang],
    })
  }

  return entries
}
