import type {
  ActiveSignal,
  CalendarBuildOptions,
  CalendarCell,
  CalendarRange,
  SignalExtractor,
} from './types'
import type { NatalContext } from './context/types'
import { createCache } from './cache'
import { tagSignalWithThemes } from './themes/tagger'

// 등록된 extractor — 새 추출기 추가 시 여기 import + getRegisteredExtractors에 push
import sajuShinsalExtractor from './extractors/saju-shinsal'
import sajuPillarExtractor from './extractors/saju-pillar'
import sajuHyeongchungExtractor from './extractors/saju-hyeongchung'
import sajuTonggeunExtractor from './extractors/saju-tonggeun'
import sajuTwelveStageExtractor from './extractors/saju-twelve-stage'
import sajuYongsinExtractor from './extractors/saju-yongsin'
import sajuPatternExtractor from './extractors/saju-pattern'
import sajuHourExtractor from './extractors/saju-hour'
import sajuElementFlowExtractor from './extractors/saju-element-flow'
import sajuIljuArchetypeExtractor from './extractors/saju-ilju-archetype'
import sajuJohuYongsinExtractor from './extractors/saju-johu-yongsin'
import astroTransitExtractor from './extractors/astro-transit'
import astroEclipseExtractor from './extractors/astro-eclipse'
import astroProfectionExtractor from './extractors/astro-profection'
import astroLifecycleExtractor from './extractors/astro-lifecycle'
import astroZRExtractor from './extractors/astro-zr'
import astroArabicPartExtractor from './extractors/astro-arabic-part'
import astroFixedStarExtractor from './extractors/astro-fixed-star'
import astroReturnExtractor from './extractors/astro-return'
import astroProgressionExtractor from './extractors/astro-progression'
import astroMoonPhaseVocExtractor from './extractors/astro-moon-phase-voc'
import astroElectionalExtractor from './extractors/astro-electional'
import astroDignityExtractor from './extractors/astro-dignity'
import astroMoonNodesExtractor from './extractors/astro-moon-nodes'
import astroHouseTransitExtractor from './extractors/astro-house-transit'
import astroPlanetaryHourExtractor from './extractors/astro-planetary-hour'
import astroAsteroidExtractor from './extractors/astro-asteroid'
import astroSolarArcExtractor from './extractors/astro-solar-arc'
import astroMidpointExtractor from './extractors/astro-midpoint'
import astroSoulPatternExtractor from './extractors/astro-soul-pattern'

// derivers
import { calibrateAxes, deriveCellAxes } from './derivers/axisScore'
import { deriveThemeScores } from './derivers/themeScores'
import { deriveTopReasons, deriveCautions } from './derivers/summary'
import { derivePatterns } from './derivers/patterns'

/**
 * 캘린더 엔진 진입점.
 *
 * 1. NatalContext + range를 받아
 * 2. 등록된 extractor를 모두 실행해 ActiveSignal[]을 모으고
 * 3. tagger로 테마 라벨 보강
 * 4. CalendarCell[]로 그룹핑 + derivers로 점수·패턴·요약 계산
 *
 * 점수는 부산물 — 신호 다발 자체가 데이터의 본질.
 */
export async function buildCalendar(
  natal: NatalContext,
  range: CalendarRange,
  options: CalendarBuildOptions = {}
): Promise<CalendarCell[]> {
  const cache = createCache()
  const ctx = { natal, range, cache }

  // 1) 활성 추출기 결정
  const extractors = getRegisteredExtractors().filter((ex) => {
    if (!options.enabledExtractors) return true
    const kinds = Array.isArray(ex.kind) ? ex.kind : [ex.kind]
    return kinds.some((k) => options.enabledExtractors!.includes(k))
  })

  // 2) 모든 extractor 병렬 실행 → 신호 평탄화
  const signalArrays = await Promise.all(extractors.map((ex) => ex.extract(ctx)))
  const allSignals = signalArrays.flat()

  // 3) 테마 라벨 + 기여 가중 보강
  for (const signal of allSignals) {
    const tagged = tagSignalWithThemes(signal, ctx.natal.gender)
    signal.themes = tagged.themes
    signal.themeWeights = tagged.weights
  }

  // 4) 시점별 그룹핑 + derivers
  return groupIntoCells(allSignals, range, options)
}

/**
 * 추출기 레지스트리.
 * Wave 2~3에서 saju-shinsal, astro-transit 등이 여기 추가됨.
 * 각 추출기는 독립이라 하나씩 붙여도 캘린더가 점진 풍부해짐.
 */
