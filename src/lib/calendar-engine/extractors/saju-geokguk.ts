import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * 본명 격국 성패(成敗) 추출기.
 *
 * `advancedAnalysis.geokguk.statusResult` 에 정격·비격 사주의 성격/파격/반성반파
 * 판정이 담겨 있다 (build.ts → performAdvancedAnalysis → determineGeokgukAdvanced).
 * 이를 본명 lifetime 배경 신호로 띄움 — 평생 활성, 시점 무관.
 *
 * saju-pattern 과의 차이:
 *  - saju-pattern: 격국명(label) 만 emit. polarity +1, weight 0.9.
 *  - saju-geokguk: 격국의 성패(quality) 신호. 성격→+2, 파격→−2, 반성반파→0.
 *    같은 격국이라도 보좌·파괴 요소에 따라 길흉이 갈라짐 — 정통 자평명리의 핵심.
 *
 * decadal layer 로 emit (사주 본질이라 평생 활성이지만 엔진 시간 스케일 상 가장 김).
 *
 * 점수 영향:
 *  - 성격: polarity +2, weight 0.95 — 길/덕성 강조
 *  - 파격: polarity −2, weight 0.95 — 흉/조정 필요 강조
 *  - 반성반파: polarity 0, weight 0.85 — 중립, 노출 라벨만 의미
 *
 * derivers 의 score 가 saju-pattern 과 동일 정책(평생 배경 신호 제외) 으로
 * 다루도록 `kind: 'saju-pattern'` 을 재사용 — index.ts groupIntoCells 의
 * `scoreSignals.filter((s) => s.kind !== 'saju-pattern')` 에 그대로 걸려서
 * 매일 score 에 +impact 를 깔지 않는다. narrative (cell.signals) 에는 유지.
 */

import type { AstroThemeKey } from '@/lib/astrology/themes/types'

const sajuGeokgukExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'saju-pattern',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const signals: ActiveSignal[] = []

    const advanced = natal.saju.advancedAnalysis?.geokguk
    if (!advanced || !advanced.primary || advanced.primary === '미정') {
      return signals
    }

    const statusResult = (advanced as { statusResult?: {
      status: '성격' | '파격' | '반성반파'
      factors: { positive: string[]; negative: string[] }
      description: string
    } }).statusResult
    if (!statusResult) return signals

    // 활성 윈도우 — saju-pattern 과 동일하게 lifetime(생애 전체) ∩ range.
    const lifetimeStart = new Date(
      Date.UTC(natal.input.year, natal.input.month - 1, natal.input.date)
    ).toISOString()
    const lifetimeEnd = new Date(Date.UTC(natal.input.year + 120, 0, 1)).toISOString()
    const rangeStart = new Date(range.start).toISOString()
    const rangeEnd = new Date(range.end).toISOString()
    const activeWindow = {
      start: rangeStart > lifetimeStart ? rangeStart : lifetimeStart,
      peak: rangeStart,
      end: rangeEnd < lifetimeEnd ? rangeEnd : lifetimeEnd,
    }

    const geokguk = advanced.primary as string
    const status = statusResult.status
    const polarity: Polarity = status === '성격' ? 2 : status === '파격' ? -2 : 0
    const weight = status === '반성반파' ? 0.85 : 0.95

    // reason — positive·negative 요인을 사람이 읽을 수 있게 한 줄로.
    const reasonParts: string[] = []
    if (statusResult.factors.positive.length > 0) {
      reasonParts.push(`성격요소(${statusResult.factors.positive.join(', ')})`)
    }
    if (statusResult.factors.negative.length > 0) {
      reasonParts.push(`파격요소(${statusResult.factors.negative.join(', ')})`)
    }
    const reason = reasonParts.length > 0 ? reasonParts.join(' · ') : statusResult.description

    signals.push({
      id: `saju.geokguk.status.${geokguk}.${status}`,
      source: 'saju',
      kind: 'saju-pattern',
      name: `${geokguk} (${status})`,
      korean: `${geokguk} ${status}`,
      themes: themesForGeokguk(geokguk),
      polarity,
      layer: 'decadal',
      active: activeWindow,
      weight,
      evidence: {
        module: 'saju-geokguk',
        detail: {
          geokguk,
          category: advanced.category,
          status,
          reason,
          positiveFactors: statusResult.factors.positive,
          negativeFactors: statusResult.factors.negative,
          description: statusResult.description,
          kind: 'geokguk-status',
        },
      },
    })

    return signals
  },
}

/**
 * 격국명 → 테마. saju-pattern.ts 의 themesForGeokguk 와 동일 정책으로 일관성 유지.
 */
function themesForGeokguk(geokguk: string): AstroThemeKey[] {
  const themes = new Set<AstroThemeKey>()
  if (/정관|편관|종살|건록|양인/.test(geokguk)) themes.add('career')
  if (/정재|편재|종재|가색/.test(geokguk)) themes.add('money')
  if (/정인|편인|종강|곡직/.test(geokguk)) themes.add('growth')
  if (/식신|상관|종아|염상/.test(geokguk)) themes.add('growth')
  if (/종왕|월겁|잡기/.test(geokguk)) themes.add('growth')
  if (/종혁|윤하/.test(geokguk)) themes.add('growth')
  if (/화토격|화금격|화수격|화목격|화화격/.test(geokguk)) themes.add('growth')
  if (themes.size === 0) themes.add('growth')
  return Array.from(themes)
}

export default sajuGeokgukExtractor
