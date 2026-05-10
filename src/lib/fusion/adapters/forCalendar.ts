// fusion/adapters/forCalendar.ts
// 캘린더용 fusion 어댑터 — 월별 grid 데이터 + 일별 상세.

import type { Chart } from '@/lib/astrology/foundation/types'
import type { SimpleSajuPillars, SajuThemeKey } from '@/lib/Saju/themes/types'
import type { CrossTone, ThemeKey } from '../crosses/types'
import { crossThemeAtTime } from '../crosses'
import type { CalendarDay, CalendarMonth, CalendarDayDetail } from './types'

const CORE_THEMES: ThemeKey[] = [
  'love', 'money', 'career', 'family', 'health', 'personality',
]

const ALL_THEMES: SajuThemeKey[] = [
  'love', 'money', 'career', 'family', 'health', 'personality',
  'study', 'children', 'parents', 'travel', 'social', 'business',
  'reputation', 'spirituality', 'karma', 'crisis', 'creativity', 'legal',
]

// ============================================================
// 헬퍼
// ============================================================

const TONE_TO_SCORE: Record<CrossTone, number> = {
  'strong-positive': 1.0,
  positive:          0.7,
  mixed:             0.5,
  neutral:           0.4,
  cautious:          0.25,
  'strong-negative': 0.0,
}

function scoreFromTone(tone: CrossTone): number {
  return TONE_TO_SCORE[tone] ?? 0.4
}

function aggregateTone(tones: CrossTone[]): CrossTone {
  if (tones.length === 0) return 'neutral'
  const counts: Record<CrossTone, number> = {
    'strong-positive': 0, positive: 0, mixed: 0, neutral: 0, cautious: 0, 'strong-negative': 0,
  }
  for (const t of tones) counts[t] += 1
  // 우선순위 결정 — strong이 있으면 우선
  if (counts['strong-positive'] >= 2) return 'strong-positive'
  if (counts['strong-negative'] >= 2) return 'strong-negative'
  if (counts.positive > counts.cautious) return 'positive'
  if (counts.cautious > counts.positive) return 'cautious'
  if (counts.mixed > 0) return 'mixed'
  return 'neutral'
}

const LABEL_BY_DOMAIN_TONE: Record<string, string> = {
  'love.strong-positive':   '결혼·연애 길일',
  'love.positive':          '연애 좋음',
  'love.cautious':          '관계 조심',
  'money.strong-positive':  '투자·계약 길일',
  'money.positive':         '재물 좋음',
  'money.cautious':         '큰 지출 조심',
  'career.strong-positive': '승진·면접 길일',
  'career.positive':        '직업 좋음',
  'career.cautious':        '직장 분쟁 조심',
  'family.strong-positive': '가족 모임 좋음',
  'family.positive':        '가정 좋음',
  'family.cautious':        '가족 갈등 조심',
  'health.strong-positive': '건강 회복 좋음',
  'health.positive':        '건강 좋음',
  'health.cautious':        '건강 주의',
}

function generateLabel(topDomain: ThemeKey | null, tone: CrossTone): string {
  if (!topDomain) return '평이한 날'
  const key = `${topDomain}.${tone}`
  return LABEL_BY_DOMAIN_TONE[key] ?? `${topDomain} ${tone}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ============================================================
// 메인 어댑터
// ============================================================

export interface CalendarAdapterInput {
  saju: SimpleSajuPillars
  astro: Chart
  iljinByDate?: Record<string, string>     // '2027-05-15' → '갑자' (외부 계산)
}

/**
 * 월별 캘린더 — 6 핵심 테마 × 30일 cross.
 */
export function buildCalendarMonth(
  input: CalendarAdapterInput,
  year: number,
  month: number,
): CalendarMonth {
  const daysInMonth = getDaysInMonth(year, month)
  const days: CalendarDay[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const crosses = CORE_THEMES.map((theme) =>
      crossThemeAtTime({
        saju: input.saju,
        astro: input.astro,
        theme,
        timing: { unit: 'daily', periodLabel: date },
      }),
    )

    const domainScores: Partial<Record<ThemeKey, number>> = {}
    for (const c of crosses) {
      domainScores[c.theme] = scoreFromTone(c.crossView.tone)
    }

    const topEntry = Object.entries(domainScores).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    const topDomain = (topEntry?.[0] ?? null) as ThemeKey | null
    const tone = aggregateTone(crosses.map((c) => c.crossView.tone))
    const label = generateLabel(topDomain, tone)

    days.push({
      date,
      iljin: input.iljinByDate?.[date],
      domainScores,
      topDomain,
      tone,
      label,
      summary: crosses[0]?.crossView.consensus ?? '',
    })
  }

  // Highlights
  const sortedByScore = [...days].sort(
    (a, b) => (b.domainScores[b.topDomain!] ?? 0) - (a.domainScores[a.topDomain!] ?? 0),
  )
  const bestDays = sortedByScore.slice(0, 5)
  const cautionDays = days.filter((d) => d.tone === 'cautious' || d.tone === 'strong-negative')

  const auspiciousByDomain: Partial<Record<ThemeKey, CalendarDay[]>> = {}
  for (const theme of CORE_THEMES) {
    auspiciousByDomain[theme] = days
      .filter((d) => (d.domainScores[theme] ?? 0) >= 0.7)
      .sort((a, b) => (b.domainScores[theme] ?? 0) - (a.domainScores[theme] ?? 0))
      .slice(0, 5)
  }

  return {
    year,
    month,
    days,
    highlights: { bestDays, cautionDays, auspiciousByDomain },
  }
}

/**
 * 일별 상세 — 18 테마 풀 cross.
 */
export function buildCalendarDay(
  input: CalendarAdapterInput,
  date: string,
): CalendarDayDetail {
  const crosses = ALL_THEMES.map((theme) =>
    crossThemeAtTime({
      saju: input.saju,
      astro: input.astro,
      theme,
      timing: { unit: 'daily', periodLabel: date },
    }),
  )

  // top 5-7 핵심 narrative
  const topInsights = crosses
    .filter((c) => c.crossView.tone !== 'neutral')
    .sort((a, b) => scoreFromTone(b.crossView.tone) - scoreFromTone(a.crossView.tone))
    .slice(0, 7)
    .map((c) => c.crossView.consensus)

  return {
    date,
    iljin: input.iljinByDate?.[date],
    crosses,
    topInsights,
  }
}