function getRegisteredExtractors(): SignalExtractor[] {
  return [
    // ── saju (7) ──
    sajuShinsalExtractor,
    sajuPillarExtractor,
    sajuHyeongchungExtractor,
    sajuTonggeunExtractor,
    sajuTwelveStageExtractor,
    sajuYongsinExtractor,
    sajuPatternExtractor,
    sajuHourExtractor,
    sajuElementFlowExtractor,
    sajuIljuArchetypeExtractor,
    sajuJohuYongsinExtractor,

    // ── astro (13) ──
    astroTransitExtractor,
    astroEclipseExtractor,
    astroProfectionExtractor,
    astroLifecycleExtractor,
    astroZRExtractor,
    astroArabicPartExtractor,
    astroFixedStarExtractor,
    astroReturnExtractor,
    astroProgressionExtractor,
    astroMoonPhaseVocExtractor,
    astroElectionalExtractor,
    astroDignityExtractor,
    astroMoonNodesExtractor,
    astroHouseTransitExtractor,
    astroPlanetaryHourExtractor,
    astroAsteroidExtractor,
    astroSolarArcExtractor,
    astroMidpointExtractor,
    astroSoulPatternExtractor,
  ]
}

/**
 * 신호 배열을 (date, hour?) 셀로 그룹핑.
 * derivers는 다음 wave에서 채움 — 일단 구조만.
 */
function groupIntoCells(
  signals: ActiveSignal[],
  range: CalendarRange,
  options: CalendarBuildOptions
): CalendarCell[] {
  const cells = new Map<string, CalendarCell>()
  const isoForCell = (iso: string) =>
    range.granularity === 'hour'
      ? iso.slice(0, 13) + ':00:00.000Z'
      : iso.slice(0, 10) + 'T00:00:00.000Z'

  // 각 셀 timestamp 초기화
  for (const day of iterateRange(range)) {
    cells.set(day, {
      datetime: day,
      signals: [],
      derivedScore: 50,
      themeScores: {},
      matchedPatterns: [],
      topReasons: [],
      cautions: [],
    })
  }

  // 신호를 활성 윈도우의 모든 셀에 push
  for (const signal of signals) {
    const startCell = isoForCell(signal.active.start)
    const endCell = isoForCell(signal.active.end)
    for (const cellKey of cellsBetween(startCell, endCell, range.granularity)) {
      const cell = cells.get(cellKey)
      if (!cell) continue
      cell.signals.push(options.includeEvidence ? signal : stripEvidence(signal))
    }
  }

  // derivers — 단일출처 두 축(사주/점성) → 헤드라인(비보상 결합)이 derivedScore.
  // 옛 deriveScore(단일 산술 2단평균)는 제거 — 점수가 두 축 수렴 모델 하나로 통일.
  // 보정(calibrateAxes)은 이 빌드 창 전체에서 1회 산출 → 같은 창 내 모든 셀 동일.
  // (창=월 단위 캐시면 월상대 보정 — 연단위 안정화는 향후 per-natal 보정 캐시로.)
  //
  // score/axis 입력에서 'saju-pattern'(본명 격국 — 평생 배경 신호)을 제외:
  // 그날 가변이 아니라 본명 표지라 모든 셀에 같은 +impact를 깔아 분포를 편향시킴.
  // narrative(cell.signals 그대로)에는 유지.
  const cellList = Array.from(cells.values())
  const scoreInputCells = cellList.map((c) => ({
    ...c,
    signals: c.signals.filter((s) => s.kind !== 'saju-pattern'),
  }))
  const axisCal = calibrateAxes(scoreInputCells)

  for (const cell of cells.values()) {
    const scoreSignals = cell.signals.filter((s) => s.kind !== 'saju-pattern')
    cell.matchedPatterns = options.enablePatterns === false ? [] : derivePatterns(scoreSignals)
    const axes = deriveCellAxes(scoreSignals, axisCal)
    cell.derivedScore = axes.headline
    cell.sajuAxis = axes.sajuAxis
    cell.astroAxis = axes.astroAxis
    cell.axisAgreement = axes.agreement
    cell.themeScores = deriveThemeScores(cell.signals)
    cell.topReasons = deriveTopReasons(cell.signals)
    cell.cautions = deriveCautions(cell.signals)
  }

  return Array.from(cells.values()).sort((a, b) => a.datetime.localeCompare(b.datetime))
}

function* iterateRange(range: CalendarRange): Generator<string> {
  const start = new Date(range.start).getTime()
  const end = new Date(range.end).getTime()
  const step = range.granularity === 'hour' ? 3600_000 : 86_400_000
  for (let t = start; t <= end; t += step) {
    yield new Date(t).toISOString()
  }
}

function* cellsBetween(
  startIso: string,
  endIso: string,
  granularity: 'day' | 'hour'
): Generator<string> {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const step = granularity === 'hour' ? 3600_000 : 86_400_000
  for (let t = start; t <= end; t += step) {
    yield new Date(t).toISOString()
  }
}

function stripEvidence(signal: ActiveSignal): ActiveSignal {
  return { ...signal, evidence: { module: signal.evidence.module, detail: {} } }
}

export type { ActiveSignal, CalendarCell, CalendarRange, CalendarBuildOptions } from './types'
export type { NatalContext } from './context/types'
