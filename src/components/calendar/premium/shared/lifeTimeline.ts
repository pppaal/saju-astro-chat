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
 * 한국 나이(만나이+1)로 표시 — 사주 표기 관행과 일치.
 */

import type { TimelineEntry } from './LifeTimeline'

interface Args {
  /** ISO 'YYYY-MM-DD' */
  birthDate: string | undefined | null
  /** 현재 대운 라벨 — engine matrixContract.overallPhaseLabel */
  currentPhaseLabel?: string | null
  /** 현재 연도(클라 now). 없으면 new Date().getFullYear() */
  thisYear?: number
}

interface AstroMilestone {
  /** 한국 나이 */
  ageKr: number
  title: string
  desc: string
}

// 표준 astro 분기점 — Western astrology 의 generation milestones.
// 정확한 위치는 출생 차트에 따라 ±1~2년 변동, 여기선 대표 나이로 근사.
const ASTRO_MILESTONES: AstroMilestone[] = [
  {
    ageKr: 30,
    title: '첫 번째 토성 회귀 (Saturn Return)',
    desc: '책임·구조·자기 길의 첫 큰 정렬. 본격적인 어른의 길로 진입',
  },
  {
    ageKr: 36,
    title: '명왕성 사각 (Pluto Square)',
    desc: '정체성과 내면 깊은 곳의 강한 재구성 — 변화는 외부보다 안에서',
  },
  {
    ageKr: 41,
    title: '천왕성 마주봄 (Uranus Opposition)',
    desc: '진짜 자기와 맞지 않는 길이 깨지는 중년 각성기',
  },
  {
    ageKr: 42,
    title: '해왕성 사각 (Neptune Square)',
    desc: '의미와 환상이 시험대에 오르는 시기',
  },
  {
    ageKr: 60,
    title: '두 번째 토성 회귀 (Second Saturn Return)',
    desc: '인생 후반의 방향성을 결정하는 큰 정렬',
  },
]

function koreanAge(birthYear: number, refYear: number): number {
  // 한국 나이 = 현재 연도 - 출생 연도 + 1
  return refYear - birthYear + 1
}

export function computeLifeTimeline({
  birthDate,
  currentPhaseLabel,
  thisYear,
}: Args): TimelineEntry[] {
  if (!birthDate) return []
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return []
  const birthYear = parseInt(match[1], 10)
  if (!Number.isFinite(birthYear)) return []
  const refYear = thisYear ?? new Date().getFullYear()
  const currentKrAge = koreanAge(birthYear, refYear)

  // 과거 + 현재 + 미래 모두 — chronological 표시. 사용자 요청: "왜 과거부터 없음".
  const past = ASTRO_MILESTONES.filter((m) => m.ageKr < currentKrAge)
  const future = ASTRO_MILESTONES.filter((m) => m.ageKr > currentKrAge)

  const entries: TimelineEntry[] = []

  // 1. 과거 milestones — 가장 가까운 2개 (너무 멀면 정보 가치 낮음)
  const recentPast = past.slice(-2)
  for (const m of recentPast) {
    const yearAt = birthYear + m.ageKr - 1
    entries.push({
      ageLabel: `${m.ageKr}세`,
      year: yearAt,
      title: m.title,
      description: m.desc,
    })
  }

  // 2. 현재 대운 — engine 제공 라벨. active 표시.
  if (currentPhaseLabel) {
    entries.push({
      ageLabel: `${currentKrAge}세`,
      year: refYear,
      title: currentPhaseLabel,
      description: '현재 진행 중인 10년 대운 — 이 흐름이 향후 몇 년의 큰 기조를 결정해요',
      active: true,
    })
  }

  // 3. 미래 milestones — 현재 나이 이후, 최대 3개.
  const upcoming = future.slice(0, 3)
  for (const m of upcoming) {
    const yearAt = birthYear + m.ageKr - 1
    entries.push({
      ageLabel: `${m.ageKr}세`,
      year: yearAt,
      title: m.title,
      description: m.desc,
    })
  }

  return entries
}
