import { matchAllPatterns } from '@/lib/saju/patternMatcher'
import { getGeokgukRich } from '@/lib/chart-dictionary'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../../types'

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

// 격국명이 geokguk-rich 에 없는 구조 패턴(상호작용·음양격)의 EN 라벨.
const PATTERN_NAME_EN: Record<string, string> = {
  pure_element: 'Single-element dominance structure',
  balanced_elements: 'Balanced five-element structure',
  all_stems_different: 'All-independent-stems structure',
  double_yukhap: 'Double six-harmony structure',
  samhap_formation: 'Three-harmony (samhap) structure',
  double_chung: 'Double-clash structure',
  gwansal_heavy: 'Mixed officer-killer structure',
  siksang_prominent: 'Prominent output structure',
  insung_strong: 'Strong resource structure',
  jaesung_strong: 'Strong wealth structure',
  day_time_harmony: 'Day-hour harmony structure',
  yang_dominant: 'All-yang structure',
  yin_dominant: 'All-yin structure',
}

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
        // 격국 정통 한 줄(tagline) 을 chart-dictionary 에서 — 없으면 이름 폴백.
        korean: getGeokgukRich(geokguk, 'ko')?.tagline ?? geokguk,
        english: getGeokgukRich(geokguk, 'en')?.tagline ?? geokguk,
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
        // 격국 tagline 우선, 없으면 패턴 자체 해석문(interpretation/description) 폴백.
        korean:
          getGeokgukRich(top.patternName, 'ko')?.tagline ??
          top.interpretation ??
          top.description ??
          top.patternName,
        english:
          getGeokgukRich(top.patternName, 'en')?.tagline ??
          PATTERN_NAME_EN[top.patternId] ??
          top.patternName,
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

export default sajuPatternExtractor
