// fusion/crosses/synthesizer.ts
// 사주 측 + 점성 측 → cross consensus 합성.

import type {
  CrossTone,
  ThemeKey,
  TimingUnit,
} from './types'
import type { SajuThemeAnalysis } from '@/lib/Saju/themes/types'
import type { AstroThemeAnalysis } from '@/lib/astrology/themes/types'
import type { SajuTimingAnalysis, SajuTimingTone } from '@/lib/Saju/timing/types'
import type { AstroTimingAnalysis, AstroTimingTone } from '@/lib/astrology/timing/types'

type Tone = 'positive' | 'mixed' | 'cautious' | 'neutral'

function dominantTone(items: { tone: Tone | SajuTimingTone | AstroTimingTone }[]): Tone {
  if (items.length === 0) return 'neutral'
  const counts = { positive: 0, mixed: 0, cautious: 0, neutral: 0 }
  for (const it of items) counts[it.tone] += 1
  let best: Tone = 'neutral'
  let bestCount = -1
  for (const k of ['positive', 'mixed', 'cautious', 'neutral'] as Tone[]) {
    if (counts[k] > bestCount) {
      best = k
      bestCount = counts[k]
    }
  }
  return best
}

function combineTones(saju: Tone, astro: Tone): CrossTone {
  if (saju === astro && saju === 'positive') return 'strong-positive'
  if (saju === astro && saju === 'cautious') return 'strong-negative'
  if (saju === astro) return saju === 'mixed' ? 'mixed' : 'neutral'
  // 한쪽 positive, 한쪽 cautious → mixed
  if ((saju === 'positive' && astro === 'cautious') || (saju === 'cautious' && astro === 'positive')) return 'mixed'
  // 한쪽 positive, 한쪽 neutral → positive
  if (saju === 'positive' || astro === 'positive') return 'positive'
  if (saju === 'cautious' || astro === 'cautious') return 'cautious'
  return 'mixed'
}

export function synthesizeThemeCross(input: {
  theme: ThemeKey
  timing: { unit: TimingUnit; periodLabel?: string }
  sajuTheme: SajuThemeAnalysis
  astroTheme: AstroThemeAnalysis
  sajuTimings?: SajuTimingAnalysis[]   // 여러 layer (decadal/yearly/monthly/daily/hourly)
  astroTimings?: AstroTimingAnalysis[]
}): { tone: CrossTone; consensus: string; factors: string[] } {
  const { theme, timing, sajuTheme, astroTheme, sajuTimings = [], astroTimings = [] } = input

  // 모든 layer factor 합산
  const sajuTimingFactors = sajuTimings.flatMap((t) => t.highlights)
  const astroTimingFactors = astroTimings.flatMap((t) => t.highlights)
  const sajuFactors = [
    ...sajuTheme.factors,
    ...sajuTimingFactors as { tone: Tone | SajuTimingTone }[],
  ]
  const astroFactors = [
    ...astroTheme.factors,
    ...astroTimingFactors as { tone: Tone | AstroTimingTone }[],
  ]

  const sajuTone = dominantTone(sajuFactors)
  const astroTone = dominantTone(astroFactors)
  const tone = combineTones(sajuTone, astroTone)

  const periodLabel = timing.periodLabel ?? timing.unit
  const sajuLabel = sajuTone === 'positive' ? '우호' : sajuTone === 'cautious' ? '주의' : sajuTone === 'mixed' ? '혼합' : '평이'
  const astroLabel = astroTone === 'positive' ? '우호' : astroTone === 'cautious' ? '주의' : astroTone === 'mixed' ? '혼합' : '평이'

  let consensus: string
  if (tone === 'strong-positive') {
    consensus = `${theme} × ${periodLabel}: 사주·점성 모두 우호 — 강한 긍정 시그널.`
  } else if (tone === 'strong-negative') {
    consensus = `${theme} × ${periodLabel}: 사주·점성 모두 주의 — 신중 권장.`
  } else if (tone === 'mixed') {
    consensus = `${theme} × ${periodLabel}: 사주(${sajuLabel}) 와 점성(${astroLabel}) 양면성 — 분별 필요.`
  } else if (tone === 'positive') {
    consensus = `${theme} × ${periodLabel}: 한쪽 우호 — 약한 긍정.`
  } else if (tone === 'cautious') {
    consensus = `${theme} × ${periodLabel}: 한쪽 주의 — 약한 경계.`
  } else {
    consensus = `${theme} × ${periodLabel}: 평이.`
  }

  const factors = [
    `사주 ${theme}: ${sajuTheme.summary}`,
    `점성 ${theme}: ${astroTheme.summary}`,
  ]
  for (const t of sajuTimings) factors.push(`사주 ${t.unit}: ${t.summary}`)
  for (const t of astroTimings) factors.push(`점성 ${t.unit}: ${t.summary}`)

  return { tone, consensus, factors }
}
