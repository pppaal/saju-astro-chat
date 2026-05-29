import { matchAllPatterns } from '@/lib/saju/patternMatcher'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * 본명 사주 패턴 (격국·구조) 추출기.
 *
 * patternMatcher는 본명 차트에서 매칭된 패턴을 반환 (정적).
 * 이걸 "lifetime" 레이어의 배경 신호로 띄움 — 평생 활성.
 * derivers는 이 배경 신호 + 현재 활성 신호 조합으로 "패턴 강화/약화" 판단 가능.
 *
 * matchScore가 높은(50+) 패턴만 emit.
 *
 * 추가로 natal.saju.geokguk (격국명, build.ts가 determineGeokguk으로 채움)이
 * 있으면 별도 신호로 emit — 명리상 主格 라벨을 카드/내러티브에 노출.
 */

const sajuPatternExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'saju-pattern',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const signals: ActiveSignal[] = []

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

    // ─── 격국명 (build.ts → context.saju.geokguk) ───
    // 명리 主格(primary structure)은 매칭된 sibsin 패턴(재성격·인수격…)과 별개
    // 라벨이다. 정관격/편관격/식신격… 등 10+ 종류로 사주의 본질 톤을 한 마디로
    // 압축한다. 가장 점수 높은 패턴 옆에 함께 띄워 카드·내러티브에서 사용자가
    // 자기 격국명을 바로 확인할 수 있게 한다.
    const geokguk = natal.saju.geokguk
    if (geokguk) {
      signals.push({
        id: `saju.pattern.geokguk.${geokguk}`,
        source: 'saju',
        kind: 'saju-pattern',
        name: geokguk,
        korean: geokguk,
        themes: themesForGeokguk(geokguk),
        polarity: 1, // 격국 자체는 본질 라벨 — 약한 + 톤만 부여
        layer: 'decadal',
        active: activeWindow,
        weight: 0.9, // 명리 主格이라 강한 가중. 단일 발화라 inflate 위험 낮음.
        evidence: {
          module: 'saju-pattern',
          detail: {
            geokguk,
            kind: 'geokguk',
          },
        },
      })
    }

    // ─── 패턴 매칭 (재성격·인수격·삼합격…) ───
    const matches = matchAllPatterns(natal.saju.pillars)
    // 격국은 명리상 主格 1개가 원칙. matchAllPatterns는 matchScore >= 50인
    // 모든 패턴을 emit해 한 사주에 4개(삼합격·재성격·중화격·인수격) 동시 발화 가능.
    // 그 4개가 모두 lifetime decadal layer로 매일 +impact를 주면 사용자 점수
    // baseline이 영구 inflate(사용자별 격차의 주 원인). 가장 점수 높은 1개만.
    const top = matches
      .filter((m) => m.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)[0]

    if (top) {
      signals.push({
        id: `saju.pattern.${top.patternId}`,
        source: 'saju' as const,
        kind: 'saju-pattern' as const,
        name: top.patternName,
        korean: top.patternName,
        themes: themesForPattern(top.category, top.keywords),
        polarity: polarityForPattern(top.rarity, top.matchScore),
        layer: 'decadal' as const, // 평생 배경 → decadal에 매핑 (가장 긴 레이어)
        active: activeWindow,
        weight: Math.min(1, 0.5 + top.matchScore / 200), // 50점=0.75, 100점=1.0
        evidence: {
          module: 'saju-pattern',
          detail: {
            patternId: top.patternId,
            category: top.category,
            rarity: top.rarity,
            matchScore: top.matchScore,
            keywords: top.keywords,
            description: top.description,
            interpretation: top.interpretation,
          },
        },
      })
    }

    return signals
  },
}

function polarityForPattern(rarity: string, score: number): Polarity {
  // 매우 희귀 + 고득점 = 강한 길/흉 (패턴은 본질이 길흉이 아닌 경우 많아 일단 +)
  const intensity = Math.min(3, Math.floor(score / 30) + (rarity === 'legendary' ? 1 : 0)) as
    | 1
    | 2
    | 3
  return intensity
}

import type { AstroThemeKey } from '@/lib/astrology/themes/types'

/**
 * 격국명 → 테마 매핑.
 * 정관/편관 → career, 정재/편재 → money, 정인/편인 → growth(학문),
 * 식신/상관 → growth(창의/표현), 종재/종살/종아 등 종격은 강한 쪽으로 흡수,
 * 곡직/염상/가색/종혁/윤하 등 특수격국은 오행 결대로 매핑.
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

function themesForPattern(category: string, keywords: string[]): AstroThemeKey[] {
  const themes = new Set<AstroThemeKey>()
  const text = (category + ' ' + keywords.join(' ')).toLowerCase()
  if (/wealth|money|재물|재성/.test(text)) themes.add('money')
  if (/love|romance|연애|도화|family|가족/.test(text)) themes.add('love')
  if (/career|관성|직업|관운|study|학문|문창|reputation|명예|장성/.test(text)) themes.add('career')
  if (/health|건강/.test(text)) themes.add('health')
  if (/creative|창의|식상|spiritual|영성|화개/.test(text)) themes.add('growth')
  if (themes.size === 0) themes.add('growth')
  return Array.from(themes)
}

export default sajuPatternExtractor
